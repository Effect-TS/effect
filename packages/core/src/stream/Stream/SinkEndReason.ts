/**
 * @tsplus type ets/Stream/SinkEndReason
 */
export type SinkEndReason<C> = SinkEnd | ScheduleTimeout | ScheduleEnd<C> | UpstreamEnd

export interface SinkEnd {
  readonly _tag: "SinkEnd"
}

export interface ScheduleTimeout {
  readonly _tag: "ScheduleTimeout"
}

export interface ScheduleEnd<C> {
  readonly _tag: "ScheduleEnd"
  readonly c: C
}

export interface UpstreamEnd {
  readonly _tag: "UpstreamEnd"
}

/**
 * @tsplus type ets/Stream/SinkEndReasonOps
 */
export interface SinkEndReasonOps {}
export const SinkEndReason: SinkEndReasonOps = {}

/**
 * @tsplus unify ets/Stream/SinkEndReason
 */
export function unifySinkEndReason<X extends SinkEndReason<any>>(
  self: X
): SinkEndReason<[X] extends [SinkEndReason<infer AX>] ? AX : never> {
  return self
}

/**
 * @tsplus static ets/Stream/SinkEndReasonOps SinkEnd
 */
export const sinkEnd: SinkEndReason<never> = {
  _tag: "SinkEnd"
}

/**
 * @tsplus static ets/Stream/SinkEndReasonOps ScheduleTimeout
 */
export const scheduleTimeout: SinkEndReason<never> = {
  _tag: "ScheduleTimeout"
}

/**
 * @tsplus static ets/Stream/SinkEndReasonOps ScheduleEnd
 */
export function scheduleEnd<C>(c: C): SinkEndReason<C> {
  return {
    _tag: "ScheduleEnd",
    c
  }
}

/**
 * @tsplus static ets/Stream/SinkEndReasonOps UpstreamEnd
 */
export const upstreamEnd: SinkEndReason<never> = {
  _tag: "UpstreamEnd"
}
