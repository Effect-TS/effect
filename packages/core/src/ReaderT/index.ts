import { pipe } from "../Function"
import type { Applicative, AssociativeEither, Monad } from "../Prelude"
import * as P from "../Prelude"
import * as R from "../Reader"

export type V<C> = P.CleanParam<C, "R"> & P.V<"R", "-">

export function monad<F extends P.URIS, C>(
  M: Monad<F, C>
): Monad<P.PrependURI<R.ReaderURI, F>, V<C>>
export function monad<F>(M: Monad<P.UHKT<F>>) {
  return P.instance<Monad<P.PrependURI<R.ReaderURI, P.UHKT<F>>, P.V<"R", "-">>>({
    any: () => M.any,
    flatten: (ffa) => (r) =>
      pipe(
        ffa(r),
        M.map((f) => f(r)),
        M.flatten
      ),
    map: (f) => (fa) => (r) => M.map(f)(fa(r))
  })
}

export function access<F extends P.URIS, C>(
  M: Monad<F, C>
): P.FX.Access<P.PrependURI<R.ReaderURI, F>, V<C>>
export function access<F>(M: Monad<P.UHKT<F>>) {
  return P.instance<P.FX.Access<P.PrependURI<R.ReaderURI, P.UHKT<F>>, P.V<"R", "-">>>({
    access: (f) => pipe(R.access(f), R.map(P.succeedF(M)))
  })
}

export function associativeEither<F extends P.URIS, C>(
  M: AssociativeEither<F, C>
): AssociativeEither<P.PrependURI<R.ReaderURI, F>, V<C>>
export function associativeEither<F>(M: AssociativeEither<P.UHKT<F>>) {
  return P.instance<
    AssociativeEither<P.PrependURI<R.ReaderURI, P.UHKT<F>>, P.V<"R", "-">>
  >({
    orElseEither: (fb) => (fa) => (r) => M.orElseEither(() => fb()(r))(fa(r))
  })
}

export function provide<F extends P.URIS, C>(
  M: Monad<F, C>
): P.FX.Provide<P.PrependURI<R.ReaderURI, F>, V<C>>
export function provide<F>(M: Monad<P.UHKT<F>>) {
  return P.instance<P.FX.Provide<P.PrependURI<R.ReaderURI, P.UHKT<F>>, P.V<"R", "-">>>({
    provide: (r) => R.provideSome(() => r)
  })
}

export function applicative<F extends P.URIS, C>(
  M: Applicative<F, C>
): Applicative<P.PrependURI<R.ReaderURI, F>, V<C>>
export function applicative<F>(M: Applicative<P.UHKT<F>>) {
  return P.instance<Applicative<P.PrependURI<R.ReaderURI, P.UHKT<F>>, P.V<"R", "-">>>({
    any: () => R.succeed(M.any()),
    map: (f) => R.map(M.map(f)),
    both: (fb) => (fa) =>
      pipe(
        fa,
        R.zip(fb),
        R.map(([_a, _b]) => M.both(_b)(_a))
      )
  })
}

export function run<F extends P.URIS, C>(
  M: P.FX.Run<F, C>
): P.FX.Run<P.PrependURI<R.ReaderURI, F>, V<C>>
export function run<F>(
  M: P.FX.Run<P.UHKT2<F>>
): P.FX.Run<P.PrependURI<R.ReaderURI, P.UHKT2<F>>, P.V<"R", "-">> {
  return P.instance({
    either: (fa) => pipe(fa, R.map(M.either))
  })
}

export function fail<F extends P.URIS, C>(
  M: P.FX.Fail<F, C>
): P.FX.Fail<P.PrependURI<R.ReaderURI, F>, V<C>>
export function fail<F>(
  M: P.FX.Fail<P.UHKT2<F>>
): P.FX.Fail<P.PrependURI<R.ReaderURI, P.UHKT2<F>>, P.V<"R", "-">> {
  return P.instance({
    fail: (e) => pipe(e, M.fail, R.succeed)
  })
}
