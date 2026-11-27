import { DEFAULT_SETTINGS, STORAGE_KEYS, SYNC_STATUS } from './constants.js';

function getStorageArea() {
  return chrome.storage.local;
}

async function loadLocalConfigDefaults() {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return {};
    const res = await fetch(chrome.runtime.getURL('local-config.json'));
    if (!res.ok) return {};
    const json = await res.json();
    return json && typeof json === 'object' ? json : {};
  } catch {
    return {};
  }
}

export async function getSettings() {
  const result = await getStorageArea().get(STORAGE_KEYS.SETTINGS);
  const stored = result[STORAGE_KEYS.SETTINGS] || {};
  const localDefaults = !stored.clientId ? await loadLocalConfigDefaults() : {};
  const merged = { ...DEFAULT_SETTINGS, ...localDefaults, ...stored };

  if (!merged.deviceName) {
    merged.deviceName = generateDefaultDeviceName();
    await saveSettings(merged);
  }
  return merged;
}

export async function saveSettings(partial) {
  const result = await getStorageArea().get(STORAGE_KEYS.SETTINGS);
  const current = { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
  const next = { ...current, ...partial };
  await getStorageArea().set({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}

export async function getAuth() {
  const result = await getStorageArea().get(STORAGE_KEYS.AUTH);
  return result[STORAGE_KEYS.AUTH] || null;
}

export async function saveAuth(authData) {
  await getStorageArea().set({ [STORAGE_KEYS.AUTH]: authData });
}

export async function clearAuth() {
  await getStorageArea().remove(STORAGE_KEYS.AUTH);
}

export async function getSyncState() {
  const result = await getStorageArea().get(STORAGE_KEYS.SYNC_STATE);
  return {
    status: SYNC_STATUS.IDLE,
    lastSyncAt: null,
    lastError: null,
    lastDirection: null,
    remoteFileId: null,
    remoteFolderId: null,
    localChecksum: null,
    remoteChecksum: null,
    bookmarkCount: 0,
    folderCount: 0,
    pendingChanges: false,
    ...(result[STORAGE_KEYS.SYNC_STATE] || {}),
  };
}

export async function updateSyncState(partial) {
  const current = await getSyncState();
  const next = { ...current, ...partial };
  await getStorageArea().set({ [STORAGE_KEYS.SYNC_STATE]: next });
  return next;
}

export async function getLastSyncedSnapshot() {
  const result = await getStorageArea().get(STORAGE_KEYS.LAST_SYNCED_SNAPSHOT);
  return result[STORAGE_KEYS.LAST_SYNCED_SNAPSHOT] || null;
}

export async function saveLastSyncedSnapshot(snapshot) {
  await getStorageArea().set({ [STORAGE_KEYS.LAST_SYNCED_SNAPSHOT]: snapshot });
}

export async function getBackups() {
  const result = await getStorageArea().get(STORAGE_KEYS.BACKUPS);
  return result[STORAGE_KEYS.BACKUPS] || [];
}

export async function addBackup(snapshot, reason = 'auto') {
  const settings = await getSettings();
  const backups = await getBackups();
  const entry = {
    id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    reason,
    stats: snapshot.stats || null,
    roots: snapshot.roots,
  };
  const next = [entry, ...backups].slice(0, settings.maxBackups || 10);
  await getStorageArea().set({ [STORAGE_KEYS.BACKUPS]: next });
  return entry;
}

export async function getLogs() {
  const result = await getStorageArea().get(STORAGE_KEYS.LOGS);
  return result[STORAGE_KEYS.LOGS] || [];
}

export async function addLog(level, message, details = null) {
  const logs = await getLogs();
  const entry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    level, // 'info' | 'success' | 'warn' | 'error'
    message,
    details,
  };
  const next = [entry, ...logs].slice(0, 80);
  await getStorageArea().set({ [STORAGE_KEYS.LOGS]: next });
  return entry;
}

export async function clearLogs() {
  await getStorageArea().set({ [STORAGE_KEYS.LOGS]: [] });
}

function generateDefaultDeviceName() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let os = 'Desktop';
  if (/Mac/i.test(ua)) os = 'Mac';
  else if (/Win/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Chromium';
  if (/Ego/i.test(ua)) browser = 'Ego Lite';
  else if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Brave/i.test(ua)) browser = 'Brave';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${os} ${browser} (${suffix})`;
}
