import { flow, pipe } from "../../Function"
import type { Applicative, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { Access, Fail, Provide, Run } from "../../Prelude/FX"
import * as HKT from "../../Prelude/HKT"
import * as R from "../XReader"

export function monad<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Monad<HKT.PrependURI<R.XReaderURI, F>, HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function monad<F>(
  M: Monad<HKT.UHKT<F>>
): Monad<HKT.PrependURI<R.XReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    flatten: <A, R, R2>(
      ffa: R.XReader<R, HKT.HKT<F, R.XReader<R2, HKT.HKT<F, A>>>>
    ): R.XReader<R & R2, HKT.HKT<F, A>> =>
      pipe(
        R.access((e: R & R2) => pipe(ffa, R.runEnv(e), M.map(R.runEnv(e)))),
        R.map(M.flatten)
      ),
    map: <A, B>(
      f: (a: A) => B
    ): (<R>(fa: R.XReader<R, HKT.HKT<F, A>>) => R.XReader<R, HKT.HKT<F, B>>) =>
      R.map(M.map(f))
  })
}

export function access<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Access<HKT.PrependURI<R.XReaderURI, F>, HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function access<F>(
  M: Monad<HKT.UHKT<F>>
): Access<HKT.PrependURI<R.XReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    access: flow(R.access, R.map(succeedF(M)))
  })
}

export function provide<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Provide<HKT.PrependURI<R.XReaderURI, F>, HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function provide<F>(
  _: Monad<HKT.UHKT<F>>
): Provide<HKT.PrependURI<R.XReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    provide: <R>(r: R) => R.provideSome(() => r)
  })
}

export function applicative<F extends HKT.URIS, C>(
  M: Applicative<F, C>
): Applicative<
  HKT.PrependURI<R.XReaderURI, F>,
  HKT.CleanParam<C, "R"> & HKT.V<"R", "-">
>
export function applicative<F>(
  M: Applicative<HKT.UHKT<F>>
): Applicative<HKT.PrependURI<R.XReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    map: <A, B>(
      f: (a: A) => B
    ): (<R>(fa: R.XReader<R, HKT.HKT<F, A>>) => R.XReader<R, HKT.HKT<F, B>>) =>
      R.map(M.map(f)),
    both: <R2, B>(
      fb: R.XReader<R2, HKT.HKT<F, B>>
    ): (<R, A>(
      fa: R.XReader<R, HKT.HKT<F, A>>
    ) => R.XReader<R & R2, HKT.HKT<F, readonly [A, B]>>) =>
      flow(
        R.zip(fb),
        R.map(([_a, _b]) => pipe(_a, M.both(_b)))
      )
  })
}

export function run<F extends HKT.URIS, C>(
  M: Run<F, C>
): Run<HKT.PrependURI<R.XReaderURI, F>, HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function run<F>(
  M: Run<HKT.UHKT2<F>>
): Run<HKT.PrependURI<R.XReaderURI, HKT.UHKT2<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    either: flow(R.map(M.either))
  })
}

export function fail<F extends HKT.URIS, C>(
  M: Fail<F, C>
): Fail<HKT.PrependURI<R.XReaderURI, F>, HKT.CleanParam<C, "R"> & HKT.V<"R", "-">>
export function fail<F>(
  M: Fail<HKT.UHKT2<F>>
): Fail<HKT.PrependURI<R.XReaderURI, HKT.UHKT2<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    fail: flow(M.fail, R.succeed)
  })
}
