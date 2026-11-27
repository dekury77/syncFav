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
  maxBackups: 10,
  uiTheme: 'obsidian', // 'obsidian' | 'editorial' | 'promax'
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
