import type { Erase } from "@effect-ts/system/Utils"

import { pipe } from "../../Function"
import type { Applicative, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { Access, Fail, Provide, Run } from "../../Prelude/FX"
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

export function access<P extends Par = "R">(_envParam?: P) {
  return <F extends URIS, C>(M: Monad<F, C>) => access_<F, P, C>(M)
}

function access_<F extends URIS, P extends Par, C>(
  M: Monad<F, C>
): Access<
  HKT.InvertedUnionURI<HKT.Indexed<R.ReaderURI, [["R", P]]>, F>,
  Erase<C, HKT.Auto> & V<P, "-">
>
function access_(M: Monad<[HKT.UF_]>): Access<[R.ReaderURI, HKT.UF_]> {
  return HKT.instance({
    access: (f) => pipe(R.access(f), R.map(succeedF(M)))
  })
}

export function provide<P extends Par = "R">(_envParam?: P) {
  return <F extends URIS, C>(M: Monad<F, C>) => provide_<F, P, C>(M)
}

function provide_<F extends URIS, P extends Par, C>(
  M: Monad<F, C>
): Provide<
  HKT.InvertedUnionURI<HKT.Indexed<R.ReaderURI, [["R", P]]>, F>,
  Erase<C, HKT.Auto> & V<P, "-">
>
function provide_(M: Monad<[HKT.UF_]>): Provide<[R.ReaderURI, HKT.UF_]> {
  return HKT.instance({
    provide: <R>(r: R) => <A>(
      fa: R.Reader<R, HKT.F_<A>>
    ): R.Reader<unknown, HKT.F_<A>> =>
      pipe(
        fa,
        R.provideSome(() => r)
      )
  })
}

export function applicative<P extends Par = "R">(_envParam?: P) {
  return <F extends URIS, C>(M: Applicative<F, C>) => applicative_<F, P, C>(M)
}

function applicative_<F extends URIS, P extends Par, C>(
  M: Applicative<F, C>
): Applicative<
  HKT.InvertedUnionURI<HKT.Indexed<R.ReaderURI, [["R", P]]>, F>,
  Erase<C, HKT.Auto> & V<P, "-">
>
function applicative_(M: Applicative<[HKT.UF_]>): Applicative<[R.ReaderURI, HKT.UF_]> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    map: <A, B>(f: (a: A) => B) => <R>(
      fa: R.Reader<R, HKT.F_<A>>
    ): R.Reader<R, HKT.F_<B>> => pipe(fa, R.map(M.map(f))),
    both: <R2, B>(fb: R.Reader<R2, HKT.F_<B>>) => <A>(
      fa: R.Reader<R2, HKT.F_<A>>
    ): R.Reader<R2, HKT.F_<readonly [A, B]>> =>
      pipe(
        fa,
        R.zip(fb),
        R.map(([_a, _b]) => pipe(_a, M.both(_b)))
      )
  })
}

export function run<P extends Par = "R">(_envParam?: P) {
  return <F extends URIS, C>(M: Run<F, C>) => run_<F, P, C>(M)
}

function run_<F extends URIS, P extends Par, C>(
  M: Run<F, C>
): Run<
  HKT.InvertedUnionURI<HKT.Indexed<R.ReaderURI, [["R", P]]>, F>,
  Erase<C, HKT.Auto> & V<P, "-">
>
function run_(M: Run<[HKT.UF__]>): Run<[R.ReaderURI, HKT.UF__]> {
  return HKT.instance({
    run: (fa) => pipe(fa, R.map(M.run))
  })
}

export function fail<P extends Par = "R">(_envParam?: P) {
  return <F extends URIS, C>(M: Fail<F, C>) => fail_<F, P, C>(M)
}

function fail_<F extends URIS, P extends Par, C>(
  M: Fail<F, C>
): Fail<
  HKT.InvertedUnionURI<HKT.Indexed<R.ReaderURI, [["R", P]]>, F>,
  Erase<C, HKT.Auto> & V<P, "-">
>
function fail_(M: Fail<[HKT.UF__]>): Fail<[R.ReaderURI, HKT.UF__]> {
  return HKT.instance({
    fail: (e) => pipe(e, M.fail, R.succeed)
  })
}
