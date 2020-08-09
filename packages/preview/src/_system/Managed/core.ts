import { Cause } from "../Cause/cause"
import { sequential } from "../Effect"
import { ExecutionStrategy, parallel, Sequential } from "../Effect/ExecutionStrategy"
import { FiberContext, interrupt } from "../Fiber"
import { pipe, tuple } from "../Function"
import { makeRef } from "../Ref"

import * as T from "./deps"
import { internalEffect, releaseAll } from "./internals"
import { Managed, noop } from "./managed"
import { Finalizer, makeReleaseMap, ReleaseMap } from "./releaseMap"

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain = <A, S2, R2, E2, A2>(f: (a: A) => Managed<S2, R2, E2, A2>) => <
  S,
  R,
  E
>(
  self: Managed<S, R, E, A>
) => chain_(self, f)

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain_ = <S, R, E, A, S2, R2, E2, A2>(
  self: Managed<S, R, E, A>,
  f: (a: A) => Managed<S2, R2, E2, A2>
) =>
  new Managed<S | S2, R & R2, E | E2, A2>(
    T.chain_(self.effect, ([releaseSelf, a]) =>
      T.map_(f(a).effect, ([releaseThat, b]) => [
        (e) =>
          T.chain_(T.result(releaseThat(e)), (e1) =>
            T.chain_(T.result(releaseSelf(e1)), (e2) => T.done(T.exitZipRight_(e1, e2)))
          ),
        b
      ])
    )
  )

/**
 * Imports a synchronous side-effect into a pure value
 */
export const effectTotal = <A>(effect: () => A) => fromEffect(T.effectTotal(effect))

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const ensuring_ = <S, R, E, A, S2, R2>(
  self: Managed<S, R, E, A>,
  f: T.Effect<S2, R2, never, any>
) => onExit_(self, () => f)

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const ensuring = <S2, R2>(f: T.Effect<S2, R2, never, any>) => <S, R, E, A>(
  self: Managed<S, R, E, A>
) => ensuring_(self, f)

/**
 * Returns an effect that models failure with the specified error. The moral equivalent of throw for pure code.
 */
export const fail = <E>(e: E) => fromEffect(T.fail(e))

/**
 * Creates an effect that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export const finalizerRef = (initial: Finalizer) =>
  makeExit_(makeRef(initial), (ref, exit) => T.chain_(ref.get, (f) => f(exit)))

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, S1, R1, E1, A1, S2, R2, E2, A2>(
  f: (cause: Cause<E>) => Managed<S1, R1, E1, A1>,
  g: (a: A) => Managed<S2, R2, E2, A2>
) => <S, R>(self: Managed<S, R, E, A>) => foldCauseM_(self, f, g)

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM_ = <S, R, E, A, S1, R1, E1, A1, S2, R2, E2, A2>(
  self: Managed<S, R, E, A>,
  f: (cause: Cause<E>) => Managed<S1, R1, E1, A1>,
  g: (a: A) => Managed<S2, R2, E2, A2>
) =>
  new Managed<S | S1 | S2, R & R1 & R2, E1 | E2, A1 | A2>(
    pipe(
      self.effect,
      T.foldCauseM(
        (c) => f(c).effect,
        ([_, a]) => g(a).effect
      )
    )
  )

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export const foreach = <S, R, E, A, B>(f: (a: A) => Managed<S, R, E, B>) => (
  as: Iterable<A>
) => foreach_(as, f)

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 */
export const foreach_ = <S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<S, R, E, B>
) =>
  new Managed<S, R, E, readonly B[]>(
    T.map_(
      T.foreach_(as, (a) => f(a).effect),
      (res) => {
        const fins = res.map((k) => k[0])
        const as = res.map((k) => k[1])

        return [(e) => T.foreach_(fins.reverse(), (fin) => fin(e)), as]
      }
    )
  )

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar = <S, R, E, A, B>(f: (a: A) => Managed<S, R, E, B>) => (
  as: Iterable<A>
): Managed<unknown, R, E, readonly B[]> => foreachPar_(as, f)

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export const foreachPar_ = <S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<S, R, E, B>
): Managed<unknown, R, E, readonly B[]> =>
  mapM_(makeManagedReleaseMap(T.parallel), (parallelReleaseMap) => {
    const makeInnerMap = T.provideSome_(
      T.map_(makeManagedReleaseMap(sequential).effect, ([_, x]) => x),
      (x: unknown) => tuple(x, parallelReleaseMap)
    )

    return T.foreachPar_(as, (a) =>
      T.map_(
        T.chain_(makeInnerMap, (innerMap) =>
          T.provideSome_(f(a).effect, (u: R) => tuple(u, innerMap))
        ),
        ([_, b]) => b
      )
    )
  })

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN = (n: number) => <S, R, E, A, B>(
  f: (a: A) => Managed<S, R, E, B>
) => (as: Iterable<A>): Managed<unknown, R, E, readonly B[]> => foreachParN_(n)(as, f)

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachParN_ = (n: number) => <S, R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Managed<S, R, E, B>
): Managed<unknown, R, E, readonly B[]> =>
  mapM_(makeManagedReleaseMap(T.parallelN(n)), (parallelReleaseMap) => {
    const makeInnerMap = T.provideSome_(
      T.map_(makeManagedReleaseMap(sequential).effect, ([_, x]) => x),
      (x: unknown) => tuple(x, parallelReleaseMap)
    )

    return T.foreachParN_(n)(as, (a) =>
      T.map_(
        T.chain_(makeInnerMap, (innerMap) =>
          T.provideSome_(f(a).effect, (u: R) => tuple(u, innerMap))
        ),
        ([_, b]) => b
      )
    )
  })

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export const fork = <S, R, E, A>(
  self: Managed<S, R, E, A>
): Managed<unknown, R, never, FiberContext<E, A>> =>
  new Managed(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.of,
        T.bind("tp", () => T.environment<readonly [R, ReleaseMap]>()),
        T.let("r", ({ tp }) => tp[0]),
        T.let("outerReleaseMap", ({ tp }) => tp[1]),
        T.bind("innerReleaseMap", () => makeReleaseMap),
        T.bind("fiber", ({ innerReleaseMap, r }) =>
          restore(
            pipe(
              self.effect,
              T.map(([_, a]) => a),
              T.forkDaemon,
              T.provideAll([r, innerReleaseMap] as const)
            )
          )
        ),
        T.bind("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
          outerReleaseMap.add((e) =>
            pipe(
              fiber,
              interrupt,
              T.chain(() => innerReleaseMap.releaseAll(e, sequential))
            )
          )
        ),
        T.map(({ fiber, releaseMapEntry }) => [releaseMapEntry, fiber])
      )
    )
  )

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export const fromEffect = <S, R, E, A>(effect: T.Effect<S, R, E, A>) =>
  new Managed<S, R, E, A>(
    T.map_(
      T.accessM((_: readonly [R, ReleaseMap]) => T.provideAll_(effect, _[0])),
      (a) => [noop, a]
    )
  )

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit = <S1, R1, A>(
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<S1, R1, never, unknown>
) => <S, R, E>(acquire: T.Effect<S, R, E, A>) => makeExit_(acquire, release)

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit_ = <S, R, E, A, S1, R1>(
  acquire: T.Effect<S, R, E, A>,
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<S1, R1, never, unknown>
) =>
  new Managed<S | S1, R & R1, E, A>(
    T.uninterruptible(
      pipe(
        T.of,
        T.bind("r", () => T.environment<readonly [R & R1, ReleaseMap]>()),
        T.bind("a", (s) => T.provideAll_(acquire, s.r[0])),
        T.bind("rm", (s) =>
          s.r[1].add((ex) => T.provideAll_(release(s.a, ex), s.r[0]))
        ),
        T.map((s) => [s.rm, s.a])
      )
    )
  )

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const makeInterruptible = <A, S1, R1>(
  release: (a: A) => T.Effect<S1, R1, never, unknown>
) => <S, R, E>(acquire: T.Effect<S, R, E, A>) =>
  onExitFirst_(fromEffect(acquire), T.exitForeach(release))

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const makeInterruptible_ = <S, R, E, A, S1, R1>(
  acquire: T.Effect<S, R, E, A>,
  release: (a: A) => T.Effect<S1, R1, never, unknown>
) =>
  onExitFirst_(fromEffect(acquire), (e) => {
    switch (e._tag) {
      case "Failure": {
        return T.unit
      }
      case "Success": {
        return release(e.value)
      }
    }
  })

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 */
export function makeManagedReleaseMap(
  es: Sequential
): Managed<never, unknown, never, ReleaseMap>
export function makeManagedReleaseMap(
  es: ExecutionStrategy
): Managed<unknown, unknown, never, ReleaseMap>
export function makeManagedReleaseMap(
  es: ExecutionStrategy
): Managed<unknown, unknown, any, ReleaseMap> {
  return makeExit_(makeReleaseMap, (rm, e) => rm.releaseAll(e, es))
}

/**
 * Creates a `Managed` from a `Reservation` produced by an effect. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 */
export const makeReserve = <S, R, E, S2, R2, E2, A>(
  reservation: T.Effect<S, R, E, Reservation<S2, R2, E2, A>>
) =>
  new Managed<S | S2, R & R2, E | E2, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.of,
        T.bind("tp", () => T.environment<readonly [R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("releaseMap", (s) => s.tp[1]),
        T.bind("reserved", (s) => T.provideAll_(reservation, s.r)),
        T.bind("releaseKey", (s) =>
          s.releaseMap.addIfOpen((x) => T.provideAll_(s.reserved.release(x), s.r))
        ),
        T.bind("finalizerAndA", (s) => {
          const k = s.releaseKey
          switch (k._tag) {
            case "None": {
              return T.interrupt
            }
            case "Some": {
              return T.map_(
                restore(
                  T.provideSome_(
                    s.reserved.acquire,
                    ([r]: readonly [R & R2, ReleaseMap]) => r
                  )
                ),
                (a): [Finalizer, A] => [(e) => s.releaseMap.release(k.value, e), a]
              )
            }
          }
        }),
        T.map((s) => s.finalizerAndA)
      )
    )
  )

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map = <A, B>(f: (a: A) => B) => <S, R, E>(self: Managed<S, R, E, A>) =>
  map_(self, f)

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map_ = <S, R, E, A, B>(self: Managed<S, R, E, A>, f: (a: A) => B) =>
  new Managed<S, R, E, B>(T.map_(self.effect, ([fin, a]) => [fin, f(a)]))

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapM_ = <S, R, E, A, S2, R2, E2, B>(
  self: Managed<S, R, E, A>,
  f: (a: A) => T.Effect<S2, R2, E2, B>
) =>
  new Managed<S | S2, R & R2, E | E2, B>(
    T.chain_(self.effect, ([fin, a]) =>
      T.provideSome_(
        T.map_(f(a), (b) => [fin, b]),
        ([r]: readonly [R & R2, ReleaseMap]) => r
      )
    )
  )

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapM = <A, S2, R2, E2, B>(f: (a: A) => T.Effect<S2, R2, E2, B>) => <
  S,
  R,
  E
>(
  self: Managed<S, R, E, A>
) =>
  new Managed<S | S2, R & R2, E | E2, B>(
    T.chain_(self.effect, ([fin, a]) =>
      T.provideSome_(
        T.map_(f(a), (b) => [fin, b]),
        ([r]: readonly [R & R2, ReleaseMap]) => r
      )
    )
  )

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, after
 * the existing finalizers.
 */
export const onExit_ = <S, R, E, A, S2, R2>(
  self: Managed<S, R, E, A>,
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, never, any>
) =>
  new Managed<S | S2, R & R2, E, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.of,
        T.bind("tp", () => T.environment<readonly [R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("outerReleaseMap", (s) => s.tp[1]),
        T.bind("innerReleaseMap", () => makeReleaseMap),
        T.bind("exitEA", (s) =>
          restore(
            T.provideAll_(T.result(T.map_(self.effect, ([_, a]) => a)), [
              s.r,
              s.innerReleaseMap
            ])
          )
        ),
        T.bind("releaseMapEntry", (s) =>
          s.outerReleaseMap.add((e) =>
            pipe(
              s.innerReleaseMap.releaseAll(e, sequential),
              T.result,
              T.zipWith(pipe(cleanup(s.exitEA), T.provideAll(s.r), T.result), (l, r) =>
                T.exitZipRight_(l, r)
              )
            )
          )
        ),
        T.bind("a", (s) => T.done(s.exitEA)),
        T.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  )

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, after
 * the existing finalizers.
 */
export const onExit = <E, A, S2, R2>(
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, never, any>
) => <S, R>(self: Managed<S, R, E, A>) => onExit_(self, cleanup)

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const onExitFirst = <E, A, S2, R2>(
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, never, any>
) => <S, R>(self: Managed<S, R, E, A>) => onExitFirst_(self, cleanup)

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const onExitFirst_ = <S, R, E, A, S2, R2>(
  self: Managed<S, R, E, A>,
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, never, any>
) =>
  new Managed<S | S2, R & R2, E, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.of,
        T.bind("tp", () => T.environment<readonly [R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("outerReleaseMap", (s) => s.tp[1]),
        T.bind("innerReleaseMap", () => makeReleaseMap),
        T.bind("exitEA", (s) =>
          restore(
            T.provideAll_(T.result(T.map_(self.effect, ([_, a]) => a)), [
              s.r,
              s.innerReleaseMap
            ])
          )
        ),
        T.bind("releaseMapEntry", (s) =>
          s.outerReleaseMap.add((e) =>
            T.flatten(
              T.zipWith_(
                T.result(T.provideAll_(cleanup(s.exitEA), s.r)),
                T.result(s.innerReleaseMap.releaseAll(e, sequential)),
                (l, r) => T.done(T.exitZipRight_(l, r))
              )
            )
          )
        ),
        T.bind("a", (s) => T.done(s.exitEA)),
        T.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  )

/**
 * Like provideSome_ for effect but for Managed
 */
export const provideSome_ = <S, R, E, A, R0>(
  self: Managed<S, R, E, A>,
  f: (r0: R0) => R
): Managed<S, R0, E, A> =>
  new Managed(
    T.accessM(([r0, rm]: readonly [R0, ReleaseMap]) =>
      T.provideAll_(self.effect, [f(r0), rm])
    )
  )

/**
 * A `Reservation<S, R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 *
 * See `Managed#reserve` and `ZIO#reserve` for details of usage.
 */
export class Reservation<S, R, E, A> {
  static of = <S, R, E, A, S2, R2>(
    acquire: T.Effect<S, R, E, A>,
    release: (exit: T.Exit<any, any>) => T.Effect<S2, R2, never, any>
  ) => new Reservation<S | S2, R & R2, E, A>(acquire, release)

  private constructor(
    readonly acquire: T.Effect<S, R, E, A>,
    readonly release: (exit: T.Exit<any, any>) => T.Effect<S, R, never, any>
  ) {}
}

/**
 * Make a new reservation
 */
export const makeReservation_ = <S, R, E, A, S2, R2>(
  acquire: T.Effect<S, R, E, A>,
  release: (exit: T.Exit<any, any>) => T.Effect<S2, R2, never, any>
) => Reservation.of(acquire, release)

/**
 * Make a new reservation
 */
export const makeReservation = <S2, R2>(
  release: (exit: T.Exit<any, any>) => T.Effect<S2, R2, never, any>
) => <S, R, E, A>(acquire: T.Effect<S, R, E, A>) => Reservation.of(acquire, release)

/**
 * Lifts a pure `Reservation<S, R, E, A>` into `Managed<S, R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export const reserve = <S, R, E, A>(reservation: Reservation<S, R, E, A>) =>
  makeReserve(T.succeedNow(reservation))

/**
 * Lift a pure value into an effect
 */
export const succeedNow = <A>(a: A) => fromEffect(T.succeedNow(a))

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const tap = <A, S2, R2, E2>(f: (a: A) => Managed<S2, R2, E2, any>) => <S, R, E>(
  self: Managed<S, R, E, A>
) => chain_(self, (a) => map_(f(a), () => a))

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use = <A, S2, R2, E2, B>(f: (a: A) => T.Effect<S2, R2, E2, B>) => <
  S,
  R,
  E
>(
  self: Managed<S, R, E, A>
): T.Effect<S | S2, R & R2, E | E2, B> => use_(self, f)

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use_ = <S, R, E, A, S2, R2, E2, B>(
  self: Managed<S, R, E, A>,
  f: (a: A) => T.Effect<S2, R2, E2, B>
): T.Effect<S | S2, R & R2, E | E2, B> => {
  return T.bracketExit_(
    makeReleaseMap,
    (rm) =>
      T.chain_(
        T.provideSome_(internalEffect(self), (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      ),
    (rm, ex) => releaseAll<S, E>(rm, ex)
  )
}

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow = <S, R, E, A>(self: Managed<S, R, E, A>) =>
  use_(self, T.succeedNow)

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zip_ = <S, R, E, A, S2, R2, E2, A2, B>(
  self: Managed<S, R, E, A>,
  that: Managed<S2, R2, E2, A2>
) => zipWith_(self, that, (a, a2) => [a, a2] as [A, A2])

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zip = <S2, R2, E2, A2, B>(that: Managed<S2, R2, E2, A2>) => <S, R, E, A>(
  self: Managed<S, R, E, A>
) => zipWith_(self, that, (a, a2) => [a, a2] as [A, A2])

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zipWith = <A, S2, R2, E2, A2, B>(
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
) => <S, R, E>(self: Managed<S, R, E, A>) => zipWith_(self, that, f)

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const zipWith_ = <S, R, E, A, S2, R2, E2, A2, B>(
  self: Managed<S, R, E, A>,
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
) => chain_(self, (a) => map_(that, (a2) => f(a, a2)))

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const zipWithPar = <A, S2, R2, E2, A2, B>(
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
) => <S, R, E>(self: Managed<S, R, E, A>): Managed<unknown, R & R2, E | E2, B> =>
  zipWithPar_(self, that, f)

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const zipWithPar_ = <S, R, E, A, S2, R2, E2, A2, B>(
  self: Managed<S, R, E, A>,
  that: Managed<S2, R2, E2, A2>,
  f: (a: A, a2: A2) => B
): Managed<unknown, R & R2, E | E2, B> =>
  mapM_(makeManagedReleaseMap(parallel), (parallelReleaseMap) => {
    const innerMap = T.provideSome_(
      makeManagedReleaseMap(sequential).effect,
      (r: R & R2) => tuple(r, parallelReleaseMap)
    )

    return T.chain_(T.zip_(innerMap, innerMap), ([[_, l], [__, r]]) =>
      T.zipWithPar_(
        T.provideSome_(self.effect, (_: R & R2) => tuple(_, l)),
        T.provideSome_(that.effect, (_: R & R2) => tuple(_, r)),
        ([_, a], [__, a2]) => f(a, a2)
      )
    )
  })
