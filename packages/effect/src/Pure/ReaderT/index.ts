import type { Erase } from "@effect-ts/system/Utils"

import { pipe } from "../../Function"
import type { Monad } from "../../Prelude"
import type { URIS, V } from "../../Prelude/HKT"
import { instance } from "../../Prelude/HKT"
import type { Auto, F_, InvertedUnionURI, UF_ } from "../../Prelude/HKT/hkt"
import type { IndexedURI } from "../../Prelude/HKT/Kind"
import type { Par } from "../../Prelude/HKT/variance"
import * as R from "../Reader"

export function getReaderM<P extends Par = "R">(_?: P) {
  return <F extends URIS, C>(M: Monad<F, C>) => getReaderM_<F, P, C>(M)
}

function getReaderM_<F extends URIS, P extends Par, C>(
  M: Monad<F, C>
): Monad<
  InvertedUnionURI<P extends "R" ? R.ReaderURI : IndexedURI<R.ReaderURI, "R", P>, F>,
  Erase<C, Auto> & V<P, "-">
>
function getReaderM_(M: Monad<[UF_]>): Monad<[R.ReaderURI, UF_]> {
  return instance({
    any: () => R.succeed(M.any()),
    flatten: <A, R2>(ffa: R.Reader<R2, F_<R.Reader<R2, F_<A>>>>): R.Reader<R2, F_<A>> =>
      pipe(
        R.access((e: R2) => pipe(ffa, R.runEnv(e), M.map(R.runEnv(e)))),
        R.map(M.flatten)
      ),
    map: <A, B>(f: (a: A) => B) => <R>(fa: R.Reader<R, F_<A>>): R.Reader<R, F_<B>> =>
      pipe(fa, R.map(M.map(f)))
  })
}
