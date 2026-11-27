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
  return new Date(iso).toLocaleString('ko-KR');
}

// --- Tab Navigation ---
function switchTab(tabId) {
  el.navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
  el.panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tabId));
}

el.navItems.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
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
  showToast(`${skinMeta?.name || themeId} 스킨이 적용되었습니다.`);
}

el.quickSkinBtns.forEach((btn) => {
  btn.addEventListener('click', () => selectSkin(btn.dataset.skin));
});

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
        <p class="skin-card-desc">${escapeHtml(skin.description)}</p>
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
    showToast(data?.error || '상태를 불러오지 못했습니다.', true);
    return;
  }

  const { redirectUri, settings, auth, state, backups, logs } = data;
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

  const countText = `북마크 ${Number(state.bookmarkCount || 0).toLocaleString('ko-KR')}개 · 폴더 ${Number(
    state.folderCount || 0
  ).toLocaleString('ko-KR')}개`;

  if (auth.connected) {
    el.connectionLabel.textContent = '연결됨';
    el.connectionPill.className = 'status-pill status-ok';
    el.sidebarSummary.textContent = `${auth.email || 'Google'}\n${countText}`;
    el.connectBtn.textContent = '계정 다시 연결';
    el.disconnectBtn.classList.remove('hidden');

    const tokenMode = auth.hasRefreshToken
      ? '자동 갱신 활성화 (Refresh Token)'
      : '단기 토큰 모드';
    el.connectedInfo.innerHTML = `
      <div><strong>${escapeHtml(auth.email || 'Google 계정')}</strong> 연결됨 · ${tokenMode}</div>
      <div class="data-meta">Google Drive / ${escapeHtml(settings.driveFolderName)} / ${escapeHtml(
      settings.driveFileName
    )} (${countText})</div>
    `;
    el.connectedInfo.classList.remove('hidden');
  } else {
    el.connectionLabel.textContent = '미연결';
    el.connectionPill.className = 'status-pill status-idle';
    el.sidebarSummary.textContent = countText;
    el.connectBtn.textContent = 'Google Drive 연결';
    el.disconnectBtn.classList.add('hidden');
    el.connectedInfo.classList.add('hidden');
  }

  renderBackups(backups || []);
  renderLogs(logs || []);
}

function renderBackups(backups) {
  if (backups.length === 0) {
    el.backupList.innerHTML = '<div class="empty-state">아직 생성된 로컬 백업이 없습니다.</div>';
    return;
  }

  el.backupList.innerHTML = backups
    .map(
      (b) => `
      <div class="data-row">
        <div>
          <strong>${formatDateTime(b.createdAt)}</strong>
          <div class="data-meta">${escapeHtml(b.reason)} · 북마크 ${Number(
        b.stats?.bookmarks ?? 0
      ).toLocaleString('ko-KR')}개</div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm restore-btn" data-id="${escapeHtml(b.id)}">
          복원
        </button>
      </div>`
    )
    .join('');

  el.backupList.querySelectorAll('.restore-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 시점의 백업으로 현재 브라우저 북마크를 복원할까요?')) return;
      const res = await sendMsg('RESTORE_BACKUP', { backupId: btn.dataset.id });
      if (res?.ok) {
        showToast('백업이 복원되었습니다.');
        await loadDashboard();
      } else {
        showToast(res?.error || '복원 실패', true);
      }
    });
  });
}

function renderLogs(logs) {
  if (logs.length === 0) {
    el.logList.innerHTML = '<div class="empty-state">기록된 동기화 로그가 없습니다.</div>';
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
  showToast('Redirect URI가 복사되었습니다.');
});

el.saveOAuthBtn.addEventListener('click', async () => {
  const res = await sendMsg('UPDATE_SETTINGS', {
    clientId: el.clientId.value.trim(),
    clientSecret: el.clientSecret.value.trim(),
    driveFolderName: el.driveFolderName.value.trim() || 'SyncFav',
    driveFileName: el.driveFileName.value.trim() || 'bookmarks.json',
  });
  if (res?.ok) {
    showToast('OAuth 및 Drive 경로 설정이 저장되었습니다.');
    await loadDashboard();
  } else {
    showToast(res?.error || '저장 실패', true);
  }
});

el.connectBtn.addEventListener('click', async () => {
  const clientId = el.clientId.value.trim();
  const clientSecret = el.clientSecret.value.trim();
  el.connectBtn.disabled = true;
  el.connectBtn.textContent = '연결 중...';
  const res = await sendMsg('SIGN_IN', {
    clientId,
    clientSecret,
    driveFolderName: el.driveFolderName.value.trim() || 'SyncFav',
    driveFileName: el.driveFileName.value.trim() || 'bookmarks.json',
  });
  el.connectBtn.disabled = false;
  if (res?.ok) showToast('Google Drive 연결 및 동기화가 완료되었습니다.');
  else showToast(res?.error || '연결 실패', true);
  await loadDashboard();
});

el.disconnectBtn.addEventListener('click', async () => {
  if (!confirm('Google Drive 연결을 해제할까요? (로컬 북마크와 Drive 파일은 유지됩니다)')) return;
  await sendMsg('SIGN_OUT');
  showToast('연결이 해제되었습니다.');
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
    showToast('동기화 설정이 저장되었습니다.');
    await loadDashboard();
  } else {
    showToast(res?.error || '저장 실패', true);
  }
});

el.syncNowBtn.addEventListener('click', async () => {
  el.syncNowBtn.disabled = true;
  const res = await sendMsg('SYNC_NOW');
  el.syncNowBtn.disabled = false;
  if (res?.ok) showToast(`동기화 완료 (${res.direction})`);
  else showToast(res?.error || res?.message || '동기화 실패', true);
  await loadDashboard();
});

el.forcePushBtn.addEventListener('click', async () => {
  if (!confirm('현재 브라우저 북마크로 Google Drive 파일을 덮어쓸까요?')) return;
  const res = await sendMsg('FORCE_PUSH');
  if (res?.ok) showToast('Google Drive로 강제 업로드 완료');
  else showToast(res?.error || '업로드 실패', true);
  await loadDashboard();
});

el.forcePullBtn.addEventListener('click', async () => {
  if (!confirm('Google Drive 북마크로 현재 브라우저를 덮어쓸까요? (현재 북마크는 자동 백업됩니다)')) {
    return;
  }
  const res = await sendMsg('FORCE_PULL');
  if (res?.ok) showToast('Google Drive에서 강제 다운로드 완료');
  else showToast(res?.error || '다운로드 실패', true);
  await loadDashboard();
});

el.exportJsonBtn.addEventListener('click', async () => {
  const res = await sendMsg('EXPORT_LOCAL');
  if (!res?.ok) return showToast('내보내기 실패', true);
  const blob = new Blob([JSON.stringify(res.snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `syncfav-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON 백업 파일이 다운로드되었습니다.');
});

el.importJsonBtn.addEventListener('click', () => el.importFileInput.click());

el.importFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    if (!json.roots) throw new Error('roots 필드가 없는 잘못된 파일입니다.');
    if (!confirm('선택한 JSON 파일의 북마크로 현재 브라우저를 복원할까요?')) return;
    const res = await sendMsg('IMPORT_JSON', { roots: json.roots });
    if (res?.ok) {
      showToast('JSON 파일에서 북마크를 복원했습니다.');
      await loadDashboard();
    } else {
      showToast(res?.error || '가져오기 실패', true);
    }
  } catch (err) {
    showToast(`파일 파싱 오류: ${err.message}`, true);
  } finally {
    el.importFileInput.value = '';
  }
});

el.clearLogsBtn.addEventListener('click', async () => {
  await sendMsg('CLEAR_LOGS');
  showToast('로그가 비워졌습니다.');
  await loadDashboard();
});

loadDashboard();
