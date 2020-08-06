/**
 * @category definitions
 */

export interface Closure<A> {
  combine(l: A, r: A): A
}

export const make = <A>(f: (l: A, r: A) => A): Closure<A> => ({ combine: f })
