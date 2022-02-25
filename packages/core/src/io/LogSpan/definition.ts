/**
 * @tsplus type ets/LogSpan
 */
export interface LogSpan {
  readonly label: string
  readonly startTime: number
}

/**
 * @tsplus type ets/LogSpanOps
 */
export interface LogSpanOps {}
export const LogSpan: LogSpanOps = {}

/**
 * @tsplus static ets/LogSpanOps __call
 */
export function applyLogSpan(label: string, startTime: number): LogSpan {
  return {
    label,
    startTime
  }
}
