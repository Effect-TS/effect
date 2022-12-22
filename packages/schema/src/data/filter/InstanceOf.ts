/**
 * @since 1.0.0
 */

import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export abstract class Class {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(..._: Array<any>) {}
}

/**
 * @since 1.0.0
 */
export const schema = <A extends typeof Class>(constructor: A) =>
  (self: Schema<object>): Schema<InstanceType<A>> =>
    I.refinement(self, (a): a is InstanceType<A> => a instanceof constructor, {
      instanceof: constructor
    }, [])
