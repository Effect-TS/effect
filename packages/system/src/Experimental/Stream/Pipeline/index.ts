// tracing: off

import type * as T from "../../../Effect"
import * as E from "../../../Either"
import type * as M from "../../../Managed"
import * as O from "../../../Option"
import * as Channel from "../Channel"

/**
 * Channel with Input & Output without Leftovers, Result and Upstream
 */
export type Pipeline<R, E, I, O, A = unknown> = Channel.Channel<
  R,
  E,
  I,
  I,
  O,
  unknown,
  A
>

/**
 * Ensure that the inner sink consumes no more than the given number of
 * values.
 */
export function take<A>(n: number, __trace?: string): Pipeline<unknown, never, A, A> {
  if (n <= 0) {
    return Channel.unit
  }
  return Channel.needInput(
    (i: A) => Channel.haveOutput(() => take<A>(n - 1, __trace), i),
    () => Channel.unit,
    __trace
  )
}

/**
 * Wait for a single input value from upstream.
 */
export function awaitOption<I>(
  __trace?: string
): Channel.Channel<unknown, never, never, I, never, unknown, O.Option<I>> {
  return Channel.needInput(
    (i: I) => Channel.succeed(O.some(i)),
    () => Channel.succeed(O.none),
    __trace
  )
}

/**
 * This is similar to `awaitOption`, but will return the upstream result value as
 * Left if available
 */
export function awaitEither<U, I>(
  __trace?: string
): Channel.Channel<unknown, never, never, I, never, U, E.Either<U, I>> {
  return Channel.needInput(
    (i: I) => Channel.succeed(E.right(i)),
    (u: U) => Channel.succeed(E.leftW(u)),
    __trace
  )
}

/**
 * Wait for input forever, calling the given inner `Channel` for each piece of
 * new input. Returns the upstream result type.
 */
export function channel<R, E, L, I, O, A, A1>(
  inner: (i: I) => Channel.Channel<R, E, L, I, O, A, A1>,
  __trace?: string
): Channel.Channel<R, E, L, I, O, A, A> {
  const go: Channel.Channel<R, E, L, I, O, A, A> = Channel.chain_(
    awaitEither<A, I>(),
    E.fold(
      (x) => Channel.succeed(x),
      (x) => Channel.chain_(inner(x), () => go)
    ),
    __trace
  )
  return go
}

/**
 * Apply a transformation to all values in a stream, concatenating the output
 * values.
 */
export function iterable<A, B>(
  f: (a: A) => Iterable<B>,
  __trace?: string
): Pipeline<unknown, never, A, B> {
  return channel((x: A) => Channel.writeIterable(f(x)), __trace)
}

/**
 * Apply an effectful transformation to all values in a stream
 */
export function effect<R, E, A, B>(
  f: (a: A) => T.Effect<R, E, B>,
  __trace?: string
): Pipeline<R, E, A, B> {
  return channel((x: A) => Channel.writeEffect(f(x)), __trace)
}

/**
 * Apply a managed transformation to all values in a stream
 */
export function managed<R, E, A, B>(
  f: (a: A) => M.Managed<R, E, B>,
  __trace?: string
): Pipeline<R, E, A, B> {
  return channel((x: A) => Channel.writeManaged(f(x)), __trace)
}

/**
 * Apply a transformation to all values in a stream, concatenating the output
 * values.
 */
function function_<A, B>(
  f: (a: A) => B,
  __trace?: string
): Pipeline<unknown, never, A, B> {
  return channel((x: A) => Channel.write(f(x)), __trace)
}

export { function_ as function }

/**
 * Construct a Transducer
 */
export function transducer<S, I, R, E, O>(
  body: (i: O.Option<I>) => Channel.Channel<R, E, never, I, O, unknown, S>,
  __trace?: string
): Pipeline<R, E, I, O>
export function transducer<S, I, R, E, O>(
  body: (i: O.Option<I>, s?: S) => Channel.Channel<R, E, never, I, O, unknown, S>,
  __trace?: string
): Pipeline<R, E, I, O>
export function transducer<S, I, R, E, O>(
  body: (i: O.Option<I>, s?: S) => Channel.Channel<R, E, never, I, O, unknown, S>,
  __trace?: string
): Pipeline<R, E, I, O> {
  return Channel.needInput(
    (i: I) =>
      Channel.chain_(body(O.some(i)), (newState) =>
        transducerInternal<S, I, R, E, O>(newState, body, __trace)
      ),
    () => Channel.chain_(body(O.none), () => Channel.unit),
    __trace
  )
}

function transducerInternal<S, I, R, E, O>(
  state: S,
  body: (i: O.Option<I>, s: S) => Channel.Channel<R, E, never, I, O, unknown, S>,
  __trace?: string
): Pipeline<R, E, I, O> {
  return Channel.needInput(
    (i: I) =>
      Channel.chain_(body(O.some(i), state), (newState) =>
        transducerInternal(newState, body)
      ),
    () => Channel.chain_(body(O.none, state), () => Channel.unit),
    __trace
  )
}
