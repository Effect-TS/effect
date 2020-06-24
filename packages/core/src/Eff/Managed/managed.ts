import * as T from "./deps"
import {
  ReleaseMap,
  Finalizer,
  FinalizerT,
  makeReleaseMap,
  Sequential
} from "./releaseMap"

export const noop: Finalizer = () => T.unit

export const ManagedURI = "@matechs/core/Eff/ManagedURI"
export type ManagedURI = typeof ManagedURI

export class Managed<S, R, E, A> {
  readonly [T._U]: ManagedURI;
  readonly [T._S]: () => S;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A;
  readonly [T._R]: (_: R) => void

  constructor(readonly effect: T.AsyncRE<[R, ReleaseMap], E, [FinalizerT<E>, A]>) {}
}

declare module "../../Base/HKT" {
  interface MaToKind<S, R, E, A> {
    [ManagedURI]: Managed<S, R, E, A>
  }
}

export type Sync<A> = Managed<never, unknown, never, A>
export type SyncE<E, A> = Managed<never, unknown, E, A>
export type SyncR<R, A> = Managed<never, R, never, A>
export type SyncRE<R, E, A> = Managed<never, R, E, A>
export type Async<A> = Managed<unknown, unknown, never, A>
export type AsyncR<R, A> = Managed<unknown, R, never, A>
export type AsyncE<E, A> = Managed<unknown, unknown, E, A>
export type AsyncRE<R, E, A> = Managed<unknown, R, E, A>

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export const fromEffect = <S, R, E, A>(effect: T.Effect<S, R, E, A>) =>
  new Managed(
    T.map_(
      T.accessM((_: [R, ReleaseMap]) => T.provideAll_(effect, _[0])),
      (a) => [noop, a]
    )
  )

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit = <S, R, E, A>(acquire: T.Effect<S, R, E, A>) => <S1, R1, E1>(
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<S1, R1, E1, any>
) =>
  new Managed<S | S1, R & R1, E | E1, A>(
    T.uninterruptible(
      T.Do()
        .bind(
          "r",
          T.access((_: [R & R1, ReleaseMap]) => _)
        )
        .bindL("a", (s) => T.provideAll_(acquire, s.r[0]))
        .bindL("rm", (s) =>
          T.provideAll_(
            s.r[1].add((ex) => T.provideAll_(release(s.a, ex), s.r[0])),
            s.r[1]
          )
        )
        .return((s) => [s.rm, s.a])
    )
  )

export const use_ = <S, R, E, A, S2, R2, E2, B>(
  self: Managed<S, R, E, A>,
  f: (a: A) => T.Effect<S2, R2, E2, B>
): T.Effect<S | S2, R & R2, E | E2, B> => {
  return T.bracketExit_(
    makeReleaseMap,
    (rm) =>
      T.accessM((r: R) =>
        T.chain_(T.provideAll_(internalEffect(self), [r, rm]), (a) => f(a[1]))
      ),
    (rm, ex) => releaseAll<S, E>(rm, ex)
  )
}

function internalEffect<S, R, E, A>(
  self: Managed<S, R, E, A>
): T.Effect<S, [R, ReleaseMap], E, [FinalizerT<E>, A]> {
  return T.coerceSE<S, E>()(self.effect)
}

function releaseAll<S, E>(
  rm: ReleaseMap,
  ex: T.Exit<any, any>
): T.Effect<S, unknown, E, any> {
  return T.coerceSE<S, E>()(rm.releaseAll(ex, new Sequential()))
}
