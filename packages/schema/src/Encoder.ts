/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export interface Encoder<out O, in out A> extends Schema<A> {
  readonly encode: (value: A) => O
}
