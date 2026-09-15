/**
 * The Configuration Setting screen's sample catalog.
 *
 * A layout pass, not the data. `web/config.html` holds the full SAP PM SPRO
 * list — 788 items with notes, references and mock screens — and this file
 * carries a hand-picked slice of it, enough rows across enough areas for the
 * tree, the overview cards and the detail article to have a real shape to
 * lay out. When the screen is wired up, the rows come from the backend and
 * this file goes.
 *
 * Shape follows the HTML's `DATA` rows: `path` is the IMG path the left tree
 * is built from, `g` / `sub` the business classification the overview groups
 * by, `tc` the transaction (or `(SPRO)` when there is none).
 */

/**
 * The modules the list can be filtered to. PM is the only one with rows
 * today; the dropdown is there so the next module is a data change, not a
 * screen change.
 */
export const CONFIG_MODULES = [
  { value: "PM", label: "PM · Plant Maintenance" },
] as const;

export type ConfigModule = (typeof CONFIG_MODULES)[number]["value"];

export type ConfigItem = {
  module: ConfigModule;
  no: number;
  /** Business group, e.g. `1. 조직구조`. */
  g: string;
  sub: string;
  item: string;
  tc: string;
  act: string;
  /** IMG path, ` > `-separated. */
  path: string;
  desc: string;
  tbl: string;
  req: "필수" | "선택";
  /** IMG area and its section — the two top levels of `path`. */
  ib: string;
  im: string;
  /** Verified against the IMG original. Drawn as a check in the tree. */
  verified?: boolean;
};

export type ConfigArea = {
  step: string;
  name: string;
  desc: string;
  groups: string[];
};

export const CONFIG_AREAS: ConfigArea[] = [
  { step: "1", name: "조직구조", desc: "정비 Plant·정비계획 Plant·계획 그룹·구역·정비 작업장.", groups: ["1. 조직구조"] },
  { step: "2", name: "기술객체", desc: "기능위치·설비 범주/번호/화면, ABC, 상태·파트너·분류·BOM·보증·허가·직렬번호·계측점.", groups: ["2. 기술객체"] },
  { step: "3", name: "통보·오더", desc: "정비통보 유형·카탈로그·우선순위·파트너, 정비오더 유형·제어키·일정·자재·외주·원가·정산·확인·완료·출력.", groups: ["3. 정비통보", "4. 정비오더"] },
  { step: "4", name: "예방보전·계획", desc: "정비 전략·계획 범주·기한 모니터링·작업목록·조건기반, 능력·WCM·셧다운·자원 일정.", groups: ["5. 예방보전", "6. 계획/능력"] },
  { step: "5", name: "통합", desc: "MM 예비부품/외주, QM 검교정, CO 원가, FI-AA 자산, PS, CS 서비스, 모바일, EHS.", groups: ["7. 통합"] },
  { step: "6", name: "특수·레포팅", desc: "차량·선형자산·이력/아카이빙·권한, PMIS·리스트·MTTR/MTBF·Fiori.", groups: ["8. 특수/기타", "9. 레포팅/분석"] },
];

const ES = "Enterprise Structure";
const MD = "Master Data in Plant Maintenance and Customer Service";
const PM = "Plant Maintenance and Customer Service";
const PROC = "Maintenance and Service Processing";

const PM_ITEMS: Omit<ConfigItem, "module">[] = [
  {
    no: 1, g: "1. 조직구조", sub: "정의",
    item: "Maintenance Plant / Maintenance Planning Plant 정의",
    tc: "(SPRO)", act: "SIMG_CFMENUSAPCOIX0",
    path: `${ES} > Definition > Plant Maintenance > Maintain Maintenance Planning Plant`,
    desc: "Maintenance Plant(=물류 Plant)와 Maintenance Planning Plant (계획 주체). 한 Maintenance Planning Plant 가 여러 Maintenance Plant 를 담당하는 중앙 정비 구조를 표현합니다.",
    tbl: "T399I (계획 Plant 파라미터)", req: "필수", ib: ES, im: "Definition", verified: true,
  },
  {
    no: 2, g: "1. 조직구조", sub: "할당",
    item: "Maintenance Plant → Planning Plant 할당",
    tc: "(SPRO)", act: "SIMG_CFMENUSAPCOIX1",
    path: `${ES} > Assignment > Plant Maintenance > Assign Maintenance Planning Plant to Maintenance Plant`,
    desc: "중앙 Maintenance Plan(한 Maintenance Planning Plant 가 여러 Plant 담당) 구조.",
    tbl: "T001W-IWERK", req: "필수", ib: ES, im: "Assignment", verified: true,
  },
  {
    no: 3, g: "1. 조직구조", sub: "정의",
    item: "Location (위치 코드)",
    tc: "OIAS", act: "SAPC_STANDORT",
    path: `${ES} > Definition > Logistics - General > Define Location`,
    desc: "건물·층·구역 등 Equipment 의 물리적 위치 코드 (자산회계·자재관리와 공유).",
    tbl: "T499S", req: "선택", ib: ES, im: "Definition",
  },
  {
    no: 38, g: "1. 조직구조", sub: "정의",
    item: "Plant Section (생산 구역·담당자)",
    tc: "OIAB", act: "SIMG_CFMENUOLI0OIAB",
    path: `${PM} > ${MD} > Technical Objects > General Data > Define Plant Sections`,
    desc: "Equipment·Functional Location 가 속한 생산 구역과 구역 담당자(Notification 시 연락처).",
    tbl: "T357", req: "선택", ib: MD, im: "Technical Objects", verified: true,
  },
  {
    no: 5, g: "2. 기술객체", sub: "공통",
    item: "Technical Object – User Status Profile / 범주 할당 / 권한키",
    tc: "BS02 / OIEB / BS52", act: "SIMG_CFMENUOLI0OIBS",
    path: `${PM} > ${MD} > Basic Settings > Define User Status`,
    desc: "Equipment·Functional Location용 Status Profile(Object Type IEQ/IFL)에 User Status·상태번호·허용 트랜잭션을 정의하고 Equipment Category 에 할당합니다.",
    tbl: "TJ20 (프로파일), TJ30/TJ30T (사용자 상태), TJ01 (비즈니스 트랜잭션), JEST (객체별 상태)", req: "선택", ib: MD, im: "Basic Settings",
  },
  {
    no: 8, g: "2. 기술객체", sub: "허가",
    item: "Permits – Permit 범주 / Permit 그룹 / 리스트 편집",
    tc: "OIST / OIPG / (SPRO)", act: "SIMG_CFMENUOLI0OIST",
    path: `${PM} > ${MD} > Basic Settings > Permits > Define Permit Categories`,
    desc: "Permit 범주(안전·비용·환경)와 Permit 그룹(클래스 유형 049 연결)을 정의 – IPMD 로 Permit 를 만들어 Equipment·Functional Location·오더에 할당합니다.",
    tbl: "T357G (허가), T357G_GR (그룹), IHGNS (객체별 허가 할당)", req: "선택", ib: MD, im: "Basic Settings",
  },
  {
    no: 12, g: "2. 기술객체", sub: "계측",
    item: "Measuring Point Category / Number Range / Field Selection",
    tc: "(SPRO) / IK01 / IK11", act: "OLI0T370P",
    path: `${PM} > ${MD} > Basic Settings > Measuring Points, Counters and Measurement Documents > Define Measuring Point Categories`,
    desc: "Measuring Point 범주와 Measuring Point·Measurement Document Number Range, 화면 필드 선택을 정의합니다.",
    tbl: "T370P/T370P_T (범주), IMPTT (측정점), IMRG (측정문서), NRIV (번호범위)", req: "선택", ib: MD, im: "Basic Settings", verified: true,
  },
  {
    no: 19, g: "2. 기술객체", sub: "보증",
    item: "Warranties – Warranty 범주 / 유형 / Number Range / Counter",
    tc: "GM02 / GM04 / (SPRO)", act: "OLI0GM02",
    path: `${PM} > ${MD} > Basic Settings > Warranties > Define Warranty Types`,
    desc: "Warranty 범주(제조사 인바운드·고객 아웃바운드)별 Warranty 유형과 Notification·오더 생성 시 점검 방식(경고/대화/없음), Master Warranty Number Range 를 정의합니다.",
    tbl: "BGMK (마스터 보증 헤더), BGMP (항목), BGMS (서비스), BGMZ (카운터)", req: "선택", ib: MD, im: "Basic Settings",
  },
  {
    no: 46, g: "2. 기술객체", sub: "기능위치",
    item: "Functional Location – Structure Indicator",
    tc: "OIPK", act: "SIMG_CFMENUOLI0OIPK",
    path: `${PM} > ${MD} > Technical Objects > Functional Locations > Create Structure Indicator for Reference Location`,
    desc: "Functional Location 라벨 Edit Mask(A 영문 / N 숫자 / X 혼용, 구분자)와 계층 단계 위치 – 최대 40자, 지시자 키 5자.",
    tbl: "T370S, T370S_T", req: "필수", ib: MD, im: "Technical Objects", verified: true,
  },
  {
    no: 77, g: "2. 기술객체", sub: "설비",
    item: "Equipment Category 정의 (범주 속성 · 참조 범주 · Number Range 할당)",
    tc: "OIET", act: "SIMG_CFMENUOLI0OIET",
    path: `${PM} > ${MD} > Technical Objects > Equipment > Equipment Categories > Maintain Equipment Category`,
    desc: "Equipment Category(M 기계, P 생산자원, Q 계측기, S 고객장비, F 차량) – 참조 범주·내부/외부 Number Range 할당·Status Profile·View Profile 을 지정합니다.",
    tbl: "T370T, T370U (텍스트)", req: "필수", ib: MD, im: "Technical Objects", verified: true,
  },
  {
    no: 128, g: "2. 기술객체", sub: "직렬",
    item: "Serial Number Profile (OIS2) / 기본 Equipment 범주 / 내부 채번 잠금",
    tc: "OIS2 / (SPRO)", act: "SIMG_CFMENUOLI0OIS2",
    path: `${PM} > ${MD} > Technical Objects > Serial Number Management > Define Serial Number Profiles`,
    desc: "Serial Number Profile – 존재 요건, Equipment Category, 재고 점검, Serializing Procedure(MMSL·PPAU·PPRL·SDAU·QMSL 등)별 직렬화 수준을 정의합니다.",
    tbl: "T377P/T377P_T (프로파일), T377X (절차별 문서), SER03/SER05, EQBS", req: "선택", ib: MD, im: "Technical Objects",
  },
  {
    no: 264, g: "3. 정비통보", sub: "유형",
    item: "Notification Type 정의 (M1 정비요청 · M2 고장 · M3 활동보고)",
    tc: "(SPRO) / IW21", act: "OLIAOQN0",
    path: `${PM} > ${PROC} > Maintenance and Service Notifications > Notification Creation > Notification Types > Define Notification Types`,
    desc: "Notification Type(TQ80) – Notification 범주·원천(M1/M2/M3)·Catalog Profile·Partner Determination Procedure·Number Range 를 정의합니다.",
    tbl: "TQ80/TQ80_T (유형), QMEL (통보 헤더), QMIH, QMFE/QMUR/QMMA/QMSM", req: "필수", ib: PROC, im: "Maintenance and Service Notifications", verified: true,
  },
  {
    no: 306, g: "4. 정비오더", sub: "유형",
    item: "Order Type 정의 (OIOA – PM01 일반 · PM02 예방 · PM03 고장 · PM04 재생 · PM05 검교정)",
    tc: "OIOA", act: "SIMG_CFMENUOLIAOIOA",
    path: `${PM} > ${PROC} > Maintenance and Service Orders > Functions and Settings for Order Types > Configure Order Types`,
    desc: "정비 Order Type(T003O, 오더 범주 30)에 Settlement Profile·예산 프로파일·Status Profile·잔류기간·Number Range 를 지정합니다.",
    tbl: "T003O/T003P (오더 유형), T350 (PM 오더 유형 파라미터), AUFK (오더 헤더)", req: "필수", ib: PROC, im: "Maintenance and Service Orders", verified: true,
  },
  {
    no: 334, g: "4. 정비오더", sub: "작업",
    item: "Maintain Control Keys – 작업 Control Key (PM01 내부 · PM02 외부 · PM03 외부 서비스)",
    tc: "OIO7", act: "SIMG_CFMENUOLIAOIO7",
    path: `${PM} > ${PROC} > Maintenance and Service Orders > Functions and Settings for Order Types > Control Key > Maintain Control Keys`,
    desc: "작업 Control Key 정의 – 내부/외부 처리 구분과 일정 계산·확인 필수·원가 관련·인쇄 관련·서비스 명세 사용 지시자.",
    tbl: "T430/T430T (제어키), AFVC-STEUS (작업 제어키)", req: "필수", ib: PROC, im: "Maintenance and Service Orders",
  },
  {
    no: 236, g: "4. 정비오더", sub: "출력",
    item: "Print Control – Order Shop Papers (OID1)",
    tc: "OID1", act: "SIMG_CFMENUOLIAOID1",
    path: `${PM} > ${PROC} > Basic Settings > Print Control > Define Shop Papers, Forms and Output Programs`,
    desc: "오더 출력물(작업지시서·자재 출고표·시간 확인표·객체 리스트)에 양식·출력 프로그램을 지정하고 프린터 결정 순서를 정합니다.",
    tbl: "TFB03 (출력물), T390 계열, TDIVERSION", req: "필수", ib: PROC, im: "Basic Settings",
  },
  {
    no: 170, g: "5. 예방보전", sub: "계획",
    item: "Set Maintenance Plan Categories – Maintenance Plan Category (T399W)",
    tc: "(SPRO)", act: "OLIP_V_T399W_I",
    path: `${PM} > Maintenance Plans, Work Centers, Task Lists and PRTs > Maintenance Plans > Set Maintenance Plan Categories`,
    desc: "Maintenance Plan Category별 호출 객체(Maintenance Order / Notification / 서비스 입력시트 / QM 검사로트)와 기본 오더·Notification 유형을 정합니다.",
    tbl: "T399W/T399W_T (범주 파라미터), MPLA-MPTYP", req: "필수", ib: "Maintenance Plans, Work Centers, Task Lists and PRTs", im: "Maintenance Plans", verified: true,
  },
  {
    no: 105, g: "8. 특수/기타", sub: "차량",
    item: "Fleet Management – Fleet Object Types (T370FLT)",
    tc: "(SPRO)", act: "OLI0_V_T370FLT",
    path: `${PM} > ${MD} > Technical Objects > Settings for Fleet Management > Assign View Profile and Equipment Categories to Fleet Object Types`,
    desc: "Fleet Object Type(승용·트럭·지게차 등)을 정의하고 Equipment Category F·View Profile 에 연결 – Fleet 설정 9개의 시작점.",
    tbl: "T370FLT/T370FLT_R, T370T (범주 F)", req: "선택", ib: MD, im: "Technical Objects",
  },
];

export const CONFIG_ITEMS: ConfigItem[] = PM_ITEMS.map((item) => ({ module: "PM", ...item }));

/** What the full list holds, so the frame can say so while showing a slice. */
export const CONFIG_TOTAL = 788;

export function findConfigItem(no: number): ConfigItem | undefined {
  return CONFIG_ITEMS.find((item) => item.no === no);
}
