// ets_tracing: off

/**
 * @ets_optimize identity
 */
export function instance<T>(_: Omit<T, `_${any}`>): T {
  return _ as any
}
