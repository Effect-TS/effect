import type { Option } from "@effect-ts/core/Option"

import type {
  AnyEnv,
  ConfigsForType,
  HKT,
  InterpreterURIS,
  Kind,
  Named
} from "../../HKT"

export const UnionURI = "UnionURI" as const
export type UnionURI = typeof UnionURI

export type UnionValues<O> = {
  [o in keyof O]: O[o]
}

export interface UnionConfig<Types> {}

export type UnionTypes<F extends InterpreterURIS, E, A, R> = {
  [o in keyof A & keyof E]: Kind<F, R, E[o], A[o]>
}

export interface AlgebraUnion<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  union<Types extends readonly [Kind<F, Env, any, any>, ...Kind<F, Env, any, any>[]]>(
    ...types: Types
  ): (
    guards: {
      [k in keyof Types]: (
        _: {
          [h in keyof Types]: [Types[h]] extends [Kind<F, Env, infer E, infer A>]
            ? A
            : never
        }[keyof Types & number]
      ) => Option<Types[k] extends HKT<any, any, any> ? Types[k]["_A"] : never>
    },
    config?: Named<
      ConfigsForType<
        Env,
        {
          [h in keyof Types]: [Types[h]] extends [Kind<F, Env, infer E, infer A>]
            ? E
            : never
        }[keyof Types & number],
        {
          [h in keyof Types]: [Types[h]] extends [Kind<F, Env, infer E, infer A>]
            ? A
            : never
        }[keyof Types & number],
        UnionConfig<Types>
      >
    >
  ) => Kind<
    F,
    Env,
    {
      [h in keyof Types]: [Types[h]] extends [Kind<F, Env, infer E, infer A>]
        ? E
        : never
    }[keyof Types & number],
    {
      [h in keyof Types]: [Types[h]] extends [Kind<F, Env, infer E, infer A>]
        ? A
        : never
    }[keyof Types & number]
  >
}
