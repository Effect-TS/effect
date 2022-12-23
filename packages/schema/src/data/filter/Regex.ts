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
export const schema = (
  regex: RegExp
) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.refinement(self, (a): a is A => regex.test(a), { pattern: regex.toString() }, {
      [JSONSchemaAnnotationId]: jsonSchemaAnnotation({ pattern: regex.toString() })
    })
