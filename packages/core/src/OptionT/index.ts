// ets_tracing: off

import "../Operator/index.js"

import { identity, pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import * as DSL from "../Prelude/DSL/index.js"
import type { Access, Provide } from "../Prelude/FX/index.js"
import type { Applicative, Covariant } from "../Prelude/index.js"
import * as P from "../Prelude/index.js"

type OptionTF<F extends P.HKT> = P.ComposeF<F, O.OptionF>

export function monad<F extends P.HKT>(F_: P.Monad<F>) {
  return P.instance<P.Monad<OptionTF<F>>>({
    any: <R, E>() =>
      pipe(
        F_.any<R, E>(),
        F_.map((a) => O.some(a))
      ),
    map: (f) => F_.map(O.map(f)),
    flatten: (ffa) =>
      pipe(
        ffa,
        F_.map(
          O.fold(
            () =>
              pipe(
                F_.any(),
                F_.map(() => O.none)
              ),
            identity
          )
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
