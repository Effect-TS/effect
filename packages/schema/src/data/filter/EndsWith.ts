/**
 * @since 1.0.0
 */

import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const schema = (endsWith: string) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.refinement(self, (a): a is A => a.endsWith(endsWith), { endsWith })
