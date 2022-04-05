/**
 * @tsplus type ets/LogSpan
 */
export interface LogSpan {
  readonly label: string;
  readonly startTime: number;
}

/**
 * @tsplus type ets/LogSpan/Ops
 */
export interface LogSpanOps {
  $: LogSpanAspects;
}
export const LogSpan: LogSpanOps = {
  $: {}
};

/**
 * @tsplus type ets/LogSpan/Aspects
 */
export interface LogSpanAspects {}

/**
 * @tsplus static ets/LogSpan/Ops __call
 */
export function apply(label: string, startTime: number): LogSpan {
  return {
    label,
    startTime
  };
}
