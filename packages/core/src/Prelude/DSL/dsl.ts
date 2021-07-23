// ets_tracing: off

import { constant, pipe, tuple } from "../../Function"
import type { Has, Tag } from "../../Has"
import type { EnforceNonEmptyRecord } from "../../Utils"
import type { Any } from "../Any"
import type { Apply } from "../Apply"
import type { AssociativeFlatten } from "../AssociativeFlatten"
import type { Covariant } from "../Covariant"
import type { Access, Provide } from "../FX"
import type * as HKT from "../HKT"
import type { Monad } from "../Monad"

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

export function succeedF<F extends HKT.URIS, C = HKT.Auto>(
  F: Any<F, C> & Covariant<F, C>
): <
  A,
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
) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
export function succeedF<F>(
  F: Any<HKT.UHKT<F>> & Covariant<HKT.UHKT<F>>
): <A>(a: A) => HKT.HKT<F, A> {
  return <A>(a: A) => F.map(constant(a))(F.any())
}

export function chainF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <K2, Q2, W2, X2, I2, S2, R2, E2, A, B>(
  f: (a: A) => HKT.Kind<F, C, K2, Q2, W2, X2, I2, S2, R2, E2, B>
) => <K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<
    F,
    C,
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
  C,
  HKT.Mix<C, "K", [K2, K]>,
  HKT.Mix<C, "Q", [Q2, Q]>,
  HKT.Mix<C, "W", [W2, W]>,
  HKT.Mix<C, "X", [X2, X]>,
  HKT.Mix<C, "I", [I2, I]>,
  HKT.Mix<C, "S", [S2, S]>,
  HKT.Mix<C, "R", [R2, R]>,
  HKT.Mix<C, "E", [E2, E]>,
  B
>
export function chainF<F>(F: Monad<HKT.UHKT<F>>) {
  return <A, B>(f: (a: A) => HKT.HKT<F, B>) =>
    (x: HKT.HKT<F, A>) =>
      pipe(x, F.map(f), F.flatten)
}

export function accessMF<F extends HKT.URIS, C = HKT.Auto>(
  F: Access<F, C> & AssociativeFlatten<F, C>
): <K, Q, W, X, I, S, R, R2, E, A>(
  f: (r: HKT.OrFix<"R", C, R2>) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R & R2, E, A>
export function accessMF<F>(
  F: Access<HKT.UHKT3<F>> & AssociativeFlatten<HKT.UHKT3<F>>
): <R, E, A>(f: (r: R) => HKT.HKT3<F, R, E, A>) => HKT.HKT3<F, R, E, A> {
  return (x) => pipe(x, F.access, F.flatten)
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

function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const combined = acc.concat([x])
    // eslint-disable-next-line prefer-spread
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
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

export function accessServiceMF<F extends HKT.URIS, C extends HKT.V<"R", "-">>(
  F: Monad<F, C> & Access<F, C>
): <Service>(
  H: Tag<Service>
) => <K, Q, W, X, I, S, R, E, A>(
  f: (_: Service) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
export function accessServiceMF<F>(
  F: Monad<HKT.UHKT3<F>, HKT.V<"R", "-">> & Access<HKT.UHKT3<F>, HKT.V<"R", "-">>
) {
  return <Service>(H: Tag<Service>) =>
    <R, E, A>(
      f: (_: Service) => HKT.HKT3<F, R, E, A>
    ): HKT.HKT3<F, Has<Service> & R, E, A> =>
      accessMF(F)((x: Has<Service>) => pipe(x, H.read, f))
}

export function provideServiceF<F extends HKT.URIS, C extends HKT.V<"R", "-">>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <Service>(
  H: Tag<Service>
) => (
  S: Service
) => <K, Q, W, X, I, S, R, E, A>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R & Has<Service>, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
export function provideServiceF<F>(
  F: Monad<HKT.UHKT3<F>, HKT.V<"R", "-">> &
    Access<HKT.UHKT3<F>, HKT.V<"R", "-">> &
    Provide<HKT.UHKT3<F>, HKT.V<"R", "-">>
) {
  return <Service>(H: Tag<Service>) =>
    <R, E, A>(S: Service) =>
    (fa: HKT.HKT3<F, Has<Service> & R, E, A>): HKT.HKT3<F, R, E, A> =>
      accessMF(F)((r: R) =>
        pipe(fa, F.provide({ ...r, [H.key]: S } as unknown as R & Has<Service>))
      )
}

export function provideSomeF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Access<F, C> & Provide<F, C>
): <R, R2>(
  f: (_: HKT.OrFix<"R", C, R2>) => HKT.OrFix<"R", C, R>
) => <K, Q, W, X, I, S, E, A>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, A>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R2, E, A>
export function provideSomeF<F>(
  F: Monad<HKT.UHKT3<F>> & Access<HKT.UHKT3<F>> & Provide<HKT.UHKT3<F>>
) {
  return <R0, R, E, A>(f: (r0: R0) => R) =>
    (fa: HKT.HKT3<F, R, E, A>): HKT.HKT3<F, R0, E, A> =>
      accessMF(F)((r0: R0) => pipe(fa, F.provide(f(r0))))
}

export function doF<F extends HKT.URIS, C = HKT.Auto>(
  F: Any<F, C> & Covariant<F, C>
): HKT.Kind<
  F,
  C,
  HKT.Initial<C, "K">,
  HKT.Initial<C, "Q">,
  HKT.Initial<C, "W">,
  HKT.Initial<C, "X">,
  HKT.Initial<C, "I">,
  HKT.Initial<C, "S">,
  HKT.Initial<C, "R">,
  HKT.Initial<C, "E">,
  {}
>
export function doF<F>(F: Any<HKT.UHKT<F>> & Covariant<HKT.UHKT<F>>): HKT.HKT<F, {}> {
  return succeedF(F)({})
}

export function bindF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <K2, Q2, W2, X2, I2, S2, R2, E2, BK, BN extends string, BA>(
  tag: Exclude<BN, keyof BK>,
  f: (a: BK) => HKT.Kind<F, C, K2, Q2, W2, X2, I2, S2, R2, E2, BA>
) => <K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<
    F,
    C,
    HKT.Intro<C, "K", K2, K>,
    HKT.Intro<C, "Q", Q2, Q>,
    HKT.Intro<C, "W", W2, W>,
    HKT.Intro<C, "X", X2, X>,
    HKT.Intro<C, "I", I2, I>,
    HKT.Intro<C, "S", S2, S>,
    HKT.Intro<C, "R", R2, R>,
    HKT.Intro<C, "E", E2, E>,
    BK
  >
) => HKT.Kind<
  F,
  C,
  HKT.Mix<C, "K", [K2, K]>,
  HKT.Mix<C, "Q", [Q2, Q]>,
  HKT.Mix<C, "W", [W2, W]>,
  HKT.Mix<C, "X", [X2, X]>,
  HKT.Mix<C, "I", [I2, I]>,
  HKT.Mix<C, "S", [S2, S]>,
  HKT.Mix<C, "R", [R2, R]>,
  HKT.Mix<C, "X", [E2, E]>,
  BK & { [k in BN]: BA }
>
export function bindF<F>(
  F: Monad<HKT.UHKT<F>>
): <A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => HKT.HKT<F, A>
) => (mk: HKT.HKT<F, K>) => HKT.HKT<F, K & { [k in N]: A }> {
  return <A, K, N extends string>(
      tag: Exclude<N, keyof K>,
      f: (_: K) => HKT.HKT<F, A>
    ) =>
    (mk: HKT.HKT<F, K>): HKT.HKT<F, K & { [k in N]: A }> =>
      pipe(
        mk,
        chainF(F)((k) =>
          pipe(
            f(k),
            F.map((a) =>
              Object.assign({}, k, { [tag]: a } as {
                [k in N]: A
              })
            )
          )
        )
      )
}

export function letF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C>
): <BK, BN extends string, BA>(
  tag: Exclude<BN, keyof BK>,
  f: (a: BK) => BA
) => <K, Q, W, X, I, S, R, E>(
  fa: HKT.Kind<F, C, K, Q, W, X, I, S, R, E, BK>
) => HKT.Kind<F, C, K, Q, W, X, I, S, R, E, BK & { [k in BN]: BA }>
export function letF<F>(
  F: Monad<HKT.UHKT<F>>
): <A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) => (mk: HKT.HKT<F, K>) => HKT.HKT<F, K & { [k in N]: A }> {
  return <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) =>
    (mk: HKT.HKT<F, K>): HKT.HKT<F, K & { [k in N]: A }> =>
      pipe(
        mk,
        F.map((k) =>
          Object.assign({}, k, { [tag]: f(k) } as {
            [k in N]: A
          })
        )
      )
}
