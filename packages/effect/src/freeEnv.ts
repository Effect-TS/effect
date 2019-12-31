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

export type Derived<A extends ModuleShape<A>> = {
  [k in keyof A]: {
    [h in keyof A[k]]: Patched<A, A[k][h]>;
  };
};

export function access<A extends ModuleShape<A>>(
  sp: ModuleSpec<A>
): Derived<A> {
  const derived = {} as Derived<A>;
  const a: ModuleShape<A> = sp[specURI];

  for (const s of Reflect.ownKeys(a)) {
    derived[s] = {};

    for (const k of Object.keys(a[s])) {
      if (typeof a[s][k] === "function") {
        derived[s][k] = (...args: any[]) =>
          T.accessM((r: A) => r[s][k](...args));
      } else {
        derived[s][k] = T.accessM((r: A) => r[s][k]);
      }
    }
  }

  return derived;
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

export const specURI: unique symbol = Symbol();

export interface ModuleSpec<M> {
  [specURI]: ModuleShape<M>;
}

export type TypeOf<Q> = Q extends ModuleSpec<infer M> ? M : never;

export function define<T extends ModuleShape<T>>(m: T): ModuleSpec<T> {
  return { [specURI]: m };
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

type EnvOf<F> = F extends FunctionN<
  infer _ARG,
  T.Effect<infer R, infer _E, infer _A>
>
  ? R
  : F extends T.Effect<infer R, infer E, infer A>
  ? R
  : never;

type OnlyNew<M extends ModuleShape<any>, I extends Implementation<M>> = {
  [k in keyof I]: {
    [h in keyof I[k]]: I[k][h] extends FunctionN<
      infer ARG,
      T.Effect<infer R & EnvOf<M[k][h]>, infer E, infer A>
    >
      ? FunctionN<ARG, T.Effect<R, E, A>>
      : I[k][h] extends T.Effect<infer R & EnvOf<M[k][h]>, infer E, infer A>
      ? T.Effect<R, E, A>
      : never;
  };
};

export type ImplementationEnv<I> = UnionToIntersection<
  I extends {
    [k in keyof I]: {
      [h in keyof I[k]]: infer X;
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

export type ProviderOf<
  M extends ModuleShape<any>,
  I extends Implementation<M>
> = Provider<ImplementationEnv<OnlyNew<M, I>>, M>;

export function providing<
  M extends ModuleShape<M>,
  S extends ModuleSpec<M>,
  I extends Implementation<M>
>(s: S, a: I, env: ImplementationEnv<OnlyNew<M, I>>): TypeOf<S> {
  const r = {} as TypeOf<S>;

  for (const sym of Reflect.ownKeys(s[specURI])) {
    r[sym] = {};

    for (const entry of Object.keys(s[specURI][sym])) {
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
    T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
      pipe(eff, T.provideS(providing(s, i, e)))
    );
}

export function instance<S extends ModuleSpec<any>>(_: S) {
  return (m: TypeOf<S>) => m;
}

export type MergeSpec<S> = {
  [k in keyof S]: ModuleSpec<any>;
};

export type ExtractShape<M> = M extends ModuleShape<infer A> ? A : never;

export type Merged<S> = S extends {
  [k in keyof S]: {
    [specURI]: infer X;
  };
}
  ? ModuleSpec<UnionToIntersection<ExtractShape<X>>>
  : never;

export function merge<S extends MergeSpec<S>>(s: S): Merged<S> {
  const m = {
    [specURI]: {}
  } as Merged<S>;

  for (const k of Reflect.ownKeys(s)) {
    m[specURI] = {
      ...m[specURI],
      ...s[k][specURI]
    };
  }

  return m;
}