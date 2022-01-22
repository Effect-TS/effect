// ets_tracing: off

import "../Operator/index.js"

import type { EitherF } from "../Either/index.js"
import * as EI from "../Either/index.js"
import { flow, identity, pipe } from "../Function/index.js"
import { succeedF } from "../PreludeV2/DSL/index.js"
import type * as FX from "../PreludeV2/FX/index.js"
import * as P from "../PreludeV2/index.js"

type EitherTF<F extends P.HKT> = P.ComposeF<F, EitherF>

export function monad<F extends P.HKT>(M_: P.Monad<F>) {
  const succeed = succeedF(M_)
  return P.instance<P.Monad<EitherTF<F>>>({
    any: () => succeed(EI.right({})),
    map: (f) => M_.map(EI.map(f)),
    flatten: <R, E, A, R2, E2>(
      ffa: P.Kind<F, R2, E2, EI.Either<E2, P.Kind<F, R, E, EI.Either<E, A>>>>
    ) =>
      pipe(
        ffa,
        M_.map(
          EI.fold((e) => succeed<EI.Either<E | E2, A>, R, E>(EI.left(e)), identity)
        ),
        M_.flatten
      )
  })
}

export function applicative<F extends P.HKT>(M: P.Applicative<F>) {
  return P.instance<P.Applicative<EitherTF<F>>>({
    any: () => succeedF(M)(EI.right({})),
    map: (f) => M.map(EI.map(f)),
    both: (fb) => (x) =>
      pipe(
        x,
        M.both(fb),
        M.map(({ tuple: [ea, eb] }) => EI.AssociativeBoth.both(eb)(ea))
      )
  })
}

export function run<F extends P.HKT>(M_: P.Covariant<F>) {
  return P.instance<FX.Run<EitherTF<F>>>({
    either: <
      <A, R, E>(
        fa: P.Kind<F, R, E, EI.Either<E, A>>
      ) => P.Kind<F, R, never, EI.Either<never, EI.Either<E, A>>>
    >M_.map(EI.Run.either)
  })
}

export function fail<F extends P.HKT>(M_: P.Any<F> & P.Covariant<F>) {
  const succeed = succeedF(M_)
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
