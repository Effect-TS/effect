/* adapted from https://github.com/gcanti/fp-ts */

export interface Magma<A> {
  readonly concat: (x: A, y: A) => A
}
