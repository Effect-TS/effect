/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import type * as AiPlan from "./AiPlan.js"
import * as InternalAiPlan from "./internal/aiPlan.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiModel")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const PlanTypeId: unique symbol = Symbol.for("@effect/ai/Plan")

/**
 * @since 1.0.0
 * @category type ids
 */
export type PlanTypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface AiModel<in out Provides, in out Requires> extends AiPlan.AiPlan<unknown, Provides, Requires> {
  readonly [TypeId]: TypeId
  readonly model: string
  readonly cacheKey: symbol
  readonly requires: Context.Tag<Requires, any>
  readonly provides: AiModel.ContextBuilder<Provides, Requires>
  readonly updateContext: (context: Context.Context<Provides>) => Context.Context<Provides>
}

/**
 * @since 1.0.0
 */
export declare namespace AiModel {
  /**
   * @since 1.0.0
   * @category AiModel
   */
  export type ContextBuilder<Provides, Requires> = Effect.Effect<
    Context.Context<Provides>,
    never,
    Requires | Scope.Scope
  >
}

const AiModelProto = {
  ...InternalAiPlan.PlanPrototype,
  [TypeId]: TypeId
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Provides, Requires>(options: {
  readonly model: string
  readonly cacheKey: symbol
  readonly requires: Context.Tag<Requires, any>
  readonly provides: AiPlan.AiPlan.Builder<Provides, Requires>
  readonly updateContext: (context: Context.Context<Provides>) => Context.Context<Provides>
}): AiModel<Provides, Requires> => {
  const self = Object.create(AiModelProto)
  self.cacheKey = options.cacheKey
  self.model = options.model
  self.provides = options.provides
  self.requires = options.requires
  self.updateContext = options.updateContext
  self.steps = [{
    model: self,
    check: Option.none(),
    schedule: Option.none()
  }]
  return self
}
