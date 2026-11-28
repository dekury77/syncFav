import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MESSAGES,
  createTranslator,
  detectSystemLanguage,
  resolveLanguage,
} from '../src/shared/i18n.js';

test('시스템 언어 감지: ko / ja / zh / es / 기타 -> en', () => {
  assert.equal(detectSystemLanguage('ko-KR'), 'ko');
  assert.equal(detectSystemLanguage('ja-JP'), 'ja');
  assert.equal(detectSystemLanguage('zh-CN'), 'zh_CN');
  assert.equal(detectSystemLanguage('es-ES'), 'es');
  assert.equal(detectSystemLanguage('en-US'), 'en');
  assert.equal(detectSystemLanguage('fr-FR'), 'en');
});

test('resolveLanguage: auto면 시스템 언어, 명시 선택 시 해당 언어 우선', () => {
  assert.equal(resolveLanguage('auto', 'ko-KR'), 'ko');
  assert.equal(resolveLanguage('auto', 'ja-JP'), 'ja');
  assert.equal(resolveLanguage('en', 'ko-KR'), 'en');
  assert.equal(resolveLanguage('es', 'en-US'), 'es');
});

test('5개 언어(en, ko, ja, zh_CN, es) 번역 키 세트가 완전히 일치한다', () => {
  const baseKeys = Object.keys(MESSAGES.en).sort();
  for (const lang of ['ko', 'ja', 'zh_CN', 'es']) {
    assert.deepEqual(Object.keys(MESSAGES[lang]).sort(), baseKeys, `Mismatch in ${lang}`);
  }
});

test('createTranslator: 변수 치환이 정상 동작한다', () => {
  assert.equal(createTranslator('ko')('foldersCount', { count: 280 }), '폴더 280개');
  assert.equal(createTranslator('en')('foldersCount', { count: 280 }), '280 folders');
  assert.equal(createTranslator('ja')('foldersCount', { count: 280 }), 'フォルダ 280件');
});
