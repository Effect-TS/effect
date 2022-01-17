import * as Map from "../../Collections/Immutable/Map"
import type { Tag } from "../../Has"
import * as O from "../../Option"
import type { Logger } from "../definition"

// -----------------------------------------------------------------------------
// LoggerSet
// -----------------------------------------------------------------------------

export const LoggerSetInputSym = Symbol.for("@effect-ts/system/Logger/Set/Input")
export type LoggerSetInputSym = typeof LoggerSetInputSym

export const LoggerSetOutputSym = Symbol.for("@effect-ts/system/Logger/Set/Input")
export type LoggerSetOutputSym = typeof LoggerSetOutputSym

export class LoggerSet<A, B> {
  readonly [LoggerSetInputSym]: (_: A) => void;
  readonly [LoggerSetOutputSym]: (_: never) => B

  #cache: ReadonlyMap<PropertyKey, ReadonlySet<Logger<any, any>>> = Map.empty

  constructor(readonly map: ReadonlyMap<PropertyKey, Logger<any, B>>) {}

  getAll<C>(typeTag: Tag<C>): ReadonlySet<Logger<C, B>> {
    const result = Map.lookup_(this.#cache, typeTag.key)

    switch (result._tag) {
      case "None": {
        const set = new Set(
          Map.filterMapWithIndex_(this.map, (t, logger) =>
            t === typeTag.key ? O.some(logger) : O.none
          ).values()
        )

        this.#cache = Map.insert_(this.#cache, typeTag.key, set)

        return set
      }
      case "Some": {
        return result.value
      }
    }
  }
}
