/**
 * @since 1.0.0
 */

import { jsonSchemaAnnotation } from "@fp-ts/schema/annotation/JSONSchemaAnnotation"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const schema = (
  startsWith: string
) =>
  <A extends string>(self: Schema<A>): Schema<A> =>
    I.refinement(
      self,
      (s) =>
        s.startsWith(startsWith) ?
          I.success(s) :
          I.failure(DE.startsWith(startsWith, s)),
      [
        jsonSchemaAnnotation({ startsWith })
      ]
    )
