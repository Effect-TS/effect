/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { CommitPrototype } from "effect/Effectable"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/ai/Model")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Model<in out Provides, in out Requires>
  extends Layer.Layer<Provides, never, Requires>, Effect.Effect<Layer.Layer<Provides>, never, Requires>
{
  readonly [TypeId]: TypeId
}

const ModelProto = {
  ...CommitPrototype,
  [TypeId]: TypeId,
  [Layer.LayerTypeId]: {
    _ROut: identity,
    _E: identity,
    _RIn: identity
  },
  commit(this: Model<any, any>) {
    return Effect.contextWith((context: Context.Context<never>) => {
      return Layer.provide(this, Layer.succeedContext(context))
    })
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Provides, Requires>(
  layer: Layer.Layer<Provides, never, Requires>
): Model<Provides, Requires> => Object.assign(Object.create(ModelProto), layer)
