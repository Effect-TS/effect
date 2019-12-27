import * as T from "./effect";
import { FunctionN } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";

export type Patched<A, B> = B extends FunctionN<
  infer ARG,
  T.Effect<infer R, infer E, infer RET>
>
  ? FunctionN<ARG, T.Effect<R & A, E, RET>>
  : B extends T.Effect<infer R, infer E, infer RET>
  ? T.Effect<R & A, E, RET>
  : never;

export type Derived<A, S extends keyof A> = A extends { [k in S]: infer B }
  ? { [h in keyof B]: Patched<A, B[h]> }
  : never;

export function access<A extends ModuleShape<A>>(
  as: ModuleSpec<A>
): Derived<A, keyof A> {
  const derived = {} as Derived<A, keyof A>;
  const a = as.spec;

  for (const s of Reflect.ownKeys(a)) {
    for (const k of Object.keys(a[s])) {
      if (typeof a[s][k] === "function") {
        derived[k] = (...args: any[]) => T.accessM((r: A) => r[s][k](...args));
      } else {
        derived[k] = T.accessM((r: A) => r[s][k]);
      }
    }
  }

  return derived;
}

export function accessReal<A extends ModuleShape<A>>(
  a: A
): Derived<A, keyof A> {
  return access({ spec: a });
}

export type ModuleShape<M> = {
  [k in keyof M]: {
    [h in Exclude<keyof M[k], symbol>]:
      | FunctionN<any, T.Effect<any, any, any>>
      | T.Effect<any, any, any>;
  } &
    {
      [h in Extract<keyof M[k], symbol>]: never;
    };
};

export interface ModuleSpec<M> {
  spec: {
    [k in keyof M]: {
      [h in Exclude<keyof M[k], symbol>]:
        | FunctionN<any, T.Effect<any, any, any>>
        | T.Effect<any, any, any>;
    } &
      {
        [h in Extract<keyof M[k], symbol>]: never;
      };
  };
}

export type TypeOf<Q> = Q extends ModuleSpec<infer M> ? M : never;

export function define<T extends ModuleShape<T>>(m: T): ModuleSpec<T> {
  return { spec: m };
}

export function cn<T extends T.Effect<any, any, any>>(): T {
  return {} as T;
}

export function fn<T extends FunctionN<any, T.Effect<any, any, any>>>(): T {
  // tslint:disable-next-line: no-empty
  return (() => {}) as any;
}

export type Provider<Environment, Module> = <R, E, A>(
  e: T.Effect<Module & R, E, A>
) => T.Effect<Environment & R, E, A>;

export type Implementation<M> = {
  [k in keyof M]: {
    [h in keyof M[k]]: M[k][h] extends FunctionN<
      infer ARG,
      T.Effect<infer _R, infer E, infer A>
    >
      ? FunctionN<ARG, T.Effect<any, E, A>>
      : M[k][h] extends T.Effect<infer _R, infer E, infer A>
      ? T.Effect<any, E, A>
      : never;
  };
};

export type InferR<F> = F extends (
  ...args: any[]
) => T.Effect<infer Q, any, any>
  ? Q
  : F extends T.Effect<infer Q, any, any>
  ? Q
  : never;

export type ImplementationEnv<M> = UnionToIntersection<
  M extends {
    [k in keyof M]: {
      [h: string]: infer X;
    };
  }
    ? InferR<X>
    : never
>;

export type UnionToIntersection<U> = (U extends any
? (k: U) => void
: never) extends (k: infer I) => void
  ? I
  : never;

export type ProviderOf<M, I extends Implementation<M>> = Provider<
  ImplementationEnv<I>,
  M
>;

export function providing<
  M,
  S extends ModuleSpec<M>,
  I extends Implementation<M>
>(_: S, a: I, env: ImplementationEnv<I>): TypeOf<S> {
  const r = {} as any;

  for (const sym of Reflect.ownKeys(a)) {
    r[sym] = {};

    for (const entry of Object.keys(a[sym])) {
      if (typeof a[sym][entry] === "function") {
        r[sym][entry] = (...args: any[]) =>
          T.provideS(env)(a[sym][entry](...args));
      } else if (typeof a[sym][entry] === "object") {
        r[sym][entry] = T.provideS(env)(a[sym][entry]);
      }
    }
  }

  return r;
}

export function implement<S extends ModuleSpec<any>>(s: S) {
  return <I extends Implementation<TypeOf<S>>>(
    i: I
  ): ProviderOf<TypeOf<S>, I> => eff =>
    T.accessM((e: ImplementationEnv<I>) =>
      pipe(eff, T.provideS<TypeOf<S>>(providing(s, i, e)))
    );
}
