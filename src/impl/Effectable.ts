import type { Channel } from "../Channel.js"
import type { Effect } from "../Effect.js"
import * as internal from "../internal/effectable.js"
import type { Sink } from "../Sink.js"
import type { Stream } from "../Stream.js"

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
  new<R, E, A>(): Effect<R, E, A>
}

/**
 * @since 2.0.0
 * @category prototypes
 */
export const EffectPrototype: Effect<never, never, never> = internal.EffectPrototype

/**
 * @since 2.0.0
 * @category prototypes
 */
export const CommitPrototype: Effect<never, never, never> = internal.CommitPrototype

/**
 * @since 2.0.0
 * @category prototypes
 */
export const StructuralCommitPrototype: Effect<never, never, never> = internal.StructuralCommitPrototype

const Base: CommitPrimitive = internal.Base
const StructuralBase: CommitPrimitive = internal.StructuralBase

/**
 * @since 2.0.0
 * @category constructors
 */
export abstract class Class<R, E, A> extends Base<R, E, A> {
  /**
   * @since 2.0.0
   */
  abstract commit(): Effect<R, E, A>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export abstract class StructuralClass<R, E, A> extends StructuralBase<R, E, A> {
  /**
   * @since 2.0.0
   */
  abstract commit(): Effect<R, E, A>
}
