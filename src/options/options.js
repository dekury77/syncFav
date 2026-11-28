import { applyI18nToDom, resolveLanguage } from '../shared/i18n.js';
import { SKINS, applyTheme } from '../shared/theme-manager.js';

function sendMsg(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload });
}

const el = {
  appVersion: document.getElementById('appVersion'),
  connectionPill: document.getElementById('connectionPill'),
  connectionLabel: document.getElementById('connectionLabel'),
  sidebarSummary: document.getElementById('sidebarSummary'),
  toast: document.getElementById('toast'),
  navItems: [...document.querySelectorAll('.nav-item')],
  panels: [...document.querySelectorAll('.panel')],
  quickSkinBtns: [...document.querySelectorAll('.quick-skin-btn')],
  skinCardsGrid: document.getElementById('skinCardsGrid'),
  uiLanguage: document.getElementById('uiLanguage'),

  redirectUri: document.getElementById('redirectUri'),
  copyRedirectBtn: document.getElementById('copyRedirectBtn'),
  clientId: document.getElementById('clientId'),
  clientSecret: document.getElementById('clientSecret'),
  driveFolderName: document.getElementById('driveFolderName'),
  driveFileName: document.getElementById('driveFileName'),
  saveOAuthBtn: document.getElementById('saveOAuthBtn'),
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  connectedInfo: document.getElementById('connectedInfo'),

  deviceName: document.getElementById('deviceName'),
  syncStrategy: document.getElementById('syncStrategy'),
  syncIntervalMinutes: document.getElementById('syncIntervalMinutes'),
  debounceSeconds: document.getElementById('debounceSeconds'),
  autoSync: document.getElementById('autoSync'),
  failsafeEnabled: document.getElementById('failsafeEnabled'),
  saveSyncSettingsBtn: document.getElementById('saveSyncSettingsBtn'),

  syncNowBtn: document.getElementById('syncNowBtn'),
  forcePushBtn: document.getElementById('forcePushBtn'),
  forcePullBtn: document.getElementById('forcePullBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  importJsonBtn: document.getElementById('importJsonBtn'),
  importFileInput: document.getElementById('importFileInput'),

  backupList: document.getElementById('backupList'),
  logList: document.getElementById('logList'),
  clearLogsBtn: document.getElementById('clearLogsBtn'),
};

let currentTheme = 'obsidian';
let currentLang = resolveLanguage('auto');
let t = applyI18nToDom(currentLang);
let toastTimer = null;

function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle('error', isError);
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 3200);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(currentLang === 'ko' ? 'ko-KR' : 'en-US');
}

// --- Tab Navigation ---
function switchTab(tabId) {
  el.navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
  el.panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tabId));
}

el.navItems.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// --- Language System ---
function syncLanguageUI(settingLang) {
  currentLang = resolveLanguage(settingLang || 'auto');
  t = applyI18nToDom(currentLang);
  document.title = t('settingsTitle');
  if (el.uiLanguage) {
    el.uiLanguage.value = settingLang || 'auto';
  }
}

el.uiLanguage.addEventListener('change', async () => {
  const chosen = el.uiLanguage.value;
  await sendMsg('UPDATE_SETTINGS', { uiLanguage: chosen });
  await loadDashboard();
  showToast(t('toastLangApplied'));
});

// --- Skin System ---
function syncSkinUI(themeId) {
  currentTheme = applyTheme(themeId);
  el.quickSkinBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.skin === currentTheme);
  });
  renderSkinCards();
}

async function selectSkin(themeId) {
  syncSkinUI(themeId);
  await sendMsg('UPDATE_SETTINGS', { uiTheme: themeId });
  const skinMeta = SKINS.find((s) => s.id === themeId);
  showToast(t('toastSkinApplied', { name: skinMeta?.name || themeId }));
}

el.quickSkinBtns.forEach((btn) => {
  btn.addEventListener('click', () => selectSkin(btn.dataset.skin));
});

function getSkinDesc(skinId) {
  if (skinId === 'obsidian') return t('skinObsidianDesc');
  if (skinId === 'editorial') return t('skinEditorialDesc');
  if (skinId === 'promax') return t('skinPromaxDesc');
  return '';
}

function renderSkinCards() {
  el.skinCardsGrid.innerHTML = SKINS.map((skin) => {
    const [bg, surface, accent, status] = skin.swatches;
    const isSelected = skin.id === currentTheme;
    return `
      <button type="button" class="skin-card ${isSelected ? 'selected' : ''}" data-skin-card="${skin.id}">
        <div class="skin-preview-box" style="background:${bg};">
          <div class="preview-bar">
            <div class="preview-dots">
              ${skin.swatches.map((c) => `<span class="preview-swatch" style="background:${c};"></span>`).join('')}
            </div>
            <span class="preview-pill" style="background:${accent};"></span>
          </div>
          <div class="preview-lines">
            <span class="preview-line" style="width:72%;background:${status};"></span>
            <span class="preview-line" style="width:48%;background:${surface};"></span>
          </div>
        </div>
        <div class="skin-card-head">
          <span class="skin-card-name">${escapeHtml(skin.name)}</span>
          <span class="skin-card-tag">${escapeHtml(skin.tag)}</span>
        </div>
        <p class="skin-card-desc">${escapeHtml(getSkinDesc(skin.id))}</p>
      </button>
    `;
  }).join('');

  el.skinCardsGrid.querySelectorAll('[data-skin-card]').forEach((card) => {
    card.addEventListener('click', () => selectSkin(card.dataset.skinCard));
  });
}

// --- Dashboard Data ---
async function loadDashboard() {
  if (el.appVersion && chrome.runtime?.getManifest) {
    el.appVersion.textContent = `Bookmark Sync · v${chrome.runtime.getManifest().version}`;
  }
  const data = await sendMsg('GET_DASHBOARD_DATA');
  if (!data?.ok) {
    showToast(data?.error || t('errLoadFailed'), true);
    return;
  }

  const { redirectUri, settings, auth, state, backups, logs } = data;
  syncLanguageUI(settings.uiLanguage || 'auto');
  syncSkinUI(settings.uiTheme || 'obsidian');

  el.redirectUri.value = redirectUri || '';
  el.clientId.value = settings.clientId || '';
  el.clientSecret.value = settings.clientSecret || '';
  el.driveFolderName.value = settings.driveFolderName || 'SyncFav';
  el.driveFileName.value = settings.driveFileName || 'bookmarks.json';

  el.deviceName.value = settings.deviceName || '';
  el.syncStrategy.value = settings.syncStrategy || 'three_way_merge';
  el.syncIntervalMinutes.value = settings.syncIntervalMinutes ?? 5;
  el.debounceSeconds.value = settings.debounceSeconds ?? 5;
  el.autoSync.checked = Boolean(settings.autoSync);
  el.failsafeEnabled.checked = settings.failsafeEnabled !== false;

  const locale = currentLang === 'ko' ? 'ko-KR' : 'en-US';
  const countText = t('summaryCounts', {
    bookmarks: Number(state.bookmarkCount || 0).toLocaleString(locale),
    folders: Number(state.folderCount || 0).toLocaleString(locale),
  });

  if (auth.connected) {
    el.connectionLabel.textContent = t('statusConnected');
    el.connectionPill.className = 'status-pill status-ok';
    el.sidebarSummary.textContent = `${auth.email || 'Google'}\n${countText}`;
    el.connectBtn.textContent = t('reconnectAccount');
    el.disconnectBtn.classList.remove('hidden');

    const tokenMode = auth.hasRefreshToken ? t('tokenAutoRefresh') : t('tokenShortTerm');
    el.connectedInfo.innerHTML = `
      <div><strong>${escapeHtml(auth.email || 'Google')}</strong> · ${escapeHtml(tokenMode)}</div>
      <div class="data-meta">Google Drive / ${escapeHtml(settings.driveFolderName)} / ${escapeHtml(
      settings.driveFileName
    )} (${escapeHtml(countText)})</div>
    `;
    el.connectedInfo.classList.remove('hidden');
  } else {
    el.connectionLabel.textContent = t('statusDisconnected');
    el.connectionPill.className = 'status-pill status-idle';
    el.sidebarSummary.textContent = countText;
    el.connectBtn.textContent = t('connectDrive');
    el.disconnectBtn.classList.add('hidden');
    el.connectedInfo.classList.add('hidden');
  }

  renderBackups(backups || []);
  renderLogs(logs || []);
}

function renderBackups(backups) {
  if (backups.length === 0) {
    el.backupList.innerHTML = `<div class="empty-state">${escapeHtml(t('noBackups'))}</div>`;
    return;
  }

  const locale = currentLang === 'ko' ? 'ko-KR' : 'en-US';
  el.backupList.innerHTML = backups
    .map(
      (b) => `
      <div class="data-row">
        <div>
          <strong>${formatDateTime(b.createdAt)}</strong>
          <div class="data-meta">${escapeHtml(
            t('backupMeta', {
              reason: b.reason,
              count: Number(b.stats?.bookmarks ?? 0).toLocaleString(locale),
            })
          )}</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm restore-btn" data-id="${escapeHtml(b.id)}">
          ${escapeHtml(t('restoreBtn'))}
        </button>
      </div>`
    )
    .join('');

  el.backupList.querySelectorAll('.restore-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('confirmRestore'))) return;
      const res = await sendMsg('RESTORE_BACKUP', { backupId: btn.dataset.id });
      if (res?.ok) {
        showToast(t('toastRestoreDone'));
        await loadDashboard();
      } else {
        showToast(res?.error || t('errRestoreFailed'), true);
      }
    });
  });
}

function renderLogs(logs) {
  if (logs.length === 0) {
    el.logList.innerHTML = `<div class="empty-state">${escapeHtml(t('noLogs'))}</div>`;
    return;
  }

  el.logList.innerHTML = logs
    .map(
      (log) => `
      <div class="data-row ${log.level === 'error' ? 'error' : ''}">
        <span>${escapeHtml(log.message)}</span>
        <span class="data-meta">${formatDateTime(log.timestamp)}</span>
      </div>`
    )
    .join('');
}

// --- Event Handlers ---
el.copyRedirectBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(el.redirectUri.value);
  showToast(t('toastCopied'));
});

el.saveOAuthBtn.addEventListener('click', async () => {
  const res = await sendMsg('UPDATE_SETTINGS', {
    clientId: el.clientId.value.trim(),
    clientSecret: el.clientSecret.value.trim(),
    driveFolderName: el.driveFolderName.value.trim() || 'SyncFav',
    driveFileName: el.driveFileName.value.trim() || 'bookmarks.json',
  });
  if (res?.ok) {
    showToast(t('toastOAuthSaved'));
    await loadDashboard();
  } else {
    showToast(res?.error || t('errSaveFailed'), true);
  }
});

el.connectBtn.addEventListener('click', async () => {
  const clientId = el.clientId.value.trim();
  const clientSecret = el.clientSecret.value.trim();
  el.connectBtn.disabled = true;
  el.connectBtn.textContent = t('connectingBtn');
  const res = await sendMsg('SIGN_IN', {
    clientId,
    clientSecret,
    driveFolderName: el.driveFolderName.value.trim() || 'SyncFav',
    driveFileName: el.driveFileName.value.trim() || 'bookmarks.json',
  });
  el.connectBtn.disabled = false;
  if (res?.ok) showToast(t('toastConnected'));
  else showToast(res?.error || t('errConnectFailed'), true);
  await loadDashboard();
});

el.disconnectBtn.addEventListener('click', async () => {
  if (!confirm(t('confirmDisconnect'))) return;
  await sendMsg('SIGN_OUT');
  showToast(t('toastDisconnected'));
  await loadDashboard();
});

el.saveSyncSettingsBtn.addEventListener('click', async () => {
  const res = await sendMsg('UPDATE_SETTINGS', {
    deviceName: el.deviceName.value.trim(),
    syncStrategy: el.syncStrategy.value,
    syncIntervalMinutes: Math.max(1, Number(el.syncIntervalMinutes.value) || 5),
    debounceSeconds: Math.max(3, Number(el.debounceSeconds.value) || 5),
    autoSync: el.autoSync.checked,
    failsafeEnabled: el.failsafeEnabled.checked,
  });
  if (res?.ok) {
    showToast(t('toastSyncSaved'));
    await loadDashboard();
  } else {
    showToast(res?.error || t('errSaveFailed'), true);
  }
});

el.syncNowBtn.addEventListener('click', async () => {
  el.syncNowBtn.disabled = true;
  const res = await sendMsg('SYNC_NOW');
  el.syncNowBtn.disabled = false;
  if (res?.ok) showToast(t('toastSyncDone', { direction: res.direction }));
  else showToast(res?.error || res?.message || t('errSyncFailed'), true);
  await loadDashboard();
});

el.forcePushBtn.addEventListener('click', async () => {
  if (!confirm(t('confirmPush'))) return;
  const res = await sendMsg('FORCE_PUSH');
  if (res?.ok) showToast(t('toastPushDone'));
  else showToast(res?.error || t('errPushFailed'), true);
  await loadDashboard();
});

el.forcePullBtn.addEventListener('click', async () => {
  if (!confirm(t('confirmPull'))) return;
  const res = await sendMsg('FORCE_PULL');
  if (res?.ok) showToast(t('toastPullDone'));
  else showToast(res?.error || t('errPullFailed'), true);
  await loadDashboard();
});

el.exportJsonBtn.addEventListener('click', async () => {
  const res = await sendMsg('EXPORT_LOCAL');
  if (!res?.ok) return showToast(t('errExportFailed'), true);
  const blob = new Blob([JSON.stringify(res.snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `favosync-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(t('toastExportDone'));
});

el.importJsonBtn.addEventListener('click', () => el.importFileInput.click());

el.importFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    if (!json.roots) throw new Error(t('errInvalidJson'));
    if (!confirm(t('confirmImport'))) return;
    const res = await sendMsg('IMPORT_JSON', { roots: json.roots });
    if (res?.ok) {
      showToast(t('toastImportDone'));
      await loadDashboard();
    } else {
      showToast(res?.error || t('errImportFailed'), true);
    }
  } catch (err) {
    showToast(t('errParseFile', { msg: err.message }), true);
  } finally {
    el.importFileInput.value = '';
  }
});

el.clearLogsBtn.addEventListener('click', async () => {
  await sendMsg('CLEAR_LOGS');
  showToast(t('toastLogsCleared'));
  await loadDashboard();
});

loadDashboard();
