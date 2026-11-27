import { SYNC_STATUS } from '../shared/constants.js';
import {
  addBackup,
  addLog,
  getAuth,
  getLastSyncedSnapshot,
  getSettings,
  getSyncState,
  saveLastSyncedSnapshot,
  updateSyncState,
} from '../shared/storage.js';
import {
  applySnapshotToBrowser,
  computeChecksum,
  countStats,
  createSnapshotFromTree,
  mergeSnapshots,
} from './bookmark-tree.js';
import { getValidAccessToken } from './google-auth.js';
import {
  downloadSnapshot,
  ensureSyncFolder,
  findSyncFile,
  uploadSnapshot,
} from './google-drive.js';

let syncInProgress = false;
let applyingRemote = false;

export function isApplyingRemoteChanges() {
  return applyingRemote;
}

export function isSyncRunning() {
  return syncInProgress;
}

/**
 * 대량 삭제 방지 (Failsafe) 검사
 * 이전 북마크 수 대비 일정 비율(%) 이상이면서 최소 개수 이상 한꺼번에 삭제되려 하면 차단한다.
 */
export function evaluateFailsafe(beforeCount, afterCount, settings = {}) {
  if (settings.failsafeEnabled === false) {
    return { blocked: false };
  }
  if (!beforeCount || beforeCount <= 0 || afterCount >= beforeCount) {
    return { blocked: false };
  }
  const deletedCount = beforeCount - afterCount;
  const deletedPercent = (deletedCount / beforeCount) * 100;
  const maxPercent = Number(settings.failsafeMaxDeletePercent ?? 30);
  const minCount = Number(settings.failsafeMinDeleteCount ?? 50);

  if (deletedCount >= minCount && deletedPercent >= maxPercent) {
    return {
      blocked: true,
      deletedCount,
      deletedPercent: Math.round(deletedPercent),
      message: `대량 삭제 방지(Failsafe) 작동: 북마크 ${deletedCount}개(${Math.round(
        deletedPercent
      )}%)가 한꺼번에 삭제되려 해 자동 동기화를 중단했습니다. 의도한 변경이라면 설정에서 수동 덮어쓰기를 실행하세요.`,
    };
  }
  return { blocked: false };
}

async function setBadge(text, color) {
  if (typeof chrome === 'undefined' || !chrome.action) return;
  try {
    await chrome.action.setBadgeText({ text });
    if (color) {
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  } catch {
    // ignore
  }
}

export async function getLocalSnapshot() {
  const settings = await getSettings();
  const tree = await chrome.bookmarks.getTree();
  return createSnapshotFromTree(tree, {
    deviceName: settings.deviceName,
  });
}

/**
 * 로컬 북마크에 스냅샷을 안전하게 적용 (이벤트 루프 방지 포함)
 */
async function applyToLocalSafely(targetRoots, backupReason) {
  const currentLocal = await getLocalSnapshot();
  await addBackup(currentLocal, backupReason);

  applyingRemote = true;
  try {
    const summary = await applySnapshotToBrowser(chrome.bookmarks, targetRoots);
    return summary;
  } finally {
    // Chrome 북마크 이벤트가 비동기적으로 늦게 도착할 수 있어 짧은 지연 후 해제
    setTimeout(() => {
      applyingRemote = false;
    }, 800);
  }
}

/**
 * 핵심 동기화 실행 함수
 * @param {{ mode?: 'smart'|'push'|'pull', reason?: string }} options
 */
export async function runSync({ mode = 'smart', reason = 'manual' } = {}) {
  if (syncInProgress) {
    return { skipped: true, message: '이미 동기화가 진행 중입니다.' };
  }

  const auth = await getAuth();
  if (!auth || !auth.accessToken) {
    await updateSyncState({
      status: SYNC_STATUS.DISCONNECTED,
      lastError: null,
    });
    return { skipped: true, message: 'Google Drive에 연결되어 있지 않습니다.' };
  }

  syncInProgress = true;
  await updateSyncState({
    status: SYNC_STATUS.SYNCING,
    lastError: null,
  });
  await setBadge('...', '#2563eb');

  try {
    const settings = await getSettings();
    const state = await getSyncState();
    const token = await getValidAccessToken();

    // 1. Google Drive 폴더 및 파일 확인
    const folderId = await ensureSyncFolder(
      token,
      settings.driveFolderName || 'SyncFav',
      state.remoteFolderId
    );
    const fileId = await findSyncFile(
      token,
      folderId,
      settings.driveFileName || 'bookmarks.json',
      state.remoteFileId
    );

    // 2. 로컬 스냅샷 생성
    const localSnapshot = await getLocalSnapshot();
    const baseSnapshot = await getLastSyncedSnapshot();

    // 3. 원격 스냅샷 다운로드 (존재하는 경우)
    const remoteSnapshot = fileId ? await downloadSnapshot(token, fileId) : null;

    let finalSnapshot = localSnapshot;
    let direction = 'noop';
    let appliedSummary = null;
    let uploadedFileId = fileId;

    if (mode === 'push') {
      const uploaded = await uploadSnapshot(
        token,
        folderId,
        settings.driveFileName || 'bookmarks.json',
        localSnapshot,
        fileId
      );
      uploadedFileId = uploaded.id || fileId;
      finalSnapshot = localSnapshot;
      direction = 'push';
      await addLog('success', `강제 업로드 완료 (북마크 ${localSnapshot.stats.bookmarks}개)`, {
        reason,
        mode,
      });
    } else if (mode === 'pull') {
      if (!remoteSnapshot) {
        throw new Error('Google Drive에 저장된 북마크 파일이 아직 없습니다.');
      }
      appliedSummary = await applyToLocalSafely(remoteSnapshot.roots, 'before_force_pull');
      finalSnapshot = {
        ...remoteSnapshot,
        checksum: computeChecksum(remoteSnapshot.roots),
        stats: countStats(remoteSnapshot.roots),
      };
      direction = 'pull';
      await addLog('success', `강제 다운로드 완료 (북마크 ${finalSnapshot.stats.bookmarks}개)`, {
        reason,
        mode,
        appliedSummary,
      });
    } else {
      // SMART SYNC
      if (!remoteSnapshot) {
        // 원격에 파일이 없음 -> 최초 업로드
        const uploaded = await uploadSnapshot(
          token,
          folderId,
          settings.driveFileName || 'bookmarks.json',
          localSnapshot,
          fileId
        );
        uploadedFileId = uploaded.id || fileId;
        finalSnapshot = localSnapshot;
        direction = 'initial_push';
        await addLog(
          'success',
          `Google Drive에 최초 업로드 완료 (북마크 ${localSnapshot.stats.bookmarks}개)`,
          { reason }
        );
      } else {
        const remoteChecksum = computeChecksum(remoteSnapshot.roots);
        const localChecksum = localSnapshot.checksum;
        const baseChecksum = baseSnapshot?.roots ? computeChecksum(baseSnapshot.roots) : null;

        if (localChecksum === remoteChecksum) {
          direction = 'up_to_date';
          finalSnapshot = localSnapshot;
          await addLog('info', '이미 최신 상태입니다.', { reason });
        } else if (baseChecksum && localChecksum === baseChecksum) {
          // 로컬 변경 없음, 원격만 변경됨 -> 원격 반영 전 Failsafe 검사
          const remoteStats = countStats(remoteSnapshot.roots);
          const guard = evaluateFailsafe(localSnapshot.stats.bookmarks, remoteStats.bookmarks, settings);
          if (guard.blocked) {
            throw new Error(guard.message);
          }
          appliedSummary = await applyToLocalSafely(remoteSnapshot.roots, 'before_pull');
          finalSnapshot = {
            ...remoteSnapshot,
            checksum: remoteChecksum,
            stats: remoteStats,
          };
          direction = 'pull';
          await addLog(
            'success',
            `원격 변경사항 반영 완료 (${remoteSnapshot.deviceName || '다른 기기'})`,
            { reason, appliedSummary }
          );
        } else if (baseChecksum && remoteChecksum === baseChecksum) {
          // 원격 변경 없음, 로컬만 변경됨 -> 원격 덮어쓰기 전 Failsafe 검사
          const remoteStats = countStats(remoteSnapshot.roots);
          const guard = evaluateFailsafe(remoteStats.bookmarks, localSnapshot.stats.bookmarks, settings);
          if (guard.blocked) {
            throw new Error(guard.message);
          }
          const uploaded = await uploadSnapshot(
            token,
            folderId,
            settings.driveFileName || 'bookmarks.json',
            localSnapshot,
            fileId
          );
          uploadedFileId = uploaded.id || fileId;
          finalSnapshot = localSnapshot;
          direction = 'push';
          await addLog(
            'success',
            `로컬 변경사항 업로드 완료 (북마크 ${localSnapshot.stats.bookmarks}개)`,
            { reason }
          );
        } else {
          // 양쪽 모두 변경되었거나 최초 2-way 동기화
          let targetSnapshot;
          if (settings.syncStrategy === 'latest_wins') {
            const localTime = Date.parse(localSnapshot.updatedAt || 0) || 0;
            const remoteTime = Date.parse(remoteSnapshot.updatedAt || 0) || 0;
            targetSnapshot = remoteTime > localTime ? remoteSnapshot : localSnapshot;
          } else {
            targetSnapshot = mergeSnapshots(baseSnapshot, localSnapshot, remoteSnapshot, {
              deviceName: settings.deviceName,
            });
          }

          const targetChecksum = computeChecksum(targetSnapshot.roots);

          if (targetChecksum !== localChecksum) {
            appliedSummary = await applyToLocalSafely(targetSnapshot.roots, 'before_merge');
          }

          if (targetChecksum !== remoteChecksum) {
            const uploaded = await uploadSnapshot(
              token,
              folderId,
              settings.driveFileName || 'bookmarks.json',
              targetSnapshot,
              fileId
            );
            uploadedFileId = uploaded.id || fileId;
          }

          finalSnapshot = {
            ...targetSnapshot,
            checksum: targetChecksum,
            stats: countStats(targetSnapshot.roots),
          };
          direction = 'merge';
          await addLog(
            'success',
            `양방향 병합 동기화 완료 (북마크 ${finalSnapshot.stats.bookmarks}개)`,
            { reason, appliedSummary }
          );
        }
      }
    }

    await saveLastSyncedSnapshot({
      schemaVersion: 1,
      updatedAt: finalSnapshot.updatedAt || new Date().toISOString(),
      checksum: finalSnapshot.checksum,
      roots: finalSnapshot.roots,
    });

    const nextState = await updateSyncState({
      status: SYNC_STATUS.SUCCESS,
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      lastDirection: direction,
      remoteFolderId: folderId,
      remoteFileId: uploadedFileId,
      localChecksum: finalSnapshot.checksum,
      remoteChecksum: finalSnapshot.checksum,
      bookmarkCount: finalSnapshot.stats.bookmarks,
      folderCount: finalSnapshot.stats.folders,
      pendingChanges: false,
    });

    await setBadge('', '#16a34a');
    return {
      ok: true,
      direction,
      state: nextState,
      appliedSummary,
    };
  } catch (err) {
    const message = err?.message || String(err);
    await updateSyncState({
      status: SYNC_STATUS.ERROR,
      lastError: message,
    });
    await addLog('error', `동기화 실패: ${message}`, { reason, mode });
    await setBadge('!', '#dc2626');
    return { ok: false, error: message };
  } finally {
    syncInProgress = false;
  }
}

/**
 * 로컬 백업 또는 가져온 JSON을 브라우저 북마크로 복원
 */
export async function restoreFromRoots(roots, reason = 'manual_restore') {
  const summary = await applyToLocalSafely(roots, `before_${reason}`);
  const local = await getLocalSnapshot();
  await updateSyncState({
    bookmarkCount: local.stats.bookmarks,
    folderCount: local.stats.folders,
    localChecksum: local.checksum,
    pendingChanges: true,
  });
  await addLog('info', `백업 복원 완료 (북마크 ${local.stats.bookmarks}개)`, { reason, summary });
  return { ok: true, summary, stats: local.stats };
}
