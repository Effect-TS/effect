/**
 * @since 2.0.0
 */
import type { Cause } from "./exports/Cause.js"
import type { Effect } from "./exports/Effect.js"
import * as internal from "./internal/channel/singleProducerAsyncInput.js"

import type { SingleProducerAsyncInput } from "./exports/SingleProducerAsyncInput.js"

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
