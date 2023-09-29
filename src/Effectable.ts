/**
 * @since 2.0.0
 */
import type * as Channel from "./Channel"
import type * as Effect from "./Effect"
import * as internal from "./internal/Effectable"
import type * as Sink from "./Sink"
import type * as Stream from "./Stream"

/**
 * @since 2.0.0
 * @category type ids
 */
export const EffectTypeId: Effect.EffectTypeId = internal.EffectTypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export type EffectTypeId = Effect.EffectTypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export const StreamTypeId: Stream.StreamTypeId = internal.StreamTypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export type StreamTypeId = Stream.StreamTypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export const SinkTypeId: Sink.SinkTypeId = internal.SinkTypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export type SinkTypeId = Sink.SinkTypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export const ChannelTypeId: Channel.ChannelTypeId = internal.ChannelTypeId

/**
 * @since 2.0.0
 * @category type ids
 */
export type ChannelTypeId = Channel.ChannelTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface CommitPrimitive {
  new<R, E, A>(): Effect.Effect<R, E, A>
}

/**
 * @since 2.0.0
 */
export const Base: CommitPrimitive = internal.Base

/**
 * @since 2.0.0
 */
export const StructuralBase: CommitPrimitive = internal.StructuralBase

/**
 * @since 2.0.0
 * @category constructors
 */
export abstract class Effectable<R, E, A> extends Base<R, E, A> {
  /**
   * @since 2.0.0
   */
  abstract commit(): Effect.Effect<R, E, A>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export abstract class Structural<R, E, A> extends StructuralBase<R, E, A> {
  /**
   * @since 2.0.0
   */
  abstract commit(): Effect.Effect<R, E, A>
}
