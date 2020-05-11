/**
 * Use `eqStrict` instead
 *
 * @since 2.0.0
 * @deprecated
 */
export function strictEqual<A>(a: A, b: A): boolean {
  return a === b
}
