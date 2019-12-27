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

export function derive<A extends Generic<A>>(as: Spec<A>): Derived<A, keyof A> {
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

export function deriveC<A extends Generic<A>>(a: A): Derived<A, keyof A> {
  return derive({ spec: a });
}

export type Generic<M> = {
  [k in keyof M]: {
    [h in Exclude<keyof M[k], symbol>]:
      | FunctionN<any, T.Effect<any, any, any>>
      | T.Effect<any, any, any>;
  } &
    {
      [h in Extract<keyof M[k], symbol>]: never;
    };
};

export interface Spec<M> {
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

export type TypeOf<Q> = Q extends Spec<infer M> ? M : never;

export function generic<T extends Generic<T>>(m: T): Spec<T> {
  return { spec: m };
}

export function cn<T extends T.Effect<any, any, any>>(): T {
  return {} as T;
}

export function fn<T extends FunctionN<any, T.Effect<any, any, any>>>(): T {
  // tslint:disable-next-line: no-empty
  return (() => {}) as any;
}

export type Interpreter<Module, Environment> = <R, E, A>(
  e: T.Effect<Module & R, E, A>
) => T.Effect<Environment & R, E, A>;

export function interpreter<S extends Spec<any>>(_: S) {
  return <Environment>(
    f: (e: Environment) => TypeOf<S>
  ): Interpreter<TypeOf<S>, Environment> => <R, E, A>(
    eff: T.Effect<TypeOf<S> & R, E, A>
  ) =>
    T.accessM((e: Environment) =>
      T.provideR((r: Environment & R) => ({ ...r, ...f(e) }))(eff)
    );
}
