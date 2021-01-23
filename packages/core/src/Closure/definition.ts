/**
 * Base combine
 */
export interface Closure<A> {
  combine(r: A): (l: A) => A
}
