/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { CommitPrototype } from "effect/Effectable"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = "~@effect/ai/Model"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category Models
 */
export interface Model<in out Provider, in out Provides, in out Requires>
  extends
    Layer.Layer<Provides | ProviderName, never, Requires>,
    Effect.Effect<Layer.Layer<Provides | ProviderName>, never, Requires>
{
  readonly [TypeId]: TypeId
  readonly provider: Provider
}

/**
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
 * @since 1.0.0
 * @category constructors
 */
export const make = <const Provider extends string, Provides, Requires>(
  provider: Provider,
  layer: Layer.Layer<Provides, never, Requires>
): Model<Provider, Provides, Requires> =>
  Object.assign(
    Object.create(ModelProto),
    { provider },
    Layer.merge(Layer.succeed(ProviderName, provider), layer)
  )
