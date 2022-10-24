/**
 * @tsplus type effect/core/stream/Stream/SinkEndReason
 * @category model
 * @since 1.0.0
 */
export type SinkEndReason = ScheduleEnd | UpstreamEnd

/**
 * @category model
 * @since 1.0.0
 */
export interface ScheduleEnd {
  readonly _tag: "ScheduleEnd"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface UpstreamEnd {
  readonly _tag: "UpstreamEnd"
}

/**
 * @tsplus type effect/core/stream/Stream/SinkEndReason.Ops
 * @category model
 * @since 1.0.0
 */
export interface SinkEndReasonOps {}
export const SinkEndReason: SinkEndReasonOps = {}

/**
 * @tsplus static effect/core/stream/Stream/SinkEndReason.Ops ScheduleEnd
 * @category constructors
 * @since 1.0.0
 */
export const scheduleEnd: SinkEndReason = {
  _tag: "ScheduleEnd"
}

/**
 * @tsplus static effect/core/stream/Stream/SinkEndReason.Ops UpstreamEnd
 * @category constructors
 * @since 1.0.0
 */
export const upstreamEnd: SinkEndReason = {
  _tag: "UpstreamEnd"
}
