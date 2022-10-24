/**
 * @tsplus type effect/core/io/LogSpan
 * @category model
 * @since 1.0.0
 */
export interface LogSpan {
  readonly label: string
  readonly startTime: number
}

/**
 * @tsplus type effect/core/io/LogSpan.Ops
 * @category model
 * @since 1.0.0
 */
export interface LogSpanOps {
  (label: string, startTime: number): LogSpan
  $: LogSpanAspects
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const LogSpan: LogSpanOps = Object.assign(
  (label: string, startTime: number): LogSpan => ({
    label,
    startTime
  }),
  { $: {} }
)

/**
 * @tsplus type effect/core/io/LogSpan.Aspects
 * @category model
 * @since 1.0.0
 */
export interface LogSpanAspects {}
