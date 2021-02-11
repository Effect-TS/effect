import { pipe } from "../Function"
import * as P from "../Prelude"

export const IxURI = "Ix"
export type IxURI = typeof IxURI

declare module "@effect-ts/hkt" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [IxURI]: TC extends IxC<infer _I, infer _O> ? Ix<_I, _O, A> : any
  }
}

export interface IxC<I, O> {
  Ix: {
    _I: I
    _O: O
  }
}

export type IxCT<C, I, O> = Omit<C, IxURI> & IxC<I, O>

export type Inner<F extends [IxURI, ...P.URIS]> = ((...x: F) => any) extends (
  x: infer H,
  ...r: infer Rest
) => any
  ? Rest extends P.URIS
    ? Rest
    : never
  : never

export interface Indexed<F extends [IxURI, ...P.URIS], C extends IxC<any, any>> {
  iof: <II extends C[IxURI]["_I"]>() => <
    A,
    N extends string = P.Initial<C, "N">,
    K = P.Initial<C, "K">,
    Q = P.Initial<C, "Q">,
    W = P.Initial<C, "W">,
    X = P.Initial<C, "X">,
    I = P.Initial<C, "I">,
    S = P.Initial<C, "S">,
    R = P.Initial<C, "R">,
    E = P.Initial<C, "E">
  >(
    a: A
  ) => P.Kind<F, IxCT<C, II, II>, N, K, Q, W, X, I, S, R, E, A>

  lift: <II extends C[IxURI]["_I"], IO extends C[IxURI]["_I"]>() => <
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
    fa: P.Kind<Inner<F>, C, N, K, Q, W, X, I, S, R, E, A>
  ) => P.Kind<F, IxCT<C, II, IO>, N, K, Q, W, X, I, S, R, E, A>

  lower: <II extends C[IxURI]["_I"], IO extends C[IxURI]["_I"]>() => <
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
    fa: P.Kind<F, IxCT<C, II, IO>, N, K, Q, W, X, I, S, R, E, A>
  ) => P.Kind<Inner<F>, C, N, K, Q, W, X, I, S, R, E, A>

  ichain<
    IO extends C[IxURI]["_O"],
    IO2 extends C[IxURI]["_I"],
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
    f: (a: A) => P.Kind<F, IxCT<C, IO, IO2>, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ): <N extends string, II extends C[IxURI]["_I"], K, Q, W, X, I, S, R, E>(
    fa: P.Kind<
      F,
      IxCT<C, II, IO>,
      P.Intro<C, "N", N2, N>,
      P.Intro<C, "K", K2, K>,
      P.Intro<C, "Q", Q2, Q>,
      P.Intro<C, "W", W2, W>,
      P.Intro<C, "X", X2, X>,
      P.Intro<C, "I", I2, I>,
      P.Intro<C, "S", S2, S>,
      P.Intro<C, "R", R2, R>,
      P.Intro<C, "E", E2, E>,
      A
    >
  ) => P.Kind<
    F,
    IxCT<C, II, IO2>,
    P.Mix<C, "N", [N2, N]>,
    P.Mix<C, "K", [K2, K]>,
    P.Mix<C, "Q", [Q2, Q]>,
    P.Mix<C, "W", [W2, W]>,
    P.Mix<C, "X", [X2, X]>,
    P.Mix<C, "I", [I2, I]>,
    P.Mix<C, "S", [S2, S]>,
    P.Mix<C, "R", [R2, R]>,
    P.Mix<C, "X", [E2, E]>,
    B
  >

  chain<
    IO extends C[IxURI]["_O"],
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
    f: (a: A) => P.Kind<F, IxCT<C, IO, IO>, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ): <N extends string, II extends C[IxURI]["_I"], K, Q, W, X, I, S, R, E>(
    fa: P.Kind<
      F,
      IxCT<C, II, IO>,
      P.Intro<C, "N", N2, N>,
      P.Intro<C, "K", K2, K>,
      P.Intro<C, "Q", Q2, Q>,
      P.Intro<C, "W", W2, W>,
      P.Intro<C, "X", X2, X>,
      P.Intro<C, "I", I2, I>,
      P.Intro<C, "S", S2, S>,
      P.Intro<C, "R", R2, R>,
      P.Intro<C, "E", E2, E>,
      A
    >
  ) => P.Kind<
    F,
    IxCT<C, II, IO>,
    P.Mix<C, "N", [N2, N]>,
    P.Mix<C, "K", [K2, K]>,
    P.Mix<C, "Q", [Q2, Q]>,
    P.Mix<C, "W", [W2, W]>,
    P.Mix<C, "X", [X2, X]>,
    P.Mix<C, "I", [I2, I]>,
    P.Mix<C, "S", [S2, S]>,
    P.Mix<C, "R", [R2, R]>,
    P.Mix<C, "X", [E2, E]>,
    B
  >

  chainLower<N2 extends string, K2, Q2, W2, X2, I2, S2, R2, E2, A, B>(
    f: (a: A) => P.Kind<Inner<F>, C, N2, K2, Q2, W2, X2, I2, S2, R2, E2, B>
  ): <
    N extends string,
    II extends C[IxURI]["_I"],
    IO extends C[IxURI]["_O"],
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: P.Kind<
      F,
      IxCT<C, II, IO>,
      P.Intro<C, "N", N2, N>,
      P.Intro<C, "K", K2, K>,
      P.Intro<C, "Q", Q2, Q>,
      P.Intro<C, "W", W2, W>,
      P.Intro<C, "X", X2, X>,
      P.Intro<C, "I", I2, I>,
      P.Intro<C, "S", S2, S>,
      P.Intro<C, "R", R2, R>,
      P.Intro<C, "E", E2, E>,
      A
    >
  ) => P.Kind<
    F,
    IxCT<C, II, IO>,
    P.Mix<C, "N", [N2, N]>,
    P.Mix<C, "K", [K2, K]>,
    P.Mix<C, "Q", [Q2, Q]>,
    P.Mix<C, "W", [W2, W]>,
    P.Mix<C, "X", [X2, X]>,
    P.Mix<C, "I", [I2, I]>,
    P.Mix<C, "S", [S2, S]>,
    P.Mix<C, "R", [R2, R]>,
    P.Mix<C, "X", [E2, E]>,
    B
  >
}

export class Ix<I, O, A> {
  readonly _I!: I
  readonly _O!: O
  constructor(readonly value: A) {}
}

export function makeIx<I, O>() {
  return <A>(a: A): Ix<I, O, A> => new Ix<I, O, A>(a)
}

export type IndexedT<F extends P.URIS, C, I, O> = Indexed<
  P.PrependURI<IxURI, F>,
  IxCT<C, I, O>
>

export function indexedF<_I, _O = _I>() {
  return <F extends P.URIS, C = P.Auto>(F: P.Monad<F, C>): IndexedT<F, C, _I, _O> =>
    indexed_<_I, _O, F, C>(F)
}

function indexed_<_I, _O, F extends P.URIS, C = P.Auto>(
  F: P.Monad<F, C>
): IndexedT<F, C, _I, _O>
function indexed_<_I, _O, F>(
  F: P.Monad<P.UHKT<F>, P.Auto>
): IndexedT<P.UHKT<F>, P.Auto, _I, _O> {
  return P.instance<IndexedT<P.UHKT<F>, P.Auto, _I, _O>>({
    iof: <II extends _I>() => <A>(a: A): Ix<II, II, P.HKT<F, A>> =>
      makeIx<II, II>()(P.succeedF(F)(a)),
    ichain: <IO extends _O, IO2 extends _I, A, B>(
      f: (a: A) => Ix<IO, IO2, P.HKT<F, B>>
    ) => <II extends _I>(fa: Ix<II, IO, P.HKT<F, A>>): Ix<II, IO2, P.HKT<F, B>> =>
      pipe(
        fa.value,
        P.chainF(F)((a) => f(a).value),
        makeIx<II, IO2>()
      ),
    lift: <II extends _I, IO extends _I>() => <A>(
      fa: P.HKT<F, A>
    ): Ix<II, IO, P.HKT<F, A>> => makeIx<II, IO>()(fa),
    lower: () => (fa) => fa.value,
    chain: <IO extends _O, A, B>(f: (a: A) => Ix<IO, IO, P.HKT<F, B>>) => <
      II extends _I
    >(
      fa: Ix<II, IO, P.HKT<F, A>>
    ): Ix<II, IO, P.HKT<F, B>> =>
      pipe(
        fa.value,
        P.chainF(F)((a) => f(a).value),
        makeIx<II, IO>()
      ),
    chainLower: <A, B>(f: (a: A) => P.HKT<F, B>) => <II extends _I, IO extends _O>(
      fa: Ix<II, IO, P.HKT<F, A>>
    ): Ix<II, IO, P.HKT<F, B>> => pipe(fa.value, P.chainF(F)(f), makeIx<II, IO>())
  })
}
