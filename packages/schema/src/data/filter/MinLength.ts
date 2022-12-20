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
export const id = "@fp-ts/schema/data/filter/MinLength"

/**
 * @since 1.0.0
 */
export interface Config {
  readonly _id: typeof id
  readonly minLength: number
}

/**
 * @since 1.0.0
 */
export const schema = (
  minLength: number
): <A extends { length: number }>(self: Schema<A>) => Schema<A> =>
  filter(
    (config: Config) =>
      (a: { length: number }) =>
        a.length >= config.minLength ? I.success(a) : I.failure(DE.minLength(config.minLength, a))
  )({ _id: id, minLength })
