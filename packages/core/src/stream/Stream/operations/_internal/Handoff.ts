import { Tuple } from "../../../../collection/immutable/Tuple"
import { Option } from "../../../../data/Option"
import type { UIO } from "../../../../io/Effect"
import { Effect } from "../../../../io/Effect"
import { Promise } from "../../../../io/Promise"
import { Ref } from "../../../../io/Ref"

/**
 * A synchronous queue-like abstraction that allows a producer to offer an
 * element and wait for it to be taken, and allows a consumer to wait for an
 * element to be available.
 *
 * @tsplus type ets/Stream/Handoff
 * @tsplus companion ets/Stream/HandoffOps
 */
export class Handoff<A> {
  constructor(readonly ref: Ref<HandoffState<A>>) {}
}

export type HandoffState<A> = Empty | Full<A>

export class Empty {
  readonly _tag = "Empty"
  constructor(readonly notifyConsumer: Promise<never, void>) {}
}

export class Full<A> {
  readonly _tag = "Full"
  constructor(readonly value: A, readonly nofityProducer: Promise<never, void>) {}
}

/**
 * @tsplus static ets/Stream/HandoffOps make
 */
export function make<A>(__tsplusTrace?: string): UIO<Handoff<A>> {
  return Promise.make<never, void>()
    .flatMap((promise) => Ref.make<HandoffState<A>>(new Empty(promise)))
    .map((state) => new Handoff(state))
}

/**
 * @tsplus fluent ets/Stream/Handoff offer
 */
export function offer<A>(self: Handoff<A>, a: A, __tsplusTrace?: string): UIO<void> {
  return Promise.make<never, void>().flatMap((promise) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return Tuple(
              state.notifyConsumer.succeed(undefined) > promise.await(),
              new Full(a, promise)
            )
          }
          case "Full": {
            return Tuple(state.nofityProducer.await() > offer(self, a), state)
          }
        }
      })
      .flatten()
  )
}

/**
 * @tsplus fluent ets/Stream/Handoff take
 */
export function take<A>(self: Handoff<A>, __tsplusTrace?: string): UIO<A> {
  return Promise.make<never, void>().flatMap((promise) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return Tuple(state.notifyConsumer.await() > take(self), state)
          }
          case "Full": {
            return Tuple(
              state.nofityProducer.succeed(undefined).as(state.value),
              new Empty(promise)
            )
          }
        }
      })
      .flatten()
  )
}

/**
 * @tsplus fluent ets/Stream/Handoff poll
 */
export function poll<A>(self: Handoff<A>, __tsplusTrace?: string): UIO<Option<A>> {
  return Promise.make<never, void>().flatMap((promise) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return Tuple(Effect.succeedNow(Option.none), state)
          }
          case "Full": {
            return Tuple(
              state.nofityProducer.succeed(undefined).as(Option.some(state.value)),
              new Empty(promise)
            )
          }
        }
      })
      .flatten()
  )
}
