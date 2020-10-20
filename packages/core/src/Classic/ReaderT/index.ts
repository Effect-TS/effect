import { pipe } from "../../Function"
import type { Applicative, AssociativeEither, Monad } from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"
import type { Access, Fail, Provide, Run } from "../../Prelude/FX"
import * as HKT from "../../Prelude/HKT"
import type { Either } from "../Either"
import * as R from "../Reader"

export type V<C> = HKT.CleanParam<C, "R"> & HKT.V<"R", "-">

export function monad<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Monad<HKT.PrependURI<R.ReaderURI, F>, V<C>>
export function monad<F>(
  M: Monad<HKT.UHKT<F>>
): Monad<HKT.PrependURI<R.ReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => M.any,
    flatten: <A, R, R2>(
      ffa: R.Reader<R, HKT.HKT<F, R.Reader<R2, HKT.HKT<F, A>>>>
    ): R.Reader<R & R2, HKT.HKT<F, A>> => (r) =>
      pipe(
        ffa(r),
        M.map((f) => f(r)),
        M.flatten
      ),
    map: <A, B>(f: (a: A) => B) => <R>(
      fa: R.Reader<R, HKT.HKT<F, A>>
    ): R.Reader<R, HKT.HKT<F, B>> => (r) => pipe(fa(r), M.map(f))
  })
}

export function access<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Access<HKT.PrependURI<R.ReaderURI, F>, V<C>>
export function access<F>(
  M: Monad<HKT.UHKT<F>>
): Access<HKT.PrependURI<R.ReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    access: (f) => pipe(R.access(f), R.map(succeedF(M)))
  })
}

export function associativeEither<F extends HKT.URIS, C>(
  M: AssociativeEither<F, C>
): AssociativeEither<HKT.PrependURI<R.ReaderURI, F>, V<C>>
export function associativeEither<F>(
  M: AssociativeEither<HKT.UHKT<F>>
): AssociativeEither<HKT.PrependURI<R.ReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    either: <R2, B>(fb: R.Reader<R2, HKT.HKT<F, B>>) => <R, A>(
      fa: R.Reader<R, HKT.HKT<F, A>>
    ): R.Reader<R2 & R, HKT.HKT<F, Either<A, B>>> => (r) => M.either(fb(r))(fa(r))
  })
}

export function provide<F extends HKT.URIS, C>(
  M: Monad<F, C>
): Provide<HKT.PrependURI<R.ReaderURI, F>, V<C>>
export function provide<F>(
  M: Monad<HKT.UHKT<F>>
): Provide<HKT.PrependURI<R.ReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    provide: <R>(r: R) => <A>(
      fa: R.Reader<R, HKT.HKT<F, A>>
    ): R.Reader<unknown, HKT.HKT<F, A>> =>
      pipe(
        fa,
        R.provideSome(() => r)
      )
  })
}

export function applicative<F extends HKT.URIS, C>(
  M: Applicative<F, C>
): Applicative<HKT.PrependURI<R.ReaderURI, F>, V<C>>
export function applicative<F>(
  M: Applicative<HKT.UHKT<F>>
): Applicative<HKT.PrependURI<R.ReaderURI, HKT.UHKT<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    any: () => R.succeed(M.any()),
    map: <A, B>(f: (a: A) => B) => <R>(
      fa: R.Reader<R, HKT.HKT<F, A>>
    ): R.Reader<R, HKT.HKT<F, B>> => pipe(fa, R.map(M.map(f))),
    both: <R2, B>(fb: R.Reader<R2, HKT.HKT<F, B>>) => <R, A>(
      fa: R.Reader<R, HKT.HKT<F, A>>
    ): R.Reader<R & R2, HKT.HKT<F, readonly [A, B]>> =>
      pipe(
        fa,
        R.zip(fb),
        R.map(([_a, _b]) => pipe(_a, M.both(_b)))
      )
  })
}

export function run<F extends HKT.URIS, C>(
  M: Run<F, C>
): Run<HKT.PrependURI<R.ReaderURI, F>, V<C>>
export function run<F>(
  M: Run<HKT.UHKT2<F>>
): Run<HKT.PrependURI<R.ReaderURI, HKT.UHKT2<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    either: (fa) => pipe(fa, R.map(M.either))
  })
}

export function fail<F extends HKT.URIS, C>(
  M: Fail<F, C>
): Fail<HKT.PrependURI<R.ReaderURI, F>, V<C>>
export function fail<F>(
  M: Fail<HKT.UHKT2<F>>
): Fail<HKT.PrependURI<R.ReaderURI, HKT.UHKT2<F>>, HKT.V<"R", "-">> {
  return HKT.instance({
    fail: (e) => pipe(e, M.fail, R.succeed)
  })
}
