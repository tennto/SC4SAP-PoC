# 계정별 자격증명 로드맵

작성일: 2026-09-05

## 이 문서가 다루는 것

`/setup` 화면은 계정마다 SAP 접속 정보와 Anthropic API 키를 받아서 저장합니다.
그런데 **저장만 될 뿐, 실제로 에이전트를 돌릴 때는 아무도 그 값을 읽지 않습니다.**
세션은 여전히 서버 한 대가 들고 있는 공용 설정으로 돌아갑니다.

이 문서는 그 간극을 메우는 방법을 정리한 것입니다. 백엔드 구조를 처음 보는 상태에서도
따라갈 수 있도록, 먼저 지금 구조가 어떻게 생겼는지부터 설명합니다.

프로젝트 계획상으로는 **Phase 5-2 / 5-3 / 5-4** 에 해당합니다. 루트 `README.md` 의
585–665줄에도 관련 서술이 있는데, 이 문서는 그보다 한 단계 더 파고든 내용입니다.

---

## 1. 지금 구조 — 용어부터

이 프로젝트는 **서버가 두 개** 입니다. 헷갈리기 쉬우니 먼저 구분합니다.

### 웹 서버 (Next.js, 포트 3000)

- 실행: `npm run web`
- 위치: `web/` 폴더
- 하는 일: 화면을 그리고, MongoDB 에서 사용자/대화 기록을 읽고 씁니다.
- **누가 로그인했는지 아는 유일한 서버입니다.**

### 에이전트 백엔드 (Fastify, 포트 3001)

- 실행: `npm run server`
- 위치: `src/server/` 폴더
- 하는 일: Claude Agent SDK 를 띄워서 실제로 모델을 돌리고, SAP MCP 서버와 통신합니다.
- **사용자라는 개념 자체를 모릅니다.** 이건 실수가 아니라 의도된 설계입니다.
  백엔드는 MongoDB 주소도 모르고, 로그인 쿠키도 모릅니다.

### 둘 사이의 연결

브라우저는 백엔드(3001)에 **직접 접속하지 않습니다.** 항상 웹 서버(3000)의
`/api/...` 를 거칩니다. 그 중계를 담당하는 파일이 하나 있습니다.

```
web/src/app/api/[...path]/route.ts
```

이 파일이 이 로드맵 전체에서 가장 중요합니다. **브라우저에서 백엔드로 가는 모든 요청이
반드시 이 파일을 통과하고, 이 파일은 서버에서 실행되므로 로그인한 사용자가 누구인지
알 수 있습니다.** 즉, 계정별 자격증명을 끼워 넣을 수 있는 유일한 지점입니다.

```
브라우저  ──►  Next 웹서버 :3000  ──►  Fastify 백엔드 :3001  ──►  Claude / SAP
               (여기서 누구인지 안다)      (여기는 모른다)
                        │
                        └── [...path]/route.ts 가 중계
```

### 세션이 만들어지는 흐름

1. 브라우저가 `POST /api/sessions` 를 호출합니다.
   (코드: `web/src/lib/client.ts` 의 `createSession()`)
2. `[...path]/route.ts` 가 그대로 `POST http://127.0.0.1:3001/sessions` 로 넘깁니다.
3. 백엔드 `src/server/app.ts` 가 받아서 `manager.create()` 를 호출합니다.
4. `src/server/session-manager.ts` 의 `create()` 가 Agent SDK 의 `query()` 를 실행합니다.
   이때 넘기는 설정이 이렇게 생겼습니다 (334번째 줄 근처):

```ts
const session = query({
  prompt: pump,
  options: {
    plugins: [{ type: "local", path: this.#config.pluginPath }],
    cwd: this.#config.workspace,        // ← 전 계정 공용
    model: this.#config.model,
    settingSources: ["project"],
    includeHookEvents: true,
    includePartialMessages: true,
    resume: options.resume,
    // ...
  },
});
```

`this.#config` 는 서버가 켜질 때 루트 `.env` 를 읽어서 만든 **하나뿐인** 설정
객체입니다 (`src/config.ts`). 그래서 지금은 누가 로그인했든 같은 값이 쓰입니다.

### 지금 자격증명이 어디서 오는가

| 항목 | 지금 출처 | 범위 |
|---|---|---|
| Anthropic API 키 | 루트 `.env` 의 `ANTHROPIC_API_KEY` | 서버 프로세스 전체 |
| SAP 접속 정보 | `~/.sc4sap/profiles/KR-DEV/sap.env` | 서버 프로세스 전체 |
| SAP 비밀번호 | 위 파일의 `keychain:` 참조 → Windows 자격 증명 관리자 | 머신 전체 |

`/setup` 이 MongoDB 의 사용자 행(`connection` 필드)에 저장한 값은
`web/src/lib/setup-store.ts` 의 `readConnectionSecrets()` 로 읽을 수 있지만,
**현재 이 함수를 호출하는 코드가 없습니다.** 만들어만 두고 연결하지 않은 상태입니다.

---

## 2. 목표

> 로그인한 계정마다 자기 SAP 시스템과 자기 Anthropic 키로 세션이 돌아가게 한다.

두 갈래로 나뉘고, 난이도가 크게 다릅니다.

- **갈래 A — Anthropic 키**: 비교적 간단합니다. SDK 가 이미 지원합니다.
- **갈래 B — SAP 접속 정보**: 복잡합니다. 플러그인이 파일로만 설정을 읽습니다.

---

## 3. 갈래 A — Anthropic API 키 (Phase 5-4)

### 왜 쉬운가

Agent SDK 의 `query()` 는 `options.env` 를 받습니다. 이건 SDK 가 띄우는 **자식
프로세스의 환경 변수를 통째로 지정**하는 옵션입니다. 확인한 정의는 다음과 같습니다.

```
node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1451
```

문서에 적힌 사용 예시가 `env: { ...process.env, CLAUDE_AGENT_SDK_CLIENT_APP: '...' }`
입니다. 즉 **기존 환경 변수를 펼쳐 넣고 원하는 것만 덮어쓰는** 방식입니다.

이 방식의 장점이 중요합니다. `process.env.ANTHROPIC_API_KEY = 사용자키` 처럼
전역 변수를 직접 바꾸면, 두 사용자가 동시에 세션을 열 때 서로의 키를 덮어쓰는
사고가 납니다. `options.env` 는 세션마다 따로 지정되므로 그런 충돌이 없습니다.

### 해야 할 일 — 4단계

#### A-1. 웹 프록시에서 키를 끼워 넣기

**파일**: `web/src/app/api/[...path]/route.ts`

지금 이 파일은 요청을 그대로 넘깁니다. `POST /sessions` 인 경우에만 본문에 키를
추가하도록 고칩니다.

의사코드:

```ts
// 이미 apiConnected() 로 로그인 + 설정 완료를 확인한 뒤
const isCreateSession =
  request.method === "POST" && path.join("/") === "sessions";

let body = hasBody ? await request.text() : undefined;

if (isCreateSession) {
  const secrets = await readConnectionSecrets(auth.account.id);
  if (!secrets) return apiError(403, "...");
  const parsed = body ? JSON.parse(body) : {};
  body = JSON.stringify({ ...parsed, anthropicApiKey: secrets.apiKey });
}
```

**왜 브라우저가 직접 안 보내는가**: API 키를 브라우저로 내려보내면 개발자 도구,
확장 프로그램, XSS 어느 쪽으로든 새어 나갑니다. 키는 서버 안에서만 움직여야 합니다.
그래서 브라우저는 평소대로 `{resume, priorTurns, ...}` 만 보내고, 프록시가 서버에서
키를 덧붙입니다.

**왜 loopback HTTP 로 평문 전송해도 괜찮은가**: 3000 → 3001 은 같은 머신 안의
127.0.0.1 통신이라 네트워크를 타지 않습니다. 나중에 백엔드를 다른 머신에 두게 되면
그때는 HTTPS 나 mTLS 가 필요합니다. 이 문서 끝의 "나중에 다시 볼 것" 에 적어뒀습니다.

#### A-2. 백엔드가 키를 받도록 하기

**파일**: `src/server/app.ts` (53번째 줄 근처, `POST /sessions` 핸들러)

`Body` 타입에 `anthropicApiKey?: string` 를 추가하고, 검증한 뒤 `manager.create()`
로 넘깁니다.

주의할 점 두 가지:

- **키를 로그에 찍지 말 것.** Fastify 는 기본적으로 요청 본문을 로깅하지 않지만,
  디버깅하다가 `console.log(request.body)` 를 넣으면 그 순간 키가 로그 파일에
  평문으로 남습니다.
- **에러 메시지에도 넣지 말 것.** `키가 잘못됨: sk-ant-...` 같은 메시지는
  브라우저까지 갑니다.

#### A-3. 세션이 그 키로 돌게 하기

**파일**: `src/server/session-manager.ts` (334번째 줄 `create()`)

```ts
create(
  options: {
    resume?: string;
    priorTurns?: number;
    priorCostUsd?: number;
    anthropicApiKey?: string;   // ← 추가
  } = {},
): SessionRecord {
  // ...
  const session = query({
    prompt: pump,
    options: {
      // 기존 옵션들 그대로
      env: {
        ...process.env,
        ...(options.anthropicApiKey
          ? { ANTHROPIC_API_KEY: options.anthropicApiKey }
          : {}),
      },
    },
  });
```

키가 안 넘어오면 `process.env` 의 값이 그대로 쓰이므로, 기존 스크립트
(`npm run e2e`, `npm run smoke:hook`)는 손대지 않아도 계속 동작합니다.

#### A-4. 키 검사 캐시를 계정별로 나누기

**파일**: `src/server/claude-api.ts`

이 파일은 "지금 들고 있는 키가 살아있는가" 를 `GET /v1/models` 로 확인하고, 그 결과를
30초 캐시합니다. 대시보드가 매번 렌더될 때마다 Anthropic 에 요청을 보내지 않으려는
장치입니다.

문제는 **캐시 변수가 프로세스에 하나뿐** 이라는 점입니다.

```ts
let cached: { at: number; health: ClaudeApiHealth } | null = null;
```

키가 계정마다 달라지면, A 사용자의 검사 결과가 B 사용자에게 그대로 보입니다.
A 의 키가 만료됐는데 B 화면이 빨간불이 되는 식입니다.

고치는 방법: 캐시를 `Map<키해시, 결과>` 로 바꿉니다. **키 자체를 Map 의 열쇠로 쓰지
말고 SHA-256 해시를 씁니다.** 키를 메모리에 두 벌 들고 있을 이유가 없습니다.

그리고 `/health` 엔드포인트가 "누구의 키를 검사할지" 를 알아야 하므로, 여기서도
프록시가 계정 정보를 실어 보내야 합니다.

> **여기가 경계가 무너지는 지점입니다.** 지금까지 백엔드는 사용자를 몰랐는데,
> 이 시점부터 "이 요청은 어느 계정의 것" 이라는 개념을 갖게 됩니다. 배관 작업이 아니라
> 설계 변경이므로, 결정하고 넘어가야 합니다. (5절 "먼저 결정할 것" 참고)

### 갈래 A 를 다 하면 확인할 것

1. 두 계정으로 각각 로그인해서 서로 다른 키를 `/setup` 에 넣습니다.
2. 두 브라우저에서 동시에 채팅을 시작합니다.
3. Anthropic Console 의 사용량 화면에서 **두 키 모두에 사용량이 잡히는지** 확인합니다.
   한쪽에만 잡히면 `options.env` 가 제대로 안 넘어간 것입니다.

---

## 4. 갈래 B — SAP 접속 정보 (Phase 5-2 / 5-3)

### 왜 어려운가

SAP 와 통신하는 주체는 백엔드가 아니라 **플러그인이 띄우는 MCP 서버** 입니다.
그 MCP 서버가 접속 정보를 어디서 읽는지 확인해 봤습니다.

**파일**: `plugin_module/bridge/mcp-server.cjs` (72–118번째 줄)

```
1. <cwd>/.sc4sap/active-profile.txt 를 읽어서 별칭(alias)을 얻고
   → ${SC4SAP_HOME_DIR 또는 ~/.sc4sap}/profiles/<별칭>/sap.env
2. <cwd>/.sc4sap/sap.env                (예전 단일 파일 방식)
3. <플러그인 경로>/.sc4sap/sap.env      (테스트용)
```

세 곳 다 없으면 `process.exit(1)` 로 종료합니다.

**핵심**: 이 경로들은 전부 **디스크의 파일** 입니다. `SAP_URL` 같은 값을 환경 변수로
직접 받는 경로가 없습니다. 그래서 갈래 A 처럼 `options.env` 하나로 끝나지 않습니다.

### 쓸 수 있는 손잡이 두 개

플러그인을 고치지 않는다는 전제에서, 세션마다 바꿀 수 있는 값이 두 개 있습니다.

| 손잡이 | 어디서 지정 | 무엇이 바뀌는가 |
|---|---|---|
| `cwd` | `query({ options: { cwd } })` | 위 1번과 2번 경로의 기준 폴더 |
| `SC4SAP_HOME_DIR` | `options.env` 로 지정 | 위 1번의 프로필 저장소 위치 |

`cwd` 는 이미 세션별로 지정 가능합니다 (`sdk.d.ts:1389`). 지금은 공용 워크스페이스
한 곳을 가리키고 있을 뿐입니다.

### 방향: 계정별 워크스페이스 폴더

계정마다 폴더를 하나씩 만들고, 세션을 열 때 `cwd` 를 그 폴더로 지정합니다.

```
workspace/
  users/
    <계정ID>/
      .sc4sap/
        active-profile.txt      ← 이 계정이 쓸 프로필 별칭
        logs/                   ← 세션 로그가 여기로 격리됨
      .claude/
        settings.json           ← L1 가드레일 훅 (아래 경고 참고)
```

부수 효과로 스킬이 만드는 산출물과 로그도 계정별로 분리됩니다. 좋은 일입니다.

### ⚠️ 반드시 놓치면 안 되는 것 — L1 가드레일

**이게 이 로드맵에서 가장 위험한 부분입니다.**

SAP 테이블 행 추출을 막는 안전장치(PreToolUse 훅) 두 개는 플러그인 자체에 들어있지
않습니다. **워크스페이스의 `.claude/settings.json` 에만 선언되어 있습니다.**

- `block-forbidden-tables.mjs` — 금지된 테이블 조회 차단
- `tier-readonly-guard.mjs` — QA/PRD 시스템에서 쓰기 차단

이 파일을 쓰는 코드가 `src/provision-workspace.ts` 이고, `npm run workspace` 로
실행합니다.

계정별 폴더를 만들면서 이 파일을 같이 안 만들면, **그 계정은 아무 경고 없이
가드레일 없는 상태로 돌아갑니다.** 에러도 안 나고 화면에도 표시가 안 됩니다.
그냥 조용히 뚫립니다.

그래서 계정별 폴더를 만드는 코드는 반드시 `provision-workspace.ts` 와 같은 내용을
써야 합니다. 지금은 스크립트가 `main()` 을 바로 실행하는 형태이므로,
`provisionWorkspace(경로, 별칭)` 같은 함수로 분리해서 두 곳에서 부르는 게 안전합니다.

### 비밀번호는 어떻게 되는가 — 좋은 소식

플러그인은 이미 올바른 방식을 갖고 있습니다. `sap.env` 에 비밀번호를 평문으로 쓰지
않고, **OS 키체인 참조**를 씁니다.

```
SAP_PASSWORD=keychain:<서비스이름>/<계정이름>
```

접속하는 순간 `@napi-rs/keyring` 으로 OS 키체인에서 실제 비밀번호를 꺼냅니다.
Windows 는 자격 증명 관리자, macOS 는 키체인, Linux 는 libsecret 입니다.

- 해석 코드: `plugin_module/vendor/abap-mcp-adt/src/lib/secrets.ts`
- 현재 `~/.sc4sap/profiles/KR-DEV/sap.env` 도 이미 `keychain:` 참조를 쓰고 있습니다.

키체인을 못 쓰는 환경(도커, CI)을 위해 `SAP_PASSWORD_STORAGE=file` 이라는
암호화 파일 대체 방식도 있습니다.

즉, **계정별 SAP 비밀번호를 디스크에 평문으로 쓸 필요가 없습니다.**

```
MongoDB          keychain:... 참조를 만들 원본
  │              (AES-256-GCM 으로 암호화 저장, 지금 이미 구현됨)
  ▼
OS 키체인        실제 비밀번호
  ▲
  │
sap.env          keychain:sc4sap/<계정ID>-<별칭>/<SAP유저> 참조만
```

### 플러그인이 이미 제공하는 도구

`plugin_module/scripts/sap-profile-cli.mjs` 에 필요한 명령이 다 있습니다.
전부 stdin 으로 JSON 을 받고 stdout 으로 JSON 을 돌려줍니다.

| 명령 | 하는 일 |
|---|---|
| `add` | 프로필 폴더와 `sap.env`, `config.json` 생성 |
| `keychain-set` | 키체인에 비밀번호 저장 (`{service, account, password}`) |
| `keychain-delete` | 키체인 항목 삭제 |
| `switch` | `active-profile.txt` 변경 |
| `validate` | 프로필이 제대로 생겼는지 검사 |
| `list` / `show` | 조회 |

`add` 는 `sapVersion` / `abapRelease` / `industry` 를 반드시 요구합니다.
`/setup` 이 앞의 둘은 이미 받고 있고, `industry` 는 안 받고 있으므로
**`/setup` 에 항목을 하나 더 추가하거나, `other` 로 고정해서 넘겨야 합니다.**

### 해야 할 일 — 5단계

#### B-1. 먼저 "SAP 가 살아있는가" 를 실제로 측정하기

지금 대시보드의 **SAP System** 행은 가짜입니다. 점의 색깔이
`online ? "up" : "unknown"` 인데, 여기서 `online` 은 **에이전트 백엔드**의 응답
여부입니다. SAP 가 죽어 있어도, 아예 존재하지 않는 주소를 가리키고 있어도 초록불입니다.
표시되는 문자열(`S4D · client 100 · ...`)도 `web/src/lib/account.ts` 의 하드코딩된
고정값입니다.

계정별 접속을 붙이기 **전에** 이걸 진짜로 만들어야 합니다. 안 그러면 작업이 됐는지
확인할 방법이 없습니다.

- 백엔드 `/health` 에 `sapSystem` 필드를 추가합니다. 모양은 이미 있는 `claudeApi`
  필드와 똑같이 (`state` / `detail` / `checkedAt`).
- `state` 는 세 가지여야 합니다: `up`(닿음) / `down`(거절당함) /
  `unknown`(물어볼 수가 없었음). 뒤의 둘은 다른 상황이므로 같은 색으로 그리면 안 됩니다.
- 참고할 코드: `src/server/claude-api.ts` 가 정확히 이 패턴입니다.
- 짧은 캐시를 겁니다. `/health` 는 대시보드가 뜰 때마다 호출됩니다.

**웹 쪽에 이미 비슷한 코드가 있습니다.** `/setup` 의 SAP 검사
(`web/src/lib/setup-checks.ts` 의 `checkSap`)가 ADT 의 `/sap/bc/adt/discovery` 를
호출해서 401 / 403 / 404 / 연결 실패를 구분합니다. 백엔드용 프로브는 이 로직을
거의 그대로 옮기면 됩니다.

#### B-2. 대시보드 행을 그 값에 연결하기

**파일**: `web/src/app/page.tsx`

```tsx
// 지금
state={online ? "up" : "unknown"}

// 이후
state={health?.sapSystem.state ?? "unknown"}
```

표시 문자열도 `SAP_SYSTEM` 고정값 대신 실제 프로필 값을 쓰도록 바꿉니다.

#### B-3. `/setup` 이 프로필과 키체인 항목을 만들도록 하기

`web/src/app/api/setup/route.ts` 의 저장 단계에서, MongoDB 에 쓰는 것에 더해
프로필 파일과 키체인 항목도 만듭니다.

별칭(alias)은 계정마다 겹치지 않게 만듭니다. 예: `web-<계정ID 앞 8자리>`.

주의: 프로필 별칭과 폴더 이름에 계정 ID 를 넣으면, **계정을 지울 때 같이 지워야 할
것이 늘어납니다.** 어디에 무엇이 생기는지 목록으로 남겨두는 게 좋습니다.

#### B-4. 세션이 그 폴더를 쓰게 하기

갈래 A 와 같은 경로입니다. 프록시가 `POST /sessions` 에 워크스페이스 경로를 실어
보내고, `session-manager.ts` 가 `cwd` 로 씁니다.

```ts
const session = query({
  options: {
    cwd: options.workspace ?? this.#config.workspace,
    env: { ...process.env, ...(키가 있으면 덮어쓰기) },
    // ...
  },
});
```

**경로는 백엔드가 직접 만들게 하는 편이 안전합니다.** 웹에서 임의의 폴더 경로를
받아서 그대로 `cwd` 로 쓰면, 잘못된 값이 넘어왔을 때 엉뚱한 폴더에서 세션이 돕니다.
웹은 계정 ID 만 보내고, 백엔드가 `workspace/users/<계정ID>` 를 조립하는 쪽이 낫습니다.

#### B-5. 마지막에 reconnect 엔드포인트

`ReconnectButton` 은 지금 `router.refresh()` 만 합니다. 화면을 다시 그려서 `/health`
를 다시 부를 뿐, 아무것도 다시 연결하지 않습니다.

진짜 reconnect 는 SDK 세션이 붙들고 있는 MCP 연결을 끊고 다시 맺는 일입니다
(`POST /sessions/:id/reconnect` 같은 형태). **B-1 이 없으면 이건 만들어도 의미가
없습니다.** 다시 연결했는지 확인할 방법이 없기 때문입니다.

---

## 5. 먼저 결정할 것

작업 시작 전에 답을 정해두면 뒤에서 뒤집는 일이 줄어듭니다.

### 결정 1 — 백엔드가 계정을 어떻게 식별할 것인가

갈래 A-4 에서 백엔드가 처음으로 "계정" 개념을 갖게 됩니다. 방식이 두 가지입니다.

| 방식 | 내용 | 장단점 |
|---|---|---|
| **불투명 식별자** (권장) | 웹이 계정 ID 문자열만 넘김. 백엔드는 그게 뭔지 모르고 캐시 열쇠로만 씀 | 경계가 거의 안 무너짐. 백엔드는 여전히 MongoDB 를 모름 |
| 백엔드가 직접 조회 | 백엔드에 `MONGODB_URI` 를 주고 사용자 행을 직접 읽음 | 경계가 무너지고 암호화 코드가 두 벌이 됨. **비권장** |

### 결정 2 — 계정별 워크스페이스를 어디에 둘 것인가

- `workspace/users/<계정ID>/` — 프로젝트 폴더 안. 백업/정리가 쉽고 눈에 보임
- `~/.sc4sap-web/<계정ID>/` — 홈 디렉터리. 프로젝트 폴더가 안 지저분해짐

PoC 단계에서는 앞쪽이 편합니다. `.gitignore` 에 이미 `workspace/` 가 들어 있습니다.

### 결정 3 — 키가 없는 계정을 어떻게 할 것인가

`/setup` 이 이제 API 키를 필수로 받으므로, 키 없는 계정은 원칙적으로 없습니다.
그래도 `.env` 의 공용 키로 떨어지는 폴백을 남길지 정해야 합니다.

- **남긴다**: 기존 스크립트(`npm run e2e` 등)가 그대로 동작합니다.
- **없앤다**: 누구 키로 돌고 있는지가 항상 명확합니다. 대신 스크립트를 손봐야 합니다.

권장: 남기되, 폴백이 쓰였을 때 서버 로그에 한 줄 남깁니다.

### 결정 4 — 키체인을 계속 쓸 것인가

키체인은 **그 머신에서만** 동작합니다. 서버를 여러 대로 늘리거나 도커로 옮기면
Windows 자격 증명 관리자가 없습니다.

- PoC 단계: 키체인으로 충분합니다.
- 배포를 생각한다면: `SAP_PASSWORD_STORAGE=file`(암호화 파일)로 가거나,
  MongoDB 에서 읽어서 세션 시작 시 주입하는 방식으로 바꿔야 합니다.

지금 결정할 필요는 없지만, 키체인에 의존하는 코드를 한 곳에 모아두면 나중에 바꾸기
쉽습니다.

---

## 6. 작업 순서

의존 관계를 고려한 권장 순서입니다.

```
1. 갈래 A 전체 (A-1 → A-4)
   └ 프록시가 백엔드에 계정 정보를 넘기는 통로가 여기서 처음 생깁니다.
     갈래 B 도 같은 통로를 씁니다.

2. B-1, B-2  (진짜 SAP 프로브 + 대시보드 연결)
   └ 아직 공용 프로필 기준입니다. 하지만 "됐는지 확인할 수단" 이 먼저 필요합니다.

3. B-3, B-4  (계정별 프로필 + 워크스페이스 + cwd 배선)
   └ 여기서 L1 가드레일 훅을 반드시 같이 검증합니다.

4. B-5  (reconnect)
   └ 2번이 없으면 의미가 없으므로 마지막입니다.
```

### 각 단계에서 "다 됐다" 고 말할 수 있는 조건

| 단계 | 확인 방법 |
|---|---|
| A | 서로 다른 키를 넣은 두 계정으로 동시에 채팅. Console 사용량이 양쪽 키에 각각 잡힘 |
| B-1 | SAP 를 꺼도(또는 주소를 틀리게 해도) 대시보드 SAP 행이 빨간불이 됨 |
| B-2 | 위 상태에서 Reconnect 를 눌렀을 때 "SAP 문제" 라고 정확히 말함 |
| B-3 | 계정별 폴더 안에 `.claude/settings.json` 이 있고, 훅 두 개가 들어있음 |
| B-4 | 금지 테이블 조회를 시도하면 **계정별 세션에서도** 차단됨 (가드레일 검증) |
| B-5 | MCP 연결을 강제로 끊은 뒤 Reconnect 를 누르면 실제로 복구됨 |

**B-4 의 확인은 생략하면 안 됩니다.** 가드레일이 빠져도 겉으로는 정상 동작하는
것처럼 보이기 때문입니다. `npm run smoke:hook` 이 그 검사를 하는 스크립트인데,
계정별 워크스페이스를 대상으로도 돌 수 있게 고쳐두면 좋습니다.

---

## 7. 나중에 다시 볼 것

지금 단계에서는 문제가 아니지만, 배포를 생각하면 걸리는 것들입니다.

- **3000 → 3001 사이가 평문 HTTP 입니다.** 같은 머신 안(127.0.0.1)이라 괜찮지만,
  백엔드를 다른 머신에 두는 순간 API 키가 네트워크를 평문으로 지나갑니다.
- **`SETUP_SECRET` 이 `MONGODB_URI` 와 같은 파일에 있습니다.** 환경 파일을 손에
  넣은 사람은 DB 와 복호화 키를 동시에 갖게 됩니다. 제대로 하려면 KMS 나 별도
  시크릿 저장소가 필요합니다.
- **백엔드가 여전히 인증을 안 합니다.** 3001 포트에 직접 접근할 수 있는 사람은
  아무 세션이나 열 수 있습니다. 지금은 127.0.0.1 바인딩이 유일한 방어입니다.
- **키체인은 머신 단위입니다.** (결정 4 참고)

---

## 8. 파일 위치 정리

작업하면서 자주 열게 될 파일들입니다.

### 웹 서버 (`web/`)

| 파일 | 역할 |
|---|---|
| `src/app/api/[...path]/route.ts` | 백엔드 중계. **자격증명을 끼워 넣는 지점** |
| `src/lib/setup-store.ts` | 저장된 연결 정보 읽기/쓰기. `readConnectionSecrets()` |
| `src/lib/secrets.ts` | AES-256-GCM 암복호화 |
| `src/lib/setup-checks.ts` | `/setup` 의 세 가지 검사. SAP 프로브 로직 원본 |
| `src/lib/auth/api-guard.ts` | API 라우트용 로그인/설정완료 확인 |
| `src/app/page.tsx` | 대시보드. SAP 행이 여기 있음 |
| `src/lib/account.ts` | `SAP_SYSTEM` 고정값이 여기 있음 (B-2 에서 제거) |
| `src/components/ReconnectButton.tsx` | B-5 대상 |

### 에이전트 백엔드 (`src/`)

| 파일 | 역할 |
|---|---|
| `server/session-manager.ts` | `create()` 와 `query()` 호출. **`cwd` / `env` 지정 지점** |
| `server/app.ts` | HTTP 엔드포인트. `POST /sessions`, `GET /health` |
| `server/claude-api.ts` | Anthropic 키 검사 + 캐시. A-4 대상 |
| `config.ts` | `.env` 로딩. 공용 설정 객체 |
| `provision-workspace.ts` | 워크스페이스 + L1 훅 설치. **함수로 분리 필요** |

### 플러그인 (`plugin_module/`)

| 파일 | 역할 |
|---|---|
| `bridge/mcp-server.cjs` | 72–118줄에 설정 파일 탐색 순서 |
| `scripts/sap-profile-cli.mjs` | 프로필/키체인 조작 CLI |
| `vendor/abap-mcp-adt/src/lib/secrets.ts` | `keychain:` 참조 해석 |
| `docs/multi-profile-design.md` | 프로필 설계 문서. 읽어볼 가치 있음 |
| `scripts/hooks/block-forbidden-tables.mjs` | L1 가드레일 |
| `scripts/hooks/tier-readonly-guard.mjs` | L1 가드레일 |

---

## 9. 참고 — 지금 검증되지 않은 것

이 로드맵과 별개로, 현재 확인되지 않은 사항입니다.

- **`/setup` 의 SAP 검사가 실제 시스템에서 성공하는 것을 본 적이 없습니다.**
  실패 경로(401 / 404 / 연결 거부 / DNS 실패)는 전부 확인했고, 성공 경로는
  테스트용 가짜 서버로만 확인했습니다. SAP GUI 계정이 잠겨 있어서 실제 시스템으로는
  아직 못 해봤습니다.
- 계정이 풀리면 `/setup` 을 처음부터 끝까지 한 번 돌려봐야 이 기능이 완료됐다고
  말할 수 있습니다.
