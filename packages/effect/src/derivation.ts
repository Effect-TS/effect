import * as E from "./";
import { FunctionN } from "fp-ts/lib/function";
import { IO } from "fp-ts/lib/IO";

export type Module = Record<string, any>;

export type PatchedEffect<T, M> = T extends FunctionN<
  infer Q,
  E.Effect<infer A, infer B, infer C>
>
  ? FunctionN<Q, E.Effect<A & M, B, C>>
  : never;

export type PublicOf<M> = {
  [k in keyof M]: {
    [h in keyof FunctionProperties<M[k]>]: PatchedEffect<M[k][h], M>;
  };
};

export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends FunctionN<any, E.Effect<any, any, any>>
    ? K
    : never;
}[keyof T];

export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

export function derivePublicHelpers<M extends Module>(module: M): PublicOf<M> {
  const r = {} as any;

  Object.keys(module).forEach(k => {
    r[k] = {};

    Object.keys(module[k]).forEach(fk => {
      if (typeof module[k][fk] === "function") {
        r[k][fk] = (...args) => E.accessM((m: M) => m[k][fk](...args));
      }
    });
  });

  return r;
}
