import * as Schema from "@effect/schema/Schema"
import * as Exit from "effect/Exit"
import type * as MessageState from "../MessageState.js"

/** @internal */
const MessageStateSymbolKey = "@effect/cluster/MessageState"

/** @internal */
export const MessageStateTypeId: MessageState.MessageStateTypeId = Symbol.for(
  MessageStateSymbolKey
) as MessageState.MessageStateTypeId

/** @internal */
export function isMessageState(value: unknown): value is MessageState.MessageState<unknown, unknown> {
  return typeof value === "object" && value !== null && MessageStateTypeId in value
}

/** @internal */
export const Acknowledged: MessageState.MessageStateAcknowledged = {
  [MessageStateTypeId]: MessageStateTypeId,
  _tag: "@effect/cluster/MessageState/Acknowledged"
}

/** @internal */
export function Processed<A, E>(result: Exit.Exit<A, E>): MessageState.MessageStateProcessed<A, E> {
  return ({
    [MessageStateTypeId]: MessageStateTypeId,
    _tag: "@effect/cluster/MessageState/Processed",
    result
  })
}

/** @internal */
export function match<A, E, B, C = B>(
  cases: {
    onAcknowledged: (value: MessageState.MessageStateAcknowledged) => B
    onProcessed: (exit: MessageState.MessageStateProcessed<A, E>) => C
  }
) {
  return (value: MessageState.MessageState<A, E>) => {
    switch (value._tag) {
      case "@effect/cluster/MessageState/Acknowledged":
        return cases.onAcknowledged(value)
      case "@effect/cluster/MessageState/Processed":
        return cases.onProcessed(value)
    }
  }
}

/** @internal */
export function schema<A, IA, E, IE>(
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>
): Schema.Schema<
  MessageState.MessageState<A, E>,
  MessageState.MessageState.Encoded<IA, IE>
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
        result: Schema.Exit<Schema.Schema<A, IA, never>, Schema.Schema<E, IE, never>, never>({success, failure})
      }),
      { [MessageStateSymbolKey]: MessageStateTypeId }
    )
  )
}
