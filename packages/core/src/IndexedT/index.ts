// ets_tracing: off

import "../Operator/index.js"

import { pipe } from "../Function/index.js"
import * as P from "../PreludeV2/index.js"

export interface IxTF<F extends P.HKT, I, O = I> extends P.HKT {
  readonly type: P.Kind<
    IxF<I, O>,
    this["R"],
    this["E"],
    P.Kind<F, this["R"], this["E"], this["A"]>
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

export interface IndexedT<F extends P.HKT, I, O> {
  iof: <II extends I>() => <A, R = unknown, E = never>(
    a: A
  ) => P.Kind<IxTF<F, II, II>, R, E, A>

  lift: <II extends I, IO extends I>() => <R, E, A>(
    fa: P.Kind<F, R, E, A>
  ) => P.Kind<IxTF<F, II, IO>, R, E, A>

  lower: <II extends I, IO extends I>() => <R, E, A>(
    fa: P.Kind<IxTF<F, II, IO>, R, E, A>
  ) => P.Kind<F, R, E, A>

  ichain<IO extends O, IO2 extends I, R2, E2, A, B>(
    f: (a: A) => P.Kind<IxTF<F, IO, IO2>, R2, E2, B>
  ): <II extends I, I, R, E>(
    fa: P.Kind<IxTF<F, II, IO>, R, E, A>
  ) => P.Kind<IxTF<F, II, IO2>, R & R2, E | E2, B>

  chain<IO extends O, R2, E2, A, B>(
    f: (a: A) => P.Kind<IxTF<F, IO, IO>, R2, E2, B>
  ): <II extends I, I, R, E>(
    fa: P.Kind<IxTF<F, II, IO>, R, E, A>
  ) => P.Kind<IxTF<F, II, IO>, R2 & R, E2 | E, B>

  chainLower<S2, R2, E2, A, B>(
    f: (a: A) => P.Kind<F, R2, E2, B>
  ): <II extends I, IO extends O, I, R, E>(
    fa: P.Kind<IxTF<F, II, IO>, R, E, A>
  ) => P.Kind<IxTF<F, II, IO>, R2 & R, E2 | E, B>
}

export function makeIx<I, O>() {
  return <A>(a: A): Ix<I, O, A> => new Ix<I, O, A>(a)
}

export function indexedF<I, O = I>() {
  return <F extends P.HKT>(F_: P.Monad<F>): IndexedT<F, I, O> => indexed_<I, O, F>(F_)
}

function indexed_<I, O, F extends P.HKT>(F_: P.Monad<F>): IndexedT<F, I, O> {
  return P.instance<IndexedT<F, I, O>>({
    iof:
      <II extends I>() =>
      <A, R = unknown, E = never>(a: A) =>
        makeIx<II, II>()(P.succeedF(F_)<A, R, E>(a)),
    ichain: (f) => (fa) =>
      pipe(
        fa.value,
        P.chainF(F_)((a) => f(a).value),
        makeIx()
      ),
    lift:
      <II extends I, IO extends I>() =>
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
