/**
 * @since 1.0.0
 */

import { filter } from "@fp-ts/schema/data/filter"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = "@fp-ts/schema/data/filter/GreaterThan"

/**
 * @since 1.0.0
 */
export interface Config {
  readonly _id: typeof id
  readonly min: number
}

/**
 * @since 1.0.0
 */
export const schema = (min: number): <A extends number>(self: Schema<A>) => Schema<A> =>
  filter(
    (config: Config) =>
      (n: number) => n > config.min ? I.success(n) : I.failure(DE.greaterThan(config.min, n))
  )({ _id: id, min })
