import { flow, pipe } from "../../Function"
import type { Applicative, Monad } from "../../Prelude"
import * as P from "../../Prelude"
import * as R from "../XReader"

export function monad<F extends P.URIS, C>(
  M: Monad<F, C>
): Monad<P.PrependURI<R.XReaderURI, F>, P.CleanParam<C, "R"> & P.V<"R", "-">>
export function monad<F>(
  M: Monad<P.UHKT<F>>
): Monad<P.PrependURI<R.XReaderURI, P.UHKT<F>>, P.V<"R", "-">> {
  return P.instance({
    any: () => R.succeed(M.any()),
    flatten: <A, R, R2>(
      ffa: R.XReader<R, P.HKT<F, R.XReader<R2, P.HKT<F, A>>>>
    ): R.XReader<R & R2, P.HKT<F, A>> =>
      pipe(
        R.access((e: R & R2) => pipe(ffa, R.runEnv(e), M.map(R.runEnv(e)))),
        R.map(M.flatten)
      ),
    map: <A, B>(
      f: (a: A) => B
    ): (<R>(fa: R.XReader<R, P.HKT<F, A>>) => R.XReader<R, P.HKT<F, B>>) =>
      R.map(M.map(f))
  })
}

export function access<F extends P.URIS, C>(
  M: Monad<F, C>
): P.FX.Access<P.PrependURI<R.XReaderURI, F>, P.CleanParam<C, "R"> & P.V<"R", "-">>
export function access<F>(
  M: Monad<P.UHKT<F>>
): P.FX.Access<P.PrependURI<R.XReaderURI, P.UHKT<F>>, P.V<"R", "-">> {
  return P.instance({
    access: flow(R.access, R.map(P.succeedF(M)))
  })
}

export function provide<F extends P.URIS, C>(
  M: Monad<F, C>
): P.FX.Provide<P.PrependURI<R.XReaderURI, F>, P.CleanParam<C, "R"> & P.V<"R", "-">>
export function provide<F>(
  _: Monad<P.UHKT<F>>
): P.FX.Provide<P.PrependURI<R.XReaderURI, P.UHKT<F>>, P.V<"R", "-">> {
  return P.instance({
    provide: <R>(r: R) => R.provideSome(() => r)
  })
}

export function applicative<F extends P.URIS, C>(
  M: Applicative<F, C>
): Applicative<P.PrependURI<R.XReaderURI, F>, P.CleanParam<C, "R"> & P.V<"R", "-">>
export function applicative<F>(
  M: Applicative<P.UHKT<F>>
): Applicative<P.PrependURI<R.XReaderURI, P.UHKT<F>>, P.V<"R", "-">> {
  return P.instance({
    any: () => R.succeed(M.any()),
    map: <A, B>(
      f: (a: A) => B
    ): (<R>(fa: R.XReader<R, P.HKT<F, A>>) => R.XReader<R, P.HKT<F, B>>) =>
      R.map(M.map(f)),
    both: <R2, B>(
      fb: R.XReader<R2, P.HKT<F, B>>
    ): (<R, A>(
      fa: R.XReader<R, P.HKT<F, A>>
    ) => R.XReader<R & R2, P.HKT<F, readonly [A, B]>>) =>
      flow(
        R.zip(fb),
        R.map(([_a, _b]) => pipe(_a, M.both(_b)))
      )
  })
}

export function run<F extends P.URIS, C>(
  M: P.FX.Run<F, C>
): P.FX.Run<P.PrependURI<R.XReaderURI, F>, P.CleanParam<C, "R"> & P.V<"R", "-">>
export function run<F>(
  M: P.FX.Run<P.UHKT2<F>>
): P.FX.Run<P.PrependURI<R.XReaderURI, P.UHKT2<F>>, P.V<"R", "-">> {
  return P.instance({
    either: flow(R.map(M.either))
  })
}

export function fail<F extends P.URIS, C>(
  M: P.FX.Fail<F, C>
): P.FX.Fail<P.PrependURI<R.XReaderURI, F>, P.CleanParam<C, "R"> & P.V<"R", "-">>
export function fail<F>(
  M: P.FX.Fail<P.UHKT2<F>>
): P.FX.Fail<P.PrependURI<R.XReaderURI, P.UHKT2<F>>, P.V<"R", "-">> {
  return P.instance({
    fail: flow(M.fail, R.succeed)
  })
}
