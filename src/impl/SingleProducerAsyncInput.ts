/**
 * @since 2.0.0
 */
import type * as Cause from "../Cause.js"
import type * as Effect from "../Effect.js"
import * as internal from "../internal/channel/singleProducerAsyncInput.js"
import type { SingleProducerAsyncInput } from "../SingleProducerAsyncInput.js"

/**
 * Producer-side view of `SingleProducerAsyncInput` for variance purposes.
 *
 * @since 2.0.0
 * @category models
 */
export interface AsyncInputProducer<Err, Elem, Done> {
  awaitRead(): Effect.Effect<never, never, unknown>
  done(value: Done): Effect.Effect<never, never, unknown>
  emit(element: Elem): Effect.Effect<never, never, unknown>
  error(cause: Cause.Cause<Err>): Effect.Effect<never, never, unknown>
}

/**
 * Consumer-side view of `SingleProducerAsyncInput` for variance purposes.
 *
 * @since 2.0.0
 * @category models
 */
export interface AsyncInputConsumer<Err, Elem, Done> {
  takeWith<A>(
    onError: (cause: Cause.Cause<Err>) => A,
    onElement: (element: Elem) => A,
    onDone: (value: Done) => A
  ): Effect.Effect<never, never, A>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <Err, Elem, Done>() => Effect.Effect<never, never, SingleProducerAsyncInput<Err, Elem, Done>> =
  internal.make
