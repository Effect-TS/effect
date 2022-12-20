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
export const id = "@fp-ts/schema/data/filter/LessThanOrEqualTo"

/**
 * @since 1.0.0
 */
export interface Config {
  readonly _id: typeof id
  readonly max: number
}

/**
 * @since 1.0.0
 */
export const schema = (max: number): <A extends number>(self: Schema<A>) => Schema<A> =>
  filter(
    (config: Config) =>
      (n: number) => n <= config.max ? I.success(n) : I.failure(DE.lessThanOrEqualTo(config.max, n))
  )({ _id: id, max })
