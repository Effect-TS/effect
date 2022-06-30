/**
 * @tsplus type effect/core/io/LogSpan
 */
export interface LogSpan {
  readonly label: string
  readonly startTime: number
}

/**
 * @tsplus type effect/core/io/LogSpan.Ops
 */
export interface LogSpanOps {
  $: LogSpanAspects
}
export const LogSpan: LogSpanOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/LogSpan.Aspects
 */
export interface LogSpanAspects {}

/**
 * @tsplus static effect/core/io/LogSpan.Ops __call
 */
export function apply(label: string, startTime: number): LogSpan {
  return {
    label,
    startTime
  }
}
