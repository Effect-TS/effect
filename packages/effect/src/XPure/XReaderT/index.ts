import { pipe } from "../../Function"
import type { Applicative, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { Access, Fail, Provide, Run } from "../../Prelude/FX"
import * as HKT from "../../Prelude/HKT"
import * as R from "../XReader"

export type V<C> = HKT.CleanParam<C, "R"> & HKT.V<"R", "-">

export function monad<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Monad<HKT.PrependURI<R.XReaderURI, F>, V<C>>
export function monad(
  M: Monad<[HKT.UF_]>
): Monad<[R.XReaderURI, HKT.UF_], HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    flatten: <A, R, R2>(
      ffa: R.XReader<R, HKT.F_<R.XReader<R2, HKT.F_<A>>>>
    ): R.XReader<R & R2, HKT.F_<A>> =>
      pipe(
        R.access((e: R & R2) => pipe(ffa, R.runEnv(e), M.map(R.runEnv(e)))),
        R.map(M.flatten)
      ),
    map: <A, B>(f: (a: A) => B) => <R>(
      fa: R.XReader<R, HKT.F_<A>>
    ): R.XReader<R, HKT.F_<B>> => pipe(fa, R.map(M.map(f)))
  })
}

export function access<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Access<HKT.PrependURI<R.XReaderURI, F>, V<C>>
export function access(
  M: Monad<[HKT.UF_]>
): Access<[R.XReaderURI, HKT.UF_], HKT.V<"R", "-">> {
  return HKT.instance({
    access: (f) => pipe(R.access(f), R.map(succeedF(M)))
  })
}

export function provide<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Provide<HKT.PrependURI<R.XReaderURI, F>, V<C>>
export function provide(
  M: Monad<[HKT.UF_]>
): Provide<[R.XReaderURI, HKT.UF_], HKT.V<"R", "-">> {
  return HKT.instance({
    provide: <R>(r: R) => <A>(
      fa: R.XReader<R, HKT.F_<A>>
    ): R.XReader<unknown, HKT.F_<A>> =>
      pipe(
        fa,
        R.provideSome(() => r)
      )
  })
}

export function applicative<F extends HKT.URIS, C>(
  M: Applicative<F, C>
): Applicative<HKT.PrependURI<R.XReaderURI, F>, V<C>>
export function applicative(
  M: Applicative<[HKT.UF_]>
): Applicative<[R.XReaderURI, HKT.UF_], HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    map: <A, B>(f: (a: A) => B) => <R>(
      fa: R.XReader<R, HKT.F_<A>>
    ): R.XReader<R, HKT.F_<B>> => pipe(fa, R.map(M.map(f))),
    both: <R2, B>(fb: R.XReader<R2, HKT.F_<B>>) => <R, A>(
      fa: R.XReader<R, HKT.F_<A>>
    ): R.XReader<R & R2, HKT.F_<readonly [A, B]>> =>
      pipe(
        fa,
        R.zip(fb),
        R.map(([_a, _b]) => pipe(_a, M.both(_b)))
      )
  })
}

export function run<F extends HKT.URIS, C>(
  M: Run<F, C>
): Run<HKT.PrependURI<R.XReaderURI, F>, V<C>>
export function run(
  M: Run<[HKT.UF__]>
): Run<[R.XReaderURI, HKT.UF__], HKT.V<"R", "-">> {
  return HKT.instance({
    either: (fa) => pipe(fa, R.map(M.either))
  })
}

export function fail<F extends HKT.URIS, C>(
  M: Fail<F, C>
): Fail<HKT.PrependURI<R.XReaderURI, F>, V<C>>
export function fail(
  M: Fail<[HKT.UF__]>
): Fail<[R.XReaderURI, HKT.UF__], HKT.V<"R", "-">> {
  return HKT.instance({
    fail: (e) => pipe(e, M.fail, R.succeed)
  })
}
