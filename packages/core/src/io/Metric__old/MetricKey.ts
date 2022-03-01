import { Chunk } from "../../collection/immutable/Chunk"
import * as St from "../../prelude/Structural"
import type { Boundaries } from "./Boundaries"
import { MetricLabel } from "./MetricLabel"

export const MetricKeySym = Symbol.for("@effect-ts/core/Metric/MetricKey")

export type MetricKeySym = typeof MetricKeySym

/**
 * A `MetricKey` is a unique key associated with each metric. The key is based
 * on a combination of the metric type, the name and labels associated with the
 * metric, and any other information to describe a a metric, such as the
 * boundaries of a histogram. In this way, it is impossible to ever create
 * metrics with conflicting keys.
 */
export type MetricKey = Counter | Gauge | Histogram | Summary | SetCount

export class Counter implements St.HasHash, St.HasEquals {
  readonly _tag = "Counter";

  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this.name),
      St.combineHash(St.hashString(this._tag), this.tags[St.hashSym])
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isMetricKey(that) && that._tag === "Counter" && St.equals(this, that)
  }
}

export class Gauge implements St.HasHash, St.HasEquals {
  readonly _tag = "Gauge";

  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this.name),
      St.combineHash(St.hashString(this._tag), this.tags[St.hashSym])
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isMetricKey(that) && that._tag === "Gauge" && St.equals(this, that)
  }
}

export class Histogram implements St.HasHash, St.HasEquals {
  readonly _tag = "Histogram";

  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly boundaries: Boundaries,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.combineHash(St.hashString(this._tag), St.hashString(this.name)),
      St.combineHash(this.boundaries[St.hashSym], this.tags[St.hashSym])
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isMetricKey(that) && that._tag === "Histogram" && St.equals(this, that)
  }
}

export class Summary implements St.HasHash, St.HasEquals {
  readonly _tag = "Summary";

  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly maxAge: Date,
    readonly maxSize: number,
    readonly error: number,
    readonly quantiles: Chunk<number>,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hashString(this.name),
        St.combineHash(
          St.hashObject(this.maxAge),
          St.combineHash(
            St.hashNumber(this.maxSize),
            St.combineHash(
              St.hashNumber(this.error),
              St.combineHash(this.quantiles[St.hashSym], this.tags[St.hashSym])
            )
          )
        )
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isMetricKey(that) && that._tag === "Histogram" && St.equals(this, that)
  }
}

export class SetCount implements St.HasHash, St.HasEquals {
  readonly _tag = "SetCount";

  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly setTag: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  counterKey(word: string): Counter {
    return new Counter(this.name, this.tags.prepend(new MetricLabel(this.setTag, word)))
  }

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hashString(this.name),
        St.combineHash(St.hashString(this.setTag), this.tags[St.hashSym])
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return isMetricKey(that) && that._tag === "SetCount" && St.equals(this, that)
  }
}

export function isMetricKey(u: unknown): u is MetricKey {
  return typeof u === "object" && u != null && MetricKeySym in u
}
