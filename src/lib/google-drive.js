/**
 * Google Drive API v3 클라이언트 (drive.file 스코프 전용)
 * 지정한 폴더(기본: SyncFav) 생성/탐색 및 bookmarks.json 읽기/쓰기를 담당한다.
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function escapeQueryValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function driveFetch(url, token, options = {}, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        detail = `${res.status}: ${errJson.error.message}`;
      }
    } catch {
      // ignore json parse error
    }
    const err = new Error(`Google Drive API 오류 (${detail})`);
    err.status = res.status;
    throw err;
  }

  return res;
}

/**
 * 지정한 이름의 폴더가 Google Drive에 존재하는지 확인하고 없으면 생성한다.
 */
export async function ensureSyncFolder(token, folderName, cachedFolderId = null, fetchImpl = fetch) {
  if (cachedFolderId) {
    try {
      const checkUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(cachedFolderId)}?fields=id,name,trashed,mimeType`;
      const res = await driveFetch(checkUrl, token, {}, fetchImpl);
      const data = await res.json();
      if (data && !data.trashed && data.mimeType === FOLDER_MIME && data.name === folderName) {
        return data.id;
      }
    } catch {
      // 캐시된 폴더가 삭제되었거나 접근 불가 -> 재검색/생성
    }
  }

  const q = [
    `name = '${escapeQueryValue(folderName)}'`,
    `mimeType = '${FOLDER_MIME}'`,
    'trashed = false',
  ].join(' and ');

  const searchUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime)&orderBy=createdTime&spaces=drive`;
  const searchRes = await driveFetch(searchUrl, token, {}, fetchImpl);
  const searchJson = await searchRes.json();

  if (searchJson.files && searchJson.files.length > 0) {
    return searchJson.files[0].id;
  }

  // 폴더 생성
  const createRes = await driveFetch(
    `${DRIVE_API_BASE}/files?fields=id,name`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        mimeType: FOLDER_MIME,
      }),
    },
    fetchImpl
  );
  const created = await createRes.json();
  return created.id;
}

/**
 * SyncFav 폴더 내 bookmarks.json 파일 탐색
 */
export async function findSyncFile(token, folderId, fileName, cachedFileId = null, fetchImpl = fetch) {
  if (cachedFileId) {
    try {
      const checkUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(cachedFileId)}?fields=id,name,trashed,parents`;
      const res = await driveFetch(checkUrl, token, {}, fetchImpl);
      const data = await res.json();
      if (
        data &&
        !data.trashed &&
        data.name === fileName &&
        Array.isArray(data.parents) &&
        data.parents.includes(folderId)
      ) {
        return data.id;
      }
    } catch {
      // 캐시 무효 -> 재검색
    }
  }

  const q = [
    `'${escapeQueryValue(folderId)}' in parents`,
    `name = '${escapeQueryValue(fileName)}'`,
    'trashed = false',
  ].join(' and ');

  const searchUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&spaces=drive`;
  const res = await driveFetch(searchUrl, token, {}, fetchImpl);
  const json = await res.json();

  if (json.files && json.files.length > 0) {
    return json.files[0].id;
  }
  return null;
}

/**
 * Drive에서 bookmarks.json 다운로드
 */
export async function downloadSnapshot(token, fileId, fetchImpl = fetch) {
  const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await driveFetch(url, token, {}, fetchImpl);
  const text = await res.text();
  if (!text.trim()) return null;

  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !parsed.roots) {
    throw new Error('원격 북마크 파일 형식이 올바르지 않습니다.');
  }
  return parsed;
}

/**
 * Drive에 bookmarks.json 생성 또는 업데이트
 */
export async function uploadSnapshot(
  token,
  folderId,
  fileName,
  snapshot,
  existingFileId = null,
  fetchImpl = fetch
) {
  const payload = JSON.stringify(snapshot, null, 2);

  if (existingFileId) {
    const updateUrl = `${DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(existingFileId)}?uploadType=media&fields=id,modifiedTime`;
    const res = await driveFetch(
      updateUrl,
      token,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: payload,
      },
      fetchImpl
    );
    return await res.json();
  }

  // 새 파일 생성 (multipart upload)
  const boundary = `syncfav_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
  });

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    payload,
    `--${boundary}--`,
  ].join('\r\n');

  const createUrl = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,modifiedTime`;
  const res = await driveFetch(
    createUrl,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
    fetchImpl
  );
  return await res.json();
}
