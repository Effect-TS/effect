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
export const id = "@fp-ts/schema/data/filter/MaxLength"

/**
 * @since 1.0.0
 */
export interface Config {
  readonly _id: typeof id
  readonly maxLength: number
}

/**
 * @since 1.0.0
 */
export const schema = (
  maxLength: number
): <A extends { length: number }>(self: Schema<A>) => Schema<A> =>
  filter(
    (config: Config) =>
      (a: { length: number }) =>
        a.length <= config.maxLength ? I.success(a) : I.failure(DE.maxLength(config.maxLength, a))
  )({ _id: id, maxLength })
