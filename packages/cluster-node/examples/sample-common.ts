import * as Entity from "@effect/cluster/Entity"
import type * as Envelope from "@effect/cluster/Envelope"
import type * as ShardingException from "@effect/cluster/ShardingException"
import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import type * as Effect from "effect/Effect"
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

export interface Messenger<Msg extends Envelope.Envelope.AnyMessage> {
  send(
    entityId: string
  ): <A extends Msg>(
    message: A
  ) => Effect.Effect<
    Serializable.WithResult.Success<A>,
    ShardingException.ShardingException | Serializable.WithResult.Error<A>
  >
}

declare function foo<Msg extends Envelope.Envelope.AnyMessage>(
  entity: Entity.Standard<Msg>
): "standard"
declare function foo<Msg extends Envelope.Envelope.AnyMessage>(
  entity: Entity.Clustered<Msg>
): "clustered"

declare const CounterTopic: Entity.Clustered<CounterMsg>

const _ = [foo(CounterEntity), foo(CounterTopic)] as const
