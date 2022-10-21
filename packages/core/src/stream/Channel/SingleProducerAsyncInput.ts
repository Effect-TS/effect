/**
 * Producer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputProducer<Err, Elem, Done> {
  readonly emit: (el: Elem) => Effect<never, never, unknown>
  readonly done: (a: Done) => Effect<never, never, unknown>
  readonly error: (cause: Cause<Err>) => Effect<never, never, unknown>
  readonly awaitRead: Effect<never, never, unknown>
}

/**
 * Consumer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputConsumer<Err, Elem, Done> {
  readonly takeWith: <A>(
    onError: (cause: Cause<Err>) => A,
    onElement: (element: Elem) => A,
    onDone: (done: Done) => A
  ) => Effect<never, never, A>
}

export type State<Err, Elem, Done> =
  | StateEmpty
  | StateEmit<Err, Elem, Done>
  | StateError<Err>
  | StateDone<Done>

export const DoneTypeId = Symbol.for("@effect/core/stream/Channel/Producer/Done")
export type DoneTypeId = typeof DoneTypeId

export class StateDone<Elem> {
  readonly _typeId: DoneTypeId = DoneTypeId
  constructor(readonly a: Elem) {}
}

export const ErrorTypeId = Symbol.for("@effect/core/stream/Channel/Producer/Error")
export type ErrorTypeId = typeof ErrorTypeId

export class StateError<Err> {
  readonly _typeId: ErrorTypeId = ErrorTypeId
  constructor(readonly cause: Cause<Err>) {}
}

export const EmptyTypeId = Symbol.for("@effect/core/stream/Channel/Producer/Empty")
export type EmptyTypeId = typeof EmptyTypeId

export class StateEmpty {
  readonly _typeId: EmptyTypeId = EmptyTypeId
  constructor(readonly notifyProducer: Deferred<never, void>) {}
}

export const EmitTypeId = Symbol.for("@effect/core/stream/Channel/Producer/Emit")
export type EmitTypeId = typeof EmitTypeId

export class StateEmit<Err, Elem, Done> {
  readonly _typeId: EmitTypeId = EmitTypeId
  constructor(
    readonly notifyConsumers: ImmutableQueue<Deferred<Err, Either<Done, Elem>>>
  ) {}
}

/**
 * An MVar-like abstraction for sending data to channels asynchronously.
 * Designed for one producer and multiple consumers.
 *
 * Features the following semantics:
 *   - Buffer of size 1.
 *   - When emitting, the producer waits for a consumer to pick up the value to
 *     prevent "reading ahead" too much.
 *   - Once an emitted element is read by a consumer, it is cleared from the
 *     buffer, so that at most one consumer sees every emitted element.
 *   - When sending a done or error signal, the producer does not wait for a
 *     consumer to pick up the signal. The signal stays in the buffer after
 *     being read by a consumer, so it can be propagated to multiple consumers.
 *   - Trying to publish another emit/error/done after an error/done have
 *     already been published results in an interruption.
 *
 * @tsplus type effect/core/stream/Channel/SingleProducerAsyncInput
 * @tsplus companion effect/core/stream/Channel/SingleProducerAsyncInput.Ops
 */
export class SingleProducerAsyncInput<Err, Elem, Done>
  implements AsyncInputProducer<Err, Elem, Done>, AsyncInputConsumer<Err, Elem, Done>
{
  constructor(readonly ref: Ref<State<Err, Elem, Done>>) {}

  get take(): Effect<never, never, Exit<Either<Err, Done>, Elem>> {
    return this.takeWith<Exit<Either<Err, Done>, Elem>>(
      (cause) => Exit.failCause(cause.map(Either.left)),
      (element) => Exit.succeed(element),
      (done) => Exit.fail(Either.right(done))
    )
  }

  get close(): Effect<never, never, unknown> {
    return Effect.fiberId.flatMap((fiberId) => this.error(Cause.interrupt(fiberId)))
  }

  get awaitRead(): Effect<never, never, unknown> {
    return this.ref
      .modify((state) =>
        state._typeId === EmptyTypeId
          ? [state.notifyProducer.await, state] as const
          : [Effect.unit, state] as const
      )
      .flatten
  }

  emit(el: Elem): Effect<never, never, unknown> {
    return Deferred.make<never, void>().flatMap((deferred) =>
      this.ref
        .modify((state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              const dequeued = state.notifyConsumers.dequeue

              if (dequeued._tag === "Some") {
                const [notifyConsumer, notifyConsumers] = dequeued.value

                return [
                  notifyConsumer.succeed(Either.right(el)),
                  notifyConsumers.size === 0
                    ? new StateEmpty(deferred)
                    : new StateEmit(notifyConsumers)
                ] as const
              }

              throw new Error("SingleProducerAsyncInput#emit: queue was empty")
            }
            case ErrorTypeId: {
              return [Effect.interrupt, state] as const
            }
            case DoneTypeId: {
              return [Effect.interrupt, state] as const
            }
            case EmptyTypeId: {
              return [state.notifyProducer.await, state] as const
            }
          }
        })
        .flatten
    )
  }

  done(a: Done): Effect<never, never, unknown> {
    return this.ref
      .modify((state) => {
        switch (state._typeId) {
          case EmitTypeId: {
            return [
              Effect.forEachDiscard(
                state.notifyConsumers,
                (promise) => promise.succeed(Either.left(a))
              ),
              new StateDone(a)
            ] as const
          }
          case ErrorTypeId: {
            return [Effect.interrupt, state] as const
          }
          case DoneTypeId: {
            return [Effect.interrupt, state] as const
          }
          case EmptyTypeId: {
            return [state.notifyProducer.await, state] as const
          }
        }
      })
      .flatten
  }

  error(cause: Cause<Err>): Effect<never, never, unknown> {
    return this.ref
      .modify((state) => {
        switch (state._typeId) {
          case EmitTypeId: {
            return [
              Effect.forEachDiscard(state.notifyConsumers, (promise) => promise.failCause(cause)),
              new StateError(cause)
            ] as const
          }
          case ErrorTypeId: {
            return [Effect.interrupt, state] as const
          }
          case DoneTypeId: {
            return [Effect.interrupt, state] as const
          }
          case EmptyTypeId: {
            return [state.notifyProducer.await, state] as const
          }
        }
      })
      .flatten
  }

  takeWith<X>(
    onError: (cause: Cause<Err>) => X,
    onElement: (element: Elem) => X,
    onDone: (done: Done) => X
  ): Effect<never, never, X> {
    return Deferred.make<Err, Either<Done, Elem>>().flatMap((deferred) =>
      this.ref
        .modify((state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              return [
                deferred
                  .await
                  .foldCause(onError, (either) => either.fold(onDone, onElement)),
                new StateEmit(state.notifyConsumers.append(deferred))
              ] as const
            }
            case ErrorTypeId: {
              return [Effect.sync(onError(state.cause)), state] as const
            }
            case DoneTypeId: {
              return [Effect.sync(onDone(state.a)), state] as const
            }
            case EmptyTypeId: {
              return [
                state.notifyProducer.succeed(undefined) >
                  deferred
                    .await
                    .foldCause(onError, (either) => either.fold(onDone, onElement)),
                new StateEmit(ImmutableQueue.single(deferred))
              ] as const
            }
          }
        })
        .flatten
    )
  }
}

/**
 * Creates a `SingleProducerAsyncInput`.
 *
 * @tsplus static effect/core/stream/Channel/SingleProducerAsyncInput.Ops make
 */
export function make<Err, Elem, Done>(): Effect<
  never,
  never,
  SingleProducerAsyncInput<Err, Elem, Done>
> {
  return Deferred.make<never, void>()
    .flatMap((deferred) => Ref.make<State<Err, Elem, Done>>(new StateEmpty(deferred)))
    .map((ref) => new SingleProducerAsyncInput(ref))
}
