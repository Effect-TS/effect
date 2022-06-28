/**
 * @tsplus type effect/core/stream/Stream/SinkEndReason
 */
export type SinkEndReason = ScheduleEnd | UpstreamEnd

export interface ScheduleEnd {
  readonly _tag: "ScheduleEnd"
}

export interface UpstreamEnd {
  readonly _tag: "UpstreamEnd"
}

/**
 * @tsplus type effect/core/stream/Stream/SinkEndReason.Ops
 */
export interface SinkEndReasonOps {}
export const SinkEndReason: SinkEndReasonOps = {}

/**
 * @tsplus static effect/core/stream/Stream/SinkEndReason.Ops ScheduleEnd
 */
export const scheduleEnd: SinkEndReason = {
  _tag: "ScheduleEnd"
}

/**
 * @tsplus static effect/core/stream/Stream/SinkEndReason.Ops UpstreamEnd
 */
export const upstreamEnd: SinkEndReason = {
  _tag: "UpstreamEnd"
}
