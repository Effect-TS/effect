// ets_tracing: off

import "../../Operator/index.js"

import { pipe } from "../../Function/index.js"
import * as DSL from "../../PreludeV2/DSL/index.js"
import type * as FX from "../../PreludeV2/FX/index.js"
import * as HKT from "../../PreludeV2/HKT/index.js"
import type * as P from "../../PreludeV2/index.js"
import type { XReader } from "../XReader/index.js"
import * as XR from "../XReader/index.js"

interface XReaderT<F extends P.HKT> extends P.HKT {
  readonly type: XReader<
    this["R"],
    P.Kind<F, this["X"], this["I"], unknown, this["E"], this["A"]>
  >
}

const map =
  <F extends P.HKT>(M_: P.Covariant<F>): P.Covariant<XReaderT<F>>["map"] =>
  <A, B>(
    f: (a: A) => B
  ): (<X, I, R, E>(
    fa: P.Kind<XReaderT<F>, X, I, R, E, A>
  ) => P.Kind<XReaderT<F>, X, I, R, E, B>) =>
    XR.map(M_.map(f))

export function applicative<F extends P.HKT>(M_: P.Applicative<F>) {
  return HKT.instance<P.Applicative<XReaderT<F>>>({
    any: () => XR.succeed(M_.any()),
    map: map(M_),
    both: (fb) => (x) =>
      pipe(
        x,
        XR.zip(fb),
        XR.map(({ tuple: [_a, _b] }) => pipe(_a, M_.both(_b)))
      )
  })
}

export function monad<F extends P.HKT>(M_: P.Monad<F>) {
  return HKT.instance<P.Monad<XReaderT<F>>>({
    any: () => XR.succeed(M_.any()),
    map: map(M_),
    flatten: <X, I, R, E, A, I2, R2, E2>(
      ffa: P.Kind<XReaderT<F>, X, I2, R2, E2, P.Kind<XReaderT<F>, X, I, R, E, A>>
    ) =>
      pipe(
        XR.access((env: R & R2) => pipe(ffa, XR.runEnv(env), M_.map(XR.runEnv(env)))),
        XR.map(M_.flatten)
      )
  })
}

export function access<F extends P.HKT>(M: P.Monad<F>) {
  return HKT.instance<FX.Access<XReaderT<F>>>({
    access: (x) => pipe(x, XR.access, XR.map(DSL.succeedF(M)))
  })
}

export function provide<F extends P.HKT>(_: P.Monad<F>) {
  return HKT.instance<FX.Provide<XReaderT<F>>>({
    provide: (r) => (fa) =>
      pipe(
        fa,
        XR.provideSome(() => r)
      )
  })
}

export function run<F extends P.HKT>(M_: FX.Run<F>) {
  return HKT.instance<FX.Run<XReaderT<F>>>({
    either: (x) => pipe(x, XR.map(M_.either))
  })
}

export function fail<F extends P.HKT>(M_: FX.Fail<F>) {
  return HKT.instance<FX.Fail<XReaderT<F>>>({
    fail: (x) => pipe(x, M_.fail, XR.succeed)
  })
}
