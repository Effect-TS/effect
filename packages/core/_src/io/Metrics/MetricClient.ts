import type { AtomicCounter } from "@effect-ts/core/io/Metrics/atomic/AtomicCounter";
import type { AtomicGauge } from "@effect-ts/core/io/Metrics/atomic/AtomicGauge";
import type { AtomicHistogram } from "@effect-ts/core/io/Metrics/atomic/AtomicHistogram";
import type { AtomicSetCount } from "@effect-ts/core/io/Metrics/atomic/AtomicSetCount";
import type { AtomicSummary } from "@effect-ts/core/io/Metrics/atomic/AtomicSummary";

/**
 * A `MetricClient` provides the functionality to consume metrics produced by
 * Effect-TS applications. The `MetricClient` supports two ways of consuming
 * metrics, corresponding to the two ways that third party metrics services use
 * metrics.
 *
 * First, metrics services can poll for the current state of all recorded
 * metrics using the `unsafeSnapshot` method, which provides a snapshot, as of a
 * point in time, of all metrics recorded by the Effect-TS application.
 *
 * Second, metrics services can install a listener that will be notified every
 * time a metric is updated.
 *
 * `MetricClient` is a lower level interface and is intended to be used by
 * implementers of integrations with third party metrics services but not by end
 * users.
 *
 * @tsplus type ets/MetricClient
 * @tsplus companion ets/MetricClient/Ops
 */
export class MetricClient {
  #map = HashMap.empty<MetricKey, MetricState>();
  #listeners = new Set<MetricListener>();
  #listener: MetricListener = {
    unsafeCounterObserved: (key, value, delta) => {
      for (const listener of this.#listeners) {
        listener.unsafeCounterObserved(key, value, delta);
      }
    },
    unsafeGaugeObserved: (key, value, delta) => {
      for (const listener of this.#listeners) {
        listener.unsafeGaugeObserved(key, value, delta);
      }
    },
    unsafeHistogramObserved: (key, value) => {
      for (const listener of this.#listeners) {
        listener.unsafeHistogramObserved(key, value);
      }
    },
    unsafeSummaryObserved: (key, value) => {
      for (const listener of this.#listeners) {
        listener.unsafeSummaryObserved(key, value);
      }
    },
    unsafeSetObserved: (key, value) => {
      for (const listener of this.#listeners) {
        listener.unsafeSetObserved(key, value);
      }
    }
  };

  snapshots(): HashMap<MetricKey, MetricSnapshot> {
    return this.#map.map((state) => state.snapshot());
  }

  snapshot(key: MetricKey): Option<MetricSnapshot> {
    return this.#map.get(key).map((state) => state.snapshot());
  }

  installListener(listener: MetricListener): void {
    this.#listeners.add(listener);
  }

  removeListener(listener: MetricListener): void {
    this.#listeners.delete(listener);
  }

  /**
   * Increase a named counter by some value.
   */
  getCounter(key: MetricKey.Counter): AtomicCounter {
    let value = this.#map.get(key).value;
    if (value == null) {
      value = MetricState.Counter(key, "");
      this.#map = this.#map.set(key, value);
    }

    const counter = value as MetricState.Counter;
    const unsafeCount = (): number => {
      return counter.count;
    };
    const unsafeIncrement = (value = 1): void => {
      const {
        tuple: [v, d]
      } = counter.increment(value);
      this.#listener.unsafeCounterObserved(key, v, d);
    };
    const count = (): UIO<number> => {
      return Effect.succeed(unsafeCount());
    };
    const increment = (value = 1): UIO<void> => {
      return Effect.succeed(unsafeIncrement(value));
    };

    return {
      metricKey: key,
      count,
      increment,
      unsafeCount,
      unsafeIncrement
    };
  }

  getGauge(key: MetricKey.Gauge): AtomicGauge {
    let value = this.#map.get(key).value;
    if (value == null) {
      value = MetricState.Gauge(key, "", 0);
      this.#map = this.#map.set(key, value);
    }

    const gauge = value as MetricState.Gauge;

    return {
      metricKey: key,
      value: (__tsplusTrace) => Effect.succeed(() => gauge.get),
      set: (value) =>
        Effect.succeed(() => {
          const {
            tuple: [v, d]
          } = gauge.set(value);
          this.#listener.unsafeGaugeObserved(key, v, d);
        }),
      adjust: (value) =>
        Effect.succeed(() => {
          const {
            tuple: [v, d]
          } = gauge.adjust(value);
          this.#listener.unsafeGaugeObserved(key, v, d);
        })
    };
  }

  /**
   * Observe a value and feed it into a histogram
   */
  getHistogram(key: MetricKey.Histogram): AtomicHistogram {
    let value = this.#map.get(key).value;
    if (value == null) {
      value = MetricState.Histogram(key, "");
      this.#map = this.#map.set(key, value);
    }

    const histogram = value as MetricState.Histogram;

    const unsafeObserve = (value: number): void => {
      histogram.observe(value);
      this.#listener.unsafeHistogramObserved(key, value);
    };

    return {
      metricKey: key,
      count: () => Effect.succeed(histogram.getCount()),
      buckets: () => Effect.succeed(histogram.snapshot()),
      observe: (value) => Effect.succeed(unsafeObserve(value)),
      sum: () => Effect.succeed(histogram.getSum()),
      unsafeObserve
    };
  }

  getSummary(key: MetricKey.Summary): AtomicSummary {
    let value = this.#map.get(key).value;
    if (value == null) {
      value = MetricState.Summary(key, "");
      this.#map = this.#map.set(key, value);
    }

    const summary = value as MetricState.Summary;

    return {
      metricKey: key,
      count: () => Effect.succeed(summary.getCount()),
      sum: () => Effect.succeed(summary.getSum()),
      observe: (value) =>
        Effect.succeed(() => {
          summary.observe(value, Date.now());
          this.#listener.unsafeSummaryObserved(key, value);
        }),
      quantileValues: () => Effect.succeed(summary.snapshot(Date.now()))
    };
  }

  getSetCount(key: MetricKey.SetCount): AtomicSetCount {
    let value = this.#map.get(key).value;
    if (value == null) {
      value = MetricState.SetCount(key, "");
      this.#map = this.#map.set(key, value);
    }

    const setCount = value as MetricState.SetCount;

    const unsafeObserve = (word: string): void => {
      setCount.observe(word);
      this.#listener.unsafeSetObserved(key, word);
    };

    const unsafeOccurrences = (): Chunk<Tuple<[string, number]>> => setCount.snapshot();

    const unsafeOccurrencesFor = (word: string): number => setCount.getCountFor(word);

    return {
      metricKey: key,
      observe: (word) => Effect.succeed(unsafeObserve(word)),
      occurrences: () => Effect.succeed(unsafeOccurrences()),
      occurrencesFor: (word) => Effect.succeed(unsafeOccurrencesFor(word)),
      unsafeObserve,
      unsafeOccurrences,
      unsafeOccurrencesFor
    };
  }
}

/**
 * @tsplus static ets/MetricClient/Ops client
 */
export const metricClient: LazyValue<MetricClient> = LazyValue.make(
  () => new MetricClient()
);

/**
 * Unsafely installs the specified metric listener.
 *
 * @tsplus static ets/MetricClient/Ops unsafeInstallListener
 */
export function unsafeInstallListener(listener: MetricListener): void {
  return metricClient.value.installListener(listener);
}

/**
 * Unsafely removes the specified metric listener.
 *
 * @tsplus static ets/MetricClient/Ops unsafeRemoveListener
 */
export function unsafeRemoveListener(listener: MetricListener): void {
  return metricClient.value.removeListener(listener);
}

/**
 * Unsafely captures a snapshot of all metrics recorded by the application.
 *
 * @tsplus static ets/MetricClient/Ops unsafeSnapshots
 */
export function unsafeSnapshots(): HashMap<MetricKey, MetricSnapshot> {
  return metricClient.value.snapshots();
}

/**
 * Unsafely looks up the snapshot of a metric by its key.
 *
 * @tsplus static ets/MetricClient/Ops unsafeSnapshot
 */
export function unsafeSnapshot(key: MetricKey): Option<MetricSnapshot> {
  return metricClient.value.snapshot(key);
}
