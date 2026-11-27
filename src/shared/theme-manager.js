/**
 * 스킨 목록 메타데이터 및 즉시 적용 유틸리티
 */

export const SKINS = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    tag: 'Linear / Native',
    description: '절제된 딥 카본 다크모드, 1px 헤어라인과 순백 액센트의 Raycast · Linear 감성',
    swatches: ['#0A0B0E', '#171A21', '#F3F4F6', '#34D399'],
  },
  {
    id: 'editorial',
    name: 'Editorial',
    tag: 'frontend-design',
    description: 'AI 템플릿을 배제한 린넨 페이퍼 + 세리프 타이포그래피 + 코발트 잉크의 서재 아카이브 감성',
    swatches: ['#F6F7F4', '#FFFFFF', '#1E40AF', '#14191F'],
  },
  {
    id: 'promax',
    name: 'Pro Max',
    tag: 'ui-ux-pro-max',
    description: 'ui-ux-pro-max 엔진이 산출한 민트-틸 생산성 대시보드 팔레트와 부드러운 카드 계층',
    swatches: ['#F0FDFA', '#FFFFFF', '#0D9488', '#EA580C'],
  },
];

export function applyTheme(themeId) {
  const valid = SKINS.some((s) => s.id === themeId) ? themeId : 'obsidian';
  document.documentElement.setAttribute('data-theme', valid);
  return valid;
}
