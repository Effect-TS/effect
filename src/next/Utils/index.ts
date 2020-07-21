import { MaURIS, Kind4 } from "../../Base"
import { _S, _R, _E, _A, _U } from "../Effect/effect"

export type SOf<T> = [T] extends [{ [_S]: () => infer S }] ? S : never
export type ROf<T> = [T] extends [{ [_R]: (_: infer R) => void }] ? R : unknown
export type EOf<T> = [T] extends [{ [_E]: () => infer E }] ? E : never
export type AOf<T> = [T] extends [{ [_A]: () => infer A }] ? A : never
export type KOf<T> = [T] extends [{ [_U]: infer URI }]
  ? URI extends MaURIS
    ? Kind4<URI, SOf<T>, ROf<T>, EOf<T>, AOf<T>>
    : T
  : T

export type Erase<R, K> = R & K extends K & infer R1 ? R1 : R

export const pattern: <N extends string>(
  n: N
) => <
  X extends { [k in N]: string },
  K extends { [k in X[N]]: (_: Extract<X, { _tag: k }>) => any }
>(
  _: K
) => (m: X) => ReturnType<K[keyof K]> = (n) => (_) => (m) => {
  return _[m[n]](m as any)
}

export const patternDef: <N extends string>(
  n: N
) => <X extends { [k in N]: string }, T extends X[N], A, B>(
  t: T,
  f: (_: Extract<X, { _tag: T }>) => A,
  d: (_: Exclude<X, { _tag: T }>) => B
) => (m: X) => A | B = (n) => (t, f, d) => (m) => {
  return m[n] === t ? f(m as any) : d(m as any)
}

export const matchTag =
  /*#__PURE__*/
  pattern("_tag")

export const matchTagDef =
  /*#__PURE__*/
  patternDef("_tag")
