/**
 * @since 1.0.0
 */

import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const schema = <A extends number>(self: Schema<A>): Schema<A> =>
  I.refinement(self, (a): a is A => Number.isFinite(a), { type: "Finite" }, [])
