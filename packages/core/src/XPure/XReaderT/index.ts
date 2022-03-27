// ets_tracing: off

import "../../Operator/index.js"

import { pipe } from "../../Function/index.js"
import * as DSL from "../../PreludeV2/DSL/index.js"
import type * as FX from "../../PreludeV2/FX/index.js"
import * as HKT from "../../PreludeV2/HKT/index.js"
import type * as P from "../../PreludeV2/index.js"
import type { XReaderF } from "../XReader/index.js"
import * as XR from "../XReader/index.js"

type XReaderTF<F extends P.HKT> = P.ComposeF<XReaderF, F>

const map =
  <F extends P.HKT>(M_: P.Covariant<F>): P.Covariant<XReaderTF<F>>["map"] =>
  <A, B>(
    f: (a: A) => B
  ): (<X, I, R, E>(
    fa: XR.XReader<R, P.Kind<F, X, I, R, E, A>>
  ) => XR.XReader<R, P.Kind<F, X, I, R, E, B>>) =>
    XR.map(M_.map(f))

export function Applicative<F extends P.HKT>(M_: P.Applicative<F>) {
  return HKT.instance<P.Applicative<XReaderTF<F>>>({
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

export function Monad<F extends P.HKT>(M_: P.Monad<F>) {
  return HKT.instance<P.Monad<XReaderTF<F>>>({
    any: () => XR.succeed(M_.any()),
    map: map(M_),
    flatten: <X, I, R, E, A, I2, R2, E2>(
      ffa: XR.XReader<
        R2,
        P.Kind<F, X, I2, R2, E2, XR.XReader<R, P.Kind<F, X, I, R, E, A>>>
      >
    ): XR.XReader<R & R2, P.Kind<F, X, I & I2, R & R2, E | E2, A>> =>
      pipe(
        XR.access((env: R & R2) => pipe(ffa, XR.runEnv(env), M_.map(XR.runEnv(env)))),
        XR.map(M_.flatten)
      )
  })
}

export function Access<F extends P.HKT>(M: P.Monad<F>) {
  return HKT.instance<FX.Access<XReaderTF<F>>>({
    access: (x) => pipe(x, XR.access, XR.map(DSL.succeedF(M)))
  })
}

export function Provide<F extends P.HKT>(_: P.Monad<F>) {
  return HKT.instance<FX.Provide<XReaderTF<F>>>({
    provide:
      <R>(r: R) =>
      <X, I, E, A>(fa: XR.XReader<R, HKT.Kind<F, X, I, R, E, A>>) => {
        return pipe(
          fa,
          XR.provideSome(() => r) // @todo: is that ok, if you somehow want a ReaderT<Reader>, this will break
        ) as XR.XReader<unknown, HKT.Kind<F, X, I, unknown, E, A>>
      }
  })
}

export function Run<F extends P.HKT>(M_: FX.Run<F>) {
  return HKT.instance<FX.Run<XReaderTF<F>>>({
    either: (x) => pipe(x, XR.map(M_.either))
  })
}

export function Fail<F extends P.HKT>(M_: FX.Fail<F>) {
  return HKT.instance<FX.Fail<XReaderTF<F>>>({
    fail: (x) => pipe(x, M_.fail, XR.succeed)
  })
}
