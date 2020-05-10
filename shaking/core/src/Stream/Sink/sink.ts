import { none, some, Option } from "fp-ts/lib/Option"
import { flow, constant, FunctionN, identity, Predicate } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"

import {
  Effect,
  pure,
  unit,
  apSecond,
  AsyncRE,
  as,
  map as mapEffect,
  chain_
} from "../../Effect"
import { ConcurrentQueue } from "../../Queue"
import { SinkStep, sinkDone, sinkCont, isSinkDone } from "../Step"

export interface Sink<K, R, E, S, A, B> {
  readonly initial: Effect<K, R, E, SinkStep<A, S>>
  step: (state: S, next: A) => Effect<K, R, E, SinkStep<A, S>>
  extract: (step: S) => Effect<K, R, E, B>
}

export interface SinkPure<S, A, B> {
  readonly initial: SinkStep<A, S>
  step: (state: S, next: A) => SinkStep<A, S>
  extract: (state: S) => B
}

/**
 * Step a sink repeatedly.
 * If the sink completes before consuming all of the input, then the done state will include the ops leftovers
 * and anything left in the array
 * @param sink
 * @param s
 * @param multi
 */
export function stepMany<K, R, E, S, A, B>(
  sink: Sink<K, R, E, S, A, B>,
  s: S,
  multi: readonly A[]
): Effect<K, R, E, SinkStep<A, S>> {
  function go(current: SinkStep<A, S>, i: number): Effect<K, R, E, SinkStep<A, S>> {
    if (i === multi.length) {
      return pure(current)
    } else if (isSinkDone(current)) {
      return pure(sinkDone(current.state, current.leftover.concat(multi.slice(i))))
    } else {
      return chain_(sink.step(current.state, multi[i]), (next) => go(next, i + 1))
    }
  }
  return go(sinkCont(s), 0)
}

export function liftPureSink<S, A, B>(
  sink: SinkPure<S, A, B>
): Sink<never, unknown, never, S, A, B> {
  return {
    initial: pure(sink.initial),
    step: (state: S, next: A) => pure(sink.step(state, next)),
    extract: flow(sink.extract, pure)
  }
}

export function collectArraySink<S, R, E, A>(): Sink<S, R, E, A[], A, A[]> {
  const initial = pure(sinkCont([] as A[]))

  function step(state: A[], next: A): Effect<S, R, E, SinkStep<never, A[]>> {
    return pure(sinkCont([...state, next]))
  }

  return { initial, extract: pure, step }
}

export function drainSink<S, R, E, A>(): Sink<S, R, E, void, A, void> {
  const initial = pure(sinkCont(undefined))
  const extract = constant(unit)
  function step(_state: void, _next: A): Effect<S, R, E, SinkStep<never, void>> {
    return pure(sinkCont(undefined))
  }
  return { initial, extract, step }
}

/**
 * A sink that consumes no input to produce a constant b
 * @param b
 */
export function constSink<S, R, E, A, B>(b: B): Sink<S, R, E, void, A, B> {
  const initial = pure(sinkDone(undefined as void, []))
  const extract = constant(pure(b))
  function step(_state: void, _next: A): Effect<S, R, E, SinkStep<any, void>> {
    return pure(sinkDone(undefined as void, []))
  }
  return { initial, extract, step }
}

/**
 * A sink that produces the head element of a stream (if any elements are emitted)
 */
export function headSink<S, R, E, A>(): Sink<S, R, E, Option<A>, A, Option<A>> {
  const initial = pure(sinkCont(none))

  function step(_state: Option<A>, next: A): Effect<S, R, E, SinkStep<any, Option<A>>> {
    return pure(sinkDone(some(next), []))
  }
  return { initial, extract: pure, step }
}

/**
 * A sink that produces the last element of a stream (if any elements are emitted)
 */
export function lastSink<S, R, E, A>(): Sink<S, R, E, Option<A>, A, Option<A>> {
  const initial = pure(sinkCont(none))

  function step(
    _state: Option<A>,
    next: A
  ): Effect<S, R, E, SinkStep<never, Option<A>>> {
    return pure(sinkCont(some(next)))
  }
  return { initial, extract: pure, step }
}

/**
 * A sink that evalutes an action for every element of a sink and produces no value
 * @param f
 */
export function evalSink<S, R, E, A>(
  f: FunctionN<[A], Effect<S, R, E, unknown>>
): Sink<S, R, E, void, A, void> {
  const initial = pure(sinkCont(undefined as void))

  function step(_state: void, next: A): Effect<S, R, E, SinkStep<never, void>> {
    return pipe(f(next), apSecond(pure(sinkCont(_state))))
  }

  const extract = constant(unit)

  return { initial, extract, step }
}

/**
 * A sink that consumes elements for which a predicate does not hold.
 *
 * Returns the first element for which the predicate did hold if such an element is found.
 * @param f
 */
export function drainWhileSink<S, R, E, A>(
  f: Predicate<A>
): Sink<S, R, E, Option<A>, A, Option<A>> {
  const initial = sinkCont(none as Option<A>)

  function step(_state: Option<A>, a: A): SinkStep<any, Option<A>> {
    return f(a) ? sinkCont(none) : sinkDone(some(a), [])
  }

  const extract = identity

  return liftPureSink({ initial, extract, step })
}

/**
 * A sink that offers elements into a concurrent queue
 *
 * @param queue
 */
export function queueSink<R, E, A>(
  queue: ConcurrentQueue<A>
): Sink<unknown, R, E, void, A, void> {
  const initial = pure(sinkCont(undefined))

  function step(_state: void, a: A): AsyncRE<R, E, SinkStep<A, void>> {
    return as(queue.offer(a), sinkCont(undefined))
  }

  const extract = constant(unit)
  return { initial, extract, step }
}

/**
 * A sink that offers elements into a queue after wrapping them in an option.
 *
 * The sink will offer one final none into the queue when the stream terminates
 * @param queue
 */
export function queueOptionSink<A>(
  queue: ConcurrentQueue<Option<A>>
): Sink<unknown, unknown, never, void, A, void> {
  const initial = pure(sinkCont(undefined))

  function step(_state: void, a: A): AsyncRE<unknown, never, SinkStep<A, void>> {
    return as(queue.offer(some(a)), sinkCont(undefined))
  }

  const extract = constant(queue.offer(none))
  return { initial, extract, step }
}

/**
 * Map the output value of a sink
 * @param sink
 * @param f
 */
export function map<K, R, E, S, A, B, C>(
  sink: Sink<K, R, E, S, A, B>,
  f: FunctionN<[B], C>
): Sink<K, R, E, S, A, C> {
  return {
    ...sink,
    extract: flow(sink.extract, mapEffect(f))
  }
}
