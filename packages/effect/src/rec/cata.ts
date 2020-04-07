/**
 * Recursion schemes are simple, composable combinators, that automate the process of traversing and recursing through nested data structures.
 * @since 0.1.16
 */
import { Kind, URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";
import { Fix } from "./Fix";

export interface Algebra<F extends URIS, R, E, A> {
  (_: Kind<F, A>): EF.Effect<R, E, A>;
}

export interface TMap<T extends URIS, R, E> {
  <A, B>(ta: Kind<T, A>, f: (a: A) => EF.Effect<R, E, B>): EF.Effect<R, E, Kind<T, B>>;
}

export function cata<R, E, F extends URIS>(
  F: TMap<F, R, E>
): <R2, E2, A>(alg: Algebra<F, R2, E2, A>) => (_: Fix<F>) => EF.Effect<R & R2, E | E2, A> {
  return (alg) => (_) =>
    EF.effect.chain(EF.flatten(EF.sync(() => F(_.unfix, cata(F)(alg) as any))) as any, alg);
}
