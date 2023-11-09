/**
 * @since 2.0.0
 */
import type { Cause } from "./Cause.js"
import type { Effect } from "./Effect.js"
import type { Either } from "./Either.js"
import type { Exit } from "./Exit.js"
import * as internal from "./internal/channel/singleProducerAsyncInput.js"

export * as SingleProducerAsyncInput from "./SingleProducerAsyncInput.js"

declare module "./SingleProducerAsyncInput.js" {
  /**
   * An MVar-like abstraction for sending data to channels asynchronously which is
   * designed for one producer and multiple consumers.
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
   * @since 2.0.0
   * @category models
   */
  export interface SingleProducerAsyncInput<Err, Elem, Done>
    extends AsyncInputProducer<Err, Elem, Done>, AsyncInputConsumer<Err, Elem, Done>
  {
    close(): Effect<never, never, unknown>
    take(): Effect<never, never, Exit<Either<Err, Done>, Elem>>
  }
}

/**
 * Producer-side view of `SingleProducerAsyncInput` for variance purposes.
 *
 * @since 2.0.0
 * @category models
 */
export interface AsyncInputProducer<Err, Elem, Done> {
  awaitRead(): Effect<never, never, unknown>
  done(value: Done): Effect<never, never, unknown>
  emit(element: Elem): Effect<never, never, unknown>
  error(cause: Cause<Err>): Effect<never, never, unknown>
}

/**
 * Consumer-side view of `SingleProducerAsyncInput` for variance purposes.
 *
 * @since 2.0.0
 * @category models
 */
export interface AsyncInputConsumer<Err, Elem, Done> {
  takeWith<A>(
    onError: (cause: Cause<Err>) => A,
    onElement: (element: Elem) => A,
    onDone: (value: Done) => A
  ): Effect<never, never, A>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <Err, Elem, Done>() => Effect<never, never, SingleProducerAsyncInput<Err, Elem, Done>> =
  internal.make
