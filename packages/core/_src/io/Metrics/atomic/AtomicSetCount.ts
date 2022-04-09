export interface AtomicSetCount {
  readonly metricKey: MetricKey.SetCount;
  /**
   * Increments the counter associated with the specified value by one.
   */
  readonly observe: (word: string, __tsplusTrace?: string) => UIO<unknown>;
  /**
   * The number of occurences of every value observed by this set count.
   */
  readonly occurrences: (__tsplusTrace?: string) => UIO<Chunk<Tuple<[string, number]>>>;
  /**
   * The number of occurences of the specified value observed by this set count.
   */
  readonly occurrencesFor: (word: string, __tsplusTrace?: string) => UIO<number>;

  readonly unsafeObserve: (word: string) => void;
  readonly unsafeOccurrences: () => Chunk<Tuple<[string, number]>>;
  readonly unsafeOccurrencesFor: (word: string) => number;
}
