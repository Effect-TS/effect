/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as I from "@effect/schema/internal/common"
import type { AnnotationOptions, Schema } from "@effect/schema/Schema"

/**
 * @since 1.0.0
 */
export const InstanceOfTypeId = "@effect/schema/data/Object/InstanceOfTypeId"

/**
 * @since 1.0.0
 */
export const instanceOf = <A extends abstract new(...args: any) => any>(
  constructor: A,
  annotationOptions?: AnnotationOptions<object>
): Schema<InstanceType<A>> =>
  pipe(
    I.object,
    I.filter(
      (a): a is InstanceType<A> => a instanceof constructor,
      {
        typeId: { id: InstanceOfTypeId, params: { constructor } },
        description: `an instance of ${constructor.name}`,
        ...annotationOptions
      }
    )
  )
