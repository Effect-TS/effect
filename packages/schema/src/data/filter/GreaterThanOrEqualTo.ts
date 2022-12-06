/**
 * @since 1.0.0
 */

import { filterWith } from "@fp-ts/schema/data/filterWith"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/filter/GreaterThanOrEqualTo")

/**
 * @since 1.0.0
 */
export const schema: (min: number) => <A extends number>(self: Schema<A>) => Schema<A> = filterWith(
  id,
  (min: number) =>
    (n: number) => n >= min ? I.success(n) : I.failure(DE.greaterThanOrEqualTo(min, n))
)
