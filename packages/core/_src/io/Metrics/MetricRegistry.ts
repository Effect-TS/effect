import type { MetricHook } from "@effect/core/io/Metrics/MetricHook"
import type { _In, _Out } from "@effect/core/io/Metrics/MetricKeyType"
import {
  CounterKey,
  FrequencyKey,
  GaugeKey,
  HistogramKey,
  SummaryKey
} from "@effect/core/io/Metrics/MetricKeyType"

export class MetricRegistry {
  private map = MutableHashMap.empty<MetricKey<MetricKeyType.Untyped>, MetricHook.Root>()

  private listeners: Set<MetricListener> = new Set()

  private listener: MetricListener = new MetricListener(
    (key) =>
      (update) => {
        for (const listener of this.listeners) {
          listener.unsafeUpdate(key)(update)
        }
      }
  )

  installListener(listener: MetricListener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: MetricListener): void {
    this.listeners.delete(listener)
  }

  snapshot(): HashSet<MetricPair.Untyped> {
    const result: Array<MetricPair.Untyped> = []
    for (const [key, hook] of this.map) {
      result.push(MetricPair.unsafeMake(key, hook.get()))
    }
    return HashSet.from(result)
  }

  get<Type extends MetricKeyType<any, any>>(key: MetricKey<Type>): MetricHook<
    [typeof key["keyType"]] extends [{ [_In]: () => infer In }] ? In : never,
    [typeof key["keyType"]] extends [{ [_Out]: () => infer Out }] ? Out : never
  > {
    const hook = this.map.get(key).value
    if (hook == null) {
      if (key.keyType instanceof CounterKey) {
        return this.getCounter(key as unknown as MetricKey.Counter) as any
      }
      if (key.keyType instanceof GaugeKey) {
        return this.getGauge(key as unknown as MetricKey.Gauge) as any
      }
      if (key.keyType instanceof FrequencyKey) {
        return this.getFrequency(key as unknown as MetricKey.Frequency) as any
      }
      if (key.keyType instanceof HistogramKey) {
        return this.getHistogram(key as unknown as MetricKey.Histogram) as any
      }
      if (key.keyType instanceof SummaryKey) {
        return this.getSummary(key as unknown as MetricKey.Summary) as any
      }
      throw new Error("Bug, unknown MetricKeyType")
    } else {
      return hook as any
    }
  }

  getCounter(key: MetricKey.Counter): MetricHook.Counter {
    let value = this.map.get(key).value
    if (value == null) {
      const updater = this.listener.unsafeUpdate(key)
      const counter = MetricHooks.counter(key).onUpdate(updater)
      if (!this.map.has(key)) {
        this.map.set(key, counter)
      }
      value = counter
    }
    return value as MetricHook.Counter
  }

  getGauge(key: MetricKey.Gauge): MetricHook.Gauge {
    let value = this.map.get(key).value
    if (value == null) {
      const updater = this.listener.unsafeUpdate(key)
      const gauge = MetricHooks.gauge(key, 0).onUpdate(updater)
      if (!this.map.has(key)) {
        this.map.set(key, gauge)
      }
      value = gauge
    }
    return value as MetricHook.Gauge
  }

  getFrequency(key: MetricKey.Frequency): MetricHook.Frequency {
    let value = this.map.get(key).value
    if (value == null) {
      const updater = this.listener.unsafeUpdate(key)
      const frequency = MetricHooks.frequency(key).onUpdate(updater)
      if (!this.map.has(key)) {
        this.map.set(key, frequency)
      }
      value = frequency
    }
    return value as MetricHook.Frequency
  }

  getHistogram(key: MetricKey.Histogram): MetricHook.Histogram {
    let value = this.map.get(key).value
    if (value == null) {
      const updater = this.listener.unsafeUpdate(key)
      const histogram = MetricHooks.histogram(key).onUpdate(updater)
      if (!this.map.has(key)) {
        this.map.set(key, histogram)
      }
      value = histogram
    }
    return value as MetricHook.Histogram
  }

  getSummary(key: MetricKey.Summary): MetricHook.Summary {
    let value = this.map.get(key).value
    if (value == null) {
      const updater = this.listener.unsafeUpdate(key)
      const summary = MetricHooks.summary(key).onUpdate(updater)
      if (!this.map.has(key)) {
        this.map.set(key, summary)
      }
      value = summary
    }
    return value as MetricHook.Summary
  }
}
