// tracing: off

/**
 * @optimize identity
 */
export function instance<T>(_: Omit<T, `_${any}`>): T {
  return _ as any
}
