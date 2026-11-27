import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Chrome Web Store 업로드용 ZIP 패키지 빌더
 * - manifest.json에서 로컬 고정용 "key" 필드를 자동 제거 (CWS는 업로드 시 자체 서명 키 부여)
 * - local-config.json, tests, docs, oauth-proxy, scripts, .git 등 불필요/민감 파일 제외
 */

const rootDir = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
const version = manifest.version || '1.0.0';

const distDir = path.join(rootDir, 'dist');
const stageDir = path.join(distDir, 'stage');
const zipPath = path.join(distDir, `syncfav-v${version}-store.zip`);

fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

// 1) store용 manifest.json 작성 (key 필드 제거)
const storeManifest = { ...manifest };
delete storeManifest.key;
fs.writeFileSync(path.join(stageDir, 'manifest.json'), JSON.stringify(storeManifest, null, 2) + '\n');

// 2) 필요한 런타임 디렉토리 복사 (src/, assets/, LICENSE)
fs.cpSync(path.join(rootDir, 'src'), path.join(stageDir, 'src'), { recursive: true });
fs.cpSync(path.join(rootDir, 'assets'), path.join(stageDir, 'assets'), { recursive: true });
if (fs.existsSync(path.join(rootDir, 'LICENSE'))) {
  fs.copyFileSync(path.join(rootDir, 'LICENSE'), path.join(stageDir, 'LICENSE'));
}

// 3) ZIP 압축 (macOS/Linux zip 명령 사용)
fs.rmSync(zipPath, { force: true });
execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: stageDir });
fs.rmSync(stageDir, { recursive: true, force: true });

const sizeKb = (fs.statSync(zipPath).size / 1024).toFixed(1);
console.log(`Built Chrome Web Store package: ${zipPath} (${sizeKb} KB)`);
