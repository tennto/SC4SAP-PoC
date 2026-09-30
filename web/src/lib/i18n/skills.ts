/**
 * The skill catalog in the other two languages.
 *
 * An overlay, not a second catalog. `lib/skills.ts` stays the source of truth
 * and stays English: a field's English label is the key its value is stored
 * under and the line the prompt sends to the agent (`Label: value`), and a
 * select's English option is the value that line carries. What changes with
 * the language is only what the reader sees — the title in the rail, the
 * summary under it, the label above each input, the words in each option —
 * so that is all this file holds, keyed by slug and by the English it stands
 * in for. Anything missing here falls through to the English, so a skill
 * added to the catalog is usable before it is translated.
 */
import type { Locale } from "./locale";
import type { Skill, SkillField, SkillGroup, SkillGroupId } from "@/lib/skills";

type FieldText = {
  label?: string;
  placeholder?: string;
  hint?: string;
  /** English option → what the reader sees for it. */
  options?: Record<string, string>;
  /** English option → its hint. See `SkillField.optionHints`. */
  optionHints?: Record<string, string>;
};

type SkillText = {
  title?: string;
  summary?: string;
  blockedReason?: string;
  costNote?: string;
  /** Keyed by the field's English label. */
  fields?: Record<string, FieldText>;
};

type GroupText = { label: string; hint: string };

type CatalogText = {
  groups: Record<SkillGroupId, GroupText>;
  skills: Record<string, SkillText>;
};

/** Shared by every module select — the codes are codes, the first is not. */
const MODULES_KO = { "Auto-route": "자동 라우팅" };
const MODULES_JA = { "Auto-route": "自動ルーティング" };

const LANGUAGES_KO = { Korean: "한국어", English: "영어", Japanese: "일본어", German: "독일어" };
const LANGUAGES_JA = { Korean: "韓国語", English: "英語", Japanese: "日本語", German: "ドイツ語" };

const WRITE_BLOCKED_KO =
  "쓰기 계열 SAP 도구가 필요합니다. PoC 백엔드는 Create/Update/Delete를 모델의 컨텍스트에서 아예 제거합니다 (server/tool-policy.ts).";
const WRITE_BLOCKED_JA =
  "書き込み系の SAP ツールが必要です。PoC バックエンドは Create/Update/Delete をモデルのコンテキストから完全に外しています (server/tool-policy.ts)。";

const ko: CatalogText = {
  groups: {
    analyze: { label: "분석", hint: "시스템을 읽고 질문에 답합니다" },
    build: { label: "생성", hint: "오브젝트 생성과 전송" },
    system: { label: "시스템", hint: "진단과 MCP 서버" },
  },
  skills: {
    "ask-consultant": {
      title: "컨설턴트에게 묻기",
      summary:
        "운영 질문을 해당 모듈 컨설턴트에게 라우팅하고, 설정된 SAP 환경을 기준으로 답합니다",
      fields: {
        Module: {
          label: "모듈",
          options: MODULES_KO,
          hint: "자동 라우팅은 질문의 키워드로 에이전트를 고릅니다.",
        },
        Question: {
          label: "질문",
          placeholder: "예: PO 릴리스 전략이 왜 두 번째 승인자를 건너뛰나요?",
        },
      },
      costNote:
        "질문은 플러그인의 모듈 컨설턴트가 답하고, 오케스트레이터는 라우팅과 답변 확인을 맡습니다. 여기서 고른 모델은 오케스트레이터에 적용되며, 플러그인 0.6.24부터 이 스킬은 그 선택을 따릅니다. 컨설턴트는 Opus를 고르면 Opus로, 그 외에는 Sonnet으로 실행됩니다. 2026-09-27 측정에서 한 문장짜리 답이 $0.43였고, 그중 $0.28은 세션이 Sonnet으로 열렸다가 스킬이 고정한 Haiku로 바뀌면서 든 비용이었습니다.",
    },
    "analyze-code": {
      title: "코드 분석",
      summary:
        "ABAP 오브젝트 정적 리뷰 — AST, 의미 분석, where-used를 sap-code-reviewer로 실행합니다",
      fields: {
        "Object type": {
          label: "오브젝트 유형",
          options: {
            Program: "프로그램",
            Class: "클래스",
            "Function Module": "펑션 모듈",
            Include: "인클루드",
            Interface: "인터페이스",
          },
        },
        Package: {
          label: "패키지",
          hint: "선택 사항. 검색 범위를 좁히고 주변 오브젝트를 리뷰에 함께 넘깁니다.",
        },
        "Object name": { label: "오브젝트 이름" },
        "Review focus": {
          label: "리뷰 관점",
          options: {
            All: "전체",
            "Clean ABAP": "Clean ABAP",
            Performance: "성능",
            Security: "보안",
            "SAP standard compliance": "SAP 표준 준수",
          },
        },
        Mode: {
          label: "모드",
          options: { Economy: "절약", Standard: "기본" },
          optionHints: {
            Economy:
              "에이전트 1개가 소스를 읽고 리뷰어 규칙 파일을 그대로 적용합니다. 예상 소요비용은 약 250~350원, 예상 소요시간은 1~2분입니다.",
            Standard:
              "코드 리뷰어 에이전트를 쓰는 플러그인 스킬입니다. 예상 소요비용은 약 500~1,000원, 예상 소요시간은 약 2분입니다. 시작 전에 리뷰어 모델을 묻습니다.",
          },
        },
        Language: { label: "작성 언어", options: LANGUAGES_KO },
      },
      costNote:
        "리뷰는 플러그인의 코드 리뷰어 에이전트가 맡습니다. 소스와 규칙 파일을 읽고 지적 사항을 쓰며, Sonnet으로 도는 메인 실행은 그걸 보고서로 정리만 합니다. 여기서 고르는 모델은 리뷰어의 모델입니다. Haiku는 가장 저렴하게, 기본은 Sonnet이고, Opus를 고르면 플러그인이 원래 쓰는 Opus 리뷰어로 돕니다. 예산 한도는 없습니다.",
    },
    "analyze-symptom": {
      title: "증상 분석",
      summary:
        "덤프, 오류, 성능 저하의 근본 원인 분석 — 덤프, 전송, where-used를 살펴 가설을 좁힙니다",
      costNote:
        "매 라운드마다 디버거 에이전트가 SAP 시스템의 덤프, 전송, 코드를 조사하고, 메인 실행은 스킬이 고정한 Sonnet으로 돕니다. 숏 덤프는 Sonnet으로 먼저 분류되고, 덤프만으로 원인이 안 잡히면 스킬이 알아서 Opus로 올립니다. 여기서 고르는 모델이 그 승격을 허용할지 정합니다. Sonnet이면 승격도 Sonnet으로, Opus면 Opus로 실행됩니다.",
      fields: {
        "Symptom type": {
          label: "증상 유형",
          options: {
            "Short dump": "숏 덤프",
            "Error message": "오류 메시지",
            "Wrong result": "잘못된 결과",
            Performance: "성능",
            "Transport failure": "전송 실패",
            Unknown: "모름",
          },
          hint: "성능: 이 앱에서는 프로파일링 실행이 허용되지 않아 덤프, 전송, 코드로만 분석합니다.",
        },
        "Where it happened": {
          label: "발생 위치",
          placeholder: "VA01 · ZSD_ORDER_REPORT · 잡 ZBILL_RUN",
          hint: "트랜잭션, 프로그램, 잡 또는 앱. 스크린샷에 보이면 생략해도 됩니다.",
        },
        "How often": {
          label: "발생 빈도",
          options: {
            "Not sure": "잘 모름",
            "Every time": "매번",
            Intermittent: "간헐적",
            "Only some users or data": "특정 사용자나 데이터에서만",
            "Since a recent change": "최근 변경 이후",
            "First time": "처음",
          },
          hint: "여덟 가지 원인 범주 중 어디로 분석을 기울일지 여기서 시작합니다.",
        },
        "Since when": {
          label: "언제부터",
          placeholder: "어제 · SP 업그레이드 이후 · 모름",
          hint: "전송 검색 기간을 정합니다.",
        },
        "What you observed": {
          label: "관찰한 내용",
          placeholder: "덤프나 메시지, 무엇을 하던 중이었는지, 최근 무엇이 바뀌었는지.",
          hint: "덤프나 잡 로그 스크린샷을 붙여넣거나 끌어다 놓으세요 — 이미지가 메모와 함께 분석에 전달됩니다.",
        },
      },
    },
    "analyze-cbo-obj": {
      title: "CBO 패키지 인벤토리",
      summary:
        "커스텀 패키지를 훑어 재사용할 만한 Z 오브젝트를 정리해, 이후 실행이 새로 만들기보다 기존 요소를 쓰게 합니다",
      fields: {
        Package: { label: "패키지" },
        Module: { label: "모듈", options: MODULES_KO },
      },
    },
    "compare-programs": {
      title: "프로그램 비교",
      summary:
        "같은 시나리오를 공유하지만 모듈, 국가, 페르소나로 갈라지는 2~5개 프로그램을 업무 관점에서 나란히 비교합니다",
      fields: {
        Programs: {
          label: "프로그램",
          placeholder: "한 줄에 하나씩 — 2개에서 5개까지.",
          hint: "같은 업무 시나리오를 공유해야 합니다. 차이점이 비교의 핵심입니다.",
        },
        "Comparison axis": {
          label: "비교 축",
          options: {
            Module: "모듈",
            "Country / localization": "국가 / 로컬라이제이션",
            Persona: "페르소나",
            "Time horizon": "시간 범위",
          },
        },
        Reader: {
          label: "독자",
          options: {
            "Functional consultant": "기능 컨설턴트",
            Developer: "개발자",
            "Business owner": "현업 담당자",
          },
        },
        Output: {
          label: "출력",
          options: { Markdown: "Markdown", "Markdown + HTML": "Markdown + HTML", "HTML only": "HTML만" },
          hint: "HTML은 단일 파일로 만들어져 공유, 메일, 인쇄에 바로 쓸 수 있습니다.",
        },
      },
    },
    "program-to-spec": {
      title: "프로그램 → 명세",
      summary:
        "프로그램을 역공학해 기능 또는 기술 명세서로 만들고, 선택 화면과 ALV 목업을 붙입니다",
      fields: {
        Package: { label: "패키지", hint: "선택 사항. 프로그램과 커스텀 오브젝트를 찾는 데 씁니다." },
        "Program name": { label: "프로그램 이름" },
        "Output format": {
          label: "출력 형식",
          optionHints: {
            Markdown: "이 화면에 문서로 표시하고, .md로 저장합니다.",
            HTML: "실제 모양 그대로 미리보기하고, .html로 저장합니다.",
            "Markdown + HTML": "문서와 그 아래 HTML 미리보기를 함께 보여주고, 둘 다 저장할 수 있습니다.",
            "Excel (xlsx)": "통합 문서를 파일로 받습니다.",
          },
        },
        Mode: {
          label: "모드",
          options: { Economy: "절약", Standard: "기본" },
          optionHints: {
            Economy: "에이전트 1개로 실행합니다. 예상 소요비용은 약 200~400원, 예상 소요시간은 1~3분입니다.",
            Standard:
              "분석 에이전트를 쓰는 플러그인 전체 스킬입니다. 예상 소요비용은 약 1,000~1,600원, 예상 소요시간은 5~10분입니다. 시작 전에 상세 수준과 독자를 묻습니다.",
          },
        },
        Language: { label: "작성 언어", options: LANGUAGES_KO },
      },
    },
    "package-to-process": {
      title: "패키지 → 프로세스",
      summary:
        "CBO 패키지를 순서도, 시퀀스 다이어그램, 단계 표가 있는 종단 간 업무 프로세스 문서로 만듭니다",
      fields: {
        Package: { label: "패키지" },
        Module: { label: "모듈", options: MODULES_KO },
        Deliverable: {
          label: "산출물",
          options: {
            Markdown: "Markdown",
            HTML: "HTML",
            "Markdown + HTML": "Markdown + HTML",
            "Markdown + BPML workbook (xlsx)": "Markdown + BPML 워크북 (xlsx)",
            "Markdown + HTML + BPML workbook (xlsx)": "Markdown + HTML + BPML 워크북 (xlsx)",
          },
          hint: "BPML이 Excel 산출물이고, 프로세스 문서는 Markdown 또는 HTML로 나옵니다.",
        },
        Language: { label: "언어", options: LANGUAGES_KO },
      },
    },
    "create-program": {
      title: "프로그램 생성",
      summary:
        "Phase 0~8 전체 파이프라인: Report / CRUD / ALV / Batch, Main+Include 구조, OOP 또는 절차형, QA 단계 포함",
      blockedReason: WRITE_BLOCKED_KO,
      fields: {
        "Program type": { label: "프로그램 유형" },
        Paradigm: { label: "패러다임", options: { OOP: "OOP", Procedural: "절차형" } },
        Package: { label: "패키지" },
        Transport: {
          label: "전송 요청",
          placeholder: "기존 요청 번호, 또는 비워 두면 새로 만듭니다",
        },
        "Execution mode": {
          label: "실행 모드",
          options: { Auto: "자동", Manual: "수동", Hybrid: "하이브리드" },
        },
        Requirement: { label: "요구 사항", placeholder: "프로그램이 해야 할 일." },
      },
    },
    "create-object": {
      title: "오브젝트 생성",
      summary: "단일 오브젝트 생성 — 전송과 패키지 확인, 생성, 활성화",
      blockedReason: WRITE_BLOCKED_KO,
      fields: {
        "Object type": {
          label: "오브젝트 유형",
          options: {
            Class: "클래스",
            Interface: "인터페이스",
            "Function Module": "펑션 모듈",
            Table: "테이블",
            Structure: "구조",
            "Data Element": "데이터 엘리먼트",
            Domain: "도메인",
            "CDS View": "CDS 뷰",
          },
        },
        "Object name": { label: "오브젝트 이름" },
        Package: { label: "패키지" },
        Transport: {
          label: "전송 요청",
          placeholder: "기존 요청 번호, 또는 비워 두면 새로 만듭니다",
        },
      },
    },
    "sap-doctor": {
      title: "SAP Doctor",
      summary: "플러그인 상태, MCP 서버 연결, SAP 연결 자체를 진단합니다",
    },
  },
};

const ja: CatalogText = {
  groups: {
    analyze: { label: "分析", hint: "システムを読み、質問に答える" },
    build: { label: "作成", hint: "オブジェクトの作成と移送" },
    system: { label: "システム", hint: "診断と MCP サーバー" },
  },
  skills: {
    "ask-consultant": {
      title: "コンサルタントに聞く",
      summary:
        "運用上の質問を該当モジュールのコンサルタントに振り分け、設定済みの SAP 環境に基づいて回答します",
      fields: {
        Module: {
          label: "モジュール",
          options: MODULES_JA,
          hint: "自動ルーティングは質問のキーワードからエージェントを選びます。",
        },
        Question: {
          label: "質問",
          placeholder: "例: PO のリリース戦略が 2 番目の承認者を飛ばすのはなぜ?",
        },
      },
      costNote:
        "質問にはプラグインのモジュールコンサルタントが答え、オーケストレーターはルーティングと回答の確認を担います。ここで選ぶモデルはオーケストレーターに適用され、プラグイン 0.6.24 以降このスキルはその選択に従います。コンサルタントは Opus を選ぶと Opus で、それ以外は Sonnet で動きます。2026-09-27 の計測では一文の回答が $0.43 で、そのうち $0.28 はセッションが Sonnet で開き、スキルが固定していた Haiku に切り替わったことによる費用でした。",
    },
    "analyze-code": {
      title: "コード分析",
      summary:
        "ABAP オブジェクトの静的レビュー — AST、意味解析、where-used を sap-code-reviewer で実行します",
      fields: {
        "Object type": {
          label: "オブジェクト種別",
          options: {
            Program: "プログラム",
            Class: "クラス",
            "Function Module": "汎用モジュール",
            Include: "インクルード",
            Interface: "インターフェース",
          },
        },
        Package: {
          label: "パッケージ",
          hint: "任意。検索範囲を絞り、周辺オブジェクトをレビューに渡します。",
        },
        "Object name": { label: "オブジェクト名" },
        "Review focus": {
          label: "レビュー観点",
          options: {
            All: "すべて",
            "Clean ABAP": "Clean ABAP",
            Performance: "パフォーマンス",
            Security: "セキュリティ",
            "SAP standard compliance": "SAP 標準準拠",
          },
        },
        Mode: {
          label: "モード",
          options: { Economy: "節約", Standard: "標準" },
          optionHints: {
            Economy:
              "エージェント 1 つがソースを読み、レビュアーのルールファイルをそのまま適用します。予想費用は約 30〜40 円、予想所要時間は 1〜2 分です。",
            Standard:
              "コードレビュアーエージェントを使うプラグインのスキルです。予想費用は約 50〜100 円、予想所要時間は約 2 分です。開始前にレビュアーのモデルを尋ねます。",
          },
        },
        Language: { label: "記述言語", options: LANGUAGES_JA },
      },
      costNote:
        "レビューはプラグインのコードレビュアーエージェントが担当します。ソースとルールファイルを読んで指摘を書き、Sonnet で動くメインの実行はそれをレポートにまとめるだけです。ここで選ぶのはレビュアーのモデルです。Haiku は最も安く、既定は Sonnet、Opus を選ぶとプラグイン本来の Opus レビュアーで動きます。予算の上限はありません。",
    },
    "analyze-symptom": {
      title: "症状の分析",
      summary:
        "ダンプ、エラー、性能低下の根本原因分析 — ダンプ、移送、where-used を調べて仮説を絞り込みます",
      costNote:
        "各ラウンドでデバッガーエージェントが SAP システムのダンプ、移送、コードを調査し、メインの実行はスキルが固定した Sonnet で動きます。ショートダンプはまず Sonnet で切り分けられ、ダンプだけでは原因が分からないときはスキルが自分で Opus へ上げます。ここで選ぶモデルがその昇格を許すかを決めます。Sonnet なら昇格も Sonnet で、Opus なら Opus で動きます。",
      fields: {
        "Symptom type": {
          label: "症状の種類",
          options: {
            "Short dump": "ショートダンプ",
            "Error message": "エラーメッセージ",
            "Wrong result": "誤った結果",
            Performance: "パフォーマンス",
            "Transport failure": "移送の失敗",
            Unknown: "不明",
          },
          hint: "パフォーマンス: このアプリからプロファイリングは実行できないため、ダンプ、移送、コードから分析します。",
        },
        "Where it happened": {
          label: "発生箇所",
          placeholder: "VA01 · ZSD_ORDER_REPORT · ジョブ ZBILL_RUN",
          hint: "トランザクション、プログラム、ジョブまたはアプリ。スクリーンショットに写っていれば省略可。",
        },
        "How often": {
          label: "発生頻度",
          options: {
            "Not sure": "わからない",
            "Every time": "毎回",
            Intermittent: "断続的",
            "Only some users or data": "特定のユーザーやデータのみ",
            "Since a recent change": "最近の変更以降",
            "First time": "初めて",
          },
          hint: "8 つの原因カテゴリのどれに分析を寄せるかはここから決まります。",
        },
        "Since when": {
          label: "いつから",
          placeholder: "昨日 · SP アップグレード後 · 不明",
          hint: "移送検索の期間を決めます。",
        },
        "What you observed": {
          label: "観察した内容",
          placeholder: "ダンプやメッセージ、何をしていたか、最近何が変わったか。",
          hint: "ダンプやジョブログのスクリーンショットを貼り付けるかドロップしてください — 画像はメモと一緒に分析へ渡されます。",
        },
      },
    },
    "analyze-cbo-obj": {
      title: "CBO パッケージの棚卸し",
      summary:
        "カスタムパッケージを走査し、再利用に値する Z オブジェクトを一覧化して、以降の実行が新規作成より既存要素を優先するようにします",
      fields: {
        Package: { label: "パッケージ" },
        Module: { label: "モジュール", options: MODULES_JA },
      },
    },
    "compare-programs": {
      title: "プログラム比較",
      summary:
        "同じシナリオを共有しつつモジュール、国、ペルソナで分岐する 2〜5 本のプログラムを、業務観点で並べて比較します",
      fields: {
        Programs: {
          label: "プログラム",
          placeholder: "1 行に 1 つ — 2 本から 5 本まで。",
          hint: "同じ業務シナリオを共有している必要があります。違いこそが比較の要点です。",
        },
        "Comparison axis": {
          label: "比較軸",
          options: {
            Module: "モジュール",
            "Country / localization": "国 / ローカライズ",
            Persona: "ペルソナ",
            "Time horizon": "時間軸",
          },
        },
        Reader: {
          label: "読者",
          options: {
            "Functional consultant": "機能コンサルタント",
            Developer: "開発者",
            "Business owner": "業務担当者",
          },
        },
        Output: {
          label: "出力",
          options: { Markdown: "Markdown", "Markdown + HTML": "Markdown + HTML", "HTML only": "HTML のみ" },
          hint: "HTML は単一ファイルとして生成され、共有・メール・印刷にそのまま使えます。",
        },
      },
    },
    "program-to-spec": {
      title: "プログラム → 仕様書",
      summary:
        "プログラムをリバースエンジニアリングして機能仕様書または技術仕様書にし、選択画面と ALV のモックアップを添えます",
      fields: {
        Package: { label: "パッケージ", hint: "任意。プログラムとカスタムオブジェクトを探すのに使います。" },
        "Program name": { label: "プログラム名" },
        "Output format": {
          label: "出力形式",
          optionHints: {
            Markdown: "この画面に文書として表示し、.md で保存します。",
            HTML: "実際の見た目でプレビューし、.html で保存します。",
            "Markdown + HTML": "文書とその下の HTML プレビューを並べ、どちらも保存できます。",
            "Excel (xlsx)": "ブックをファイルで受け取ります。",
          },
        },
        Mode: {
          label: "モード",
          options: { Economy: "節約", Standard: "標準" },
          optionHints: {
            Economy: "エージェント 1 つで実行します。予想費用は約 20〜40 円、予想所要時間は 1〜3 分です。",
            Standard:
              "分析エージェントを使うプラグインのフルスキルです。予想費用は約 100〜170 円、予想所要時間は 5〜10 分です。開始前に詳細度と読者を尋ねます。",
          },
        },
        Language: { label: "記述言語", options: LANGUAGES_JA },
      },
    },
    "package-to-process": {
      title: "パッケージ → プロセス",
      summary:
        "CBO パッケージを、フローチャート、シーケンス図、ステップ表を備えたエンドツーエンドの業務プロセス文書にします",
      fields: {
        Package: { label: "パッケージ" },
        Module: { label: "モジュール", options: MODULES_JA },
        Deliverable: {
          label: "成果物",
          options: {
            Markdown: "Markdown",
            HTML: "HTML",
            "Markdown + HTML": "Markdown + HTML",
            "Markdown + BPML workbook (xlsx)": "Markdown + BPML ワークブック (xlsx)",
            "Markdown + HTML + BPML workbook (xlsx)": "Markdown + HTML + BPML ワークブック (xlsx)",
          },
          hint: "BPML が Excel の成果物で、プロセス文書は Markdown または HTML で出力されます。",
        },
        Language: { label: "言語", options: LANGUAGES_JA },
      },
    },
    "create-program": {
      title: "プログラム作成",
      summary:
        "Phase 0〜8 の全パイプライン: Report / CRUD / ALV / Batch、Main+Include 構造、OOP または手続き型、QA パス付き",
      blockedReason: WRITE_BLOCKED_JA,
      fields: {
        "Program type": { label: "プログラム種別" },
        Paradigm: { label: "パラダイム", options: { OOP: "OOP", Procedural: "手続き型" } },
        Package: { label: "パッケージ" },
        Transport: {
          label: "移送依頼",
          placeholder: "既存の依頼番号。空欄なら新規作成",
        },
        "Execution mode": {
          label: "実行モード",
          options: { Auto: "自動", Manual: "手動", Hybrid: "ハイブリッド" },
        },
        Requirement: { label: "要件", placeholder: "プログラムがやるべきこと。" },
      },
    },
    "create-object": {
      title: "オブジェクト作成",
      summary: "単一オブジェクトの作成 — 移送とパッケージを確認し、作成して有効化します",
      blockedReason: WRITE_BLOCKED_JA,
      fields: {
        "Object type": {
          label: "オブジェクト種別",
          options: {
            Class: "クラス",
            Interface: "インターフェース",
            "Function Module": "汎用モジュール",
            Table: "テーブル",
            Structure: "構造",
            "Data Element": "データエレメント",
            Domain: "ドメイン",
            "CDS View": "CDS ビュー",
          },
        },
        "Object name": { label: "オブジェクト名" },
        Package: { label: "パッケージ" },
        Transport: {
          label: "移送依頼",
          placeholder: "既存の依頼番号。空欄なら新規作成",
        },
      },
    },
    "sap-doctor": {
      title: "SAP Doctor",
      summary: "プラグインの状態、MCP サーバーの接続、SAP 接続そのものを診断します",
    },
  },
};

const CATALOG: Partial<Record<Locale, CatalogText>> = { ko, ja };

/** What one field shows. The English catalog's own words where nothing else is set. */
export type FieldDisplay = {
  label: string;
  placeholder?: string;
  hint?: string;
  /** For a select: each English option beside what the reader sees for it. */
  options: { value: string; label: string }[];
  /** The line under the field for this value: the option's own, else `hint`. */
  hintFor: (value: unknown) => string | undefined;
  /** Every option's own hint, where the field has them. */
  optionHints: { value: string; hint: string }[];
};

/** A skill as the reader sees it in `locale`. */
export type SkillDisplay = {
  title: string;
  summary: string;
  blockedReason?: string;
  costNote?: string;
  field: (field: SkillField) => FieldDisplay;
};

export function skillDisplay(locale: Locale, skill: Skill): SkillDisplay {
  const text = CATALOG[locale]?.skills[skill.slug];
  return {
    title: text?.title ?? skill.title,
    summary: text?.summary ?? skill.summary,
    blockedReason: text?.blockedReason ?? skill.blockedReason,
    costNote: text?.costNote ?? skill.cost?.note,
    field: (field) => {
      const own = text?.fields?.[field.label];
      return {
        label: own?.label ?? field.label,
        placeholder: own?.placeholder ?? field.placeholder,
        hint: own?.hint ?? field.hint,
        optionHints: (field.options ?? []).flatMap((option) => {
          const hint = own?.optionHints?.[option] ?? field.optionHints?.[option];
          return hint ? [{ value: option, hint }] : [];
        }),
        hintFor: (value) =>
          (typeof value === "string"
            ? own?.optionHints?.[value] ?? field.optionHints?.[value]
            : undefined) ??
          own?.hint ??
          field.hint,
        options: (field.options ?? []).map((option) => ({
          value: option,
          label: own?.options?.[option] ?? option,
        })),
      };
    },
  };
}

export function groupDisplay(locale: Locale, group: SkillGroup): GroupText {
  return CATALOG[locale]?.groups[group.id] ?? { label: group.label, hint: group.hint };
}
