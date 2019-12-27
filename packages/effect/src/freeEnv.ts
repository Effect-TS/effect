import * as T from "./effect";
import { FunctionN } from "fp-ts/lib/function";

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

type WidenR<F, R> = F extends T.Effect<infer A, infer B, infer C>
  ? T.Effect<A & R, B, C>
  : F extends FunctionN<infer ARG, T.Effect<infer A, infer B, infer C>>
  ? FunctionN<ARG, T.Effect<A & R, B, C>>
  : never;

type With<M extends ModuleShape<M>, R> = {
  [k in keyof M]: {
    [h in keyof M[k]]: WidenR<M[k][h], R>;
  };
};

function providing<X extends ModuleShape<X>, Environment>(
  a: With<X, Environment>,
  env: Environment
): X {
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

export function implement<S extends ModuleSpec<any>>(_: S) {
  return <Environment>(
    f: (e: Environment) => With<TypeOf<S>, Environment>
  ): Provider<Environment, TypeOf<S>> => <R, E, A>(
    eff: T.Effect<TypeOf<S> & R, E, A>
  ) =>
    T.accessM((e: Environment) =>
      T.provideR((r: Environment & R) => ({ ...r, ...providing(f(e), e) }))(eff)
    );
}
