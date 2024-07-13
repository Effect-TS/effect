import * as Entity from "@effect/cluster/Entity"
import * as Schema from "@effect/schema/Schema"
import * as PrimaryKey from "effect/PrimaryKey"

export class GetCurrent extends Schema.TaggedRequest<GetCurrent>()(
  "GetCurrent",
  Schema.Never,
  Schema.Number,
  { messageId: Schema.String }
) {
  [PrimaryKey.symbol]() {
    return this.messageId
  }
}

export class Increment extends Schema.TaggedRequest<Increment>()(
  "Increment",
  Schema.Never,
  Schema.Void,
  { messageId: Schema.String }
) {
  [PrimaryKey.symbol]() {
    return this.messageId
  }
}

export class Decrement extends Schema.TaggedRequest<Decrement>()(
  "Decrement",
  Schema.Never,
  Schema.Void,
  { messageId: Schema.String }
) {
  [PrimaryKey.symbol]() {
    return this.messageId
  }
}

export const CounterMsg = Schema.Union(
  Increment,
  Decrement,
  GetCurrent
)

export type CounterMsg = Schema.Schema.Type<typeof CounterMsg>

export const CounterEntity = new Entity.Standard({
  name: "Counter",
  schema: CounterMsg
})
