import * as Message from "@effect/cluster/Message"
import * as RecipientType from "@effect/cluster/RecipientType"
import * as Schema from "effect/Schema"

export class GetCurrent extends Message.TaggedMessage<GetCurrent>()("GetCurrent", Schema.Never, Schema.Number, {
  messageId: Schema.String
}, (_) => _.messageId) {
}

export class Increment extends Message.TaggedMessage<Increment>()("Increment", Schema.Never, Schema.Void, {
  messageId: Schema.String
}, (_) => _.messageId) {
}

export class Decrement extends Message.TaggedMessage<Decrement>()("Decrement", Schema.Never, Schema.Void, {
  messageId: Schema.String
}, (_) => _.messageId) {
}

export const CounterMsg = Schema.Union(
  Increment,
  Decrement,
  GetCurrent
)

export type CounterMsg = Schema.Schema.Type<typeof CounterMsg>

export const CounterEntity = RecipientType.makeEntityType("Counter", CounterMsg)
