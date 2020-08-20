import type { Erase } from "@effect-ts/system/Utils"

import { identity, pipe } from "../../Function"
import type { Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { UnionURI, V } from "../../Prelude/HKT"
import { instance } from "../../Prelude/HKT"
import type { Auto, F_, UF_, URIS } from "../../Prelude/HKT/hkt"
import type { IndexedURI } from "../../Prelude/HKT/Kind"
import type { Par } from "../../Prelude/HKT/variance"
import * as E from "../Either"

function getEitherM_<F extends URIS, P extends Par, C>(
  M: Monad<F, C>
): Monad<
  UnionURI<P extends "E" ? E.EitherURI : IndexedURI<E.EitherURI, "E", P>, F>,
  Erase<C, Auto> & V<P, "+">
>
function getEitherM_(M: Monad<[UF_]>): Monad<[UF_, E.EitherURI]> {
  return instance({
    any: () => succeedF(M)(E.right({})),
    flatten: (ffa) =>
      pipe(ffa, M.map(E.fold((e) => succeedF(M)(E.left(e)), identity)), M.flatten),
    map: <A, B>(f: (a: A) => B) => <E>(fa: F_<E.Either<E, A>>): F_<E.Either<E, B>> =>
      pipe(fa, M.map(E.map(f)))
  })
}

export function getEitherM<P extends Par = "E">(_?: P) {
  return <F extends URIS, C>(M: Monad<F, C>) => getEitherM_<F, P, C>(M)
}
