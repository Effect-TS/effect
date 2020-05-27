import * as T from "../Effect"
import * as F from "../Function"
import * as M from "../Managed"
import { pipe } from "../Pipe"

export type Patched<A, B> = B extends F.FunctionN<
  infer ARG,
  T.Effect<infer S, infer R, infer E, infer RET>
>
  ? F.FunctionN<ARG, T.Effect<S, R, E, RET>> extends B
    ? F.FunctionN<ARG, T.Effect<S, R & A, E, RET>>
    : "polymorphic signature not supported"
  : B extends T.Effect<infer S, infer R, infer E, infer RET>
  ? T.Effect<S, R, E, RET> extends B
    ? T.Effect<S, R & A, E, RET>
    : never
  : never

export type Derived<A extends ModuleShape<A>> = {
  [k in keyof A]: {
    [h in keyof A[k]]: Patched<A, A[k][h]>
  }
}

export function access<A extends ModuleShape<A>>(sp: ModuleSpec<A>): Derived<A> {
  const derived = {} as any
  const a = sp[specURI] as any

  for (const s of Reflect.ownKeys(a)) {
    derived[s] = {}

    for (const k of Object.keys(a[s])) {
      if (typeof a[s][k] === "function") {
        derived[s][k] = (...args: any[]) => T.accessM((r: any) => r[s][k](...args))
      } else {
        derived[s][k] = T.accessM((r: any) => r[s][k])
      }
    }
  }

  return derived
}

export type ModuleShape<M> = {
  [k in keyof M]: {
    [h in Exclude<keyof M[k], symbol>]:
      | F.FunctionN<any, T.Effect<any, any, any, any>>
      | T.Effect<any, any, any, any>
  } &
    {
      [h in Extract<keyof M[k], symbol>]: never
    }
}

export const specURI = "@matechs/effect/freeEnv/specURI"

export interface ModuleSpec<M> {
  [specURI]: ModuleShape<M>
}

export function define<T extends ModuleShape<T>>(m: T): ModuleSpec<T> {
  return { [specURI]: m }
}

export function cn<T extends T.Effect<any, any, any, any>>(): T {
  return {} as T
}

export function fn<T extends F.FunctionN<any, T.Effect<any, any, any, any>>>(): T {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return (() => {}) as any
}

export type Implementation<M> = {
  [k in keyof M]: {
    [h in keyof M[k]]: M[k][h] extends F.FunctionN<
      infer ARG,
      T.Effect<infer _S, infer _R, infer E, infer A>
    >
      ? unknown extends _S
        ? F.FunctionN<ARG, T.Effect<any, any, E, A>>
        : F.FunctionN<ARG, T.SyncRE<any, E, A>>
      : M[k][h] extends T.Effect<infer _S, infer _R, infer E, infer A>
      ? unknown extends _S
        ? T.Effect<any, any, E, A>
        : T.SyncRE<any, E, A>
      : never
  }
}

export type InferR<F> = F extends (...args: any[]) => T.Effect<any, infer Q, any, any>
  ? Q
  : F extends T.Effect<any, infer Q, any, any>
  ? Q
  : never

type EnvOf<F> = F extends F.FunctionN<
  infer _ARG,
  T.Effect<infer _S, infer R, infer _E, infer _A>
>
  ? R
  : F extends T.Effect<infer _S, infer R, infer _E, infer _A>
  ? R
  : never

type OnlyNew<M extends ModuleShape<M>, I extends Implementation<M>> = {
  [k in keyof I & keyof M]: {
    [h in keyof I[k] & keyof M[k] & string]: I[k][h] extends F.FunctionN<
      infer ARG,
      T.Effect<infer S, infer R & EnvOf<M[k][h]>, infer E, infer A>
    >
      ? F.FunctionN<ARG, T.Effect<S, R, E, A>>
      : I[k][h] extends T.Effect<infer S, infer R & EnvOf<M[k][h]>, infer E, infer A>
      ? T.Effect<S, R, E, A>
      : never
  }
}

export type ImplementationEnv<I> = UnionToIntersection<
  {
    [k in keyof I]: {
      [h in keyof I[k]]: I[k][h] extends F.FunctionN<any, infer K>
        ? K extends T.Effect<any, infer R, any, any>
          ? unknown extends R
            ? never
            : R
          : never
        : I[k][h] extends T.Effect<any, infer R, any, any>
        ? unknown extends R
          ? never
          : R
        : never
    }[keyof I[k]]
  }[keyof I]
>

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export function providing<
  M extends ModuleShape<M>,
  S extends ModuleSpec<M>,
  I extends Implementation<M>
>(s: S, a: I, env: ImplementationEnv<OnlyNew<M, I>>): TypeOf<S> {
  const r = {} as any

  for (const sym of Reflect.ownKeys((s as any)[specURI])) {
    r[sym] = {}

    for (const entry of Object.keys((s as any)[specURI][sym])) {
      if (typeof (a as any)[sym][entry] === "function") {
        r[sym][entry] = (...args: any[]) =>
          T.provide(env, "inverted")((a as any)[sym][entry](...args))
      } else if (typeof (a as any)[sym][entry] === "object") {
        r[sym][entry] = T.provide(env, "inverted")((a as any)[sym][entry])
      }
    }
  }

  return r
}

export function implement<S extends ModuleSpec<any>>(
  s: S,
  inverted: "regular" | "inverted" = "regular"
) {
  return <I extends Implementation<TypeOf<S>>>(
    i: I
  ): T.Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>>, TypeOf<S>, never> => (eff) =>
    T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
      pipe(eff, T.provide(providing(s, i, e), inverted))
    )
}

export function implementWith<SW, RW, EW, AW>(w: T.Effect<SW, RW, EW, AW>) {
  return <S extends ModuleSpec<any>>(
    s: S,
    inverted: "regular" | "inverted" = "regular"
  ) => <I extends Implementation<TypeOf<S>>>(
    i: (r: AW) => I
  ): T.Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>> & RW, TypeOf<S>, EW, SW> => (
    eff
  ) =>
    T.chain_(w, (r) =>
      T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
        pipe(eff, T.provide(providing(s, i(r), e), inverted))
      )
    )
}

export function implementWithManaged<SW, RW, EW, AW>(w: M.Managed<SW, RW, EW, AW>) {
  return <S extends ModuleSpec<any>>(
    s: S,
    inverted: "regular" | "inverted" = "regular"
  ) => <I extends Implementation<TypeOf<S>>>(
    i: (r: AW) => I
  ): T.Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>> & RW, TypeOf<S>, EW, SW> => (
    eff
  ) =>
    M.use(w, (r) =>
      T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
        pipe(eff, T.provide(providing(s, i(r), e), inverted))
      )
    )
}

export function instance<M extends ModuleShape<M>, S extends ModuleSpec<M>>(_: S) {
  return (m: TypeOf<S>) => m
}

export type MergeSpec<S> = {
  [k in keyof S]: ModuleSpec<any>
}

export type ExtractShape<M> = M extends ModuleShape<infer A> ? A : never
export type TypeOf<M> = M extends ModuleSpec<infer A> ? A : never

export const opaque = <A extends ModuleShape<A>>() => <
  B extends A,
  S extends ModuleSpec<B>
>(
  _: S
): ModuleSpec<A> => _
