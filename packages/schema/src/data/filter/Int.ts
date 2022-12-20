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
export const id = "@fp-ts/schema/data/filter/Int"

/**
 * @since 1.0.0
 */
export interface Config {
  readonly _id: typeof id
}

/**
 * @since 1.0.0
 */
export const schema: <A extends number>(self: Schema<A>) => Schema<A> = filter(
  (_config: Config) =>
    (n: number) => Number.isInteger(n) ? I.success(n) : I.failure(DE.notType("Int", n))
)({ _id: id })
