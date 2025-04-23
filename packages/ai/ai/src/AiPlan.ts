/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type * as Schedule from "effect/Schedule"
import type * as Unify from "effect/Unify"
import type * as AiModel from "./AiModel.js"
import type { AiModels } from "./AiModels.js"
import * as Internal from "./internal/aiPlan.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category AiPlan
 */
export interface AiPlan<in Error, in out Provides, in out Requires>
  extends Pipeable, AiPlan.Builder<Provides, Requires>
{
  readonly [TypeId]: TypeId
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: AiPlanUnify<this>
  readonly [Unify.ignoreSymbol]?: AiPlanUnifyIgnore
  readonly steps: NonEmptyReadonlyArray<AiPlan.Step<Error, Provides, Requires>>
}

/**
 * @since 1.0.0
 * @category Plan
 */
export interface AiPlanUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  AiPlan?: () => Extract<A[Unify.typeSymbol], AiPlan<any, any, any>>
}

/**
 * @since 1.0.0
 * @category Plan
 */
export interface AiPlanUnifyIgnore extends Effect.EffectUnifyIgnore {
  Effect?: true
}

/**
 * @since 1.0.0
 */
export declare namespace AiPlan {
  /**
   * @since 1.0.0
   * @category AiPlan
   */
  export type Builder<Provides, Requires> = Effect.Effect<Provider<Provides>, never, AiModels | Requires>

  /**
   * @since 1.0.0
   * @category AiPlan
   */
  export interface Provider<Provides> {
    readonly use: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Provides>>
  }

  /**
   * @since 1.0.0
   * @category AiPlan
   */
  export interface Step<Error, Provides, Requires> {
    readonly model: AiModel.AiModel<Provides, Requires>
    readonly check: Option.Option<(error: Error) => boolean | Effect.Effect<boolean>>
    readonly schedule: Option.Option<Schedule.Schedule<any, Error, Requires>>
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <Provides, Requires, EW, Out, ES, RW = never, RS = never>(
  options: {
    readonly model: AiModel.AiModel<Provides, Requires>
    readonly attempts?: number | undefined
    readonly while?: ((error: EW) => boolean | Effect.Effect<boolean, never, RW>) | undefined
    readonly schedule?: Schedule.Schedule<Out, ES, RS> | undefined
  }
) => AiPlan<EW & ES, Provides, RW | RS | Requires> = Internal.make

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
