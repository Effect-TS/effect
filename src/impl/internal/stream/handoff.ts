import * as Deferred from "../../Deferred.js"
import * as Effect from "../../Effect.js"
import { dual, pipe } from "../../Function.js"
import * as Option from "../../Option.js"
import * as Ref from "../../Ref.js"

/** @internal */
export const HandoffTypeId = Symbol.for("effect/Stream/Handoff")

/** @internal */
export type HandoffTypeId = typeof HandoffTypeId

/**
 * A synchronous queue-like abstraction that allows a producer to offer an
 * element and wait for it to be taken, and allows a consumer to wait for an
 * element to be available.
 *
 * @internal
 */
export interface Handoff<A> extends Handoff.Variance<A> {
  readonly ref: Ref.Ref<Handoff.State<A>>
}

/** @internal */
export const OP_HANDOFF_STATE_EMPTY = "Empty" as const

/** @internal */
export type OP_HANDOFF_STATE_EMPTY = typeof OP_HANDOFF_STATE_EMPTY

/** @internal */
export const OP_HANDOFF_STATE_FULL = "Full" as const

/** @internal */
export type OP_HANDOFF_STATE_FULL = typeof OP_HANDOFF_STATE_FULL

/** @internal */
export declare namespace Handoff {
  /** @internal */
  export interface Variance<A> {
    readonly [HandoffTypeId]: {
      readonly _A: (_: never) => A
    }
  }

  /** @internal */
  export type State<A> = Empty | Full<A>

  /** @internal */
  export interface Empty {
    readonly _tag: OP_HANDOFF_STATE_EMPTY
    readonly notifyConsumer: Deferred.Deferred<never, void>
  }

  /** @internal */
  export interface Full<A> {
    readonly _tag: OP_HANDOFF_STATE_FULL
    readonly value: A
    readonly notifyProducer: Deferred.Deferred<never, void>
  }
}

/** @internal */
const handoffStateEmpty = (notifyConsumer: Deferred.Deferred<never, void>): Handoff.State<never> => ({
  _tag: OP_HANDOFF_STATE_EMPTY,
  notifyConsumer
})

/** @internal */
const handoffStateFull = <A>(value: A, notifyProducer: Deferred.Deferred<never, void>): Handoff.State<A> => ({
  _tag: OP_HANDOFF_STATE_FULL,
  value,
  notifyProducer
})

/** @internal */
const handoffStateMatch = <A, Z>(
  onEmpty: (notifyConsumer: Deferred.Deferred<never, void>) => Z,
  onFull: (value: A, notifyProducer: Deferred.Deferred<never, void>) => Z
) => {
  return (self: Handoff.State<A>): Z => {
    switch (self._tag) {
      case OP_HANDOFF_STATE_EMPTY: {
        return onEmpty(self.notifyConsumer)
      }
      case OP_HANDOFF_STATE_FULL: {
        return onFull(self.value, self.notifyProducer)
      }
    }
  }
}

/** @internal */
const handoffVariance = {
  _A: (_: never) => _
}

/** @internal */
export const make = <A>(): Effect.Effect<never, never, Handoff<A>> =>
  pipe(
    Deferred.make<never, void>(),
    Effect.flatMap((deferred) => Ref.make(handoffStateEmpty(deferred))),
    Effect.map((ref) => ({
      [HandoffTypeId]: handoffVariance,
      ref
    }))
  )

/** @internal */
export const offer = dual<
  <A>(value: A) => (self: Handoff<A>) => Effect.Effect<never, never, void>,
  <A>(self: Handoff<A>, value: A) => Effect.Effect<never, never, void>
>(2, (self, value): Effect.Effect<never, never, void> => {
  return Effect.flatMap(Deferred.make<never, void>(), (deferred) =>
    Effect.flatten(
      Ref.modify(self.ref, (state) =>
        pipe(
          state,
          handoffStateMatch(
            (notifyConsumer) => [
              Effect.zipRight(
                Deferred.succeed<never, void>(notifyConsumer, void 0),
                Deferred.await(deferred)
              ),
              handoffStateFull(value, deferred)
            ],
            (_, notifyProducer) => [
              Effect.flatMap(
                Deferred.await(notifyProducer),
                () => pipe(self, offer(value))
              ),
              state
            ]
          )
        ))
    ))
})

/** @internal */
export const take = <A>(self: Handoff<A>): Effect.Effect<never, never, A> =>
  Effect.flatMap(Deferred.make<never, void>(), (deferred) =>
    Effect.flatten(
      Ref.modify(self.ref, (state) =>
        pipe(
          state,
          handoffStateMatch(
            (notifyConsumer) => [
              Effect.flatMap(
                Deferred.await(notifyConsumer),
                () => take(self)
              ),
              state
            ],
            (value, notifyProducer) => [
              Effect.as(
                Deferred.succeed<never, void>(notifyProducer, void 0),
                value
              ),
              handoffStateEmpty(deferred)
            ]
          )
        ))
    ))

/** @internal */
export const poll = <A>(self: Handoff<A>): Effect.Effect<never, never, Option.Option<A>> =>
  Effect.flatMap(Deferred.make<never, void>(), (deferred) =>
    Effect.flatten(
      Ref.modify(self.ref, (state) =>
        pipe(
          state,
          handoffStateMatch(
            () => [
              Effect.succeed(Option.none<A>()),
              state
            ],
            (value, notifyProducer) => [
              Effect.as(
                Deferred.succeed<never, void>(notifyProducer, void 0),
                Option.some(value)
              ),
              handoffStateEmpty(deferred)
            ]
          )
        ))
    ))
