/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export interface Encoder<out Whole, in A> {
  readonly encode: (value: A) => Whole
}
