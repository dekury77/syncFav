function sendMsg(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload });
}

const el = {
  connectionPill: document.getElementById('connectionPill'),
  toast: document.getElementById('toast'),
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

let toastTimer = null;
function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle('error', isError);
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 3500);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR');
}

async function loadDashboard() {
  const data = await sendMsg('GET_DASHBOARD_DATA');
  if (!data?.ok) {
    showToast(data?.error || '상태를 불러오지 못했습니다.', true);
    return;
  }

  const { redirectUri, settings, auth, state, backups, logs } = data;

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

  if (auth.connected) {
    el.connectionPill.textContent = `연결됨 (${auth.email || 'Google'})`;
    el.connectionPill.className = 'pill pill-on';
    el.connectBtn.textContent = '계정 다시 연결';
    el.disconnectBtn.classList.remove('hidden');

    const tokenMode = auth.hasRefreshToken
      ? '자동 갱신 활성화 (Refresh Token)'
      : '단기 토큰 모드 (Client Secret 입력 시 무제한 자동 갱신)';
    el.connectedInfo.innerHTML = `
      <strong>연결 계정:</strong> ${escapeHtml(auth.email || '알 수 없음')} &nbsp;|&nbsp;
      <strong>저장 위치:</strong> Google Drive / ${escapeHtml(settings.driveFolderName)} / ${escapeHtml(settings.driveFileName)}<br/>
      <strong>토큰 상태:</strong> ${tokenMode} &nbsp;|&nbsp;
      <strong>현재 북마크:</strong> ${state.bookmarkCount}개 (폴더 ${state.folderCount}개)
    `;
    el.connectedInfo.classList.remove('hidden');
  } else {
    el.connectionPill.textContent = '미연결';
    el.connectionPill.className = 'pill pill-off';
    el.connectBtn.textContent = 'Google Drive 연결';
    el.disconnectBtn.classList.add('hidden');
    el.connectedInfo.classList.add('hidden');
  }

  renderBackups(backups || []);
  renderLogs(logs || []);
}

function renderBackups(backups) {
  if (backups.length === 0) {
    el.backupList.innerHTML = '<div class="muted">아직 생성된 로컬 백업이 없습니다.</div>';
    return;
  }

  el.backupList.innerHTML = backups
    .map(
      (b) => `
      <div class="list-item">
        <div>
          <strong>${formatDateTime(b.createdAt)}</strong>
          <span class="muted"> — ${escapeHtml(b.reason)} (북마크 ${b.stats?.bookmarks ?? '?'}개)</span>
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
    el.logList.innerHTML = '<div class="muted">기록된 로그가 없습니다.</div>';
    return;
  }

  el.logList.innerHTML = logs
    .map(
      (log) => `
      <div class="log-row ${escapeHtml(log.level)}">
        <span>${escapeHtml(log.message)}</span>
        <span class="muted">${formatDateTime(log.timestamp)}</span>
      </div>`
    )
    .join('');
}

// --- Event Handlers ---
el.copyRedirectBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(el.redirectUri.value);
  showToast('Redirect URI가 클립보드에 복사되었습니다.');
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
  if (!clientId) {
    showToast('먼저 Google OAuth Client ID를 입력해주세요.', true);
    el.clientId.focus();
    return;
  }
  el.connectBtn.disabled = true;
  el.connectBtn.textContent = '연결 중...';
  const res = await sendMsg('SIGN_IN', {
    clientId,
    clientSecret: el.clientSecret.value.trim(),
    driveFolderName: el.driveFolderName.value.trim() || 'SyncFav',
    driveFileName: el.driveFileName.value.trim() || 'bookmarks.json',
  });
  el.connectBtn.disabled = false;
  if (res?.ok) {
    showToast('Google Drive 연결 및 초기 동기화가 완료되었습니다!');
  } else {
    showToast(res?.error || '연결 실패', true);
  }
  await loadDashboard();
});

el.disconnectBtn.addEventListener('click', async () => {
  if (!confirm('Google Drive 연결을 해제할까요? (로컬 북마크와 드라이브 파일은 삭제되지 않습니다)')) {
    return;
  }
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
  if (!res?.ok) {
    showToast('내보내기 실패', true);
    return;
  }
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
    const text = await file.text();
    const json = JSON.parse(text);
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
