export interface AtomicSummary {
  readonly metricKey: MetricKey.Summary;
  /**
   * The count how many values have been observed in total.
   *
   * It is **NOT** the number of samples currently held (i.e.
   * `count() >= samples.size`).
   */
  readonly count: (__tsplusTrace?: string) => UIO<number>;
  /**
   * The sum of all values ever observed.
   */
  readonly sum: (__tsplusTrace?: string) => UIO<number>;
  /**
   * Observe a single value and record it in the summary.
   */
  readonly observe: (value: number, __tsplusTrace?: string) => UIO<void>;
  /**
   * Create a snapshot.
   * - Chunk of (Tuple of (quantile boundary, satisfying value if found))
   */
  readonly quantileValues: (
    __tsplusTrace?: string
  ) => UIO<Chunk<Tuple<[number, Option<number>]>>>;
}
