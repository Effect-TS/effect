import * as E from "../Either"
import { flow, pipe } from "../Function"
import * as P from "../Prelude"

export type V<C> = P.CleanParam<C, "E"> & P.V<"E", "+">

export function monad<F extends P.URIS, C>(
  M: P.Monad<F, C>
): P.Monad<P.AppendURI<F, E.EitherURI>, V<C>>
export function monad<F>(M: P.Monad<P.UHKT<F>>) {
  const succeed = P.succeedF(M)
  return P.instance<P.Monad<P.AppendURI<P.UHKT<F>, E.EitherURI>, P.V<"E", "+">>>({
    any: () => P.succeedF(M)(E.right({})),
    flatten: <E, A, E2>(
      ffa: P.HKT<F, E.Either<E2, P.HKT<F, E.Either<E, A>>>>
    ): P.HKT<F, E.Either<E | E2, A>> =>
      pipe(
        ffa,
        M.map((e) => (e._tag === "Left" ? succeed<E.Either<E | E2, A>>(e) : e.right)),
        M.flatten
      ),
    map: (f) => M.map(E.map(f))
  })
}

export function applicative<F extends P.URIS, C>(
  M: P.Applicative<F, C>
): P.Applicative<P.AppendURI<F, E.EitherURI>, V<C>>
export function applicative<F>(M: P.Applicative<P.UHKT<F>>) {
  return P.instance<P.Applicative<P.AppendURI<P.UHKT<F>, E.EitherURI>, P.V<"E", "+">>>({
    any: () => P.succeedF(M)(E.right({})),
    map: (f) => M.map(E.map(f)),
    both: (fb) =>
      flow(
        M.both(fb),
        M.map(([ea, eb]) => E.AssociativeBoth.both(eb)(ea))
      )
  })
}

export function run<F extends P.URIS, C>(
  M: P.Covariant<F, C>
): P.FX.Run<P.AppendURI<F, E.EitherURI>, V<C>>
export function run<F>(M: P.Covariant<P.UHKT<F>>) {
  return P.instance<P.FX.Run<P.AppendURI<P.UHKT<F>, E.EitherURI>, P.V<"E", "+">>>({
    either: <
      <E, A>(fa: P.HKT<F, E.Either<E, A>>) => P.HKT<F, E.Either<never, E.Either<E, A>>>
    >M.map(E.Run.either)
  })
}

export function fail<F extends P.URIS, C>(
  M: P.Any<F, C> & P.Covariant<F, C>
): P.FX.Fail<P.AppendURI<F, E.EitherURI>, V<C>>
export function fail<F>(M: P.Any<P.UHKT<F>> & P.Covariant<P.UHKT<F>>) {
  const succeed = P.succeedF(M)
  return P.instance<P.FX.Fail<P.AppendURI<P.UHKT<F>, E.EitherURI>, P.V<"E", "+">>>({
    fail: flow(E.left, succeed)
  })
}
