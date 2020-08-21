import type { Erase } from "@effect-ts/system/Utils"

import { pipe } from "../../Function"
import type { Monad } from "../../Prelude"
import type { URIS, V } from "../../Prelude/HKT"
import * as HKT from "../../Prelude/HKT"
import type { Par } from "../../Prelude/HKT/variance"
import * as R from "../Reader"

export function monad<P extends Par = "R">(_envParam?: P) {
  return <F extends URIS, C>(M: Monad<F, C>) => monad_<F, P, C>(M)
}

function monad_<F extends URIS, P extends Par, C>(
  M: Monad<F, C>
): Monad<
  HKT.InvertedUnionURI<HKT.Indexed<R.ReaderURI, [["R", P]]>, F>,
  Erase<C, HKT.Auto> & V<P, "-">
>
function monad_(M: Monad<[HKT.UF_]>): Monad<[R.ReaderURI, HKT.UF_]> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    flatten: <A, R2>(
      ffa: R.Reader<R2, HKT.F_<R.Reader<R2, HKT.F_<A>>>>
    ): R.Reader<R2, HKT.F_<A>> =>
      pipe(
        R.access((e: R2) => pipe(ffa, R.runEnv(e), M.map(R.runEnv(e)))),
        R.map(M.flatten)
      ),
    map: <A, B>(f: (a: A) => B) => <R>(
      fa: R.Reader<R, HKT.F_<A>>
    ): R.Reader<R, HKT.F_<B>> => pipe(fa, R.map(M.map(f)))
  })
}
