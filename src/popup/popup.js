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
  if (!iso) return '기록 없음';
  const diffSec = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (diffSec < 10) return '방금 전';
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function formatTimeShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setButtonsDisabled(disabled, syncing = false) {
  el.syncNowBtn.disabled = disabled;
  el.pushBtn.disabled = disabled;
  el.pullBtn.disabled = disabled;
  el.syncNowBtn.classList.toggle('is-spinning', syncing);
  el.syncBtnLabel.textContent = syncing ? '동기화 중...' : '지금 동기화';
}

function render(data) {
  const { auth, state, settings, logs } = data;

  setActiveSkinUI(settings.uiTheme || 'obsidian');

  el.bookmarkCount.textContent = Number(state.bookmarkCount ?? 0).toLocaleString('ko-KR');
  el.folderCountText.textContent = `폴더 ${Number(state.folderCount ?? 0).toLocaleString('ko-KR')}개`;
  el.autoSyncLabel.textContent = settings.autoSync ? `자동 ${settings.syncIntervalMinutes}분` : '자동 꺼짐';
  el.lastSyncText.textContent = formatRelativeTime(state.lastSyncAt);

  if (auth.connected) {
    el.accountEmail.textContent = auth.email || 'Google 계정 연결됨';
    el.drivePath.textContent = `${settings.driveFolderName}/${settings.driveFileName}`;
    el.disconnectedCta.classList.add('hidden');
    el.actionsSection.classList.remove('hidden');
  } else {
    el.accountEmail.textContent = 'Google Drive 미연결';
    el.drivePath.textContent = '';
    el.disconnectedCta.classList.remove('hidden');
    el.actionsSection.classList.add('hidden');
  }

  const statusMap = {
    success: { text: '동기화됨', cls: 'status-success' },
    syncing: { text: '동기화 중', cls: 'status-syncing' },
    error: { text: '오류', cls: 'status-error' },
    disconnected: { text: '미연결', cls: 'status-disconnected' },
    idle: { text: auth.connected ? '대기 중' : '미연결', cls: 'status-idle' },
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
    el.recentLogs.innerHTML = '<li class="activity-empty">아직 동기화 기록이 없습니다.</li>';
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
  if (!confirm('현재 브라우저의 북마크로 Google Drive 파일을 덮어쓸까요?')) return;
  setButtonsDisabled(true, true);
  await sendMsg('FORCE_PUSH');
  await refresh();
});

el.pullBtn.addEventListener('click', async () => {
  if (
    !confirm(
      'Google Drive의 북마크로 현재 브라우저를 덮어쓸까요?\n(덮어쓰기 전 현재 북마크는 자동 백업됩니다)'
    )
  ) {
    return;
  }
  setButtonsDisabled(true, true);
  await sendMsg('FORCE_PULL');
  await refresh();
});

refresh();
