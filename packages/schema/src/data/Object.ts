/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as I from "@fp-ts/schema/internal/common"
import type { AnnotationOptions, Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(
  constructor: A,
  annotationOptions?: AnnotationOptions<object>
) =>
  (self: Schema<object>): Schema<InstanceType<A>> =>
    pipe(
      self,
      I.filter(
        (a): a is InstanceType<A> => a instanceof constructor,
        {
          description: `an instance of ${constructor.name}`,
          custom: { type: "instanceOf", instanceOf: constructor },
          ...annotationOptions
        }
      )
    )
