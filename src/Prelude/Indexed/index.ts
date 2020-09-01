import { pipe } from "../../Function"
import { chainF, succeedF } from "../DSL"
import * as HKT from "../HKT"
import type { Monad } from "../Monad"

export interface IxC<I, O> {
  Ix: {
    _I: I
    _O: O
  }
}

export type IxCT<C, I, O> = Omit<C, "Ix"> & IxC<I, O>

export type Inner<F extends ["Ix", ...HKT.URIS]> = ((...x: F) => any) extends (
  x: infer H,
  ...r: infer Rest
) => any
  ? Rest extends HKT.URIS
    ? Rest
    : never
  : never

export interface Indexed<F extends ["Ix", ...HKT.URIS], C extends IxC<any, any>> {
  iof: <II extends C["Ix"]["_I"]>() => <
    A,
    N extends string = HKT.Initial<C, "N">,
    K = HKT.Initial<C, "K">,
    Q = HKT.Initial<C, "Q">,
    W = HKT.Initial<C, "W">,
    X = HKT.Initial<C, "X">,
    I = HKT.Initial<C, "I">,
    S = HKT.Initial<C, "S">,
    R = HKT.Initial<C, "R">,
    E = HKT.Initial<C, "E">
  >(
    a: A
  ) => HKT.Kind<F, IxCT<C, II, II>, N, K, Q, W, X, I, S, R, E, A>

  lift: <II extends C["Ix"]["_I"], IO extends C["Ix"]["_I"]>() => <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >(
    fa: HKT.Kind<Inner<F>, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, IxCT<C, II, IO>, N, K, Q, W, X, I, S, R, E, A>

  lower: <II extends C["Ix"]["_I"], IO extends C["Ix"]["_I"]>() => <
    N extends string,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    A
  >(
    fa: HKT.Kind<F, IxCT<C, II, IO>, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<Inner<F>, C, N, K, Q, W, X, I, S, R, E, A>

  ichain<
    IO extends C["Ix"]["_O"],
    IO2 extends C["Ix"]["_I"],
    N2 extends string,
    K2,
    Q2,
    W2,
    X2,
    I2,
    S2,
    R2,
    E2,
    A,
    B
  >(
    f: (a: A) => HKT.Kind<F, IxCT<C, IO, IO2>, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ): <N extends string, II extends C["Ix"]["_I"], K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<
      F,
      IxCT<C, II, IO>,
      HKT.Intro<C, "N", N2, N>,
      HKT.Intro<C, "K", K2, K>,
      HKT.Intro<C, "Q", Q2, Q>,
      HKT.Intro<C, "W", W2, W>,
      HKT.Intro<C, "X", X2, X>,
      HKT.Intro<C, "I", I2, I>,
      HKT.Intro<C, "S", S2, S>,
      HKT.Intro<C, "R", R2, R>,
      HKT.Intro<C, "E", E2, E>,
      A
    >
  ) => HKT.Kind<
    F,
    IxCT<C, II, IO2>,
    HKT.Mix<C, "N", [N2, N]>,
    HKT.Mix<C, "K", [K2, K]>,
    HKT.Mix<C, "Q", [Q2, Q]>,
    HKT.Mix<C, "W", [W2, W]>,
    HKT.Mix<C, "X", [X2, X]>,
    HKT.Mix<C, "I", [I2, I]>,
    HKT.Mix<C, "S", [S2, S]>,
    HKT.Mix<C, "R", [R2, R]>,
    HKT.Mix<C, "X", [E2, E]>,
    B
  >
}

export interface Ix<I, O, A> {
  _I: I
  _O: O
  _A: A
}

export function makeIx<I, O>() {
  return <A>(a: A): Ix<I, O, A> => ({
    _A: a,
    _I: undefined as any,
    _O: undefined as any
  })
}

export type IndexedT<F extends HKT.URIS, C, I, O> = Indexed<
  HKT.PrependURI<"Ix", F>,
  IxCT<C, I, O>
>

export function indexedF<_I, _O = _I>() {
  return <F extends HKT.URIS, C = HKT.Auto>(F: Monad<F, C>): IndexedT<F, C, _I, _O> =>
    indexed_<_I, _O, F, C>(F)
}

function indexed_<_I, _O, F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): IndexedT<F, C, _I, _O>
function indexed_<_I, _O>(
  F: Monad<[HKT.UF_], HKT.Auto>
): IndexedT<[HKT.UF_], HKT.Auto, _I, _O> {
  return HKT.instance<IndexedT<[HKT.UF_], HKT.Auto, _I, _O>>({
    iof: <II extends _I>() => <A>(a: A): Ix<II, II, HKT.F_<A>> =>
      makeIx<II, II>()(succeedF(F)(a)),
    ichain: <IO extends _O, IO2 extends _I, A, B>(
      f: (a: A) => Ix<IO, IO2, HKT.F_<B>>
    ) => <II extends _I>(fa: Ix<II, IO, HKT.F_<A>>): Ix<II, IO2, HKT.F_<B>> =>
      pipe(
        fa._A,
        chainF(F)((a) => f(a)._A),
        makeIx<II, IO2>()
      ),
    lift: <II extends _I, IO extends _I>() => <A>(
      fa: HKT.F_<A>
    ): Ix<II, IO, HKT.F_<A>> => makeIx<II, IO>()(fa),
    lower: () => (fa) => fa._A
  })
}
