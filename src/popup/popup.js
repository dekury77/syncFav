import { applyI18nToDom, createTranslator, resolveLanguage } from '../shared/i18n.js';
import { applyTheme } from '../shared/theme-manager.js';

function sendMsg(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload });
}

const el = {
  statusBadge: document.getElementById('statusBadge'),
  statusLabel: document.getElementById('statusLabel'),
  lastSyncText: document.getElementById('lastSyncText'),
  accountEmail: document.getElementById('accountEmail'),
  drivePath: document.getElementById('drivePath'),
  errorBanner: document.getElementById('errorBanner'),
  bookmarkCount: document.getElementById('bookmarkCount'),
  folderCountText: document.getElementById('folderCountText'),
  autoSyncLabel: document.getElementById('autoSyncLabel'),
  disconnectedCta: document.getElementById('disconnectedCta'),
  actionsSection: document.getElementById('actionsSection'),
  syncNowBtn: document.getElementById('syncNowBtn'),
  syncBtnLabel: document.getElementById('syncBtnLabel'),
  pushBtn: document.getElementById('pushBtn'),
  pullBtn: document.getElementById('pullBtn'),
  recentLogs: document.getElementById('recentLogs'),
  openOptionsBtn: document.getElementById('openOptionsBtn'),
  setupBtn: document.getElementById('setupBtn'),
  moreOptionsLink: document.getElementById('moreOptionsLink'),
  skinPills: [...document.querySelectorAll('.skin-pill')],
};

let currentLang = resolveLanguage('auto');
let t = applyI18nToDom(currentLang);

function openOptions() {
  chrome.runtime.openOptionsPage();
}

el.openOptionsBtn.addEventListener('click', openOptions);
el.setupBtn.addEventListener('click', openOptions);
el.moreOptionsLink.addEventListener('click', openOptions);

function setActiveSkinUI(themeId) {
  const active = applyTheme(themeId);
  el.skinPills.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.skin === active);
  });
}

el.skinPills.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const skin = btn.dataset.skin;
    setActiveSkinUI(skin);
    await sendMsg('UPDATE_SETTINGS', { uiTheme: skin });
  });
});

function formatRelativeTime(iso) {
  if (!iso) return t('noRecord');
  const diffSec = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (diffSec < 10) return t('justNow');
  if (diffSec < 60) return t('secondsAgo', { n: diffSec });
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('minutesAgo', { n: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('hoursAgo', { n: diffHour });
  return new Date(iso).toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US');
}

function formatTimeShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(currentLang === 'ko' ? 'ko-KR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setButtonsDisabled(disabled, syncing = false) {
  el.syncNowBtn.disabled = disabled;
  el.pushBtn.disabled = disabled;
  el.pullBtn.disabled = disabled;
  el.syncNowBtn.classList.toggle('is-spinning', syncing);
  el.syncBtnLabel.textContent = syncing ? t('syncingBtn') : t('syncNow');
}

function render(data) {
  const { auth, state, settings, logs } = data;

  currentLang = resolveLanguage(settings.uiLanguage || 'auto');
  t = applyI18nToDom(currentLang);
  setActiveSkinUI(settings.uiTheme || 'obsidian');

  const locale = currentLang === 'ko' ? 'ko-KR' : 'en-US';
  el.bookmarkCount.textContent = Number(state.bookmarkCount ?? 0).toLocaleString(locale);
  el.folderCountText.textContent = t('foldersCount', {
    count: Number(state.folderCount ?? 0).toLocaleString(locale),
  });
  el.autoSyncLabel.textContent = settings.autoSync
    ? t('autoInterval', { min: settings.syncIntervalMinutes })
    : t('autoOff');
  el.lastSyncText.textContent = formatRelativeTime(state.lastSyncAt);

  if (auth.connected) {
    el.accountEmail.textContent = auth.email || t('googleConnectedFallback');
    el.drivePath.textContent = `${settings.driveFolderName}/${settings.driveFileName}`;
    el.disconnectedCta.classList.add('hidden');
    el.actionsSection.classList.remove('hidden');
  } else {
    el.accountEmail.textContent = t('driveDisconnected');
    el.drivePath.textContent = '';
    el.disconnectedCta.classList.remove('hidden');
    el.actionsSection.classList.add('hidden');
  }

  const statusMap = {
    success: { text: t('statusSynced'), cls: 'status-success' },
    syncing: { text: t('statusSyncing'), cls: 'status-syncing' },
    error: { text: t('statusError'), cls: 'status-error' },
    disconnected: { text: t('statusDisconnected'), cls: 'status-disconnected' },
    idle: { text: auth.connected ? t('statusIdle') : t('statusDisconnected'), cls: 'status-idle' },
  };
  const badge = statusMap[state.status] || statusMap.idle;
  el.statusLabel.textContent = badge.text;
  el.statusBadge.className = `status-pill ${badge.cls}`;

  if (state.lastError) {
    el.errorBanner.textContent = state.lastError;
    el.errorBanner.classList.remove('hidden');
  } else {
    el.errorBanner.classList.add('hidden');
  }

  setButtonsDisabled(state.status === 'syncing', state.status === 'syncing');

  const recent = (logs || []).slice(0, 3);
  if (recent.length === 0) {
    el.recentLogs.innerHTML = `<li class="activity-empty">${escapeHtml(t('noSyncHistory'))}</li>`;
  } else {
    el.recentLogs.innerHTML = recent
      .map(
        (log) =>
          `<li class="activity-item ${log.level === 'error' ? 'error' : ''}">
            <span>${escapeHtml(log.message)}</span>
            <span class="activity-time">${formatTimeShort(log.timestamp)}</span>
          </li>`
      )
      .join('');
  }
}

async function refresh() {
  const data = await sendMsg('GET_DASHBOARD_DATA');
  if (data?.ok) render(data);
}

el.syncNowBtn.addEventListener('click', async () => {
  setButtonsDisabled(true, true);
  await sendMsg('SYNC_NOW');
  await refresh();
});

el.pushBtn.addEventListener('click', async () => {
  if (!confirm(t('confirmPush'))) return;
  setButtonsDisabled(true, true);
  await sendMsg('FORCE_PUSH');
  await refresh();
});

el.pullBtn.addEventListener('click', async () => {
  if (!confirm(t('confirmPull'))) return;
  setButtonsDisabled(true, true);
  await sendMsg('FORCE_PULL');
  await refresh();
});

refresh();
