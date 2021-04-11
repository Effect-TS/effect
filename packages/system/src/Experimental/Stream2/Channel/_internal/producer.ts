// tracing: off

import "../../../../Operator"

import * as Cause from "../../../../Cause"
import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import * as Exit from "../../../../Exit"
import * as P from "../../../../Promise"
import * as Ref from "../../../../Ref"

/**
 * Producer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputProducer<Err, Elem, Done> {
  emit(el: Elem): T.UIO<unknown>
  done(a: Done): T.UIO<unknown>
  error(cause: Cause.Cause<Err>): T.UIO<unknown>
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

export class StateDone<A> {
  readonly _typeId: DoneTypeId = DoneTypeId
  constructor(readonly a: A) {}
}

export const ErrorTypeId = Symbol()
export type ErrorTypeId = typeof ErrorTypeId

export class StateError<E> {
  readonly _typeId: ErrorTypeId = ErrorTypeId
  constructor(readonly cause: Cause.Cause<E>) {}
}

export const EmptyTypeId = Symbol()
export type EmptyTypeId = typeof EmptyTypeId

export class StateEmpty {
  readonly _typeId: EmptyTypeId = EmptyTypeId
  constructor(readonly notifyConsumer: P.Promise<never, void>) {}
}

export const EmitTypeId = Symbol()
export type EmitTypeId = typeof EmitTypeId

export class StateEmit<Elem> {
  readonly _typeId: EmitTypeId = EmitTypeId
  constructor(readonly a: Elem, readonly notifyProducer: P.Promise<never, void>) {}
}

export type State<Err, Elem, Done> =
  | StateEmpty
  | StateEmit<Elem>
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
  implements AsyncInputProducer<Err, Elem, Done>, AsyncInputConsumer<Err, Elem, Done> {
  constructor(readonly ref: Ref.Ref<State<Err, Elem, Done>>) {}

  emit(el: Elem): T.UIO<unknown> {
    return T.chain_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              return [
                T.chain_(P.await(state.notifyProducer), () => this.emit(el)),
                state
              ] as const
            }
            case ErrorTypeId: {
              return [T.interrupt, state] as const
            }
            case DoneTypeId: {
              return [T.interrupt, state] as const
            }
            case EmptyTypeId: {
              return [
                T.chain_(P.succeed_(state.notifyConsumer, void 0), () => P.await(p)),
                new StateEmit(el, p)
              ] as const
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
              return [
                T.chain_(P.await(state.notifyProducer), () => this.done(a)),
                state
              ] as const
            }
            case ErrorTypeId: {
              return [T.interrupt, state] as const
            }
            case DoneTypeId: {
              return [T.interrupt, state] as const
            }
            case EmptyTypeId: {
              return [
                P.succeed_(state.notifyConsumer, void 0),
                new StateDone(a)
              ] as const
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
              return [
                T.chain_(P.await(state.notifyProducer), () => this.error(cause)),
                state
              ] as const
            }
            case ErrorTypeId: {
              return [T.interrupt, state] as const
            }
            case DoneTypeId: {
              return [T.interrupt, state] as const
            }
            case EmptyTypeId: {
              return [
                P.succeed_(state.notifyConsumer, void 0),
                new StateError(cause)
              ] as const
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
    return T.chain_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._typeId) {
            case EmitTypeId: {
              return [
                T.map_(P.succeed_(state.notifyProducer, void 0), () =>
                  onElement(state.a)
                ),
                new StateEmpty(p)
              ] as const
            }
            case ErrorTypeId: {
              return [T.succeed(onError(state.cause)), state] as const
            }
            case DoneTypeId: {
              return [T.succeed(onDone(state.a)), state] as const
            }
            case EmptyTypeId: {
              return [
                T.chain_(P.await(state.notifyConsumer), () =>
                  this.takeWith(onError, onElement, onDone)
                ),
                state
              ] as const
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
