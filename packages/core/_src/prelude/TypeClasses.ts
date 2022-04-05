import type * as P from "./HKT";

export interface Functor<F extends P.HKT> extends P.Typeclass<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <R, E>(fa: P.Kind<F, R, E, A>) => P.Kind<F, R, E, B>;
}

export interface Pointed<F extends P.HKT> extends Functor<F> {
  readonly of: <A>(a: A) => P.Kind<F, unknown, never, A>;
}

export interface Apply<F extends P.HKT> extends Functor<F> {
  readonly ap: <R, E1, A>(
    fa: P.Kind<F, R, E1, A>
  ) => <R1, E, B>(fab: P.Kind<F, R1, E, (a: A) => B>) => P.Kind<F, R & R1, E | E1, B>;
}

export function getApply<F extends P.HKT>(F: Monad<F>): Apply<F> {
  return {
    map: F.map,
    ap: <R1, E1, A>(fa: P.Kind<F, R1, E1, A>) =>
      <R2, E, B>(fab: P.Kind<F, R2, E, (a: A) => B>) =>
        pipe(
          fa,
          F.chain((a) =>
            pipe(
              fab,
              F.map((f) => f(a))
            )
          )
        )
  };
}

export interface Applicative<F extends P.HKT> extends Pointed<F>, Apply<F> {}

export function getApplicative<F extends P.HKT>(F: Monad<F>): Applicative<F> {
  return {
    ...getApply(F),
    of: F.of
  };
}

export interface Monad<F extends P.HKT> extends Pointed<F> {
  readonly chain: <A, R1, E1, B>(
    f: (a: A) => P.Kind<F, R1, E1, B>
  ) => <R, E>(fa: P.Kind<F, R, E, A>) => P.Kind<F, R & R1, E | E1, B>;
}

export interface Semigroup<A> {
  readonly concat: (left: A, right: A) => A;
}
