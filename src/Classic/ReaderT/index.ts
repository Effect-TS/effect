import type { Erase } from "@effect-ts/system/Utils"

import { pipe } from "../../Function"
import type { Applicative, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { Access, Fail, Provide, Run } from "../../Prelude/FX"
import type { URIS, V } from "../../Prelude/HKT"
import * as HKT from "../../Prelude/HKT"
import * as R from "../Reader"

export type ReaderTVariance<C> = Erase<HKT.Strip<C, "R">, HKT.Auto> & V<"R", "-">

export function monad<F extends URIS, C>(
  M: Monad<F, C>
): Monad<HKT.PrependURI<R.ReaderURI, F>, ReaderTVariance<C>>
export function monad(M: Monad<[HKT.UF_]>): Monad<[R.ReaderURI, HKT.UF_]> {
  return HKT.instance({
    any: () => M.any,
    flatten: <A, R2>(
      ffa: R.Reader<R2, HKT.F_<R.Reader<R2, HKT.F_<A>>>>
    ): R.Reader<R2, HKT.F_<A>> => (r) =>
      pipe(
        ffa(r),
        M.map((f) => f(r)),
        M.flatten
      ),
    map: <A, B>(f: (a: A) => B) => <R>(
      fa: R.Reader<R, HKT.F_<A>>
    ): R.Reader<R, HKT.F_<B>> => (r) => pipe(fa(r), M.map(f))
  })
}

export function access<F extends URIS, C>(
  M: Monad<F, C>
): Access<HKT.PrependURI<R.ReaderURI, F>, ReaderTVariance<C>>
export function access(M: Monad<[HKT.UF_]>): Access<[R.ReaderURI, HKT.UF_]> {
  return HKT.instance({
    access: (f) => pipe(R.access(f), R.map(succeedF(M)))
  })
}

export function provide<F extends URIS, C>(
  M: Monad<F, C>
): Provide<HKT.PrependURI<R.ReaderURI, F>, ReaderTVariance<C>>
export function provide(M: Monad<[HKT.UF_]>): Provide<[R.ReaderURI, HKT.UF_]> {
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

export function applicative<F extends URIS, C>(
  M: Applicative<F, C>
): Applicative<HKT.PrependURI<R.ReaderURI, F>, ReaderTVariance<C>>
export function applicative(
  M: Applicative<[HKT.UF_]>
): Applicative<[R.ReaderURI, HKT.UF_]> {
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

export function run<F extends URIS, C>(
  M: Run<F, C>
): Run<HKT.PrependURI<R.ReaderURI, F>, ReaderTVariance<C>>
export function run(M: Run<[HKT.UF__]>): Run<[R.ReaderURI, HKT.UF__]> {
  return HKT.instance({
    either: (fa) => pipe(fa, R.map(M.either))
  })
}

export function fail<F extends URIS, C>(
  M: Fail<F, C>
): Fail<HKT.PrependURI<R.ReaderURI, F>, ReaderTVariance<C>>
export function fail(M: Fail<[HKT.UF__]>): Fail<[R.ReaderURI, HKT.UF__]> {
  return HKT.instance({
    fail: (e) => pipe(e, M.fail, R.succeed)
  })
}
