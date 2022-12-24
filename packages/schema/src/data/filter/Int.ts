/**
 * @since 1.0.0
 */

import {
  jsonSchemaAnnotation,
  JSONSchemaAnnotationId
} from "@fp-ts/schema/annotation/JSONSchemaAnnotation"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const int = <A extends number>(self: Schema<A>): Schema<A> =>
  I.refinement(self, (a): a is A => Number.isInteger(a), { type: "integer" }, {
    [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ type: "integer" })
  })
