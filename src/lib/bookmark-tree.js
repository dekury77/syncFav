import { ROOT_SLOTS } from '../shared/constants.js';

/**
 * Chromium 북마크 트리를 브라우저/언어 독립적인 표준 포맷으로 정규화하고,
 * 3-Way Merge 및 최소 변경(Diff) 적용을 수행하는 모듈.
 */

const BOOKMARK_BAR_TITLES = new Set([
  'bookmarks bar',
  'bookmark bar',
  '북마크바',
  '북마크 바',
  '즐겨찾기 모음',
  'お気に入りバー',
  '书签栏',
]);

const OTHER_BOOKMARKS_TITLES = new Set([
  'other bookmarks',
  '기타 북마크',
  '기타 즐겨찾기',
  'その他のブックマーク',
  '其他书签',
]);

const MOBILE_BOOKMARKS_TITLES = new Set([
  'mobile bookmarks',
  '모바일 북마크',
  '모바일 즐겨찾기',
  'モバイルのブックマーク',
  '移动设备书签',
]);

/**
 * 루트 노드의 자식들에서 bookmarkBar / other / mobile 슬롯 ID 매핑을 탐지한다.
 */
export function resolveRootSlotMap(rootChildren = []) {
  const map = {
    bookmarkBar: null,
    other: null,
    mobile: null,
  };

  for (const child of rootChildren) {
    const folderType = (child.folderType || '').toLowerCase();
    const titleLower = (child.title || '').trim().toLowerCase();

    if (folderType === 'bookmarks-bar' || child.id === '1' || BOOKMARK_BAR_TITLES.has(titleLower)) {
      if (!map.bookmarkBar) map.bookmarkBar = child;
      continue;
    }
    if (folderType === 'other' || child.id === '2' || OTHER_BOOKMARKS_TITLES.has(titleLower)) {
      if (!map.other) map.other = child;
      continue;
    }
    if (folderType === 'mobile' || child.id === '3' || MOBILE_BOOKMARKS_TITLES.has(titleLower)) {
      if (!map.mobile) map.mobile = child;
      continue;
    }
  }

  // Fallback: 위치 기반 매핑 (커스텀 Chromium 빌드 대응)
  const unassigned = rootChildren.filter(
    (c) => c !== map.bookmarkBar && c !== map.other && c !== map.mobile
  );
  if (!map.bookmarkBar && unassigned.length > 0) map.bookmarkBar = unassigned.shift();
  if (!map.other && unassigned.length > 0) map.other = unassigned.shift();
  if (!map.mobile && unassigned.length > 0) map.mobile = unassigned.shift();

  return map;
}

/**
 * chrome.bookmarks.BookmarkTreeNode[] -> 표준화된 노드 배열로 변환
 */
export function normalizeNodes(nodes = []) {
  const result = [];
  for (const node of nodes) {
    if (typeof node.url === 'string' && node.url.length > 0) {
      result.push({
        type: 'bookmark',
        title: node.title || '',
        url: node.url,
      });
    } else {
      result.push({
        type: 'folder',
        title: node.title || 'Untitled Folder',
        children: normalizeNodes(node.children || []),
      });
    }
  }
  return result;
}

/**
 * chrome.bookmarks.getTree() 결과를 표준 스냅샷으로 변환
 */
export function createSnapshotFromTree(tree, meta = {}) {
  const root = tree && tree[0] ? tree[0] : { children: [] };
  const slotMap = resolveRootSlotMap(root.children || []);

  const roots = {
    bookmarkBar: slotMap.bookmarkBar ? normalizeNodes(slotMap.bookmarkBar.children || []) : [],
    other: slotMap.other ? normalizeNodes(slotMap.other.children || []) : [],
    mobile: slotMap.mobile ? normalizeNodes(slotMap.mobile.children || []) : [],
  };

  const stats = countStats(roots);
  const checksum = computeChecksum(roots);

  return {
    schemaVersion: 1,
    updatedAt: meta.updatedAt || new Date().toISOString(),
    deviceName: meta.deviceName || 'Unknown',
    checksum,
    stats,
    roots,
  };
}

export function countStats(roots) {
  let bookmarks = 0;
  let folders = 0;

  function walk(nodes = []) {
    for (const node of nodes) {
      if (node.type === 'bookmark') {
        bookmarks += 1;
      } else if (node.type === 'folder') {
        folders += 1;
        walk(node.children || []);
      }
    }
  }

  for (const slot of ROOT_SLOTS) {
    walk(roots[slot] || []);
  }

  return { bookmarks, folders };
}

/**
 * 안정적인 결정적 해시(64-bit FNV-1a hex) 계산 - Node/Browser 공용 동기 함수
 */
export function computeChecksum(roots) {
  const canonical = JSON.stringify({
    bookmarkBar: roots.bookmarkBar || [],
    other: roots.other || [],
    mobile: roots.mobile || [],
  });

  let h1 = 0xdeadbeef ^ canonical.length;
  let h2 = 0x41c6ce57 ^ canonical.length;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function getNodeKey(node) {
  if (node.type === 'bookmark') {
    return `b:${node.url}`;
  }
  return `f:${node.title}`;
}

function indexByKey(nodes = []) {
  const map = new Map();
  for (const node of nodes) {
    const key = getNodeKey(node);
    // 동일 폴더 내 중복 키가 있으면 폴더는 병합, 북마크는 첫 항목 유지
    if (map.has(key)) {
      const existing = map.get(key);
      if (existing.type === 'folder' && node.type === 'folder') {
        existing.children = [...existing.children, ...node.children];
      }
    } else {
      map.set(
        key,
        node.type === 'folder'
          ? { type: 'folder', title: node.title, children: [...(node.children || [])] }
          : { type: 'bookmark', title: node.title, url: node.url }
      );
    }
  }
  return map;
}

function nodesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 3-Way Merge: base(마지막 동기화), local(현재 브라우저), remote(Google Drive)
 * - base가 null이면 2-Way 합집합 병합(양쪽 북마크 모두 보존, 중복 제거) 수행.
 * - preferRemote: 양쪽이 동시에 같은 항목을 다르게 수정했을 때 remote를 우선할지 여부.
 */
export function mergeNodeLists(baseList, localList, remoteList, preferRemote = false) {
  const hasBase = Array.isArray(baseList);
  const baseMap = hasBase ? indexByKey(baseList) : new Map();
  const localMap = indexByKey(localList || []);
  const remoteMap = indexByKey(remoteList || []);

  // 순서는 preferRemote 여부에 따라 주 리스트 순서를 먼저 따르고, 나머지에서 추가된 항목을 이어 붙임
  const primaryOrder = preferRemote ? remoteMap : localMap;
  const secondaryOrder = preferRemote ? localMap : remoteMap;

  const allKeys = [];
  const seen = new Set();
  for (const key of primaryOrder.keys()) {
    if (!seen.has(key)) {
      seen.add(key);
      allKeys.push(key);
    }
  }
  for (const key of secondaryOrder.keys()) {
    if (!seen.has(key)) {
      seen.add(key);
      allKeys.push(key);
    }
  }

  const merged = [];

  for (const key of allKeys) {
    const inBase = baseMap.get(key) || null;
    const inLocal = localMap.get(key) || null;
    const inRemote = remoteMap.get(key) || null;

    if (inLocal && inRemote) {
      // 양쪽에 모두 존재
      if (inLocal.type === 'folder' && inRemote.type === 'folder') {
        const mergedChildren = mergeNodeLists(
          inBase && inBase.type === 'folder' ? inBase.children : hasBase ? [] : null,
          inLocal.children,
          inRemote.children,
          preferRemote
        );
        merged.push({
          type: 'folder',
          title: inLocal.title,
          children: mergedChildren,
        });
      } else {
        // 북마크 제목 충돌 해결
        let title = inLocal.title;
        if (inLocal.title !== inRemote.title) {
          if (inBase && inLocal.title === inBase.title) {
            title = inRemote.title; // remote만 수정됨
          } else if (inBase && inRemote.title === inBase.title) {
            title = inLocal.title; // local만 수정됨
          } else {
            title = preferRemote ? inRemote.title : inLocal.title;
          }
        }
        merged.push({
          type: 'bookmark',
          title,
          url: inLocal.url,
        });
      }
    } else if (inLocal && !inRemote) {
      if (!hasBase) {
        // 초기 2-way 병합: 양쪽 보존
        merged.push(inLocal);
      } else if (!inBase) {
        // local에서 새로 추가됨
        merged.push(inLocal);
      } else {
        // base에 있었는데 remote에서 삭제됨.
        // 만약 local에서 수정(폴더 내 새 항목 추가 등)되었다면 안전하게 보존!
        if (!nodesEqual(inBase, inLocal)) {
          merged.push(inLocal);
        }
        // local이 그대로라면 remote의 삭제를 반영 (추가하지 않음)
      }
    } else if (!inLocal && inRemote) {
      if (!hasBase) {
        // 초기 2-way 병합: 양쪽 보존
        merged.push(inRemote);
      } else if (!inBase) {
        // remote에서 새로 추가됨
        merged.push(inRemote);
      } else {
        // base에 있었는데 local에서 삭제됨.
        // 만약 remote에서 수정되었다면 안전하게 보존!
        if (!nodesEqual(inBase, inRemote)) {
          merged.push(inRemote);
        }
        // remote가 그대로라면 local의 삭제를 반영
      }
    }
  }

  return merged;
}

/**
 * 전체 스냅샷 3-Way Merge
 */
export function mergeSnapshots(baseSnapshot, localSnapshot, remoteSnapshot, options = {}) {
  const localTime = Date.parse(localSnapshot?.updatedAt || 0) || 0;
  const remoteTime = Date.parse(remoteSnapshot?.updatedAt || 0) || 0;
  const preferRemote =
    typeof options.preferRemote === 'boolean' ? options.preferRemote : remoteTime > localTime;

  const mergedRoots = {};
  for (const slot of ROOT_SLOTS) {
    const baseList = baseSnapshot?.roots ? baseSnapshot.roots[slot] || [] : null;
    const localList = localSnapshot?.roots ? localSnapshot.roots[slot] || [] : [];
    const remoteList = remoteSnapshot?.roots ? remoteSnapshot.roots[slot] || [] : [];
    mergedRoots[slot] = mergeNodeLists(baseList, localList, remoteList, preferRemote);
  }

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    deviceName: options.deviceName || localSnapshot?.deviceName || 'Unknown',
    checksum: computeChecksum(mergedRoots),
    stats: countStats(mergedRoots),
    roots: mergedRoots,
  };
}

/**
 * Diff 기반 로컬 북마크 적용기:
 * 기존 노드를 최대한 재사용(update/move)하여 깜빡임과 파비콘 손실을 방지한다.
 */
export async function applySnapshotToBrowser(bookmarksApi, targetRoots) {
  const tree = await bookmarksApi.getTree();
  const root = tree && tree[0] ? tree[0] : { children: [] };
  const slotMap = resolveRootSlotMap(root.children || []);

  const summary = { created: 0, updated: 0, moved: 0, removed: 0 };

  for (const slot of ROOT_SLOTS) {
    const targetList = targetRoots[slot] || [];
    let container = slotMap[slot];

    // mobile 슬롯 등 일부 데스크톱 브라우저에서 존재하지 않을 수 있음
    if (!container) {
      if (targetList.length === 0) continue;
      // mobile 북마크가 있는데 현재 브라우저에 mobile 루트가 없으면 'other' 아래에 폴백 폴더 생성
      if (slot === 'mobile' && slotMap.other) {
        const existingFallback = (slotMap.other.children || []).find(
          (c) => !c.url && c.title === 'Mobile Bookmarks (Synced)'
        );
        if (existingFallback) {
          container = existingFallback;
        } else {
          container = await bookmarksApi.create({
            parentId: slotMap.other.id,
            title: 'Mobile Bookmarks (Synced)',
          });
          container.children = [];
          summary.created += 1;
        }
      } else {
        continue;
      }
    }

    await reconcileFolder(bookmarksApi, container.id, container.children || [], targetList, summary);
  }

  return summary;
}

async function reconcileFolder(bookmarksApi, parentId, existingNodes, targetNodes, summary) {
  // 기존 노드를 키별로 큐에 저장 (동일 키가 여러 개일 수도 있으므로 배열로 관리)
  const existingByKey = new Map();
  for (const node of existingNodes) {
    const isBookmark = typeof node.url === 'string' && node.url.length > 0;
    const key = isBookmark ? `b:${node.url}` : `f:${node.title}`;
    if (!existingByKey.has(key)) existingByKey.set(key, []);
    existingByKey.get(key).push(node);
  }

  const keptIds = new Set();
  const desiredOrderIds = [];

  for (let i = 0; i < targetNodes.length; i++) {
    const target = targetNodes[i];
    const key = getNodeKey(target);
    const candidates = existingByKey.get(key);
    const match = candidates && candidates.length > 0 ? candidates.shift() : null;

    if (match) {
      keptIds.add(match.id);
      if (target.type === 'bookmark') {
        if ((match.title || '') !== (target.title || '')) {
          await bookmarksApi.update(match.id, { title: target.title || '' });
          summary.updated += 1;
        }
      } else if (target.type === 'folder') {
        await reconcileFolder(
          bookmarksApi,
          match.id,
          match.children || [],
          target.children || [],
          summary
        );
      }
      desiredOrderIds.push(match.id);
    } else {
      // 새로 생성
      if (target.type === 'bookmark') {
        const created = await bookmarksApi.create({
          parentId,
          index: i,
          title: target.title || '',
          url: target.url,
        });
        keptIds.add(created.id);
        desiredOrderIds.push(created.id);
        summary.created += 1;
      } else {
        const createdFolder = await bookmarksApi.create({
          parentId,
          index: i,
          title: target.title || 'Untitled Folder',
        });
        keptIds.add(createdFolder.id);
        desiredOrderIds.push(createdFolder.id);
        summary.created += 1;
        await reconcileFolder(
          bookmarksApi,
          createdFolder.id,
          [],
          target.children || [],
          summary
        );
      }
    }
  }

  // 목표에 없는 기존 노드 삭제
  for (const node of existingNodes) {
    if (!keptIds.has(node.id)) {
      if (typeof node.url === 'string' && node.url.length > 0) {
        await bookmarksApi.remove(node.id);
      } else {
        await bookmarksApi.removeTree(node.id);
      }
      summary.removed += 1;
    }
  }

  // 순서 맞추기
  const currentChildren = await bookmarksApi.getChildren(parentId);
  const currentOrder = currentChildren.map((c) => c.id);
  for (let targetIdx = 0; targetIdx < desiredOrderIds.length; targetIdx++) {
    const id = desiredOrderIds[targetIdx];
    const currentIdx = currentOrder.indexOf(id);
    if (currentIdx !== -1 && currentIdx !== targetIdx) {
      await bookmarksApi.move(id, { parentId, index: targetIdx });
      currentOrder.splice(currentIdx, 1);
      currentOrder.splice(targetIdx, 0, id);
      summary.moved += 1;
    }
  }
}
