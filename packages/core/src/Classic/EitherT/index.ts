import type { Erase } from "@effect-ts/system/Utils"

import { identity, pipe } from "../../Function"
import type { Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { RestrictedKindURI, UnionURI, V } from "../../Prelude/HKT"
import { instance } from "../../Prelude/HKT"
import type { Auto, F_, UF_ } from "../../Prelude/HKT/hkt"
import * as E from "../Either"

export function getEitherM<F extends RestrictedKindURI, C>(
  M: Monad<F, C>
): Monad<UnionURI<E.EitherURI, F>, Erase<C, Auto> & V<"E", "+">>
export function getEitherM(M: Monad<[UF_]>): Monad<[UF_, E.EitherURI]> {
  return instance({
    any: () => succeedF(M)(E.right({})),
    flatten: (ffa) =>
      pipe(ffa, M.map(E.fold((e) => succeedF(M)(E.left(e)), identity)), M.flatten),
    map: <A, B>(f: (a: A) => B) => <E>(fa: F_<E.Either<E, A>>): F_<E.Either<E, B>> =>
      pipe(fa, M.map(E.map(f)))
  })
}
