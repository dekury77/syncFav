import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MESSAGES,
  createTranslator,
  detectSystemLanguage,
  resolveLanguage,
} from '../src/shared/i18n.js';

test('시스템 언어 감지: ko-KR -> ko, en-US / ja-JP -> en', () => {
  assert.equal(detectSystemLanguage('ko-KR'), 'ko');
  assert.equal(detectSystemLanguage('ko'), 'ko');
  assert.equal(detectSystemLanguage('en-US'), 'en');
  assert.equal(detectSystemLanguage('ja-JP'), 'en');
});

test('resolveLanguage: auto면 시스템 언어, 명시 선택 시 해당 언어 우선', () => {
  assert.equal(resolveLanguage('auto', 'ko-KR'), 'ko');
  assert.equal(resolveLanguage('auto', 'en-US'), 'en');
  assert.equal(resolveLanguage('en', 'ko-KR'), 'en');
  assert.equal(resolveLanguage('ko', 'en-US'), 'ko');
});

test('ko와 en 번역 키 세트가 완전히 일치한다', () => {
  const koKeys = Object.keys(MESSAGES.ko).sort();
  const enKeys = Object.keys(MESSAGES.en).sort();
  assert.deepEqual(koKeys, enKeys);
});

test('createTranslator: 변수 치환이 정상 동작한다', () => {
  const tKo = createTranslator('ko');
  const tEn = createTranslator('en');
  assert.equal(tKo('foldersCount', { count: 280 }), '폴더 280개');
  assert.equal(tEn('foldersCount', { count: 280 }), '280 folders');
});
