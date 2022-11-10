/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export interface Encoder<out O, in A> {
  readonly encode: (value: A) => O
}
