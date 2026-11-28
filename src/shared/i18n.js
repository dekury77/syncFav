/**
 * FavoSync i18n (Korean / English + Auto system language detection)
 */

export const SUPPORTED_LANGS = ['auto', 'ko', 'en'];

export const MESSAGES = {
  ko: {
    // Common
    appSubtitle: 'Bookmark Sync',
    openSettings: '전체 설정 열기',
    settingsTitle: 'FavoSync 설정',
    skinSwitcherLabel: '스킨 전환',
    quickSkinLabel: '빠른 스킨 전환',
    languageLabel: '언어 (Language)',
    langAuto: '자동 (시스템 언어)',
    langKo: '한국어',
    langEn: 'English',

    // Status
    statusChecking: '확인 중',
    statusSynced: '동기화됨',
    statusSyncing: '동기화 중',
    statusError: '오류',
    statusDisconnected: '미연결',
    statusIdle: '대기 중',
    statusConnected: '연결됨',

    // Popup
    bookmarksUnit: '개의 북마크',
    foldersCount: '폴더 {count}개',
    autoInterval: '자동 {min}분',
    autoOff: '자동 꺼짐',
    driveDisconnected: 'Google Drive 미연결',
    googleConnectedFallback: 'Google 계정 연결됨',
    ctaCopy: 'Google Drive를 연결하면 Ego Lite와 Chrome의 즐겨찾기가 자동으로 동기화됩니다.',
    openDriveSetup: 'Google Drive 설정 열기',
    syncNow: '지금 동기화',
    syncingBtn: '동기화 중...',
    overwriteDrive: 'Drive 덮어쓰기',
    overwriteLocal: '로컬 덮어쓰기',
    overwriteDriveTitle: '내 브라우저 북마크로 Google Drive를 덮어씁니다',
    overwriteLocalTitle: 'Google Drive 북마크로 내 브라우저를 덮어씁니다',
    recentActivity: '최근 활동',
    settingsAndBackup: '설정 및 백업',
    noSyncHistory: '아직 동기화 기록이 없습니다.',
    noRecord: '기록 없음',
    justNow: '방금 전',
    secondsAgo: '{n}초 전',
    minutesAgo: '{n}분 전',
    hoursAgo: '{n}시간 전',

    // Nav tabs
    navConnection: 'Google Drive 연결',
    navSync: '동기화 및 수동 제어',
    navAppearance: '외관 및 스킨',
    navBackups: '로컬 백업',
    navLogs: '활동 로그',

    // Connection tab
    connTitle: 'Google Drive 연결',
    connDesc: 'Ego Lite, Chrome 등 계정 동기화가 없는 Chromium 브라우저 간 OAuth 2.0으로 안전하게 연결합니다.',
    redirectUriLabel: '이 브라우저의 Redirect URI',
    redirectUriHint: '자체 GCP OAuth 앱을 직접 연결할 때 승인된 리디렉션 URI로 등록하세요.',
    copyBtn: '복사',
    clientIdLabel: 'Google OAuth Client ID (선택 — 비워두면 기본 공개 연결 사용)',
    clientSecretLabel: 'Client Secret (직접 연결 시 자동 갱신용)',
    driveFolderLabel: 'Google Drive 폴더 이름',
    driveFileLabel: '동기화 파일 이름',
    connectDrive: 'Google Drive 연결',
    reconnectAccount: '계정 다시 연결',
    connectingBtn: '연결 중...',
    saveSettings: '설정 저장',
    disconnectBtn: '연결 해제',
    oauthGuideSummary: '직접 Google Cloud OAuth 앱을 연결하려면 (고급 사용자용)',
    oauthGuide1: 'Google Cloud Console에서 프로젝트를 만들고 Google Drive API를 사용 설정합니다.',
    oauthGuide2: 'OAuth 동의 화면에서 외부 앱을 구성하고 테스트 사용자에 본인 Gmail을 추가합니다.',
    oauthGuide3: '웹 애플리케이션 OAuth 클라이언트를 만들고 승인된 리디렉션 URI에 위 Redirect URI를 추가합니다.',
    oauthGuide4: '발급된 Client ID와 Client Secret을 입력한 뒤 연결 버튼을 누릅니다.',
    tokenAutoRefresh: '자동 갱신 활성화 (Refresh Token)',
    tokenShortTerm: '단기 토큰 모드',
    summaryCounts: '북마크 {bookmarks}개 · 폴더 {folders}개',
    connectedBannerLine1: '{email} 연결됨 · {tokenMode}',

    // Sync tab
    syncTitle: '동기화 및 수동 제어',
    syncDesc: '자동 동기화 주기와 충돌 병합 정책을 관리하고, 필요 시 수동으로 덮어쓰거나 JSON으로 내보냅니다.',
    deviceNameLabel: '기기 이름',
    deviceNamePlaceholder: '예: 집컴 Ego Lite',
    strategyLabel: '충돌 해결 전략',
    strategyThreeWay: '스마트 3-Way 병합 (양쪽 변경사항 보존)',
    strategyLatest: '최신 수정 우선 (마지막 수정 기기 기준)',
    intervalLabel: '주기적 동기화 간격 (분)',
    debounceLabel: '변경 감지 후 업로드 대기 (초)',
    autoSyncToggle: '자동 동기화 사용 (변경 감지, 주기적 폴링, 브라우저 시작 시 자동 실행)',
    failsafeToggle: '대량 삭제 방지(Failsafe) — 북마크가 30% 이상(최소 50개) 한꺼번에 삭제되려 하면 자동 동기화 중단',
    saveChanges: '변경사항 저장',
    manualControlTitle: '수동 동기화 및 파일 백업',
    smartSyncNow: '지금 스마트 동기화',
    forcePushBtn: '내 북마크로 Drive 덮어쓰기',
    forcePullBtn: 'Drive로 내 브라우저 덮어쓰기',
    exportJsonBtn: 'JSON 내보내기',
    importJsonBtn: 'JSON 가져오기',

    // Appearance tab
    appearanceTitle: '외관 및 스킨',
    appearanceDesc: '언어 설정과 3가지 디자인 스킨을 실시간으로 전환할 수 있습니다. 선택한 설정은 팝업과 설정 화면에 즉시 적용됩니다.',
    skinObsidianDesc: '절제된 딥 카본 다크모드, 1px 헤어라인과 순백 액센트의 Raycast · Linear 감성',
    skinEditorialDesc: 'AI 템플릿을 배제한 린넨 페이퍼 + 세리프 타이포그래피 + 코발트 잉크의 서재 아카이브 감성',
    skinPromaxDesc: 'ui-ux-pro-max 엔진이 산출한 민트-틸 생산성 대시보드 팔레트와 부드러운 카드 계층',

    // Backups & Logs tab
    backupsTitle: '로컬 자동 백업',
    backupsDesc: '원격 변경사항을 적용하거나 덮어쓰기 직전마다 현재 브라우저의 북마크를 자동으로 보관합니다 (최근 10개).',
    noBackups: '아직 생성된 로컬 백업이 없습니다.',
    backupMeta: '{reason} · 북마크 {count}개',
    restoreBtn: '복원',
    logsTitle: '활동 로그',
    logsDesc: '최근 동기화 및 연결 기록을 시간순으로 확인합니다.',
    clearLogsBtn: '로그 비우기',
    noLogs: '기록된 동기화 로그가 없습니다.',

    // Confirms & Toasts
    confirmPush: '현재 브라우저의 북마크로 Google Drive 파일을 덮어쓸까요?',
    confirmPull: 'Google Drive의 북마크로 현재 브라우저를 덮어쓸까요?\n(덮어쓰기 전 현재 북마크는 자동 백업됩니다)',
    confirmRestore: '이 시점의 백업으로 현재 브라우저 북마크를 복원할까요?',
    confirmDisconnect: 'Google Drive 연결을 해제할까요? (로컬 북마크와 Drive 파일은 유지됩니다)',
    confirmImport: '선택한 JSON 파일의 북마크로 현재 브라우저를 복원할까요?',
    toastSkinApplied: '{name} 스킨이 적용되었습니다.',
    toastLangApplied: '언어 설정이 적용되었습니다.',
    toastCopied: 'Redirect URI가 복사되었습니다.',
    toastOAuthSaved: 'OAuth 및 Drive 경로 설정이 저장되었습니다.',
    toastConnected: 'Google Drive 연결 및 동기화가 완료되었습니다.',
    toastDisconnected: '연결이 해제되었습니다.',
    toastSyncSaved: '동기화 설정이 저장되었습니다.',
    toastSyncDone: '동기화 완료 ({direction})',
    toastPushDone: 'Google Drive로 강제 업로드 완료',
    toastPullDone: 'Google Drive에서 강제 다운로드 완료',
    toastExportDone: 'JSON 백업 파일이 다운로드되었습니다.',
    toastImportDone: 'JSON 파일에서 북마크를 복원했습니다.',
    toastRestoreDone: '백업이 복원되었습니다.',
    toastLogsCleared: '로그가 비워졌습니다.',
    errLoadFailed: '상태를 불러오지 못했습니다.',
    errSaveFailed: '저장 실패',
    errConnectFailed: '연결 실패',
    errSyncFailed: '동기화 실패',
    errPushFailed: '업로드 실패',
    errPullFailed: '다운로드 실패',
    errExportFailed: '내보내기 실패',
    errImportFailed: '가져오기 실패',
    errRestoreFailed: '복원 실패',
    errInvalidJson: 'roots 필드가 없는 잘못된 파일입니다.',
    errParseFile: '파일 파싱 오류: {msg}',
  },

  en: {
    // Common
    appSubtitle: 'Bookmark Sync',
    openSettings: 'Open Settings',
    settingsTitle: 'FavoSync Settings',
    skinSwitcherLabel: 'Switch skin',
    quickSkinLabel: 'Quick Skin Switch',
    languageLabel: 'Language',
    langAuto: 'Auto (System Language)',
    langKo: '한국어 (Korean)',
    langEn: 'English',

    // Status
    statusChecking: 'Checking',
    statusSynced: 'Synced',
    statusSyncing: 'Syncing',
    statusError: 'Error',
    statusDisconnected: 'Disconnected',
    statusIdle: 'Ready',
    statusConnected: 'Connected',

    // Popup
    bookmarksUnit: 'bookmarks',
    foldersCount: '{count} folders',
    autoInterval: 'Auto {min}m',
    autoOff: 'Auto off',
    driveDisconnected: 'Google Drive not connected',
    googleConnectedFallback: 'Google account connected',
    ctaCopy: 'Connect Google Drive to automatically sync bookmarks across Ego Lite, Chrome, and other Chromium browsers.',
    openDriveSetup: 'Open Google Drive Setup',
    syncNow: 'Sync Now',
    syncingBtn: 'Syncing...',
    overwriteDrive: 'Push to Drive',
    overwriteLocal: 'Pull to Local',
    overwriteDriveTitle: 'Overwrite Google Drive with your local bookmarks',
    overwriteLocalTitle: 'Overwrite local bookmarks with Google Drive',
    recentActivity: 'Recent Activity',
    settingsAndBackup: 'Settings & Backups',
    noSyncHistory: 'No sync history yet.',
    noRecord: 'Never synced',
    justNow: 'Just now',
    secondsAgo: '{n}s ago',
    minutesAgo: '{n}m ago',
    hoursAgo: '{n}h ago',

    // Nav tabs
    navConnection: 'Google Drive',
    navSync: 'Sync & Controls',
    navAppearance: 'Appearance & Language',
    navBackups: 'Local Backups',
    navLogs: 'Activity Logs',

    // Connection tab
    connTitle: 'Google Drive Connection',
    connDesc: 'Connect securely via OAuth 2.0 across Chromium browsers even without built-in browser account sync (such as Ego Lite).',
    redirectUriLabel: 'Redirect URI for This Browser',
    redirectUriHint: 'Register this URI only if you are connecting your own custom Google Cloud OAuth app.',
    copyBtn: 'Copy',
    clientIdLabel: 'Google OAuth Client ID (Optional — leave blank for 1-click public mode)',
    clientSecretLabel: 'Client Secret (Optional — for custom BYOK auto-refresh)',
    driveFolderLabel: 'Google Drive Folder Name',
    driveFileLabel: 'Sync File Name',
    connectDrive: 'Connect Google Drive',
    reconnectAccount: 'Reconnect Account',
    connectingBtn: 'Connecting...',
    saveSettings: 'Save Settings',
    disconnectBtn: 'Disconnect',
    oauthGuideSummary: 'Using your own Google Cloud OAuth app (Advanced)',
    oauthGuide1: 'Create a project in Google Cloud Console and enable the Google Drive API.',
    oauthGuide2: 'Configure the OAuth consent screen as External and add your Gmail as a test user.',
    oauthGuide3: 'Create a Web Application OAuth client and add the Redirect URI above.',
    oauthGuide4: 'Enter your Client ID and Client Secret, then click Connect Google Drive.',
    tokenAutoRefresh: 'Auto-refresh enabled (Refresh Token)',
    tokenShortTerm: 'Short-lived token mode',
    summaryCounts: '{bookmarks} bookmarks · {folders} folders',
    connectedBannerLine1: '{email} connected · {tokenMode}',

    // Sync tab
    syncTitle: 'Sync & Manual Controls',
    syncDesc: 'Configure automatic sync intervals and merge rules, or manually push, pull, and export bookmarks as JSON.',
    deviceNameLabel: 'Device Name',
    deviceNamePlaceholder: 'e.g., Home Ego Lite',
    strategyLabel: 'Conflict Resolution Strategy',
    strategyThreeWay: 'Smart 3-Way Merge (Recommended — preserves both sides)',
    strategyLatest: 'Latest Wins (Most recently modified device)',
    intervalLabel: 'Periodic Sync Interval (minutes)',
    debounceLabel: 'Upload Delay After Edit (seconds)',
    autoSyncToggle: 'Enable automatic sync (on edit, periodic polling, and browser startup)',
    failsafeToggle: 'Failsafe mass-deletion guard — pause auto-sync if 30%+ (min 50) bookmarks would be deleted at once',
    saveChanges: 'Save Changes',
    manualControlTitle: 'Manual Sync & File Backup',
    smartSyncNow: 'Smart Sync Now',
    forcePushBtn: 'Force Push to Drive',
    forcePullBtn: 'Force Pull from Drive',
    exportJsonBtn: 'Export JSON',
    importJsonBtn: 'Import JSON',

    // Appearance tab
    appearanceTitle: 'Appearance & Language',
    appearanceDesc: 'Choose your preferred language and switch between 3 distinct visual skins in real time.',
    skinObsidianDesc: 'Refined deep carbon dark theme with 1px hairlines and crisp white primary controls.',
    skinEditorialDesc: 'Clean linen paper, serif typography, and cobalt ink inspired by archival print design.',
    skinPromaxDesc: 'Mint-teal productivity dashboard palette generated by the ui-ux-pro-max design engine.',

    // Backups & Logs tab
    backupsTitle: 'Local Auto Backups',
    backupsDesc: 'Automatically saves a local restore point right before applying remote updates (keeps last 10).',
    noBackups: 'No local backups yet.',
    backupMeta: '{reason} · {count} bookmarks',
    restoreBtn: 'Restore',
    logsTitle: 'Activity Logs',
    logsDesc: 'Chronological log of recent sync operations and account events.',
    clearLogsBtn: 'Clear Logs',
    noLogs: 'No activity logs yet.',

    // Confirms & Toasts
    confirmPush: 'Overwrite the Google Drive file with your current local bookmarks?',
    confirmPull: 'Overwrite your local bookmarks with Google Drive?\n(A local backup will be created automatically first.)',
    confirmRestore: 'Restore your local bookmarks from this backup?',
    confirmDisconnect: 'Disconnect Google Drive? (Your local bookmarks and Drive file will remain untouched.)',
    confirmImport: 'Restore your local bookmarks from the selected JSON file?',
    toastSkinApplied: '{name} skin applied.',
    toastLangApplied: 'Language updated.',
    toastCopied: 'Redirect URI copied.',
    toastOAuthSaved: 'OAuth and Drive path settings saved.',
    toastConnected: 'Connected to Google Drive and synced.',
    toastDisconnected: 'Disconnected from Google Drive.',
    toastSyncSaved: 'Sync settings saved.',
    toastSyncDone: 'Sync complete ({direction})',
    toastPushDone: 'Force push to Google Drive complete.',
    toastPullDone: 'Force pull from Google Drive complete.',
    toastExportDone: 'JSON backup downloaded.',
    toastImportDone: 'Bookmarks restored from JSON.',
    toastRestoreDone: 'Backup restored.',
    toastLogsCleared: 'Logs cleared.',
    errLoadFailed: 'Failed to load dashboard data.',
    errSaveFailed: 'Failed to save settings.',
    errConnectFailed: 'Connection failed.',
    errSyncFailed: 'Sync failed.',
    errPushFailed: 'Upload failed.',
    errPullFailed: 'Download failed.',
    errExportFailed: 'Export failed.',
    errImportFailed: 'Import failed.',
    errRestoreFailed: 'Restore failed.',
    errInvalidJson: 'Invalid file: missing roots field.',
    errParseFile: 'File parse error: {msg}',
  },
};

/**
 * 시스템 언어 자동 감지 (ko* -> 'ko', 그 외 -> 'en')
 */
export function detectSystemLanguage(overrideLocale = null) {
  let raw = overrideLocale;
  if (!raw && typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
    raw = chrome.i18n.getUILanguage();
  }
  if (!raw && typeof navigator !== 'undefined') {
    raw = navigator.language || (navigator.languages && navigator.languages[0]);
  }
  const normalized = String(raw || 'en').toLowerCase();
  return normalized.startsWith('ko') ? 'ko' : 'en';
}

export function resolveLanguage(settingLang = 'auto', overrideLocale = null) {
  if (settingLang === 'ko' || settingLang === 'en') return settingLang;
  return detectSystemLanguage(overrideLocale);
}

export function createTranslator(lang) {
  const dict = MESSAGES[lang] || MESSAGES.en;
  return function t(key, vars = {}) {
    let text = dict[key] ?? MESSAGES.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
    return text;
  };
}

export function applyI18nToDom(lang) {
  const t = createTranslator(lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (key) node.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (key) node.setAttribute('placeholder', t(key));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    const key = node.getAttribute('data-i18n-title');
    if (key) node.setAttribute('title', t(key));
  });
  return t;
}
