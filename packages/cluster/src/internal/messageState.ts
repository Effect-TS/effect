import * as Schema from "@effect/schema/Schema"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Unify from "effect/Unify"
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
export function mapBothEffect<A, E, B, E1, R1, D, E2, R2, E3, R3>(
  value: MessageState.MessageState<A, E>,
  onSuccess: (value: A) => Effect.Effect<B, E1, R1>,
  onFailure: (value: E) => Effect.Effect<D, E2, R2>,
  onDefect: (value: unknown) => Effect.Effect<unknown, E3, R3>
): Effect.Effect<MessageState.MessageState<B, D>, E1 | E2 | E3, R1 | R2 | R3> {
  return pipe(
    value,
    match({
      onAcknowledged: () => Effect.succeed(Acknowledged),
      onProcessed: (_) =>
        Unify.unify(Exit.match(_.result, {
          onSuccess: (_) => Effect.map(onSuccess(_), (_) => Processed(Exit.succeed(_))),
          onFailure: (_) =>
            pipe(
              Cause.match<Effect.Effect<Cause.Cause<D>, E1 | E2 | E3, R1 | R2 | R3>, E>(_, {
                onEmpty: Effect.succeed(Cause.empty),
                onFail: (error) => Effect.map(onFailure(error), Cause.fail),
                onDie: (defect) => Effect.map(onDefect(defect), Cause.die),
                onInterrupt: (fiberId) => Effect.succeed(Cause.interrupt(fiberId)),
                onSequential: (left, right) =>
                  Effect.map(
                    Effect.all([left, right]),
                    ([left, right]) => Cause.sequential(left, right)
                  ),
                onParallel: (left, right) =>
                  Effect.map(
                    Effect.all([left, right]),
                    ([left, right]) => Cause.parallel(left, right)
                  )
              }),
              Effect.map(Exit.failCause),
              Effect.map(Processed)
            )
        }))
    })
  )
}

/** @internal */
export function schema<A, IA, RA, E, IE, RE, RD>(
  success: Schema.Schema<A, IA, RA>,
  failure: Schema.Schema<E, IE, RE>,
  defect: Schema.Schema<unknown, unknown, RD>
): Schema.Schema<
  MessageState.MessageState<A, E>,
  MessageState.MessageState.Encoded<IA, IE>,
  RA | RE | RD
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
        result: Schema.Exit({ success, failure, defect })
      }),
      { [MessageStateSymbolKey]: MessageStateTypeId }
    )
  )
}
