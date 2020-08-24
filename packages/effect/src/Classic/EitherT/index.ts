import type { Erase } from "@effect-ts/system/Utils"

import { identity, pipe } from "../../Function"
import type { Any, Applicative, Covariant, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { Fail, Run } from "../../Prelude/FX"
import type { Auto, F_, UF_, URIS } from "../../Prelude/HKT"
import * as HKT from "../../Prelude/HKT"
import * as E from "../Either"

export type EitherTVariance<C> = Erase<HKT.Strip<C, "E">, Auto> & HKT.V<"E", "+">

export function monad<F extends URIS, C>(
  M: Monad<F, C>
): Monad<HKT.AppendURI<F, E.EitherURI>, EitherTVariance<C>>
export function monad(M: Monad<[UF_]>): Monad<[UF_, E.EitherURI]> {
  return HKT.instance({
    any: () => succeedF(M)(E.right({})),
    flatten: (ffa) =>
      pipe(ffa, M.map(E.fold((e) => succeedF(M)(E.left(e)), identity)), M.flatten),
    map: <A, B>(f: (a: A) => B) => <E>(fa: F_<E.Either<E, A>>): F_<E.Either<E, B>> =>
      pipe(fa, M.map(E.map(f)))
  })
}

export function applicative<F extends URIS, C>(
  M: Applicative<F, C>
): Applicative<HKT.AppendURI<F, E.EitherURI>, EitherTVariance<C>>
export function applicative(M: Applicative<[UF_]>): Applicative<[UF_, E.EitherURI]> {
  return HKT.instance({
    any: () => succeedF(M)(E.right({})),
    map: <A, B>(f: (a: A) => B) => <E>(fa: F_<E.Either<E, A>>): F_<E.Either<E, B>> =>
      pipe(fa, M.map(E.map(f))),
    both: <E2, B>(fb: F_<E.Either<E2, B>>) => <A>(
      fa: F_<E.Either<E2, A>>
    ): F_<E.Either<E2, readonly [A, B]>> =>
      pipe(
        fa,
        M.both(fb),
        M.map(([ea, eb]) => pipe(ea, E.AssociativeBoth.both(eb)))
      )
  })
}

export function run<F extends URIS, C>(
  M: Covariant<F, C>
): Run<HKT.AppendURI<F, E.EitherURI>, EitherTVariance<C>>
export function run(M: Covariant<[UF_]>): Run<[UF_, E.EitherURI]> {
  return HKT.instance({
    either: <E, A>(fa: F_<E.Either<E, A>>): F_<E.Either<never, E.Either<E, A>>> => {
      return pipe(fa, M.map(E.Run.either))
    }
  })
}

export function fail<F extends URIS, C>(
  M: Any<F, C> & Covariant<F, C>
): Fail<HKT.AppendURI<F, E.EitherURI>, EitherTVariance<C>>
export function fail(M: Any<[UF_]> & Covariant<[UF_]>): Fail<[UF_, E.EitherURI]> {
  return HKT.instance({
    fail: <E, A = never>(e: E): F_<E.Either<E, A>> =>
      succeedF(M)(E.widenA<A>()(E.left(e)))
  })
}
