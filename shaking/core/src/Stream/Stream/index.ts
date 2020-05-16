import type { Separated } from "fp-ts/lib/Compactable"

import {
  traverse as a_traverse,
  traverseWithIndex as a_traverseWithIndex,
  wilt as a_wilt,
  wither as a_wither
} from "../../Array"
import { filter as filterArray } from "../../Array"
import { Deferred, makeDeferred } from "../../Deferred"
import { Do as DoG } from "../../Do"
import {
  applyFirst as applyFirstEffect,
  applySecond as applySecondEffect,
  applySecondL as applySecondEffectL,
  asUnit as asUnitEffect,
  Async as AsyncEffect,
  AsyncRE as AsyncEffectRE,
  chain as chainEffect,
  chainError as chainErrorEffect,
  chainTap as chainTapEffect,
  chain_ as chain_Effect,
  delay as delayEffect,
  Do as DoEffect,
  Effect,
  Fiber,
  foldExit as foldExitEffect,
  foldExit_ as foldExit_Effect,
  forever as foreverEffect,
  fork as forkEffect,
  map as mapEffect,
  map_ as map_Effect,
  never as neverEffect,
  pure as pureEffect,
  race as raceEffect,
  raceFirst as raceFirstEffect,
  raiseAbort as raiseAbortEffect,
  raised as raisedEffect,
  raiseError as raiseErrorEffect,
  sequenceS as sequenceSEffect,
  sequenceT as sequenceTEffect,
  shiftAfter as shiftAfterEffect,
  sync as syncEffect,
  Sync as SyncEffect,
  traverseArray as traverseArrayEffect,
  unit as unitEffect,
  zipWith_ as zipWith_Effect
} from "../../Effect"
import { Either } from "../../Either"
import { traverse as e_traverse } from "../../Either"
import { Eq } from "../../Eq"
import { Cause, Exit } from "../../Exit"
import {
  constant,
  FunctionN,
  identity,
  Lazy,
  Predicate,
  Refinement
} from "../../Function"
import {
  as as asManaged,
  Async as ManagedAsync,
  AsyncRE as ManagedAsyncRE,
  bracket as bracketManaged,
  chain as chainManaged,
  chain_ as chain_Managed,
  map_ as map_Managed,
  encaseEffect as encaseEffectManaged,
  fiber as fiberManaged,
  Managed,
  map as mapManaged,
  pure as pureManaged,
  Sync as SyncManaged,
  use as useManaged,
  zip as zipManaged,
  zipWith as zipWithManaged
} from "../../Managed"
import { fold as foldOption, isSome, none, Option, some } from "../../Option"
import {
  chain_ as chain__1,
  map_ as map__1,
  traverse as o_traverse,
  wilt as o_wilt,
  wither as o_wither
} from "../../Option"
import { pipe } from "../../Pipe"
import { boundedQueue, ConcurrentQueue, unboundedQueue } from "../../Queue"
import {
  traverse_ as r_traverse_,
  traverseWithIndex_ as r_traverseWithIndex_,
  wilt as r_wilt,
  wither as r_wither
} from "../../Record"
import { makeRef, Ref } from "../../Ref"
import { makeSemaphore } from "../../Semaphore"
import { StreamURI as URI } from "../../Support/Common"
import { ForM } from "../../Support/For"
import { Monad4EP } from "../../Support/Overloads"
import { Tree } from "../../Tree"
import { traverse as t_traverse } from "../../Tree"
import {
  collectArraySink,
  drainSink,
  drainWhileSink,
  queueOptionSink,
  queueSink,
  Sink,
  stepMany
} from "../Sink"
import { isSinkCont, sinkStepLeftover, sinkStepState } from "../Step"
import { emitter, Ops, queueUtils } from "../Support"

export type Source<K, R, E, A> = Effect<K, R, E, Option<A>>

export type Fold<K, R, E, A> = <S>(
  initial: S,
  cont: Predicate<S>,
  step: FunctionN<[S, A], Effect<K, R, E, S>>
) => Effect<K, R, E, S>

interface StreamT<K, R, E, K2, R2, E2, A>
  extends Managed<K, R, E, Fold<K2, R2, E2, A>> {}

export interface Stream<S, R, E, A> {
  _TAG: () => "Stream"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export type Async<A> = Stream<unknown, unknown, never, A>
export type AsyncE<E, A> = Stream<unknown, unknown, E, A>
export type AsyncR<R, A> = Stream<unknown, R, never, A>
export type AsyncRE<R, E, A> = Stream<unknown, R, E, A>

export type Sync<A> = Stream<never, unknown, never, A>
export type SyncE<E, A> = Stream<never, unknown, E, A>
export type SyncR<R, A> = Stream<never, R, never, A>
export type SyncRE<R, E, A> = Stream<never, R, E, A>

const toS = <S, R, E, S2, R2, E2, A>(
  _: StreamT<S, R, E, S2, R2, E2, A>
): Stream<S | S2, R & R2, E | E2, A> => _ as any
const fromS = <S, R, E, A>(_: Stream<S, R, E, A>): StreamT<S, R, E, S, R, E, A> =>
  _ as any

// The contract of a Stream's fold is that state is preserved within the lifecycle of the managed
// Therefore, we must track the offset in the array via a ref
// This allows, for instance, this to work with transduce
function arrayFold<A>(as: readonly A[]): SyncManaged<Fold<never, unknown, never, A>> {
  return encaseEffectManaged(
    map_Effect(
      makeRef(0),
      (cell) => <S>(
        initial: S,
        cont: Predicate<S>,
        f: FunctionN<[S, A], SyncEffect<S>>
      ) => {
        function step(current: S): SyncEffect<S> {
          /* istanbul ignore else */
          if (cont(current)) {
            return pipe(
              cell.modify((i) => [i, i + 1] as const), // increment the i
              chainEffect((i) =>
                i < as.length
                  ? chain_Effect(f(current, as[i]), step)
                  : pureEffect(current)
              )
            )
          } else {
            return pureEffect(current)
          }
        }
        return step(initial)
      }
    )
  )
}

function iteratorSource<A>(iter: Iterator<A>): Source<never, unknown, never, A> {
  return syncEffect(() => {
    const n = iter.next()
    if (n.done) {
      return none
    }
    return some(n.value)
  })
}

function* rangeIterator(
  start: number,
  interval?: number,
  end?: number
): Iterator<number> {
  let current = start
  while (!end || current < end) {
    yield current
    current += interval || 1
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
export function fromSource<K, R, E, K2, R2, E2, A>(
  r: Managed<K, R, E, Effect<K2, R2, E2, Option<A>>>
): Stream<K | K2, R & R2, E | E2, A> {
  return toS(
    map_Managed(r, (pull) => {
      function fold<S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, A], Effect<K2, R2, E2, S>>
      ): Effect<K2, R2, E2, S> {
        return cont(initial)
          ? pipe(
              pull,
              chainEffect((out) =>
                pipe(
                  out,
                  foldOption(
                    () => pureEffect(initial) as Effect<K2, R2, E2, S>,
                    (a) =>
                      chain_Effect(step(initial, a), (next) => fold(next, cont, step))
                  )
                )
              )
            )
          : pureEffect(initial)
      }
      return fold
    })
  )
}

/**
 * Create a stream from an Array
 * @param as
 */
export function fromArray<A>(as: readonly A[]): Sync<A> {
  return toS(arrayFold(as))
}

/**
 * Create a stream from an iterator
 * @param iter
 */
export function fromIterator<A>(iter: Lazy<Iterator<A>>): Sync<A> {
  return pipe(
    encaseEffectManaged(syncEffect(iter)),
    mapManaged(iteratorSource),
    fromSource
  )
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
): Sync<number> {
  return fromIterator(() => rangeIterator(start, interval, end))
}

/**
 * Create a stream from an existing iterator
 * @param iter
 */
export function fromIteratorUnsafe<A>(iter: Iterator<A>): Sync<A> {
  return fromIterator(() => iter)
}

/**
 * Create a stream that emits a single element
 * @param a
 */
export function once<A>(a: A): Sync<A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    f: FunctionN<[S, A], SyncEffect<S>>
  ): SyncEffect<S> {
    /* istanbul ignore else */
    if (cont(initial)) {
      return f(initial, a)
    } else {
      return pureEffect(initial)
    }
  }
  return toS(pureManaged(fold))
}

/**
 * Create a stream that emits As as fast as possible
 *
 * Be cautious when using this. If your entire pipeline is full of synchronous actions you can block the main
 * thread until the stream runs to completion (or forever) using this
 * @param a
 */
export function repeatedly<A>(a: A): Async<A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    f: FunctionN<[S, A], AsyncEffect<S>>
  ): AsyncEffect<S> {
    function step(current: S): AsyncEffect<S> {
      if (cont(current)) {
        return shiftAfterEffect(chain_Effect(f(current, a), step))
      }
      return shiftAfterEffect(pureEffect(current))
    }
    return step(initial)
  }

  return toS(pureManaged(fold))
}

export function periodically(ms: number): Async<number> {
  return pipe(
    encaseEffectManaged(makeRef(-1)),
    mapManaged((r) =>
      pipe(
        delayEffect(
          r.update((n) => n + 1),
          ms
        ),
        mapEffect(some)
      )
    ),
    fromSource
  )
}

/**
 * A stream that emits no elements an immediately terminates
 */
export const empty: Sync<never> = toS(
  pureManaged(
    <S>(initial: S, _cont: Predicate<S>, _f: FunctionN<[S, never], SyncEffect<S>>) =>
      pureEffect(initial)
  )
)

/**
 * Create a stream that evalutes w to emit a single element
 * @param w
 */
export function encaseEffect<K, R, E, A>(w: Effect<K, R, E, A>): Stream<K, R, E, A> {
  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    step: FunctionN<[S, A], Effect<K, R, E, S>>
  ): Effect<K, R, E, S> {
    /* istanbul ignore else */
    if (cont(initial)) {
      return pipe(
        w,
        chainEffect((a) => step(initial, a))
      )
    } else {
      return pureEffect(initial)
    }
  }
  return toS(pureManaged(fold))
}

/**
 * Create a stream that immediately fails
 * @param e
 */
export function raised<E>(e: E): SyncE<E, never> {
  return encaseEffect(raiseErrorEffect(e))
}

/**
 * Create a stream that immediately aborts
 * @param e
 */
export function aborted(e: unknown): Sync<never> {
  return encaseEffect(raiseAbortEffect(e))
}

/**
 * Create a stream that immediately emits either 0 or 1 elements
 * @param opt
 */
export function fromOption<A>(opt: Option<A>): Sync<A> {
  return pipe(opt, foldOption(constant((empty as any) as Sync<A>), once))
}

/**
 * Zip all stream elements with their index ordinals
 * @param stream
 */
export function zipWithIndex<K, R, E, A>(
  stream: Stream<K, R, E, A>
): Stream<K, R, E, readonly [A, number]> {
  return toS(
    map_Managed(fromS(stream), (fold) => {
      function zipFold<S>(
        initial: S,
        cont: Predicate<S>,
        f: FunctionN<[S, readonly [A, number]], Effect<K, R, E, S>>
      ): Effect<K, R, E, S> {
        const folded = fold<readonly [S, number]>(
          [initial, 0 as number],
          (s) => cont(s[0]),
          ([s, i], a) => map_Effect(f(s, [a, i]), (s) => [s, i + 1])
        )
        return map_Effect(folded, (s) => s[0])
      }

      return zipFold
    })
  )
}

/**
 * Create a stream that emits all the elements of stream1 followed by all the elements of stream2
 * @param stream1
 * @param stream2
 */
export function concatL_<K, R, E, A, K2, R2, E2>(
  stream1: Stream<K, R, E, A>,
  stream2: Lazy<Stream<K2, R2, E2, A>>
): Stream<K | K2, R & R2, E | E2, A> {
  const w1 = fromS(stream1 as Stream<K | K2, R & R2, E | E2, A>)
  const w2 = () => fromS(stream2() as Stream<K | K2, R & R2, E | E2, A>)

  function fold<S>(
    initial: S,
    cont: Predicate<S>,
    step: FunctionN<[S, A], Effect<K | K2, R & R2, E | E2, S>>
  ): Effect<K | K2, R & R2, E | E2, S> {
    return pipe(
      useManaged(w1, (fold1) => fold1(initial, cont, step)),
      chainEffect((intermediate) => {
        /* istanbul ignore else */
        if (cont(intermediate)) {
          return useManaged(w2(), (fold2) => fold2(intermediate, cont, step))
        } else {
          return pureEffect(intermediate)
        }
      })
    )
  }
  return toS(pureManaged(fold))
}

export function concatL<S, A, R2, E2>(
  stream2: Lazy<Stream<S, R2, E2, A>>
): <S2, R, E>(s: Stream<S2, R, E, A>) => Stream<S2 | S, R & R2, E | E2, A> {
  return <S2, R, E>(s: Stream<S2, R, E, A>) => concatL_(s, stream2)
}

/**
 * Strict form of concatL
 * @param stream1
 * @param stream2
 */
export function concat_<S, R, E, A, S2, R2, E2>(
  stream1: Stream<S, R, E, A>,
  stream2: Stream<S2, R2, E2, A>
): Stream<S | S2, R & R2, E | E2, A> {
  return concatL_(stream1, constant(stream2))
}

export function concat<S, A, R2, E2>(
  stream2: Stream<S, R2, E2, A>
): <S2, R, E>(s: Stream<S2, R, E, A>) => Stream<S | S2, R & R2, E2 | E, A> {
  return <S2, R, E>(s: Stream<S2, R, E, A>) => concat_(s, stream2)
}

/**
 * Creates a stream that repeatedly emits the elements of a stream forever.
 *
 * The elements are not cached, any effects required (i.e. opening files or sockets) are repeated for each cycle
 * @param stream
 */
export function repeat<S, R, E, A>(stream: Stream<S, R, E, A>): Stream<S, R, E, A> {
  return concatL_(stream, () => repeat(stream))
}

export function map_<K, R, E, A, B>(
  stream: Stream<K, R, E, A>,
  f: FunctionN<[A], B>
): Stream<K, R, E, B> {
  return toS(
    map_Managed(
      fromS(stream),
      (outer) => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, B], Effect<K, R, E, S>>
      ): Effect<K, R, E, S> => outer(initial, cont, (s, a) => step(s, f(a)))
    )
  )
}

/**
 * Map the elements of a stream
 * @param stream
 * @param f
 */
export function map<R, A, B>(
  f: FunctionN<[A], B>
): <S, E>(stream: Stream<S, R, E, A>) => Stream<S, R, E, B> {
  return (stream) => map_(stream, f)
}

/**
 * Map every element emitted by stream to b
 * @param stream
 * @param b
 */
export function as_<S, R, E, A, B>(
  stream: Stream<S, R, E, A>,
  b: B
): Stream<S, R, E, B> {
  return map_(stream, constant(b))
}

export function as<B>(b: B): <S, R, E, A>(s: Stream<S, R, E, A>) => Stream<S, R, E, B> {
  return (s) => as_(s, b)
}

/**
 * Filter the elements of a stream by a predicate
 * @param stream
 * @param f
 */
export function filter_<K, R, E, A>(
  stream: Stream<K, R, E, A>,
  f: Predicate<A>
): Stream<K, R, E, A> {
  return toS(
    map_Managed(
      fromS(stream),
      (outer) => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, A], Effect<K, R, E, S>>
      ): Effect<K, R, E, S> =>
        outer(initial, cont, (s, a) => (f(a) ? step(s, a) : pureEffect(s)))
    )
  )
}

export function filter<A, B extends A>(
  f: Refinement<A, B>
): <K, R, E>(s: Stream<K, R, E, A>) => Stream<K, R, E, B>
export function filter<A>(
  f: Predicate<A>
): <K, R, E>(s: Stream<K, R, E, A>) => Stream<K, R, E, A>
export function filter<A>(f: Predicate<A>) {
  return <K, R, E>(s: Stream<K, R, E, A>) => filter_(s, f)
}

/**
 * Filter the stream so that only items that are not equal to the previous item emitted are emitted
 * @param eq
 */
export function distinctAdjacent_<K, R, E, A>(
  stream: Stream<K, R, E, A>,
  eq: Eq<A>
): Stream<K, R, E, A> {
  return toS(
    map_Managed(
      fromS(stream),
      (base) => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, A], Effect<K, R, E, S>>
      ): Effect<K, R, E, S> => {
        const init: [S, Option<A>] = [initial, none]
        const c: Predicate<[S, Option<A>]> = ([s]) => cont(s)
        function stp(
          current: [S, Option<A>],
          next: A
        ): Effect<K, R, E, [S, Option<A>]> {
          return pipe(
            current[1],
            foldOption(
              // We haven't seen anything so just return
              () => map_Effect(step(current[0], next), (s) => [s, some(next)]),
              (seen) =>
                eq.equals(seen, next)
                  ? pureEffect(current)
                  : map_Effect(step(current[0], next), (s) => [s, some(next)])
            )
          )
        }
        return map_Effect(base(init, c, stp), (s) => s[0])
      }
    )
  )
}

export function distinctAdjacent<A>(
  eq: Eq<A>
): <K, R, E>(s: Stream<K, R, E, A>) => Stream<K, R, E, A> {
  return <K, R, E>(s: Stream<K, R, E, A>) => distinctAdjacent_(s, eq)
}

/**
 * Fold the elements of this stream together using an effect.
 *
 * The resulting stream will emit 1 element produced by the effectful fold
 * @param stream
 * @param f
 * @param seed
 */
export function foldM_<K, R, E, A, K2, R2, E2, B>(
  stream: Stream<K, R, E, A>,
  f: FunctionN<[B, A], Effect<K2, R2, E2, B>>,
  seed: B
): Stream<K | K2, R & R2, E | E2, B> {
  return toS(
    map_Managed(
      fromS(stream as Stream<K | K2, R & R2, E | E2, A>),
      (base) => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, B], Effect<K | K2, R & R2, E | E2, S>>
      ): Effect<K | K2, R & R2, E | E2, S> => {
        /* istanbul ignore else */
        if (cont(initial)) {
          return chain_Effect(base(seed, constant(true), f), (result) =>
            step(initial, result)
          )
        } else {
          return pureEffect(initial)
        }
      }
    )
  )
}

export function foldM<K, A, R2, E2, B>(
  seed: B,
  f: FunctionN<[B, A], Effect<K, R2, E2, B>>
): <K2, R, E>(s: Stream<K2, R, E, A>) => Stream<K | K2, R & R2, E2 | E, B> {
  return <K2, R, E>(s: Stream<K2, R, E, A>) => foldM_(s, f, seed)
}

/**
 * Fold the elements of a stream together purely
 * @param stream
 * @param f
 * @param seed
 */
export function fold_<S, R, E, A, B>(
  stream: Stream<S, R, E, A>,
  f: FunctionN<[B, A], B>,
  seed: B
): Stream<S, R, E, B> {
  return foldM_(stream, (b, a) => pureEffect(f(b, a)), seed)
}

function t2<A, B>(a: A, b: B): readonly [A, B] {
  return [a, b]
}

export function fold<A, B>(
  seed: B,
  f: FunctionN<[B, A], B>
): <S, R, E>(s: Stream<S, R, E, A>) => Stream<S, R, E, B> {
  return <S, R, E>(s: Stream<S, R, E, A>) => fold_(s, f, seed)
}

/**
 * Scan across the elements the stream.
 *
 * This is like foldM but emits every intermediate seed value in the resulting stream.
 * @param stream
 * @param f
 * @param seed
 */
export function scanM_<K, R, E, A, B, K2, R2, E2>(
  stream: Stream<K, R, E, A>,
  f: FunctionN<[B, A], Effect<K2, R2, E2, B>>,
  seed: B
): Stream<K | K2, R & R2, E | E2, B> {
  return concat_(
    once(seed),
    toS(
      pipe(
        zipManaged(
          fromS(stream as Stream<K | K2, R & R2, E | E2, A>),
          encaseEffectManaged(makeRef(seed))
        ),
        mapManaged(([base, accum]) => {
          function fold<S>(
            initial: S,
            cont: Predicate<S>,
            step: FunctionN<[S, B], Effect<K | K2, R & R2, E | E2, S>>
          ): Effect<K | K2, R & R2, E | E2, S> {
            /* istanbul ignore else */
            if (cont(initial)) {
              // We need to figure out how to drive the base fold for a single step
              // Thus, we switch state from true to false on execution
              return pipe(
                accum.get,
                chainEffect((b) =>
                  base(
                    t2(b, true),
                    (s) => s[1],
                    (s, a) => map_Effect(f(s[0], a), (r) => t2(r, false))
                  )
                ),
                chainEffect(
                  // If this is still true, we didn't consume anything so advance
                  (s) =>
                    s[1]
                      ? pureEffect(initial)
                      : applySecondEffect(
                          accum.set(s[0]),
                          chain_Effect(step(initial, s[0]), (next) =>
                            fold(next, cont, step)
                          )
                        )
                )
              )
            } else {
              return pureEffect(initial)
            }
          }
          return fold
        })
      )
    )
  )
}

export function scanM<S, A, B, R2, E2>(
  seed: B,
  f: FunctionN<[B, A], Effect<S, R2, E2, B>>
): <S2, R, E>(s: Stream<S2, R, E, A>) => Stream<S2 | S, R & R2, E | E2, B> {
  return <S2, R, E>(s: Stream<S2, R, E, A>) => scanM_(s, f, seed)
}

/**
 * Purely scan a stream
 * @param stream
 * @param f
 * @param seed
 */
export function scan_<S, R, E, A, B>(
  stream: Stream<S, R, E, A>,
  f: FunctionN<[B, A], B>,
  seed: B
): Stream<S, R, E, B> {
  return scanM_(stream, (b, a) => pureEffect(f(b, a)), seed)
}

export function scan<A, B>(
  seed: B,
  f: FunctionN<[B, A], B>
): <S, R, E>(s: Stream<S, R, E, A>) => Stream<S, R, E, B> {
  return <S, R, E>(s: Stream<S, R, E, A>) => scan_(s, f, seed)
}

export function chain_<K, R, E, A, K2, R2, E2, B>(
  stream: Stream<K, R, E, A>,
  f: FunctionN<[A], Stream<K2, R2, E2, B>>
): Stream<K | K2, R & R2, E | E2, B> {
  return toS(
    map_Managed(
      fromS(stream as Stream<K | K2, R & R2, E | E2, A>),
      (outerfold) => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, B], Effect<K | K2, R & R2, E | E2, S>>
      ): Effect<K | K2, R & R2, E | E2, S> =>
        outerfold(initial, cont, (s, a) => {
          /* istanbul ignore next */
          if (cont(s)) {
            const inner = f(a) as Stream<K | K2, R & R2, E | E2, B>
            return useManaged(fromS(inner), (innerfold) => innerfold(s, cont, step))
          } else {
            return pureEffect(s)
          }
        })
    )
  )
}

/**
 * Monadic chain on a stream
 * @param stream
 * @param f
 */
export function chain<K, A, R2, E2, B>(
  f: FunctionN<[A], Stream<K, R2, E2, B>>
): <K2, R, E>(stream: Stream<K | K2, R, E, A>) => Stream<K | K2, R & R2, E | E2, B> {
  return <K2, R, E>(stream: Stream<K2, R, E, A>) =>
    toS(
      map_Managed(
        fromS(stream as Stream<K | K2, R & R2, E | E2, A>),
        (outerfold) => <S>(
          initial: S,
          cont: Predicate<S>,
          step: FunctionN<[S, B], Effect<K | K2, R & R2, E | E2, S>>
        ): Effect<K | K2, R & R2, E | E2, S> =>
          outerfold(initial, cont, (s, a) => {
            /* istanbul ignore next */
            if (cont(s)) {
              const inner = f(a) as Stream<K | K2, R & R2, E | E2, B>
              return useManaged(fromS(inner), (innerfold) => innerfold(s, cont, step))
            } else {
              return pureEffect(s)
            }
          })
      )
    )
}

/**
 * Flatten a stream of streams
 * @param stream
 */
export function flatten<S, R, E, S2, R2, E2, A>(
  stream: Stream<S, R, E, Stream<S2, R2, E2, A>>
): Stream<S | S2, R & R2, E | E2, A> {
  return chain_(stream, identity)
}

/**
 * Map each element of the stream effectfully
 * @param stream
 * @param f
 */
export function mapM_<S, R, E, A, S2, R2, E2, B>(
  stream: Stream<S, R, E, A>,
  f: FunctionN<[A], Effect<S2, R2, E2, B>>
): Stream<S | S2, R & R2, E | E2, B> {
  return chain_(stream, (a) => encaseEffect(f(a)))
}

export function mapM<S, A, R2, E2, B>(
  f: FunctionN<[A], Effect<S, R2, E2, B>>
): <S2, R, E>(s: Stream<S2, R, E, A>) => Stream<S | S2, R & R2, E2 | E, B> {
  return <S2, R, E>(s: Stream<S2, R, E, A>) => mapM_(s, f)
}

/**
 * A stream that emits no elements but never terminates.
 */
export const never: Async<never> = mapM_(once(undefined), constant(neverEffect))

type TDuceFused<FoldState, SinkState> = readonly [FoldState, SinkState, boolean]

/**
 * Transduce a stream via a sink.
 *
 * This repeatedly run a sink to completion on the elements of the input stream and emits the result of each run
 * Leftovers from a previous run are fed to the next run
 *
 * @param stream
 * @param sink
 */
export function transduce_<K, R, E, A, K2, R2, E2, S, B>(
  stream: Stream<K, R, E, A>,
  sink: Sink<K2, R2, E2, S, A, B>
): Stream<K | K2, R & R2, E | E2, B> {
  return toS(
    map_Managed(
      fromS(stream as Stream<K | K2, R & R2, E | E2, A>),
      (base) => <S0>(
        initial: S0,
        cont: Predicate<S0>,
        step: FunctionN<[S0, B], Effect<K | K2, R & R2, E | E2, S0>>
      ): Effect<K | K2, R & R2, E | E2, S0> => {
        function feedSink(
          foldState: S0,
          sinkState: S,
          chunk: A[]
        ): Effect<K | K2, R & R2, E | E2, TDuceFused<S0, S>> {
          return chain_Effect(stepMany(sink, sinkState, chunk), (nextSinkStep) =>
            isSinkCont(nextSinkStep)
              ? // We need to let more data in to drive the sink
                pureEffect([foldState, nextSinkStep.state, true] as const)
              : // We have a completion, so extract the value and then use it to advance the fold state
                pipe(
                  sinkStepState(nextSinkStep),
                  sink.extract,
                  chainEffect((b) => step(foldState, b)),
                  chainEffect((nextFoldState) => {
                    const leftover = sinkStepLeftover(nextSinkStep)
                    // We will re-initialize the sink
                    return pipe(
                      sink.initial,
                      chainEffect((nextNextSinkState) => {
                        if (cont(nextFoldState) && leftover.length > 0) {
                          return feedSink(
                            nextFoldState,
                            nextNextSinkState.state,
                            leftover as A[]
                          )
                        } else {
                          return pureEffect([
                            nextFoldState,
                            nextNextSinkState.state,
                            false as boolean
                          ] as const)
                        }
                      })
                    )
                  })
                )
          )
        }

        const derivedInitial = map_Effect(
          sink.initial,
          (initSink) => [initial, sinkStepState(initSink), false] as TDuceFused<S0, S>
        )

        return pipe(
          derivedInitial,
          chainEffect((init) =>
            base(
              init,
              (s) => cont(s[0]),
              (s, a) => feedSink(s[0], s[1], [a])
            )
          ),
          chainEffect(([foldState, sinkState, extract]) =>
            extract && cont(foldState)
              ? chain_Effect(sink.extract(sinkState), (b) => step(foldState, b))
              : pureEffect(foldState)
          )
        )
      }
    )
  )
}

export function transduce<K, A, R2, E2, S, B>(
  sink: Sink<K, R2, E2, S, A, B>
): <K2, R, E>(s: Stream<K2, R, E, A>) => Stream<K2 | K, R & R2, E | E2, B> {
  return <K2, R, E>(s: Stream<K2, R, E, A>) => transduce_(s, sink)
}

/**
 * Drop some number of elements from a stream
 *
 * Their effects to be produced still occur in the background
 * @param stream
 * @param n
 */
export function drop_<K, R, E, A>(
  stream: Stream<K, R, E, A>,
  n: number
): Stream<K, R, E, A> {
  return pipe(
    zipWithIndex(stream),
    filter(([_, i]) => i >= n),
    map(([a]) => a)
  )
}

export function drop(
  n: number
): <K, R, E, A>(s: Stream<K, R, E, A>) => Stream<K, R, E, A> {
  return <K, R, E, A>(s: Stream<K, R, E, A>) => drop_(s, n)
}

/**
 * Take some number of elements of a stream
 * @param stream
 * @param n
 */
export function take_<K, R, E, A>(
  stream: Stream<K, R, E, A>,
  n: number
): Stream<K, R, E, A> {
  return toS(
    map_Managed(
      fromS(stream),
      (fold) => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, A], Effect<K, R, E, S>>
      ): Effect<K, R, E, S> =>
        map_Effect(
          fold(
            t2(initial, 0),
            (t2s) => t2s[1] < n && cont(t2s[0]),
            (s, a) => map_Effect(step(s[0], a), (next) => t2(next, s[1] + 1))
          ),
          (t2s) => t2s[0]
        )
    )
  )
}

export function take(
  n: number
): <K, R, E, A>(s: Stream<K, R, E, A>) => Stream<K, R, E, A> {
  return <K, R, E, A>(s: Stream<K, R, E, A>) => take_(s, n)
}

/**
 * Take elements of a stream while a predicate holds
 * @param stream
 * @param pred
 */
export function takeWhile_<K, R, E, A>(
  stream: Stream<K, R, E, A>,
  pred: Predicate<A>
): Stream<K, R, E, A> {
  return toS(
    map_Managed(
      fromS(stream),
      (fold) => <S>(
        initial: S,
        cont: Predicate<S>,
        step: FunctionN<[S, A], Effect<K, R, E, S>>
      ): Effect<K, R, E, S> =>
        map_Effect(
          fold(
            t2(initial, true),
            (t2s) => t2s[1] && cont(t2s[0]),
            (s, a) =>
              pred(a)
                ? map_Effect(step(s[0], a), (next) => t2(next, true))
                : pureEffect(t2(s[0], false))
          ),
          (t2s) => t2s[0]
        )
    )
  )
}

export function takeWhile<A>(
  pred: Predicate<A>
): <K, R, E>(s: Stream<K, R, E, A>) => Stream<K, R, E, A> {
  return <K, R, E>(s: Stream<K, R, E, A>) => takeWhile_(s, pred)
}

/**
 * Take elements from a stream until a given effect resolves.
 *
 * @param until The effect that will terminate the stream
 * @param stream The stream
 */
export function takeUntil_<K, R1, E1, K2, R2, E2, A>(
  stream: Stream<K, R1, E1, A>,
  until: Effect<K2, R2, E2, any>
) {
  type Wrapped = { type: "until" } | { type: "stream"; value: A }
  type WrappedStream = Extract<Wrapped, { type: "stream" }>

  const wrappedUntil: Stream<K2, R1 & R2, E1 | E2, Wrapped> = as<Wrapped>({
    type: "until"
  })(encaseEffect(until))

  const wrappedStream: Stream<K, R1 & R2, E1 | E2, Wrapped> = pipe(
    stream,
    map((value): Wrapped => ({ type: "stream", value }))
  )

  return pipe(
    mergeAll([wrappedUntil, wrappedStream]),
    takeWhile((wrapped) => wrapped.type === "stream"),
    filter((wrapped): wrapped is WrappedStream => wrapped.type === "stream"),
    map((wrapped) => wrapped.value)
  )
}

export function takeUntil<K, R2, E2>(
  until: Effect<K, R2, E2, any>
): <K2, R1, E1, A>(s: Stream<K2, R1 & R2, E1 | E2, A>) => AsyncRE<R1 & R2, E1 | E2, A> {
  return <K2, R1, E1, A>(s: Stream<K2, R1 & R2, E1 | E2, A>) => takeUntil_(s, until)
}

/**
 * Push a stream into a sink to produce the sink's result
 * @param stream
 * @param sink
 */
export function into_<K, R, E, A, K2, R2, E2, S, B>(
  stream: Stream<K, R, E, A>,
  sink: Sink<K2, R2, E2, S, A, B>
): Effect<K | K2, R & R2, E | E2, B> {
  return useManaged(fromS(stream as Stream<K | K2, R & R2, E | E2, A>), (fold) =>
    pipe(
      sink.initial,
      chainEffect((init) => fold(init, isSinkCont, (s, a) => sink.step(s.state, a))),
      mapEffect((s) => s.state),
      chainEffect(sink.extract)
    )
  )
}

export function into<K, A, R2, E2, S, B>(
  sink: Sink<K, R2, E2, S, A, B>
): <K2, R, E>(s: Stream<K2, R, E, A>) => Effect<K2 | K, R & R2, E | E2, B> {
  return <K2, R, E>(s: Stream<K2, R, E, A>) => into_(s, sink)
}

/**
 * Push a stream into a sink to produce the sink's result
 * @param stream
 * @param managedSink
 */
export function intoManaged_<K, R, E, A, S, B, K2, R2, E2, K3, R3, E3>(
  stream: Stream<K, R, E, A>,
  managedSink: Managed<K2, R2, E2, Sink<K3, R3, E3, S, A, B>>
): Effect<K | K2 | K3, R & R2 & R3, E | E2 | E3, B> {
  return useManaged(managedSink, (sink) => into_(stream, sink))
}

export function intoManaged<K2, R2, E2, K3, R3, E3, A, S, B>(
  managedSink: Managed<K2, R2, E2, Sink<K3, R3, E3, S, A, B>>
): <K, R, E>(
  s: Stream<K, R, E, A>
) => Effect<K | K2 | K3, R & R2 & R3, E | E2 | E3, B> {
  return <K, R, E>(s: Stream<K, R, E, A>) => intoManaged_(s, managedSink)
}

/**
 * Push a stream in a sink to produce the result and the leftover
 * @param stream
 * @param sink
 */
export function intoLeftover_<K, R, E, A, S, B, K2, R2, E2>(
  stream: Stream<K, R, E, A>,
  sink: Sink<K2, R2, E2, S, A, B>
): Effect<K | K2, R & R2, E | E2, readonly [B, readonly A[]]> {
  return useManaged((stream as any) as StreamT<K, R, E, K2, R2, E2, A>, (fold) =>
    pipe(
      sink.initial,
      chainEffect((init) => fold(init, isSinkCont, (s, a) => sink.step(s.state, a))),
      chainEffect((end) =>
        map_Effect(sink.extract(end.state), (b) => [b, sinkStepLeftover(end)] as const)
      )
    )
  )
}

export function intoLeftover<A, S, B, K2, R2, E2>(
  sink: Sink<K2, R2, E2, S, A, B>
): <K, R, E>(
  s: Stream<K, R, E, A>
) => Effect<K2 | K, R & R2, E2 | E, readonly [B, readonly A[]]> {
  return <K, R, E>(s: Stream<K, R, E, A>) => intoLeftover_(s, sink)
}

function sinkQueue<S, R, E, A>(
  stream: Stream<S, R, E, A>
): Managed<
  unknown,
  R,
  E,
  readonly [ConcurrentQueue<Option<A>>, Deferred<unknown, R, E, Option<A>>]
> {
  return chain_Managed(
    zipManaged(
      // 0 allows maximum backpressure throttling (i.e. a reader must be waiting already to produce the item)
      encaseEffectManaged(boundedQueue<Option<A>>(0)),
      encaseEffectManaged(makeDeferred<unknown, R, E, Option<A>, E>())
    ),
    ([q, latch]) => {
      const write = foldExit_Effect(
        into_(map_(stream, some), queueSink(q)) as AsyncEffectRE<R, E, void>,
        (c) => latch.cause(c),
        constant(q.offer(none))
      )

      return asManaged(fiberManaged(write), [q, latch] as const)
    }
  )
}

/**
 * Zip two streams together termitating when either stream is exhausted
 * @param as
 * @param bs
 * @param f
 */
export function zipWith_<S, R, E, A, S2, R2, E2, B, C>(
  as: Stream<S, R, E, A>,
  bs: Stream<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  const source = zipWithManaged(
    sinkQueue(as),
    sinkQueue(bs),
    ([aq, alatch], [bq, blatch]) => {
      const atake = pipe(
        aq.take,
        chainTapEffect((opt) =>
          pipe(
            opt,
            foldOption(
              // Confirm we have seen the last element
              () => alatch.done(none),
              () => unitEffect // just keep going
            )
          )
        )
      )
      const agrab = raceFirstEffect(atake, alatch.wait)
      const btake = pipe(
        bq.take,
        chainTapEffect((opt) =>
          pipe(
            opt,
            foldOption(
              // Confirm we have seen the last element
              () => blatch.done(none),
              () => unitEffect // just keep going
            )
          )
        )
      )
      const bgrab = raceFirstEffect(btake, blatch.wait)

      return zipWith_Effect(agrab, bgrab, (aOpt, bOpt) =>
        chain__1(aOpt, (a) => map__1(bOpt, (b) => f(a, b)))
      )
    }
  )

  return fromSource(source)
}

export function zipWith<A, S2, R2, E2, B, C>(
  bs: Stream<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): <S, R, E>(s: Stream<S, R, E, A>) => AsyncRE<R & R2, E | E2, C> {
  return <S, R, E>(s: Stream<S, R, E, A>) => zipWith_(s, bs, f)
}

/**
 * zipWith to form tuples
 * @param as
 * @param bs
 */
export function zip_<S, R, E, A, S2, R2, E2, B>(
  as: Stream<S, R, E, A>,
  bs: Stream<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, readonly [A, B]> {
  return zipWith_(as, bs, (a, b) => [a, b] as const)
}

export function zip<S2, R2, E2, B>(bs: Stream<S2, R2, E2, B>) {
  return <S, R, E, A>(as: Stream<S, R, E, A>) => zip_(bs, as)
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
  breaker: Deferred<unknown, R, E, Option<A>>
): AsyncEffectRE<R, E, Option<A>> {
  const take = pipe(
    queue.take,
    chainTapEffect((opt) =>
      pipe(
        opt,
        foldOption(
          // Confirm we have seen the last element by closing the breaker so subsequent reads see it
          constant(breaker.done(none)),
          // do nothing to the breaker if we got an element
          constant(unitEffect)
        )
      )
    )
  )
  return raceFirstEffect(take, breaker.wait)
}

/**
 * Construct a Source for a Stream.
 * During the scope of the Managed, Wave will repeatedly pull items from a queue being managed in the background
 * @param stream
 */
function streamQueueSource<S, R, E, A>(
  stream: Stream<S, R, E, A>
): ManagedAsyncRE<R, E, AsyncEffectRE<R, E, Option<A>>> {
  return map_Managed(sinkQueue(stream), ([q, breaker]) =>
    queueBreakerSource(q, breaker)
  )
}

/**
 * Feed a stream into a sink to produce a value.
 *
 * Emits the value and a 'remainder' stream that includes the rest of the elements of the input stream.
 * @param stream
 * @param sink
 */
export function peel_<K, R, E, A, S, B, K2, R2, E2>(
  stream: Stream<K, R, E, A>,
  sink: Sink<K2, R2, E2, S, A, B>
): AsyncRE<R & R2, E | E2, readonly [B, AsyncRE<R & R2, E | E2, A>]> {
  return toS(
    chain_Managed(streamQueueSource(stream), (pull) => {
      const pullStream = fromSource(pureManaged(pull))
      // We now have a shared pull instantiation that we can use as a sink to drive and return as a stream
      return fromS(
        pipe(
          encaseEffect(intoLeftover_(pullStream, sink)),
          map(([b, left]) => [b, concat_(fromArray(left), pullStream)] as const)
        )
      )
    })
  )
}

export function peel<K, A, S, B, R2, E2>(sink: Sink<K, R2, E2, S, A, B>) {
  return <K2, R, E>(s: Stream<K2, R, E, A>) => peel_(s, sink)
}

export function peelManaged_<K, R, E, A, S, B, R2, E2, K2, K3, R3, E3>(
  stream: Stream<K, R, E, A>,
  managedSink: Managed<K2, R2, E2, Sink<K3, R3, E3, S, A, B>>
): Stream<
  unknown,
  R & R2 & R3,
  E | E2 | E3,
  readonly [B, AsyncRE<R & R2 & R3, E | E2 | E3, A>]
> {
  return toS(chain_Managed(managedSink, (sink) => fromS(peel_(stream, sink))))
}

export function peelManaged<A, S, B, K2, R2, E2, K3, R3, E3>(
  managedSink: Managed<K2, R2, E2, Sink<K3, R3, E3, S, A, B>>
) {
  return <K, R, E>(s: Stream<K, R, E, A>) => peelManaged_(s, managedSink)
}

function interruptFiberSlot(
  slot: Ref<Option<Fiber<never, void>>>
): AsyncEffect<Option<Exit<never, void>>> {
  return chain_Effect(slot.get, (optFiber) =>
    pipe(
      optFiber,
      foldOption(
        () => pureEffect(none),
        (f) => map_Effect(f.interrupt, some)
      )
    )
  )
}

function waitFiberSlot(slot: Ref<Option<Fiber<never, void>>>): AsyncEffect<void> {
  return chain_Effect(slot.get, (optFiber) =>
    pipe(
      optFiber,
      foldOption(
        () => pureEffect(undefined as void),
        (f) => asUnitEffect(f.wait)
      )
    )
  )
}

function singleFiberSlot(): ManagedAsync<Ref<Option<Fiber<never, void>>>> {
  return bracketManaged(makeRef<Option<Fiber<never, void>>>(none), interruptFiberSlot)
}

/**
 * Create a stream that switches to emitting elements of the most recent input stream.
 * @param stream
 */
export function switchLatest<R, E, A, R2, E2>(
  stream: AsyncRE<R, E, AsyncRE<R2, E2, A>>
): AsyncRE<R & R2, E | E2, A> {
  const source = chain_Managed(streamQueueSource(stream), (
    pull // read streams
  ) =>
    chain_Managed(
      zipManaged(
        // The queue and latch to push into
        encaseEffectManaged(boundedQueue<Option<A>>(0)),
        encaseEffectManaged(makeDeferred<unknown, R, E, Option<A>, E>())
      ),
      ([pushQueue, pushBreaker]) =>
        // The internal latch that can be used to signal failures and shut down the read process
        chain_Managed(
          encaseEffectManaged(makeDeferred<unknown, unknown, never, Cause<E>, E>()),
          (internalBreaker) =>
            // somewhere to hold the currently running fiber so we can interrupt it on termination
            chain_Managed(singleFiberSlot(), (fiberSlot) => {
              const interruptPushFiber = interruptFiberSlot(fiberSlot)
              // Spawn a fiber that should push elements from stream into pushQueue as long as it is able
              function spawnPushFiber(
                stream: AsyncRE<R & R2, E | E2, A>
              ): AsyncEffectRE<R & R2, never, Option<Exit<never, void>>> {
                const writer = pipe(
                  // The writer process pushes things into the queue
                  into_(map_(stream, some), queueSink(pushQueue)) as any,
                  // We need to trap any errors that occur and send those to internal latch to halt the process
                  // Dont' worry about interrupts, because we perform cleanups for single fiber slot
                  foldExitEffect(
                    (e: Cause<E>) => internalBreaker.done(e),
                    constant(pureEffect(undefined)) // we can do nothing because we will delegate to the proxy
                  )
                )

                return applyFirstEffect(
                  interruptPushFiber,
                  chain_Effect(forkEffect(writer), (f) => fiberSlot.set(some(f)))
                )
              }

              // pull streams and setup the push fibers appropriately
              function advanceStreams(): AsyncEffectRE<R & R2, never, void> {
                // We need a way of looking ahead to see errors in the output streams in order to cause termination
                // The push fiber will generate this when it encounters a failure
                const breakerError = chain_Effect(internalBreaker.wait, raisedEffect)

                return foldExit_Effect(
                  raceFirstEffect(pull, breakerError),
                  // In the event of an error either from pull or from upstream we need to shut everything down
                  // On managed unwind the active production fiber will be interrupted if there is one
                  (cause) => pushBreaker.cause(cause),
                  (nextOpt) =>
                    pipe(
                      nextOpt,
                      foldOption(
                        // nothing left, so we should wait the push fiber's completion and then forward the termination
                        () =>
                          pipe(
                            raceEffect(breakerError, waitFiberSlot(fiberSlot)),
                            foldExitEffect(
                              (c) => pushBreaker.cause(c), // if we get a latchError forward it through to downstream
                              constant(pushQueue.offer(none)) // otherwise we are done, so lets forward that
                            )
                          ),
                        (next) =>
                          applySecondEffectL(spawnPushFiber(next), advanceStreams)
                      )
                    )
                )
              }
              // We can configure this source now, but it will be invalid outside of running fibers
              // Thus we can use managed.fiber
              const downstreamSource = queueBreakerSource(pushQueue, pushBreaker)
              return asManaged(fiberManaged(advanceStreams()), downstreamSource)
            })
        )
    )
  )
  return fromSource(source)
}

/**
 * Create a stream that switches to emitting the elements of the most recent stream produced by applying f to the
 * element most recently emitted
 * @param stream
 * @param f
 */

/* istanbul ignore next */
export function chainSwitchLatest_<S, R, E, A, S2, R2, E2, B>(
  stream: Stream<S, R, E, A>,
  f: FunctionN<[A], Stream<S2, R2, E2, B>>
): AsyncRE<R & R2, E | E2, B> {
  return switchLatest(map_(stream, f))
}

/* istanbul ignore next */
export function chainSwitchLatest<A, S2, R2, E2, B>(
  f: FunctionN<[A], Stream<S2, R2, E2, B>>
): <S, R, E>(s: Stream<S, R, E, A>) => AsyncRE<R & R2, E2 | E, B> {
  return <S, R, E>(s: Stream<S, R, E, A>) => chainSwitchLatest_(s, f)
}

interface Weave {
  attach<S, R>(action: Effect<S, R, never, void>): Effect<S, R, never, void>
}

type WeaveHandle = readonly [number, Fiber<never, void>]

function interruptWeaveHandles(ref: Ref<WeaveHandle[]>): AsyncEffect<void> {
  return chain_Effect(ref.get, (fibers) =>
    asUnitEffect(
      traverseArrayEffect((fiber: WeaveHandle) => fiber[1].interrupt)(fibers)
    )
  )
}

// Track many fibers for the purpose of clean interruption on failure
const makeWeave: ManagedAsync<Weave> = chain_Managed(
  encaseEffectManaged(makeRef(0)),
  (cell) =>
    // On cleanup we want to interrupt any running fibers
    map_Managed(
      bracketManaged(makeRef<WeaveHandle[]>([]), interruptWeaveHandles),
      (store) => {
        function attach(action: SyncEffect<void>): SyncEffect<void> {
          return pipe(
            sequenceSEffect({
              next: cell.update((n) => n + 1),
              fiber: forkEffect(action)
            }),
            chainTapEffect(({ fiber, next }) =>
              store.update((handles) => [...handles, [next, fiber] as const])
            ),
            chainTapEffect(({ fiber, next }) =>
              forkEffect(
                applySecondEffect(
                  fiber.wait,
                  store.update(filterArray((h) => h[0] !== next))
                )
              )
            ),
            asUnitEffect
          )
        }
        return { attach }
      }
    )
)

/**
 * Merge a stream of streams into a single stream.
 *
 * This stream will run up to maxActive streams concurrently to produce values into the output stream.
 * @param stream the input stream
 * @param maxActive the maximum number of streams to hold active at any given time
 * this controls how much active streams are able to collectively produce in the face of a slow downstream consumer
 */
export function merge_<K, R, E, A, K2, R2, E2>(
  stream: Stream<K, R, E, Stream<K2, R2, E2, A>>,
  maxActive: number
): AsyncRE<R & R2, E | E2, A> {
  const source = chain_Managed(streamQueueSource(stream), (pull) =>
    chain_Managed(encaseEffectManaged(makeSemaphore(maxActive)), (sem) =>
      // create the queue that output will be forced into
      chain_Managed(encaseEffectManaged(boundedQueue<Option<A>>(0)), (pushQueue) =>
        // create the mechanism t hrough which we can signal completion
        chain_Managed(
          encaseEffectManaged(
            makeDeferred<unknown, R & R2, E | E2, Option<A>, E | E2>()
          ),
          (pushBreaker) =>
            chain_Managed(makeWeave, (weave) =>
              chain_Managed(
                encaseEffectManaged(
                  makeDeferred<unknown, unknown, never, Cause<E | E2>, E | E2>()
                ),
                (internalBreaker) => {
                  // create a wave action that will proxy elements created by running the stream into the push queue
                  // if any errors occur, we set the breaker
                  function spawnPushFiber(
                    stream: Stream<K2, R2, E2, A>
                  ): AsyncEffectRE<R2, never, void> {
                    const writer = pipe(
                      // Process to sink elements into the queue
                      into_(map_(stream, some), queueSink(pushQueue)) as any,
                      // TODO: I don't think we need to handle interrupts, it shouldn't be possible
                      foldExitEffect(
                        (e: Cause<E>) => internalBreaker.done(e),
                        constant(pureEffect(undefined))
                      )
                    )
                    return weave.attach(sem.withPermit(writer)) // we need a permit to start
                  }

                  // The action that will pull a single stream upstream and attempt to activate it to push downstream
                  function advanceStreams(): AsyncEffectRE<R & R2, never, void> {
                    const breakerError = chain_Effect(
                      internalBreaker.wait,
                      raisedEffect
                    )

                    return foldExit_Effect(
                      raceFirstEffect(
                        pull, // we don't want to pull until there is capacity
                        breakerError
                      ),
                      (c) => pushBreaker.cause(c), // if upstream errored, we should push the failure downstream immediately
                      (
                        nextOpt // otherwise we should
                      ) =>
                        pipe(
                          nextOpt,
                          foldOption(
                            // The end has occured
                            constant(
                              pipe(
                                // We will wait for an error or all active produces to finish
                                raceEffect(breakerError, sem.acquireN(maxActive)),
                                foldExitEffect(
                                  (c) => pushBreaker.cause(c),
                                  constant(pushQueue.offer(none))
                                )
                              )
                            ),
                            // Start the push fiber and then keep going
                            (next) =>
                              applySecondEffectL(
                                sem.withPermit(spawnPushFiber(next)),
                                constant(advanceStreams())
                              )
                          )
                        )
                    )
                  }
                  const downstreamSource = queueBreakerSource(pushQueue, pushBreaker)
                  return asManaged(fiberManaged(advanceStreams()), downstreamSource)
                }
              )
            )
        )
      )
    )
  )
  return fromSource(source)
}

export function merge(
  maxActive: number
): <K, R, E, A, K2, R2, E2>(
  stream: Stream<K, R, E, Stream<K2, R2, E2, A>>
) => AsyncRE<R & R2, E | E2, A> {
  return <K, R, E, A, K2, R2, E2>(stream: Stream<K, R, E, Stream<K2, R2, E2, A>>) =>
    merge_(stream, maxActive)
}

export function chainMerge_<S, R, E, A, B, S2, R2, E2>(
  stream: Stream<S, R, E, A>,
  f: FunctionN<[A], Stream<S2, R2, E2, B>>,
  maxActive: number
): AsyncRE<R & R2, E | E2, B> {
  return merge_(map_(stream, f), maxActive)
}

export function chainMerge<K, A, B, R2, E2>(
  maxActive: number,
  f: FunctionN<[A], Stream<K, R2, E2, B>>
) {
  return <K2, R, E>(s: Stream<K2, R, E, A>) => chainMerge_(s, f, maxActive)
}

export function mergeAll<R, E, A>(streams: Array<AsyncRE<R, E, A>>): AsyncRE<R, E, A> {
  return merge_(
    (fromArray(streams) as any) as AsyncRE<R, E, AsyncRE<R, E, A>>,
    streams.length
  )
}

/**
 * Drop elements of the stream while a predicate holds
 * @param stream
 * @param pred
 */
export function dropWhile_<S, R, E, A>(
  stream: Stream<S, R, E, A>,
  pred: Predicate<A>
): AsyncRE<R, E, A> {
  return chain_(peel_(stream, drainWhileSink(pred)), ([head, rest]) =>
    concat_((fromOption(head) as any) as Stream<S, R, E, A>, rest)
  )
}

export function dropWhile<A>(
  pred: Predicate<A>
): <K, R, E>(s: Stream<K, R, E, A>) => AsyncRE<R, E, A> {
  return <K, R, E>(s: Stream<K, R, E, A>) => dropWhile_(s, pred)
}

/**
 * Collect all the elements emitted by a stream into an array.
 * @param stream
 */
export function collectArray<K, R, E, A>(
  stream: Stream<K, R, E, A>
): Effect<K, R, E, A[]> {
  return into_(stream, /*#__PURE__*/ collectArraySink())
}

/**
 * Evaluate a stream for its effects
 * @param stream
 */
export function drain<K, R, E, A>(stream: Stream<K, R, E, A>): Effect<K, R, E, void> {
  return into_(stream, drainSink())
}

export interface StreamF {
  as<S, R, E, A, B>(stream: Stream<S, R, E, A>, b: B): Stream<S, R, E, B>
  chainMerge<S, R, E, A, B, S2, R2, E2>(
    stream: Stream<S, R, E, A>,
    f: FunctionN<[A], Stream<S2, R2, E2, B>>,
    maxActive: number
  ): AsyncRE<R & R2, E | E2, B>
  chainSwitchLatest<S, R, E, A, S2, R2, E2, B>(
    stream: Stream<S, R, E, A>,
    f: FunctionN<[A], Stream<S2, R2, E2, B>>
  ): AsyncRE<R & R2, E | E2, B>
  concat<S, R, E, A, S2, R2, E2>(
    stream1: Stream<S, R, E, A>,
    stream2: Stream<S2, R2, E2, A>
  ): Stream<S | S2, R & R2, E | E2, A>
  concatL<K, R, E, A, K2, R2, E2>(
    stream1: Stream<K, R, E, A>,
    stream2: Lazy<Stream<K2, R2, E2, A>>
  ): Stream<K | K2, R & R2, E | E2, A>
  distinctAdjacent<K, R, E, A>(
    stream: Stream<K, R, E, A>,
    eq: Eq<A>
  ): Stream<K, R, E, A>
  drop<K, R, E, A>(stream: Stream<K, R, E, A>, n: number): Stream<K, R, E, A>
  dropWhile<S, R, E, A>(
    stream: Stream<S, R, E, A>,
    pred: Predicate<A>
  ): AsyncRE<R, E, A>
  filter<K, R, E, A>(stream: Stream<K, R, E, A>, f: Predicate<A>): Stream<K, R, E, A>
  fold<S, R, E, A, B>(
    stream: Stream<S, R, E, A>,
    f: FunctionN<[B, A], B>,
    seed: B
  ): Stream<S, R, E, B>
  foldM<K, R, E, A, K2, R2, E2, B>(
    stream: Stream<K, R, E, A>,
    f: FunctionN<[B, A], Effect<K2, R2, E2, B>>,
    seed: B
  ): Stream<K | K2, R & R2, E | E2, B>
  into<K, R, E, A, K2, R2, E2, S, B>(
    stream: Stream<K, R, E, A>,
    sink: Sink<K2, R2, E2, S, A, B>
  ): Effect<K | K2, R & R2, E | E2, B>
  intoLeftover<K, R, E, A, S, B, K2, R2, E2>(
    stream: Stream<K, R, E, A>,
    sink: Sink<K2, R2, E2, S, A, B>
  ): Effect<K | K2, R & R2, E | E2, readonly [B, readonly A[]]>
  intoManaged<K, R, E, A, S, B, K2, R2, E2, K3, R3, E3>(
    stream: Stream<K, R, E, A>,
    managedSink: Managed<K2, R2, E2, Sink<K3, R3, E3, S, A, B>>
  ): Effect<K | K2 | K3, R & R2 & R3, E | E2 | E3, B>
  mapM<S, R, E, A, S2, R2, E2, B>(
    stream: Stream<S, R, E, A>,
    f: FunctionN<[A], Effect<S2, R2, E2, B>>
  ): Stream<S | S2, R & R2, E | E2, B>
  merge<K, R, E, A, K2, R2, E2>(
    stream: Stream<K, R, E, Stream<K2, R2, E2, A>>,
    maxActive: number
  ): AsyncRE<R & R2, E | E2, A>
  peel<K, R, E, A, S, B, K2, R2, E2>(
    stream: Stream<K, R, E, A>,
    sink: Sink<K2, R2, E2, S, A, B>
  ): AsyncRE<R & R2, E | E2, readonly [B, AsyncRE<R & R2, E | E2, A>]>
  peelManaged<K, R, E, A, S, B, R2, E2, K2, K3, R3, E3>(
    stream: Stream<K, R, E, A>,
    managedSink: Managed<K2, R2, E2, Sink<K3, R3, E3, S, A, B>>
  ): Stream<
    unknown,
    R & R2 & R3,
    E | E2 | E3,
    readonly [B, AsyncRE<R & R2 & R3, E | E2 | E3, A>]
  >
  scan<S, R, E, A, B>(
    stream: Stream<S, R, E, A>,
    f: FunctionN<[B, A], B>,
    seed: B
  ): Stream<S, R, E, B>
  scanM<K, R, E, A, B, K2, R2, E2>(
    stream: Stream<K, R, E, A>,
    f: FunctionN<[B, A], Effect<K2, R2, E2, B>>,
    seed: B
  ): Stream<K | K2, R & R2, E | E2, B>
  take<K, R, E, A>(stream: Stream<K, R, E, A>, n: number): Stream<K, R, E, A>
  takeWhile<K, R, E, A>(
    stream: Stream<K, R, E, A>,
    pred: Predicate<A>
  ): Stream<K, R, E, A>
  transduce<K, R, E, A, K2, R2, E2, S, B>(
    stream: Stream<K, R, E, A>,
    sink: Sink<K2, R2, E2, S, A, B>
  ): Stream<K | K2, R & R2, E | E2, B>
  takeUntil<K, R1, E1, K2, R2, E2, A>(
    stream: Stream<K, R1, E1, A>,
    until: Effect<K2, R2, E2, any>
  ): AsyncRE<R1 & R2, E1 | E2, A>
  zip<S, R, E, A, S2, R2, E2, B>(
    as: Stream<S, R, E, A>,
    bs: Stream<S2, R2, E2, B>
  ): AsyncRE<R & R2, E | E2, readonly [A, B]>
  zipWith<S, R, E, A, S2, R2, E2, B, C>(
    as: Stream<S, R, E, A>,
    bs: Stream<S2, R2, E2, B>,
    f: FunctionN<[A, B], C>
  ): AsyncRE<R & R2, E | E2, C>
}

export const of = <S, R, E, A>(a: A): Stream<S, R, E, A> =>
  (once(a) as any) as Stream<S, R, E, A>

export const ap_ = <S1, S2, R, R2, E, E2, A, B>(
  sfab: Stream<S1, R, E, FunctionN<[A], B>>,
  sa: Stream<S2, R2, E2, A>
) => zipWith_(sfab, sa, (f, a) => f(a))

export const stream: Monad4EP<URI> & StreamF = {
  URI,
  _CTX: "async",
  map: map_,
  of,
  ap: ap_,
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
  takeUntil: takeUntil_,
  transduce: transduce_,
  zip: zip_,
  zipWith: zipWith_
}

export const Do = () => DoG(stream)
export const For = () => ForM(stream)

export const traverseOption: <S, A, R, E, B>(
  f: (a: A) => Stream<S, R, E, B>
) => (ta: Option<A>) => AsyncRE<R, E, Option<B>> = (f) => (ta) =>
  o_traverse(stream)(ta, f)

export const wiltOption: <S, A, R, E, B, C>(
  f: (a: A) => Stream<S, R, E, Either<B, C>>
) => (wa: Option<A>) => AsyncRE<R, E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  o_wilt(stream)(wa, f)

export const witherOption: <S, A, R, E, B>(
  f: (a: A) => Stream<S, R, E, Option<B>>
) => (ta: Option<A>) => AsyncRE<R, E, Option<B>> = (f) => (ta) =>
  o_wither(stream)(ta, f)

export const traverseEither: <S, A, R, FE, B>(
  f: (a: A) => Stream<S, R, FE, B>
) => <TE>(ta: Either<TE, A>) => AsyncRE<R, FE, Either<TE, B>> = (f) => (ta) =>
  e_traverse(stream)(ta, f)

export const traverseTree: <S, A, R, E, B>(
  f: (a: A) => Stream<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) => t_traverse(stream)(ta, f)

export const traverseArray: <S, A, R, E, B>(
  f: (a: A) => Stream<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  a_traverse(stream)(ta, f)

export const traverseArrayWithIndex: <S, A, R, E, B>(
  f: (i: number, a: A) => Stream<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  a_traverseWithIndex(stream)(ta, f)

export const wiltArray: <S, A, R, E, B, C>(
  f: (a: A) => Stream<S, R, E, Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  a_wilt(stream)(wa, f)

export const witherArray: <S, A, R, E, B>(
  f: (a: A) => Stream<S, R, E, Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) => a_wither(stream)(ta, f)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => Stream<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  r_traverse_(stream)(ta, f)

export const traverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Stream<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  r_traverseWithIndex_(stream)(ta, f)

export const wiltRecord: <A, S, R, E, B, C>(
  f: (a: A) => Stream<S, R, E, Either<B, C>>
) => (
  wa: Record<string, A>
) => AsyncRE<R, E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  r_wilt(stream)(wa, f)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => Stream<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  r_wither(stream)(ta, f)

export function subject<S, R, E, A>(_: Stream<S, R, E, A>) {
  const listeners: Map<any, (_: Ops<E, A>) => void> = new Map()

  function next(_: Ops<E, A>) {
    listeners.forEach((f) => {
      f(_)
    })
  }

  return DoEffect()
    .bind("q", unboundedQueue<Option<A>>())
    .bindL("into", ({ q }) =>
      pipe(
        _,
        into(queueOptionSink(q)),
        chainErrorEffect((e) =>
          pipe(
            syncEffect(() => {
              next({ _tag: "error", e })
            }),
            chainEffect(() => raiseErrorEffect(e))
          )
        ),
        forkEffect
      )
    )
    .bindL("extract", ({ q }) =>
      pipe(
        q.take,
        chainTapEffect((_) =>
          syncEffect(() =>
            next(isSome(_) ? { _tag: "offer", a: _.value } : { _tag: "complete" })
          )
        ),
        foreverEffect,
        forkEffect
      )
    )
    .return(({ extract, into }) => {
      const interrupt = pipe(
        sequenceTEffect(
          into.interrupt,
          extract.interrupt,
          syncEffect(() => {
            next({ _tag: "complete" })
          })
        ),
        asUnitEffect
      )

      const subscribe = syncEffect(() => {
        const { hasCB, next, ops } = queueUtils<E, A>()

        const push = (_: Ops<E, A>) => {
          next(_)
        }

        listeners.set(push, push)

        return fromSource(
          pipe(
            bracketManaged(unitEffect, () =>
              syncEffect(() => {
                listeners.delete(push)
              })
            ),
            chainManaged(() => emitter(ops, hasCB))
          )
        )
      })

      return {
        interrupt,
        subscribe
      }
    })
}
