/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import * as RcMap from "effect/RcMap"
import type * as Scope from "effect/Scope"
import type { AiModel } from "./AiModel.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class AiModels extends Context.Tag("@effect/ai/AiModels")<
  AiModels,
  AiModels.Service
>() {}

/**
 * @since 1.0.0
 */
export declare namespace AiModels {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly build: <Provides, Requires>(
      model: AiModel<Provides, Requires>,
      context: Context.Context<Requires>
    ) => Effect.Effect<Context.Context<Provides>, never, Scope.Scope>
  }
}

class AiModelsKey {
  constructor(
    readonly model: AiModel<any, any>,
    readonly service: unknown
  ) {}

  [Equal.symbol](that: AiModelsKey): boolean {
    return this.service === that.service && this.model.cacheKey === that.model.cacheKey
  }
  [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.service))(Hash.hash(this.model.cacheKey))
  }
}

const make = Effect.gen(function*() {
  const services = yield* RcMap.make({
    idleTimeToLive: "1 minute",
    lookup: (key: AiModelsKey) => Effect.provideService(key.model.provides, key.model.requires, key.service)
  })

  const build = <Provides, Requires>(
    model: AiModel<Provides, Requires>,
    context: Context.Context<Requires>
  ): Effect.Effect<Context.Context<Provides>, never, Scope.Scope> =>
    Effect.map(
      RcMap.get(
        services,
        new AiModelsKey(model, Context.get(context, model.requires as any))
      ),
      (context) => model.updateContext(context)
    )

  return { build } as const
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<AiModels> = Layer.scoped(AiModels, make)
