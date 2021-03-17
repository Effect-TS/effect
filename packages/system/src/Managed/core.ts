// tracing: off

import type { Cause } from "../Cause/cause"
import type { ExecutionStrategy } from "../Effect/ExecutionStrategy"
import { parallel, sequential } from "../Effect/ExecutionStrategy"
import { pipe, tuple } from "../Function"
import { makeRef } from "../Ref"
import * as T from "./deps-core"
import { fromEffect } from "./fromEffect"
import { makeExit, makeExit_ } from "./makeExit"
import { Managed } from "./managed"
import type { ReleaseMap } from "./ReleaseMap"
import * as add from "./ReleaseMap/add"
import * as addIfOpen from "./ReleaseMap/addIfOpen"
import type { Finalizer } from "./ReleaseMap/finalizer"
import * as makeReleaseMap from "./ReleaseMap/makeReleaseMap"
import * as release from "./ReleaseMap/release"
import * as releaseAll from "./ReleaseMap/releaseAll"
import { use_ } from "./use"

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 *
 * @dataFirst chain_
 */
export function chain<A, R2, E2, A2>(f: (a: A) => Managed<R2, E2, A2>) {
  return <R, E>(self: Managed<R, E, A>) => chain_(self, f)
}

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export function chain_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R2, E2, A2>
) {
  return new Managed<R & R2, E | E2, A2>(
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
}

/**
 * Imports a synchronous side-effect into a pure value
 */
export function effectTotal<A>(effect: () => A, __trace?: string) {
  return fromEffect(T.effectTotal(effect, __trace))
}

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see `onExit`.
 */
export function ensuring_<R, E, A, R2, X>(
  self: Managed<R, E, A>,
  f: T.Effect<R2, never, X>
) {
  return onExit_(self, () => f)
}

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see `onExit`.
 */
export function ensuring<R2, X>(f: T.Effect<R2, never, X>) {
  return <R, E, A>(self: Managed<R, E, A>) => ensuring_(self, f)
}

/**
 * Returns an effect that models failure with the specified error. The moral equivalent of throw for pure code.
 */
export function fail<E>(e: E, __trace?: string) {
  return fromEffect(T.fail(e, __trace))
}

/**
 * Creates an effect that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export function finalizerRef(initial: Finalizer) {
  return makeExit_(makeRef(initial), (ref, exit) => T.chain_(ref.get, (f) => f(exit)))
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  f: (cause: Cause<E>) => Managed<R1, E1, A1>,
  g: (a: A) => Managed<R2, E2, A2>
) {
  return <R>(self: Managed<R, E, A>) => foldCauseM_(self, f, g)
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (cause: Cause<E>) => Managed<R1, E1, A1>,
  g: (a: A) => Managed<R2, E2, A2>
) {
  return new Managed<R & R1 & R2, E1 | E2, A1 | A2>(
    pipe(
      self.effect,
      T.foldCauseM(
        (c) => f(c).effect,
        ([_, a]) => g(a).effect
      )
    )
  )
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make<R1, A>(
  release: (a: A) => T.Effect<R1, never, unknown>
): <R, E>(acquire: T.Effect<R, E, A>) => Managed<R & R1, E, A> {
  return makeExit(release)
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export function make_<R, E, A, R1>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.Effect<R1, never, unknown>
): Managed<R & R1, E, A> {
  return makeExit_(acquire, release)
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export function makeInterruptible<A, R1>(
  release: (a: A) => T.Effect<R1, never, unknown>
) {
  return <R, E>(acquire: T.Effect<R, E, A>) =>
    onExitFirst_(fromEffect(acquire), T.exitForeach(release))
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export function makeInterruptible_<R, E, A, R1>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.Effect<R1, never, unknown>
) {
  return onExitFirst_(fromEffect(acquire), (e) => {
    switch (e._tag) {
      case "Failure": {
        return T.unit
      }
      case "Success": {
        return release(e.value)
      }
    }
  })
}

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 */
export function makeManagedReleaseMap(
  es: ExecutionStrategy
): Managed<unknown, never, ReleaseMap> {
  return makeExit_(makeReleaseMap.makeReleaseMap, (rm, e) =>
    releaseAll.releaseAll(e, es)(rm)
  )
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
export function makeReserve<R, E, R2, E2, A>(
  reservation: T.Effect<R, E, Reservation<R2, E2, A>>
) {
  return new Managed<R & R2, E | E2, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.do,
        T.bind("tp", () => T.environment<readonly [R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("releaseMap", (s) => s.tp[1]),
        T.bind("reserved", (s) => T.provideAll_(reservation, s.r)),
        T.bind("releaseKey", (s) =>
          addIfOpen.addIfOpen((x) => T.provideAll_(s.reserved.release(x), s.r))(
            s.releaseMap
          )
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
                (a): [Finalizer, A] => [
                  (e) => release.release(k.value, e)(s.releaseMap),
                  a
                ]
              )
            }
          }
        }),
        T.map((s) => s.finalizerAndA)
      )
    )
  )
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 *
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>) => map_(self, f, __trace)
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function map_<R, E, A, B>(
  self: Managed<R, E, A>,
  f: (a: A) => B,
  __trace?: string
) {
  return new Managed<R, E, B>(T.map_(self.effect, ([fin, a]) => [fin, f(a)], __trace))
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => T.Effect<R2, E2, B>,
  __trace?: string
) {
  return new Managed<R & R2, E | E2, B>(
    T.chain_(self.effect, ([fin, a]) =>
      T.provideSome_(
        T.map_(f(a), (b) => [fin, b], __trace),
        ([r]: readonly [R & R2, ReleaseMap]) => r
      )
    )
  )
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM<A, R2, E2, B>(f: (a: A) => T.Effect<R2, E2, B>, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>) => mapM_(self, f, __trace)
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit_<R, E, A, R2, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: T.Exit<E, A>) => T.Effect<R2, never, X>
) {
  return new Managed<R & R2, E, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.do,
        T.bind("tp", () => T.environment<readonly [R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("outerReleaseMap", (s) => s.tp[1]),
        T.bind("innerReleaseMap", () => makeReleaseMap.makeReleaseMap),
        T.bind("exitEA", (s) =>
          restore(
            T.provideAll_(T.result(T.map_(self.effect, ([_, a]) => a)), [
              s.r,
              s.innerReleaseMap
            ])
          )
        ),
        T.bind("releaseMapEntry", (s) =>
          add.add((e) =>
            pipe(
              releaseAll.releaseAll(e, sequential)(s.innerReleaseMap),
              T.result,
              T.zipWith(pipe(cleanup(s.exitEA), T.provideAll(s.r), T.result), (l, r) =>
                T.exitZipRight_(l, r)
              )
            )
          )(s.outerReleaseMap)
        ),
        T.bind("a", (s) => T.done(s.exitEA)),
        T.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  )
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit<E, A, R2, X>(
  cleanup: (exit: T.Exit<E, A>) => T.Effect<R2, never, X>
) {
  return <R>(self: Managed<R, E, A>) => onExit_(self, cleanup)
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, before
 * the existing finalizers.
 */
export function onExitFirst<E, A, R2, X>(
  cleanup: (exit: T.Exit<E, A>) => T.Effect<R2, never, X>
) {
  return <R>(self: Managed<R, E, A>) => onExitFirst_(self, cleanup)
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, before
 * the existing finalizers.
 */
export function onExitFirst_<R, E, A, R2, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: T.Exit<E, A>) => T.Effect<R2, never, X>
) {
  return new Managed<R & R2, E, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.do,
        T.bind("tp", () => T.environment<readonly [R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("outerReleaseMap", (s) => s.tp[1]),
        T.bind("innerReleaseMap", () => makeReleaseMap.makeReleaseMap),
        T.bind("exitEA", (s) =>
          restore(
            T.provideAll_(T.result(T.map_(self.effect, ([_, a]) => a)), [
              s.r,
              s.innerReleaseMap
            ])
          )
        ),
        T.bind("releaseMapEntry", (s) =>
          add.add((e) =>
            T.flatten(
              T.zipWith_(
                T.result(T.provideAll_(cleanup(s.exitEA), s.r)),
                T.result(releaseAll.releaseAll(e, sequential)(s.innerReleaseMap)),
                (l, r) => T.done(T.exitZipRight_(l, r))
              )
            )
          )(s.outerReleaseMap)
        ),
        T.bind("a", (s) => T.done(s.exitEA)),
        T.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  )
}

/**
 * Like provideSome_ for effect but for Managed
 */
export function provideSome_<R, E, A, R0>(
  self: Managed<R, E, A>,
  f: (r0: R0) => R
): Managed<R0, E, A> {
  return new Managed(
    T.accessM(([r0, rm]: readonly [R0, ReleaseMap]) =>
      T.provideAll_(self.effect, [f(r0), rm])
    )
  )
}

/**
 * Like provideSome for effect but for Managed
 */
export function provideSome<R, R0>(f: (r0: R0) => R) {
  return <E, A>(self: Managed<R, E, A>) => provideSome_(self, f)
}

/**
 * A `Reservation< R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 *
 * See `Managed#reserve` and `Effect#reserve` for details of usage.
 */
export class Reservation<R, E, A> {
  static of = <R, E, A, R2>(
    acquire: T.Effect<R, E, A>,
    release: (exit: T.Exit<any, any>) => T.Effect<R2, never, unknown>
  ) => new Reservation<R & R2, E, A>(acquire, release)

  private constructor(
    readonly acquire: T.Effect<R, E, A>,
    readonly release: (exit: T.Exit<any, any>) => T.Effect<R, never, unknown>
  ) {}
}

/**
 * Make a new reservation
 */
export function makeReservation_<R, E, A, R2>(
  acquire: T.Effect<R, E, A>,
  release: (exit: T.Exit<any, any>) => T.Effect<R2, never, unknown>
) {
  return Reservation.of(acquire, release)
}

/**
 * Make a new reservation
 */
export function makeReservation<R2>(
  release: (exit: T.Exit<any, any>) => T.Effect<R2, never, unknown>
) {
  return <R, E, A>(acquire: T.Effect<R, E, A>) => Reservation.of(acquire, release)
}

/**
 * Lifts a pure `Reservation< R, E, A>` into `Managed< R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export function reserve<R, E, A>(reservation: Reservation<R, E, A>) {
  return makeReserve(T.succeed(reservation))
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap_<A, R, R2, E, E2, X>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R2, E2, X>
) {
  return chain_(self, (a) => map_(f(a), () => a))
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 *
 * @dataFirst tap_
 */
export function tap<A, R2, E2, X>(f: (a: A) => Managed<R2, E2, X>) {
  return <R, E>(self: Managed<R, E, A>) => tap_(self, f)
}

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export function useNow<R, E, A>(self: Managed<R, E, A>) {
  return use_(self, T.succeed)
}

/**
 * Use the resource until interruption. Useful for resources that you want
 * to acquire and use as long as the application is running, like a
 * HTTP server.
 */
export function useForever<R, E, A>(self: Managed<R, E, A>) {
  return use_(self, () => T.never)
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function zip_<R, E, A, R2, E2, A2, B>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>
) {
  return zipWith_(self, that, (a, a2) => [a, a2] as [A, A2])
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function zip<R2, E2, A2, B>(that: Managed<R2, E2, A2>) {
  return <R, E, A>(self: Managed<R, E, A>) =>
    zipWith_(self, that, (a, a2) => [a, a2] as [A, A2])
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function zipWith<A, R2, E2, A2, B>(
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B
) {
  return <R, E>(self: Managed<R, E, A>) => zipWith_(self, that, f)
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function zipWith_<R, E, A, R2, E2, A2, B>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B
) {
  return chain_(self, (a) => map_(that, (a2) => f(a, a2)))
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function zipWithPar<A, R2, E2, A2, B>(
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R2, E | E2, B> =>
    zipWithPar_(self, that, f)
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function zipWithPar_<R, E, A, R2, E2, A2, B>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B
): Managed<R & R2, E | E2, B> {
  return mapM_(makeManagedReleaseMap(parallel), (parallelReleaseMap) => {
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
}
