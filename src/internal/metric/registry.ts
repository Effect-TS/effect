import { pipe } from "../../Function"
import * as HashSet from "../../HashSet"
import * as metricHook from "../../internal/metric/hook"
import * as metricKeyType from "../../internal/metric/keyType"
import * as metricPair from "../../internal/metric/pair"
import type * as MetricHook from "../../MetricHook"
import type * as MetricKey from "../../MetricKey"
import type * as MetricKeyType from "../../MetricKeyType"
import type * as MetricPair from "../../MetricPair"
import type * as MetricRegistry from "../../MetricRegistry"
import * as MutableHashMap from "../../MutableHashMap"
import * as Option from "../../Option"

/** @internal */
const MetricRegistrySymbolKey = "effect/MetricRegistry"

/** @internal */
export const MetricRegistryTypeId: MetricRegistry.MetricRegistryTypeId = Symbol.for(
  MetricRegistrySymbolKey
) as MetricRegistry.MetricRegistryTypeId

/** @internal */
class MetricRegistryImpl implements MetricRegistry.MetricRegistry {
  readonly [MetricRegistryTypeId]: MetricRegistry.MetricRegistryTypeId = MetricRegistryTypeId

  private readonly map = MutableHashMap.empty<
    MetricKey.MetricKey<MetricKeyType.MetricKeyType.Untyped>,
    MetricHook.MetricHook.Root
  >()

  snapshot(): HashSet.HashSet<MetricPair.MetricPair.Untyped> {
    const result: Array<MetricPair.MetricPair.Untyped> = []
    for (const [key, hook] of this.map) {
      result.push(metricPair.unsafeMake(key, hook.get()))
    }
    return HashSet.fromIterable(result)
  }

  get<Type extends MetricKeyType.MetricKeyType<any, any>>(
    key: MetricKey.MetricKey<Type>
  ): MetricHook.MetricHook<
    MetricKeyType.MetricKeyType.InType<typeof key["keyType"]>,
    MetricKeyType.MetricKeyType.OutType<typeof key["keyType"]>
  > {
    const hook = pipe(
      this.map,
      MutableHashMap.get(key as MetricKey.MetricKey<MetricKeyType.MetricKeyType.Untyped>),
      Option.getOrUndefined
    )
    if (hook == null) {
      if (metricKeyType.isCounterKey(key.keyType)) {
        return this.getCounter(key as unknown as MetricKey.MetricKey.Counter) as any
      }
      if (metricKeyType.isBigintCounterKey(key.keyType)) {
        return this.getBigintCounter(key as unknown as MetricKey.MetricKey.BigintCounter) as any
      }
      if (metricKeyType.isGaugeKey(key.keyType)) {
        return this.getGauge(key as unknown as MetricKey.MetricKey.Gauge) as any
      }
      if (metricKeyType.isBigintGaugeKey(key.keyType)) {
        return this.getBigintGauge(key as unknown as MetricKey.MetricKey.BigintGauge) as any
      }
      if (metricKeyType.isFrequencyKey(key.keyType)) {
        return this.getFrequency(key as unknown as MetricKey.MetricKey.Frequency) as any
      }
      if (metricKeyType.isHistogramKey(key.keyType)) {
        return this.getHistogram(key as unknown as MetricKey.MetricKey.Histogram) as any
      }
      if (metricKeyType.isSummaryKey(key.keyType)) {
        return this.getSummary(key as unknown as MetricKey.MetricKey.Summary) as any
      }
      throw new Error(
        "BUG: MetricRegistry.get - unknown MetricKeyType - please report an issue at https://github.com/Effect-TS/io/issues"
      )
    } else {
      return hook as any
    }
  }

  getCounter = makeGet(this.map, (_) => metricHook.counter(_))
  getBigintCounter = makeGet(this.map, (_) => metricHook.bigintCounter(_))
  getFrequency = makeGet(this.map, (_) => metricHook.frequency(_))
  getGauge = makeGet(this.map, (_) => metricHook.gauge(_, 0))
  getBigintGauge = makeGet(this.map, (_) => metricHook.bigintGauge(_, BigInt(0)))
  getHistogram = makeGet(this.map, (_) => metricHook.histogram(_))
  getSummary = makeGet(this.map, (_) => metricHook.summary(_))
}

/** @internal */
const makeGet = <Hook extends MetricHook.MetricHook<any, any>, Key extends MetricKey.MetricKey<any>>(
  map: MutableHashMap.MutableHashMap<
    MetricKey.MetricKey<MetricKeyType.MetricKeyType.Untyped>,
    MetricHook.MetricHook.Root
  >,
  fn: (key: Key) => Hook
) =>
(key: Key): Hook => {
  let value = pipe(
    map,
    MutableHashMap.get(key as MetricKey.MetricKey<MetricKeyType.MetricKeyType.Untyped>),
    Option.getOrUndefined
  )
  if (value == null) {
    const val = fn(key)
    if (!pipe(map, MutableHashMap.has(key as MetricKey.MetricKey<MetricKeyType.MetricKeyType.Untyped>))) {
      pipe(
        map,
        MutableHashMap.set(
          key as MetricKey.MetricKey<MetricKeyType.MetricKeyType.Untyped>,
          val as MetricHook.MetricHook.Root
        )
      )
    }
    value = val
  }

  return value as Hook
}

/** @internal */
export const make = (): MetricRegistry.MetricRegistry => {
  return new MetricRegistryImpl()
}
