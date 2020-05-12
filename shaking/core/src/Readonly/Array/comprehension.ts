import { chain_ } from "./chain_"
import { empty } from "./empty"
import { snoc } from "./snoc"

/**
 * Array comprehension
 *
 * ```
 * [ f(x, y, ...) | x ← xs, y ← ys, ..., g(x, y, ...) ]
 * ```
 *
 * @example
 * import { comprehension } from 'fp-ts/lib/ReadonlyArray'
 * import { tuple } from 'fp-ts/lib/function'
 *
 * assert.deepStrictEqual(comprehension([[1, 2, 3], ['a', 'b']], tuple, (a, b) => (a + b.length) % 2 === 0), [
 *   [1, 'a'],
 *   [1, 'b'],
 *   [3, 'a'],
 *   [3, 'b']
 * ])
 *
 * @since 2.5.0
 */
export function comprehension<A, B, C, D, R>(
  input: readonly [
    ReadonlyArray<A>,
    ReadonlyArray<B>,
    ReadonlyArray<C>,
    ReadonlyArray<D>
  ],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, C, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): ReadonlyArray<R>
export function comprehension<A, R>(
  input: readonly [ReadonlyArray<A>],
  f: (a: A) => R,
  g?: (a: A) => boolean
): ReadonlyArray<R>
export function comprehension<A, B, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): ReadonlyArray<R>
export function comprehension<A, R>(
  input: readonly [ReadonlyArray<A>],
  f: (a: A) => boolean,
  g?: (a: A) => R
): ReadonlyArray<R>
export function comprehension<R>(
  input: ReadonlyArray<ReadonlyArray<any>>,
  f: (...xs: ReadonlyArray<any>) => R,
  g: (...xs: ReadonlyArray<any>) => boolean = () => true
): ReadonlyArray<R> {
  const go = (
    scope: ReadonlyArray<any>,
    input: ReadonlyArray<ReadonlyArray<any>>
  ): ReadonlyArray<R> => {
    if (input.length === 0) {
      return g(...scope) ? [f(...scope)] : empty
    } else {
      return chain_(input[0], (x) => go(snoc(scope, x), input.slice(1)))
    }
  }
  return go(empty, input)
}
