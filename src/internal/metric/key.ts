import type { Chunk } from "../../exports/Chunk.js"
import type { Duration } from "../../exports/Duration.js"
import { Equal } from "../../exports/Equal.js"
import { dual, pipe } from "../../exports/Function.js"
import { Hash } from "../../exports/Hash.js"
import { HashSet } from "../../exports/HashSet.js"
import type { MetricBoundaries } from "../../exports/MetricBoundaries.js"
import type { MetricKey } from "../../exports/MetricKey.js"
import type { MetricKeyType } from "../../exports/MetricKeyType.js"
import type { MetricLabel } from "../../exports/MetricLabel.js"
import { Option } from "../../exports/Option.js"
import { pipeArguments } from "../../exports/Pipeable.js"
import { hasProperty } from "../../exports/Predicate.js"
import * as metricKeyType from "./keyType.js"
import * as metricLabel from "./label.js"

/** @internal */
const MetricKeySymbolKey = "effect/MetricKey"

/** @internal */
export const MetricKeyTypeId: MetricKey.MetricKeyTypeId = Symbol.for(
  MetricKeySymbolKey
) as MetricKey.MetricKeyTypeId

/** @internal */
const metricKeyVariance = {
  _Type: (_: never) => _
}

/** @internal */
class MetricKeyImpl<Type extends MetricKeyType<any, any>> implements MetricKey<Type> {
  readonly [MetricKeyTypeId] = metricKeyVariance
  constructor(
    readonly name: string,
    readonly keyType: Type,
    readonly description: Option<string>,
    readonly tags: HashSet<MetricLabel> = HashSet.empty()
  ) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(this.name),
      Hash.combine(Hash.hash(this.keyType)),
      Hash.combine(Hash.hash(this.description)),
      Hash.combine(Hash.hash(this.tags))
    )
  }
  [Equal.symbol](u: unknown): boolean {
    return isMetricKey(u) &&
      this.name === u.name &&
      Equal.equals(this.keyType, u.keyType) &&
      Equal.equals(this.description, u.description) &&
      Equal.equals(this.tags, u.tags)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isMetricKey = (u: unknown): u is MetricKey<MetricKeyType<unknown, unknown>> =>
  hasProperty(u, MetricKeyTypeId)

/** @internal */
export const counter: {
  (name: string, options?: {
    readonly description?: string
    readonly bigint?: false
    readonly incremental?: boolean
  }): MetricKey.Counter<number>
  (name: string, options: {
    readonly description?: string
    readonly bigint: true
    readonly incremental?: boolean
  }): MetricKey.Counter<bigint>
} = (name: string, options) =>
  new MetricKeyImpl(
    name,
    metricKeyType.counter(options as any),
    Option.fromNullable(options?.description)
  )

/** @internal */
export const frequency = (name: string, description?: string): MetricKey.Frequency =>
  new MetricKeyImpl(name, metricKeyType.frequency, Option.fromNullable(description))

/** @internal */
export const gauge: {
  (name: string, options?: {
    readonly description?: string
    readonly bigint?: false
  }): MetricKey.Gauge<number>
  (name: string, options: {
    readonly description?: string
    readonly bigint: true
  }): MetricKey.Gauge<bigint>
} = (name, options) =>
  new MetricKeyImpl(
    name,
    metricKeyType.gauge(options as any),
    Option.fromNullable(options?.description)
  )

/** @internal */
export const histogram = (
  name: string,
  boundaries: MetricBoundaries,
  description?: string
): MetricKey.Histogram =>
  new MetricKeyImpl(
    name,
    metricKeyType.histogram(boundaries),
    Option.fromNullable(description)
  )

/** @internal */
export const summary = (
  options: {
    readonly name: string
    readonly maxAge: Duration.DurationInput
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk<number>
    readonly description?: string
  }
): MetricKey.Summary =>
  new MetricKeyImpl(
    options.name,
    metricKeyType.summary(options),
    Option.fromNullable(options.description)
  )

/** @internal */
export const tagged = dual<
  (
    key: string,
    value: string
  ) => <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>
  ) => MetricKey<Type>,
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    key: string,
    value: string
  ) => MetricKey<Type>
>(3, (self, key, value) => taggedWithLabelSet(self, HashSet.make(metricLabel.make(key, value))))

/** @internal */
export const taggedWithLabels = dual<
  (
    extraTags: Iterable<MetricLabel>
  ) => <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>
  ) => MetricKey<Type>,
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: Iterable<MetricLabel>
  ) => MetricKey<Type>
>(2, (self, extraTags) => taggedWithLabelSet(self, HashSet.fromIterable(extraTags)))

/** @internal */
export const taggedWithLabelSet = dual<
  (
    extraTags: HashSet<MetricLabel>
  ) => <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>
  ) => MetricKey<Type>,
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: HashSet<MetricLabel>
  ) => MetricKey<Type>
>(2, (self, extraTags) =>
  HashSet.size(extraTags) === 0
    ? self
    : new MetricKeyImpl(self.name, self.keyType, self.description, pipe(self.tags, HashSet.union(extraTags))))
