/**
 * @since 1.0.0
 */
import { Closure } from "../Closure"

/**
 * The `Associative[A]` type class describes an associative binary operator
 * for a type `A`. For example, addition for integers, and string
 * concatenation for strings.
 *
 * @since 1.0.0
 */
export interface Associative<A> extends Closure<A> {}

/**
 * @since 1.0.0
 */
export const makeAssociative = <A>(f: (r: A) => (l: A) => A): Associative<A> => ({
  combine: f
})
