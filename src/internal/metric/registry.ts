import { pipe } from "../../exports/Function.js"
import { HashSet } from "../../exports/HashSet.js"
import type { MetricHook } from "../../exports/MetricHook.js"
import type { MetricKey } from "../../exports/MetricKey.js"
import type { MetricKeyType } from "../../exports/MetricKeyType.js"
import type { MetricPair } from "../../exports/MetricPair.js"
import type { MetricRegistry } from "../../exports/MetricRegistry.js"
import { MutableHashMap } from "../../exports/MutableHashMap.js"
import { Option } from "../../exports/Option.js"
import * as metricHook from "./hook.js"
import * as metricKeyType from "./keyType.js"
import * as metricPair from "./pair.js"

/** @internal */
const MetricRegistrySymbolKey = "effect/MetricRegistry"

/** @internal */
export const MetricRegistryTypeId: MetricRegistry.MetricRegistryTypeId = Symbol.for(
  MetricRegistrySymbolKey
) as MetricRegistry.MetricRegistryTypeId

/** @internal */
class MetricRegistryImpl implements MetricRegistry {
  readonly [MetricRegistryTypeId]: MetricRegistry.MetricRegistryTypeId = MetricRegistryTypeId

  private map = MutableHashMap.empty<
    MetricKey<MetricKeyType.Untyped>,
    MetricHook.Root
  >()

  snapshot(): HashSet<MetricPair.Untyped> {
    const result: Array<MetricPair.Untyped> = []
    for (const [key, hook] of this.map) {
      result.push(metricPair.unsafeMake(key, hook.get()))
    }
    return HashSet.fromIterable(result)
  }

  get<Type extends MetricKeyType<any, any>>(
    key: MetricKey<Type>
  ): MetricHook<
    MetricKeyType.InType<typeof key["keyType"]>,
    MetricKeyType.OutType<typeof key["keyType"]>
  > {
    const hook = pipe(
      this.map,
      MutableHashMap.get(key as MetricKey<MetricKeyType.Untyped>),
      Option.getOrUndefined
    )
    if (hook == null) {
      if (metricKeyType.isCounterKey(key.keyType)) {
        return this.getCounter(key as unknown as MetricKey.Counter<any>) as any
      }
      if (metricKeyType.isGaugeKey(key.keyType)) {
        return this.getGauge(key as unknown as MetricKey.Gauge<any>) as any
      }
      if (metricKeyType.isFrequencyKey(key.keyType)) {
        return this.getFrequency(key as unknown as MetricKey.Frequency) as any
      }
      if (metricKeyType.isHistogramKey(key.keyType)) {
        return this.getHistogram(key as unknown as MetricKey.Histogram) as any
      }
      if (metricKeyType.isSummaryKey(key.keyType)) {
        return this.getSummary(key as unknown as MetricKey.Summary) as any
      }
      throw new Error(
        "BUG: MetricRegistry.get - unknown MetricKeyType - please report an issue at https://github.com/Effect-TS/io/issues"
      )
    } else {
      return hook as any
    }
  }

  getCounter<A extends (number | bigint)>(key: MetricKey.Counter<A>): MetricHook.Counter<A> {
    let value = pipe(
      this.map,
      MutableHashMap.get(key as MetricKey<MetricKeyType.Untyped>),
      Option.getOrUndefined
    )
    if (value == null) {
      const counter = metricHook.counter(key)
      if (!pipe(this.map, MutableHashMap.has(key as MetricKey<MetricKeyType.Untyped>))) {
        pipe(
          this.map,
          MutableHashMap.set(
            key as MetricKey<MetricKeyType.Untyped>,
            counter as MetricHook.Root
          )
        )
      }
      value = counter
    }
    return value as MetricHook.Counter<A>
  }

  getFrequency(key: MetricKey.Frequency): MetricHook.Frequency {
    let value = pipe(
      this.map,
      MutableHashMap.get(key as MetricKey<MetricKeyType.Untyped>),
      Option.getOrUndefined
    )
    if (value == null) {
      const frequency = metricHook.frequency(key)
      if (!pipe(this.map, MutableHashMap.has(key as MetricKey<MetricKeyType.Untyped>))) {
        pipe(
          this.map,
          MutableHashMap.set(
            key as MetricKey<MetricKeyType.Untyped>,
            frequency as MetricHook.Root
          )
        )
      }
      value = frequency
    }
    return value as MetricHook.Frequency
  }

  getGauge<A extends (number | bigint)>(key: MetricKey.Gauge<A>): MetricHook.Gauge<A> {
    let value = pipe(
      this.map,
      MutableHashMap.get(key as MetricKey<MetricKeyType.Untyped>),
      Option.getOrUndefined
    )
    if (value == null) {
      const gauge = metricHook.gauge(key as any, key.keyType.bigint ? BigInt(0) as any : 0)
      if (!pipe(this.map, MutableHashMap.has(key as MetricKey<MetricKeyType.Untyped>))) {
        pipe(
          this.map,
          MutableHashMap.set(
            key as MetricKey<MetricKeyType.Untyped>,
            gauge as MetricHook.Root
          )
        )
      }
      value = gauge
    }
    return value as MetricHook.Gauge<A>
  }

  getHistogram(key: MetricKey.Histogram): MetricHook.Histogram {
    let value = pipe(
      this.map,
      MutableHashMap.get(key as MetricKey<MetricKeyType.Untyped>),
      Option.getOrUndefined
    )
    if (value == null) {
      const histogram = metricHook.histogram(key)
      if (!pipe(this.map, MutableHashMap.has(key as MetricKey<MetricKeyType.Untyped>))) {
        pipe(
          this.map,
          MutableHashMap.set(
            key as MetricKey<MetricKeyType.Untyped>,
            histogram as MetricHook.Root
          )
        )
      }
      value = histogram
    }
    return value as MetricHook.Histogram
  }

  getSummary(key: MetricKey.Summary): MetricHook.Summary {
    let value = pipe(
      this.map,
      MutableHashMap.get(key as MetricKey<MetricKeyType.Untyped>),
      Option.getOrUndefined
    )
    if (value == null) {
      const summary = metricHook.summary(key)
      if (!pipe(this.map, MutableHashMap.has(key as MetricKey<MetricKeyType.Untyped>))) {
        pipe(
          this.map,
          MutableHashMap.set(
            key as MetricKey<MetricKeyType.Untyped>,
            summary as MetricHook.Root
          )
        )
      }
      value = summary
    }
    return value as MetricHook.Summary
  }
}

/** @internal */
export const make = (): MetricRegistry => {
  return new MetricRegistryImpl()
}
