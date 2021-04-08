// tracing: off

import * as cause from "../Cause"
import * as A from "../Collections/Immutable/Array"
import * as L from "../Collections/Immutable/List"
import type { Exit } from "../Exit"
import * as Ex from "../Exit"
import type { FiberContext } from "../Fiber/context"
import type * as Fiber from "../Fiber/core"
import { interrupt as fiberInterrupt } from "../Fiber/interrupt"
import { identity, pipe, tuple } from "../Function"
import * as I from "../Iterable"
import { descriptorWith } from "../Managed/deps-core"
import { Managed } from "../Managed/managed"
import type { ReleaseMap, State } from "../Managed/ReleaseMap"
import { add } from "../Managed/ReleaseMap/add"
import { Exited } from "../Managed/ReleaseMap/Exited"
import { makeReleaseMap } from "../Managed/ReleaseMap/makeReleaseMap"
import * as O from "../Option"
import type { Promise } from "../Promise"
import * as promise from "../Promise"
import * as Q from "../Queue/core"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import type { MutableQueue } from "../Support/MutableQueue"
import { Bounded, Unbounded } from "../Support/MutableQueue"
import * as andThen from "./andThen"
import * as asUnit from "./asUnit"
import * as bracket from "./bracket"
import { bracketExit_ } from "./bracketExit"
import * as catchAll from "./catchAll"
import * as core from "./core"
import * as coreScope from "./core-scope"
import * as Do from "./do"
import { done } from "./done"
import type { Effect, UIO } from "./effect"
import * as ensuring from "./ensuring"
import { environment } from "./environment"
import * as Ref from "./excl-deps-ref"
import type { ExecutionStrategy } from "./ExecutionStrategy"
import { sequential } from "./ExecutionStrategy"
import * as fiberId from "./fiberId"
import * as flatten from "./flatten"
import * as ifM from "./ifM"
import * as interruption from "./interruption"
import * as map from "./map"
import { provideSome_ } from "./provideSome"
import * as tap from "./tap"
import * as tapCause from "./tapCause"
import { toManaged } from "./toManaged"
import * as whenM from "./whenM"
import * as zipWith from "./zipWith"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 */
export function forEach_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  return core.suspend(
    () =>
      I.reduce_(as, core.effectTotal(() => []) as Effect<R, E, B[]>, (b, a) =>
        zipWith.zipWith_(b, f(a), (acc, r) => {
          acc.push(r)
          return acc
        })
      ),
    __trace
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 *
 * @dataFirst forEach_
 */
export function forEach<A, R, E, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>) => forEach_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 */
export function forEachUnit_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  return core.suspend(
    () =>
      pipe(
        core.effectTotal(() => as[Symbol.iterator]()),
        core.chain((iterator) => {
          function loop(): Effect<R, E, void> {
            const next = iterator.next()
            return next.done
              ? core.unit
              : pipe(
                  f(next.value),
                  core.chain(() => loop())
                )
          }
          return loop()
        })
      ),
    __trace
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @dataFirst forEachUnit_
 */
export function forEachUnit<R, E, A, X>(
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): (as: Iterable<A>) => Effect<R, E, void> {
  return (as) => forEachUnit_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export function forEachUnitPar_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  const collection = L.from(as)
  const size = L.size(collection)
  if (L.isEmpty(collection)) {
    return core.unit
  }
  return core.suspend(
    () =>
      pipe(
        Do.do,
        Do.bind("parentId", () => fiberId.fiberId),
        Do.bind("causes", () => Ref.makeRef<cause.Cause<E>>(cause.empty)),
        Do.bind("result", () => promise.make<void, void>()),
        Do.bind("status", () =>
          Ref.makeRef<readonly [number, number, boolean]>(tuple(0, 0, false))
        ),
        Do.let("startTask", ({ status }) =>
          pipe(
            status,
            Ref.modify(([started, done, failing]) => {
              if (failing) {
                return tuple(false, tuple(started, done, failing))
              }
              return tuple(true, tuple(started + 1, done, failing))
            })
          )
        ),
        Do.let("startFailure", ({ result, status }) =>
          pipe(
            status,
            Ref.update(([started, done, _]) => tuple(started, done, true)),
            andThen.andThen(promise.fail<void>(undefined)(result))
          )
        ),
        Do.let(
          "task",
          ({ causes, parentId, result, startFailure, startTask, status }) => (a: A) =>
            pipe(
              ifM.ifM_(
                startTask,
                () =>
                  pipe(
                    core.suspend(() => f(a)),
                    interruption.interruptible,
                    tapCause.tapCause((c) =>
                      pipe(
                        causes,
                        Ref.update((_) => cause.both(_, c)),
                        andThen.andThen(startFailure)
                      )
                    ),
                    ensuring.ensuring(
                      (() => {
                        const isComplete = pipe(
                          status,
                          Ref.modify(([started, done, failing]) => {
                            const newDone = done + 1

                            return tuple(
                              (failing ? started : size) === newDone,
                              tuple(started, newDone, failing)
                            )
                          })
                        )

                        return pipe(
                          promise.succeed<void>(undefined)(result),
                          whenM.whenM(isComplete)
                        )
                      })()
                    )
                  ),
                () =>
                  pipe(
                    causes,
                    Ref.update((_) => cause.both(_, cause.interrupt(parentId)))
                  )
              ),
              interruption.uninterruptible
            )
        ),
        Do.bind("fibers", ({ task }) =>
          coreScope.transplant((graft) =>
            forEach_(as, (a) => core.fork(graft(task(a))))
          )
        ),
        Do.let("interrupter", ({ fibers, parentId, result }) =>
          pipe(
            result,
            promise.await,
            catchAll.catchAll(() =>
              pipe(
                forEach_(fibers, (_) => core.fork(_.interruptAs(parentId))),
                core.chain(fiberJoinAll)
              )
            ),
            forkManaged
          )
        ),
        tap.tap(({ causes, fibers, interrupter, result }) =>
          managedUse_(interrupter, () =>
            pipe(
              result,
              promise.fail<void>(undefined),
              andThen.andThen(pipe(causes.get, core.chain(core.halt))),
              whenM.whenM(
                pipe(
                  forEach_(fibers, (_) => _.await),
                  map.map((_) => _.findIndex((ex) => !Ex.succeeded(ex)) !== -1)
                )
              )
            )
          )
        ),
        asUnit.asUnit
      ),
    __trace
  )
}

/**
 * Forks the fiber in a `Managed`. Using the `Managed` value will
 * execute the effect in the fiber, while ensuring its interruption when
 * the effect supplied to `use` completes.
 */
export function forkManaged<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Managed<R, never, FiberContext<E, A>> {
  return managedFork(toManaged(self), __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 *
 * @dataFirst forEachUnitPar_
 */
export function forEachUnitPar<R, E, A, X>(
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachUnitPar_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  const arr = Array.from(as)

  return core.suspend(
    () =>
      core.chain_(
        core.effectTotal<B[]>(() => []),
        (array) => {
          function fn([a, n]: [A, number]) {
            return core.chain_(
              core.suspend(() => f(a)),
              (b) =>
                core.effectTotal(() => {
                  array[n] = b
                })
            )
          }
          return map.map_(
            forEachUnitPar_(
              arr.map((a, n) => [a, n] as [A, number]),
              fn
            ),
            () => array
          )
        }
      ),
    __trace
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @dataFirst forEachPar_
 */
export function forEachPar<R, E, A, B>(f: (a: A) => Effect<R, E, B>, __trace?: string) {
  return (as: Iterable<A>): Effect<R, E, readonly B[]> => forEachPar_(as, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `forEachUnitPar_`, this method will use at most up to `n` fibers.
 */
export function forEachUnitParN_<R, E, A, X>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
): Effect<R, E, void> {
  const as_ = L.from(as)
  const size = L.size(as_)

  function worker(q: Q.Queue<A>, ref: Ref.Ref<number>): Effect<R, E, void> {
    return pipe(
      q.take,
      core.chain(f),
      core.chain(() => worker(q, ref)),
      whenM.whenM(
        pipe(
          ref,
          Ref.modify((n) => tuple(n > 0, n - 1))
        )
      )
    )
  }

  return core.suspend(
    () =>
      pipe(
        makeBoundedQueue<A>(n),
        bracket.bracket(
          (q) =>
            pipe(
              Do.do,
              Do.bind("ref", () => Ref.makeRef(size)),
              tap.tap(() => core.fork(forEachUnit_(as, q.offer))),
              Do.bind("fibers", ({ ref }) =>
                collectAll(L.map_(L.range_(0, n), () => core.fork(worker(q, ref))))
              ),
              tap.tap(({ fibers }) => forEach_(fibers, (_) => _.await))
            ),
          (q) => q.shutdown
        )
      ),
    __trace
  )
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `forEachUnitPar_`, this method will use at most up to `n` fibers.
 *
 * @dataFirst forEachUnitParN_
 */
export function forEachUnitParN<R, E, A, X>(
  n: number,
  f: (a: A) => Effect<R, E, X>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachUnitParN_(as, n, f, __trace)
}

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `forEachPar`, this method will use at most up to `n` fibers.
 */
export function forEachParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  function worker(
    q: Q.Queue<readonly [promise.Promise<E, B>, A]>,
    pairs: Iterable<readonly [promise.Promise<E, B>, A]>,
    ref: Ref.Ref<number>
  ): Effect<R, never, void> {
    return pipe(
      q.take,
      core.chain(([p, a]) =>
        pipe(
          f(a),
          core.foldCauseM(
            (c) => forEach_(pairs, (_) => pipe(_[0], promise.halt(c))),
            (b) => pipe(p, promise.succeed(b))
          )
        )
      ),
      core.chain(() => worker(q, pairs, ref)),
      whenM.whenM(
        pipe(
          ref,
          Ref.modify((n) => tuple(n > 0, n - 1))
        )
      )
    )
  }

  return core.suspend(
    () =>
      pipe(
        makeBoundedQueue<readonly [promise.Promise<E, B>, A]>(n),
        bracket.bracket(
          (q) =>
            pipe(
              Do.do,
              Do.bind("pairs", () =>
                forEach_(as, (a) =>
                  pipe(
                    promise.make<E, B>(),
                    map.map((p) => tuple(p, a))
                  )
                )
              ),
              Do.bind("ref", ({ pairs }) => Ref.makeRef(pairs.length)),
              tap.tap(({ pairs }) =>
                core.fork(forEach_(pairs, (pair) => q.offer(pair)))
              ),
              tap.tap(({ pairs, ref }) =>
                collectAllUnit(
                  pipe(
                    L.range_(0, n),
                    L.map(() => core.fork(worker(q, pairs, ref)))
                  )
                )
              ),
              core.chain(({ pairs }) => forEach_(pairs, (_) => promise.await(_[0])))
            ),
          (q) => q.shutdown
        )
      ),
    __trace
  )
}

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `forEachPar`, this method will use at most up to `n` fibers.
 *
 * @dataFirst forEachParN_
 */
export function forEachParN<R, E, A, B>(
  n: number,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
) {
  return (as: Iterable<A>) => forEachParN_(as, n, f, __trace)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachExec_<R, E, A, B>(
  as: Iterable<A>,
  es: ExecutionStrategy,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  switch (es._tag) {
    case "Sequential": {
      return forEach_(as, f, __trace) as any
    }
    case "Parallel": {
      return forEachPar_(as, f, __trace) as any
    }
    case "ParallelN": {
      return forEachParN_(as, es.n, f, __trace) as any
    }
  }
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @dataFirst forEachExec_
 */
export function forEachExec<R, E, A, B>(
  es: ExecutionStrategy,
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): (as: Iterable<A>) => Effect<R, E, readonly B[]> {
  return (as) => forEachExec_(as, es, f, __trace)
}

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAll<R, E, A>(as: Iterable<Effect<R, E, A>>, __trace?: string) {
  return forEach_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 */
export function collectAllPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return forEachPar_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 *
 * @dataFirst collectAllParN_
 */
export function collectAllParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    forEachParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 */
export function collectAllParN_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __trace?: string
) {
  return forEachParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export function collectAllUnit<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return forEachUnit_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 */
export function collectAllUnitPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return forEachUnitPar_(as, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 *
 * @dataFirst collectAllUnitParN_
 */
export function collectAllUnitParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    forEachUnitParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export function collectAllUnitParN_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __trace?: string
) {
  return forEachUnitParN_(as, n, identity, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  return map.map_(collectAll(as, __trace), (x) => pipe(x, A.map(pf), A.compact))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @dataFirst collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>) => collectAllWith_(as, pf, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  return map.map_(collectAllPar(as, __trace), (x) => pipe(x, A.map(pf), A.compact))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @dataFirst collectAllWithPar_
 */
export function collectAllWithPar<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>) => collectAllWithPar_(as, pf, __trace)
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 */
export function collectAllWithParN_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  return map.map_(collectAllParN_(as, n, __trace), (x) => pipe(x, A.map(pf), A.compact))
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 *
 * @dataFirst collectAllWithParN_
 */
export function collectAllWithParN<A, B>(
  n: number,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): <R, E>(as: Iterable<Effect<R, E, A>>) => Effect<R, E, readonly B[]> {
  return (as) => collectAllWithParN_(as, n, pf, __trace)
}

/**
 * Evaluate and run each effect in the structure and collect discarding failed ones.
 */
export function collectAllSuccesses<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return collectAllWith_(
    I.map_(as, (x) => core.result(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 */
export function collectAllSuccessesPar<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  __trace?: string
) {
  return collectAllWithPar_(
    I.map_(as, (x) => core.result(x)),
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * Unlike `collectAllSuccessesPar`, this method will use at most up to `n` fibers.
 */
export function collectAllSuccessesParN_<R, E, A>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  __trace?: string
) {
  return collectAllWithParN_(
    I.map_(as, (x) => core.result(x)),
    n,
    (e) => (e._tag === "Success" ? O.some(e.value) : O.none),
    __trace
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * Unlike `collectAllSuccessesPar`, this method will use at most up to `n` fibers.
 *
 * @dataFirst collectAllSuccessesParN_
 */
export function collectAllSuccessesParN(n: number, __trace?: string) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    collectAllSuccessesParN_(as, n, __trace)
}

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export function fiberJoinAll<E, A>(as: Iterable<Fiber.Fiber<E, A>>, __trace?: string) {
  return tap.tap_(
    core.chain_(fiberWaitAll(as), done),
    () => forEach_(as, (f) => f.inheritRefs),
    __trace
  )
}

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export function fiberWaitAll<E, A>(as: Iterable<Fiber.Fiber<E, A>>, __trace?: string) {
  return core.result(
    forEachPar_(as, (f) => core.chain_(f.await, done)),
    __trace
  )
}

/**
 * Releases all the finalizers in the releaseMap according to the ExecutionStrategy
 */
export function releaseMapReleaseAll(
  exit: Exit<any, any>,
  execStrategy: ExecutionStrategy,
  __trace?: string
): (_: ReleaseMap) => UIO<any> {
  return (_: ReleaseMap) =>
    pipe(
      _.ref,
      Ref.modify((s): [UIO<any>, State] => {
        switch (s._tag) {
          case "Exited": {
            return [core.unit, s]
          }
          case "Running": {
            switch (execStrategy._tag) {
              case "Sequential": {
                return [
                  core.chain_(
                    forEach_(
                      Array.from(s.finalizers()).reverse(),
                      ([_, f]) => core.result(f(exit)),
                      __trace
                    ),
                    (e) => done(O.getOrElse_(Ex.collectAll(...e), () => Ex.succeed([])))
                  ),
                  new Exited(s.nextKey, exit)
                ]
              }
              case "Parallel": {
                return [
                  core.chain_(
                    forEachPar_(
                      Array.from(s.finalizers()).reverse(),
                      ([_, f]) => core.result(f(exit)),
                      __trace
                    ),
                    (e) =>
                      done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new Exited(s.nextKey, exit)
                ]
              }
              case "ParallelN": {
                return [
                  core.chain_(
                    forEachParN_(
                      Array.from(s.finalizers()).reverse(),
                      execStrategy.n,
                      ([_, f]) => core.result(f(exit)),
                      __trace
                    ),
                    (e) =>
                      done(O.getOrElse_(Ex.collectAllPar(...e), () => Ex.succeed([])))
                  ),
                  new Exited(s.nextKey, exit)
                ]
              }
            }
          }
        }
      }),
      flatten.flatten
    )
}

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export function managedFork<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, FiberContext<E, A>> {
  return new Managed(
    interruption.uninterruptibleMask(({ restore }) =>
      pipe(
        Do.do,
        Do.bind("tp", () => environment<readonly [R, ReleaseMap]>()),
        Do.let("r", ({ tp }) => tp[0]),
        Do.let("outerReleaseMap", ({ tp }) => tp[1]),
        Do.bind("innerReleaseMap", () => makeReleaseMap),
        Do.bind("fiber", ({ innerReleaseMap, r }) =>
          restore(
            pipe(
              self.effect,
              map.map(([_, a]) => a),
              coreScope.forkDaemon,
              core.provideAll([r, innerReleaseMap] as const, __trace)
            )
          )
        ),
        Do.bind("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          add((e) =>
            pipe(
              fiber,
              fiberInterrupt,
              core.chain(
                () => releaseMapReleaseAll(e, sequential)(innerReleaseMap),
                __trace
              )
            )
          )(outerReleaseMap)
        ),
        map.map(({ fiber, releaseMapEntry }) => [releaseMapEntry, fiber])
      )
    )
  )
}

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export function managedUse_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R2, E2, B>,
  __trace?: string
): Effect<R & R2, E | E2, B> {
  return bracketExit_(
    makeReleaseMap,
    (rm) =>
      core.chain_(
        provideSome_(self.effect, (r: R) => tuple(r, rm)),
        (a) => f(a[1]),
        __trace
      ),
    (rm, ex) => releaseMapReleaseAll(ex, sequential, __trace)(rm)
  )
}

export class BackPressureStrategy<A> implements Q.Strategy<A> {
  private putters = new Unbounded<[A, Promise<never, boolean>, boolean]>()

  handleSurplus(
    as: readonly A[],
    queue: MutableQueue<A>,
    takers: MutableQueue<Promise<never, A>>,
    isShutdown: AtomicBoolean
  ): UIO<boolean> {
    return core.descriptorWith((d) =>
      core.suspend(() => {
        const p = promise.unsafeMake<never, boolean>(d.id)

        return interruption.onInterrupt_(
          core.suspend(() => {
            this.unsafeOffer(as, p)
            this.unsafeOnQueueEmptySpace(queue)
            Q.unsafeCompleteTakers(this, queue, takers)
            if (isShutdown.get) {
              return interruption.interrupt
            } else {
              return promise.await(p)
            }
          }),
          () => core.effectTotal(() => this.unsafeRemove(p))
        )
      })
    )
  }

  unsafeRemove(p: Promise<never, boolean>) {
    Q.unsafeOfferAll(
      this.putters,
      Q.unsafePollAll(this.putters).filter(([_, __]) => __ !== p)
    )
  }

  unsafeOffer(as: readonly A[], p: Promise<never, boolean>) {
    const bs = Array.from(as)

    while (bs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const head = bs.shift()!

      if (bs.length === 0) {
        this.putters.offer([head, p, true])
      } else {
        this.putters.offer([head, p, false])
      }
    }
  }

  unsafeOnQueueEmptySpace(queue: MutableQueue<A>) {
    let keepPolling = true

    while (keepPolling && !queue.isFull) {
      const putter = this.putters.poll(undefined)

      if (putter != null) {
        const offered = queue.offer(putter[0])

        if (offered && putter[2]) {
          Q.unsafeCompletePromise(putter[1], true)
        } else if (!offered) {
          Q.unsafeOfferAll(this.putters, [putter, ...Q.unsafePollAll(this.putters)])
        }
      } else {
        keepPolling = false
      }
    }
  }

  get shutdown(): UIO<void> {
    return pipe(
      Do.do,
      Do.bind("fiberId", () => fiberId.fiberId),
      Do.bind("putters", () => core.effectTotal(() => Q.unsafePollAll(this.putters))),
      tap.tap((s) =>
        forEachPar_(s.putters, ([_, p, lastItem]) =>
          lastItem ? promise.interruptAs(s.fiberId)(p) : core.unit
        )
      ),
      asUnit.asUnit
    )
  }

  get surplusSize(): number {
    return this.putters.size
  }
}

/**
 * Creates a bounded queue
 */
export function makeBoundedQueue<A>(
  capacity: number,
  __trace?: string
): UIO<Q.Queue<A>> {
  return core.chain_(
    core.effectTotal(() => new Bounded<A>(capacity)),
    (x) => createQueue_(x, new BackPressureStrategy()),
    __trace
  )
}

/**
 * Unsafely creates a queue
 */
export function unsafeCreateQueue<A>(
  queue: MutableQueue<A>,
  takers: MutableQueue<Promise<never, A>>,
  shutdownHook: Promise<never, void>,
  shutdownFlag: AtomicBoolean,
  strategy: Q.Strategy<A>
): Q.Queue<A> {
  return new (class extends Q.XQueue<unknown, unknown, never, never, A, A> {
    awaitShutdown: UIO<void> = promise.await(shutdownHook)

    capacity: number = queue.capacity

    isShutdown: UIO<boolean> = core.effectTotal(() => shutdownFlag.get)

    offer: (a: A) => Effect<unknown, never, boolean> = (a) =>
      core.suspend(() => {
        if (shutdownFlag.get) {
          return interruption.interrupt
        } else {
          const taker = takers.poll(undefined)

          if (taker != null) {
            Q.unsafeCompletePromise(taker, a)
            return core.succeed(true)
          } else {
            const succeeded = queue.offer(a)

            if (succeeded) {
              return core.succeed(true)
            } else {
              return strategy.handleSurplus([a], queue, takers, shutdownFlag)
            }
          }
        }
      })

    offerAll: (as: Iterable<A>) => Effect<unknown, never, boolean> = (as) => {
      const arr = Array.from(as)
      return core.suspend(() => {
        if (shutdownFlag.get) {
          return interruption.interrupt
        } else {
          const pTakers = queue.isEmpty ? Q.unsafePollN(takers, arr.length) : []
          const [forTakers, remaining] = A.splitAt(pTakers.length)(arr)

          A.zip_(pTakers, forTakers).forEach(([taker, item]) => {
            Q.unsafeCompletePromise(taker, item)
          })

          if (remaining.length === 0) {
            return core.succeed(true)
          }

          const surplus = Q.unsafeOfferAll(queue, remaining)

          Q.unsafeCompleteTakers(strategy, queue, takers)

          if (surplus.length === 0) {
            return core.succeed(true)
          } else {
            return strategy.handleSurplus(surplus, queue, takers, shutdownFlag)
          }
        }
      })
    }

    shutdown: UIO<void> = descriptorWith((d) =>
      core.suspend(() => {
        shutdownFlag.set(true)

        return interruption.uninterruptible(
          whenM.whenM(promise.succeed<void>(undefined)(shutdownHook))(
            core.chain_(
              forEachPar_(Q.unsafePollAll(takers), promise.interruptAs(d.id)),
              () => strategy.shutdown
            )
          )
        )
      })
    )

    size: UIO<number> = core.suspend(() => {
      if (shutdownFlag.get) {
        return interruption.interrupt
      } else {
        return core.succeed(queue.size - takers.size + strategy.surplusSize)
      }
    })

    take: Effect<unknown, never, A> = descriptorWith((d) =>
      core.suspend(() => {
        if (shutdownFlag.get) {
          return interruption.interrupt
        }

        const item = queue.poll(undefined)

        if (item != null) {
          strategy.unsafeOnQueueEmptySpace(queue)
          return core.succeed(item)
        } else {
          const p = promise.unsafeMake<never, A>(d.id)

          return interruption.onInterrupt_(
            core.suspend(() => {
              takers.offer(p)
              Q.unsafeCompleteTakers(strategy, queue, takers)
              if (shutdownFlag.get) {
                return interruption.interrupt
              } else {
                return promise.await(p)
              }
            }),
            () => core.effectTotal(() => Q.unsafeRemove(takers, p))
          )
        }
      })
    )

    takeAll: Effect<unknown, never, readonly A[]> = core.suspend(() => {
      if (shutdownFlag.get) {
        return interruption.interrupt
      } else {
        return core.effectTotal(() => {
          const as = Q.unsafePollAll(queue)
          strategy.unsafeOnQueueEmptySpace(queue)
          return as
        })
      }
    })

    takeUpTo: (n: number) => Effect<unknown, never, readonly A[]> = (max) =>
      core.suspend(() => {
        if (shutdownFlag.get) {
          return interruption.interrupt
        } else {
          return core.effectTotal(() => {
            const as = Q.unsafePollN(queue, max)
            strategy.unsafeOnQueueEmptySpace(queue)
            return as
          })
        }
      })
  })()
}

/**
 * Creates a queue
 */
export function createQueue_<A>(
  queue: MutableQueue<A>,
  strategy: Q.Strategy<A>,
  __trace?: string
) {
  return map.map_(
    promise.make<never, void>(),
    (p) =>
      unsafeCreateQueue(queue, new Unbounded(), p, new AtomicBoolean(false), strategy),
    __trace
  )
}

/**
 * Creates a queue
 *
 * @dataFirst createQueue_
 */
export function createQueue<A>(strategy: Q.Strategy<A>, __trace?: string) {
  return (queue: MutableQueue<A>) => createQueue_(queue, strategy, __trace)
}
