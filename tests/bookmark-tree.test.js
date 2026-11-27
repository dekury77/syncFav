import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySnapshotToBrowser,
  computeChecksum,
  createSnapshotFromTree,
  mergeSnapshots,
} from '../src/lib/bookmark-tree.js';

function createMockBookmarksApi(initialTree) {
  let nextId = 100;
  const nodes = new Map();

  function register(node, parentId = null) {
    const clone = { ...node, parentId };
    if (!clone.url) clone.children = (node.children || []).map((c) => register(c, clone.id));
    nodes.set(clone.id, clone);
    return clone;
  }

  const root = register(initialTree[0]);

  return {
    async getTree() {
      return [structuredClone(root)];
    },
    async getChildren(id) {
      const node = nodes.get(id);
      return (node?.children || []).map((c) => ({ ...c }));
    },
    async create({ parentId, index, title, url }) {
      const parent = nodes.get(parentId);
      const created = {
        id: String(nextId++),
        parentId,
        title: title || '',
        ...(url ? { url } : { children: [] }),
      };
      nodes.set(created.id, created);
      const pos = typeof index === 'number' ? Math.min(index, parent.children.length) : parent.children.length;
      parent.children.splice(pos, 0, created);
      return { ...created };
    },
    async update(id, { title, url }) {
      const node = nodes.get(id);
      if (title !== undefined) node.title = title;
      if (url !== undefined) node.url = url;
      return { ...node };
    },
    async move(id, { parentId, index }) {
      const node = nodes.get(id);
      const oldParent = nodes.get(node.parentId);
      const oldIdx = oldParent.children.findIndex((c) => c.id === id);
      oldParent.children.splice(oldIdx, 1);

      const newParent = nodes.get(parentId || node.parentId);
      node.parentId = newParent.id;
      const pos = typeof index === 'number' ? Math.min(index, newParent.children.length) : newParent.children.length;
      newParent.children.splice(pos, 0, node);
      return { ...node };
    },
    async remove(id) {
      const node = nodes.get(id);
      const parent = nodes.get(node.parentId);
      parent.children = parent.children.filter((c) => c.id !== id);
      nodes.delete(id);
    },
    async removeTree(id) {
      const node = nodes.get(id);
      const parent = nodes.get(node.parentId);
      parent.children = parent.children.filter((c) => c.id !== id);
      nodes.delete(id);
    },
  };
}

test('한국어/영어 루트 폴더명을 동일 슬롯으로 정규화한다', () => {
  const koTree = [
    {
      id: '0',
      title: '',
      children: [
        {
          id: '10',
          title: '북마크바',
          children: [{ id: '11', title: 'Google', url: 'https://google.com' }],
        },
        { id: '20', title: '기타 북마크', children: [] },
      ],
    },
  ];
  const enTree = [
    {
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bookmarks bar',
          children: [{ id: '4', title: 'Google', url: 'https://google.com' }],
        },
        { id: '2', title: 'Other bookmarks', children: [] },
      ],
    },
  ];

  const koSnap = createSnapshotFromTree(koTree);
  const enSnap = createSnapshotFromTree(enTree);

  assert.equal(koSnap.checksum, enSnap.checksum);
  assert.equal(koSnap.stats.bookmarks, 1);
  assert.equal(koSnap.roots.bookmarkBar[0].url, 'https://google.com');
});

test('3-Way Merge: A컴에서 삭제, B컴에서 추가된 항목을 정확히 병합한다', () => {
  const base = {
    roots: {
      bookmarkBar: [
        { type: 'bookmark', title: 'Keep', url: 'https://keep.dev' },
        { type: 'bookmark', title: 'DeletedOnA', url: 'https://delete-me.dev' },
      ],
      other: [],
      mobile: [],
    },
  };

  // A컴: DeletedOnA 삭제
  const localA = {
    updatedAt: '2026-11-27T10:00:00.000Z',
    roots: {
      bookmarkBar: [{ type: 'bookmark', title: 'Keep', url: 'https://keep.dev' }],
      other: [],
      mobile: [],
    },
  };

  // B컴: AddedOnB 추가
  const remoteB = {
    updatedAt: '2026-11-27T10:05:00.000Z',
    roots: {
      bookmarkBar: [
        { type: 'bookmark', title: 'Keep', url: 'https://keep.dev' },
        { type: 'bookmark', title: 'DeletedOnA', url: 'https://delete-me.dev' },
        { type: 'bookmark', title: 'AddedOnB', url: 'https://added-b.dev' },
      ],
      other: [],
      mobile: [],
    },
  };

  const merged = mergeSnapshots(base, localA, remoteB);
  const urls = merged.roots.bookmarkBar.map((b) => b.url);

  assert.deepEqual(urls, ['https://keep.dev', 'https://added-b.dev']);
});

test('초기 2-Way 병합(base 없음): 양쪽 브라우저 북마크를 중복 없이 합친다', () => {
  const local = {
    roots: {
      bookmarkBar: [
        { type: 'bookmark', title: 'Common', url: 'https://common.dev' },
        { type: 'bookmark', title: 'HomeOnly', url: 'https://home.dev' },
      ],
      other: [],
      mobile: [],
    },
  };

  const remote = {
    roots: {
      bookmarkBar: [
        { type: 'bookmark', title: 'Common', url: 'https://common.dev' },
        { type: 'bookmark', title: 'WorkOnly', url: 'https://work.dev' },
      ],
      other: [],
      mobile: [],
    },
  };

  const merged = mergeSnapshots(null, local, remote);
  const urls = merged.roots.bookmarkBar.map((b) => b.url).sort();
  assert.deepEqual(urls, ['https://common.dev', 'https://home.dev', 'https://work.dev']);
});

test('applySnapshotToBrowser: 기존 노드를 재사용하고 최소 변경으로 동기화한다', async () => {
  const api = createMockBookmarksApi([
    {
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: '북마크바',
          children: [
            { id: '10', title: 'Old Title', url: 'https://a.com' },
            { id: '11', title: 'Remove Me', url: 'https://remove.com' },
          ],
        },
        { id: '2', title: '기타 북마크', children: [] },
      ],
    },
  ]);

  const targetRoots = {
    bookmarkBar: [
      { type: 'bookmark', title: 'New Item', url: 'https://new.com' },
      { type: 'bookmark', title: 'Updated Title', url: 'https://a.com' },
      {
        type: 'folder',
        title: 'Dev',
        children: [{ type: 'bookmark', title: 'GitHub', url: 'https://github.com' }],
      },
    ],
    other: [],
    mobile: [],
  };

  const summary = await applySnapshotToBrowser(api, targetRoots);
  const afterSnap = createSnapshotFromTree(await api.getTree());

  assert.equal(afterSnap.checksum, computeChecksum(targetRoots));
  assert.equal(summary.updated, 1); // https://a.com 제목만 수정 (재생성 안 함)
  assert.equal(summary.removed, 1); // https://remove.com 삭제
  assert.equal(summary.created, 3); // New Item + Dev 폴더 + GitHub
});
