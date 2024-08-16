import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual, flow, type LazyArg } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as MessageState from "../MessageState.js"

/** @internal */
export const TypeId: MessageState.TypeId = Symbol.for("@effect/cluster/MessageState") as MessageState.TypeId

const variance = {
  _A: (_: never) => _,
  _E: (_: never) => _
}

const Proto = {
  [TypeId]: variance
}

/** @internal */
export const isMessageState = (u: unknown): u is MessageState.MessageState<unknown, unknown> =>
  Predicate.hasProperty(u, TypeId)

/** @internal */
export const isAcknowledged = <A, E>(self: MessageState.MessageState<A, E>): self is MessageState.Acknowledged =>
  isMessageState(self) && self._tag === "Acknowledged"

/** @internal */
export const isProcessed = <A, E>(self: MessageState.MessageState<A, E>): self is MessageState.Processed<A, E> =>
  isMessageState(self) && self._tag === "Processed"

/** @internal */
export const acknowledged: MessageState.MessageState<never, never> = Object.assign(Object.create(Proto), {
  _tag: "Acknowledged"
})

/** @internal */
export const processed = <A, E>(result: Exit.Exit<A, E>): MessageState.MessageState<A, E> =>
  Object.assign(Object.create(Proto), {
    _tag: "Processed",
    result
  })

/** @internal */
export const match = dual<
  <A, E, B, C = B>(
    options: {
      onAcknowledged: LazyArg<B>
      onProcessed: (exit: Exit.Exit<A, E>) => C
    }
  ) => (self: MessageState.MessageState<A, E>) => B | C,
  <A, E, B, C = B>(
    self: MessageState.MessageState<A, E>,
    options: {
      onAcknowledged: LazyArg<B>
      onProcessed: (exit: Exit.Exit<A, E>) => C
    }
  ) => B | C
>(2, (self, options) => {
  switch (self._tag) {
    case "Acknowledged": {
      return options.onAcknowledged()
    }
    case "Processed": {
      return options.onProcessed(self.result)
    }
  }
})

/** @internal */
export const mapBothEffect = dual<
  <A, E, B, E1, R1, C, E2, R2, E3, R3>(options: {
    onSuccess: (value: A) => Effect.Effect<B, E1, R1>
    onFailure: (error: E) => Effect.Effect<C, E2, R2>
  }) => (
    self: MessageState.MessageState<A, E>
  ) => Effect.Effect<MessageState.MessageState<B, C>, E1 | E2 | E3, R1 | R2 | R3>,
  <A, E, B, E1, R1, C, E2, R2, E3, R3>(
    self: MessageState.MessageState<A, E>,
    options: {
      onSuccess: (value: A) => Effect.Effect<B, E1, R1>
      onFailure: (error: E) => Effect.Effect<C, E2, R2>
    }
  ) => Effect.Effect<MessageState.MessageState<B, C>, E1 | E2 | E3, R1 | R2 | R3>
>(2, <A, E, B, E1, R1, C, E2, R2, E3, R3>(
  self: MessageState.MessageState<A, E>,
  options: {
    onSuccess: (value: A) => Effect.Effect<B, E1, R1>
    onFailure: (error: E) => Effect.Effect<C, E2, R2>
  }
) => {
  switch (self._tag) {
    case "Acknowledged": {
      return Effect.succeed(acknowledged)
    }
    case "Processed": {
      return Exit.matchEffect(self.result, {
        onSuccess: (value) =>
          options.onSuccess(value).pipe(
            Effect.map((b) => processed(Exit.succeed(b)))
          ),
        onFailure: flow(
          Cause.match<Effect.Effect<Cause.Cause<C>, E1 | E2 | E3, R1 | R2 | R3>, E>({
            onEmpty: Effect.succeed(Cause.empty),
            onFail: (error) => options.onFailure(error).pipe(Effect.map(Cause.fail)),
            onDie: (defect) => Effect.succeed(Cause.die(defect)),
            onInterrupt: (fiberId) => Effect.succeed(Cause.interrupt(fiberId)),
            onSequential: (left, right) => Effect.zipWith(left, right, Cause.sequential),
            onParallel: (left, right) => Effect.zipWith(left, right, Cause.parallel)
          }),
          Effect.map((cause) => processed(Exit.failCause(cause)))
        )
      })
    }
  }
})

const AcknowledgedSchema: Schema.Schema<
  MessageState.Acknowledged,
  MessageState.MessageState.AcknowledgedEncoded,
  never
> = Schema.Struct({
  _tag: Schema.transform(
    Schema.Literal("@effect/cluster/MessageState/Acknowledged"),
    Schema.Literal("Acknowledged"),
    {
      encode: () => "@effect/cluster/MessageState/Acknowledged" as const,
      decode: () => "Acknowledged" as const,
      strict: true
    }
  )
}).pipe(Schema.attachPropertySignature(TypeId, variance as any))

const ProcessedSchema = <A, IA, RA, E, IE, RE, RD>(
  success: Schema.Schema<A, IA, RA>,
  failure: Schema.Schema<E, IE, RE>,
  defect: Schema.Schema<unknown, unknown, RD>
): Schema.Schema<
  MessageState.Processed<A, E>,
  MessageState.MessageState.ProcessedEncoded<IA, IE>,
  RA | RE | RD
> =>
  Schema.Struct({
    _tag: Schema.transform(
      Schema.Literal("@effect/cluster/MessageState/Processed"),
      Schema.Literal("Processed"),
      {
        encode: () => "@effect/cluster/MessageState/Processed" as const,
        decode: () => "Processed" as const,
        strict: true
      }
    ),
    result: Schema.Exit({ success, failure, defect })
  }).pipe(Schema.attachPropertySignature(TypeId, variance as any))

/** @internal */
export const schema = <A, IA, RA, E, IE, RE, RD>(
  success: Schema.Schema<A, IA, RA>,
  failure: Schema.Schema<E, IE, RE>,
  defect: Schema.Schema<unknown, unknown, RD>
): Schema.Schema<
  MessageState.MessageState<A, E>,
  MessageState.MessageState.Encoded<IA, IE>,
  RA | RE | RD
> =>
  Schema.Union(
    AcknowledgedSchema,
    ProcessedSchema(success, failure, defect)
  )
