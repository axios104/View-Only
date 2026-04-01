// src/mock/nodeDetails.ts
import type { NodeDetails } from '../types/roadmap';

export const mockNodeDetails: Record<string, NodeDetails> = {
  "5.4.5.14": {
    NodeID: "5.4.5.14",
    Type: "L4 Header",
    Description: "출하의뢰/판매반입 프로세스의 시작점. 출하 요청 및 판매 반입 관련 전체 흐름을 관리합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "",
    Manual: "",
    Output: "",
    CreatePerson: "Admin",
    ChangePerson: "Admin"
  },
  "5.4.5.14.02": {
    NodeID: "5.4.5.14.02",
    Type: "SAP (E)",
    Description: "판매반입 우선순위를 시스템에 등록합니다. 반입 순서와 처리 우선도를 설정합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "VA01",
    Manual: "",
    Output: "우선순위 등록 완료",
    CreatePerson: "판매관리",
    ChangePerson: "판매관리"
  },
  "5.4.5.14.03": {
    NodeID: "5.4.5.14.03",
    Type: "SAP (E)",
    Description: "수출 Delivery Order 거래선 정보를 시스템에 등록합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "VL01N",
    Manual: "",
    Output: "거래선 등록 완료",
    CreatePerson: "판매관리",
    ChangePerson: "판매관리"
  },
  "5.4.5.14.01": {
    NodeID: "5.4.5.14.01",
    Type: "SAP (E)",
    Description: "판매반입 Pegging을 실행하여 재고를 매칭합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "CO09",
    Manual: "",
    Output: "Pegging 실행 결과",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  },
  "5.4.5.10.04": {
    NodeID: "5.4.5.10.04",
    Type: "SAP (E) - Decision",
    Description: "Pegging 결과를 확인합니다. 결과에 따라 자동출하의뢰(Y) 또는 재고Swapping요청(N) 으로 분기합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "CO09",
    Manual: "",
    Output: "Pegging 확인 결과 (Y/N)",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  },
  "5.4.5.10.03": {
    NodeID: "5.4.5.10.03",
    Type: "SAP (E)",
    Description: "Pegging이 정상인 경우 자동으로 출하의뢰를 생성합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "VL01N",
    Manual: "",
    Output: "자동 출하의뢰 생성",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  },
  "5.4.5.11.07": {
    NodeID: "5.4.5.11.07",
    Type: "Manual (M)",
    Description: "Pegging 실패 시 재고 Swapping을 요청합니다. 수동 작업이 필요합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "",
    Manual: "https://example.com/manual/swapping-request",
    Output: "Swapping 요청서",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  },
  "5.4.5.11.09": {
    NodeID: "5.4.5.11.09",
    Type: "SAP (E)",
    Description: "요청된 재고 Swapping을 시스템에서 실행합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "MM02",
    Manual: "",
    Output: "Swapping 실행 완료",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  },
  "5.4.5.13.09": {
    NodeID: "5.4.5.13.09",
    Type: "SAP (E)",
    Description: "출하의뢰를 시스템에 생성합니다. 자동출하 및 Swapping 결과 모두 이 단계로 합류합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "VL01N",
    Manual: "",
    Output: "출하의뢰 문서",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  },
  "5.4.5.13.13": {
    NodeID: "5.4.5.13.13",
    Type: "SAP (E)",
    Description: "출하 물품의 포장 처리를 수행합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "HUMO",
    Manual: "",
    Output: "포장 완료",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  },
  "5.4.5.13.16": {
    NodeID: "5.4.5.13.16",
    Type: "SAP (E)",
    Description: "출하 확인 처리를 완료하여 프로세스를 마감합니다.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-25",
    TCode: "VL02N",
    Manual: "",
    Output: "출하 확인 완료",
    CreatePerson: "영업담당",
    ChangePerson: "영업담당"
  }
};
