/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/managedr.ts
  credits to original author
  small adaptations to extend Monad3E and support contravariance on R
 */

import * as T from "./";
import * as M from "waveguide/lib/managed";

import { constant, FunctionN } from "fp-ts/lib/function";
import { tuple2 } from "waveguide/lib/support/util";
import { Monoid } from "fp-ts/lib/Monoid";
import { Semigroup } from "fp-ts/lib/Semigroup";
import { Monad3E } from "./overload";
import { Fiber } from "waveguide/lib/wave";

export type Managed<R, E, A> = (r: R) => M.Managed<E, A>;

export function encaseManaged<E, A>(m: M.Managed<E, A>): Managed<{}, E, A> {
  return constant(m);
}

export function pure<E = never, A = unknown>(value: A): Managed<{}, E, A> {
  return encaseManaged<E, A>(M.pure(value) as M.Managed<E, A>);
}

export function encaseEffect<R, E, A>(
  effect: T.Effect<R, E, A>
): Managed<R, E, A> {
  return r => M.encaseWave(effect(r));
}

export function bracket<R, E, A>(
  acquire: T.Effect<R, E, A>,
  release: FunctionN<[A], T.Effect<R, E, unknown>>
): Managed<R, E, A> {
  return r => M.bracket(acquire(r), a => release(a)(r));
}

export function suspend<R, E, A>(
  s: T.Effect<R, E, Managed<R, E, A>>
): Managed<R, E, A> {
  return r => M.suspend(T.effectMonad.map(s, m => m(r))(r));
}

export function chain<R, R2, E, E2, L, A>(
  left: Managed<R, E, L>,
  bind: FunctionN<[L], Managed<R2, E2, A>>
): Managed<R & R2, E | E2, A> {
  return r =>
    M.chain<E | E2, L, A>(
      left(r) as M.Managed<E | E2, L>,
      l => bind(l)(r) as M.Managed<E | E2, A>
    );
}

export function chainWith<R, E, L, A>(
  bind: FunctionN<[L], Managed<R, E, A>>
): FunctionN<[Managed<R, E, L>], Managed<R, E, A>> {
  return left => chain(left, bind);
}

export function map<R, E, L, A>(
  res: Managed<R, E, L>,
  f: FunctionN<[L], A>
): Managed<R, E, A> {
  return r => M.map(res(r), f);
}

export function mapWith<L, A>(
  f: FunctionN<[L], A>
): <R, E>(res: Managed<R, E, L>) => Managed<R, E, A> {
  return <R, E>(res: Managed<R, E, L>) => map(res, f);
}

export function zipWith<R, E, A, R2, E2, B, C>(
  ma: Managed<R, E, A>,
  mb: Managed<R2, E2, B>,
  f: FunctionN<[A, B], C>
): Managed<R & R2, E | E2, C> {
  return chain(ma, a => map(mb, b => f(a, b)));
}

export function zip<R, E, A, R2, E2, B>(
  ma: Managed<R, E, A>,
  mb: Managed<R2, E2, B>
): Managed<R & R2, E | E2, readonly [A, B]> {
  return zipWith(ma, mb, tuple2);
}

export function ap<R, E, A, B>(
  ma: Managed<R, E, A>,
  mfab: Managed<R, E, FunctionN<[A], B>>
): Managed<R, E, B> {
  return zipWith(ma, mfab, (a, f) => f(a));
}

export function ap_<R, E, A, B>(
  mfab: Managed<R, E, FunctionN<[A], B>>,
  ma: Managed<R, E, A>
): Managed<R, E, B> {
  return zipWith(mfab, ma, (f, a) => f(a));
}

export function as<R, E, A, B>(fa: Managed<R, E, A>, b: B): Managed<R, E, B> {
  return map(fa, constant(b));
}

export function to<B>(
  b: B
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R, E, B> {
  return fa => as(fa, b);
}

export function chainTap<R, E, A>(
  left: Managed<R, E, A>,
  bind: FunctionN<[A], Managed<R, E, unknown>>
): Managed<R, E, A> {
  return chain(left, a => as(bind(a), a));
}

export function chainTapWith<R, E, A>(
  bind: FunctionN<[A], Managed<R, E, unknown>>
): FunctionN<[Managed<R, E, A>], Managed<R, E, A>> {
  return inner => chainTap(inner, bind);
}

export function use<R, R2, E, E2, A, B>(
  ma: Managed<R, E, A>,
  f: FunctionN<[A], T.Effect<R2, E2, B>>
): T.Effect<R & R2, E | E2, B> {
  return r => M.use<E | E2, A, B>(ma(r) as M.Managed<E | E2, A>, a => f(a)(r));
}

export interface Leak<R, E, A> {
  a: A;
  release: T.Effect<R, E, unknown>;
}

export function allocate<R, E, A>(
  ma: Managed<R, E, A>
): T.Effect<R, E, Leak<R, E, A>> {
  return r =>
    T.effectMonad.map(
      _ => M.allocate(ma(r)),
      (l): Leak<R, E, A> => ({ a: l.a, release: _ => l.release })
    )(r);
}

export function consume<R, E, A, B>(
  f: FunctionN<[A], T.Effect<R, E, B>>
): FunctionN<[Managed<R, E, A>], T.Effect<R, E, B>> {
  return r => use(r, f);
}

export function provideTo<R, E, A, B>(
  ma: Managed<R, E, A>,
  effect: T.Effect<A, E, B>
): T.Effect<R, E, B> {
  return use(ma, a => _ => effect(a));
}

export function fiber<R, E, A>(rio: T.Effect<R, E, A>): Managed<R, never, Fiber<E, A>> {
  return r => M.fiber(rio(r))
}

export const URI = "matechs/Managed";
export type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind3<R, E, A> {
    [URI]: Managed<R, E, A>;
  }
}

export const managed: Monad3E<URI> = {
  URI,
  of: <R, E, A>(a: A): Managed<R, E, A> =>
    (pure(a) as unknown) as Managed<R, E, A>,
  map,
  ap: ap_,
  chain
} as const;

export function getSemigroup<R, E, A>(
  Semigroup: Semigroup<A>
): Semigroup<Managed<R, E, A>> {
  return {
    concat(x: Managed<R, E, A>, y: Managed<R, E, A>): Managed<R, E, A> {
      return zipWith(x, y, Semigroup.concat);
    }
  };
}

export function getMonoid<R, E, A>(
  Monoid: Monoid<A>
): Monoid<Managed<R, E, A>> {
  return {
    ...getSemigroup(Monoid),
    empty: (pure(Monoid.empty) as unknown) as Managed<R, E, A>
  };
}
