/**
 * Flips the order of the arguments of a function of two arguments.
 *
 * @since 2.0.0
 */
export function flip<A, B, C>(f: (a: A, b: B) => C): (b: B, a: A) => C {
  return (b, a) => f(a, b)
}
