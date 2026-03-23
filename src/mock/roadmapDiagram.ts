// src/mock/roadmapDiagram.ts
import type { RawFlowchartRow } from '../types/roadmap';

// Mock flow modeled loosely after the reference screenshot:
// - Multiple lanes (Customer, Sales Person, Back Office, Logistics)
// - A start, several process steps, one decision with Y/N branches, and terminating steps.
// Structure (column names) is preserved so it matches the flat Excel/CSV shape.
export const mockRawData: RawFlowchartRow[] = [
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S1",
    "L5 Text": "Customer Initiates Inquiry",
    "Level": 1,
    "Role": "Customer",
    "internal ID": "NODE_1",
    "Type Text": "Start",
    "To. Relationship (Y)": "NODE_2",
    "Description": "Customer contacts sales with a product or pricing inquiry.",
    "Create Person": "Abhinav",
    "Create Date": "2026-03-20"
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S2",
    "L5 Text": "Capture Requirements",
    "Level": 2,
    "Role": "Sales Person",
    "internal ID": "NODE_2",
    "Type Text": "Process",
    "To. Relationship (Y)": "NODE_3",
    "Description": "Sales person clarifies scope, quantity, and requested delivery date.",
    "Output": "Documented Customer Requirements"
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S3",
    "L5 Text": "Create Quotation",
    "Level": 2,
    "Role": "Sales Person",
    "internal ID": "NODE_3",
    "Type Text": "Process",
    "To. Relationship (Y)": "NODE_4",
    "T-code": "VA21",
    "Description": "Prepare the commercial offer in the system.",
    "Output": "Quotation"
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S4",
    "L5 Text": "Customer Reviews Offer",
    "Level": 3,
    "Role": "Customer",
    "internal ID": "NODE_4",
    "Type Text": "Decision",
    "To. Relationship (Y)": "NODE_5",
    "To. Relationship (Y) Text": "Accept",
    "To. Relationship (N)": "NODE_6",
    "To. Relationship (N) Text": "Reject / Revise",
    "Description": "Customer reviews pricing and terms and decides whether to proceed."
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S5",
    "L5 Text": "Revise Quotation",
    "Level": 4,
    "Role": "Sales Person",
    "internal ID": "NODE_6",
    "Type Text": "Process",
    "To. Relationship (Y)": "NODE_3",
    "Description": "Revise the quotation based on customer feedback and resend.",
    "Output": "Updated Quotation"
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S6",
    "L5 Text": "Create Sales Order",
    "Level": 4,
    "Role": "Back Office",
    "internal ID": "NODE_5",
    "Type Text": "Process",
    "To. Relationship (Y)": "NODE_7",
    "T-code": "VA01",
    "Description": "Convert the accepted quotation into a sales order in the system.",
    "Output": "Sales Order"
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S7",
    "L5 Text": "Check Availability (ATP)",
    "Level": 5,
    "Role": "Back Office",
    "internal ID": "NODE_7",
    "Type Text": "Decision",
    "To. Relationship (Y)": "NODE_8",
    "To. Relationship (Y) Text": "Available",
    "To. Relationship (N)": "NODE_9, NODE_11",
    "To. Relationship (N) Text": "Not Available, Escalate",
    "T-code": "CO09",
    "Description": "Run availability check for requested materials and delivery date."
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S8",
    "L5 Text": "Confirm Delivery Date",
    "Level": 6,
    "Role": "Back Office",
    "internal ID": "NODE_8",
    "Type Text": "Process",
    "To. Relationship (Y)": "NODE_10",
    "Description": "Confirm order quantities and delivery dates to the customer.",
    "Output": "Confirmed Sales Order"
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S9",
    "L5 Text": "Reschedule / Allocation Review",
    "Level": 6,
    "Role": "Logistics",
    "internal ID": "NODE_9",
    "Type Text": "Process",
    "To. Relationship (Y)": "NODE_7",
    "Description": "Review stock allocation or propose alternative delivery dates.",
    "Output": "Revised Availability"
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S10",
    "L5 Text": "Complete Order & Archive",
    "Level": 7,
    "Role": "Back Office",
    "internal ID": "NODE_10",
    "Type Text": "Terminator",
    "Description": "Order is released to downstream execution and archived for tracking."
  },
  {
    "L1 Text": "Sales",
    "L2 Text": "Order Management",
    "Serial ID": "S11",
    "L5 Text": "Escalate to Manager",
    "Level": 5,
    "Role": "Back Office",
    "internal ID": "NODE_11",
    "Type Text": "Process",
    "To. Relationship (Y)": "NODE_7",
    "Description": "Escalate the availability issue to management for resolution.",
    "Output": "Escalation Ticket"
  }
];