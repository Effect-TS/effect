// ets_tracing: off

import "../Operator/index.js"

import { identity, pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import * as DSL from "../PreludeV2/DSL/index.js"
import type { Access, Provide } from "../PreludeV2/FX/index.js"
import type { Applicative, Covariant } from "../PreludeV2/index.js"
import * as P from "../PreludeV2/index.js"

type OptionTF<F extends P.HKT> = P.ComposeF<F, O.OptionF>

export function monad<F extends P.HKT>(F_: P.Monad<F>) {
  return P.instance<P.Monad<OptionTF<F>>>({
    any: <X, I, R, E>() =>
      pipe(
        F_.any<X, I, R, E>(),
        F_.map((a) => O.some(a))
      ),
    map: (f) => F_.map(O.map(f)),
    flatten: <X, I, R, E, A, I2, R2, E2>(
      ffa: P.Kind<F, X, I2, R2, E2, O.Option<P.Kind<F, X, I, R, E, O.Option<A>>>>
    ) =>
      pipe(
        ffa,
        F_.map(
          O.fold(() => DSL.succeedF(F_)<O.Option<A>, X, I, R, E>(O.none), identity)
        ),
        F_.flatten
      )
  })
}

export function applicative<F extends P.HKT>(M: Applicative<F>) {
  const succeed = DSL.succeedF(M)
  return P.instance<P.Applicative<OptionTF<F>>>({
    any: () => succeed(O.some({})),
    map: (f) => M.map(O.map(f)),
    both: (fb) => (x) =>
      pipe(
        x,
        M.both(fb),
        M.map(({ tuple: [a, b] }) => O.zip_(a, b))
      )
  })
}

export function access<F extends P.HKT>(M: Access<F> & Covariant<F>) {
  return P.instance<Access<OptionTF<F>>>({
    access: (f) => pipe(M.access(f), M.map(O.some))
  })
}

export function provide<F extends P.HKT>(M: Provide<F>) {
  return P.instance<Provide<OptionTF<F>>>({
    provide: M.provide
  })
}
