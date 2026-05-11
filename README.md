# 📊 Claude Code Monitoring Dashboard

Claude Code CLI의 사용량·비용·도구 활동을 **실시간**으로 시각화하는 모니터링 대시보드입니다.  
OpenTelemetry(OTLP) 엔드포인트를 내장하여 별도 백엔드 없이 Next.js 단독으로 동작합니다.

---

## ✨ 주요 기능

- 📡 **실시간 스트리밍** — SSE(Server-Sent Events)로 데이터 자동 갱신
- 💰 **비용 추적** — 일별 누적 비용 및 예산 대비 현황
- 🔢 **토큰 사용량** — 입력·출력·캐시 토큰 분리 차트
- 🤖 **모델 분포** — 사용한 Claude 모델별 비율
- 🔧 **도구 활동** — 실행된 Tool 빈도 분석
- 📋 **이벤트 로그** — 세션별 API 호출 이력 테이블
- 🗓️ **기간 필터** — 오늘 / 7일 / 30일 / 전체 전환

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, Turbopack) |
| 언어 | TypeScript 5 |
| 스타일링 | Tailwind CSS v4 + shadcn/ui |
| 차트 | Recharts |
| 데이터 수집 | OpenTelemetry OTLP (HTTP/JSON) |
| 스토리지 | 로컬 CSV 파일 (`/data/`) |
| 패키지 관리 | pnpm |

---

## ⚙️ 사전 요구사항

- Node.js 20 이상
- pnpm (`npm install -g pnpm`)
- Claude Code CLI

---

## 🚀 설치 및 실행

```bash
# 저장소 클론
git clone <repo-url>
cd claude-monitoring

# 의존성 설치
pnpm install

# 개발 서버 실행 (http://localhost:3000)
pnpm dev
```

---

## 🔌 Claude Code 연결 설정

대시보드를 실행한 뒤 Claude Code가 텔레메트리를 전송하도록 환경 변수를 설정합니다.

### 임시 설정 (터미널 세션 단위)

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:3000/api/otlp/metrics
export OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:3000/api/otlp/logs
export OTEL_METRIC_EXPORT_INTERVAL=10000
export OTEL_LOGS_EXPORT_INTERVAL=5000
```

### 영구 설정 (`~/.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT": "http://localhost:3000/api/otlp/metrics",
    "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT": "http://localhost:3000/api/otlp/logs",
    "OTEL_METRIC_EXPORT_INTERVAL": "10000",
    "OTEL_LOGS_EXPORT_INTERVAL": "5000"
  }
}
```

> 💡 설정 후 `claude` 명령을 실행하면 데이터가 자동으로 수집됩니다.

---

## 📁 프로젝트 구조

```
claude-monitoring/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 메인 대시보드 페이지
│   │   └── api/
│   │       ├── otlp/
│   │       │   ├── metrics/route.ts  # OTLP 메트릭 수신 엔드포인트
│   │       │   └── logs/route.ts     # OTLP 로그 수신 엔드포인트
│   │       └── stream/route.ts       # SSE 스트리밍 엔드포인트
│   ├── components/
│   │   ├── dashboard/                # 차트·테이블 등 대시보드 컴포넌트
│   │   └── ui/                       # shadcn/ui 기본 컴포넌트
│   ├── hooks/
│   │   └── use-live-data.ts          # SSE 구독 훅
│   └── lib/
│       ├── csv.ts                    # CSV 읽기·쓰기·정리 유틸리티
│       └── dashboard.ts              # 데이터 집계 로직
└── data/
    ├── metrics.csv                   # 메트릭 데이터 (gitignore)
    └── events.csv                    # 이벤트 로그 (gitignore)
```

---

## 🗑️ 데이터 보관 정책

- CSV 파일이 **5 MB**를 초과하면 자동으로 **30일** 이전 레코드를 정리합니다.
- `/data/*.csv` 파일은 `.gitignore`에 포함되어 커밋되지 않습니다.

---

## 📦 빌드 및 프로덕션 실행

```bash
pnpm build
pnpm start
```

---

## 📄 라이선스

MIT
