/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as GlobalValue from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
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
  readonly buildContext: ContextBuilder<Provides, Requires>
}

/**
 * @since 1.0.0
 * @category AiModel
 */
export type ContextBuilder<Provides, Requires> = Effect.Effect<
  Context.Context<Provides>,
  never,
  Requires | Scope.Scope
>

const AiModelProto = {
  ...InternalAiPlan.PlanPrototype,
  [TypeId]: TypeId
}

const contextCache = GlobalValue.globalValue(
  "@effect/ai/AiModel/CachedContexts",
  () => new Map<string, any>()
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Cached, PerRequest, CachedRequires, PerRequestRequires>(options: {
  /**
   * A unique key used to cache the `Context` built from the `cachedContext`
   * effect.
   */
  readonly cacheKey: string
  /**
   * An effect used to build a `Context` that will be cached after creation
   * and used for all provider requests.
   */
  readonly cachedContext: Effect.Effect<
    Context.Context<Cached>,
    never,
    CachedRequires | Scope.Scope
  >
  /**
   * A method that can be used to update the `Context` on a per-request basis
   * for all provider requests.
   */
  readonly updateRequestContext: (context: Context.Context<Cached>) => Effect.Effect<
    Context.Context<PerRequest>,
    never,
    PerRequestRequires
  >
}): AiModel<Cached | PerRequest, CachedRequires | PerRequestRequires> => {
  const self = Object.create(AiModelProto)
  self.buildContext = Effect.gen(function*() {
    let context = contextCache.get(options.cacheKey)
    if (Predicate.isUndefined(context)) {
      context = yield* options.cachedContext
    }
    return yield* options.updateRequestContext(context)
  })
  self.steps = [{
    model: self,
    check: Option.none(),
    schedule: Option.none()
  }]
  return self
}
