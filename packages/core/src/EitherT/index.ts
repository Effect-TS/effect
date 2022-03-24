// ets_tracing: off

import "../Operator/index.js"

import type { EitherF } from "../Either/index.js"
import * as EI from "../Either/index.js"
import { flow, identity, pipe } from "../Function/index.js"
import type * as FX from "../PreludeV2/FX/index.js"
import * as P from "../PreludeV2/index.js"

type EitherTF<F extends P.HKT> = P.ComposeF<F, EitherF>

export function monad<F extends P.HKT>(M_: P.Monad<F>) {
  const succeed = P.succeedF(M_, M_)
  return P.instance<P.Monad<EitherTF<F>>>({
    any: () => succeed(EI.right({})),
    flatten: <X, I, R, E, A, I2, R2, E2>(
      ffa: P.Kind<
        F,
        X,
        I2,
        R2,
        E2,
        EI.Either<E2, P.Kind<F, X, I, R, E, EI.Either<E, A>>>
      >
    ) =>
      pipe(
        ffa,
        M_.map(
          EI.fold(
            (e) => succeed<EI.Either<E | E2, A>, X, I, R, E>(EI.left(e)),
            identity
          )
        ),
        M_.flatten
      ),
    map: (f) => M_.map(EI.map(f))
  })
}

export function applicative<F extends P.HKT>(F_: P.Monad<F>) {
  return P.getApplicativeF(monad(F_))
}

export function run<F extends P.HKT>(M_: P.Covariant<F>) {
  return P.instance<FX.Run<EitherTF<F>>>({
    either: <
      <A, X, I, R, E>(
        fa: P.Kind<F, X, I, R, E, EI.Either<E, A>>
      ) => P.Kind<F, X, I, R, never, EI.Either<never, EI.Either<E, A>>>
    >M_.map(EI.Run.either)
  })
}

export function fail<F extends P.HKT>(M_: P.Any<F> & P.Covariant<F>) {
  const succeed = P.succeedF(M_, M_)
  return P.instance<FX.Fail<EitherTF<F>>>({
    fail: flow(EI.left, succeed)
  })
}

export function access<F extends P.HKT>(M_: FX.Access<F> & P.Covariant<F>) {
  return P.instance<FX.Access<EitherTF<F>>>({
    access: flow(M_.access, M_.map(EI.right))
  })
}

export function provide<F extends P.HKT>(M_: FX.Provide<F>) {
  return P.instance<FX.Provide<EitherTF<F>>>({
    provide: M_.provide
  })
}
