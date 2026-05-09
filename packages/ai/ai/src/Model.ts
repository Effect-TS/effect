/**
 * The `Model` module provides a unified interface for AI service providers.
 *
 * This module enables creation of provider-specific AI models that can be used
 * interchangeably within the Effect AI ecosystem. It combines Layer
 * functionality with provider identification, allowing for seamless switching
 * between different AI service providers while maintaining type safety.
 *
 * @example
 * ```ts
 * import { Model, LanguageModel } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * declare const myAnthropicLayer: Layer.Layer<LanguageModel.LanguageModel>
 *
 * const anthropicModel = Model.make("anthropic", myAnthropicLayer)
 *
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateText({
 *     prompt: "Hello, world!"
 *   })
 *   return response.text
 * }).pipe(
 *   Effect.provide(anthropicModel)
 * )
 * ```
 *
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { CommitPrototype } from "effect/Effectable"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"

/**
 * Unique identifier for Model instances.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = "~@effect/ai/Model"

/**
 * Type-level representation of the Model identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * A Model represents a provider-specific AI service.
 *
 * A Model can be used directly as a Layer to provide a particular model
 * implementation to an Effect program.
 *
 * A Model can also be used as an Effect to "lift" dependencies of the Model
 * constructor into the parent Effect. This is particularly useful when you
 * want to use a Model from within an Effect service.
 *
 * @template Provider - String literal type identifying the AI provider.
 * @template Provides - Services that this model provides.
 * @template Requires - Services that this model requires.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Model<in out Provider, in out Provides, in out Requires>
  extends
    Layer.Layer<Provides | ProviderName, never, Requires>,
    Effect.Effect<Layer.Layer<Provides | ProviderName>, never, Requires>
{
  readonly [TypeId]: TypeId
  /**
   * The provider identifier (e.g., "openai", "anthropic", "amazon-bedrock").
   */
  readonly provider: Provider
}

/**
 * Service tag that provides the current large language model provider name.
 *
 * This tag is automatically provided by Model instances and can be used to
 * access the name of the provider that is currently in use within a given
 * Effect program.
 *
 * @since 1.0.0
 * @category Context
 */
export class ProviderName extends Context.Tag("@effect/ai/Model/ProviderName")<
  ProviderName,
  string
>() {}

const ModelProto = {
  ...CommitPrototype,
  [TypeId]: TypeId,
  [Layer.LayerTypeId]: {
    _ROut: identity,
    _E: identity,
    _RIn: identity
  },
  commit(this: Model<any, any, any>) {
    return Effect.contextWith((context: Context.Context<never>) => {
      return Layer.provide(this, Layer.succeedContext(context))
    })
  }
}

/**
 * Creates a Model from a provider name and a Layer that constructs AI services.
 *
 * @example
 * ```ts
 * import { Model, LanguageModel } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * declare const bedrockLayer: Layer.Layer<LanguageModel.LanguageModel>
 *
 * // Model automatically provides ProviderName service
 * const checkProviderAndGenerate = Effect.gen(function* () {
 *   const provider = yield* Model.ProviderName
 *
 *   console.log(`Generating with: ${provider}`)
 *
 *   return yield* LanguageModel.generateText({
 *     prompt: `Hello from ${provider}!`
 *   })
 * })
 *
 * const program = checkProviderAndGenerate.pipe(
 *   Effect.provide(Model.make("amazon-bedrock", bedrockLayer))
 * )
 * // Will log: "Generating with: amazon-bedrock"
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = <const Provider extends string, Provides, Requires>(
  /**
   * Provider identifier (e.g., "openai", "anthropic", "amazon-bedrock").
   */
  provider: Provider,
  /**
   * Layer that provides the AI services for this provider.
   */
  layer: Layer.Layer<Provides, never, Requires>
): Model<Provider, Provides, Requires> =>
  Object.assign(
    Object.create(ModelProto),
    { provider },
    Layer.merge(Layer.succeed(ProviderName, provider), layer)
  )
