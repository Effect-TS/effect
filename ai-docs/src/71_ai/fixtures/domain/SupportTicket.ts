import { Schema } from "effect"

export const TicketId = Schema.String.pipe(Schema.brand("TicketId"))
export type TicketId = typeof TicketId.Type

// The ticket as it arrives from the help desk. `DecisionModel` sends the
// JSON-encoded form of this schema to the provider, so only include fields
// that help the model decide.
export class SupportTicket extends Schema.Class<SupportTicket>("SupportTicket")({
  id: TicketId,
  subject: Schema.String,
  body: Schema.String,
  plan: Schema.Literals(["free", "team", "enterprise"])
}) {}

// Screenshots attached to the ticket, stored as raw bytes.
export interface Screenshot {
  readonly mediaType: "image/png" | "image/jpeg" | "image/webp"
  readonly bytes: Uint8Array
}

export const Queue = Schema.Literals(["billing", "technical", "account", "manual-review"])
export type Queue = typeof Queue.Type

export const Priority = Schema.Literals(["low", "normal", "high", "page-on-call"])
export type Priority = typeof Priority.Type

// The routing decision the rest of the help desk consumes.
export class TicketRouting extends Schema.Class<TicketRouting>("TicketRouting")({
  ticketId: TicketId,
  queue: Queue,
  priority: Priority,
  offerRefund: Schema.Boolean,
  flagChurnRisk: Schema.Boolean
}) {}
