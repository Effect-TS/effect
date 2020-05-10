/**
 * @since 2.0.0
 */
export function tuple<T extends ReadonlyArray<any>>(...t: T): T {
  return t
}
