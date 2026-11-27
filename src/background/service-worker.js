import { ALARMS, SYNC_STATUS } from '../shared/constants.js';
import {
  addLog,
  clearLogs,
  getAuth,
  getBackups,
  getLogs,
  getSettings,
  getSyncState,
  saveSettings,
  updateSyncState,
} from '../shared/storage.js';
import { getRedirectUri, signInInteractive, signOut } from '../lib/google-auth.js';
import {
  getLocalSnapshot,
  isApplyingRemoteChanges,
  restoreFromRoots,
  runSync,
} from '../lib/sync-engine.js';

/**
 * 주기적 동기화 알람 재설정
 */
async function configurePeriodicAlarm() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARMS.PERIODIC_SYNC);

  if (settings.autoSync) {
    const periodInMinutes = Math.max(1, Number(settings.syncIntervalMinutes) || 5);
    chrome.alarms.create(ALARMS.PERIODIC_SYNC, {
      delayInMinutes: periodInMinutes,
      periodInMinutes,
    });
  }
}

/**
 * 북마크 변경 시 디바운스 동기화 예약 (MV3 Service Worker 수명 대응으로 alarms 사용)
 */
async function scheduleDebouncedSync(eventName) {
  if (isApplyingRemoteChanges()) return;

  const settings = await getSettings();
  const auth = await getAuth();
  if (!auth || !auth.accessToken) return;

  await updateSyncState({ pendingChanges: true });

  if (!settings.autoSync) return;

  const delaySeconds = Math.max(3, Number(settings.debounceSeconds) || 5);
  await chrome.alarms.clear(ALARMS.DEBOUNCED_SYNC);
  chrome.alarms.create(ALARMS.DEBOUNCED_SYNC, {
    when: Date.now() + delaySeconds * 1000,
  });
}

// --- Lifecycle Listeners ---
chrome.runtime.onInstalled.addListener(async () => {
  await configurePeriodicAlarm();
  const local = await getLocalSnapshot();
  const auth = await getAuth();
  await updateSyncState({
    status: auth?.accessToken ? SYNC_STATUS.IDLE : SYNC_STATUS.DISCONNECTED,
    bookmarkCount: local.stats.bookmarks,
    folderCount: local.stats.folders,
    localChecksum: local.checksum,
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await configurePeriodicAlarm();
  const settings = await getSettings();
  const auth = await getAuth();
  if (settings.autoSync && auth?.accessToken) {
    await runSync({ mode: 'smart', reason: 'startup' });
  }
});

// --- Bookmark Change Listeners ---
chrome.bookmarks.onCreated.addListener(() => scheduleDebouncedSync('onCreated'));
chrome.bookmarks.onRemoved.addListener(() => scheduleDebouncedSync('onRemoved'));
chrome.bookmarks.onChanged.addListener(() => scheduleDebouncedSync('onChanged'));
chrome.bookmarks.onMoved.addListener(() => scheduleDebouncedSync('onMoved'));
if (chrome.bookmarks.onImportEnded) {
  chrome.bookmarks.onImportEnded.addListener(() => scheduleDebouncedSync('onImportEnded'));
}

// --- Alarm Listener ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARMS.DEBOUNCED_SYNC) {
    await runSync({ mode: 'smart', reason: 'bookmark_change' });
  } else if (alarm.name === ALARMS.PERIODIC_SYNC) {
    const settings = await getSettings();
    if (settings.autoSync) {
      await runSync({ mode: 'smart', reason: 'periodic' });
    }
  }
});

// --- Message Handler (Popup & Options UI) ---
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse(result))
    .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
  return true; // async response
});

async function handleMessage(message) {
  const { type, payload } = message || {};

  switch (type) {
    case 'GET_DASHBOARD_DATA': {
      const [settings, auth, state, logs, backups, local] = await Promise.all([
        getSettings(),
        getAuth(),
        getSyncState(),
        getLogs(),
        getBackups(),
        getLocalSnapshot(),
      ]);

      return {
        ok: true,
        redirectUri: getRedirectUri(),
        settings,
        auth: auth
          ? {
              connected: true,
              email: auth.email,
              mode: auth.mode,
              hasRefreshToken: Boolean(auth.refreshToken),
              connectedAt: auth.connectedAt,
            }
          : { connected: false },
        state: {
          ...state,
          bookmarkCount: local.stats.bookmarks,
          folderCount: local.stats.folders,
        },
        logs,
        backups: backups.map((b) => ({
          id: b.id,
          createdAt: b.createdAt,
          reason: b.reason,
          stats: b.stats,
        })),
      };
    }

    case 'UPDATE_SETTINGS': {
      const next = await saveSettings(payload || {});
      await configurePeriodicAlarm();
      return { ok: true, settings: next };
    }

    case 'SIGN_IN': {
      if (payload && (payload.clientId !== undefined || payload.clientSecret !== undefined)) {
        await saveSettings(payload);
      }
      const auth = await signInInteractive();
      await addLog('success', `Google Drive 연결됨 (${auth.email || '계정'})`, {
        mode: auth.mode,
        hasRefreshToken: Boolean(auth.refreshToken),
      });
      await updateSyncState({
        status: SYNC_STATUS.IDLE,
        lastError: null,
        remoteFolderId: null,
        remoteFileId: null,
      });
      await configurePeriodicAlarm();
      // 연결 직후 자동 스마트 동기화 1회 실행
      const syncResult = await runSync({ mode: 'smart', reason: 'initial_connect' });
      return { ok: true, auth: { email: auth.email, mode: auth.mode }, syncResult };
    }

    case 'SIGN_OUT': {
      await signOut();
      await updateSyncState({
        status: SYNC_STATUS.DISCONNECTED,
        lastError: null,
        remoteFolderId: null,
        remoteFileId: null,
      });
      await addLog('info', 'Google Drive 연결이 해제되었습니다.');
      return { ok: true };
    }

    case 'SYNC_NOW':
      return await runSync({ mode: 'smart', reason: 'manual_button' });

    case 'FORCE_PUSH':
      return await runSync({ mode: 'push', reason: 'manual_push' });

    case 'FORCE_PULL':
      return await runSync({ mode: 'pull', reason: 'manual_pull' });

    case 'RESTORE_BACKUP': {
      const backups = await getBackups();
      const target = backups.find((b) => b.id === payload?.backupId);
      if (!target) {
        throw new Error('해당 백업을 찾을 수 없습니다.');
      }
      return await restoreFromRoots(target.roots, 'backup_restore');
    }

    case 'EXPORT_LOCAL': {
      const snapshot = await getLocalSnapshot();
      return { ok: true, snapshot };
    }

    case 'IMPORT_JSON': {
      const roots = payload?.roots;
      if (!roots || typeof roots !== 'object') {
        throw new Error('유효한 SyncFav JSON 형식이 아닙니다.');
      }
      return await restoreFromRoots(roots, 'json_import');
    }

    case 'CLEAR_LOGS': {
      await clearLogs();
      return { ok: true };
    }

    default:
      return { ok: false, error: `Unknown message type: ${type}` };
  }
}
