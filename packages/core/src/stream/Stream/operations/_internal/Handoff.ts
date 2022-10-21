/**
 * A synchronous queue-like abstraction that allows a producer to offer an
 * element and wait for it to be taken, and allows a consumer to wait for an
 * element to be available.
 *
 * @tsplus type effect/core/stream/Stream/Handoff
 * @tsplus companion effect/core/stream/Stream/Handoff.Ops
 */
export class Handoff<A> {
  constructor(readonly ref: Ref<HandoffState<A>>) {}
}

export type HandoffState<A> = Empty | Full<A>

export class Empty {
  readonly _tag = "Empty"
  constructor(readonly notifyConsumer: Deferred<never, void>) {}
}

export class Full<A> {
  readonly _tag = "Full"
  constructor(readonly value: A, readonly notifyProducer: Deferred<never, void>) {}
}

/**
 * @tsplus static effect/core/stream/Stream/Handoff.Ops make
 */
export function make<A>(): Effect<never, never, Handoff<A>> {
  return Deferred.make<never, void>()
    .flatMap((deferred) => Ref.make<HandoffState<A>>(new Empty(deferred)))
    .map((state) => new Handoff(state))
}

/**
 * @tsplus static effect/core/stream/Stream/Handoff.Aspects offer
 * @tsplus pipeable effect/core/stream/Stream/Handoff offer
 */
export function offer<A>(value: A) {
  return (self: Handoff<A>): Effect<never, never, void> =>
    Deferred.make<never, void>().flatMap((deferred) =>
      self.ref
        .modify((state) => {
          switch (state._tag) {
            case "Empty": {
              return [
                state.notifyConsumer.succeed(undefined) > deferred.await,
                new Full(value, deferred)
              ] as const
            }
            case "Full": {
              return [state.notifyProducer.await > self.offer(value), state] as const
            }
          }
        })
        .flatten
    )
}

/**
 * @tsplus getter effect/core/stream/Stream/Handoff take
 */
export function take<A>(self: Handoff<A>): Effect<never, never, A> {
  return Deferred.make<never, void>().flatMap((deferred) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return [state.notifyConsumer.await > self.take, state] as const
          }
          case "Full": {
            return [
              state.notifyProducer.succeed(undefined).as(state.value),
              new Empty(deferred)
            ] as const
          }
        }
      })
      .flatten
  )
}

/**
 * @tsplus getter effect/core/stream/Stream/Handoff poll
 */
export function poll<A>(self: Handoff<A>): Effect<never, never, Maybe<A>> {
  return Deferred.make<never, void>().flatMap((deferred) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return [Effect.succeed(Maybe.none), state] as const
          }
          case "Full": {
            return [
              state.notifyProducer.succeed(undefined).as(Maybe.some(state.value)),
              new Empty(deferred)
            ] as const
          }
        }
      })
      .flatten
  )
}
