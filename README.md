# Tadak

부산 청년을 위한 공모전·커리어 이벤트·청년정책 통합 탐색 서비스

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버
npm run build     # 프로덕션 빌드
```

## 데이터

`src/data/raw/`의 크롤링 원본 JSON을 `scripts/transform*.js`가 `src/data/processed/*.ts`로 변환합니다.
원본 데이터가 갱신되면 아래 스크립트를 다시 실행하세요.

```bash
node scripts/transformPolicies.js
node scripts/transformCompetitions.js
node scripts/transformJobs.js
```
