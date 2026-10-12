# Clever Lab Admin Spec

- 작성일: 2026-10-09
- 작성자: aaron.ji
- 상태: Draft (리뷰 대기)

## 1. 개요

고객 VOC를 조사할 때 운영 DB에 직접 접속하지 않고 clever-lab-api 운영 데이터(기공소, 의뢰서, 거래 명세서, 회계)를 조회할 수 있는 백오피스 어드민을 만든다. 다른 문서에 영향이 없는 필드는 수정도 할 수 있다.

**배경**

- 최근 "회계 금액이 다르게 나온다"는 고객 VOC를 조사하면서, 개발자가 운영 DB에 접속해 `clkLabs`, `clkBills`, `clkInvoices` 등을 직접 조회해야 했다.
- 회계 금액은 연결된 명세서와 이전 달 회계를 따라가며 확인해야 해서, 여러 컬렉션을 오가는 조회가 필요하다.
- 운영자가 개발자에게 데이터 확인을 요청하는 일은 많지 않다. 문제는 VOC 조사처럼 드물지만 운영 DB 접근이 꼭 필요한 상황이다.

**목적**

1. VOC 조사 등으로 운영 DB에 직접 접근하는 일을 최소화한다. (가장 큰 목적)
2. 문서 사이의 연결(기공소 → 의뢰서 → 명세서 → 회계)을 화면에서 따라가며 확인할 수 있게 한다.
3. 백오피스 기본 기능으로 운영자가 데이터를 조회하고, 안전한 범위의 수정을 한다.

**성공 기준**

- "회계 금액 불일치" 유형의 VOC를 운영 DB 접속 없이 어드민만으로 원인 확인까지 할 수 있다.
- 어드민 오픈 후 VOC 조사 목적의 운영 DB 직접 접속 건수가 줄어든다 (측정 방법은 8장 오픈 이슈)

## 2. 범위

1차 범위의 쓰기는 **다른 문서에 연쇄 처리가 없는 필드의 수정**으로 제한한다. 삭제, 금액 수정, 상태 변경은 clever-lab-api 서비스가 여러 문서를 함께 바꾸므로 어드민이 DB에 직접 쓰면 데이터가 어긋난다 (5장 "연쇄 처리" 참고).

| 구분 | 포함 | 제외 (사유) |
| --- | --- | --- |
| 인증 | 기존 운영자 계정(`clkManagers`) 로그인/로그아웃 | 계정 생성·관리, SSO, 2FA (기존 계정 사용) |
| Lab | 목록·검색·상세(Sub-lab 포함), 프로필 필드 수정 | 생성, 삭제, 상태 변경 (서비스에 탈퇴·해지 워크플로 없음, 삭제는 약 50개 컬렉션 연쇄) |
| 의뢰서 | 목록·검색·상세, 연결 명세서 표시, 메모성 필드 수정 | 생성, 삭제, 상태·금액 수정 (명세서·회계 연결, 입출고 알림 연쇄) |
| 거래 명세서 | 목록·검색·상세, 연결 의뢰서 표시, 메모 필드 수정 | 발행, 삭제·복구, 금액 수정 (의뢰서·회계·거래처 연쇄) |
| 회계 | 목록·검색·상세, 연결 명세서 표시, 명세서 합계 대조, 같은 기공소·거래처의 월별 회계 이력 | 삭제, 금액 수정, 정산·결제 (이후 모든 달 잔액에 영향) |
| 공통 | 원본 문서(JSON) 보기, 감사 로그 기록·조회, 상세 조회 접근 로그 | 통계 대시보드, 엑셀 다운로드 |

제외한 쓰기 작업은 2차에서 clever-lab-api에 관리자 API를 추가해 서비스 로직으로 처리하는 방안을 검토한다.

## 3. 사용자 및 권한

| 역할 | 대상 | 권한 |
| --- | --- | --- |
| 운영자 | `clkManagers`에 계정이 있는 서비스 운영 담당, VOC를 조사하는 개발자 | 전체 메뉴 조회, 원본 문서 보기, 허용 필드 수정, 감사 로그 조회 |

- 주 사용 시나리오는 VOC 조사다. 운영자가 VOC를 받으면 어드민에서 먼저 확인하고, 필요하면 개발자가 같은 화면으로 원인을 조사한다.
- 운영자는 모두 `clkManagers` 계정을 가지고 있다. 개발자가 쓸 계정은 8장 오픈 이슈에서 확인한다.
- `clkManagers`에는 역할 필드가 없으므로 1차는 역할을 하나로 둔다. 역할 구분이 필요하면 8장 오픈 이슈에서 정한다.
- 계정 생성·비밀번호 변경은 기존 방식대로 한다. 어드민은 계정을 만들지 않는다.

## 4. 기술 스택 및 아키텍처

- 모노레포: Nx (팀 표준) + pnpm workspace. `apps/api`, `apps/web`, `packages/contracts`
- 백엔드: NestJS + Mongoose + DDD (`domain` / `application` / `infrastructure` / `presentation`)
- 프론트엔드: React + FSD (`app` / `pages` / `widgets` / `features` / `entities` / `shared`)
- 운영 DB: clever-lab-api와 같은 MongoDB를 사용한다. 어드민 전용 데이터(감사 로그, 접근 로그)는 별도 DB에 둔다.
- 인증: JWT (6.1)
- 개발 환경: 로컬 MongoDB를 사용한다. 개발 중에는 운영 DB에 연결하지 않는다.
- 상세 구조와 규칙은 [design/backend.md](./design/backend.md), [design/frontend.md](./design/frontend.md)에 정리한다.
- 라이브러리 버전과 Phase별 기술 작업은 [plan.md](./plan.md)에 정리한다.

**REST API 규칙**

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/logout` | 로그인/로그아웃 (JWT 쿠키 발급·삭제) |
| GET | `/auth/me` | 로그인한 계정 정보 |
| GET | `/{resource}?page=&size=&...filters` | 목록 + 검색 |
| GET | `/{resource}/:id` | 상세 (연결 문서 포함) |
| GET | `/{resource}/:id/raw` | 원본 문서 JSON (마스킹 적용) |
| GET | `/invoices/:id/history` | 같은 기공소·거래처의 월별 회계 이력 |
| PATCH | `/{resource}/:id` | 허용 필드 수정 |
| GET | `/audit-logs?targetType=&targetId=&page=&size=` | 감사 로그 조회 |

`resource` = `labs`, `lab-orders`, `bills`, `invoices`. DELETE API는 1차에 두지 않는다.

## 5. 데이터 모델 및 관계

엔티티 정의 위치: `~/vatech/project/clever-lab-api/libs/entities/src`

| 메뉴 | 컬렉션 | 엔티티 파일 | 식별자 | 시간 필드 타입 |
| --- | --- | --- | --- | --- |
| Lab | `clkLabs` | `lab.entity.ts` | `id` (UUID), `labId` | unix 초 (number) |
| Sub-lab | `clkSubLabs` | `sub-lab.entity.ts` | `id`, `labUUID` | Date |
| 의뢰서 | `clkLabOrders` | `lab-order.entity.ts` | `id`, `requestId` | unix 초 (number, Asia/Seoul) |
| 거래 명세서 | `clkBills` | `bill.entity.ts` | `id` | Date |
| 회계 | `clkInvoices` | `invoice.entity.ts` | `id` | Date |
| 운영자 계정 | `clkManagers` | `manager.entity.ts` | `id`, `managerId` | unix 초 (number) |

> 요청서의 `clkLab`, `clkLabOrder`는 실제 컬렉션명이 `clkLabs`, `clkLabOrders`이다.

**관계**

```
Lab (clkLabs)
 │  id ── labUUID ──┬──> SubLab.labUUID / LabOrder.labUUID / Bill.labUUID / Invoice.labUUID
 │  labId ─ labId ──┘    (혼재: 아래 주의 참고)
 │
SubLab (clkSubLabs)      같은 기공소의 사업장. LabOrder / Bill / Invoice.subLabId로 참조
 │
LabOrder (clkLabOrders)
 │  teethDetails[].billId ──────> Bill.id
 │
Bill (clkBills)
 │  orderIds[] ─────────────────> LabOrder.id
 │  invoiceId ──────────────────> Invoice.id
 │
Invoice (clkInvoices)
    bills[] ────────────────────> Bill.id
```

**주의 사항 (코드에서 확인한 것)**

- Lab 참조 키가 섞여 있다. 기존 코드도 `$or: [{ labId: lab.labId }, { labUUID: lab.id }, { labId: lab.id }]`로 조회한다 (`apps/lab-api/src/labs/lab.service.ts:370`). 어드민의 "기공소별" 검색도 같은 조건을 쓴다. 이 조건은 Sub-lab 데이터를 이미 포함한다.
- 의뢰서와 명세서는 양방향 참조다. `LabOrder.teethDetails[].billId`(치아 단위)와 `Bill.orderIds`가 있다. `orderIds`는 일부 문서에 없으므로, 명세서 상세에서는 `teethDetails.billId`로 역조회하는 방식을 보조로 쓴다.
- `Bill.shared.orders`는 거래처 공유 시점의 스냅샷이다. 연결 의뢰서 표시는 스냅샷이 아니라 `clkLabOrders`의 실제 문서를 기준으로 한다.
- 명세서·회계의 `lab`, `partner`는 발행 시점의 스냅샷이다 (`apps/lab-api/src/invoices/invoice.service.ts:594-618`). Lab 프로필을 수정해도 기존 명세서·회계에는 반영되지 않는다.
- `Invoice.periodTime` 형식은 `MM/YYYY`이다. 월별 검색은 `periodTime` 또는 `periodTimeTimeStamp`를 사용한다.
- 서비스는 동시 수정 제어가 없다 (`optimisticConcurrency` 미설정, 마지막 쓰기가 이긴다).

**연쇄 처리 (어드민이 직접 쓰면 안 되는 이유)**

clever-lab-api 경로 기준.

| 작업 | 서비스가 함께 바꾸는 것 | 근거 |
| --- | --- | --- |
| Lab 삭제 | 약 50개 컬렉션의 해당 Lab 데이터 `deleteMany` (트랜잭션 없음) | `apps/lab-api/src/labs/lab.service.ts:361-385` |
| Lab 상태 변경 | 서비스에 변경 로직 없음. 탈퇴·해지 워크플로가 정의되지 않음 | `libs/common/src/constants/lab.const.ts:4-12` |
| 의뢰서 삭제 | 서비스에 삭제 기능 없음 (`isPartnerDeleted`, `canceled` 상태만 존재) | `apps/lab-api/src/lab-orders/services/lab-order.service.ts:1062-1071` |
| 의뢰서 상태 변경 | 입출고 알림 이벤트 생성 (스케줄러가 발송) | `apps/lab-api/src/lab-orders/services/lab-order.service.ts:489,1608,1740` |
| 명세서 삭제 | 의뢰서 `billId`·`billingStatus` 해제, 회계 합계 재계산, 거래처 누적 청구액 차감, 공유 명세서 상태·알림 | `apps/lab-api/src/bills/services/bill.service.ts:1031-1185`, `apps/lab-api/src/lab-orders/services/lab-order.service.ts:1749-1769`, `apps/lab-api/src/invoices/invoice.service.ts:801-866`, `apps/lab-api/src/partners/partner.service.ts:470-485` |
| 명세서 금액 변경 | 회계 합계 재계산, 거래처 누적 청구액 | `apps/lab-api/src/invoices/invoice.service.ts:965-1018` |
| 회계 금액 변경 | 이후 달 잔액은 이전 회계를 합산해 계산하므로 이후 모든 달의 잔액이 바뀜 | `apps/lab-api/src/invoices/invoice.service.ts:529-555` |
| 회계 삭제 | 서비스에 삭제 기능 없음 | - |

**상태 값**

| 엔티티 | 필드 | 값 |
| --- | --- | --- |
| Lab | `status` | 0 운영, 1 일시중지, 2 탈퇴, 3 1개월 후 탈퇴, 5 해지 처리중, 6 해지 완료 |
| LabOrder | `status` | waiting, in_production, shipped(arrival 포함), complete, received, tempOcr, holding, canceled |
| Bill | `status` | CONFIRMED, WAITING_APPROVAL, BEFORE_BILLING, CANCELATION, REISSUE, CLOSE_OF_PAID, RETURNED, NO_BILL, BILL_OF_INVOICE |
| Invoice | `status` | PRE_INVOICE, IN_PAYMENT, CLOSED |

## 6. 기능 요구사항

각 절 끝의 **수용 기준**은 ID(`AUTH-01` 등)로 참조한다. `docs/tasks/`의 작업과 테스트가 이 ID를 쓴다. `[NEEDS CLARIFICATION]`이 붙은 기준은 8장 오픈 이슈가 정해지기 전에는 구현하지 않는다.

### 6.1 로그인

- `clkManagers` 계정의 `managerId`/비밀번호로 로그인한다.
- 비밀번호 검증은 clever-lab-api와 같은 방식을 쓴다: pbkdf2-sha512, 1026회, 64바이트, 계정별 salt(`loginPasswordSalt`) (`apps/lab-api/src/auth/auth.service.ts:25-39`).
- 로그인 규칙은 기존 운영자 로그인(clkgraph `managerLogin`)과 같다. 잠긴 계정은 비밀번호와 관계없이 거부한다. 비밀번호가 틀리면 `failCnt`를 올리고 5회가 되면 `locked: true`로 잠근다. 성공하면 `failCnt`를 0으로 되돌린다.
- 아이디가 없을 때와 비밀번호가 틀렸을 때는 같은 메시지를 보여준다. 잠금 해제는 기존 방식(계정 관리자)으로 한다.
- 로그인 성공 시 JWT access token을 발급한다. 토큰은 httpOnly, Secure 쿠키로 전달해 브라우저 스크립트에서 읽을 수 없게 한다.
- 토큰 만료 시간은 8시간으로 시작하고, refresh token은 1차에 두지 않는다. 만료되면 다시 로그인한다. (만료 시간은 리뷰 필요)
- 로그아웃은 쿠키를 삭제한다.
- 로그인하지 않았거나 토큰이 만료되면 로그인 화면 외 모든 화면과 API에 접근할 수 없다. API는 401을 반환하고, 화면은 로그인 화면으로 이동한다.

**수용 기준**

| ID | 기준 |
| --- | --- |
| AUTH-01 | 올바른 `managerId`/비밀번호로 로그인하면 JWT를 httpOnly, Secure 쿠키로 발급하고 `failCnt`를 0으로 되돌린다. |
| AUTH-02 | 같은 비밀번호와 `loginPasswordSalt`로 계산한 해시가 clever-lab-api와 같다 (pbkdf2-sha512, 1026회, 64바이트). |
| AUTH-03 | 없는 아이디와 틀린 비밀번호는 같은 메시지로 거부한다. |
| AUTH-04 | 비밀번호가 틀리면 `failCnt`를 1 올리고, 5회가 되면 `locked: true`로 잠근다. |
| AUTH-05 | 잠긴 계정은 비밀번호가 맞아도 거부한다. |
| AUTH-06 | 토큰은 발급 8시간 뒤 만료된다. refresh token은 없다. (만료 시간 리뷰 필요) |
| AUTH-07 | 로그아웃하면 쿠키를 삭제하고, 이후 API 요청은 401이다. |
| AUTH-08 | 로그인하지 않았거나 토큰이 만료되면 로그인 외 모든 API가 401을 반환하고, 화면은 로그인 화면으로 이동한다. |

### 6.2 Lab (`clkLabs`)

기존 운영자 앱 `clkmanager`(labfe)의 "사용자 관리"와 일부 겹치지만, 백오피스의 기본 기능이므로 어드민에도 둔다.

**목록**

- 페이지네이션 (기본 20건, `createdAt` 내림차순)
- 컬럼: 기공소명(`labName`), 기공소 ID(`labId`), 사업자번호, 대표자명(`labManagerName`), 연락처(`labTel`), 상태(`status`), 등급(`grade`), 가입일(`createdAt`)

**검색**

- 기공소명, 기공소 ID, 사업자번호 (부분 일치)
- 상태 (선택)

**상세**

- 기본 정보, 주소, 사업자/계좌 정보, 영업일/시간 설정, 기능 사용 여부(`isWorkpartUse` 등), 이미지(사업자등록증, 통장사본, 직인)
- 소속 Sub-lab 목록 (`clkSubLabs.labUUID = lab.id`, 삭제된 Sub-lab 제외)
- 수정: 프로필 필드만. 후보: 연락처(`labTel`, `phoneNo`, `cellNo`, `fax`), `email`, 주소(`address`), 소개(`labIntroduction`). 확정은 8장 오픈 이슈.
- 수정 불가: `status`, 식별자(`id`, `labId`), 계좌·사업자 정보, 기능 설정 플래그

**수용 기준**

| ID | 기준 |
| --- | --- |
| LAB-01 | 목록은 기본 20건, `createdAt` 내림차순이고 6.2의 컬럼을 보여준다. |
| LAB-02 | 기공소명, 기공소 ID, 사업자번호로 부분 일치 검색한다. `[NEEDS CLARIFICATION]` Lab 검색 항목 확정 |
| LAB-03 | 상태를 선택해 목록을 거른다. |
| LAB-04 | 상세에 기본 정보, 주소, 사업자/계좌 정보, 영업일/시간, 기능 사용 여부, 이미지를 보여준다. |
| LAB-05 | 상세에 `clkSubLabs.labUUID = lab.id`인 Sub-lab을 보여주고, 삭제된 Sub-lab은 제외한다. |
| LAB-06 | 허용된 프로필 필드를 수정할 수 있다. `[NEEDS CLARIFICATION]` 수정 가능 필드 확정 |
| LAB-07 | `status`, 식별자(`id`, `labId`), 계좌·사업자 정보, 기능 설정 플래그는 수정 요청을 거부한다. |

### 6.3 의뢰서 (`clkLabOrders`)

**목록**

- 페이지네이션 (기본 20건, `orderDate` 내림차순)
- 컬럼: 의뢰서 ID, 기공소명, 치과명(`clinicName`), 의사명(`doctorName`), 환자명, 유형(`type`), 상태(`status`), 의뢰일(`orderDate`), 납품일(`dueDate`), 금액(`totalPrice`)

**검색**

- 의뢰서 ID(`id`) 정확 일치: 다른 조건 없이 바로 찾는다 (unique 인덱스)
- `requestId` 정확 일치: 인덱스가 없으므로 기공소를 함께 선택해야 한다
- 기공소별: 기공소명으로 찾아서 선택 → Lab 참조 키 조건으로 조회
- 의뢰일 기간 (`orderDate` from~to)
- 납품일 기간 (`dueDate` from~to)
- 검색 조건이 기존 인덱스(`labId + orderDate`, `labId + dueDate`)를 타도록 쿼리를 만든다.

**상세**

- 각 항목: 기본 정보, 환자 정보, 치과 정보, 치아별 상세(`teethDetails`: 보철물, 쉐이드, 재료, 옵션, 어버트먼트, 픽스처, 담당자), 메모(`notes`), 금액
- 연결된 거래 명세서 패널: `teethDetails[].billId` 기준으로 `clkBills`를 조회해 목록으로 보여준다 (명세서 ID, 기간, 상태, 청구 금액, 상세 링크).
- 수정: 연결·알림에 영향이 없는 필드만. 후보: 메모(`notes`), 납품일(`dueDate`, `dueDateWithTime`). 확정은 8장 오픈 이슈.
- 수정 불가: `status`(입출고 알림 연쇄), 금액·치아별 상세(명세서 금액 연쇄), `billId`

**수용 기준**

| ID | 기준 |
| --- | --- |
| ORD-01 | 목록은 기본 20건, `orderDate` 내림차순이고 6.3의 컬럼을 보여준다. |
| ORD-02 | 의뢰서 ID(`id`) 정확 일치는 다른 조건 없이 검색된다. |
| ORD-03 | `requestId` 정확 일치 검색은 기공소를 선택해야만 실행된다. |
| ORD-04 | 기공소별 검색은 Lab 참조 키 조건(`labId`, `labUUID` 혼재)으로 조회하며 Sub-lab 데이터를 포함한다. |
| ORD-05 | 의뢰일(`orderDate`)과 납품일(`dueDate`) 기간으로 검색한다. |
| ORD-06 | 목록 검색 쿼리는 기존 인덱스(`labId + orderDate`, `labId + dueDate`)를 타고 COLLSCAN이 없다. |
| ORD-07 | 상세에 기본 정보, 환자 정보, 치과 정보, 치아별 상세, 메모, 금액을 보여준다. |
| ORD-08 | 상세에 `teethDetails[].billId` 기준으로 연결된 거래 명세서(ID, 기간, 상태, 청구 금액, 상세 링크)를 보여준다. |
| ORD-09 | 메모성 필드를 수정할 수 있다. `[NEEDS CLARIFICATION]` 수정 가능 필드 확정 |
| ORD-10 | `status`, 금액·치아별 상세, `billId`는 수정 요청을 거부한다. |

### 6.4 거래 명세서 (`clkBills`)

**목록**

- 페이지네이션 (기본 20건, `createdAt` 내림차순)
- 기본으로 `isDeleted: true`는 제외한다. "삭제 포함" 토글로 볼 수 있다.
- 컬럼: 명세서 ID, 기공소명(`labName`), 거래처명(`partner.name`), 기간(`periodTime`, `from`~`to`), 상태(`status`), 청구 금액(`charged`), 미수금(`unPaid`), 회계 ID(`invoiceId`), 생성일

**검색**

- 명세서 ID(`id`) 정확 일치
- 기공소별 (6.3과 같은 방식)

**상세**

- 기본 정보, 기공소/거래처 스냅샷(`lab`, `partner`), 금액 내역(청구, 할인, 추가 청구, 이월 잔금, 선수금), 조정 내역(`adjustmentDetails`), 공유 상태(`shared`), 변경 이력(`updateHistory`)
- 연결된 의뢰서 패널: `orderIds`로 `clkLabOrders`를 조회한다. `orderIds`가 비어 있으면 `teethDetails.billId = bill.id`로 역조회한다.
- 연결된 회계 링크: `invoiceId`
- 수정: 메모 필드만. 후보: `memo`, `privateNote`. 확정은 8장 오픈 이슈.
- 수정 불가: 금액, 상태, `orderIds`, `invoiceId`, `isDeleted`

**수용 기준**

| ID | 기준 |
| --- | --- |
| BILL-01 | 목록은 기본 20건, `createdAt` 내림차순이고 `isDeleted: true`는 기본으로 제외한다. |
| BILL-02 | "삭제 포함"을 켜면 삭제된 명세서도 보여준다. |
| BILL-03 | 명세서 ID 정확 일치와 기공소별로 검색한다. `[NEEDS CLARIFICATION]` 기간/상태 검색 필요 여부 |
| BILL-04 | 상세에 기본 정보, 기공소/거래처 스냅샷, 금액 내역, 조정 내역, 공유 상태, 변경 이력을 보여준다. |
| BILL-05 | 연결 의뢰서는 `orderIds`로 조회하고, 비어 있으면 `teethDetails.billId = bill.id`로 역조회한다. 표시는 `shared.orders` 스냅샷이 아니라 `clkLabOrders` 문서 기준이다. |
| BILL-06 | 상세에서 `invoiceId`로 연결된 회계로 이동한다. |
| BILL-07 | 메모 필드를 수정할 수 있다. `[NEEDS CLARIFICATION]` 수정 가능 필드 확정 |
| BILL-08 | 금액, 상태, `orderIds`, `invoiceId`, `isDeleted`는 수정 요청을 거부한다. |

### 6.5 회계 (`clkInvoices`)

**목록**

- 페이지네이션 (기본 20건, `periodTimeTimeStamp` 내림차순)
- 컬럼: 회계 ID, 기공소명(`lab.labName`), 거래처명(`partner.name`), 기간(`periodTime`), 상태(`status`), 청구(`charged`), 입금(`paid`), 미수(`unPaid`), 명세서 수(`bills.length`)

**검색**

- 회계 ID(`id`) 정확 일치
- 기공소별 (6.3과 같은 방식)
- 월별: `MM/YYYY` 월 선택 → `periodTime` 일치 조회 (`labId + periodTime` 인덱스 사용)

**상세**

- 기본 정보, 기공소/거래처 스냅샷, 금액 요약, 입금 이력(`paidHistory`), 마감 정보(`closedBy`)
- 연결된 거래 명세서 패널: `bills[]`로 `clkBills`를 조회해 목록으로 보여준다 (명세서 ID, 기간, 상태, 청구 금액, 상세 링크).
- 명세서 합계 대조: 연결된 명세서(`isDeleted` 제외)의 금액 합계와 회계 금액(`charged`, `incurred`)을 나란히 보여주고, 차이가 있으면 강조한다. "회계 금액 불일치" VOC 조사의 첫 단계다.
- 월별 회계 이력: 같은 기공소·거래처(`labId`, `partnerId`)의 회계를 월별로 나열한다 (`periodTime`, `incurred`, `paid`, `unPaid`, `lastUnPaid`, `initialUnpaid`). 이후 달 잔액은 이전 회계를 합산해 계산하므로(5장 "연쇄 처리"), 어느 달에서 금액이 어긋났는지 찾는 데 쓴다.
- 1차는 조회 전용이다. 회계에는 금액·연결 외에 수정할 메모성 필드가 없다.

**수용 기준**

| ID | 기준 |
| --- | --- |
| INV-01 | 목록은 기본 20건, `periodTimeTimeStamp` 내림차순이고 6.5의 컬럼을 보여준다. |
| INV-02 | 회계 ID 정확 일치, 기공소별, 월별(`MM/YYYY` → `periodTime` 일치)로 검색한다. |
| INV-03 | 상세에 기본 정보, 기공소/거래처 스냅샷, 금액 요약, 입금 이력, 마감 정보를 보여준다. |
| INV-04 | 상세에 `bills[]`로 연결된 거래 명세서를 보여준다. |
| INV-05 | 연결 명세서(`isDeleted` 제외)의 금액 합계와 회계 `charged`, `incurred`를 나란히 보여주고, 다르면 강조한다. |
| INV-06 | 같은 `labId`, `partnerId`의 회계를 월별로 나열한다 (`periodTime`, `incurred`, `paid`, `unPaid`, `lastUnPaid`, `initialUnpaid`). |
| INV-07 | 회계는 수정 API와 수정 화면이 없다. |

### 6.6 감사 로그

- 메뉴: 감사 로그 목록 (페이지네이션, 최신순)
- 검색: 대상 종류(Lab, 의뢰서, 명세서, 회계), 대상 ID, 작업자, 기간
- 각 문서 상세 화면에 해당 문서의 수정 이력을 보여준다.

**수용 기준**

| ID | 기준 |
| --- | --- |
| AUDIT-01 | 감사 로그 목록은 최신순으로 페이지네이션한다. |
| AUDIT-02 | 대상 종류, 대상 ID, 작업자, 기간으로 검색한다. |
| AUDIT-03 | Lab, 의뢰서, 명세서 상세에 해당 문서의 수정 이력을 보여준다. |

### 6.7 공통

- 원본 문서 보기: 모든 상세 화면에서 MongoDB 문서 원본을 JSON으로 볼 수 있다. 화면에 정리하지 않은 필드까지 확인하기 위함이다. 읽기 전용이며, 개인정보 마스킹 규칙은 상세 화면과 같다.

- 목록 → 상세 → 연결 문서 상세로 이동할 수 있다 (의뢰서 ↔ 명세서 ↔ 회계).
- 상세 화면 URL로 바로 접근할 수 있다 (`/lab-orders/:id` 등).
- 수정 전에 확인 모달을 띄우고, 변경 전/후 값을 보여준다.
- 날짜는 Asia/Seoul 기준으로 표시하고 검색한다. 엔티티마다 저장 타입(unix 초, Date)이 다르므로 API 계층에서 변환한다.

**수용 기준**

| ID | 기준 |
| --- | --- |
| COM-01 | 모든 상세에서 원본 문서 JSON을 읽기 전용으로 볼 수 있고, 마스킹은 상세 화면과 같다. |
| COM-02 | 목록 → 상세 → 연결 문서 상세(의뢰서 ↔ 명세서 ↔ 회계)로 이동할 수 있다. |
| COM-03 | 상세 화면 URL로 바로 접근할 수 있다. |
| COM-04 | 수정 전에 변경 전/후 값을 보여주는 확인 모달을 띄운다. |
| COM-05 | 날짜는 Asia/Seoul 기준으로 표시하고 검색한다. |

## 7. 비기능 요구사항

**보안**

- 어드민은 사내망 또는 VPN에서만 접근한다 (IP 허용 목록).
- 운영 DB 계정은 어드민 전용 계정으로 분리한다. 권한 범위:
  - 읽기/쓰기: `clkLabs`, `clkLabOrders`, `clkBills` (허용 필드 수정용), `clkManagers` (`failCnt`, `locked` 갱신용)
  - 읽기: `clkInvoices`, `clkSubLabs`
- 목록 API는 페이지 크기 상한(100건)을 둔다.
- 개인정보(환자명, 연락처, 계좌번호)는 목록에서 마스킹하고, 상세에서만 전체를 표시한다. (마스킹 범위는 리뷰 필요)

**감사 로그·접근 로그**

- 모든 수정은 감사 로그로 남긴다: 작업자, 시각, 대상 컬렉션/ID, 변경 전/후 값
- 상세 조회는 접근 로그로 남긴다: 작업자, 시각, 대상 컬렉션/ID. 환자 정보 등 민감정보 열람 기록을 위함이다.
- 두 로그는 어드민 전용 DB에 저장하고, 어드민 화면에서 수정·삭제할 수 없다.
- 보존 기간은 2년 이상으로 한다. 환자 정보는 민감정보에 해당할 수 있고, 「개인정보의 안전성 확보조치 기준」은 민감정보 처리 시스템의 접속기록을 2년 이상 보관하도록 한다. (법무·보안 담당 확인 필요)

**데이터 정합성**

- 금액, 상태, 연결 필드(`billId`, `orderIds`, `invoiceId`, `bills`)는 수정할 수 없다. 5장 "연쇄 처리" 참고.
- 수정은 바뀐 필드만 `$set`으로 쓴다. 문서 전체를 저장하지 않는다.
- 수정 시 `updatedAt`을 비교하는 낙관적 잠금을 적용한다. Lab·의뢰서의 `updatedAt`은 초 단위라 같은 초 안의 동시 수정은 잡지 못한다. 1차는 이 한계를 받아들인다.

**지원 환경**

- 데스크톱 Chrome 최신 버전, 화면 너비 1280px 이상
- 모바일·태블릿은 지원하지 않는다.

**성능**

- 목록 조회는 기존 인덱스 범위 안에서만 검색 조건을 허용한다. 인덱스가 없는 조건(예: 환자명 부분 검색)은 1차 범위에서 제외한다.
- 목록 응답 1초 이내 (페이지 20건 기준)

**수용 기준**

| ID | 기준 |
| --- | --- |
| SEC-01 | 사내망 또는 VPN의 허용된 IP에서만 접근할 수 있다. `[NEEDS CLARIFICATION]` 배포 환경 |
| SEC-02 | 운영 DB는 어드민 전용 계정으로 접근하고, 권한은 위 범위를 넘지 않는다. |
| SEC-03 | 목록 API의 페이지 크기는 100건을 넘을 수 없다. |
| SEC-04 | 환자명, 연락처, 계좌번호는 목록에서 마스킹하고 상세에서만 전체를 보여준다. `[NEEDS CLARIFICATION]` 마스킹 범위 |
| LOG-01 | 모든 수정은 작업자, 시각, 대상 컬렉션/ID, 변경 전/후 값을 감사 로그로 남긴다. |
| LOG-02 | 상세 조회는 작업자, 시각, 대상 컬렉션/ID를 접근 로그로 남긴다. |
| LOG-03 | 두 로그는 어드민 DB에 저장하고, 어드민 화면에서 수정·삭제할 수 없다. |
| LOG-04 | 두 로그는 2년 이상 보존한다. `[NEEDS CLARIFICATION]` 법무·보안 확인 |
| DATA-01 | 금액, 상태, 연결 필드(`billId`, `orderIds`, `invoiceId`, `bills`)는 어떤 API로도 수정되지 않는다. |
| DATA-02 | 수정은 바뀐 필드만 `$set`으로 쓰고 문서 전체를 저장하지 않는다. |
| DATA-03 | 수정 시 `updatedAt`이 조회 때와 다르면 저장하지 않고 충돌을 알린다. |
| PERF-01 | 인덱스가 없는 검색 조건은 제공하지 않는다. |
| PERF-02 | 목록 응답(20건)은 1초 이내다. |
| ENV-01 | 데스크톱 Chrome 최신 버전, 화면 너비 1280px 이상에서 동작한다. |

## 8. 오픈 이슈 / 확인 필요 사항

- [ ] 엔티티 공유 방식: `clever-lab-api/libs/entities`를 패키지로 참조할지, 어드민으로 복사할지. 복사하면 스키마 변경을 따라가지 못할 위험이 있다.
- [ ] 엔티티별 수정 가능 필드 확정 (6.2~6.4의 후보 검토) → 영향: LAB-06, ORD-09, BILL-07
- [ ] 역할 구분 필요 여부: 필요하면 `clkManagers`에 역할 필드를 추가할지, 어드민 DB에 별도로 둘지
- [ ] 성공 기준 측정 방법: VOC 조사 시 운영 DB 접속을 어떻게 집계할지 (MongoDB 감사 로그, 접속 승인 기록 등)
- [ ] Lab 검색 항목 확정 (요청서에 "검색"만 있음) → 영향: LAB-02
- [ ] 거래 명세서에 기간/상태 검색이 필요한지 (요청서에는 기공소별만 있음) → 영향: BILL-03
- [ ] 개인정보 마스킹 범위 → 영향: SEC-04, COM-01
- [ ] 감사·접근 로그 보존 기간 2년이 맞는지 법무·보안 확인 → 영향: LOG-04
- [ ] 배포 환경 (사내망, VPN, 도메인) → 영향: SEC-01
- [ ] 개발자가 VOC 조사에 쓸 계정: 개발자도 `clkManagers` 계정을 받는지
- [ ] 로컬 개발용 데이터 준비 방법: 시드 데이터를 만들지, QA DB 덤프를 쓸지 (개인정보 포함 여부 주의)
- [ ] 2차: 삭제·금액 수정·상태 변경을 clever-lab-api 관리자 API로 처리하는 방안 (서비스 연쇄 처리 재사용)

## 9. 마일스톤

도메인 하나씩 끝까지 만든다. 1차 목표는 로그인 후 Lab 목록 출력(M1~M3)이다. Phase별 계획, 단계별 완료 기준, 오픈 이슈별 필요 시점은 [plan.md](./plan.md)에 정리한다.
