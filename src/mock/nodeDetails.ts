// src/mock/nodeDetails.ts
import type { NodeDetails } from '../types/roadmap';

export const mockNodeDetails: Record<string, NodeDetails> = {
  NODE_1: {
    NodeID: "NODE_1",
    Type: "Start",
    Description: "Customer contacts sales with a product or pricing inquiry.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-20",
    TCode: "",
    Manual: "https://example.com/manual/node_1",
    Output: "Inquiry Request",
    CreatePerson: "Abhinav",
    ChangePerson: "Abhinav"
  },
  NODE_2: {
    NodeID: "NODE_2",
    Type: "Process",
    Description: "Sales person clarifies scope, quantity, and requested delivery date.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "VA01",
    Manual: "https://example.com/manual/node_2",
    Output: "Documented Customer Requirements",
    CreatePerson: "Abhinav",
    ChangePerson: "Sales Manager"
  },
  NODE_3: {
    NodeID: "NODE_3",
    Type: "Process",
    Description: "Prepare the commercial offer in the system.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "VA21",
    Manual: "https://example.com/manual/node_3",
    Output: "Quotation",
    CreatePerson: "Abhinav",
    ChangePerson: "Sales Manager"
  },
  NODE_4: {
    NodeID: "NODE_4",
    Type: "Decision",
    Description: "Customer reviews pricing and terms and decides whether to proceed.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "",
    Manual: "https://example.com/manual/node_4",
    Output: "Customer Decision",
    CreatePerson: "Abhinav",
    ChangePerson: "Abhinav"
  },
  NODE_5: {
    NodeID: "NODE_5",
    Type: "Process",
    Description: "Convert the accepted quotation into a sales order in the system.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "VA01",
    Manual: "https://example.com/manual/node_5",
    Output: "Sales Order",
    CreatePerson: "Abhinav",
    ChangePerson: "Back Office Manager"
  },
  NODE_6: {
    NodeID: "NODE_6",
    Type: "Process",
    Description: "Revise the quotation based on customer feedback and resend.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "VA21",
    Manual: "https://example.com/manual/node_6",
    Output: "Updated Quotation",
    CreatePerson: "Abhinav",
    ChangePerson: "Sales Manager"
  },
  NODE_7: {
    NodeID: "NODE_7",
    Type: "Decision",
    Description: "Run availability check for requested materials and delivery date.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "CO09",
    Manual: "https://example.com/manual/node_7",
    Output: "Availability Status",
    CreatePerson: "Abhinav",
    ChangePerson: "Back Office Manager"
  },
  NODE_8: {
    NodeID: "NODE_8",
    Type: "Process",
    Description: "Confirm order quantities and delivery dates to the customer.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "VA02",
    Manual: "https://example.com/manual/node_8",
    Output: "Confirmed Sales Order",
    CreatePerson: "Abhinav",
    ChangePerson: "Back Office Manager"
  },
  NODE_9: {
    NodeID: "NODE_9",
    Type: "Process",
    Description: "Review stock allocation or propose alternative delivery dates.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "MM03",
    Manual: "https://example.com/manual/node_9",
    Output: "Revised Availability",
    CreatePerson: "Abhinav",
    ChangePerson: "Logistics Manager"
  },
  NODE_10: {
    NodeID: "NODE_10",
    Type: "Terminator",
    Description: "Order is released to downstream execution and archived for tracking.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "VA02",
    Manual: "https://example.com/manual/node_10",
    Output: "Archived Order",
    CreatePerson: "Abhinav",
    ChangePerson: "Back Office"
  },
  NODE_11: {
    NodeID: "NODE_11",
    Type: "Process",
    Description: "Escalate the availability issue to management for resolution.",
    CreateDate: "2026-03-20",
    ChangeDate: "2026-03-21",
    TCode: "",
    Manual: "https://example.com/manual/node_11",
    Output: "Escalation Ticket",
    CreatePerson: "Abhinav",
    ChangePerson: "Back Office Manager"
  }
};
