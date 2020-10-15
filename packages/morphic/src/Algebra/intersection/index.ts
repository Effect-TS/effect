import type { UnionToIntersection } from "@effect-ts/core/Utils"

import type { AnyEnv, ConfigsForType, Named } from "../config"
import type { OfType, OfType2 } from "../utils/core"
import type { HKT2, Kind, Kind2, URIS, URIS2 } from "../utils/hkt"

export const IntersectionURI = "IntersectionURI" as const

export type IntersectionURI = typeof IntersectionURI

declare module "../utils/hkt" {
  export interface Algebra<F, Env> {
    [IntersectionURI]: AlgebraIntersection<F, Env>
  }
  export interface Algebra1<F extends URIS, Env extends AnyEnv> {
    [IntersectionURI]: AlgebraIntersection1<F, Env>
  }
  export interface Algebra2<F extends URIS2, Env extends AnyEnv> {
    [IntersectionURI]: AlgebraIntersection2<F, Env>
  }
}

export interface IntersectionConfig<L extends unknown[], A extends unknown[]> {}

export interface AlgebraIntersection<F, Env> {
  _F: F
  intersection: {
    <AS extends HKT2<F, Env, any, any>[]>(
      types: AS,
      config?: Named<
        ConfigsForType<
          Env,
          UnionToIntersection<
            {
              [k in keyof AS]: [AS[k]] extends [{ _E: infer E }]
                ? unknown extends E
                  ? never
                  : E
                : never
            }[number]
          >,
          UnionToIntersection<
            {
              [k in keyof AS]: [AS[k]] extends [{ _A: infer A }]
                ? unknown extends A
                  ? never
                  : A
                : never
            }[number]
          >,
          IntersectionConfig<
            {
              [k in keyof AS]: [AS[k]] extends [{ _E: infer E }]
                ? unknown extends E
                  ? never
                  : E
                : never
            },
            {
              [k in keyof AS]: [AS[k]] extends [{ _A: infer A }]
                ? unknown extends A
                  ? never
                  : A
                : never
            }
          >
        >
      >
    ): HKT2<
      F,
      Env,
      UnionToIntersection<
        {
          [k in keyof AS]: [AS[k]] extends [{ _E: infer E }]
            ? unknown extends E
              ? never
              : E
            : never
        }[number]
      >,
      UnionToIntersection<
        {
          [k in keyof AS]: [AS[k]] extends [{ _A: infer A }]
            ? unknown extends A
              ? never
              : A
            : never
        }[number]
      >
    >
    <L, A, Env>(
      types: Array<HKT2<F, Env, L, A>>,
      config?: Named<ConfigsForType<Env, L, A, IntersectionConfig<L[], A[]>>>
    ): HKT2<F, Env, L, A>
  }
}

export interface AlgebraIntersection1<F extends URIS, Env extends AnyEnv> {
  _F: F
  intersection: {
    <A, B>(
      types: [OfType<F, A, Env>, OfType<F, B, Env>],
      config?: Named<
        ConfigsForType<
          Env,
          unknown,
          A & B,
          IntersectionConfig<[unknown, unknown], [A, B]>
        >
      >
    ): Kind<F, Env, A & B>
    <A, B, C, Env>(
      types: [OfType<F, A, Env>, OfType<F, B, Env>, OfType<F, C, Env>],
      config?: Named<
        ConfigsForType<
          Env,
          unknown,
          A & B & C,
          IntersectionConfig<[unknown, unknown, unknown], [A, B, C]>
        >
      >
    ): Kind<F, Env, A & B & C>
    <A, B, C, D>(
      types: [
        OfType<F, A, Env>,
        OfType<F, B, Env>,
        OfType<F, C, Env>,
        OfType<F, D, Env>
      ],
      config?: Named<
        ConfigsForType<
          Env,
          unknown,
          A & B & C & D,
          IntersectionConfig<[unknown, unknown, unknown, unknown], [A, B, C, D]>
        >
      >
    ): Kind<F, Env, A & B & C & D>
    <A, B, C, D, E, Env>(
      types: [
        OfType<F, A, Env>,
        OfType<F, B, Env>,
        OfType<F, C, Env>,
        OfType<F, D, Env>,
        OfType<F, E, Env>
      ],
      config?: Named<
        ConfigsForType<
          Env,
          unknown,
          A & B & C & D & E,
          IntersectionConfig<
            [unknown, unknown, unknown, unknown, unknown],
            [A, B, C, D, E]
          >
        >
      >
    ): Kind<F, Env, A & B & C & D & E>
    <A, Env>(
      types: Array<OfType<F, A, Env>>,
      config?: Named<
        ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      >
    ): Kind<F, Env, A>
  }
}

export interface AlgebraIntersection2<F extends URIS2, Env extends AnyEnv> {
  _F: F
  intersection: {
    <A, B, LA, LB>(
      types: [OfType2<F, LA, A, Env>, OfType2<F, LB, B, Env>],
      config?: Named<
        ConfigsForType<Env, LA & LB, A & B, IntersectionConfig<[LA, LB], [A, B]>>
      >
    ): Kind2<F, Env, LA & LB, A & B>
    <A, B, C, LA, LB, LC, Env>(
      types: [OfType2<F, LA, A, Env>, OfType2<F, LB, B, Env>, OfType2<F, LC, C, Env>],
      config?: Named<
        ConfigsForType<
          Env,
          LA & LB & LC,
          A & B & C,
          IntersectionConfig<[LA, LB, LC], [A, B, C]>
        >
      >
    ): Kind2<F, Env, LA & LB & LC, A & B & C>
    <A, B, C, D, LA, LB, LC, LD>(
      types: [
        OfType2<F, LA, A, Env>,
        OfType2<F, LB, B, Env>,
        OfType2<F, LC, C, Env>,
        OfType2<F, LD, D, Env>
      ],
      config?: Named<
        ConfigsForType<
          Env,
          LA & LB & LC & LD,
          A & B & C & D,
          IntersectionConfig<[LA, LB, LC, LD], [A, B, C, D]>
        >
      >
    ): Kind2<F, Env, LA & LB & LC & LD, A & B & C & D>
    <A, B, C, D, E, LA, LB, LC, LD, LE, Env>(
      types: [
        OfType2<F, LA, A, Env>,
        OfType2<F, LB, B, Env>,
        OfType2<F, LC, C, Env>,
        OfType2<F, LD, D, Env>,
        OfType2<F, LE, E, Env>
      ],
      config?: Named<
        ConfigsForType<
          Env,
          LA & LB & LC & LD & LE,
          A & B & C & D & E,
          IntersectionConfig<[LA, LB, LC, LD, LE], [A, B, C, D, E]>
        >
      >
    ): Kind2<F, Env, LA & LB & LC & LD & LE, A & B & C & D & E>
    <L, A, Env>(
      types: Array<OfType2<F, L, A, Env>>,
      config?: Named<ConfigsForType<Env, L, A, IntersectionConfig<L[], A[]>>>
    ): Kind2<F, Env, L, A>
  }
}
