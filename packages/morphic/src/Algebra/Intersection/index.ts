import type { UnionToIntersection } from "@effect-ts/core/Utils"

import type { AnyEnv, ConfigsForType, InterpreterURIS, Kind, Named } from "../../HKT"
import type { OfType } from "../Core"

export const IntersectionURI = "IntersectionURI" as const
export type IntersectionURI = typeof IntersectionURI

export interface IntersectionConfig<
  L extends readonly unknown[],
  A extends readonly unknown[]
> {}

export interface AlgebraIntersections<F extends InterpreterURIS, Env extends AnyEnv> {
  _F: F
  intersection: <Types extends readonly OfType<F, any, any, Env>[]>(
    ...types: Types
  ) => (
    config?: Named<
      ConfigsForType<
        Env,
        UnionToIntersection<
          {
            [k in keyof Types]: [Types[k]] extends [OfType<F, infer LA, infer A, Env>]
              ? unknown extends LA
                ? never
                : LA
              : never
          }[number]
        >,
        UnionToIntersection<
          {
            [k in keyof Types]: [Types[k]] extends [OfType<F, infer LA, infer A, Env>]
              ? unknown extends A
                ? never
                : A
              : never
          }[number]
        >,
        IntersectionConfig<
          {
            [k in keyof Types]: [Types[k]] extends [OfType<F, infer LA, infer A, Env>]
              ? LA
              : never
          },
          {
            [k in keyof Types]: [Types[k]] extends [OfType<F, infer LA, infer A, Env>]
              ? A
              : never
          }
        >
      >
    >
  ) => Kind<
    F,
    Env,
    UnionToIntersection<
      {
        [k in keyof Types]: [Types[k]] extends [OfType<F, infer LA, infer A, Env>]
          ? unknown extends LA
            ? never
            : LA
          : never
      }[number]
    >,
    UnionToIntersection<
      {
        [k in keyof Types]: [Types[k]] extends [OfType<F, infer LA, infer A, Env>]
          ? unknown extends A
            ? never
            : A
          : never
      }[number]
    >
  >
}
