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
export const id = Symbol.for("@fp-ts/schema/data/filter/maxLength")

/**
 * @since 1.0.0
 */
export const schema: (
  maxLength: number
) => <A extends { length: number }>(self: Schema<A>) => Schema<A> = filterWith(
  id,
  (maxLength: number) =>
    (a: { length: number }) =>
      a.length <= maxLength ? I.success(a) : I.failure(DE.maxLength(maxLength, a))
)
