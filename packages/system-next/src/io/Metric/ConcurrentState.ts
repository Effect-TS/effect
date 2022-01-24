import type { Chunk } from "../../collection/immutable/Chunk/core"
import * as HM from "../../collection/immutable/HashMap"
import type { Next } from "../../collection/immutable/Map"
import type { Tuple } from "../../collection/immutable/Tuple"
import * as O from "../../data/Option"
import * as T from "./_internal/effect"
import * as ConcurrentCounter from "./ConcurrentCounter"
import * as ConcurrentGauge from "./ConcurrentGauge"
import * as ConcurrentHistogram from "./ConcurrentHistogram"
import type { ConcurrentMetricState } from "./ConcurrentMetricState"
import { toMetricState } from "./ConcurrentMetricState"
import * as CMS from "./ConcurrentMetricState"
import * as ConcurrentSetCount from "./ConcurrentSetCount"
import * as ConcurrentSummary from "./ConcurrentSummary"
import { Counter } from "./Counter"
import { Gauge } from "./Gauge"
import { Histogram } from "./Histogram"
import type * as MK from "./MetricKey"
import type { MetricListener } from "./MetricListener"
import type { MetricState } from "./MetricState"
import { SetCount } from "./SetCount"
import { Summary } from "./Summary"

export class ConcurrentState {
  map: HM.HashMap<MK.MetricKey, ConcurrentMetricState> = HM.make()

  readonly listeners = new Set<MetricListener>()

  readonly listener: MetricListener = {
    unsafeCounterObserved: (key, value, delta) => {
      const iterator = this.listeners[Symbol.iterator]()
      let next: Next<MetricListener>
      while (!(next = iterator.next()).done) {
        next.value.unsafeCounterObserved(key, value, delta)
      }
    },
    unsafeGaugeObserved: (key, value, delta) => {
      const iterator = this.listeners[Symbol.iterator]()
      let next: Next<MetricListener>
      while (!(next = iterator.next()).done) {
        next.value.unsafeGaugeObserved(key, value, delta)
      }
    },
    unsafeHistogramObserved: (key, value) => {
      const iterator = this.listeners[Symbol.iterator]()
      let next: Next<MetricListener>
      while (!(next = iterator.next()).done) {
        next.value.unsafeHistogramObserved(key, value)
      }
    },
    unsafeSummaryObserved: (key, value) => {
      const iterator = this.listeners[Symbol.iterator]()
      let next: Next<MetricListener>
      while (!(next = iterator.next()).done) {
        next.value.unsafeSummaryObserved(key, value)
      }
    },
    unsafeSetObserved: (key, value) => {
      const iterator = this.listeners[Symbol.iterator]()
      let next: Next<MetricListener>
      while (!(next = iterator.next()).done) {
        next.value.unsafeSetObserved(key, value)
      }
    }
  }

  get states(): HM.HashMap<MK.MetricKey, MetricState> {
    const iterator = this.map.tupleIterator[Symbol.iterator]()

    let next: Next<Tuple<[MK.MetricKey, ConcurrentMetricState]>>

    return HM.mutate_(HM.make<MK.MetricKey, MetricState>(), (map) => {
      while (!(next = iterator.next()).done) {
        HM.set_(map, next.value.get(0), toMetricState(next.value.get(1)))
      }
    })
  }

  state(key: MK.MetricKey): O.Option<MetricState> {
    return O.map_(HM.get_(this.map, key), toMetricState)
  }

  installListener(listener: MetricListener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: MetricListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Increase a named counter by some value.
   */
  getCounter<A>(key: MK.Counter): Counter<A> {
    let value = O.toNullable(HM.get_(this.map, key))
    if (value == null) {
      value = new CMS.Counter(key, "", ConcurrentCounter.manual())
      this.map = HM.set_(this.map, key, value)
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const counter = value as CMS.Counter

    function unsafeCount(): number {
      return counter.count
    }

    function unsafeIncrementBy(value: number): void {
      const {
        tuple: [v, d]
      } = counter.increment(value)
      self.listener.unsafeCounterObserved(key, v, d)
    }

    return new Counter(
      T.succeed(() => unsafeCount()),
      (value, __trace) => T.succeed(() => unsafeIncrementBy(value), __trace),
      unsafeCount,
      unsafeIncrementBy
    )
  }

  getGauge<A>(key: MK.Gauge): Gauge<A> {
    let value = O.toNullable(HM.get_(this.map, key))
    if (value == null) {
      value = new CMS.Gauge(key, "", ConcurrentGauge.manual(0))
      this.map = HM.set_(this.map, key, value)
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const gauge = value as CMS.Gauge

    return new Gauge(
      T.succeed(() => gauge.get),
      (value, __trace) =>
        T.succeed(() => {
          const {
            tuple: [v, d]
          } = gauge.set(value)
          self.listener.unsafeGaugeObserved(key, v, d)
        }),
      (value, __trace) =>
        T.succeed(() => {
          const {
            tuple: [v, d]
          } = gauge.adjust(value)
          self.listener.unsafeGaugeObserved(key, v, d)
        })
    )
  }

  /**
   * Observe a value and feed it into a histogram.
   */
  getHistogram<A>(key: MK.Histogram): Histogram<A> {
    let value = O.toNullable(HM.get_(this.map, key))
    if (value == null) {
      value = new CMS.Histogram(
        key,
        "",
        ConcurrentHistogram.manual(key.boundaries.chunk)
      )
      this.map = HM.set_(this.map, key, value)
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const histogram = value as CMS.Histogram

    function unsafeObserve(value: number): void {
      histogram.observe(value)
      self.listener.unsafeHistogramObserved(key, value)
    }

    return new Histogram(
      T.succeed(() => histogram.histogram.getCount()),
      T.succeed(() => histogram.histogram.getSum()),
      T.succeed(() => histogram.histogram.snapshot()),
      (value, __trace) => T.succeed(() => unsafeObserve(value), __trace),
      unsafeObserve
    )
  }

  getSummary<A>(key: MK.Summary): Summary<A> {
    let value = O.toNullable(HM.get_(this.map, key))
    if (value == null) {
      value = new CMS.Summary(
        key,
        "",
        ConcurrentSummary.manual(key.maxSize, key.maxAge, key.error, key.quantiles)
      )
      this.map = HM.set_(this.map, key, value)
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const summary = value as CMS.Summary

    return new Summary(
      T.succeed(() => summary.summary.getCount()),
      T.succeed(() => summary.summary.getSum()),
      (value, __trace) =>
        T.succeed(() => {
          summary.observe(value, new Date())
          self.listener.unsafeSummaryObserved(key, value)
        }, __trace),
      T.succeed(() => summary.summary.snapshot(new Date()))
    )
  }

  getSetCount<A>(key: MK.SetCount): SetCount<A> {
    let value = O.toNullable(HM.get_(this.map, key))
    if (value == null) {
      value = new CMS.SetCount(key, "", ConcurrentSetCount.manual())
      this.map = HM.set_(this.map, key, value)
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const setCount = value as CMS.SetCount

    function unsafeOccurrences(): Chunk<Tuple<[string, number]>> {
      return setCount.setCount.snapshot()
    }

    function unsafeOccurrencesFor(word: string): number {
      return setCount.setCount.getCountFor(word)
    }

    function unsafeObserve(word: string): void {
      setCount.observe(word)
      self.listener.unsafeSetObserved(key, word)
    }

    return new SetCount(
      T.succeed(unsafeOccurrences),
      (word, __trace) => T.succeed(() => unsafeOccurrencesFor(word), __trace),
      (word, __trace) => T.succeed(() => unsafeObserve(word), __trace),
      unsafeOccurrences,
      unsafeOccurrencesFor,
      unsafeObserve
    )
  }
}
