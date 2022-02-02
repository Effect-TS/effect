// ets_tracing: off

import { pipe, tuple } from "../../Function/index.js"
import type { EnforceNonEmptyRecord } from "../../Utils/index.js"
import type { Apply } from "../Apply/index.js"
import type * as HKT from "../HKT/index.js"

export function apF<F extends HKT.URIS, C>(
  F: Apply<F, C>
): <K, Q, W, X, I, S, R, E, A>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => <K2, Q2, W2, X2, I2, S2, R2, E2, B>(
  fab: HKT.Kind<
    F,
    C,
    HKT.Intro<C, "K", K, K2>,
    HKT.Intro<C, "Q", Q, Q2>,
    HKT.Intro<C, "W", W, W2>,
    HKT.Intro<C, "X", X, X2>,
    HKT.Intro<C, "I", I, I2>,
    HKT.Intro<C, "S", S, S2>,
    HKT.Intro<C, "R", R, R2>,
    HKT.Intro<C, "E", E, E2>,
    (a: A) => B
  >
) => HKT.Kind<
  F,
  C,
  HKT.Mix<C, "K", [K, K2]>,
  HKT.Mix<C, "Q", [Q, Q2]>,
  HKT.Mix<C, "W", [W, W2]>,
  HKT.Mix<C, "X", [X, X2]>,
  HKT.Mix<C, "I", [I, I2]>,
  HKT.Mix<C, "S", [S, S2]>,
  HKT.Mix<C, "R", [R, R2]>,
  HKT.Mix<C, "E", [E, E2]>,
  B
>
export function apF<F>(
  F: Apply<HKT.UHKT<F>>
): <A>(fa: HKT.HKT<F, A>) => <B>(fab: HKT.HKT<F, (a: A) => B>) => HKT.HKT<F, B> {
  return (fa) => (fab) =>
    pipe(
      F.both(fab)(fa),
      F.map(({ tuple: [a, f] }) => f(a))
    )
}

function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const combined = acc.concat([x])
    // eslint-disable-next-line prefer-spread
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
  }
}

function getRecordConstructor(keys: ReadonlyArray<string>) {
  const len = keys.length
  return curried(
    (...args: ReadonlyArray<unknown>) => {
      const r: Record<string, unknown> = {}
      for (let i = 0; i < len; i++) {
        r[keys[i]!] = args[i]
      }
      return r
    },
    len - 1,
    []
  )
}

export function structF<F extends HKT.URIS, C = HKT.Auto>(
  F: Apply<F, C>
): <
  NER extends Record<
    string,
    HKT.Kind<
      F,
      C,
      HKT.Intro<C, "K", K, any>,
      HKT.Intro<C, "Q", Q, any>,
      HKT.Intro<C, "W", W, any>,
      HKT.Intro<C, "X", X, any>,
      HKT.Intro<C, "I", I, any>,
      HKT.Intro<C, "S", S, any>,
      HKT.Intro<C, "R", R, any>,
      HKT.Intro<C, "E", E, any>,
      unknown
    >
  >,
  K = HKT.Initial<C, "K">,
  Q = HKT.Initial<C, "Q">,
  W = HKT.Initial<C, "W">,
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>(
  r: EnforceNonEmptyRecord<NER> &
    Record<
      string,
      HKT.Kind<
        F,
        C,
        HKT.Intro<C, "K", K, any>,
        HKT.Intro<C, "Q", Q, any>,
        HKT.Intro<C, "W", W, any>,
        HKT.Intro<C, "X", X, any>,
        HKT.Intro<C, "I", I, any>,
        HKT.Intro<C, "S", S, any>,
        HKT.Intro<C, "R", R, any>,
        HKT.Intro<C, "E", E, any>,
        unknown
      >
    >
) => HKT.Kind<
  F,
  C,
  HKT.Infer<F, C, "K", NER[keyof NER]>,
  HKT.Infer<F, C, "Q", NER[keyof NER]>,
  HKT.Infer<F, C, "W", NER[keyof NER]>,
  HKT.Infer<F, C, "X", NER[keyof NER]>,
  HKT.Infer<F, C, "I", NER[keyof NER]>,
  HKT.Infer<F, C, "S", NER[keyof NER]>,
  HKT.Infer<F, C, "R", NER[keyof NER]>,
  HKT.Infer<F, C, "E", NER[keyof NER]>,
  {
    [K in keyof NER]: HKT.Infer<F, C, "A", NER[K]>
  }
>
export function structF<F>(
  F: Apply<HKT.UHKT<F>>
): (r: Record<string, HKT.HKT<F, any>>) => HKT.HKT<F, Record<string, any>> {
  const ap = apF(F)
  return (r) => {
    const keys = Object.keys(r)
    const len = keys.length
    const f = getRecordConstructor(keys)
    let fr = F.map(f)(r[keys[0]!]!)
    for (let i = 1; i < len; i++) {
      fr = ap(r[keys[i]!]!)(fr)
    }
    return fr
  }
}

const tupleConstructors: Record<number, (a: unknown) => unknown> = {}

function getTupleConstructor(len: number): (a: unknown) => any {
  // eslint-disable-next-line no-prototype-builtins
  if (!tupleConstructors.hasOwnProperty(len)) {
    tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return tupleConstructors[len]!
}

export function tupleF<F extends HKT.URIS, C>(
  F: Apply<F, C>
): <
  T extends Array<
    HKT.Kind<
      F,
      C,
      HKT.Intro<C, "K", K, any>,
      HKT.Intro<C, "Q", Q, any>,
      HKT.Intro<C, "W", W, any>,
      HKT.Intro<C, "X", X, any>,
      HKT.Intro<C, "I", I, any>,
      HKT.Intro<C, "S", S, any>,
      HKT.Intro<C, "R", R, any>,
      HKT.Intro<C, "E", E, any>,
      unknown
    >
  >,
  K = HKT.Initial<C, "K">,
  Q = HKT.Initial<C, "Q">,
  W = HKT.Initial<C, "W">,
  X = HKT.Initial<C, "X">,
  I = HKT.Initial<C, "I">,
  S = HKT.Initial<C, "S">,
  R = HKT.Initial<C, "R">,
  E = HKT.Initial<C, "E">
>(
  ...t: T & {
    readonly 0: HKT.Kind<
      F,
      C,
      HKT.Intro<C, "K", K, any>,
      HKT.Intro<C, "Q", Q, any>,
      HKT.Intro<C, "W", W, any>,
      HKT.Intro<C, "X", X, any>,
      HKT.Intro<C, "I", I, any>,
      HKT.Intro<C, "S", S, any>,
      HKT.Intro<C, "R", R, any>,
      HKT.Intro<C, "E", E, any>,
      unknown
    >
  }
) => HKT.Kind<
  F,
  C,
  HKT.Infer<F, C, "K", T[number]>,
  HKT.Infer<F, C, "Q", T[number]>,
  HKT.Infer<F, C, "W", T[number]>,
  HKT.Infer<F, C, "X", T[number]>,
  HKT.Infer<F, C, "I", T[number]>,
  HKT.Infer<F, C, "S", T[number]>,
  HKT.Infer<F, C, "R", T[number]>,
  HKT.Infer<F, C, "E", T[number]>,
  {
    [K in keyof T]: [T[K]] extends [
      HKT.Kind<F, C, any, any, any, any, any, any, any, any, infer A>
    ]
      ? A
      : never
  }
>
export function tupleF<F>(F: Apply<HKT.UHKT<F>>): any {
  const ap = apF(F)
  return <A>(...args: Array<HKT.HKT<F, A>>) => {
    const len = args.length
    const f = getTupleConstructor(len)
    let fas = F.map(f)(args[0]!)
    for (let i = 1; i < len; i++) {
      fas = ap(args[i]!)(fas)
    }
    return fas
  }
}
