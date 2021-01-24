import * as cause from "../Cause"
import * as Ex from "../Exit"
import * as Fiber from "../Fiber"
import * as FA from "../FreeAssociative"
import { pipe, tuple } from "../Function"
import * as IT from "../Iterable"
import * as M from "../Managed"
import * as L from "../Persistent/List"
import * as promise from "../Promise"
import * as Q from "../Queue"
import * as Ref from "../Ref"
import * as andThen from "./andThen"
import * as asUnit from "./asUnit"
import * as bracket from "./bracket"
import * as catchAll from "./catchAll"
import * as collectAll from "./collectAll"
import * as core from "./core"
import * as coreScope from "./core-scope"
import * as Do from "./do"
import type { Effect } from "./effect"
import * as ensuring from "./ensuring"
import type { ExecutionStrategy } from "./ExecutionStrategy"
import * as fiberId from "./fiberId"
import * as forkManaged from "./forkManaged"
import * as interruptible from "./interruptible"
import * as map from "./map"
import * as refailWithTrace from "./refailWithTrace"
import * as tap from "./tap"
import * as tapCause from "./tapCause"
import * as uninterruptible from "./uninterruptible"
import * as whenM from "./whenM"
import * as zipWith from "./zipWith"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 */
export function forEach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>) {
  return map.map_(
    IT.reduce_(
      as,
      core.succeed(FA.init<B>()) as Effect<R, E, FA.FreeAssociative<B>>,
      (b, a) =>
        zipWith.zipWith_(
          b,
          core.suspend(() => f(a)),
          (acc, r) => FA.append(r)(acc)
        )
    ),
    FA.toArray
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
export function forEach<A, R, E, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>) => forEach_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 */
export function forEachUnit_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, any>
): Effect<R, E, void> {
  return pipe(
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
export function forEachUnit<R, E, A>(
  f: (a: A) => Effect<R, E, any>
): (as: Iterable<A>) => Effect<R, E, void> {
  return (as) => forEachUnit_(as, f)
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
export function forEachUnitPar_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, any>
): Effect<R, E, void> {
  const collection = L.from(as)
  const size = L.length(collection)
  if (L.isEmpty(collection)) {
    return core.unit
  }
  return pipe(
    Do.do,
    Do.bind("parentId", () => fiberId.fiberId()),
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
    Do.let("task", ({ causes, result, startFailure, startTask, status }) => (a: A) =>
      pipe(
        core.suspend(() => f(a)),
        interruptible.interruptible,
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
        ),
        whenM.whenM(startTask),
        uninterruptible.uninterruptible
      )
    ),
    Do.bind("fibers", ({ task }) =>
      coreScope.transplant((graft) => forEach_(as, (a) => core.fork(graft(task(a)))))
    ),
    Do.let("interrupter", ({ fibers, parentId, result }) =>
      pipe(
        result,
        promise.await,
        catchAll.catchAll(() =>
          pipe(
            forEach_(fibers, (_) => core.fork(_.interruptAs(parentId))),
            core.chain(Fiber.joinAll)
          )
        ),
        forkManaged.forkManaged
      )
    ),
    tap.tap(({ causes, fibers, interrupter, result }) =>
      M.use_(interrupter, () => {
        return pipe(
          result,
          promise.fail<void>(undefined),
          andThen.andThen(pipe(causes.get, core.chain(core.halt))),
          whenM.whenM(
            pipe(
              forEach_(fibers, (_) => _.await),
              map.map((_) => _.findIndex((ex) => !Ex.succeeded(ex)) !== -1)
            )
          ),
          refailWithTrace.refailWithTrace
        )
      })
    ),
    asUnit.asUnit
  )
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
export function forEachUnitPar<R, E, A>(f: (a: A) => Effect<R, E, any>) {
  return (as: Iterable<A>) => forEachUnitPar_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, readonly B[]> {
  const arr = Array.from(as)

  return core.chain_(
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
export function forEachPar<R, E, A, B>(f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>): Effect<R, E, readonly B[]> => forEachPar_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable[A]` and runs
 * produced effects in parallel, discarding the results.
 *
 * Unlike `forEachUnitPar_`, this method will use at most up to `n` fibers.
 */
export function forEachUnitParN_<R, E, A>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, E, any>
): Effect<R, E, void> {
  const as_ = L.from(as)
  const size = L.length(as_)

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

  return pipe(
    Q.makeBounded<A>(n),
    bracket.bracket(
      (q) =>
        pipe(
          Do.do,
          Do.bind("ref", () => Ref.makeRef(size)),
          tap.tap(() => core.fork(forEachUnit_(as, q.offer))),
          Do.bind("fibers", ({ ref }) =>
            collectAll.collectAll(
              L.map_(L.range_(0, n), () => core.fork(worker(q, ref)))
            )
          ),
          tap.tap(({ fibers }) => forEach_(fibers, (_) => _.await))
        ),
      (q) => q.shutdown
    ),
    refailWithTrace.refailWithTrace
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
export function forEachUnitParN<R, E, A>(n: number, f: (a: A) => Effect<R, E, any>) {
  return (as: Iterable<A>) => forEachUnitParN_(as, n, f)
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
  f: (a: A) => Effect<R, E, B>
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

  return pipe(
    Q.makeBounded<readonly [promise.Promise<E, B>, A]>(n),
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
          tap.tap(({ pairs }) => core.fork(forEach_(pairs, (pair) => q.offer(pair)))),
          tap.tap(({ pairs, ref }) =>
            collectAll.collectAllUnit(
              pipe(
                L.range_(0, n),
                L.map(() => core.fork(worker(q, pairs, ref)))
              )
            )
          ),
          core.chain(({ pairs }) => forEach_(pairs, (_) => promise.await(_[0])))
        ),
      (q) => q.shutdown
    ),
    refailWithTrace.refailWithTrace
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
export function forEachParN<R, E, A, B>(n: number, f: (a: A) => Effect<R, E, B>) {
  return (as: Iterable<A>) => forEachParN_(as, n, f)
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
  f: (a: A) => Effect<R, E, B>
): Effect<R, E, readonly B[]> {
  switch (es._tag) {
    case "Sequential": {
      return forEach_(as, f) as any
    }
    case "Parallel": {
      return forEachPar_(as, f) as any
    }
    case "ParallelN": {
      return forEachParN_(as, es.n, f) as any
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
  f: (a: A) => Effect<R, E, B>
): (as: Iterable<A>) => Effect<R, E, readonly B[]> {
  return (as) => forEachExec_(as, es, f)
}
