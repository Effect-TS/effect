// ets_tracing: off

import "../../../../Operator/index.js"

import * as Cause from "../../../../Cause/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import * as Exit from "../../../../Exit/index.js"
import * as P from "../../../../Promise/index.js"
import * as Ref from "../../../../Ref/index.js"
import * as IQ from "../../../../Support/ImmutableQueue/index.js"

/**
 * Producer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputProducer<Err, Elem, Done> {
  emit(el: Elem): T.UIO<unknown>
  done(a: Done): T.UIO<unknown>
  error(cause: Cause.Cause<Err>): T.UIO<unknown>
  awaitRead: T.UIO<unknown>
}

/**
 * Consumer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputConsumer<Err, Elem, Done> {
  takeWith<A>(
    onError: (cause: Cause.Cause<Err>) => A,
    onElement: (element: Elem) => A,
    onDone: (done: Done) => A
  ): T.UIO<A>
}

export const DoneTypeId = Symbol()
export type DoneTypeId = typeof DoneTypeId

export class StateDone<Elem> {
  readonly _typeId: DoneTypeId = DoneTypeId
  constructor(readonly a: Elem) {}
}

export const ErrorTypeId = Symbol()
export type ErrorTypeId = typeof ErrorTypeId

export class StateError<Err> {
  readonly _typeId: ErrorTypeId = ErrorTypeId
  constructor(readonly cause: Cause.Cause<Err>) {}
}

export const EmptyTypeId = Symbol()
export type EmptyTypeId = typeof EmptyTypeId

export class StateEmpty {
  readonly _typeId: EmptyTypeId = EmptyTypeId
  constructor(readonly notifyProducer: P.Promise<never, void>) {}
}

export const EmitTypeId = Symbol()
export type EmitTypeId = typeof EmitTypeId

export class StateEmit<Err, Elem, Done> {
  readonly _typeId: EmitTypeId = EmitTypeId
  constructor(
    readonly notifyConsumers: IQ.ImmutableQueue<P.Promise<Err, E.Either<Done, Elem>>>
  ) {}
}

export type State<Err, Elem, Done> =
  | StateEmpty
  | StateEmit<Err, Elem, Done>
  | StateError<Err>
  | StateDone<Done>

/**
 * An MVar-like abstraction for sending data to channels asynchronously. Designed
 * for one producer and multiple consumers.
 *
 * Features the following semantics:
 * - Buffer of size 1
 * - When emitting, the producer waits for a consumer to pick up the value
 *   to prevent "reading ahead" too much.
 * - Once an emitted element is read by a consumer, it is cleared from the buffer, so that
 *   at most one consumer sees every emitted element.
 * - When sending a done or error signal, the producer does not wait for a consumer
 *   to pick up the signal. The signal stays in the buffer after being read by a consumer,
 *   so it can be propagated to multiple consumers.
 * - Trying to publish another emit/error/done after an error/done have already been published
 *   results in an interruption.
 */
export class SingleProducerAsyncInput<Err, Elem, Done>
  implements AsyncInputProducer<Err, Elem, Done>, AsyncInputConsumer<Err, Elem, Done>
{
  constructor(readonly ref: Ref.Ref<State<Err, Elem, Done>>) {}

  emit(el: Elem): T.UIO<unknown> {
    return T.chain_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              const dequeued = state.notifyConsumers.dequeue()

              if (dequeued._tag === "Some") {
                const {
                  tuple: [notifyConsumer, notifyConsumers]
                } = dequeued.value

                return Tp.tuple(
                  P.succeed_(notifyConsumer, E.right(el)),
                  notifyConsumers.size === 0
                    ? new StateEmpty(p)
                    : new StateEmit(notifyConsumers)
                )
              }

              throw new Error("SingleProducerAsyncInput#emit: queue was empty")
            }
            case ErrorTypeId: {
              return Tp.tuple(T.interrupt, state)
            }
            case DoneTypeId: {
              return Tp.tuple(T.interrupt, state)
            }
            case EmptyTypeId: {
              return Tp.tuple(P.await(state.notifyProducer), state)
            }
          }
        })
      )
    )
  }

  done(a: Done): T.UIO<unknown> {
    return T.chain_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              return Tp.tuple(
                T.forEachUnit_(state.notifyConsumers, (p) => P.succeed_(p, E.left(a))),
                new StateDone(a)
              )
            }
            case ErrorTypeId: {
              return Tp.tuple(T.interrupt, state)
            }
            case DoneTypeId: {
              return Tp.tuple(T.interrupt, state)
            }
            case EmptyTypeId: {
              return Tp.tuple(P.await(state.notifyProducer), state)
            }
          }
        })
      )
    )
  }

  error(cause: Cause.Cause<Err>): T.UIO<unknown> {
    return T.chain_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              return Tp.tuple(
                T.forEachUnit_(state.notifyConsumers, (p) => P.halt_(p, cause)),
                new StateError(cause)
              )
            }
            case ErrorTypeId: {
              return Tp.tuple(T.interrupt, state)
            }
            case DoneTypeId: {
              return Tp.tuple(T.interrupt, state)
            }
            case EmptyTypeId: {
              return Tp.tuple(P.await(state.notifyProducer), state)
            }
          }
        })
      )
    )
  }

  takeWith<X>(
    onError: (cause: Cause.Cause<Err>) => X,
    onElement: (element: Elem) => X,
    onDone: (done: Done) => X
  ): T.UIO<X> {
    return T.chain_(P.make<Err, E.Either<Done, Elem>>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              return Tp.tuple(
                T.foldCause_(P.await(p), onError, E.fold(onDone, onElement)),
                new StateEmit(state.notifyConsumers.push(p))
              )
            }
            case ErrorTypeId: {
              return Tp.tuple(T.succeed(onError(state.cause)), state)
            }
            case DoneTypeId: {
              return Tp.tuple(T.succeed(onDone(state.a)), state)
            }
            case EmptyTypeId: {
              return Tp.tuple(
                T.zipRight_(
                  P.succeed_(state.notifyProducer, undefined),
                  T.foldCause_(P.await(p), onError, E.fold(onDone, onElement))
                ),
                new StateEmit(IQ.ImmutableQueue.single(p))
              )
            }
          }
        })
      )
    )
  }

  take = this.takeWith<Exit.Exit<E.Either<Err, Done>, Elem>>(
    (c) => Exit.halt(Cause.map_(c, E.left)),
    (el) => Exit.succeed(el),
    (d) => Exit.fail(E.right(d))
  )

  close = T.chain_(T.fiberId, (id) => this.error(Cause.interrupt(id)))

  awaitRead = T.flatten(
    Ref.modify_(this.ref, (state) => {
      if (state._typeId === EmptyTypeId) {
        return Tp.tuple(P.await(state.notifyProducer), state)
      }

      return Tp.tuple(T.unit, state)
    })
  )
}

/**
 * Creates a SingleProducerAsyncInput
 */
export function makeSingleProducerAsyncInput<Err, Elem, Done>(): T.UIO<
  SingleProducerAsyncInput<Err, Elem, Done>
> {
  return T.map_(
    T.chain_(P.make<never, void>(), (p) =>
      Ref.makeRef<State<Err, Elem, Done>>(new StateEmpty(p))
    ),
    (ref) => new SingleProducerAsyncInput(ref)
  )
}
