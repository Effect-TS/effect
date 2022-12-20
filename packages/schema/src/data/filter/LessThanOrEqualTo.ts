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
export const schema = (max: number): <A extends number>(self: Schema<A>) => Schema<A> =>
  filter(
    (n: number) => n <= max ? I.success(n) : I.failure(DE.lessThanOrEqualTo(max, n))
  )
