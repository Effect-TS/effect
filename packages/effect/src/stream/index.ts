/*
  based on: https://github.com/rzeigler/waveguide-streams/blob/master/src/stream.ts
  credits to original author
 */

import { Do } from "fp-ts-contrib/lib/Do";
import * as array from "fp-ts/lib/Array";
import * as Ei from "fp-ts/lib/Either";
import { Eq } from "fp-ts/lib/Eq";
import {
  constant,
  FunctionN,
  identity,
  Lazy,
  Predicate,
  Refinement
} from "fp-ts/lib/function";
import * as o from "fp-ts/lib/Option";
import * as O from "fp-ts/lib/Option";
import { none, Option, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { ReadStream } from "fs";
import { Writable, Readable } from "stream";
import { Cause } from "waveguide/lib/exit";
import * as T from "../";
import { Fiber, effect } from "../";
import * as deferred from "../deferred";
import { Deferred } from "../deferred";
import * as managed from "../managed";
import { Managed } from "../managed";
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
  stepMany
} from "./sink";
import { isSinkCont, sinkStepLeftover, sinkStepState } from "./step";
import * as su from "./support";

export type Source<R, E, A> = T.Effect<R, E, Option<A>>;

export type Fold<R, E, A> = <S>(
  initial: S,
  cont: Predicate<S>,
  step: FunctionN<[S, A], T.Effect<R, E, S>>
) => T.Effect<R, E, S>;

export type Stream<R, E, A> = Managed<R, E, Fold<R, E, A>>;

// The contract of a Stream's fold is that state is preserved within the lifecycle of the managed
// Therefore, we must track the offset in the array via a ref
// This allows, for instance, this to work with transduce
function arrayFold<A>(
  as: readonly A[]
): Managed<T.NoEnv, T.NoErr, Fold<T.NoEnv, T.NoErr, A>> {
  return managed.encaseEffect(
    effect.map(ref.makeRef(0), cell => {
      return <S>(
        initial: S,
        cont: Predicate<S>,
        f: FunctionN<[S, A], T.Effect<T.NoEnv, T.NoErr, S>>
      ) => {
        function step(current: S): T.Effect<T.NoEnv, T.NoErr, S> {
          /* istanbul ignore else */
          if (cont(current)) {
            return pipe(
              cell.modify(i => [i, i + 1] as const), // increment the i
              T.chainWith(i => {
                return i < as.length
                  ? effect.chain(f(current, as[i]), step)
                  : T.pure(current);
              })
            );
          } else {
            return T.pure(current);
          }
        }
        return step(initial);
      };
    })
  );
}

function iteratorSource<A>(iter: Iterator<A>): Source<T.NoEnv, T.NoErr, A> {
  return T.sync(() => {
    const n = iter.next();
    if (n.done) {
      return none;
    }
    return some(n.value);
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
  r: Managed<R, E, T.Effect<R, E, Option<A>>>
): Stream<R, E, A> {
  return managed.map(r, pull => {
    function fold<S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], T.Effect<R, E, S>>
    ): T.Effect<R, E, S> {
      return cont(initial)
        ? pipe(
            pull,
            T.chainWith(out =>
              pipe(
                out,
                o.fold(
                  () => T.pure(initial) as T.Effect<R, E, S>,
                  a =>
                    effect.chain(step(initial, a), next =>
                      fold(next, cont, step)
                    )
                )
              )
            )
          )
        : T.pure(initial);
    }
    return fold;
  });
}

/**
 * Create a stream from an Array
 * @param as
 */
export function fromArray<A>(as: readonly A[]): Stream<T.NoEnv, T.NoErr, A> {
  return arrayFold(as);
}

/**
 * Create a stream from an iterator
 * @param iter
 */
export function fromIterator<A>(
  iter: Lazy<Iterator<A>>
): Stream<T.NoEnv, T.NoErr, A> {
  return pipe(
    managed.encaseEffect(T.sync(iter)),
    managed.mapWith(iteratorSource),
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
    cont: Predicate<S>,
    f: FunctionN<[S, A], T.Effect<T.NoEnv, T.NoErr, S>>
  ): T.Effect<T.NoEnv, T.NoErr, S> {
    /* istanbul ignore else */
    if (cont(initial)) {
      return f(initial, a);
    } else {
      return T.pure(initial);
    }
  }
  return managed.pure(fold);
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
    cont: Predicate<S>,
    f: FunctionN<[S, A], T.Effect<T.NoEnv, T.NoErr, S>>
  ): T.Effect<T.NoEnv, T.NoErr, S> {
    function step(current: S): T.Effect<T.NoEnv, T.NoErr, S> {
      if (cont(current)) {
        return T.shiftAfter(effect.chain(f(current, a), step));
      }
      return T.shiftAfter(T.pure(current));
    }
    return step(initial);
  }

  return managed.pure(fold);
}

export function periodically(ms: number): Stream<T.NoEnv, T.NoErr, number> {
  return pipe(
    managed.encaseEffect(ref.makeRef(-1)),
    managed.mapWith(r =>
      pipe(
        T.delay(
          r.update(n => n + 1),
          ms
        ),
        T.mapWith(n => some(n))
      )
    ),
    fromSource
  );
}

/**
 * A stream that emits no elements an immediately terminates
 */
export const empty: Stream<
  T.NoEnv,
  T.NoErr,
  never
> = managed.pure(
  <S>(
    initial: S,
    _cont: Predicate<S>,
    _f: FunctionN<[S, never], T.Effect<T.NoEnv, T.NoErr, S>>
  ) => T.pure(initial)
);

/**
 * Create a stream that evalutes w to emit a single element
 * @param w
 */
export function encaseEffect<R, E, A>(w: T.Effect<R, E, A>): Stream<R, E, A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    step: FunctionN<[S, A], T.Effect<R, E, S>>
  ): T.Effect<R, E, S> {
    /* istanbul ignore else */
    if (cont(initial)) {
      return pipe(
        w,
        T.chainWith(a => step(initial, a))
      );
    } else {
      return T.pure(initial);
    }
  }
  return managed.pure(fold) as Stream<R, E, A>;
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
export function fromOption<A>(opt: Option<A>): Stream<T.NoEnv, T.NoErr, A> {
  return pipe(
    opt,
    o.fold(constant((empty as any) as Stream<T.NoEnv, T.NoErr, A>), once)
  );
}

/**
 * Zip all stream elements with their index ordinals
 * @param stream
 */
export function zipWithIndex<R, E, A>(
  stream: Stream<R, E, A>
): Stream<R, E, readonly [A, number]> {
  return managed.map(stream, fold => {
    function zipFold<S>(
      initial: S,
      cont: Predicate<S>,
      f: FunctionN<[S, readonly [A, number]], T.Effect<R, E, S>>
    ): T.Effect<R, E, S> {
      const folded = fold<readonly [S, number]>(
        [initial, 0 as number],
        s => cont(s[0]),
        ([s, i], a) => effect.map(f(s, [a, i]), s => [s, i + 1])
      );
      return effect.map(folded, s => s[0]);
    }

    return zipFold;
  });
}

function widen<R2, E2>(): <R, E, A>(
  stream: Stream<R, E, A>
) => Stream<R & R2, E | E2, A> {
  return stream => stream as any;
}

/**
 * Create a stream that emits all the elements of stream1 followed by all the elements of stream2
 * @param stream1
 * @param stream2
 */
export function concatL<R, E, A, R2, E2>(
  stream1: Stream<R, E, A>,
  stream2: Lazy<Stream<R2, E2, A>>
): Stream<R & R2, E | E2, A> {
  const w1 = widen<R2, E2>()(stream1);
  const w2 = () => widen<R, E>()(stream2());

  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    step: FunctionN<[S, A], T.Effect<R & R2, E | E2, S>>
  ): T.Effect<R & R2, E | E2, S> {
    return pipe(
      managed.use(w1, fold1 => fold1(initial, cont, step)),
      T.chainWith(intermediate => {
        /* istanbul ignore else */
        if (cont(intermediate)) {
          return managed.use(w2(), fold2 => fold2(intermediate, cont, step));
        } else {
          return T.pure(intermediate);
        }
      })
    );
  }
  return managed.pure(fold);
}

/**
 * Strict form of concatL
 * @param stream1
 * @param stream2
 */
export function concat<R, E, A, R2, E2>(
  stream1: Stream<R, E, A>,
  stream2: Stream<R2, E2, A>
): Stream<R & R2, E | E2, A> {
  return concatL(stream1, constant(stream2));
}

/**
 * Creates a stream that repeatedly emits the elements of a stream forever.
 *
 * The elements are not cached, any effects required (i.e. opening files or sockets) are repeated for each cycle
 * @param stream
 */
export function repeat<R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> {
  return concatL(stream, () => repeat(stream));
}

/**
 * Map the elements of a stream
 * @param stream
 * @param f
 */
export function map<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[A], B>
): Stream<R, E, B> {
  return managed.map(
    stream,
    outer => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, B], T.Effect<R, E, S>>
    ): T.Effect<R, E, S> => outer(initial, cont, (s, a) => step(s, f(a)))
  );
}

/**
 * Curried form of map
 * @param f
 */
export function mapWith<R, A, B>(
  f: FunctionN<[A], B>
): <E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return stream => map(stream, f);
}

/**
 * Map every element emitted by stream to b
 * @param stream
 * @param b
 */
export function as<R, E, A, B>(stream: Stream<R, E, A>, b: B): Stream<R, E, B> {
  return map(stream, constant(b));
}

/**
 * Filter the elements of a stream by a predicate
 * @param stream
 * @param f
 */
export function filter<R, E, A>(
  stream: Stream<R, E, A>,
  f: Predicate<A>
): Stream<R, E, A> {
  return managed.map(
    stream,
    outer => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], T.Effect<R, E, S>>
    ): T.Effect<R, E, S> =>
      outer(initial, cont, (s, a) => (f(a) ? step(s, a) : T.pure(s)))
  );
}

/**
 * Curried form of filter
 * @param f
 */
export function filterWith<A>(
  f: Predicate<A>
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return stream => filter(stream, f);
}

export function filterRefineWith<A, B extends A>(
  f: Refinement<A, B>
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return stream =>
    map(
      filter(stream, x => f(x)),
      x => x as B
    );
}

/**
 * Filter the stream so that only items that are not equal to the previous item emitted are emitted
 * @param eq
 */
export function distinctAdjacent<A>(
  eq: Eq<A>
): <R, E>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return <R, E>(stream: Stream<R, E, A>) =>
    managed.map(
      stream,
      base => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, A], T.Effect<R, E, S>>
      ): T.Effect<R, E, S> => {
        const init: [S, Option<A>] = [initial, none];
        const c: Predicate<[S, Option<A>]> = ([s]) => cont(s);
        function stp(
          current: [S, Option<A>],
          next: A
        ): T.Effect<R, E, [S, Option<A>]> {
          return pipe(
            current[1],
            o.fold(
              // We haven't seen anything so just return
              () => effect.map(step(current[0], next), s => [s, some(next)]),
              seen =>
                eq.equals(seen, next)
                  ? T.pure(current)
                  : effect.map(step(current[0], next), s => [s, some(next)])
            )
          );
        }
        return effect.map(base(init, c, stp), s => s[0]);
      }
    );
}

/**
 * Fold the elements of this stream together using an effect.
 *
 * The resulting stream will emit 1 element produced by the effectful fold
 * @param stream
 * @param f
 * @param seed
 */
export function foldM<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[B, A], T.Effect<R2, E2, B>>,
  seed: B
): Stream<R & R2, E | E2, B> {
  return managed.map(
    widen<R2, E2>()(stream),
    base => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, B], T.Effect<R & R2, E | E2, S>>
    ): T.Effect<R & R2, E | E2, S> => {
      /* istanbul ignore else */
      if (cont(initial)) {
        return effect.chain(
          base(seed, constant(true), (s, a) => f(s, a)),
          result => step(initial, result)
        );
      } else {
        return T.pure(initial);
      }
    }
  );
}

/**
 * Fold the elements of a stream together purely
 * @param stream
 * @param f
 * @param seed
 */
export function fold<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[B, A], B>,
  seed: B
): Stream<R, E, B> {
  return foldM(stream, (b, a) => T.pure(f(b, a)), seed);
}

function t2<A, B>(a: A, b: B): readonly [A, B] {
  return [a, b];
}

/**
 * Scan across the elements the stream.
 *
 * This is like foldM but emits every intermediate seed value in the resulting stream.
 * @param stream
 * @param f
 * @param seed
 */
export function scanM<R, E, A, B, R2, E2>(
  stream: Stream<R, E, A>,
  f: FunctionN<[B, A], T.Effect<R2, E2, B>>,
  seed: B
): Stream<R & R2, E | E2, B> {
  return concat(
    once(seed),
    pipe(
      managed.zip(
        widen<R2, E2>()(stream),
        managed.encaseEffect(ref.makeRef(seed))
      ),
      managed.mapWith(([base, accum]) => {
        function fold<S>(
          initial: S,
          cont: Predicate<S>,
          step: FunctionN<[S, B], T.Effect<R & R2, E | E2, S>>
        ): T.Effect<R & R2, E | E2, S> {
          /* istanbul ignore else */
          if (cont(initial)) {
            // We need to figure out how to drive the base fold for a single step
            // Thus, we switch state from true to false on execution
            return pipe(
              accum.get,
              T.chainWith(b =>
                base(
                  t2(b, true),
                  s => s[1],
                  (s, a) => effect.map(f(s[0], a), r => t2(r, false))
                )
              ),
              T.chainWith(
                // If this is still true, we didn't consume anything so advance
                s =>
                  s[1]
                    ? T.pure(initial)
                    : T.applySecond(
                        accum.set(s[0]),
                        effect.chain(step(initial, s[0]), next =>
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
  );
}

/**
 * Purely scan a stream
 * @param stream
 * @param f
 * @param seed
 */
export function scan<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[B, A], B>,
  seed: B
): Stream<R, E, B> {
  return scanM(stream, (b, a) => T.pure(f(b, a)), seed);
}

/**
 * Monadic chain on a stream
 * @param stream
 * @param f
 */
export function chain<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[A], Stream<R2, E2, B>>
): Stream<R & R2, E | E2, B> {
  return managed.map(
    widen<R2, E2>()(stream),
    outerfold => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, B], T.Effect<R & R2, E | E2, S>>
    ): T.Effect<R & R2, E | E2, S> =>
      outerfold(initial, cont, (s, a) => {
        /* istanbul ignore next */
        if (cont(s)) {
          const inner = widen<R, E>()(f(a));
          return managed.use(inner, innerfold => innerfold(s, cont, step));
        } else {
          return T.pure(s);
        }
      })
  );
}

/**
 * Flatten a stream of streams
 * @param stream
 */
export function flatten<R, E, R2, E2, A>(
  stream: Stream<R, E, Stream<R2, E2, A>>
): Stream<R & R2, E | E2, A> {
  return chain(stream, identity);
}

/**
 * Map each element of the stream effectfully
 * @param stream
 * @param f
 */
export function mapM<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[A], T.Effect<R2, E2, B>>
): Stream<R & R2, E | E2, B> {
  return chain(stream, a => encaseEffect(f(a)));
}

export function mapMWith<A, R2, E2, B>(
  f: FunctionN<[A], T.Effect<R2, E2, B>>
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R2, E | E2, B> {
  return stream => chain(stream, a => encaseEffect(f(a)));
}

/**
 * A stream that emits no elements but never terminates.
 */
export const never: Stream<T.NoEnv, T.NoErr, never> = mapM(
  once(undefined),
  constant(T.never)
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
export function transduce<R, E, A, R2, E2, S, B>(
  stream: Stream<R, E, A>,
  sink: Sink<R2, E2, S, A, B>
): Stream<R & R2, E | E2, B> {
  return managed.map(
    widen<R2, E2>()(stream),
    base => <S0>(
      initial: S0,
      cont: Predicate<S0>,
      step: FunctionN<[S0, B], T.Effect<R & R2, E | E2, S0>>
    ): T.Effect<R & R2, E | E2, S0> => {
      function feedSink(
        foldState: S0,
        sinkState: S,
        chunk: A[]
      ): T.Effect<R & R2, E | E2, TDuceFused<S0, S>> {
        return effect.chain(stepMany(sink, sinkState, chunk), nextSinkStep =>
          isSinkCont(nextSinkStep)
            ? // We need to let more data in to drive the sink
              T.pure([foldState, nextSinkStep.state, true] as const)
            : // We have a completion, so extract the value and then use it to advance the fold state
              pipe(
                sinkStepState(nextSinkStep),
                sink.extract,
                T.chainWith(b => step(foldState, b)),
                T.chainWith(nextFoldState => {
                  const leftover = sinkStepLeftover(nextSinkStep);
                  // We will re-initialize the sink
                  return pipe(
                    sink.initial,
                    T.chainWith(nextNextSinkState => {
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
                          false as boolean
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
        initSink =>
          [initial, sinkStepState(initSink), false] as TDuceFused<S0, S>
      );

      return pipe(
        derivedInitial,
        T.chainWith(init =>
          base(
            init,
            s => cont(s[0]),
            (s, a) => feedSink(s[0], s[1], [a])
          )
        ),
        T.chainWith(([foldState, sinkState, extract]) =>
          extract && cont(foldState)
            ? effect.chain(sink.extract(sinkState), b => step(foldState, b))
            : T.pure(foldState)
        )
      );
    }
  );
}

/**
 * Drop some number of elements from a stream
 *
 * Their effects to be produced still occur in the background
 * @param stream
 * @param n
 */
export function drop<R, E, A>(
  stream: Stream<R, E, A>,
  n: number
): Stream<R, E, A> {
  return pipe(
    zipWithIndex(stream),
    filterWith(([_, i]) => i >= n),
    mapWith(([a]) => a)
  );
}

/**
 * Curried form of drop
 * @param n
 */
export function dropWith(
  n: number
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R, E, A> {
  return stream => drop(stream, n);
}

/**
 * Take some number of elements of a stream
 * @param stream
 * @param n
 */
export function take<R, E, A>(
  stream: Stream<R, E, A>,
  n: number
): Stream<R, E, A> {
  return managed.map(
    stream,
    fold => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], T.Effect<R, E, S>>
    ): T.Effect<R, E, S> =>
      effect.map(
        fold(
          t2(initial, 0),
          t2s => t2s[1] < n && cont(t2s[0]),
          (s, a) => effect.map(step(s[0], a), next => t2(next, s[1] + 1))
        ),
        t2s => t2s[0]
      )
  );
}

/**
 * Take elements of a stream while a predicate holds
 * @param stream
 * @param pred
 */
export function takeWhile<R, E, A>(
  stream: Stream<R, E, A>,
  pred: Predicate<A>
): Stream<R, E, A> {
  return managed.map(
    stream,
    fold => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], T.Effect<R, E, S>>
    ): T.Effect<R, E, S> =>
      effect.map(
        fold(
          t2(initial, true),
          t2s => t2s[1] && cont(t2s[0]),
          (s, a) =>
            pred(a)
              ? effect.map(step(s[0], a), next => t2(next, true))
              : T.pure(t2(s[0], false))
        ),
        t2s => t2s[0]
      )
  );
}

/**
 * Push a stream into a sink to produce the sink's result
 * @param stream
 * @param sink
 */
export function into<R, E, A, R2, E2, S, B>(
  stream: Stream<R, E, A>,
  sink: Sink<R, E2, S, A, B>
): T.Effect<R & R2, E | E2, B> {
  return managed.use(widen<R2, E2>()(stream), fold =>
    pipe(
      sink.initial,
      T.chainWith(init =>
        fold(init, isSinkCont, (s, a) => sink.step(s.state, a))
      ),
      T.mapWith(s => s.state),
      T.chainWith(sink.extract)
    )
  );
}

/**
 * Push a stream into a sink to produce the sink's result
 * @param stream
 * @param managedSink
 */
export function intoManaged<R, E, A, S, B>(
  stream: Stream<R, E, A>,
  managedSink: Managed<R, E, Sink<R, E, S, A, B>>
): T.Effect<R, E, B> {
  return managed.use(managedSink, sink => into(stream, sink));
}

/**
 * Push a stream in a sink to produce the result and the leftover
 * @param stream
 * @param sink
 */
export function intoLeftover<R, E, A, S, B>(
  stream: Stream<R, E, A>,
  sink: Sink<R, E, S, A, B>
): T.Effect<R, E, readonly [B, readonly A[]]> {
  return managed.use(stream, fold =>
    pipe(
      sink.initial,
      T.chainWith(init =>
        fold(
          init,
          s => isSinkCont(s),
          (s, a) => sink.step(s.state, a)
        )
      ),
      T.chainWith(end =>
        effect.map(
          sink.extract(end.state),
          b => [b, sinkStepLeftover(end)] as const
        )
      )
    )
  );
}

function sinkQueue<R extends T.Env, E, A>(
  stream: Stream<R, E, A>
): Managed<
  R,
  E,
  readonly [ConcurrentQueue<Option<A>>, Deferred<R, E, Option<A>>]
> {
  return managed.chain(
    managed.zip(
      // 0 allows maximum backpressure throttling (i.e. a reader must be waiting already to produce the item)
      managed.encaseEffect(cq.boundedQueue<Option<A>>(0)),
      managed.encaseEffect(deferred.makeDeferred<R, E, Option<A>, E>())
    ),
    ([q, latch]) => {
      const write = T.foldExit(
        into(map(stream, some), queueSink(q)) as T.Effect<R, E, void>,
        latch.cause,
        constant(q.offer(none))
      );

      return managed.as(managed.fiber(write), [q, latch] as const);
    }
  );
}

/**
 * Zip two streams together termitating when either stream is exhausted
 * @param as
 * @param bs
 * @param f
 */
export function zipWith<R, E, A, R2, E2, B, C>(
  as: Stream<R, E, A>,
  bs: Stream<R2, E2, B>,
  f: FunctionN<[A, B], C>
): Stream<R & R2, E | E2, C> {
  const source = managed.zipWith(
    sinkQueue(as),
    sinkQueue(bs),
    ([aq, alatch], [bq, blatch]) => {
      const atake = pipe(
        aq.take,
        T.chainTapWith(opt =>
          pipe(
            opt,
            o.fold(
              // Confirm we have seen the last element
              () => alatch.done(none),
              () => T.unit // just keep going
            )
          )
        )
      );
      const agrab = T.raceFirst(atake, alatch.wait);
      const btake = pipe(
        bq.take,
        T.chainTapWith(opt =>
          pipe(
            opt,
            o.fold(
              // Confirm we have seen the last element
              () => blatch.done(none),
              () => T.unit // just keep going
            )
          )
        )
      );
      const bgrab = T.raceFirst(btake, blatch.wait);

      return T.zipWith(agrab, bgrab, (aOpt, bOpt) =>
        o.option.chain(aOpt, a => o.option.map(bOpt, b => f(a, b)))
      );
    }
  );
  return fromSource(source);
}

/**
 * zipWith to form tuples
 * @param as
 * @param bs
 */
export function zip<R, E, A, R2, E2, B>(
  as: Stream<R, E, A>,
  bs: Stream<R2, E2, B>
): Stream<R & R2, E | E2, readonly [A, B]> {
  return zipWith(as, bs, (a, b) => [a, b] as const);
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
  queue: ConcurrentQueue<Option<A>>,
  breaker: Deferred<R, E, Option<A>>
): T.Effect<R, E, Option<A>> {
  const take = pipe(
    queue.take,
    T.chainTapWith(opt =>
      pipe(
        opt,
        o.fold(
          // Confirm we have seen the last element by closing the breaker so subsequent reads see it
          constant(breaker.done(none)),
          // do nothing to the breaker if we got an element
          constant(T.unit)
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
): Managed<R, E, T.Effect<R, E, Option<A>>> {
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
export function peel<R, E, A, S, B>(
  stream: Stream<R, E, A>,
  sink: Sink<R, E, S, A, B>
): Stream<R, E, readonly [B, Stream<R, E, A>]> {
  return managed.chain(streamQueueSource(stream), pull => {
    const pullStream = fromSource<R, E, A>(
      managed.pure(pull) as Managed<R, E, T.Effect<R, E, Option<A>>>
    );
    // We now have a shared pull instantiation that we can use as a sink to drive and return as a stream
    return pipe(
      encaseEffect(intoLeftover(pullStream, sink)),
      mapWith(([b, left]) => [b, concat(fromArray(left), pullStream)] as const)
    );
  });
}

export function peelManaged<R, E, A, S, B>(
  stream: Stream<R, E, A>,
  managedSink: Managed<R, E, Sink<R, E, S, A, B>>
): Stream<R, E, readonly [B, Stream<R, E, A>]> {
  return managed.chain(managedSink, sink => peel(stream, sink));
}

function interruptFiberSlot(
  slot: Ref<Option<Fiber<never, void>>>
): T.Effect<T.NoEnv, T.NoErr, void> {
  return effect.chain(slot.get, optFiber =>
    pipe(
      optFiber,
      o.fold(
        () => T.pure(undefined as void),
        f => f.interrupt
      )
    )
  );
}

function waitFiberSlot(
  slot: Ref<Option<Fiber<never, void>>>
): T.Effect<T.NoEnv, T.NoErr, void> {
  return effect.chain(slot.get, optFiber =>
    pipe(
      optFiber,
      o.fold(
        () => T.pure(undefined as void),
        f => T.asUnit(f.wait)
      )
    )
  );
}

function singleFiberSlot(): Managed<
  T.NoEnv,
  T.NoErr,
  Ref<Option<Fiber<never, void>>>
> {
  return managed.bracket(
    ref.makeRef<Option<Fiber<never, void>>>(none),
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
      managed.zip(
        // The queue and latch to push into
        managed.encaseEffect(cq.boundedQueue<Option<A>>(0)),
        managed.encaseEffect(deferred.makeDeferred<R, E, Option<A>, E>())
      ),
      ([pushQueue, pushBreaker]) =>
        // The internal latch that can be used to signal failures and shut down the read process
        managed.chain(
          managed.encaseEffect(
            deferred.makeDeferred<T.NoEnv, never, Cause<E>, E>()
          ),
          internalBreaker =>
            // somewhere to hold the currently running fiber so we can interrupt it on termination
            managed.chain(singleFiberSlot(), fiberSlot => {
              const interruptPushFiber = interruptFiberSlot(fiberSlot);
              // Spawn a fiber that should push elements from stream into pushQueue as long as it is able
              function spawnPushFiber(
                stream: Stream<R, E, A>
              ): T.Effect<R, never, void> {
                const writer = pipe(
                  // The writer process pushes things into the queue
                  into(map(stream, some), queueSink(pushQueue)) as any,
                  // We need to trap any errors that occur and send those to internal latch to halt the process
                  // Dont' worry about interrupts, because we perform cleanups for single fiber slot
                  T.foldExitWith(
                    internalBreaker.done,
                    constant(T.pure(undefined)) // we can do nothing because we will delegate to the proxy
                  )
                );

                return T.applyFirst(
                  interruptPushFiber,
                  effect.chain(T.fork(writer), f => fiberSlot.set(some(f)))
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

                return T.foldExit(
                  T.raceFirst(pull, breakerError),
                  // In the event of an error either from pull or from upstream we need to shut everything down
                  // On managed unwind the active production fiber will be interrupted if there is one
                  cause => pushBreaker.cause(cause),
                  nextOpt =>
                    pipe(
                      nextOpt,
                      o.fold(
                        // nothing left, so we should wait the push fiber's completion and then forward the termination
                        () =>
                          pipe(
                            T.race(breakerError, waitFiberSlot(fiberSlot)),
                            T.foldExitWith(
                              c => pushBreaker.cause(c), // if we get a latchError forward it through to downstream
                              constant(pushQueue.offer(none)) // otherwise we are done, so lets forward that
                            )
                          ),
                        next =>
                          T.applySecondL(spawnPushFiber(next), () =>
                            advanceStreams()
                          )
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
              return managed.as(
                managed.fiber(advanceStreams()),
                downstreamSource
              );
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
export function chainSwitchLatest<R, E, A, R2, E2, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[A], Stream<R2, E2, B>>
): Stream<R & R2, E | E2, B> {
  return switchLatest(map(widen<R2, E2>()(stream), a => widen<R, E>()(f(a))));
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
  return effect.chain(ref.get, fibers =>
    T.asUnit(
      array.array.traverse(T.effect)(fibers, fiber => fiber[1].interrupt)
    )
  );
}

// Track many fibers for the purpose of clean interruption on failure
const makeWeave: Managed<T.NoEnv, never, Weave> = managed.chain(
  managed.encaseEffect(ref.makeRef(0)),
  cell =>
    // On cleanup we want to interrupt any running fibers
    managed.map(
      managed.bracket(ref.makeRef<WeaveHandle[]>([]), interruptWeaveHandles),
      store => {
        function attach(
          action: T.Effect<T.NoEnv, never, void>
        ): T.Effect<T.NoEnv, never, void> {
          return (
            Do(T.effect)
              .bindL("next", () => cell.update(n => n + 1))
              .bind("fiber", T.fork(action))
              .doL(({ next, fiber }) =>
                store.update(handles => [...handles, [next, fiber] as const])
              )
              // Spawn a fiber that will cleanup the handle reference on complete
              .doL(({ next, fiber }) =>
                T.fork(
                  T.applySecond(
                    fiber.wait,
                    store.update(array.filter(h => h[0] !== next))
                  )
                )
              )
              .return(constant(undefined as void))
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
export function merge<R, E, A>(
  stream: Stream<R, E, Stream<R, E, A>>,
  maxActive: number
): Stream<R, E, A> {
  const source = managed.chain(streamQueueSource(stream), pull =>
    managed.chain(
      managed.encaseEffect(semaphore.makeSemaphore(maxActive)),
      sem =>
        // create the queue that output will be forced into
        managed.chain(
          managed.encaseEffect(cq.boundedQueue<Option<A>>(0)),
          pushQueue =>
            // create the mechanism t hrough which we can signal completion
            managed.chain(
              managed.encaseEffect(deferred.makeDeferred<R, E, Option<A>, E>()),
              pushBreaker =>
                managed.chain(makeWeave, weave =>
                  managed.chain(
                    managed.encaseEffect(
                      deferred.makeDeferred<T.NoEnv, never, Cause<E>, E>()
                    ),
                    internalBreaker => {
                      // create a wave action that will proxy elements created by running the stream into the push queue
                      // if any errors occur, we set the breaker
                      function spawnPushFiber(
                        stream: Stream<R, E, A>
                      ): T.Effect<R, never, void> {
                        const writer = pipe(
                          // Process to sink elements into the queue
                          into(map(stream, some), queueSink(pushQueue)) as any,
                          // TODO: I don't think we need to handle interrupts, it shouldn't be possible
                          T.foldExitWith(
                            internalBreaker.done,
                            constant(T.pure(undefined))
                          )
                        );
                        return weave.attach(sem.withPermit(writer)); // we need a permit to start
                      }

                      // The action that will pull a single stream upstream and attempt to activate it to push downstream
                      function advanceStreams(): T.Effect<R, never, void> {
                        const breakerError = effect.chain(
                          internalBreaker.wait,
                          T.raised
                        );

                        return T.foldExit(
                          T.raceFirst(
                            pull, // we don't want to pull until there is capacity
                            breakerError
                          ),
                          c => pushBreaker.cause(c), // if upstream errored, we should push the failure downstream immediately
                          (
                            nextOpt // otherwise we should
                          ) =>
                            pipe(
                              nextOpt,
                              o.fold(
                                // The end has occured
                                constant(
                                  pipe(
                                    // We will wait for an error or all active produces to finish
                                    T.race(
                                      breakerError,
                                      sem.acquireN(maxActive)
                                    ),
                                    T.foldExitWith(
                                      c => pushBreaker.cause(c),
                                      constant(pushQueue.offer(none))
                                    )
                                  )
                                ),
                                // Start the push fiber and then keep going
                                next =>
                                  T.applySecondL(
                                    sem.withPermit(spawnPushFiber(next)),
                                    constant(advanceStreams())
                                  )
                              )
                            )
                        );
                      }
                      const downstreamSource = queueBreakerSource(
                        pushQueue,
                        pushBreaker
                      );
                      return managed.as(
                        managed.fiber(advanceStreams()),
                        downstreamSource
                      );
                    }
                  )
                )
            )
        )
    )
  );
  return fromSource(source);
}

export function chainMerge<R, E, A, B>(
  stream: Stream<R, E, A>,
  f: FunctionN<[A], Stream<R, E, B>>,
  maxActive: number
): Stream<R, E, B> {
  return merge(map(stream, f), maxActive);
}

export function mergeAll<R, E, A>(
  streams: Array<Stream<R, E, A>>
): Stream<R, E, A> {
  return merge(
    (fromArray(streams) as any) as Stream<R, E, Stream<R, E, A>>,
    streams.length
  );
}

/**
 * Drop elements of the stream while a predicate holds
 * @param stream
 * @param pred
 */
export function dropWhile<R, E, A>(
  stream: Stream<R, E, A>,
  pred: Predicate<A>
): Stream<R, E, A> {
  return chain(peel(stream, drainWhileSink(pred)), ([head, rest]) =>
    concat((fromOption(head) as any) as Stream<R, E, A>, rest)
  );
}

/**
 * Collect all the elements emitted by a stream into an array.
 * @param stream
 */
export function collectArray<R, E, A>(
  stream: Stream<R, E, A>
): T.Effect<R, E, A[]> {
  return into(stream, collectArraySink());
}

/**
 * Evaluate a stream for its effects
 * @param stream
 */
export function drain<R, E, A>(stream: Stream<R, E, A>): T.Effect<R, E, void> {
  return into(stream, drainSink());
}

export const URI = "matechs/Stream";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Stream<R, E, A>;
  }
}

export const streamMonad: Monad3E<URI> = {
  URI,
  map,
  of: <R, E, A>(a: A): Stream<R, E, A> => (once(a) as any) as Stream<R, E, A>,
  ap: <R, R2, E, E2, A, B>(
    sfab: Stream<R, E, FunctionN<[A], B>>,
    sa: Stream<R2, E2, A>
  ) => zipWith(sfab, sa, (f, a) => f(a)),
  chain
} as const;

/* extensions */

/* istanbul ignore next */
function getSourceFromObjectReadStream<A>(
  stream: Readable
): Managed<T.NoEnv, Error, T.Effect<T.NoEnv, Error, O.Option<A>>> {
  return managed.chain(
    managed.encaseEffect(
      T.sync(() => {
        const { next, ops, hasCB } = su.queueUtils<Error, A>();

        stream.on("end", () => {
          next({ _tag: "complete" });
        });

        stream.on("error", e => {
          next({ _tag: "error", e: Ei.toError(e) });
        });

        stream.pipe(
          new Writable({
            objectMode: true,
            write(chunk, _, callback) {
              next({ _tag: "offer", a: chunk });

              callback();
            }
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
  return managed.encaseEffect(
    T.sync(() => {
      let open = true;
      const leftover: Array<any> = [];
      const errors: Array<Error> = [];

      stream.on("end", () => {
        open = false;
      });

      stream.on("error", e => {
        errors.push(e);
      });

      stream.pipe(
        new Writable({
          objectMode: true,
          write(chunk, _, callback) {
            leftover.push(chunk);

            callback();
          }
        })
      );

      return T.delay(
        T.async(res => {
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

          return () => {};
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
