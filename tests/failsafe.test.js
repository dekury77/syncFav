import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFailsafe } from '../src/lib/sync-engine.js';

test('Failsafe: 30% 이상 & 50개 이상 삭제 시 자동 동기화를 차단한다', () => {
  const res = evaluateFailsafe(1000, 650, {
    failsafeEnabled: true,
    failsafeMaxDeletePercent: 30,
    failsafeMinDeleteCount: 50,
  });
  assert.equal(res.blocked, true);
  assert.equal(res.deletedCount, 350);
  assert.equal(res.deletedPercent, 35);
});

test('Failsafe: 소규모 북마크(예: 10개 -> 5개)는 최소 개수(50개) 미만이라 통과한다', () => {
  const res = evaluateFailsafe(10, 5, {
    failsafeEnabled: true,
    failsafeMaxDeletePercent: 30,
    failsafeMinDeleteCount: 50,
  });
  assert.equal(res.blocked, false);
});

test('Failsafe: 비활성화 시 대량 삭제도 통과한다', () => {
  const res = evaluateFailsafe(1000, 100, { failsafeEnabled: false });
  assert.equal(res.blocked, false);
});
