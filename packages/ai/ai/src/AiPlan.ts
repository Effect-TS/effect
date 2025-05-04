/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type * as Schedule from "effect/Schedule"
import type * as Types from "effect/Types"
import type * as Unify from "effect/Unify"
import type * as AiModel from "./AiModel.js"
import * as Internal from "./internal/aiPlan.js"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId: unique symbol = Internal.TypeId

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export interface AiPlan<in Error, in out Provides, in out Requires> extends Pipeable, Builder<Provides, Requires> {
  readonly [TypeId]: TypeId
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: AiPlanUnify<this>
  readonly [Unify.ignoreSymbol]?: AiPlanUnifyIgnore
  readonly steps: NonEmptyReadonlyArray<Step<Error, Provides, Requires>>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface AiPlanUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  AiPlan?: () => Extract<A[Unify.typeSymbol], AiPlan<any, any, any>>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface AiPlanUnifyIgnore extends Effect.EffectUnifyIgnore {
  Effect?: true
}

/**
 * @since 1.0.0
 * @category Models
 */
export type Builder<Provides, Requires> = Effect.Effect<Provider<Provides>, never, Requires>

/**
 * @since 1.0.0
 * @category Models
 */
export interface Provider<Provides> {
  readonly use: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Provides>>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Step<Error, Provides, Requires> {
  readonly model: AiModel.AiModel<Provides, Requires>
  readonly check: Option.Option<(error: Error) => boolean | Effect.Effect<boolean>>
  readonly schedule: Option.Option<Schedule.Schedule<any, Error, Requires>>
}

/**
 * @since 1.0.0
 */
export declare namespace Make {
  /**
   * @since 1.0.0
   * @category Models
   */
  export type Base = {
    readonly model: AiModel.AiModel<any, any>
    readonly attempts?: number | undefined
    readonly while?: ((error: any) => boolean | Effect.Effect<boolean, never, any>) | undefined
    readonly schedule?: Schedule.Schedule<any, any, any> | undefined
  }

  /**
   * @since 1.0.0
   * @category Models
   */
  export type EW<Plan extends Base> = Plan extends { readonly while: (error: infer X) => any } ? X : never

  /**
   * @since 1.0.0
   * @category Models
   */
  export type ES<Plan extends Base> = Plan extends { readonly schedule: Schedule.Schedule<any, infer X, any> } ? X
    : never

  /**
   * @since 1.0.0
   * @category Models
   */
  export type Provides<Plan extends Base> = Plan extends { readonly model: AiModel.AiModel<infer X, any> } ? X : never

  /**
   * @since 1.0.0
   * @category Models
   */
  export type Requires<Plan extends Base> = Plan extends { readonly model: AiModel.AiModel<any, infer X> } ? X : never

  /**
   * @since 1.0.0
   * @category Models
   */
  export type RW<Plan extends Base> = Plan extends
    { readonly while: (error: any) => Effect.Effect<any, any, infer X> } ? X
    : never

  /**
   * @since 1.0.0
   * @category Models
   */
  export type RS<Plan extends Base> = Plan extends { readonly schedule: Schedule.Schedule<any, any, infer X> } ? X
    : never

  /**
   * @since 1.0.0
   * @category Models
   */
  export type MakePlan<Plan extends Base> = AiPlan<
    EW<Plan> & ES<Plan>,
    Provides<Plan>,
    RW<Plan> | RS<Plan> | Requires<Plan>
  > extends infer X ? X : never

  /**
   * @since 1.0.0
   * @category Models
   */
  export type MergePlan<Plans extends ReadonlyArray<Base>> = AiPlan<
    Types.UnionToIntersection<
      { [K in keyof Plans]: MakePlan<Plans[K]> extends AiPlan<infer X, any, any> ? X : never }[number]
    >,
    { [K in keyof Plans]: MakePlan<Plans[K]> extends AiPlan<any, infer X, any> ? X : never }[number],
    { [K in keyof Plans]: MakePlan<Plans[K]> extends AiPlan<any, any, infer X> ? X : never }[number]
  > extends infer K ? K : never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <Plans extends readonly [Make.Base, ...ReadonlyArray<Make.Base>]>(
  ...plans: Plans
) => Make.MergePlan<Plans> = (function() {
  let plan = Internal.make(arguments[0])
  for (let i = 1; i < arguments.length; i++) {
    plan = withFallback(plan, arguments[i])
  }
  return plan
}) as any

/**
 * @since 1.0.0
 * @category error handling
 */
export const withFallback: {
  <Provides, Provides2 extends Provides, Requires2, Out, EW, ES, RW = never, RS = never>(
    options: {
      readonly model: AiModel.AiModel<Provides2, Requires2>
      readonly attempts?: number | undefined
      readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
      readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
    }
  ): <E, Requires>(
    self: AiPlan<E, Provides, Requires>
  ) => AiPlan<E & EW & ES, Provides & Provides2, Requires | Requires2 | RW | RS>
  <E, Provides, Requires, Provides2 extends Provides, Requires2, Out, EW, ES, RW = never, RS = never>(
    self: AiPlan<E, Provides, Requires>,
    options: {
      readonly model: AiModel.AiModel<Provides2, Requires2>
      readonly attempts?: number | undefined
      readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
      readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
    }
  ): AiPlan<E & EW & ES, Provides & Provides2, Requires | Requires2 | RW | RS>
} = Internal.withFallback

/**
 * @since 1.0.0
 * @category combination
 */
export const concatSteps: {
  <Error2, Provides2, Requires2>(
    other: AiPlan<Error2, Provides2, Requires2>
  ): <Error, Provides, Requires>(
    self: AiPlan<Error, Provides, Requires>
  ) => AiPlan<Error & Error2, Provides & Provides2, Requires | Requires2>
  <Error, Provides, Requires, Error2, Provides2, Requires2>(
    self: AiPlan<Error, Provides, Requires>,
    other: AiPlan<Error2, Provides2, Requires2>
  ): AiPlan<Error & Error2, Provides & Provides2, Requires | Requires2>
} = Internal.concatSteps
