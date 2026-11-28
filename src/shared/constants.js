/**
 * SyncFav 공통 상수 및 기본 설정
 */

export const STORAGE_KEYS = {
  SETTINGS: 'syncfav_settings',
  AUTH: 'syncfav_auth',
  SYNC_STATE: 'syncfav_sync_state',
  LAST_SYNCED_SNAPSHOT: 'syncfav_last_synced_snapshot',
  BACKUPS: 'syncfav_backups',
  LOGS: 'syncfav_logs',
};

export const ALARMS = {
  PERIODIC_SYNC: 'syncfav_periodic_sync',
  DEBOUNCED_SYNC: 'syncfav_debounced_sync',
};

/**
 * 공개 배포(Chrome Web Store)용 OAuth 프록시 설정.
 * oauth-proxy(Cloudflare Worker) 배포 후 clientId와 proxyUrl을 채우면
 * 일반 사용자는 별도 설정 없이 1클릭으로 Google Drive에 연결할 수 있습니다.
 */
export const PUBLIC_OAUTH = {
  clientId: '108946267710-en7rqssdhqgjdarbasrfhlpihu130krg.apps.googleusercontent.com',
  proxyUrl: 'https://syncfav-oauth-proxy.muon-plaza-3d-portal.workers.dev',
};

export const DEFAULT_SETTINGS = {
  clientId: '',
  clientSecret: '',
  driveFolderName: 'SyncFav',
  driveFileName: 'bookmarks.json',
  deviceName: '',
  autoSync: true,
  syncIntervalMinutes: 5,
  debounceSeconds: 5,
  syncStrategy: 'three_way_merge', // 'three_way_merge' | 'latest_wins'
  failsafeEnabled: true,
  failsafeMaxDeletePercent: 30,
  failsafeMinDeleteCount: 50,
  maxBackups: 10,
  uiTheme: 'obsidian', // 'obsidian' | 'editorial' | 'promax'
  uiLanguage: 'auto', // 'auto' | 'ko' | 'en'
};

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

export const ROOT_SLOTS = ['bookmarkBar', 'other', 'mobile'];
