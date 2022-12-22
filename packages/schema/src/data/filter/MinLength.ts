/**
 * @since 1.0.0
 */

import { jsonSchemaAnnotation } from "@fp-ts/schema/annotation/JSONSchemaAnnotation"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const schema = (
  minLength: number
) =>
  <A extends { length: number }>(self: Schema<A>): Schema<A> =>
    I.refinement(self, (a): a is A => a.length >= minLength, { minLength }, [
      jsonSchemaAnnotation({ minLength })
    ])
