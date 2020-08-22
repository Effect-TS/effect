import type { Erase } from "@effect-ts/system/Utils"

import { identity, pipe } from "../../Function"
import type { Any, Applicative, Covariant, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { Fail, Run } from "../../Prelude/FX"
import type { Auto, F_, Indexed, UF_, URIS } from "../../Prelude/HKT"
import * as HKT from "../../Prelude/HKT"
import type { Par } from "../../Prelude/HKT/variance"
import * as E from "../Either"

function monad_<F extends URIS, P extends Par, C>(
  M: Monad<F, C>
): Monad<
  HKT.UnionURI<Indexed<E.EitherURI, [["E", P]]>, F>,
  Erase<C, Auto> & HKT.V<P, "+">
>
function monad_(M: Monad<[UF_]>): Monad<[UF_, E.EitherURI]> {
  return HKT.instance({
    any: () => succeedF(M)(E.right({})),
    flatten: (ffa) =>
      pipe(ffa, M.map(E.fold((e) => succeedF(M)(E.left(e)), identity)), M.flatten),
    map: <A, B>(f: (a: A) => B) => <E>(fa: F_<E.Either<E, A>>): F_<E.Either<E, B>> =>
      pipe(fa, M.map(E.map(f)))
  })
}

export function monad<P extends Par = "E">(_errorParam?: P) {
  return <F extends URIS, C>(M: Monad<F, C>) => monad_<F, P, C>(M)
}

export function applicative<P extends Par = "E">(_errorParam?: P) {
  return <F extends URIS, C>(M: Applicative<F, C>) => applicative_<F, P, C>(M)
}

function applicative_<F extends URIS, P extends Par, C>(
  M: Applicative<F, C>
): Applicative<
  HKT.UnionURI<Indexed<E.EitherURI, [["E", P]]>, F>,
  Erase<C, Auto> & HKT.V<P, "+">
>
function applicative_(M: Applicative<[UF_]>): Applicative<[UF_, E.EitherURI]> {
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

export function run<P extends Par = "E">(_errorParam?: P) {
  return <F extends URIS, C>(M: Covariant<F, C>) => run_<F, P, C>(M)
}

function run_<F extends URIS, P extends Par, C>(
  M: Covariant<F, C>
): Run<
  HKT.UnionURI<Indexed<E.EitherURI, [["E", P]]>, F>,
  Erase<C, Auto> & HKT.V<P, "+">
>
function run_(M: Covariant<[UF_]>): Run<[UF_, E.EitherURI]> {
  return HKT.instance({
    run: <E, A>(fa: F_<E.Either<E, A>>): F_<E.Either<never, E.Either<E, A>>> => {
      return pipe(fa, M.map(E.Run.run))
    }
  })
}

export function fail<P extends Par = "E">(_errorParam?: P) {
  return <F extends URIS, C>(M: Any<F, C> & Covariant<F, C>) => fail_<F, P, C>(M)
}

function fail_<F extends URIS, P extends Par, C>(
  M: Any<F, C> & Covariant<F, C>
): Fail<
  HKT.UnionURI<Indexed<E.EitherURI, [["E", P]]>, F>,
  Erase<C, Auto> & HKT.V<P, "+">
>
function fail_(M: Any<[UF_]> & Covariant<[UF_]>): Fail<[UF_, E.EitherURI]> {
  return HKT.instance({
    fail: <E, A = never>(e: E): F_<E.Either<E, A>> =>
      succeedF(M)(E.widenA<A>()(E.left(e)))
  })
}
