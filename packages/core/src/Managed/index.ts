/* adapted from https://github.com/rzeigler/waveguide */

import * as AP from "../Apply"
import * as A from "../Array"
import {
  CApplicative4MA,
  CMonad4MA,
  Monad4E,
  CApplicative4MAP,
  Monad4EP
} from "../Base"
import { ATypeOf, ETypeOf, RTypeOf, STypeOf } from "../Base/Apply"
import { makeDeferred } from "../Deferred"
import * as D from "../Do"
import * as T from "../Effect"
import * as E from "../Either"
import type { Either } from "../Either"
import { done, Exit, raise, combinedCause } from "../Exit"
import {
  constant,
  FunctionN,
  Predicate,
  Refinement,
  unsafeCoerce,
  tuple
} from "../Function"
import { pipe } from "../Function"
import type { Monoid } from "../Monoid"
import * as O from "../Option"
import type { Option } from "../Option"
import * as RE from "../Record"
import type { Semigroup } from "../Semigroup"
import { ManagedURI as URI, AsyncFn } from "../Support/Common"
import * as TR from "../Tree"

/**
 * A Managed<E, A> is a type that encapsulates the safe acquisition and release of a resource.
 *
 * This is a friendly monadic wrapper around bracketExit.
 */
export type ManagedT<S, R, E, A> =
  | Pure<A>
  | Encase<S, R, E, A>
  | Bracket<S, S, R, R, E, A>
  | Suspended<S, R, E, A>
  | Chain<S, S, R, R, E, any, A> // eslint-disable-line @typescript-eslint/no-explicit-any
  | BracketExit<S, S, R, R, E, E, A>
  | UseProvider

export interface Managed<S, R, E, A> {
  _TAG: () => "Managed"
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export type Async<A> = Managed<unknown, unknown, never, A>
export type AsyncE<E, A> = Managed<unknown, unknown, E, A>
export type AsyncR<R, A> = Managed<unknown, R, never, A>
export type AsyncRE<R, E, A> = Managed<unknown, R, E, A>

export type Sync<A> = Managed<never, unknown, never, A>
export type SyncE<E, A> = Managed<never, unknown, E, A>
export type SyncR<R, A> = Managed<never, R, never, A>
export type SyncRE<R, E, A> = Managed<never, R, E, A>

const toM = <S, R, E, A>(_: ManagedT<S, R, E, A>): Managed<S, R, E, A> => _ as any
const fromM = <S, R, E, A>(_: Managed<S, R, E, A>): ManagedT<S, R, E, A> => _ as any

export interface UseProvider {
  readonly _tag: "UseProvider"
  readonly provider: T.Provider<any, any, any, any>
  readonly managed: Managed<any, any, any, any>
}

export interface Pure<A> {
  readonly _tag: "Pure"
  readonly value: A
}

/**
 * Lift a pure value into a resource
 * @param value
 */
export function pure<A>(value: A): Sync<A> {
  return toM({
    _tag: "Pure",
    value
  })
}

export interface Encase<S, R, E, A> {
  readonly _tag: "Encase"
  readonly acquire: T.Effect<S, R, E, A>
}

export function useProvider_<S, R, E, A, S2, R2, E2, A2>(
  ma: Managed<S, R & A2, E, A>,
  provider: T.Provider<R2, A2, E2, S2>
): Managed<S | S2, R2 & R, E | E2, A> {
  return toM({
    _tag: "UseProvider",
    managed: ma,
    provider
  })
}

export function accessM<S, R, E, A, R2>(
  f: (_: R2) => Managed<S, R, E, A>
): Managed<S, R2 & R, E, A> {
  return chain_(encaseEffect(T.accessEnvironment<R2>()), f)
}

export function access<R2, A>(f: (_: R2) => A): SyncR<R2, A> {
  return map_(encaseEffect(T.accessEnvironment<R2>()), f)
}

export function sync<A>(f: () => A): Sync<A> {
  return encaseEffect(T.sync(f))
}

export function async<E, A>(f: AsyncFn<E, A>): AsyncE<E, A> {
  return encaseEffect(T.async(f))
}

export function useProvider<S2, R2, E2, A2>(
  provider: T.Provider<R2, A2, E2, S2>
): <S, R, E, A>(ma: Managed<S, R & A2, E, A>) => Managed<S | S2, R2 & R, E | E2, A> {
  return (ma) =>
    toM({
      _tag: "UseProvider",
      managed: ma,
      provider
    })
}

/**
 * Create a Resource by wrapping an IO producing a value that does not need to be disposed
 *
 * @param res
 * @param f
 */
export function encaseEffect<S, R, E, A>(
  rio: T.Effect<S, R, E, A>
): Managed<S, R, E, A> {
  return toM({
    _tag: "Encase",
    acquire: rio
  })
}

export function raiseError<E>(_: E): SyncE<E, never> {
  return encaseEffect(T.raiseError(_))
}

export interface Bracket<S, S2, R1, R2, E, A> {
  readonly _tag: "Bracket"
  readonly acquire: T.Effect<S, R1, E, A>
  readonly release: FunctionN<[A], T.Effect<S2, R2, E, unknown>>
}

/**
 * Create a resource from an acquisition and release function
 * @param acquire
 * @param release
 */
export function bracket<S, R, E, A, S2, R2, E2>(
  acquire: T.Effect<S, R, E, A>,
  release: FunctionN<[A], T.Effect<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM({
    _tag: "Bracket",
    acquire: acquire as T.Effect<S | S2, R & R2, E | E2, A>,
    release
  })
}

export interface BracketExit<S, S2, R1, R2, E, E2, A> {
  readonly _tag: "BracketExit"

  readonly acquire: T.Effect<S, R1, E, A>
  readonly release: FunctionN<[A, Exit<E, unknown>], T.Effect<S2, R2, E2, unknown>>
}

export function bracketExit<S, R, E, A, S2, R2, E2>(
  acquire: T.Effect<S, R, E, A>,
  release: FunctionN<[A, Exit<E, unknown>], T.Effect<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM<S | S2, R & R2, E | E2, A>({
    _tag: "BracketExit",
    acquire: acquire as T.Effect<S | S2, R & R2, E, A>,
    release: release as FunctionN<
      [A, Exit<E | E2, unknown>],
      T.Effect<S | S2, R & R2, E2, unknown>
    >
  })
}

export interface Suspended<S, R, E, A> {
  readonly _tag: "Suspended"

  readonly suspended: T.Effect<S, R, E, Managed<S, R, E, A>>
}

/**
 * Lift an IO of a Resource into a resource
 * @param suspended
 */
export function suspend<S, R, E, S2, R2, E2, A>(
  suspended: T.Effect<S, R, E, Managed<S2, R2, E2, A>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM({
    _tag: "Suspended",
    suspended: suspended as T.Effect<
      S | S2,
      R & R2,
      E | E2,
      Managed<S | S2, R & R2, E | E2, A>
    >
  })
}

export interface Chain<S, S2, R, R2, E, L, A> {
  readonly _tag: "Chain"
  readonly left: Managed<S, R, E, L>
  readonly bind: FunctionN<[L], Managed<S2, R2, E, A>>
}

/**
 * Compose dependent resourcess.
 *
 * The scope of left will enclose the scope of the resource produced by bind
 * @param left
 * @param bind
 */
export function chain_<S, R, E, L, S2, R2, E2, A>(
  left: Managed<S, R, E, L>,
  bind: FunctionN<[L], Managed<S2, R2, E2, A>>
): Managed<S | S2, R & R2, E | E2, A> {
  return toM({
    _tag: "Chain",
    left: left as Managed<S | S2, R, E | E2, L>,
    bind: bind as FunctionN<[L], Managed<S | S2, R & R2, E | E2, A>>
  })
}

/**
 * Map a resource
 * @param res
 * @param f
 */
export function map_<S, R, E, L, A>(
  res: Managed<S, R, E, L>,
  f: FunctionN<[L], A>
): Managed<S, R, E, A> {
  return chain_(res, (r) => pure(f(r)) as Managed<S, R, E, A>)
}

/**
 * Zip two resources together with the given function.
 *
 * The scope of resa will enclose the scope of resb
 * @param resa
 * @param resb
 * @param f
 */
export function zipWith<S, R, E, A, S2, R2, E2, B, C>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): Managed<S | S2, R & R2, E | E2, C> {
  return chain_(resa, (a) => map_(resb, (b) => f(a, b)))
}

/**
 * Zip two resources together as a tuple.
 *
 * The scope of resa will enclose the scope of resb
 * @param resa
 * @param resb
 */
export function zip<S, R, E, A, S2, R2, E2, B>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>
): Managed<S | S2, R & R2, E | E2, readonly [A, B]> {
  return zipWith(resa, resb, (a, b) => [a, b] as const)
}

/**
 * Flipped version of ap
 * @param resfab
 * @param resa
 */
export function ap_<S, R, E, A, B, S2, R2, E2>(
  resfab: Managed<S, R, E, FunctionN<[A], B>>,
  resa: Managed<S2, R2, E2, A>
): Managed<S | S2, R & R2, E | E2, B> {
  return zipWith(resfab, resa, (f, a) => f(a))
}

/**
 * Map a resource to a static value
 *
 * This creates a resource of the provided constant b where the produced A has the same lifetime internally
 * @param fa
 * @param b
 */
export function as<S, R, E, A, B>(fa: Managed<S, R, E, A>, b: B): Managed<S, R, E, B> {
  return map_(fa, constant(b))
}

/**
 * Curried form of as
 * @param b
 */
export function to<B>(
  b: B
): <S, R, E, A>(fa: Managed<S, R, E, A>) => Managed<S, R, E, B> {
  return (fa) => as(fa, b)
}

/**
 * Construct a new 'hidden' resource using the produced A with a nested lifetime
 * Useful for performing initialization and cleanup that clients don't need to see
 * @param left
 * @param bind
 */
export function chainTap_<S, R, E, A, S2, R2, E2>(
  left: Managed<S, R, E, A>,
  bind: FunctionN<[A], Managed<S2, R2, E2, unknown>>
): Managed<S | S2, R & R2, E | E2, A> {
  return chain_(left, (a) => as(bind(a), a))
}

/**
 * Curried form of chainTap
 * @param bind
 */
export function chainTap<S, R, E, A>(
  bind: FunctionN<[A], Managed<S, R, E, unknown>>
): <S2, R2, E2>(_: Managed<S2, R2, E2, A>) => Managed<S | S2, R & R2, E | E2, A> {
  return (inner) => chainTap_(inner, bind)
}

/**
 * Curried data last form of use
 * @param f
 */
export function consume<S, R, E, A, B>(
  f: FunctionN<[A], T.Effect<S, R, E, B>>
): <S2, R2, E2>(ma: Managed<S2, R2, E2, A>) => T.Effect<S | S2, R & R2, E | E2, B> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return (r) => use(r, f)
}

/**
 * Create a Resource from the fiber of an IO.
 * The acquisition of this resource corresponds to forking rio into a fiber.
 * The destruction of the resource is interrupting said fiber.
 * @param rio
 */
export function fiber<S, R, E, A>(
  rio: T.Effect<S, R, E, A>
): AsyncRE<R, never, T.Fiber<E, A>> {
  return bracket(T.fork(rio), (fiber) => fiber.interrupt)
}

/**
 * Use a resource to produce a program that can be run.s
 * @param res
 * @param f
 */
export function use<S, R, E, A, S2, R2, E2, B>(
  res: Managed<S, R, E, A>,
  f: FunctionN<[A], T.Effect<S2, R2, E2, B>>
): T.Effect<S | S2, R & R2, E | E2, B> {
  const c = fromM(res)
  switch (c._tag) {
    case "Pure":
      return f(c.value)
    case "Encase":
      return T.chain_(c.acquire, f)
    case "Bracket":
      return T.bracket(c.acquire, c.release, f)
    case "BracketExit":
      return T.bracketExit(c.acquire, (a, e) => c.release(a, e as any), f)
    case "Suspended":
      return T.chain_(c.suspended, consume(f))
    case "Chain":
      return use(c.left, (a) => use(c.bind(a), f))
    case "UseProvider":
      return c.provider(T.suspended(() => use(c.managed, f)))
  }
}

/**
 * Use a resource to provide part of the environment to an effect
 * @param man
 * @param ma
 */
export function provide<S2, R3, E2, R2>(
  man: Managed<S2, R3, E2, R2>,
  inverted: "regular" | "inverted" = "regular"
): T.Provider<R3, R2, E2, S2> {
  return (ma) => use(man, (r) => T.provide(r, inverted)(ma))
}

export function getSemigroup<S, R, E, A>(
  Semigroup: Semigroup<A>
): Semigroup<Managed<S, R, E, A>> {
  return {
    concat(x: Managed<S, R, E, A>, y: Managed<S, R, E, A>): Managed<S, R, E, A> {
      return zipWith(x, y, Semigroup.concat)
    }
  }
}

export function getMonoid<S, R, E, A>(Monoid: Monoid<A>): Monoid<Managed<S, R, E, A>> {
  return {
    ...getSemigroup(Monoid),
    empty: pure(Monoid.empty) as Managed<S, R, E, A>
  }
}

export const ap: <S1, R, E, A>(
  fa: Managed<S1, R, E, A>
) => <S2, R2, E2, B>(
  fab: Managed<S2, R2, E2, (a: A) => B>
) => Managed<S1 | S2, R & R2, E | E2, B> = (fa) => (fab) => ap_(fab, fa)

export const apFirst: <S1, R, E, B>(
  fb: Managed<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: Managed<S2, R2, E2, A>
) => Managed<S1 | S2, R & R2, E | E2, A> = (fb) => (fa) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apSecond = <S1, R, E, B>(fb: Managed<S1, R, E, B>) => <A, S2, R2, E2>(
  fa: Managed<S2, R2, E2, A>
): Managed<S1 | S2, R & R2, E | E2, B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const chain: <S1, R, E, A, B>(
  f: (a: A) => Managed<S1, R, E, B>
) => <S2, R2, E2>(ma: Managed<S2, R2, E2, A>) => Managed<S1 | S2, R & R2, E | E2, B> = (
  f
) => (fa) => chain_(fa, f)

export const filterOrElse: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <S, R>(
    ma: Managed<S, R, E, A>
  ) => Managed<S, R, E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): <S, R>(
    ma: Managed<S, R, E, A>
  ) => Managed<S, R, E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => <S, R>(
  ma: Managed<S, R, E, A>
): Managed<S, R, E, A> =>
  chain_(ma, (a) =>
    predicate(a)
      ? encaseEffect(T.completed(raise(onFalse(a))))
      : encaseEffect(T.completed(done(a)))
  )

export const flatten: <S1, S2, R, E, R2, E2, A>(
  mma: Managed<S1, R, E, Managed<S2, R2, E2, A>>
) => Managed<S1 | S2, R & R2, E | E2, A> = (mma) => chain_(mma, (x) => x)

export const fromEither: <E, A>(ma: Either<E, A>) => Managed<never, unknown, E, A> = (
  ma
) => encaseEffect(T.encaseEither(ma))

export const fromOption: <E>(
  onNone: () => E
) => <A>(ma: Option<A>) => Managed<never, unknown, E, A> = (onNone) => (ma) =>
  encaseEffect(T.encaseOption(ma, onNone))

export const map: <A, B>(
  f: (a: A) => B
) => <S, R, E>(fa: Managed<S, R, E, A>) => Managed<S, R, E, B> = (f) => (fa) =>
  map_(fa, f)

export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    a: A
  ) => Managed<never, unknown, E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (
    a: A
  ) => Managed<never, unknown, E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (
  a: A
): Managed<never, unknown, E, A> =>
  predicate(a) ? pure(a) : encaseEffect(T.completed(raise(onFalse(a))))

//
// Allocate
//

export interface Leak<E, A> {
  a: A
  release: T.AsyncE<E, void>
}

/**
 * Returns a leaked resource, environment is kept open via a deferred that is resolved
 * upon release, this is needed to support environment acquired via resource
 * @param ma managed
 */
export function allocate<S, R, E, A>(
  ma: Managed<S, R, E, A>
): T.AsyncRE<R, E, Leak<E, A>> {
  return pipe(
    T.zip_(
      makeDeferred<unknown, unknown, never, void>(),
      makeDeferred<unknown, unknown, E, void>()
    ),
    T.chain(([def_use, def_release]) =>
      T.accessM((r: R) =>
        pipe(
          makeDeferred<unknown, unknown, E, A>(),
          T.chain((def_environment) => {
            let resolved = false
            T.run(
              T.provide(r)(
                use(ma, (a) => {
                  T.run(def_environment.done(a), () => {
                    resolved = true
                  })

                  return def_use.wait
                })
              ),
              (ex) => {
                if (ex._tag !== "Done") {
                  if (!resolved) {
                    T.run(def_environment.cause(ex), () => {
                      T.run(def_release.done(undefined))
                    })
                  } else {
                    T.run(def_release.cause(ex))
                  }
                } else {
                  T.run(def_release.done(undefined))
                }
              }
            )

            return T.sequenceT(
              def_environment.wait,
              T.pure(def_use),
              T.pure(def_release)
            )
          })
        )
      )
    ),
    T.map(([a, def_use, def_release]) => ({
      a,
      release: T.chain_(def_use.done(undefined), () => def_release.wait)
    })),
    T.uninterruptible
  )
}

/**
 * Fold two exits, while running functions when one succeeds but other one
 * fails. Gives error priority to first passed exit (aExit).
 *
 * @param aExit
 * @param bExit
 * @param onBFail - run when a succeeds, but b fails
 * @param onAFail - run when b succeeds, but a fails
 */
function foldExitsWithFallback<E, A, B, S, S2, R, R2>(
  aExit: Exit<E, A>,
  bExit: Exit<E, B>,
  onBFail: FunctionN<[A], T.Effect<S, R, E, unknown>>,
  onAFail: FunctionN<[B], T.Effect<S2, R2, E, unknown>>
): T.AsyncRE<R & R2, E, [A, B]> {
  return aExit._tag === "Done"
    ? bExit._tag === "Done"
      ? unsafeCoerce<T.Sync<[A, B]>, T.AsyncRE<R & R2, E, [A, B]>>(
          T.pure(tuple(aExit.value, bExit.value))
        )
      : pipe(
          onBFail(aExit.value),
          T.foldExit(
            (_) => T.completed(combinedCause(bExit)(_)),
            () => T.raised(bExit)
          )
        )
    : bExit._tag === "Done"
    ? pipe(
        onAFail(bExit.value),
        T.foldExit(
          (_) => T.completed(combinedCause(aExit)(_)),
          () => T.raised(aExit)
        )
      )
    : T.completed(combinedCause(aExit)(bExit))
}

export function parZipWith<S2, R2, E2, A, B, C>(
  resb: Managed<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): <S, R, E>(resa: Managed<S, R, E, A>) => AsyncRE<R & R2, E | E2, C> {
  return (resa) => parZipWith_(resa, resb, f)
}

export function parZipWith_<S, S2, R, R2, E, E2, A, B, C>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  const alloc = T.raceFold(
    allocate(resa as Managed<S, R, E | E2, A>),
    allocate(resb),
    (aExit, bFiber) =>
      T.chain_(bFiber.wait, (bExit) =>
        foldExitsWithFallback(
          aExit,
          bExit,
          (aLeak) => aLeak.release,
          (bLeak) => bLeak.release
        )
      ),
    (bExit, aFiber) =>
      T.chain_(aFiber.wait, (aExit) =>
        foldExitsWithFallback(
          aExit,
          bExit,
          (aLeak) => aLeak.release,
          (bLeak) => bLeak.release
        )
      )
  )

  return map_(
    bracket(alloc, ([aLeak, bLeak]) =>
      T.raceFold(
        aLeak.release,
        bLeak.release,
        (aExit, bFiber) =>
          T.chain_(bFiber.wait, (bExit) =>
            foldExitsWithFallback(
              aExit,
              bExit,
              () => T.unit,
              () => T.unit
            )
          ),
        (bExit, aFiber) =>
          T.chain_(aFiber.wait, (aExit) =>
            foldExitsWithFallback(
              aExit,
              bExit,
              () => T.unit,
              () => T.unit
            )
          )
      )
    ),
    ([aLeak, bLeak]) => f(aLeak.a, bLeak.a)
  )
}

/**
 * Zip two resources together into tuple, while allocating and releasing them
 * in parallel and always prioritizing error of resa.
 *
 * @param resa
 * @param resb
 */
export function parZip_<S, S2, R, R2, E, E2, A, B>(
  resa: Managed<S, R, E, A>,
  resb: Managed<S2, R2, E2, B>
): AsyncRE<R & R2, E | E2, [A, B]> {
  return parZipWith_(resa, resb, tuple)
}

export function parZip<S2, R2, E2, B>(
  resb: Managed<S2, R2, E2, B>
): <S, R, E, A>(resa: Managed<S, R, E, A>) => AsyncRE<R & R2, E | E2, [A, B]> {
  return (resa) => parZipWith_(resa, resb, tuple)
}

/**
 * Parallel form of ap_
 * @param iof
 * @param ioa
 */
export function parAp_<S, S2, R, R2, E, E2, A, B>(
  iof: Managed<S, R, E, FunctionN<[A], B>>,
  ioa: Managed<S2, R2, E2, A>
): AsyncRE<R & R2, E | E2, B> {
  return parZipWith_(iof, ioa, (f, a) => f(a))
}

export const parAp: <S1, R, E, A>(
  fa: Managed<S1, R, E, A>
) => <S2, R2, E2, B>(
  fab: Managed<S2, R2, E2, (a: A) => B>
) => Managed<unknown, R & R2, E | E2, B> = (fa) => (fab) => parAp_(fab, fa)

export const parApFirst: <S1, R, E, B>(
  fb: Managed<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: Managed<S2, R2, E2, A>
) => Managed<unknown, R & R2, E | E2, A> = (fb) => (fa) =>
  parAp_(
    map_(fa, (a) => () => a),
    fb
  )

export const parApFirst_: <A, S2, R2, E2, S1, R, E, B>(
  fa: Managed<S2, R2, E2, A>,
  fb: Managed<S1, R, E, B>
) => Managed<unknown, R & R2, E | E2, A> = (fa, fb) =>
  parAp_(
    map_(fa, (a) => () => a),
    fb
  )

export const parApSecond = <S1, R, E, B>(fb: Managed<S1, R, E, B>) => <A, S2, R2, E2>(
  fa: Managed<S2, R2, E2, A>
): Managed<unknown, R & R2, E | E2, B> =>
  parAp_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const parApSecond_ = <A, S2, R2, E2, S1, R, E, B>(
  fa: Managed<S2, R2, E2, A>,
  fb: Managed<S1, R, E, B>
): Managed<unknown, R & R2, E | E2, B> =>
  parAp_(
    map_(fa, () => (b: B) => b),
    fb
  )

/**
 * Used to merge types of the form Managed<S, R, E, A> | Managed<S2, R2, E2, A2> into Managed<S | S2, R & R2, E | E2, A | A2>
 * @param _
 */
export function compact<H extends Managed<any, any, any, any>>(
  _: H
): Managed<STypeOf<H>, RTypeOf<H>, ETypeOf<H>, ATypeOf<H>> {
  return _ as any
}

//
// Instances
//

export const managed: CMonad4MA<URI> & CApplicative4MA<URI> = {
  URI,
  of: pure,
  map,
  ap,
  chain
}

export function par<I>(
  I: CApplicative4MA<URI> & I
): CApplicative4MAP<URI> & T.Erase<I, CApplicative4MA<URI>>
export function par<I>(I: CApplicative4MA<URI> & I): CApplicative4MAP<URI> & I {
  return {
    ...I,
    _CTX: "async",
    ap: parAp
  }
}

// region classic
export const Do = () => D.Do(managed)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(managed))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(managed))()

export const sequenceArray =
  /*#__PURE__*/
  (() => A.sequence(managed))()

export const sequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(managed))()

export const sequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(managed))()

export const sequenceOption =
  /*#__PURE__*/
  (() => O.sequence(managed))()

export const sequenceEither =
  /*#__PURE__*/
  (() => E.sequence(managed))()

export const traverseArray =
  /*#__PURE__*/
  (() => A.traverse(managed))()

export const traverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(managed))()

export const traverseTree =
  /*#__PURE__*/
  (() => TR.traverse(managed))()

export const traverseOption =
  /*#__PURE__*/
  (() => O.traverse(managed))()

export const traverseEither =
  /*#__PURE__*/
  (() => E.traverse(managed))()

export const traverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(managed))()

export const traverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(managed))()

export const witherArray =
  /*#__PURE__*/
  (() => A.wither(managed))()

export const witherArray_ =
  /*#__PURE__*/
  (() => A.wither_(managed))()

export const witherRecord =
  /*#__PURE__*/
  (() => RE.wither(managed))()

export const witherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(managed))()

export const witherOption =
  /*#__PURE__*/
  (() => O.wither(managed))()

export const witherOption_ =
  /*#__PURE__*/
  (() => O.wither_(managed))()

export const wiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(managed))()

export const wiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(managed))()

export const wiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(managed))()

export const wiltOption =
  /*#__PURE__*/
  (() => O.wilt(managed))()

export const wiltOption_ =
  /*#__PURE__*/
  (() => O.wilt_(managed))()

export const parDo = () => D.Do(par(managed))

export const parSequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(par(managed)))()

export const parSequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(par(managed)))()

export const parSequenceArray =
  /*#__PURE__*/
  (() => A.sequence(par(managed)))()

export const parSequenceRecord =
  /*#__PURE__*/
  (() => RE.sequence(par(managed)))()

export const parSequenceTree =
  /*#__PURE__*/
  (() => TR.sequence(par(managed)))()

export const parTraverseArray =
  /*#__PURE__*/
  (() => A.traverse(par(managed)))()

export const parTraverseRecord =
  /*#__PURE__*/
  (() => RE.traverse(par(managed)))()

export const parTraverseTree =
  /*#__PURE__*/
  (() => TR.traverse(par(managed)))()

export const parTraverseArrayWI =
  /*#__PURE__*/
  (() => A.traverseWithIndex(par(managed)))()

export const parTraverseRecordWI =
  /*#__PURE__*/
  (() => RE.traverseWithIndex(par(managed)))()

export const parWitherArray =
  /*#__PURE__*/
  (() => A.wither(par(managed)))()

export const parWitherArray_ =
  /*#__PURE__*/
  (() => A.wither_(par(managed)))()

export const parWitherRecord =
  /*#__PURE__*/
  (() => RE.wither(par(managed)))()

export const parWitherRecord_ =
  /*#__PURE__*/
  (() => RE.wither_(par(managed)))()

export const parWiltArray =
  /*#__PURE__*/
  (() => A.wilt(par(managed)))()

export const parWiltArray_ =
  /*#__PURE__*/
  (() => A.wilt_(par(managed)))()

export const parWiltRecord =
  /*#__PURE__*/
  (() => RE.wilt(par(managed)))()

export const parWiltRecord_ =
  /*#__PURE__*/
  (() => RE.wilt_(par(managed)))()

//
// Compatibility with fp-ts ecosystem
//

export const managed_: Monad4E<URI> = {
  URI,
  ap: ap_,
  chain: chain_,
  map: map_,
  of: pure
}

export const managedPar_: Monad4EP<URI> = {
  URI,
  _CTX: "async",
  ap: parAp_,
  chain: chain_,
  map: map_,
  of: pure
}
