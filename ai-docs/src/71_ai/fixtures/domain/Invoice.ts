import { Schema } from "effect"

// A vendor document waiting to be read: the OCR text, the date it was
// received, and optional page scans.
export interface InboundInvoice {
  readonly text: string
  readonly receivedOn: string // ISO date, e.g. "2026-10-20"
  readonly pages?: ReadonlyArray<{
    readonly mediaType: "image/png" | "image/jpeg"
    readonly bytes: Uint8Array
  }>
}

// The accounts-payable record the rest of the system works with.
export class PayableInvoice extends Schema.Class<PayableInvoice>("PayableInvoice")({
  invoiceNumber: Schema.String,
  vendor: Schema.String,
  total: Schema.Finite,
  // Calendar dates stay ISO strings (`YYYY-MM-DD`). They have no time zone, so
  // they are not `DateTime` instants.
  issueDate: Schema.String,
  dueDate: Schema.optional(Schema.String),
  poNumber: Schema.optional(Schema.String),
  paymentTerms: Schema.optional(Schema.Duration),
  earlyPaymentDeadline: Schema.optional(Schema.DateTimeZoned),
  lineItems: Schema.Array(Schema.String)
}) {}

// Cash-flow planning numbers derived from an estimate, in days after issue.
export interface PaymentForecast {
  readonly likelyDays: number
  readonly optimisticDays: number
  readonly pessimisticDays: number
}

export interface InvoiceIntakeResult {
  readonly invoice: PayableInvoice
  readonly forecast: PaymentForecast
  // Empty when the invoice can be booked without a human looking at it.
  readonly reviewReasons: ReadonlyArray<string>
}
