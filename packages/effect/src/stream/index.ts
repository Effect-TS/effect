/*
  based on: https://github.com/rzeigler/waveguide-streams/blob/master/src/stream.ts
  credits to original author
 */

import {
  array as A,
  either as Ei,
  eq as EQ,
  function as F,
  option as O,
  pipeable as P,
  apply as AP,
} from "fp-ts";
import { ReadStream } from "fs";
import { Writable, Readable } from "stream";
import { Cause, Interrupt } from "../original/exit";
import * as T from "../effect";
import { Fiber, effect } from "../effect";
import * as deferred from "../deferred";
import { Deferred } from "../deferred";
import * as M from "../managed";
import { Managed, managed } from "../managed";
import { Monad3E } from "../overload";
import * as cq from "../queue";
import { ConcurrentQueue } from "../queue";
import * as ref from "../ref";
import { Ref } from "../ref";
import * as semaphore from "../semaphore";
import {
  collectArraySink,
  drainSink,
  drainWhileSink,
  queueSink,
  Sink,
  stepMany,
} from "./sink";
import { isSinkCont, sinkStepLeftover, sinkStepState } from "./step";
import * as su from "./support";

export type Source<R, E, A> = T.Effect<R, E, O.Option<A>>;

export type Fold<R, E, A> = <S>(
  initial: S,
  cont: F.Predicate<S>,
  step: F.FunctionN<[S, A], T.Effect<R, E, S>>
) => T.Effect<R, E, S>;

export interface StreamT<R, E, A> extends Managed<R, E, Fold<R, E, A>> {}

export interface Stream<R, E, A> {
  _TAG: "Stream";
  _E: E;
  _A: A;
  _R: (_: R) => void;
}

export const toS = <R, E, A>(_: StreamT<R, E, A>): Stream<R, E, A> => _ as any;
export const fromS = <R, E, A>(_: Stream<R, E, A>): StreamT<R, E, A> =>
  _ as any;

// The contract of a Stream's fold is that state is preserved within the lifecycle of the managed
// Therefore, we must track the offset in the array via a ref
// This allows, for instance, this to work with transduce
function arrayFold<A>(
  as: readonly A[]
): Managed<T.NoEnv, T.NoErr, Fold<T.NoEnv, T.NoErr, A>> {
  return M.encaseEffect(
    effect.map(
      ref.makeRef(0),
      (cell) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        f: F.FunctionN<[S, A], T.Effect<T.NoEnv, T.NoErr, S>>
      ) => {
        function step(current: S): T.Effect<T.NoEnv, T.NoErr, S> {
          /* istanbul ignore else */
          if (cont(current)) {
            return P.pipe(
              cell.modify((i) => [i, i + 1] as const), // increment the i
              T.chain((i) =>
                i < as.length
                  ? effect.chain(f(current, as[i]), step)
                  : T.pure(current)
              )
            );
          } else {
            return T.pure(current);
          }
        }
        return step(initial);
      }
    )
  );
}

function iteratorSource<A>(iter: Iterator<A>): Source<T.NoEnv, T.NoErr, A> {
  return T.sync(() => {
    const n = iter.next();
    if (n.done) {
      return O.none;
    }
    return O.some(n.value);
  });
}

function* rangeIterator(
  start: number,
  interval?: number,
  end?: number
): Iterator<number> {
  let current = start;
  while (!end || current < end) {
    yield current;
    current += interval || 1;
  }
}

/**
 * Create a Stream from a source A action.
 *
 * The contract is that the acquisition of the resource should produce a Wave that may be repeatedly evaluated
 * during the scope of the Managed
 * If there is more data in the stream, the Wave should produce some(A) otherwise it should produce none.
 * Once it produces none, it will not be evaluated again.
 * @param r
 */
export function fromSource<R, E, A>(
  r: Managed<R, E, T.Effect<R, E, O.Option<A>>>
): Stream<R, E, A> {
  return toS(
    managed.map(r, (pull) => {
      function fold<S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, A], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> {
        return cont(initial)
          ? P.pipe(
              pull,
              T.chain((out) =>
                P.pipe(
                  out,
                  O.fold(
                    () => T.pure(initial) as T.Effect<R, E, S>,
                    (a) =>
                      effect.chain(step(initial, a), (next) =>
                        fold(next, cont, step)
                      )
                  )
                )
              )
            )
          : T.pure(initial);
      }
      return fold;
    })
  );
}

/**
 * Create a stream from an Array
 * @param as
 */
export function fromArray<A>(as: readonly A[]): Stream<T.NoEnv, T.NoErr, A> {
  return toS(arrayFold(as));
}

/**
 * Create a stream from an iterator
 * @param iter
 */
export function fromIterator<A>(
  iter: F.Lazy<Iterator<A>>
): Stream<T.NoEnv, T.NoErr, A> {
  return P.pipe(
    M.encaseEffect(T.sync(iter)),
    M.map(iteratorSource),
    fromSource
  );
}

/**
 * Create a stream that emits the elements in a range
 * @param start
 * @param interval
 * @param end
 */
export function fromRange(
  start: number,
  interval?: number,
  end?: number
): Stream<T.NoEnv, T.NoErr, number> {
  return fromIterator(() => rangeIterator(start, interval, end));
}

/**
 * Create a stream from an existing iterator
 * @param iter
 */
export function fromIteratorUnsafe<A>(
  iter: Iterator<A>
): Stream<T.NoEnv, T.NoErr, A> {
  return fromIterator(() => iter);
}

/**
 * Create a stream that emits a single element
 * @param a
 */
export function once<A>(a: A): Stream<T.NoEnv, T.NoErr, A> {
  function fold<S>(
    initial: S,
    cont: F.Predicate<S>,
    f: F.FunctionN<[S, A], T.Effect<T.NoEnv, T.NoErr, S>>
  ): T.Effect<T.NoEnv, T.NoErr, S> {
    /* istanbul ignore else */
    if (cont(initial)) {
      return f(initial, a);
    } else {
      return T.pure(initial);
    }
  }
  return toS(M.pure(fold));
}

/**
 * Create a stream that emits As as fast as possible
 *
 * Be cautious when using this. If your entire pipeline is full of synchronous actions you can block the main
 * thread until the stream runs to completion (or forever) using this
 * @param a
 */
export function repeatedly<A>(a: A): Stream<T.NoEnv, T.NoErr, A> {
  function fold<S>(
    initial: S,
    cont: F.Predicate<S>,
    f: F.FunctionN<[S, A], T.Effect<T.NoEnv, T.NoErr, S>>
  ): T.Effect<T.NoEnv, T.NoErr, S> {
    function step(current: S): T.Effect<T.NoEnv, T.NoErr, S> {
      if (cont(current)) {
        return T.shiftAfter(effect.chain(f(current, a), step));
      }
      return T.shiftAfter(T.pure(current));
    }
    return step(initial);
  }

  return toS(M.pure(fold));
}

export function periodically(ms: number): Stream<T.NoEnv, T.NoErr, number> {
  return P.pipe(
    M.encaseEffect(ref.makeRef(-1)),
    M.map((r) =>
      P.pipe(
        T.delay(
          r.update((n) => n + 1),
          ms
        ),
        T.map(O.some)
      )
    ),
    fromSource
  );
}

/**
 * A stream that emits no elements an immediately terminates
 */
export const empty: Stream<T.NoEnv, T.NoErr, never> = toS(
  M.pure(
    <S>(
      initial: S,
      _cont: F.Predicate<S>,
      _f: F.FunctionN<[S, never], T.Effect<T.NoEnv, T.NoErr, S>>
    ) => T.pure(initial)
  )
);

/**
 * Create a stream that evalutes w to emit a single element
 * @param w
 */
export function encaseEffect<R, E, A>(w: T.Effect<R, E, A>): Stream<R, E, A> {
  function fold<S>(
    initial: S,
    cont: F.Predicate<S>,
    step: F.FunctionN<[S, A], T.Effect<R, E, S>>
  ): T.Effect<R, E, S> {
    /* istanbul ignore else */
    if (cont(initial)) {
      return P.pipe(
        w,
        T.chain((a) => step(initial, a))
      );
    } else {
      return T.pure(initial);
    }
  }
  return toS(M.pure(fold) as StreamT<R, E, A>);
}

/**
 * Create a stream that immediately fails
 * @param e
 */
export function raised<E>(e: E): Stream<T.NoEnv, E, never> {
  return encaseEffect(T.raiseError(e));
}

/**
 * Create a stream that immediately aborts
 * @param e
 */
export function aborted(e: unknown): Stream<T.NoEnv, T.NoErr, never> {
  return encaseEffect(T.raiseAbort(e));
}

/**
 * Create a stream that immediately emits either 0 or 1 elements
 * @param opt
 */
export function fromOption<A>(opt: O.Option<A>): Stream<T.NoEnv, T.NoErr, A> {
  return P.pipe(
    opt,
    O.fold(F.constant((empty as any) as Stream<T.NoEnv, T.NoErr, A>), once)
  );
}

/**
 * Zip all stream elements with their index ordinals
 * @param stream
 */
export function zipWithIndex<R, E, A>(
  stream: Stream<R, E, A>
): Stream<R, E, readonly [A, number]> {
  return toS(
    managed.map(fromS(stream), (fold) => {
      function zipFold<S>(
        initial: S,
        cont: F.Predicate<S>,
        f: F.FunctionN<[S, readonly [A, number]], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> {
        const folded = fold<readonly [S, number]>(
          [initial, 0 as number],
          (s) => cont(s[0]),
          ([s, i], a) => effect.map(f(s, [a, i]), (s) => [s, i + 1])
        );
        return effect.map(folded, (s) => s[0]);
      }

      return zipFold;
    })
  );
}

function widen<R2, E2>(): <R, E, A>(
  stream: Stream<R, E, A>
) => Stream<R & R2, E | E2, A> {
  return (stream) => stream as any;
}

/**
 * Create a stream that emits all the elements of stream1 followed by all the elements of stream2
 * @param stream1
 * @param stream2
 */
function concatL_<R, E, A, R2, E2>(
  stream1: Stream<R, E, A>,
  stream2: F.Lazy<Stream<R2, E2, A>>
): Stream<R & R2, E | E2, A> {
  const w1 = fromS(widen<R2, E2>()(stream1));
  const w2 = () => fromS(widen<R, E>()(stream2()));

  function fold<S>(
    initial: S,
    cont: F.Predicate<S>,
    step: F.FunctionN<[S, A], T.Effect<R & R2, E | E2, S>>
  ): T.Effect<R & R2, E | E2, S> {
    return P.pipe(
      M.use(w1, (fold1) => fold1(initial, cont, step)),
      T.chain((intermediate) => {
        /* istanbul ignore else */
        if (cont(intermediate)) {
          return M.use(w2(), (fold2) => fold2(intermediate, cont, step));
        } else {
          return T.pure(intermediate);
        }
      })
    );
  }
  return toS(M.pure(fold));
}

export function concatL<A, R2, E2>(stream2: F.Lazy<Stream<R2, E2, A>>) {
  return <R, E>(s: Stream<R, E, A>) => concatL_(s, stream2);
}

/**
 * Strict form of concatL
 * @param stream1
 * @param stream2
 */
function concat_<R, E, A, R2, E2>(
  stream1: Stream<R, E, A>,
  stream2: Stream<R2, E2, A>
): Stream<R & R2, E | E2, A> {
  return concatL_(stream1, F.constant(stream2));
}

export function concat<A, R2, E2>(stream2: Stream<R2, E2, A>) {
  return <R, E>(s: Stream<R, E, A>) => concat_(s, stream2);
}

/**
 * Creates a stream that repeatedly emits the elements of a stream forever.
 *
 * The elements are not cached, any effects required (i.e. opening files or sockets) are repeated for each cycle
 * @param stream
 */
export function repeat<R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> {
  return concatL_(stream, () => repeat(stream));
}

function map_<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[A], B>
): Stream<R, E, B> {
  return toS(
    managed.map(
      fromS(stream),
      (outer) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, B], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> => outer(initial, cont, (s, a) => step(s, f(a)))
    )
  );
}

/**
 * Map the elements of a stream
 * @param stream
 * @param f
 */
export function map<R, A, B>(
  f: F.FunctionN<[A], B>
): <E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (stream) => map_(stream, f);
}

/**
 * Map every element emitted by stream to b
 * @param stream
 * @param b
 */
function as_<R, E, A, B>(stream: Stream<R, E, A>, b: B): Stream<R, E, B> {
  return map_(stream, F.constant(b));
}

export function as<B>(b: B) {
  return <R, E, A>(s: Stream<R, E, A>) => as_(s, b);
}

/**
 * Filter the elements of a stream by a predicate
 * @param stream
 * @param f
 */
function filter_<R, E, A>(
  stream: Stream<R, E, A>,
  f: F.Predicate<A>
): Stream<R, E, A> {
  return toS(
    managed.map(
      fromS(stream),
      (outer) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, A], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> =>
        outer(initial, cont, (s, a) => (f(a) ? step(s, a) : T.pure(s)))
    )
  );
}

export function filter<A>(f: F.Predicate<A>) {
  return <R, E>(s: Stream<R, E, A>) => filter_(s, f);
}

function filterRefine_<R, E, A, B extends A>(
  stream: Stream<R, E, A>,
  f: F.Refinement<A, B>
): Stream<R, E, B> {
  return map_(filter_(stream, f), (x) => x as B);
}

export function filterRefine<A, B extends A>(f: F.Refinement<A, B>) {
  return <R, E>(s: Stream<R, E, A>) => filterRefine_(s, f);
}

/**
 * Filter the stream so that only items that are not equal to the previous item emitted are emitted
 * @param eq
 */
function distinctAdjacent_<R, E, A>(
  stream: Stream<R, E, A>,
  eq: EQ.Eq<A>
): Stream<R, E, A> {
  return toS(
    managed.map(
      fromS(stream),
      (base) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, A], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> => {
        const init: [S, O.Option<A>] = [initial, O.none];
        const c: F.Predicate<[S, O.Option<A>]> = ([s]) => cont(s);
        function stp(
          current: [S, O.Option<A>],
          next: A
        ): T.Effect<R, E, [S, O.Option<A>]> {
          return P.pipe(
            current[1],
            O.fold(
              // We haven't seen anything so just return
              () =>
                effect.map(step(current[0], next), (s) => [s, O.some(next)]),
              (seen) =>
                eq.equals(seen, next)
                  ? T.pure(current)
                  : effect.map(step(current[0], next), (s) => [s, O.some(next)])
            )
          );
        }
        return effect.map(base(init, c, stp), (s) => s[0]);
      }
    )
  );
}

export function distinctAdjacent<A>(eq: EQ.Eq<A>) {
  return <R, E>(s: Stream<R, E, A>) => distinctAdjacent_(s, eq);
}

/**
 * Fold the elements of this stream together using an effect.
 *
 * The resulting stream will emit 1 element produced by the effectful fold
 * @param stream
 * @param f
 * @param seed
 */
function foldM_<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[B, A], T.Effect<R2, E2, B>>,
  seed: B
): Stream<R & R2, E | E2, B> {
  return toS(
    managed.map(
      fromS(widen<R2, E2>()(stream)),
      (base) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, B], T.Effect<R & R2, E | E2, S>>
      ): T.Effect<R & R2, E | E2, S> => {
        /* istanbul ignore else */
        if (cont(initial)) {
          return effect.chain(base(seed, F.constant(true), f), (result) =>
            step(initial, result)
          );
        } else {
          return T.pure(initial);
        }
      }
    )
  );
}

export function foldM<A, R2, E2, B>(
  seed: B,
  f: F.FunctionN<[B, A], T.Effect<R2, E2, B>>
) {
  return <R, E>(s: Stream<R, E, A>) => foldM_(s, f, seed);
}

/**
 * Fold the elements of a stream together purely
 * @param stream
 * @param f
 * @param seed
 */
function fold_<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[B, A], B>,
  seed: B
): Stream<R, E, B> {
  return foldM_(stream, (b, a) => T.pure(f(b, a)), seed);
}

function t2<A, B>(a: A, b: B): readonly [A, B] {
  return [a, b];
}

export function fold<A, B>(seed: B, f: F.FunctionN<[B, A], B>) {
  return <R, E>(s: Stream<R, E, A>) => fold_(s, f, seed);
}

/**
 * Scan across the elements the stream.
 *
 * This is like foldM but emits every intermediate seed value in the resulting stream.
 * @param stream
 * @param f
 * @param seed
 */
function scanM_<R, E, A, B, R2, E2>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[B, A], T.Effect<R2, E2, B>>,
  seed: B
): Stream<R & R2, E | E2, B> {
  return concat_(
    once(seed),
    toS(
      P.pipe(
        M.zip(
          fromS(widen<R2, E2>()(stream)),
          M.encaseEffect(ref.makeRef(seed))
        ),
        M.map(([base, accum]) => {
          function fold<S>(
            initial: S,
            cont: F.Predicate<S>,
            step: F.FunctionN<[S, B], T.Effect<R & R2, E | E2, S>>
          ): T.Effect<R & R2, E | E2, S> {
            /* istanbul ignore else */
            if (cont(initial)) {
              // We need to figure out how to drive the base fold for a single step
              // Thus, we switch state from true to false on execution
              return P.pipe(
                accum.get,
                T.chain((b) =>
                  base(
                    t2(b, true),
                    (s) => s[1],
                    (s, a) => effect.map(f(s[0], a), (r) => t2(r, false))
                  )
                ),
                T.chain(
                  // If this is still true, we didn't consume anything so advance
                  (s) =>
                    s[1]
                      ? T.pure(initial)
                      : T.applySecond(
                          accum.set(s[0]),
                          effect.chain(step(initial, s[0]), (next) =>
                            fold(next, cont, step)
                          )
                        )
                )
              );
            } else {
              return T.pure(initial);
            }
          }
          return fold;
        })
      )
    )
  );
}

export function scanM<A, B, R2, E2>(
  seed: B,
  f: F.FunctionN<[B, A], T.Effect<R2, E2, B>>
) {
  return <R, E>(s: Stream<R, E, A>) => scanM_(s, f, seed);
}

/**
 * Purely scan a stream
 * @param stream
 * @param f
 * @param seed
 */
function scan_<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[B, A], B>,
  seed: B
): Stream<R, E, B> {
  return scanM_(stream, (b, a) => T.pure(f(b, a)), seed);
}

export function scan<A, B>(seed: B, f: F.FunctionN<[B, A], B>) {
  return <R, E>(s: Stream<R, E, A>) => scan_(s, f, seed);
}

function chain_<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[A], Stream<R2, E2, B>>
): Stream<R & R2, E | E2, B> {
  return toS(
    managed.map(
      fromS(widen<R2, E2>()(stream)),
      (outerfold) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, B], T.Effect<R & R2, E | E2, S>>
      ): T.Effect<R & R2, E | E2, S> =>
        outerfold(initial, cont, (s, a) => {
          /* istanbul ignore next */
          if (cont(s)) {
            const inner = widen<R, E>()(f(a));
            return M.use(fromS(inner), (innerfold) => innerfold(s, cont, step));
          } else {
            return T.pure(s);
          }
        })
    )
  );
}

/**
 * Monadic chain on a stream
 * @param stream
 * @param f
 */
export function chain<A, R2, E2, B>(
  f: F.FunctionN<[A], Stream<R2, E2, B>>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R2, E | E2, B> {
  return <R, E>(stream: Stream<R, E, A>) =>
    toS(
      managed.map(
        fromS(widen<R2, E2>()(stream)),
        (outerfold) => <S>(
          initial: S,
          cont: F.Predicate<S>,
          step: F.FunctionN<[S, B], T.Effect<R & R2, E | E2, S>>
        ): T.Effect<R & R2, E | E2, S> =>
          outerfold(initial, cont, (s, a) => {
            /* istanbul ignore next */
            if (cont(s)) {
              const inner = widen<R, E>()(f(a));
              return M.use(fromS(inner), (innerfold) =>
                innerfold(s, cont, step)
              );
            } else {
              return T.pure(s);
            }
          })
      )
    );
}

/**
 * Flatten a stream of streams
 * @param stream
 */
export function flatten<R, E, R2, E2, A>(
  stream: Stream<R, E, Stream<R2, E2, A>>
): Stream<R & R2, E | E2, A> {
  return chain_(stream, F.identity);
}

/**
 * Map each element of the stream effectfully
 * @param stream
 * @param f
 */
function mapM_<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[A], T.Effect<R2, E2, B>>
): Stream<R & R2, E | E2, B> {
  return chain_(stream, (a) => encaseEffect(f(a)));
}

export function mapM<A, R2, E2, B>(f: F.FunctionN<[A], T.Effect<R2, E2, B>>) {
  return <R, E>(s: Stream<R, E, A>) => mapM_(s, f);
}

/**
 * A stream that emits no elements but never terminates.
 */
export const never: Stream<T.NoEnv, T.NoErr, never> = mapM_(
  once(undefined),
  F.constant(T.never)
);

type TDuceFused<FoldState, SinkState> = readonly [
  FoldState,
  SinkState,
  boolean
];

/**
 * Transduce a stream via a sink.
 *
 * This repeatedly run a sink to completion on the elements of the input stream and emits the result of each run
 * Leftovers from a previous run are fed to the next run
 *
 * @param stream
 * @param sink
 */
function transduce_<R, E, A, R2, E2, S, B>(
  stream: Stream<R, E, A>,
  sink: Sink<R2, E2, S, A, B>
): Stream<R & R2, E | E2, B> {
  return toS(
    managed.map(
      fromS(widen<R2, E2>()(stream)),
      (base) => <S0>(
        initial: S0,
        cont: F.Predicate<S0>,
        step: F.FunctionN<[S0, B], T.Effect<R & R2, E | E2, S0>>
      ): T.Effect<R & R2, E | E2, S0> => {
        function feedSink(
          foldState: S0,
          sinkState: S,
          chunk: A[]
        ): T.Effect<R & R2, E | E2, TDuceFused<S0, S>> {
          return effect.chain(
            stepMany(sink, sinkState, chunk),
            (nextSinkStep) =>
              isSinkCont(nextSinkStep)
                ? // We need to let more data in to drive the sink
                  T.pure([foldState, nextSinkStep.state, true] as const)
                : // We have a completion, so extract the value and then use it to advance the fold state
                  P.pipe(
                    sinkStepState(nextSinkStep),
                    sink.extract,
                    T.chain((b) => step(foldState, b)),
                    T.chain((nextFoldState) => {
                      const leftover = sinkStepLeftover(nextSinkStep);
                      // We will re-initialize the sink
                      return P.pipe(
                        sink.initial,
                        T.chain((nextNextSinkState) => {
                          if (cont(nextFoldState) && leftover.length > 0) {
                            return feedSink(
                              nextFoldState,
                              nextNextSinkState.state,
                              leftover as A[]
                            );
                          } else {
                            return T.pure([
                              nextFoldState,
                              nextNextSinkState.state,
                              false as boolean,
                            ] as const);
                          }
                        })
                      );
                    })
                  )
          );
        }

        const derivedInitial = effect.map(
          sink.initial,
          (initSink) =>
            [initial, sinkStepState(initSink), false] as TDuceFused<S0, S>
        );

        return P.pipe(
          derivedInitial,
          T.chain((init) =>
            base(
              init,
              (s) => cont(s[0]),
              (s, a) => feedSink(s[0], s[1], [a])
            )
          ),
          T.chain(([foldState, sinkState, extract]) =>
            extract && cont(foldState)
              ? effect.chain(sink.extract(sinkState), (b) => step(foldState, b))
              : T.pure(foldState)
          )
        );
      }
    )
  );
}

export function transduce<A, R2, E2, S, B>(sink: Sink<R2, E2, S, A, B>) {
  return <R, E>(s: Stream<R, E, A>) => transduce_(s, sink);
}

/**
 * Drop some number of elements from a stream
 *
 * Their effects to be produced still occur in the background
 * @param stream
 * @param n
 */
function drop_<R, E, A>(stream: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return P.pipe(
    zipWithIndex(stream),
    filter(([_, i]) => i >= n),
    map(([a]) => a)
  );
}

export function drop(n: number) {
  return <R, E, A>(s: Stream<R, E, A>) => drop_(s, n);
}

/**
 * Take some number of elements of a stream
 * @param stream
 * @param n
 */
function take_<R, E, A>(stream: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return toS(
    managed.map(
      fromS(stream),
      (fold) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, A], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> =>
        effect.map(
          fold(
            t2(initial, 0),
            (t2s) => t2s[1] < n && cont(t2s[0]),
            (s, a) => effect.map(step(s[0], a), (next) => t2(next, s[1] + 1))
          ),
          (t2s) => t2s[0]
        )
    )
  );
}

export function take(n: number) {
  return <R, E, A>(s: Stream<R, E, A>) => take_(s, n);
}

/**
 * Take elements of a stream while a predicate holds
 * @param stream
 * @param pred
 */
function takeWhile_<R, E, A>(
  stream: Stream<R, E, A>,
  pred: F.Predicate<A>
): Stream<R, E, A> {
  return toS(
    managed.map(
      fromS(stream),
      (fold) => <S>(
        initial: S,
        cont: F.Predicate<S>,
        step: F.FunctionN<[S, A], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> =>
        effect.map(
          fold(
            t2(initial, true),
            (t2s) => t2s[1] && cont(t2s[0]),
            (s, a) =>
              pred(a)
                ? effect.map(step(s[0], a), (next) => t2(next, true))
                : T.pure(t2(s[0], false))
          ),
          (t2s) => t2s[0]
        )
    )
  );
}

export function takeWhile<A>(pred: F.Predicate<A>) {
  return <R, E>(s: Stream<R, E, A>) => takeWhile_(s, pred);
}

/**
 * Push a stream into a sink to produce the sink's result
 * @param stream
 * @param sink
 */
function into_<R, E, A, R2, E2, S, B>(
  stream: Stream<R, E, A>,
  sink: Sink<R2, E2, S, A, B>
): T.Effect<R & R2, E | E2, B> {
  return M.use(fromS(widen<R2, E2>()(stream)), (fold) =>
    P.pipe(
      sink.initial,
      T.chain((init) =>
        fold(init, isSinkCont, (s, a) => sink.step(s.state, a))
      ),
      T.map((s) => s.state),
      T.chain(sink.extract)
    )
  );
}

export function into<A, R2, E2, S, B>(sink: Sink<R2, E2, S, A, B>) {
  return <R, E>(s: Stream<R, E, A>) => into_(s, sink);
}

/**
 * Push a stream into a sink to produce the sink's result
 * @param stream
 * @param managedSink
 */
function intoManaged_<R, E, A, S, B, R2, E2>(
  stream: Stream<R, E, A>,
  managedSink: Managed<R2, E2, Sink<R2, E2, S, A, B>>
): T.Effect<R & R2, E | E2, B> {
  return M.use(managedSink, (sink) => into_(stream, sink));
}

export function intoManaged<R2, E2, A, S, B>(
  managedSink: Managed<R2, E2, Sink<R2, E2, S, A, B>>
) {
  return <R, E>(s: Stream<R, E, A>) => intoManaged_(s, managedSink);
}

/**
 * Push a stream in a sink to produce the result and the leftover
 * @param stream
 * @param sink
 */
function intoLeftover_<R, E, A, S, B, R2, E2>(
  stream: Stream<R, E, A>,
  sink: Sink<R2, E2, S, A, B>
): T.Effect<R & R2, E | E2, readonly [B, readonly A[]]> {
  return M.use((stream as any) as StreamT<R & R2, E | E2, A>, (fold) =>
    P.pipe(
      sink.initial,
      T.chain((init) =>
        fold(init, isSinkCont, (s, a) => sink.step(s.state, a))
      ),
      T.chain((end) =>
        effect.map(
          sink.extract(end.state),
          (b) => [b, sinkStepLeftover(end)] as const
        )
      )
    )
  );
}

export function intoLeftover<A, S, B, R2, E2>(sink: Sink<R2, E2, S, A, B>) {
  return <R, E>(s: Stream<R, E, A>) => intoLeftover_(s, sink);
}

function sinkQueue<R, E, A>(
  stream: Stream<R, E, A>
): Managed<
  R,
  E,
  readonly [ConcurrentQueue<O.Option<A>>, Deferred<R, E, O.Option<A>>]
> {
  return managed.chain(
    M.zip(
      // 0 allows maximum backpressure throttling (i.e. a reader must be waiting already to produce the item)
      M.encaseEffect(cq.boundedQueue<O.Option<A>>(0)),
      M.encaseEffect(deferred.makeDeferred<R, E, O.Option<A>, E>())
    ),
    ([q, latch]) => {
      const write = effect.foldExit(
        into_(map_(stream, O.some), queueSink(q)) as T.Effect<R, E, void>,
        (c) => latch.cause(c),
        F.constant(q.offer(O.none))
      );

      return M.as(M.fiber(write), [q, latch] as const);
    }
  );
}

/**
 * Zip two streams together termitating when either stream is exhausted
 * @param as
 * @param bs
 * @param f
 */
function zipWith_<R, E, A, R2, E2, B, C>(
  as: Stream<R, E, A>,
  bs: Stream<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
): Stream<R & R2, E | E2, C> {
  const source = M.zipWith(
    sinkQueue(as),
    sinkQueue(bs),
    ([aq, alatch], [bq, blatch]) => {
      const atake = P.pipe(
        aq.take,
        T.chainTap((opt) =>
          P.pipe(
            opt,
            O.fold(
              // Confirm we have seen the last element
              () => alatch.done(O.none),
              () => T.unit // just keep going
            )
          )
        )
      );
      const agrab = T.raceFirst(atake, alatch.wait);
      const btake = P.pipe(
        bq.take,
        T.chainTap((opt) =>
          P.pipe(
            opt,
            O.fold(
              // Confirm we have seen the last element
              () => blatch.done(O.none),
              () => T.unit // just keep going
            )
          )
        )
      );
      const bgrab = T.raceFirst(btake, blatch.wait);

      return T.zipWith(agrab, bgrab, (aOpt, bOpt) =>
        O.option.chain(aOpt, (a) => O.option.map(bOpt, (b) => f(a, b)))
      );
    }
  );
  return fromSource(source);
}

export function zipWith<A, R2, E2, B, C>(
  bs: Stream<R2, E2, B>,
  f: F.FunctionN<[A, B], C>
) {
  return <R, E>(s: Stream<R, E, A>) => zipWith_(s, bs, f);
}

/**
 * zipWith to form tuples
 * @param as
 * @param bs
 */
function zip_<R, E, A, R2, E2, B>(
  as: Stream<R, E, A>,
  bs: Stream<R2, E2, B>
): Stream<R & R2, E | E2, readonly [A, B]> {
  return zipWith_(as, bs, (a, b) => [a, b] as const);
}

export function zip<R2, E2, B>(bs: Stream<R2, E2, B>) {
  return <R, E, A>(as: Stream<R, E, A>) => zip_(bs, as);
}

/**
 * Given a queue and a Deferred for signalling exits construct a Wave of a pull operation.
 * The protocol is that errors are propogated through the latch and the latch can be used to track completion.
 * Once a none is received through the queue, this read process completes the latch with none to to make the finish durable
 * in the face of repeated reads (which is important for peel)
 *
 * @param queue
 * @param breaker
 */
function queueBreakerSource<R, E, A>(
  queue: ConcurrentQueue<O.Option<A>>,
  breaker: Deferred<R, E, O.Option<A>>
): T.Effect<R, E, O.Option<A>> {
  const take = P.pipe(
    queue.take,
    T.chainTap((opt) =>
      P.pipe(
        opt,
        O.fold(
          // Confirm we have seen the last element by closing the breaker so subsequent reads see it
          F.constant(breaker.done(O.none)),
          // do nothing to the breaker if we got an element
          F.constant(T.unit)
        )
      )
    )
  );
  return T.raceFirst(take, breaker.wait);
}

/**
 * Construct a Source for a Stream.
 * During the scope of the Managed, Wave will repeatedly pull items from a queue being managed in the background
 * @param stream
 */
function streamQueueSource<R, E, A>(
  stream: Stream<R, E, A>
): Managed<R, E, T.Effect<R, E, O.Option<A>>> {
  return managed.map(sinkQueue(stream), ([q, breaker]) =>
    queueBreakerSource(q, breaker)
  );
}

/**
 * Feed a stream into a sink to produce a value.
 *
 * Emits the value and a 'remainder' stream that includes the rest of the elements of the input stream.
 * @param stream
 * @param sink
 */
function peel_<R, E, A, S, B, R2, E2>(
  stream: Stream<R, E, A>,
  sink: Sink<R2, E2, S, A, B>
): Stream<R & R2, E | E2, readonly [B, Stream<R & R2, E | E2, A>]> {
  return managed.chain(streamQueueSource(stream), (pull) => {
    const pullStream = fromSource<R & R2, E | E2, A>(
      (M.pure(pull) as any) as Managed<
        R & R2,
        E | E2,
        T.Effect<R & R2, E | E2, O.Option<A>>
      >
    );
    // We now have a shared pull instantiation that we can use as a sink to drive and return as a stream
    return P.pipe(
      encaseEffect(intoLeftover_(pullStream, sink)),
      map(([b, left]) => [b, concat_(fromArray(left), pullStream)] as const)
    ) as any;
  }) as any;
}

export function peel<A, S, B, R2, E2>(sink: Sink<R2, E2, S, A, B>) {
  return <R, E>(s: Stream<R, E, A>) => peel_(s, sink);
}

function peelManaged_<R, E, A, S, B, R2, E2>(
  stream: Stream<R, E, A>,
  managedSink: Managed<R2, E2, Sink<R2, E2, S, A, B>>
): Stream<R & R2, E | E2, readonly [B, Stream<R & R2, E | E2, A>]> {
  return toS(managed.chain(managedSink, (sink) => fromS(peel_(stream, sink))));
}

export function peelManaged<A, S, B, R2, E2>(
  managedSink: Managed<R2, E2, Sink<R2, E2, S, A, B>>
) {
  return <R, E>(s: Stream<R, E, A>) => peelManaged_(s, managedSink);
}

function interruptFiberSlot(
  slot: Ref<O.Option<Fiber<never, void>>>
): T.Effect<T.NoEnv, T.NoErr, O.Option<Interrupt>> {
  return effect.chain(slot.get, (optFiber) =>
    P.pipe(
      optFiber,
      O.fold(
        () => T.pure(O.none),
        (f) => T.effect.map(f.interrupt, O.some)
      )
    )
  );
}

function waitFiberSlot(
  slot: Ref<O.Option<Fiber<never, void>>>
): T.Effect<T.NoEnv, T.NoErr, void> {
  return effect.chain(slot.get, (optFiber) =>
    P.pipe(
      optFiber,
      O.fold(
        () => T.pure(undefined as void),
        (f) => T.asUnit(f.wait)
      )
    )
  );
}

function singleFiberSlot(): Managed<
  T.NoEnv,
  T.NoErr,
  Ref<O.Option<Fiber<never, void>>>
> {
  return M.bracket(
    ref.makeRef<O.Option<Fiber<never, void>>>(O.none),
    interruptFiberSlot
  );
}

/**
 * Create a stream that switches to emitting elements of the most recent input stream.
 * @param stream
 */
export function switchLatest<R, E, A>(
  stream: Stream<R, E, Stream<R, E, A>>
): Stream<R, E, A> {
  const source = managed.chain(streamQueueSource(stream), (
    pull // read streams
  ) =>
    managed.chain(
      M.zip(
        // The queue and latch to push into
        M.encaseEffect(cq.boundedQueue<O.Option<A>>(0)),
        M.encaseEffect(deferred.makeDeferred<R, E, O.Option<A>, E>())
      ),
      ([pushQueue, pushBreaker]) =>
        // The internal latch that can be used to signal failures and shut down the read process
        managed.chain(
          M.encaseEffect(deferred.makeDeferred<T.NoEnv, never, Cause<E>, E>()),
          (internalBreaker) =>
            // somewhere to hold the currently running fiber so we can interrupt it on termination
            managed.chain(singleFiberSlot(), (fiberSlot) => {
              const interruptPushFiber = interruptFiberSlot(fiberSlot);
              // Spawn a fiber that should push elements from stream into pushQueue as long as it is able
              function spawnPushFiber(
                stream: Stream<R, E, A>
              ): T.Effect<R, never, O.Option<Interrupt>> {
                const writer = P.pipe(
                  // The writer process pushes things into the queue
                  into_(map_(stream, O.some), queueSink(pushQueue)) as any,
                  // We need to trap any errors that occur and send those to internal latch to halt the process
                  // Dont' worry about interrupts, because we perform cleanups for single fiber slot
                  T.foldExit(
                    (e: Cause<E>) => internalBreaker.done(e),
                    F.constant(T.pure(undefined)) // we can do nothing because we will delegate to the proxy
                  )
                );

                return T.applyFirst(
                  interruptPushFiber,
                  effect.chain(T.fork(writer), (f) => fiberSlot.set(O.some(f)))
                );
              }

              // pull streams and setup the push fibers appropriately
              function advanceStreams(): T.Effect<R, never, void> {
                // We need a way of looking ahead to see errors in the output streams in order to cause termination
                // The push fiber will generate this when it encounters a failure
                const breakerError = effect.chain(
                  internalBreaker.wait,
                  T.raised
                );

                return effect.foldExit(
                  T.raceFirst(pull, breakerError),
                  // In the event of an error either from pull or from upstream we need to shut everything down
                  // On managed unwind the active production fiber will be interrupted if there is one
                  (cause) => pushBreaker.cause(cause),
                  (nextOpt) =>
                    P.pipe(
                      nextOpt,
                      O.fold(
                        // nothing left, so we should wait the push fiber's completion and then forward the termination
                        () =>
                          P.pipe(
                            T.race(breakerError, waitFiberSlot(fiberSlot)),
                            T.foldExit(
                              (c) => pushBreaker.cause(c), // if we get a latchError forward it through to downstream
                              F.constant(pushQueue.offer(O.none)) // otherwise we are done, so lets forward that
                            )
                          ),
                        (next) =>
                          T.applySecondL(spawnPushFiber(next), advanceStreams)
                      )
                    )
                );
              }
              // We can configure this source now, but it will be invalid outside of running fibers
              // Thus we can use managed.fiber
              const downstreamSource = queueBreakerSource(
                pushQueue,
                pushBreaker
              );
              return M.as(M.fiber(advanceStreams()), downstreamSource);
            })
        )
    )
  );
  return fromSource(source);
}

/**
 * Create a stream that switches to emitting the elements of the most recent stream produced by applying f to the
 * element most recently emitted
 * @param stream
 * @param f
 */

/* istanbul ignore next */
function chainSwitchLatest_<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[A], Stream<R2, E2, B>>
): Stream<R & R2, E | E2, B> {
  return switchLatest(
    map_(widen<R2, E2>()(stream), (a) => widen<R, E>()(f(a)))
  );
}

/* istanbul ignore next */
export function chainSwitchLatest<A, R2, E2, B>(
  f: F.FunctionN<[A], Stream<R2, E2, B>>
) {
  return <R, E>(s: Stream<R, E, A>) => chainSwitchLatest_(s, f);
}

interface Weave {
  attach(
    action: T.Effect<T.NoEnv, never, void>
  ): T.Effect<T.NoEnv, never, void>;
}

type WeaveHandle = readonly [number, Fiber<never, void>];

function interruptWeaveHandles(
  ref: Ref<WeaveHandle[]>
): T.Effect<T.NoEnv, T.NoErr, void> {
  return effect.chain(ref.get, (fibers) =>
    T.asUnit(A.array.traverse(T.effect)(fibers, (fiber) => fiber[1].interrupt))
  );
}

// Track many fibers for the purpose of clean interruption on failure
const makeWeave: Managed<T.NoEnv, never, Weave> = managed.chain(
  M.encaseEffect(ref.makeRef(0)),
  (cell) =>
    // On cleanup we want to interrupt any running fibers
    managed.map(
      M.bracket(ref.makeRef<WeaveHandle[]>([]), interruptWeaveHandles),
      (store) => {
        function attach(
          action: T.Effect<T.NoEnv, never, void>
        ): T.Effect<T.NoEnv, never, void> {
          return P.pipe(
            AP.sequenceS(T.effect)({
              next: cell.update((n) => n + 1),
              fiber: T.fork(action),
            }),
            T.chainTap(({ next, fiber }) =>
              store.update((handles) => [...handles, [next, fiber] as const])
            ),
            T.chainTap(({ next, fiber }) =>
              T.fork(
                T.applySecond(
                  fiber.wait,
                  store.update(A.filter((h) => h[0] !== next))
                )
              )
            ),
            T.asUnit
          );
        }
        return { attach };
      }
    )
);

/**
 * Merge a stream of streams into a single stream.
 *
 * This stream will run up to maxActive streams concurrently to produce values into the output stream.
 * @param stream the input stream
 * @param maxActive the maximum number of streams to hold active at any given time
 * this controls how much active streams are able to collectively produce in the face of a slow downstream consumer
 */
function merge_<R, E, A, R2, E2>(
  stream: Stream<R, E, Stream<R2, E2, A>>,
  maxActive: number
): Stream<R & R2, E | E2, A> {
  const source = managed.chain(streamQueueSource(stream), (pull) =>
    managed.chain(M.encaseEffect(semaphore.makeSemaphore(maxActive)), (sem) =>
      // create the queue that output will be forced into
      managed.chain(
        M.encaseEffect(cq.boundedQueue<O.Option<A>>(0)),
        (pushQueue) =>
          // create the mechanism t hrough which we can signal completion
          managed.chain(
            M.encaseEffect(
              deferred.makeDeferred<R & R2, E | E2, O.Option<A>, E | E2>()
            ),
            (pushBreaker) =>
              managed.chain(makeWeave, (weave) =>
                managed.chain(
                  M.encaseEffect(
                    deferred.makeDeferred<
                      T.NoEnv,
                      never,
                      Cause<E | E2>,
                      E | E2
                    >()
                  ),
                  (internalBreaker) => {
                    // create a wave action that will proxy elements created by running the stream into the push queue
                    // if any errors occur, we set the breaker
                    function spawnPushFiber(
                      stream: Stream<R2, E2, A>
                    ): T.Effect<R2, never, void> {
                      const writer = P.pipe(
                        // Process to sink elements into the queue
                        into_(
                          map_(stream, O.some),
                          queueSink(pushQueue)
                        ) as any,
                        // TODO: I don't think we need to handle interrupts, it shouldn't be possible
                        T.foldExit(
                          (e: Cause<E>) => internalBreaker.done(e),
                          F.constant(T.pure(undefined))
                        )
                      );
                      return weave.attach(sem.withPermit(writer)); // we need a permit to start
                    }

                    // The action that will pull a single stream upstream and attempt to activate it to push downstream
                    function advanceStreams(): T.Effect<R & R2, never, void> {
                      const breakerError = effect.chain(
                        internalBreaker.wait,
                        T.raised
                      );

                      return effect.foldExit(
                        T.raceFirst(
                          pull, // we don't want to pull until there is capacity
                          breakerError
                        ),
                        (c) => pushBreaker.cause(c), // if upstream errored, we should push the failure downstream immediately
                        (
                          nextOpt // otherwise we should
                        ) =>
                          P.pipe(
                            nextOpt,
                            O.fold(
                              // The end has occured
                              F.constant(
                                P.pipe(
                                  // We will wait for an error or all active produces to finish
                                  T.race(breakerError, sem.acquireN(maxActive)),
                                  T.foldExit(
                                    (c) => pushBreaker.cause(c),
                                    F.constant(pushQueue.offer(O.none))
                                  )
                                )
                              ),
                              // Start the push fiber and then keep going
                              (next) =>
                                T.applySecondL(
                                  sem.withPermit(spawnPushFiber(next)),
                                  F.constant(advanceStreams())
                                )
                            )
                          )
                      );
                    }
                    const downstreamSource = queueBreakerSource(
                      pushQueue,
                      pushBreaker
                    );
                    return M.as(M.fiber(advanceStreams()), downstreamSource);
                  }
                )
              )
          )
      )
    )
  );
  return fromSource(source);
}

export function merge(maxActive: number) {
  return <R, E, A, R2, E2>(stream: Stream<R, E, Stream<R2, E2, A>>) =>
    merge_(stream, maxActive);
}

function chainMerge_<R, E, A, B, R2, E2>(
  stream: Stream<R, E, A>,
  f: F.FunctionN<[A], Stream<R2, E2, B>>,
  maxActive: number
): Stream<R & R2, E | E2, B> {
  return merge_(map_(stream, f), maxActive);
}

export function chainMerge<A, B, R2, E2>(
  maxActive: number,
  f: F.FunctionN<[A], Stream<R2, E2, B>>
) {
  return <R, E>(s: Stream<R, E, A>) => chainMerge_(s, f, maxActive);
}

export function mergeAll<R, E, A>(
  streams: Array<Stream<R, E, A>>
): Stream<R, E, A> {
  return merge_(
    (fromArray(streams) as any) as Stream<R, E, Stream<R, E, A>>,
    streams.length
  );
}

/**
 * Drop elements of the stream while a predicate holds
 * @param stream
 * @param pred
 */
function dropWhile_<R, E, A>(
  stream: Stream<R, E, A>,
  pred: F.Predicate<A>
): Stream<R, E, A> {
  return chain_(peel_(stream, drainWhileSink(pred)), ([head, rest]) =>
    concat_((fromOption(head) as any) as Stream<R, E, A>, rest)
  );
}

export function dropWhile<A>(pred: F.Predicate<A>) {
  return <R, E>(s: Stream<R, E, A>) => dropWhile_(s, pred);
}

/**
 * Collect all the elements emitted by a stream into an array.
 * @param stream
 */
export function collectArray<R, E, A>(
  stream: Stream<R, E, A>
): T.Effect<R, E, A[]> {
  return into_(stream, collectArraySink());
}

/**
 * Evaluate a stream for its effects
 * @param stream
 */
export function drain<R, E, A>(stream: Stream<R, E, A>): T.Effect<R, E, void> {
  return into_(stream, drainSink());
}

export const URI = "matechs/Stream";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Stream<R, E, A>;
  }
}

export interface StreamF {
  concatL<R, E, A, R2, E2>(
    stream1: Stream<R, E, A>,
    stream2: F.Lazy<Stream<R2, E2, A>>
  ): Stream<R & R2, E | E2, A>;
  concat<R, E, A, R2, E2>(
    stream1: Stream<R, E, A>,
    stream2: Stream<R2, E2, A>
  ): Stream<R & R2, E | E2, A>;
  as<R, E, A, B>(stream: Stream<R, E, A>, b: B): Stream<R, E, B>;
  filter<R, E, A>(stream: Stream<R, E, A>, f: F.Predicate<A>): Stream<R, E, A>;
  filterRefine<R, E, A, B extends A>(
    stream: Stream<R, E, A>,
    f: F.Refinement<A, B>
  ): Stream<R, E, B>;
  distinctAdjacent<A, R, E>(
    stream: Stream<R, E, A>,
    eq: EQ.Eq<A>
  ): Stream<R, E, A>;
  foldM<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: F.FunctionN<[B, A], T.Effect<R2, E2, B>>,
    seed: B
  ): Stream<R & R2, E | E2, B>;
  fold<R, E, A, B>(
    stream: Stream<R, E, A>,
    f: F.FunctionN<[B, A], B>,
    seed: B
  ): Stream<R, E, B>;
  scanM<R, E, A, B, R2, E2>(
    stream: Stream<R, E, A>,
    f: F.FunctionN<[B, A], T.Effect<R2, E2, B>>,
    seed: B
  ): Stream<R & R2, E | E2, B>;
  scan<R, E, A, B>(
    stream: Stream<R, E, A>,
    f: F.FunctionN<[B, A], B>,
    seed: B
  ): Stream<R, E, B>;
  mapM<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: F.FunctionN<[A], T.Effect<R2, E2, B>>
  ): Stream<R & R2, E | E2, B>;
  transduce<R, E, A, R2, E2, S, B>(
    stream: Stream<R, E, A>,
    sink: Sink<R2, E2, S, A, B>
  ): Stream<R & R2, E | E2, B>;
  drop<R, E, A>(stream: Stream<R, E, A>, n: number): Stream<R, E, A>;
  dropWhile<R, E, A>(
    stream: Stream<R, E, A>,
    pred: F.Predicate<A>
  ): Stream<R, E, A>;
  take<R, E, A>(stream: Stream<R, E, A>, n: number): Stream<R, E, A>;
  takeWhile<R, E, A>(
    stream: Stream<R, E, A>,
    pred: F.Predicate<A>
  ): Stream<R, E, A>;
  into<R, E, A, R2, E2, S, B>(
    stream: Stream<R, E, A>,
    sink: Sink<R2, E2, S, A, B>
  ): T.Effect<R & R2, E | E2, B>;
  intoManaged<R, E, A, S, B, R2, E2>(
    stream: Stream<R, E, A>,
    managedSink: Managed<R2, E2, Sink<R2, E2, S, A, B>>
  ): T.Effect<R & R2, E | E2, B>;
  intoLeftover<R, E, A, S, B, R2, E2>(
    stream: Stream<R, E, A>,
    sink: Sink<R2, E2, S, A, B>
  ): T.Effect<R & R2, E | E2, readonly [B, readonly A[]]>;
  zipWith<R, E, A, R2, E2, B, C>(
    as: Stream<R, E, A>,
    bs: Stream<R2, E2, B>,
    f: F.FunctionN<[A, B], C>
  ): Stream<R & R2, E | E2, C>;
  zip<R, E, A, R2, E2, B>(
    as: Stream<R, E, A>,
    bs: Stream<R2, E2, B>
  ): Stream<R & R2, E | E2, readonly [A, B]>;
  peel<R, E, A, S, B, R2, E2>(
    stream: Stream<R, E, A>,
    sink: Sink<R2, E2, S, A, B>
  ): Stream<R & R2, E | E2, readonly [B, Stream<R & R2, E | E2, A>]>;
  peelManaged<R, E, A, S, B>(
    stream: Stream<R, E, A>,
    managedSink: Managed<R, E, Sink<R, E, S, A, B>>
  ): Stream<R, E, readonly [B, Stream<R, E, A>]>;
  chainSwitchLatest<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: F.FunctionN<[A], Stream<R2, E2, B>>
  ): Stream<R & R2, E | E2, B>;
  merge<R, E, A, R2, E2>(
    stream: Stream<R, E, Stream<R2, E2, A>>,
    maxActive: number
  ): Stream<R & R2, E | E2, A>;
  chainMerge<R, E, A, B, R2, E2>(
    stream: Stream<R, E, A>,
    f: F.FunctionN<[A], Stream<R2, E2, B>>,
    maxActive: number
  ): Stream<R & R2, E | E2, B>;
}

export const stream: Monad3E<URI> & StreamF = {
  URI,
  map: map_,
  of: <R, E, A>(a: A): Stream<R, E, A> => (once(a) as any) as Stream<R, E, A>,
  ap: <R, R2, E, E2, A, B>(
    sfab: Stream<R, E, F.FunctionN<[A], B>>,
    sa: Stream<R2, E2, A>
  ) => zipWith_(sfab, sa, (f, a) => f(a)),
  chain: chain_,
  as: as_,
  chainMerge: chainMerge_,
  chainSwitchLatest: chainSwitchLatest_,
  concat: concat_,
  concatL: concatL_,
  distinctAdjacent: distinctAdjacent_,
  drop: drop_,
  dropWhile: dropWhile_,
  filter: filter_,
  filterRefine: filterRefine_,
  fold: fold_,
  foldM: foldM_,
  into: into_,
  intoLeftover: intoLeftover_,
  intoManaged: intoManaged_,
  mapM: mapM_,
  merge: merge_,
  peel: peel_,
  peelManaged: peelManaged_,
  scan: scan_,
  scanM: scanM_,
  take: take_,
  takeWhile: takeWhile_,
  transduce: transduce_,
  zip: zip_,
  zipWith: zipWith_,
};

/* extensions */

/* istanbul ignore next */
function getSourceFromObjectReadStream<A>(
  stream: Readable
): Managed<T.NoEnv, Error, T.Effect<T.NoEnv, Error, O.Option<A>>> {
  return managed.chain(
    M.encaseEffect(
      T.sync(() => {
        const { next, ops, hasCB } = su.queueUtils<Error, A>();

        stream.on("end", () => {
          next({ _tag: "complete" });
        });

        stream.on("error", (e) => {
          next({ _tag: "error", e: Ei.toError(e) });
        });

        stream.pipe(
          new Writable({
            objectMode: true,
            write(chunk, _, callback) {
              next({ _tag: "offer", a: chunk });

              callback();
            },
          })
        );

        return { ops, hasCB };
      })
    ),
    ({ hasCB, ops }) => su.emitter(ops, hasCB)
  );
}

/* istanbul ignore next */
export function fromObjectReadStream<A>(stream: Readable) {
  return fromSource(getSourceFromObjectReadStream<A>(stream));
}

// TODO: generalize this to batch over generic stream
/* istanbul ignore next */
function getSourceFromObjectReadStreamB<A>(
  stream: ReadStream,
  batch: number,
  every: number
): Managed<T.NoEnv, Error, T.Effect<T.NoEnv, Error, O.Option<Array<A>>>> {
  return M.encaseEffect(
    T.sync(() => {
      let open = true;
      const leftover: Array<any> = [];
      const errors: Array<Error> = [];

      stream.on("end", () => {
        open = false;
      });

      stream.on("error", (e) => {
        errors.push(e);
      });

      stream.pipe(
        new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            leftover.push(chunk);

            callback();
          },
        })
      );

      return T.delay(
        T.async((res) => {
          if (leftover.length > 0) {
            res(Ei.right(O.some(leftover.splice(0, batch))));
          } else {
            if (errors.length > 0) {
              res(Ei.left(errors[0]));
            } else {
              if (open) {
                res(Ei.right(O.some([])));
              } else {
                res(Ei.right(O.none));
              }
            }
          }

          // tslint:disable-next-line: no-empty
          return (cb) => {
            cb();
          };
        }),
        every
      );
    })
  );
}

/* istanbul ignore next */
export function fromObjectReadStreamB<A>(
  stream: ReadStream,
  batch: number,
  every: number
) {
  return fromSource(getSourceFromObjectReadStreamB<A>(stream, batch, every));
}

export { su };
