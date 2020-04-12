import { function as F, pipeable as P } from "fp-ts";
import { A, Any, AnyAsync, AnySync } from "./definitions";
import { RT } from "./manipulations";
import * as T from "./prelude";
import { Provider } from "./providing";

export type ModuleShape<M> = {
  [k in keyof M]: {
    [h in Extract<keyof M[k], string>]: F.FunctionN<any, Any> | Any;
  } &
    {
      [h in Exclude<keyof M[k], string>]: never;
    };
};

export type Patched<A, B> = B extends F.FunctionN<infer ARG, AnySync<infer R, infer E, infer RET>>
  ? F.FunctionN<ARG, AnySync<R, E, RET>> extends B
    ? F.FunctionN<ARG, RT<AnySync<R & A, E, RET>>>
    : "polymorphic signature not supported"
  : B extends F.FunctionN<infer ARG, AnyAsync<infer R, infer E, infer RET>>
  ? F.FunctionN<ARG, AnyAsync<R, E, RET>> extends B
    ? F.FunctionN<ARG, RT<AnyAsync<R & A, E, RET>>>
    : "polymorphic signature not supported"
  : B extends Any<infer R, infer E, infer RET>
  ? Any<R, E, RET> extends B
    ? RT<Any<R & A, E, RET>>
    : never
  : never;

export type Derived<A extends ModuleShape<A>> = {
  [k in keyof A]: {
    [h in keyof A[k]]: Patched<A, A[k][h]>;
  };
};

export const specURI = "@matechs/effect/freeEnv/specURI";

export interface ModuleSpec<M> {
  [specURI]: ModuleShape<M>;
}

export type TypeOf<M> = M extends ModuleSpec<infer A> ? A : never;

export type Cn<T extends Any> = T;

export type Fn<T extends F.FunctionN<any, Any>> = T;

export function cn<T extends Any>(): Cn<T> {
  return {} as any;
}

export function fn<T extends F.FunctionN<any, Any>>(): Fn<T> {
  return (
    (() => {
      //
    }) as any
  );
}

export function define<T extends ModuleShape<T>>(m: T): ModuleSpec<T> {
  return { [specURI]: m };
}
export const opaque = <A extends ModuleShape<A>>() => <B extends A, S extends ModuleSpec<B>>(
  _: S
): ModuleSpec<A> => _;

export function access<A extends ModuleShape<A>>(sp: ModuleSpec<A>): Derived<A> {
  const derived: any = {};
  const a: any = sp[specURI];

  for (const s of Reflect.ownKeys(a)) {
    derived[s] = {} as Record<any, any>;

    for (const k of Object.keys(a[s])) {
      if (typeof a[s][k] === "function") {
        derived[s][k] = (...args: any[]) => T.accessM((r: any) => r[s][k](...args));
      } else {
        derived[s][k] = T.accessM((r: any) => r[s][k]);
      }
    }
  }

  return derived;
}

export type Implementation<M> = {
  [k in keyof M]: {
    [h in keyof M[k]]: M[k][h] extends F.FunctionN<infer ARG, AnySync<infer _R, infer E, infer A>>
      ? F.FunctionN<ARG, AnySync<any, E, A>>
      : M[k][h] extends F.FunctionN<infer ARG, Any<infer _R, infer E, infer A>>
      ? F.FunctionN<ARG, Any<any, E, A>>
      : M[k][h] extends Any<infer _R, infer E, infer A>
      ? AnySync<any, E, A>
      : M[k][h] extends Any<infer _R, infer E, infer A>
      ? Any<any, E, A>
      : never;
  };
};

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type EnvOf<F> = F extends F.FunctionN<infer _ARG, Any<infer _R, infer _E, infer _A>>
  ? _R
  : F extends Any<infer _R, infer _E, infer _A>
  ? _R
  : never;

export type OnlyNew<M extends ModuleShape<M>, I extends Implementation<M>> = {
  [k in keyof I & keyof M]: {
    [h in keyof I[k] & keyof M[k]]: I[k][h] extends F.FunctionN<
      infer ARG,
      Any<infer R & EnvOf<M[k][h]>, infer E, infer A>
    >
      ? F.FunctionN<ARG, Any<R, E, A>>
      : I[k][h] extends Any<infer R & EnvOf<M[k][h]>, infer E, infer A>
      ? Any<R, E, A>
      : never;
  };
};

export type ImplementationEnv<I> = UnionToIntersection<
  {
    [k in keyof I]: {
      [h in keyof I[k]]: I[k][h] extends Any
        ? unknown extends Parameters<I[k][h]["_R"]>[0]
          ? never
          : Parameters<I[k][h]["_R"]>[0]
        : I[k][h] extends (...args: any[]) => Any<infer R, any, any>
        ? unknown extends R
          ? never
          : R
        : never;
    }[keyof I[k]];
  }[keyof I]
>;

export type ProviderOf<
  M extends ModuleShape<any>,
  I extends Implementation<M>,
  RW = unknown,
  EW = never
> = Provider<ImplementationEnv<OnlyNew<M, I>> & RW, M, never, EW>;

export function providing<
  M extends ModuleShape<M>,
  S extends ModuleSpec<M>,
  I extends Implementation<M>
>(s: S, a: I, env: ImplementationEnv<OnlyNew<M, I>>): TypeOf<S> {
  const r = {} as any;

  for (const sym of Reflect.ownKeys((s as any)[specURI])) {
    r[sym] = {} as any;

    for (const entry of Object.keys((s as any)[specURI][sym])) {
      if (typeof (a as any)[sym][entry] === "function") {
        r[sym][entry] = (...args: any[]) => T.provideSO(env)((a as any)[sym][entry](...args));
      } else if (typeof (a as any)[sym][entry] === "object") {
        r[sym][entry] = T.provideSO(env)((a as any)[sym][entry]);
      }
    }
  }

  return r;
}

export function implement<S extends ModuleSpec<any>>(s: S) {
  return <I extends Implementation<TypeOf<S>>>(
    i: I
  ): Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>>, TypeOf<S>, never, never> => (eff) =>
    T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
      P.pipe(eff, T.provideS(providing(s, i, e)))
    ) as any;
}

export function implementWith<K extends Any>(w: K) {
  return <SP extends ModuleSpec<any>>(s: SP) => <I extends Implementation<TypeOf<SP>>>(
    i: (r: A<K>) => I
  ): Provider<
    ImplementationEnv<OnlyNew<TypeOf<SP>, I>>,
    TypeOf<SP>,
    ReturnType<K["_S"]>,
    ReturnType<K["_E"]>
  > => (eff) =>
    P.pipe(
      w,
      T.chain((r) =>
        T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<SP>, I>>) =>
          P.pipe(eff, T.provideS(providing(s, i(r), e)))
        )
      )
    ) as any;
}
