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
export const id = Symbol.for("@fp-ts/schema/data/filter/Int")

/**
 * @since 1.0.0
 */
export const schema: <A extends number>(self: Schema<A>) => Schema<A> = filter(
  id,
  (n: number) => Number.isInteger(n) ? I.success(n) : I.failure(DE.notType("int", n))
)
