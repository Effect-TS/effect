import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Schema from "effect/Schema"
import type * as MessageState from "../MessageState.js"

/** @internal */
const MessageStateSymbolKey = "@effect/cluster/MessageState"

/** @internal */
export const MessageStateTypeId: MessageState.MessageStateTypeId = Symbol.for(
  MessageStateSymbolKey
) as MessageState.MessageStateTypeId

/** @internal */
export function isMessageState(value: unknown): value is MessageState.MessageState<unknown> {
  return typeof value === "object" && value !== null && MessageStateTypeId in value
}

/** @internal */
export const Acknowledged: MessageState.MessageStateAcknowledged = {
  [MessageStateTypeId]: MessageStateTypeId,
  _tag: "@effect/cluster/MessageState/Acknowledged"
}

/** @internal */
export function Processed<A>(result: A): MessageState.MessageStateProcessed<A> {
  return ({
    [MessageStateTypeId]: MessageStateTypeId,
    _tag: "@effect/cluster/MessageState/Processed",
    result
  })
}

/** @internal */
export function match<A, B, C = B>(
  cases: {
    onAcknowledged: (value: MessageState.MessageStateAcknowledged) => B
    onProcessed: (exit: MessageState.MessageStateProcessed<A>) => C
  }
) {
  return (value: MessageState.MessageState<A>) => {
    switch (value._tag) {
      case "@effect/cluster/MessageState/Acknowledged":
        return cases.onAcknowledged(value)
      case "@effect/cluster/MessageState/Processed":
        return cases.onProcessed(value)
    }
  }
}

/** @internal */
export function mapEffect<A, B, R, E>(
  value: MessageState.MessageState<A>,
  fn: (value: A) => Effect.Effect<B, E, R>
): Effect.Effect<MessageState.MessageState<B>, E, R> {
  return pipe(
    value,
    match({
      onAcknowledged: Effect.succeed,
      onProcessed: (_) =>
        Effect.map(fn(_.result), (_) => Processed(_)) as Effect.Effect<MessageState.MessageState<B>, E, R>
    })
  )
}

/** @internal */
export function schema<A, I>(
  result: Schema.Schema<A, I>
): Schema.Schema<
  MessageState.MessageState<A>,
  MessageState.MessageState.Encoded<I>
> {
  return Schema.Union(
    Schema.rename(
      Schema.Struct({
        [MessageStateSymbolKey]: Schema.compose(
          Schema.compose(Schema.Literal(MessageStateSymbolKey), Schema.Symbol, { strict: false }),
          Schema.UniqueSymbolFromSelf(MessageStateTypeId),
          { strict: false }
        ),
        _tag: Schema.Literal("@effect/cluster/MessageState/Acknowledged")
      }),
      { [MessageStateSymbolKey]: MessageStateTypeId }
    ),
    Schema.rename(
      Schema.Struct({
        [MessageStateSymbolKey]: Schema.compose(
          Schema.compose(Schema.Literal(MessageStateSymbolKey), Schema.Symbol, { strict: false }),
          Schema.UniqueSymbolFromSelf(MessageStateTypeId),
          { strict: false }
        ),
        _tag: Schema.Literal("@effect/cluster/MessageState/Processed"),
        result
      }),
      { [MessageStateSymbolKey]: MessageStateTypeId }
    )
  )
}
