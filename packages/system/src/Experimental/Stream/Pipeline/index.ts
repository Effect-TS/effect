// tracing: off

import type * as T from "../../../Effect"
import * as E from "../../../Either"
import { pipe } from "../../../Function"
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
  return new Channel.NeedInput(
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
  return new Channel.NeedInput(
    (i: I) =>
      Channel.chain_(body(O.some(i), state), (newState) =>
        transducerInternal(newState, body)
      ),
    () => Channel.chain_(body(O.none, state), () => Channel.unit),
    __trace
  )
}

/**
 * Ensure that the inner sink consumes no more than the given number of
 * values.
 */
export function take<A>(n: number, __trace?: string): Pipeline<unknown, never, A, A> {
  if (n <= 0) {
    return Channel.unit
  }
  return new Channel.NeedInput(
    (i: A) => new Channel.HaveOutput(() => take<A>(n - 1, __trace), i),
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
  return new Channel.NeedInput(
    (i: I) => new Channel.Done(O.some(i)),
    () => new Channel.Done(O.none),
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
  return new Channel.NeedInput(
    (i: I) => new Channel.Done(E.right(i)),
    (u: U) => new Channel.Done(E.leftW(u)),
    __trace
  )
}

/**
 * Wait for input forever, calling the given inner `Channel` for each piece of
 * new input. Returns the upstream result type.
 */
export function mapChannel<R, E, L, I, O, A, A1>(
  inner: (i: I) => Channel.Channel<R, E, L, I, O, A, A1>,
  __trace?: string
): Channel.Channel<R, E, L, I, O, A, A> {
  const go: Channel.Channel<R, E, L, I, O, A, A> = new Channel.NeedInput(
    (x) => Channel.chain_(inner(x), () => go),
    (x) => new Channel.Done(x),
    __trace
  )
  return go
}

/**
 * Apply a transformation to all values in a stream, concatenating the output
 * values.
 */
export function mapIterable<A, B>(
  f: (a: A) => Iterable<B>,
  __trace?: string
): Pipeline<unknown, never, A, B> {
  return mapChannel((x: A) => Channel.writeIterable(f(x)), __trace)
}

/**
 * Apply an effectful transformation to all values in a stream
 */
export function mapEffect<R, E, A, B>(
  f: (a: A) => T.Effect<R, E, B>,
  __trace?: string
): Pipeline<R, E, A, B> {
  return mapChannel((x: A) => Channel.writeEffect(f(x)), __trace)
}

/**
 * Apply a managed transformation to all values in a stream
 */
export function mapManaged<R, E, A, B>(
  f: (a: A) => M.Managed<R, E, B>,
  __trace?: string
): Pipeline<R, E, A, B> {
  return mapChannel((x: A) => Channel.writeManaged(f(x)), __trace)
}

/**
 * Apply a transformation to all values in a stream, concatenating the output
 * values.
 */
function function_<A, B>(
  f: (a: A) => B,
  __trace?: string
): Pipeline<unknown, never, A, B> {
  return mapChannel((x: A) => Channel.write(f(x)), __trace)
}

export { function_ as function }

function mapAccumGo<S, A, B>(
  s: S,
  f: (s: S, a: A) => readonly [S, B],
  __trace?: string
): Pipeline<unknown, never, A, B, S> {
  return new Channel.NeedInput(
    (a: A) => {
      const [s1, b] = f(s, a)
      return Channel.chain_(Channel.write(b), () => mapAccumGo(s1, f))
    },
    () => Channel.succeed(s),
    __trace
  )
}

/**
 * Reduces a state S using f while mapping the output
 */
export function mapAccum<S, A, B>(
  s: S,
  f: (s: S, a: A) => readonly [S, B],
  __trace?: string
): Pipeline<unknown, never, A, B, S> {
  return mapAccumGo(s, f, __trace)
}

/**
 * Scan through a stream using f
 */
export function scan<S, A>(
  s: S,
  f: (s: S, a: A) => S,
  __trace?: string
): Pipeline<unknown, never, A, S, S> {
  return mapAccumGo(s, (s, a) => pipe(f(s, a), (x) => [x, x]), __trace)
}
