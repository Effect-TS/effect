// ets_tracing: off

import "../Operator/index.js"

import { pipe } from "../Function/index.js"
import * as P from "../PreludeV2/index.js"

export interface IxTF<F extends P.HKT, I, O = I> extends P.HKT {
  readonly type: P.Kind<
    IxF<I, O>,
    this["X"],
    this["I"],
    this["R"],
    this["E"],
    P.Kind<F, this["X"], this["I"], this["R"], this["E"], this["A"]>
  >
}

export interface IxF<I, O = I> extends P.HKT {
  readonly type: Ix<I, O, this["A"]>
}

export class Ix<I, O, A> {
  readonly _I!: I
  readonly _O!: O
  constructor(readonly value: A) {}
}

export interface IndexedT<F extends P.HKT, _I, _O> {
  iof: <II extends _I>() => <A, X = any, I = unknown, R = unknown, E = never>(
    a: A
  ) => P.Kind<IxTF<F, II, II>, X, I, R, E, A>

  lift: <II extends _I, IO extends _I>() => <X, I, R, E, A>(
    fa: P.Kind<F, X, I, R, E, A>
  ) => P.Kind<IxTF<F, II, IO>, X, I, R, E, A>

  lower: <II extends _I, IO extends _I>() => <X, I, R, E, A>(
    fa: P.Kind<IxTF<F, II, IO>, X, I, R, E, A>
  ) => P.Kind<F, X, I, R, E, A>

  ichain<IO extends _O, IO2 extends _I, X, I2, R2, E2, A, B>(
    f: (a: A) => P.Kind<IxTF<F, IO, IO2>, X, I2, R2, E2, B>
  ): <II extends _I, I, R, E>(
    fa: P.Kind<IxTF<F, II, IO>, X, I, R, E, A>
  ) => P.Kind<IxTF<F, II, IO2>, X, I & I2, R & R2, E | E2, B>

  chain<IO extends _O, X, I2, R2, E2, A, B>(
    f: (a: A) => P.Kind<IxTF<F, IO, IO>, X, I2, R2, E2, B>
  ): <II extends _I, I, R, E>(
    fa: P.Kind<IxTF<F, II, IO>, X, I, R, E, A>
  ) => P.Kind<IxTF<F, II, IO>, X, I2 & I, R2 & R, E2 | E, B>

  chainLower<X, I2, S2, R2, E2, A, B>(
    f: (a: A) => P.Kind<F, X, I2, R2, E2, B>
  ): <II extends _I, IO extends _O, I, R, E>(
    fa: P.Kind<IxTF<F, II, IO>, X, I, R, E, A>
  ) => P.Kind<IxTF<F, II, IO>, X, I2 & I, R2 & R, E2 | E, B>
}

export function makeIx<I, O>() {
  return <A>(a: A): Ix<I, O, A> => new Ix<I, O, A>(a)
}

export function indexedF<_I, _O = _I>() {
  return <F extends P.HKT>(F_: P.Monad<F>): IndexedT<F, _I, _O> =>
    indexed_<_I, _O, F>(F_)
}

function indexed_<_I, _O, F extends P.HKT>(F_: P.Monad<F>): IndexedT<F, _I, _O> {
  return P.instance<IndexedT<F, _I, _O>>({
    iof:
      <II extends _I>() =>
      <A, X = any, I = unknown, R = unknown, E = never>(a: A) =>
        makeIx<II, II>()(P.succeedF(F_)<A, X, I, R, E>(a)),
    ichain: (f) => (fa) =>
      pipe(
        fa.value,
        P.chainF(F_)((a) => f(a).value),
        makeIx()
      ),
    lift:
      <II extends _I, IO extends _I>() =>
      (fa) =>
        makeIx<II, IO>()(fa),
    lower: () => (fa) => fa.value,
    chain: (f) => (fa) =>
      pipe(
        fa.value,
        P.chainF(F_)((a) => f(a).value),
        makeIx()
      ),
    chainLower: (f) => (fa) => pipe(fa.value, P.chainF(F_)(f), makeIx())
  })
}
