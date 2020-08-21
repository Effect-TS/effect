import type { Erase } from "@effect-ts/system/Utils"

import { identity, pipe } from "../../Function"
import type { Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import * as HKT from "../../Prelude/HKT"
import type { Auto, F_, UF_, URIS } from "../../Prelude/HKT/hkt"
import type { Indexed } from "../../Prelude/HKT/Kind"
import type { Par } from "../../Prelude/HKT/variance"
import * as E from "../Either"

function monad_<F extends URIS, P extends Par, C>(
  M: Monad<F, C>
): Monad<HKT.UnionURI<Indexed<E.EitherURI, P, "E">, F>, Erase<C, Auto> & HKT.V<P, "+">>
function monad_(M: Monad<[UF_]>): Monad<[UF_, E.EitherURI]> {
  return HKT.instance({
    any: () => succeedF(M)(E.right({})),
    flatten: (ffa) =>
      pipe(ffa, M.map(E.fold((e) => succeedF(M)(E.left(e)), identity)), M.flatten),
    map: <A, B>(f: (a: A) => B) => <E>(fa: F_<E.Either<E, A>>): F_<E.Either<E, B>> =>
      pipe(fa, M.map(E.map(f)))
  })
}

export function monad<P extends Par = "E">(_?: P) {
  return <F extends URIS, C>(M: Monad<F, C>) => monad_<F, P, C>(M)
}
