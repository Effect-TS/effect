/**
 * @since 1.0.0
 */
import type * as Channel from "./Channel"
import type * as Effect from "./Effect"
import * as internal from "./internal/Effectable"
import type * as Sink from "./Sink"
import type * as Stream from "./Stream"

/**
 * @since 1.0.0
 * @category type ids
 */
export const EffectTypeId: Effect.EffectTypeId = internal.EffectTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type EffectTypeId = Effect.EffectTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const StreamTypeId: Stream.StreamTypeId = internal.StreamTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type StreamTypeId = Stream.StreamTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const SinkTypeId: Sink.SinkTypeId = internal.SinkTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type SinkTypeId = Sink.SinkTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const ChannelTypeId: Channel.ChannelTypeId = internal.ChannelTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type ChannelTypeId = Channel.ChannelTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Commit {
  new<R, E, A>(): Effect.Effect<R, E, A>
}

const Commit: Commit = internal.Commit
const CommitStructural: Commit = internal.CommitStructural

/**
 * @since 1.0.0
 * @category constructors
 */
export abstract class Effectable<R, E, A> extends Commit<R, E, A> {
  /**
   * @since 1.0.0
   */
  abstract commit(): Effect.Effect<R, E, A>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export abstract class Structural<R, E, A> extends CommitStructural<R, E, A> {
  /**
   * @since 1.0.0
   */
  abstract commit(): Effect.Effect<R, E, A>
}
