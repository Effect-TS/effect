export const SummarySym = Symbol.for("@effect-ts/core/io/Metrics/Summary");
export type SummarySym = typeof SummarySym;

/**
 * A `Summary` represents a sliding window of a time series along with metrics
 * for certain percentiles of the time series, referred to as quantiles.
 * Quantiles describe specified percentiles of the sliding window that are of
 * interest. For example, if we were using a summary to track the response time
 * for requests over the last hour then we might be interested in the 50th
 * percentile, 90th percentile, 95th percentile, and 99th percentile for
 * response times.
 *
 * @tsplus type ets/Summary
 */
export interface Summary<A> extends Metric<A> {
  readonly [SummarySym]: SummarySym;
  readonly maxSize: number;
  readonly maxAge: Duration;
  readonly error: number;
  readonly quantiles: Chunk<number>;
}

/**
 * @tsplus type ets/Summary/Ops
 */
export interface SummaryOps {
  $: SummaryAspects;
}
export const Summary: SummaryOps = {
  $: {}
};

/**
 * @tsplus type ets/Summary/Aspects
 */
export interface SummaryAspects {}

/**
 * @tsplus unify ets/Summary
 */
export function unifySummary<X extends Summary<any>>(
  self: X
): Summary<[X] extends [Summary<infer AX>] ? AX : never> {
  return self;
}
