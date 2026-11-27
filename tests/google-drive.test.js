import test from 'node:test';
import assert from 'node:assert/strict';
import {
  downloadSnapshot,
  ensureSyncFolder,
  findSyncFile,
  uploadSnapshot,
} from '../src/lib/google-drive.js';

function createMockFetch(routes) {
  const calls = [];
  const fn = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body });
    for (const route of routes) {
      if (route.match(url, options)) {
        return {
          ok: route.status ? route.status < 400 : true,
          status: route.status || 200,
          statusText: 'OK',
          async json() {
            return route.json;
          },
          async text() {
            return typeof route.text === 'string' ? route.text : JSON.stringify(route.json);
          },
        };
      }
    }
    throw new Error(`Unmatched mock fetch: ${options.method || 'GET'} ${url}`);
  };
  fn.calls = calls;
  return fn;
}

test('ensureSyncFolder: 폴더가 없으면 새로 생성한다', async () => {
  const mockFetch = createMockFetch([
    {
      match: (url, opt) => (opt.method || 'GET') === 'GET' && url.includes('/drive/v3/files?q='),
      json: { files: [] },
    },
    {
      match: (url, opt) => opt.method === 'POST' && url.includes('/drive/v3/files?fields='),
      json: { id: 'folder_123', name: 'SyncFav' },
    },
  ]);

  const folderId = await ensureSyncFolder('tok', 'SyncFav', null, mockFetch);
  assert.equal(folderId, 'folder_123');
  assert.equal(mockFetch.calls.length, 2);
});

test('findSyncFile & downloadSnapshot: 기존 파일 탐색 및 다운로드', async () => {
  const sample = {
    schemaVersion: 1,
    roots: { bookmarkBar: [], other: [], mobile: [] },
  };
  const mockFetch = createMockFetch([
    {
      match: (url) => url.includes('files?q='),
      json: { files: [{ id: 'file_999', name: 'bookmarks.json' }] },
    },
    {
      match: (url) => url.includes('files/file_999?alt=media'),
      json: sample,
    },
  ]);

  const fileId = await findSyncFile('tok', 'folder_123', 'bookmarks.json', null, mockFetch);
  assert.equal(fileId, 'file_999');

  const snap = await downloadSnapshot('tok', fileId, mockFetch);
  assert.deepEqual(snap, sample);
});

test('uploadSnapshot: 기존 파일이 있으면 PATCH, 없으면 multipart POST', async () => {
  const mockFetch = createMockFetch([
    {
      match: (url, opt) => opt.method === 'POST' && url.includes('uploadType=multipart'),
      json: { id: 'created_file_1' },
    },
    {
      match: (url, opt) => opt.method === 'PATCH' && url.includes('uploadType=media'),
      json: { id: 'created_file_1' },
    },
  ]);

  const snap = { schemaVersion: 1, roots: { bookmarkBar: [], other: [], mobile: [] } };
  const created = await uploadSnapshot('tok', 'folder_123', 'bookmarks.json', snap, null, mockFetch);
  assert.equal(created.id, 'created_file_1');

  const updated = await uploadSnapshot(
    'tok',
    'folder_123',
    'bookmarks.json',
    snap,
    'created_file_1',
    mockFetch
  );
  assert.equal(updated.id, 'created_file_1');
  assert.equal(mockFetch.calls[0].method, 'POST');
  assert.equal(mockFetch.calls[1].method, 'PATCH');
});
