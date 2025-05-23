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
export const TypeId: unique symbol = Symbol.for("@effect/ai/AiModel")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface AiModel<in out Provides, in out Requires>
  extends Layer.Layer<Provides, never, Requires>, Effect.Effect<Provides & Layer.Layer<Provides>, never, Requires>
{
  readonly [TypeId]: TypeId
}

const AiModelProto = {
  ...CommitPrototype,
  [TypeId]: TypeId,
  [Layer.LayerTypeId]: {
    _ROut: identity,
    _E: identity,
    _RIn: identity
  },
  commit(this: AiModel<any, any>) {
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
): AiModel<Provides, Requires> => Object.assign(Object.create(AiModelProto), layer)
