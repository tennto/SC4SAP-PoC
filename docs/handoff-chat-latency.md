# 채팅 응답 지연 개선 — 인계 문서

작성일 2026-09-15. 브랜치 `active`.

## 배경

`/chat` 는 claude.ai 채팅보다 체감이 훨씬 느리다. 이유는 모델이 아니라 구조다. claude.ai 는 모델 호출 한 번이고, 이 PoC 는 SAP 에 붙은 **에이전트 실행**이다.

| 원인 | 어디서 | 비용 |
|---|---|---|
| 세션 부팅 | `src/server/session-manager.ts` `create()` 에서 `query()` 로 Claude Code 프로세스 기동. 플러그인(`plugin_module/CLAUDE.md` 10KB + 스킬·에이전트·룰) 적재, SAP MCP 서버 연결, 훅 등록 | 첫 토큰 전 수 초 |
| 답 하나 = 여러 턴 | 질문 → 모델 → SAP MCP 호출(RFC/OData 왕복) → 결과 읽기 → 또 호출 → … → 답 | SAP 호출당 수백 ms~수 초, 질문당 5~20회 |
| 훅이 자식 프로세스 | `workspace/.claude/settings.json` 의 `PreToolUse` 훅 2개가 매 툴 호출마다 `node <script>.mjs` 로 실행 | 호출당 node 기동 비용 |
| 컨텍스트 크기 | 시스템 프롬프트 + 플러그인 지침 + MCP 도구 스키마 + 누적 툴 결과 | 턴당 입력 토큰 큼 |
| 서브에이전트 | 무거운 스킬(analyze-symptom, analyze-code 등)은 `Agent` 툴로 리뷰어(Opus 기본) 하나 더 기동 | 라운드당 분 단위 |

모델은 `.env` 의 `SC4SAP_MODEL=claude-sonnet-5`. 느린 모델 아님.

**바꾸면 안 되는 것**: 에이전트 루프 자체. SAP 조회 없이 빨리 답하면 그건 claude.ai 다. 툴 왕복은 "SAP 에 붙은 채팅"의 대가다.

## 완료된 것 (이 세션)

1. **진행 상태 UI** — 커밋 전, 워킹 트리에 있음.
   - `web/src/components/ActivityLine.tsx` 신규. 점 + 현재 상태 + 턴 시계 + 트레일("지금까지 한 일": 툴 호출을 종류별로 접어 `SAP 조회 중 ×4 · 파일 읽는 중 ×2` 식 칩).
   - `web/src/lib/activity.ts` — `starting` 종류 추가, `summarizeTurn()` 추가.
   - `web/src/hooks/useSessionStream.ts` — status `starting` 을 활동 라벨로 표시. 부팅 중 프롬프트가 들어오면 `turn_start` 까지 "세션 준비 중" 유지.
   - `Transcript.tsx`, `SkillForm.tsx` — 자체 점 제거하고 `ActivityLine` 사용. 스킬 결과 패널은 전엔 점만 있고 글자가 없었다.
   - `messages.ts` en/ko/ja 키 4개(`activity.starting`, `startingDetail`, `soFar`, `times`), `globals.css` `.activity-block / .activity-trail / .activity-step`.
   - 실제 채팅 한 턴으로 트레일 확인함. `starting` 라벨 경로는 코드로만 확인 (테스트 때 부팅이 타이핑 중 끝남).

남은 세 가지, 아래 순서대로.

---

## 2026-09-16 진행 결과 (브랜치 `enhancement`)

측정은 `npm run bench:latency` (`src/bench-latency.ts`, 신규). 브라우저와 같은 HTTP 경로로 `POST /sessions` → 즉시 프롬프트 → 스트림 관찰. 수치는 세션 요청 시점부터 ms, 3회 중앙값.

| 단계 | PONG 첫 토큰 | PONG 완료 | SAP 1회 조회 첫 토큰 | SAP 조회 완료 |
|---|---|---|---|---|
| 개선 전 | 21,744 | 26,914 | 42,619 | 48,893 |
| 훅 러너 수정 후 (콜드) | 3,623 | 3,935 | — | — |
| + 세션 워밍 | 1,911 | 2,320 | 11,358 | 12,706 |

**진짜 원인은 부팅이 아니라 플러그인 훅 러너였다.** `plugin_module/scripts/run.cjs` 가 `execFile` 로 훅 스크립트를 띄우면서 자기 stdin 을 자식에게 넘기지 않았다. 스크립트 28개가 전부 `readStdin()` 의 5초 타임아웃을 꽉 채우고 나서야 동작했다. `hooks.json` 은 SessionStart·UserPromptSubmit·PreToolUse·PostToolUse·Stop 마다 훅 2~3개를 거니, 턴당 약 15초 + 툴 호출당 약 10초가 순수 대기였다. 수정은 stdin 파이프 한 줄. 훅 하나 5,150 ms → 140 ms.

**세션 워밍**은 그 위에 얹었다. `SessionManager.warm()` / `#warm` 풀, `GET /sessions` 가 계정별로 하나 미리 띄움, `create()` 가 같은 모양(userId·model·economy·approval·budget)이면 가져가고 3초 뒤 재충전, 10분 미청구 시 `#discardWarm` 으로 회수(`SC4SAP_WARM_IDLE_MS`), `/health` 에 `warm` 수. `web/src/app/chat/page.tsx` 의 서버 측 `/sessions` 호출에 계정 헤더를 붙여야 페이지 로드에 워밍이 걸린다.

알게 된 것: SDK 는 첫 프롬프트가 들어오기 전엔 `system/init` 을 보내지 않는다. 워밍 세션은 `starting` 인 채로 대기하지만 프로세스·MCP 연결은 이미 끝나 있다(`mcpServerStatus()` 로 확인, 약 7초). 그래서 "준비 완료" 신호 없이 시간만 벌어두는 구조다.

남은 병목: 2번(워크스페이스 PreToolUse 훅 in-process 전환)은 이제 호출당 수백 ms 수준이라 우선순위 낮음. `result` 가 마지막 텍스트보다 늦게 오는 구간은 Stop 훅 3개(이제 각 0.1초대)로 좁혀졌다.

---

## 1. 세션 워밍 / 재사용 (효과 큼, 하루)

### 목표
첫 질문이 프로세스 부팅을 기다리지 않게 한다. 계정별로 SAP·MCP·플러그인이 다 붙은 세션을 미리 띄워두고, 새 채팅이 그걸 가져간다.

### 현재 흐름
- 웹 "+" → `web/src/lib/client.ts:106` `POST /sessions` → `src/server/app.ts:107` → `manager.create()` (`session-manager.ts` 약 460행) → `query()` 즉시 실행, status `starting`.
- SDK 가 `system/init` 을 보내면 `starting → idle` (`session-manager.ts` 약 1034행, `#consume`).
- 그 사이 프롬프트가 오면 `InputPump` 에 큐잉되고 부팅 뒤 처리. 즉 부팅 시간이 첫 답에 그대로 얹힌다.
- `create()` 옵션: `model`, `economy`, `maxBudgetUsd`, `approval`, `resume`, `userId`. 이 중 `model`·`economy`·`approval` 은 `query()` 옵션이나 `canUseTool` 판단에 쓰이므로 **세션 생성 시점에 고정**된다.

### 방법 (권장: 웜 풀)
1. `SessionManager` 에 `#warm: Map<userId, LiveSession>` 추가. 키는 userId + 세션 생성 시 고정되는 옵션 조합(`model`, `economy`, `approval`).
2. `warm(userId, options)`: `create()` 와 같은 경로로 `query()` 를 띄우되 `list()` 에 안 보이게 표시(레코드에 `warm: true` 같은 플래그). init 이 오면 idle 로 두고 대기.
3. `create()` 에서 같은 키의 웜 세션이 있으면 그걸 꺼내 id·createdAt 만 새로 찍고 반환. 없으면 기존 경로.
4. 언제 워밍하나:
   - 로그인 직후 / `GET /sessions` 첫 호출 시 (`app.ts:191`) 한 개.
   - `create()` 가 웜 세션을 소비한 직후 한 개 다시.
   - 계정 설정에서 model·approval 이 바뀌면 (`web/src/app/api/account/*`) 기존 웜 세션 폐기.
5. **유휴 회수 필수**. 지금은 busy 세션만 orphan 타이머로 정리한다 (`#armOrphanTimer`, `ORPHAN_GRACE_MS = 15_000`, 약 729행). idle 세션은 영원히 산다. 웜 세션에는 별도 idle 타임아웃(예: 10분) 을 두고 `close()` 로 정리. 아니면 계정마다 Claude Code 프로세스가 상주한다.
6. `closeAll()` (1014행) 이 웜 세션도 닫게.

### 대안 (더 싸고 효과 작음)
- `resume` 만 쓰기: 이미 `create({ resume })` 가 있다. 이전 SDK 세션 id 로 resume 해도 프로세스는 새로 뜬다. 부팅 비용은 그대로. 워밍 대신은 못 됨.

### 검증
- 새 채팅 "+" 직후 프롬프트 전송, `ActivityLine` 에 "세션 준비 중" 이 안 뜨고 바로 "작업 중" 으로 가면 성공.
- 백엔드 로그에서 `Server listening` 이후 `query()` 기동 로그 시각과 첫 `turn_start` 간격 비교.
- 유휴 10분 뒤 웜 세션 프로세스가 사라지는지 작업 관리자로 확인.

### 주의
- `discoverToolPolicy()` (398행) 도 서버 기동 시 throwaway `query()` 를 한 번 띄운다. 워밍과 별개. 건드리지 말 것.
- 웜 세션은 `toolLog` 에 기록 안 남게. 툴 호출이 없으니 자연히 안 남지만 `#logToolBlocks` 경로 확인.

---

## 2. 훅 in-process 전환 (툴 호출당 수백 ms, 반나절~하루)

### 목표
`PreToolUse` 훅 두 개를 node 자식 프로세스가 아니라 SDK 콜백으로 실행한다. 차단 규칙은 동일.

### 현재
- `workspace/.claude/settings.json`:
  - matcher `mcp__.*__(GetTableContents|GetSqlQuery)` → `plugin_module/scripts/hooks/block-forbidden-tables.mjs` (340행)
  - matcher `mcp__.*__(Create|Update|Delete|RunUnitTest|RuntimeRunProgramWithProfiling|RuntimeRunClassWithProfiling)` → `tier-readonly-guard.mjs` (189행)
- 이 파일은 `npm run workspace` (`src/provision-workspace.ts`) 가 쓴다. `settingSources: ["project"]` 로 로드됨 (`session-manager.ts` 약 490행). 이걸 빼면 가드가 사라진다 — 주석에 경고 있음.
- 두 스크립트는 stdin 으로 훅 입력 JSON 을 받고, 차단 시 `{ hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason } }` 를 stdout 으로 낸다. 프로필 파일(`.sc4sap/active-profile.txt`, `sap.env`) 을 읽어 `SAP_TIER` 를 판단.

### 방법
1. 두 `.mjs` 에서 판단 로직을 순수 함수로 분리: `decide(input): HookJSONOutput`. 스크립트 본체는 stdin 읽어서 `decide` 호출만 하게 남겨 **플러그인 CLI 사용자(터미널)** 는 그대로 동작.
2. 백엔드 `query()` 옵션에 `hooks` 추가 (`node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1521`):
   ```ts
   hooks: {
     PreToolUse: [
       { matcher: "mcp__.*__(GetTableContents|GetSqlQuery)", hooks: [async (input) => decideForbiddenTables(input)] },
       { matcher: "mcp__.*__(Create|Update|Delete|RunUnitTest|RuntimeRun(Program|Class)WithProfiling)", hooks: [async (input) => decideTier(input)] },
     ],
   }
   ```
   `HookCallback` 시그니처: `(input, toolUseID, { signal }) => Promise<HookJSONOutput>` (sdk.d.ts:821).
3. `provision-workspace.ts` 에서 `settings.json` 의 `hooks` 블록을 빼거나, 백엔드 전용 워크스페이스에선 안 쓰게. 둘 다 켜두면 같은 판단을 두 번 한다.
4. 판단 함수는 파일 IO(프로필 읽기) 를 매 호출마다 하지 말고 세션 생성 시 한 번 읽어 캐시. 그게 이 작업의 절감분 절반이다.

### 검증
- `npm run smoke:hook` (`src/smoke-hook-block.ts`) 이 있다. 이게 settings.json 훅을 검증하는지 in-process 훅을 검증하는지 먼저 확인하고 맞춰서 갱신.
- `GetTableContents` 로 금지 테이블 조회 시도 → deny 사유가 승인 다이얼로그/툴 로그에 그대로 나오는지.
- QA/PRD 프로필로 `Create*` 시도 → deny. DEV 는 통과.
- MCP Monitor(`/monitor`) 에서 호출당 median duration 전후 비교.

### 주의
- 세션 매니저 주석(약 505행): `canUseTool` 은 완전한 초크포인트가 아니다 (Bash 가 콜백 없이 실행되는 것 관찰됨). 그래서 `needsHookApproval` 을 훅 쪽에 뒀다. in-process 로 옮겨도 **훅에 두는 것**이지 `canUseTool` 로 옮기는 게 아니다.
- MCP 서버 쪽 L2 가드(`readonlyGuard`) 는 그대로. 훅은 L1.

---

## 3. 도구 스키마 축소 (보류 권장, 효과 불확실)

### 목표
모델 컨텍스트에 실리는 MCP 도구 스키마를 줄여 턴당 입력 토큰을 낮춘다.

### 현재
- `src/server/tool-policy.ts`: `WRITE_CLASS_PATTERNS` (39행) 가 `disallowedTools` 로 가서 컨텍스트에서 아예 제거됨. `LOCAL_AUTO_ALLOW` (126행), `classifySapTool` (161행).
- 읽기 계열은 전부 남는다. 도구 수는 서버 기동 로그 `tool policy: N auto-allowed, M deny patterns` 에서 확인.

### 방법
1. 먼저 측정. SDK `result` 메시지의 `usage.input_tokens` 를 세션별로 로그에 찍어 (`#consume` 의 `result` 처리, 약 1040행) 도구 스키마가 차지하는 비중을 본다. 도구 하나 스키마가 수백 토큰이면 50개면 만 토큰대. 캐시되는 부분이라 실제 비용·지연 영향은 생각보다 작을 수 있다.
2. 줄일 거면 사용 빈도로. MongoDB `toolLog` 컬렉션(`src/server/tool-log.ts`)에 30일 호출 기록이 있다. 30일간 0회인 읽기 도구를 후보로.
3. 후보를 `disallowedTools` 에 추가하는 게 아니라 **별도 목록** `RARE_READ_TOOLS` 로 두고, 채팅 기본 세션에서만 제외. 스킬 세션은 그대로. 스킬은 특정 도구를 전제로 짜여 있다.

### 왜 보류인가
- 잘라낸 도구는 모델이 못 쓴다. "이 테이블 왜 못 읽어?" 가 생긴다.
- 프롬프트 캐시 때문에 스키마는 매 턴 새로 읽히지 않는다. 1번·2번 뒤에 측정하고 결정.

---

## 순서와 이유

1. 세션 워밍 — 첫 답 지연의 가장 큰 덩어리. 기능 의도 변화 없음.
2. 훅 in-process — 툴 호출이 많은 스킬 실행에서 누적 효과. 규칙 동일.
3. 스키마 축소 — 측정 먼저. 효과 확인 전엔 손대지 말 것.

## 참고 명령

```
npm run server        # 백엔드 127.0.0.1:3001
npm run web           # 프론트 localhost:3000
npm run typecheck     # 루트 + web
npm run smoke:hook    # 훅 차단 스모크
```

로그: `%TEMP%\sc4sap-server.log`, `%TEMP%\sc4sap-web.log` (이 세션에서 백그라운드로 띄운 경우).
