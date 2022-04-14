/**
 * A synchronous queue-like abstraction that allows a producer to offer an
 * element and wait for it to be taken, and allows a consumer to wait for an
 * element to be available.
 *
 * @tsplus type ets/Stream/Handoff
 * @tsplus companion ets/Stream/Handoff/Ops
 */
export class Handoff<A> {
  constructor(readonly ref: Ref<HandoffState<A>>) {}
}

export type HandoffState<A> = Empty | Full<A>;

export class Empty {
  readonly _tag = "Empty";
  constructor(readonly notifyConsumer: Deferred<never, void>) {}
}

export class Full<A> {
  readonly _tag = "Full";
  constructor(readonly value: A, readonly notifyProducer: Deferred<never, void>) {}
}

/**
 * @tsplus static ets/Stream/Handoff/Ops make
 */
export function make<A>(__tsplusTrace?: string): Effect.UIO<Handoff<A>> {
  return Deferred.make<never, void>()
    .flatMap((deferred) => Ref.make<HandoffState<A>>(new Empty(deferred)))
    .map((state) => new Handoff(state));
}

/**
 * @tsplus fluent ets/Stream/Handoff offer
 */
export function offer<A>(self: Handoff<A>, a: A, __tsplusTrace?: string): Effect.UIO<void> {
  return Deferred.make<never, void>().flatMap((deferred) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return Tuple(
              state.notifyConsumer.succeed(undefined) > deferred.await(),
              new Full(a, deferred)
            );
          }
          case "Full": {
            return Tuple(state.notifyProducer.await() > self.offer(a), state);
          }
        }
      })
      .flatten()
  );
}

/**
 * @tsplus fluent ets/Stream/Handoff take
 */
export function take<A>(self: Handoff<A>, __tsplusTrace?: string): Effect.UIO<A> {
  return Deferred.make<never, void>().flatMap((deferred) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return Tuple(state.notifyConsumer.await() > self.take(), state);
          }
          case "Full": {
            return Tuple(
              state.notifyProducer.succeed(undefined).as(state.value),
              new Empty(deferred)
            );
          }
        }
      })
      .flatten()
  );
}

/**
 * @tsplus fluent ets/Stream/Handoff poll
 */
export function poll<A>(self: Handoff<A>, __tsplusTrace?: string): Effect.UIO<Option<A>> {
  return Deferred.make<never, void>().flatMap((deferred) =>
    self.ref
      .modify((state) => {
        switch (state._tag) {
          case "Empty": {
            return Tuple(Effect.succeedNow(Option.none), state);
          }
          case "Full": {
            return Tuple(
              state.notifyProducer.succeed(undefined).as(Option.some(state.value)),
              new Empty(deferred)
            );
          }
        }
      })
      .flatten()
  );
}
