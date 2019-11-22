/*
  based on: https://github.com/rzeigler/waveguide-streams/blob/master/src/stream.ts
  credits to original author
 */

import * as array from "fp-ts/lib/Array";
import * as o from "fp-ts/lib/Option";
import { none, Option, some } from "fp-ts/lib/Option";
import {
  constant,
  FunctionN,
  identity,
  Lazy,
  Predicate
} from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import { Eq } from "fp-ts/lib/Eq";
import { Do } from "fp-ts-contrib/lib/Do";
import * as wave from "waveguide/lib/wave";
import { Fiber, Wave } from "waveguide/lib/wave";
import * as managed from "waveguide/lib/managed";
import { Managed } from "waveguide/lib/managed";
import * as ref from "waveguide/lib/ref";
import { Ref } from "waveguide/lib/ref";
import * as cq from "waveguide/lib/queue";
import { ConcurrentQueue } from "waveguide/lib/queue";
import {
  collectArraySink,
  drainSink,
  drainWhileSink,
  queueSink,
  Sink,
  stepMany
} from "./sink";
import { isSinkCont, sinkStepLeftover, sinkStepState } from "./step";
import { Cause } from "waveguide/lib/exit";
import * as deferred from "waveguide/lib/deferred";
import { Deferred } from "waveguide/lib/deferred";
import * as semaphore from "waveguide/lib/semaphore";
import { Semaphore } from "waveguide/lib/semaphore";
import { Monad2 } from "fp-ts/lib/Monad";

export type Source<E, A> = Wave<E, Option<A>>;

export type Fold<E, A> = <S>(
  initial: S,
  cont: Predicate<S>,
  step: FunctionN<[S, A], Wave<E, S>>
) => Wave<E, S>;

export type Stream<E, A> = Managed<E, Fold<E, A>>;

// The contract of a Stream's fold is that state is preserved within the lifecycle of the managed
// Therefore, we must track the offset in the array via a ref
// This allows, for instance, this to work with transduce
function arrayFold<E, A>(as: readonly A[]): Managed<E, Fold<E, A>> {
  return managed.encaseWave(
    wave.map(ref.makeRef(0), cell => {
      return <S>(
        initial: S,
        cont: Predicate<S>,
        f: FunctionN<[S, A], Wave<E, S>>
      ) => {
        function step(current: S): Wave<E, S> {
          if (cont(current)) {
            return pipe(
              cell.modify(i => [i, i + 1] as const), // increment the i
              wave.chainWith(i => {
                return i < as.length
                  ? wave.chain(f(current, as[i]), step)
                  : wave.pure(current);
              })
            );
          } else {
            return wave.pure(current);
          }
        }
        return step(initial);
      };
    })
  ) as Managed<E, Fold<E, A>>;
}

function iteratorSource<A>(iter: Iterator<A>): Source<never, A> {
  return wave.sync(() => {
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
export function fromSource<E, A>(
  r: Managed<E, Wave<E, Option<A>>>
): Stream<E, A> {
  return managed.map(r, pull => {
    function fold<S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], Wave<E, S>>
    ): Wave<E, S> {
      return cont(initial)
        ? pipe(
            pull,
            wave.chainWith(out =>
              pipe(
                out,
                o.fold(
                  () => wave.pure(initial) as Wave<E, S>,
                  a =>
                    wave.chain(step(initial, a), next => fold(next, cont, step))
                )
              )
            )
          )
        : wave.pure(initial);
    }
    return fold;
  });
}

/**
 * Create a stream from an Array
 * @param as
 */
export function fromArray<A>(as: readonly A[]): Stream<never, A> {
  return arrayFold(as);
}

/**
 * Create a stream from an iterator
 * @param iter
 */
export function fromIterator<A>(iter: Lazy<Iterator<A>>): Stream<never, A> {
  return pipe(
    managed.encaseWave(wave.sync(iter)),
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
): Stream<never, number> {
  return fromIterator(() => rangeIterator(start, interval, end));
}

/**
 * Create a stream from an existing iterator
 * @param iter
 */
export function fromIteratorUnsafe<A>(iter: Iterator<A>): Stream<never, A> {
  return fromIterator(() => iter);
}

/**
 * Create a stream that emits a single element
 * @param a
 */
export function once<A>(a: A): Stream<never, A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    f: FunctionN<[S, A], Wave<never, S>>
  ): Wave<never, S> {
    return cont(initial) ? f(initial, a) : wave.pure(initial);
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
export function repeatedly<A>(a: A): Stream<never, A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    f: FunctionN<[S, A], Wave<never, S>>
  ): Wave<never, S> {
    function step(current: S): Wave<never, S> {
      if (cont(current)) {
        return wave.shiftAfter(wave.chain(f(current, a), step));
      }
      return wave.shiftAfter(wave.pure(current));
    }
    return step(initial);
  }

  return managed.pure(fold);
}

export function periodically(ms: number): Stream<never, number> {
  return pipe(
    managed.encaseWave(ref.makeRef(-1)),
    managed.mapWith(r =>
      pipe(
        wave.delay(
          r.update(n => n + 1),
          ms
        ),
        wave.mapWith(n => some(n))
      )
    ),
    fromSource
  );
}

/**
 * A stream that emits no elements an immediately terminates
 */
export const empty: Stream<
  never,
  never
> = managed.pure(
  <S>(
    initial: S,
    _cont: Predicate<S>,
    _f: FunctionN<[S, never], Wave<never, S>>
  ) => wave.pure(initial)
);

/**
 * Create a stream that evalutes w to emit a single element
 * @param w
 */
export function encaseWave<E, A>(w: Wave<E, A>): Stream<E, A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    step: FunctionN<[S, A], Wave<E, S>>
  ): Wave<E, S> {
    if (cont(initial)) {
      return pipe(
        w,
        wave.chainWith(a => step(initial, a))
      );
    }
    return wave.pure(initial);
  }
  return managed.pure(fold) as Stream<E, A>;
}

/**
 * Create a stream that immediately fails
 * @param e
 */
export function raised<E>(e: E): Stream<E, never> {
  return encaseWave(wave.raiseError(e));
}

/**
 * Create a stream that immediately aborts
 * @param e
 */
export function aborted(e: unknown): Stream<never, never> {
  return encaseWave(wave.raiseAbort(e));
}

/**
 * Create a stream that immediately emits either 0 or 1 elements
 * @param opt
 */
export function fromOption<A>(opt: Option<A>): Stream<never, A> {
  return pipe(opt, o.fold(constant(empty as Stream<never, A>), once));
}

/**
 * Zip all stream elements with their index ordinals
 * @param stream
 */
export function zipWithIndex<E, A>(
  stream: Stream<E, A>
): Stream<E, readonly [A, number]> {
  return managed.map(stream, fold => {
    function zipFold<S>(
      initial: S,
      cont: Predicate<S>,
      f: FunctionN<[S, readonly [A, number]], Wave<E, S>>
    ): Wave<E, S> {
      const folded = fold<readonly [S, number]>(
        [initial, 0 as number],
        s => cont(s[0]),
        ([s, i], a) => wave.map(f(s, [a, i]), s => [s, i + 1])
      );
      return wave.map(folded, s => s[0]);
    }

    return zipFold;
  });
}

/**
 * Create a stream that emits all the elements of stream1 followed by all the elements of stream2
 * @param stream1
 * @param stream2
 */
export function concatL<E, A>(
  stream1: Stream<E, A>,
  stream2: Lazy<Stream<E, A>>
): Stream<E, A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    step: FunctionN<[S, A], Wave<E, S>>
  ): Wave<E, S> {
    return pipe(
      managed.use(stream1, fold1 => fold1(initial, cont, step)),
      wave.chainWith(intermediate =>
        cont(intermediate)
          ? managed.use(stream2(), fold2 => fold2(intermediate, cont, step))
          : wave.pure(intermediate)
      )
    );
  }
  return managed.pure(fold) as Stream<E, A>;
}

/**
 * Strict form of concatL
 * @param stream1
 * @param stream2
 */
export function concat<E, A>(
  stream1: Stream<E, A>,
  stream2: Stream<E, A>
): Stream<E, A> {
  return concatL(stream1, constant(stream2));
}

/**
 * Creates a stream that repeatedly emits the elements of a stream forever.
 *
 * The elements are not cached, any effects required (i.e. opening files or sockets) are repeated for each cycle
 * @param stream
 */
export function repeat<E, A>(stream: Stream<E, A>): Stream<E, A> {
  return concatL(stream, () => repeat(stream));
}

/**
 * Map the elements of a stream
 * @param stream
 * @param f
 */
export function map<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[A], B>
): Stream<E, B> {
  return managed.map(
    stream,
    outer => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, B], Wave<E, S>>
    ): Wave<E, S> => outer(initial, cont, (s, a) => step(s, f(a)))
  );
}

/**
 * Curried form of map
 * @param f
 */
export function mapWith<A, B>(
  f: FunctionN<[A], B>
): <E>(stream: Stream<E, A>) => Stream<E, B> {
  return stream => map(stream, f);
}

/**
 * Map every element emitted by stream to b
 * @param stream
 * @param b
 */
export function as<E, A, B>(stream: Stream<E, A>, b: B): Stream<E, B> {
  return map(stream, constant(b));
}

/**
 * Filter the elements of a stream by a predicate
 * @param stream
 * @param f
 */
export function filter<E, A>(
  stream: Stream<E, A>,
  f: Predicate<A>
): Stream<E, A> {
  return managed.map(
    stream,
    outer => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], Wave<E, S>>
    ): Wave<E, S> =>
      outer(initial, cont, (s, a) => (f(a) ? step(s, a) : wave.pure(s)))
  );
}

/**
 * Curried form of map
 * @param f
 */
export function filterWith<A>(
  f: Predicate<A>
): <E>(stream: Stream<E, A>) => Stream<E, A> {
  return stream => filter(stream, f);
}

/**
 * Filter the stream so that only items that are not equal to the previous item emitted are emitted
 * @param eq
 */
export function distinctAdjacent<A>(
  eq: Eq<A>
): <E>(stream: Stream<E, A>) => Stream<E, A> {
  return <E>(stream: Stream<E, A>) =>
    managed.map(
      stream,
      base => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, A], Wave<E, S>>
      ): Wave<E, S> => {
        const init: [S, Option<A>] = [initial, none];
        const c: Predicate<[S, Option<A>]> = ([s]) => cont(s);
        function stp(
          current: [S, Option<A>],
          next: A
        ): Wave<E, [S, Option<A>]> {
          return pipe(
            current[1],
            o.fold(
              // We haven't seen anything so just return
              () => wave.map(step(current[0], next), s => [s, some(next)]),
              seen =>
                eq.equals(seen, next)
                  ? wave.pure(current)
                  : wave.map(step(current[0], next), s => [s, some(next)])
            )
          );
        }
        return wave.map(base(init, c, stp), s => s[0]);
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
export function foldM<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[B, A], Wave<E, B>>,
  seed: B
): Stream<E, B> {
  return managed.map(
    stream,
    base => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, B], Wave<E, S>>
    ): Wave<E, S> =>
      cont(initial)
        ? wave.chain(
            base(seed, constant(true), (s, a) => f(s, a)),
            result => step(initial, result)
          )
        : wave.pure(initial)
  );
}

/**
 * Fold the elements of a stream together purely
 * @param stream
 * @param f
 * @param seed
 */
export function fold<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[B, A], B>,
  seed: B
): Stream<E, B> {
  return foldM(stream, (b, a) => wave.pure(f(b, a)) as Wave<E, B>, seed);
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
export function scanM<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[B, A], Wave<E, B>>,
  seed: B
): Stream<E, B> {
  return concat(
    once(seed) as Stream<E, B>,
    pipe(
      managed.zip(
        stream,
        managed.encaseWave(ref.makeRef(seed) as Wave<E, Ref<B>>)
      ),
      managed.mapWith(([base, accum]) => {
        function fold<S>(
          initial: S,
          cont: Predicate<S>,
          step: FunctionN<[S, B], Wave<E, S>>
        ): Wave<E, S> {
          if (cont(initial)) {
            // We need to figure out how to drive the base fold for a single step
            // Thus, we switch state from true to false on execution
            return pipe(
              accum.get,
              wave.chainWith(b =>
                base(
                  t2(b, true),
                  s => s[1],
                  (s, a) => wave.map(f(s[0], a), r => t2(r, false))
                )
              ),
              wave.chainWith(
                // If this is still true, we didn't consume anything so advance
                s =>
                  s[1]
                    ? wave.pure(initial)
                    : wave.applySecond(
                        accum.set(s[0]) as Wave<E, S>,
                        wave.chain(step(initial, s[0]), next =>
                          fold(next, cont, step)
                        )
                      )
              )
            );
          } else {
            return wave.pure(initial);
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
export function scan<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[B, A], B>,
  seed: B
): Stream<E, B> {
  return scanM(stream, (b, a) => wave.pure(f(b, a)) as Wave<E, B>, seed);
}

/**
 * Monadic chain on a stream
 * @param stream
 * @param f
 */
export function chain<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[A], Stream<E, B>>
): Stream<E, B> {
  return managed.map(
    stream,
    outerfold => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, B], Wave<E, S>>
    ): Wave<E, S> =>
      outerfold(initial, cont, (s, a) => {
        if (cont(s)) {
          const inner = f(a);
          return managed.use(inner, innerfold => innerfold(s, cont, step));
        }
        return wave.pure(s);
      })
  );
}

/**
 * Flatten a stream of streams
 * @param stream
 */
export function flatten<E, A>(stream: Stream<E, Stream<E, A>>): Stream<E, A> {
  return chain(stream, identity);
}

/**
 * Map each element of the stream effectfully
 * @param stream
 * @param f
 */
export function mapM<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[A], Wave<E, B>>
): Stream<E, B> {
  return chain(stream, a => encaseWave(f(a)));
}

/**
 * A stream that emits no elements but never terminates.
 */
export const never: Stream<never, never> = mapM(
  once(undefined),
  constant(wave.never)
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
export function transduce<E, A, S, B>(
  stream: Stream<E, A>,
  sink: Sink<E, S, A, B>
): Stream<E, B> {
  return managed.map(
    stream,
    base => <S0>(
      initial: S0,
      cont: Predicate<S0>,
      step: FunctionN<[S0, B], Wave<E, S0>>
    ): Wave<E, S0> => {
      function feedSink(
        foldState: S0,
        sinkState: S,
        chunk: A[]
      ): Wave<E, TDuceFused<S0, S>> {
        return wave.chain(stepMany(sink, sinkState, chunk), nextSinkStep =>
          isSinkCont(nextSinkStep)
            ? // We need to let more data in to drive the sink
              wave.pure([foldState, nextSinkStep.state, true] as const)
            : // We have a completion, so extract the value and then use it to advance the fold state
              pipe(
                sinkStepState(nextSinkStep),
                sink.extract,
                wave.chainWith(b => step(foldState, b)),
                wave.chainWith(nextFoldState => {
                  const leftover = sinkStepLeftover(nextSinkStep);
                  // We will re-initialize the sink
                  return pipe(
                    sink.initial,
                    wave.chainWith(nextNextSinkState => {
                      if (cont(nextFoldState) && leftover.length > 0) {
                        return feedSink(
                          nextFoldState,
                          nextNextSinkState.state,
                          leftover as A[]
                        );
                      } else {
                        return wave.pure([
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

      const derivedInitial = wave.map(
        sink.initial,
        initSink =>
          [initial, sinkStepState(initSink), false] as TDuceFused<S0, S>
      );

      return pipe(
        derivedInitial,
        wave.chainWith(init =>
          base(
            init,
            s => cont(s[0]),
            (s, a) => feedSink(s[0], s[1], [a])
          )
        ),
        wave.chainWith(([foldState, sinkState, extract]) =>
          extract && cont(foldState)
            ? wave.chain(sink.extract(sinkState), b => step(foldState, b))
            : wave.pure(foldState)
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
export function drop<E, A>(stream: Stream<E, A>, n: number): Stream<E, A> {
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
): <E, A>(stream: Stream<E, A>) => Stream<E, A> {
  return stream => drop(stream, n);
}

/**
 * Take some number of elements of a stream
 * @param stream
 * @param n
 */
export function take<E, A>(stream: Stream<E, A>, n: number): Stream<E, A> {
  return managed.map(
    stream,
    fold => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], Wave<E, S>>
    ): Wave<E, S> =>
      wave.map(
        fold(
          t2(initial, 0),
          t2s => t2s[1] < n && cont(t2s[0]),
          (s, a) => wave.map(step(s[0], a), next => t2(next, s[1] + 1))
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
export function takeWhile<E, A>(
  stream: Stream<E, A>,
  pred: Predicate<A>
): Stream<E, A> {
  return managed.map(
    stream,
    fold => <S>(
      initial: S,
      cont: Predicate<S>,
      step: FunctionN<[S, A], Wave<E, S>>
    ): Wave<E, S> =>
      wave.map(
        fold(
          t2(initial, true),
          t2s => t2s[1] && cont(t2s[0]),
          (s, a) =>
            pred(a)
              ? wave.map(step(s[0], a), next => t2(next, true))
              : wave.pure(t2(s[0], false))
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
export function into<E, A, S, B>(
  stream: Stream<E, A>,
  sink: Sink<E, S, A, B>
): Wave<E, B> {
  return managed.use(stream, fold =>
    pipe(
      sink.initial,
      wave.chainWith(init =>
        fold(init, isSinkCont, (s, a) => sink.step(s.state, a))
      ),
      wave.mapWith(s => s.state),
      wave.chainWith(sink.extract)
    )
  );
}

/**
 * Push a stream into a sink to produce the sink's result
 * @param stream
 * @param managedSink
 */
export function intoManaged<E, A, S, B>(
  stream: Stream<E, A>,
  managedSink: Managed<E, Sink<E, S, A, B>>
): Wave<E, B> {
  return managed.use(managedSink, sink => into(stream, sink));
}

/**
 * Push a stream in a sink to produce the result and the leftover
 * @param stream
 * @param sink
 */
export function intoLeftover<E, A, S, B>(
  stream: Stream<E, A>,
  sink: Sink<E, S, A, B>
): Wave<E, readonly [B, readonly A[]]> {
  return managed.use(stream, fold =>
    pipe(
      sink.initial,
      wave.chainWith(init =>
        fold(
          init,
          s => isSinkCont(s),
          (s, a) => sink.step(s.state, a)
        )
      ),
      wave.chainWith(end =>
        wave.map(
          sink.extract(end.state),
          b => [b, sinkStepLeftover(end)] as const
        )
      )
    )
  );
}

function sinkQueue<E, A>(
  stream: Stream<E, A>
): Managed<E, readonly [ConcurrentQueue<Option<A>>, Deferred<E, Option<A>>]> {
  return managed.chain(
    managed.zip(
      // 0 allows maximum backpressure throttling (i.e. a reader must be waiting already to produce the item)
      managed.encaseWave(
        cq.boundedQueue<Option<A>>(0) as Wave<E, ConcurrentQueue<Option<A>>>
      ),
      managed.encaseWave(
        deferred.makeDeferred<E, Option<A>>() as Wave<E, Deferred<E, A>>
      )
    ),
    ([q, latch]) => {
      const write = pipe(
        into(map(stream, some), queueSink(q)),
        wave.foldExitWith(latch.cause, constant(q.offer(none)))
      );
      return managed.as(managed.fiber(write), [q, latch] as const) as Managed<
        E,
        readonly [ConcurrentQueue<Option<A>>, Deferred<E, Option<A>>]
      >;
    }
  );
}

/**
 * Zip two streams together termitating when either stream is exhausted
 * @param as
 * @param bs
 * @param f
 */
export function zipWith<E, A, B, C>(
  as: Stream<E, A>,
  bs: Stream<E, B>,
  f: FunctionN<[A, B], C>
): Stream<E, C> {
  const source = managed.zipWith(
    sinkQueue(as),
    sinkQueue(bs),
    ([aq, alatch], [bq, blatch]) => {
      const atake = pipe(
        aq.take,
        wave.chainTapWith(opt =>
          pipe(
            opt,
            o.fold(
              // Confirm we have seen the last element
              () => alatch.done(none),
              () => wave.unit // just keep going
            )
          )
        )
      );
      const agrab = wave.raceFirst(atake, alatch.wait);
      const btake = pipe(
        bq.take,
        wave.chainTapWith(opt =>
          pipe(
            opt,
            o.fold(
              // Confirm we have seen the last element
              () => blatch.done(none),
              () => wave.unit // just keep going
            )
          )
        )
      );
      const bgrab = wave.raceFirst(btake, blatch.wait);

      return wave.zipWith(agrab, bgrab, (aOpt, bOpt) =>
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
export function zip<E, A, B>(
  as: Stream<E, A>,
  bs: Stream<E, B>
): Stream<E, readonly [A, B]> {
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
function queueBreakerSource<E, A>(
  queue: ConcurrentQueue<Option<A>>,
  breaker: Deferred<E, Option<A>>
): Wave<E, Option<A>> {
  const take = pipe(
    queue.take,
    wave.chainTapWith(opt =>
      pipe(
        opt,
        o.fold(
          // Confirm we have seen the last element by closing the breaker so subsequent reads see it
          constant(breaker.done(none)),
          // do nothing to the breaker if we got an element
          constant(wave.unit)
        )
      )
    )
  );
  return wave.raceFirst(take, breaker.wait);
}

/**
 * Construct a Source for a Stream.
 * During the scope of the Managed, Wave will repeatedly pull items from a queue being managed in the background
 * @param stream
 */
function streamQueueSource<E, A>(
  stream: Stream<E, A>
): Managed<E, Wave<E, Option<A>>> {
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
export function peel<E, A, S, B>(
  stream: Stream<E, A>,
  sink: Sink<E, S, A, B>
): Stream<E, readonly [B, Stream<E, A>]> {
  return managed.chain(streamQueueSource(stream), pull => {
    const pullStream = fromSource<E, A>(
      managed.pure(pull) as Managed<E, Wave<E, Option<A>>>
    );
    // We now have a shared pull instantiation that we can use as a sink to drive and return as a stream
    return pipe(
      encaseWave(intoLeftover(pullStream, sink)),
      mapWith(
        ([b, left]) =>
          [b, concat(fromArray(left) as Stream<E, A>, pullStream)] as const
      )
    );
  });
}

export function peelManaged<E, A, S, B>(
  stream: Stream<E, A>,
  managedSink: Managed<E, Sink<E, S, A, B>>
): Stream<E, readonly [B, Stream<E, A>]> {
  return managed.chain(managedSink, sink => peel(stream, sink));
}

function interruptFiberSlot(
  slot: Ref<Option<Fiber<never, void>>>
): Wave<never, void> {
  return wave.chain(slot.get, optFiber =>
    pipe(
      optFiber,
      o.fold(
        () => wave.pure(undefined as void),
        f => f.interrupt
      )
    )
  );
}

function waitFiberSlot(
  slot: Ref<Option<Fiber<never, void>>>
): Wave<never, void> {
  return wave.chain(slot.get, optFiber =>
    pipe(
      optFiber,
      o.fold(
        () => wave.pure(undefined as void),
        f => wave.asUnit(f.wait)
      )
    )
  );
}

function singleFiberSlot(): Managed<never, Ref<Option<Fiber<never, void>>>> {
  return managed.bracket(
    ref.makeRef<Option<Fiber<never, void>>>(none),
    interruptFiberSlot
  );
}

/**
 * Create a stream that switches to emitting elements of the most recent input stream.
 * @param stream
 */
export function switchLatest<E, A>(
  stream: Stream<E, Stream<E, A>>
): Stream<E, A> {
  const source = managed.chain(streamQueueSource(stream), (
    pull // read streams
  ) =>
    managed.chain(
      managed.zip(
        // The queue and latch to push into
        managed.encaseWave(
          cq.boundedQueue<Option<A>>(0) as Wave<E, ConcurrentQueue<Option<A>>>
        ),
        managed.encaseWave(deferred.makeDeferred<E, Option<A>, E>())
      ),
      ([pushQueue, pushBreaker]) =>
        // The internal latch that can be used to signal failures and shut down the read process
        managed.chain(
          managed.encaseWave(deferred.makeDeferred<never, Cause<E>, E>()),
          internalBreaker =>
            // somewhere to hold the currently running fiber so we can interrupt it on termination
            managed.chain(
              singleFiberSlot() as Managed<E, Ref<Option<Fiber<never, void>>>>,
              fiberSlot => {
                const interruptPushFiber = interruptFiberSlot(fiberSlot);
                // Spawn a fiber that should push elements from stream into pushQueue as long as it is able
                function spawnPushFiber(
                  stream: Stream<E, A>
                ): Wave<never, void> {
                  const writer = pipe(
                    // The writer process pushes things into the queue
                    into(map(stream, some), queueSink(pushQueue)),
                    // We need to trap any errors that occur and send those to internal latch to halt the process
                    // Dont' worry about interrupts, because we perform cleanups for single fiber slot
                    wave.foldExitWith(
                      internalBreaker.done,
                      constant(wave.pure(undefined)) // we can do nothing because we will delegate to the proxy
                    )
                  );

                  return wave.applyFirst(
                    interruptPushFiber,
                    wave.chain(wave.fork(writer), f => fiberSlot.set(some(f)))
                  );
                }

                // pull streams and setup the push fibers appropriately
                function advanceStreams(): Wave<never, void> {
                  // We need a way of looking ahead to see errors in the output streams in order to cause termination
                  // The push fiber will generate this when it encounters a failure
                  const breakerError = wave.chain(
                    internalBreaker.wait,
                    wave.raised
                  );

                  return wave.foldExit(
                    wave.raceFirst(pull, breakerError),
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
                              wave.race(breakerError, waitFiberSlot(fiberSlot)),
                              wave.foldExitWith(
                                pushBreaker.cause, // if we get a latchError forward it through to downstream
                                constant(pushQueue.offer(none)) // otherwise we are done, so lets forward that
                              )
                            ),
                          next =>
                            wave.applySecondL(spawnPushFiber(next), () =>
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
                  managed.fiber(advanceStreams()) as Managed<
                    E,
                    Fiber<never, void>
                  >,
                  downstreamSource
                );
              }
            )
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
export function chainSwitchLatest<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[A], Stream<E, B>>
): Stream<E, B> {
  return switchLatest(map(stream, f));
}

interface Weave {
  attach(action: Wave<never, void>): Wave<never, void>;
}

type WeaveHandle = readonly [number, Fiber<never, void>];

function interruptWeaveHandles(ref: Ref<WeaveHandle[]>): Wave<never, void> {
  return wave.chain(ref.get, fibers =>
    wave.asUnit(
      array.array.traverse(wave.instances)(fibers, fiber => fiber[1].interrupt)
    )
  );
}

// Track many fibers for the purpose of clean interruption on failure
const makeWeave: Managed<never, Weave> = managed.chain(
  managed.encaseWave(ref.makeRef(0)),
  cell =>
    // On cleanup we want to interrupt any running fibers
    managed.map(
      managed.bracket(ref.makeRef<WeaveHandle[]>([]), interruptWeaveHandles),
      store => {
        function attach(action: Wave<never, void>): Wave<never, void> {
          return (
            Do(wave.instances)
              .bind(
                "next",
                cell.update(n => n + 1)
              )
              .bind("fiber", wave.fork(action))
              .doL(({ next, fiber }) =>
                store.update(handles => [...handles, [next, fiber] as const])
              )
              // Spawn a fiber that will cleanup the handle reference on complete
              .doL(({ next, fiber }) =>
                wave.fork(
                  wave.applySecond(
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
export function merge<E, A>(
  stream: Stream<E, Stream<E, A>>,
  maxActive: number
): Stream<E, A> {
  const source = managed.chain(streamQueueSource(stream), pull =>
    managed.chain(
      managed.encaseWave(
        semaphore.makeSemaphore(maxActive) as Wave<E, Semaphore>
      ),
      sem =>
        // create the queue that output will be forced into
        managed.chain(
          managed.encaseWave(
            cq.boundedQueue<Option<A>>(0) as Wave<E, ConcurrentQueue<Option<A>>>
          ),
          pushQueue =>
            // create the mechanism t hrough which we can signal completion
            managed.chain(
              managed.encaseWave(deferred.makeDeferred<E, Option<A>, E>()),
              pushBreaker =>
                managed.chain(makeWeave as Managed<E, Weave>, weave =>
                  managed.chain(
                    managed.encaseWave(
                      deferred.makeDeferred<never, Cause<E>, E>()
                    ),
                    internalBreaker => {
                      // create a wave action that will proxy elements created by running the stream into the push queue
                      // if any errors occur, we set the breaker
                      function spawnPushFiber(
                        stream: Stream<E, A>
                      ): Wave<never, void> {
                        const writer = pipe(
                          // Process to sink elements into the queue
                          into(map(stream, some), queueSink(pushQueue)),
                          // TODO: I don't think we need to handle interrupts, it shouldn't be possible
                          wave.foldExitWith(
                            internalBreaker.done,
                            constant(wave.pure(undefined))
                          )
                        );
                        return weave.attach(sem.withPermit(writer)); // we need a permit to start
                      }

                      // The action that will pull a single stream upstream and attempt to activate it to push downstream
                      function advanceStreams(): Wave<never, void> {
                        const breakerError = wave.chain(
                          internalBreaker.wait,
                          wave.raised
                        );

                        return wave.foldExit(
                          wave.raceFirst(
                            pull, // we don't want to pull until there is capacity
                            breakerError
                          ),
                          pushBreaker.cause, // if upstream errored, we should push the failure downstream immediately
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
                                    wave.race(
                                      breakerError,
                                      sem.acquireN(maxActive)
                                    ),
                                    wave.foldExitWith(
                                      pushBreaker.cause,
                                      constant(pushQueue.offer(none))
                                    )
                                  )
                                ),
                                // Start the push fiber and then keep going
                                next =>
                                  wave.applySecondL(
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
                        managed.fiber(advanceStreams()) as Managed<
                          E,
                          Fiber<never, void>
                        >,
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

export function chainMerge<E, A, B>(
  stream: Stream<E, A>,
  f: FunctionN<[A], Stream<E, B>>,
  maxActive: number
): Stream<E, B> {
  return merge(map(stream, f), maxActive);
}

export function mergeAll<E, A>(streams: Array<Stream<E, A>>): Stream<E, A> {
  return merge(fromArray(streams) as Stream<E, Stream<E, A>>, streams.length);
}

/**
 * Drop elements of the stream while a predicate holds
 * @param stream
 * @param pred
 */
export function dropWhile<E, A>(
  stream: Stream<E, A>,
  pred: Predicate<A>
): Stream<E, A> {
  return chain(peel(stream, drainWhileSink(pred)), ([head, rest]) =>
    concat(fromOption(head) as Stream<E, A>, rest)
  );
}

/**
 * Collect all the elements emitted by a stream into an array.
 * @param stream
 */
export function collectArray<E, A>(stream: Stream<E, A>): Wave<E, A[]> {
  return into(stream, collectArraySink());
}

/**
 * Evaluate a stream for its effects
 * @param stream
 */
export function drain<E, A>(stream: Stream<E, A>): Wave<E, void> {
  return into(stream, drainSink());
}

export const URI = "Stream";
export type URI = typeof URI;
declare module "fp-ts/lib/HKT" {
  interface URItoKind2<E, A> {
    Stream: Stream<E, A>;
  }
}

export const instances: Monad2<URI> = {
  URI,
  map,
  of: <E, A>(a: A): Stream<E, A> => once(a) as Stream<E, A>,
  ap: <E, A, B>(sfab: Stream<E, FunctionN<[A], B>>, sa: Stream<E, A>) =>
    zipWith(sfab, sa, (f, a) => f(a)),
  chain
} as const;
