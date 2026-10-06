/** @internal */
export const rpcSystemName = "effect_rpc"

/**
 * Follows the OpenTelemetry RPC conventions: the span is named after
 * `rpc.method` unless a `spanPrefix` was explicitly configured.
 *
 * @internal
 */
export const spanName = (spanPrefix: string | undefined, tag: string): string =>
  spanPrefix === undefined ? tag : `${spanPrefix}.${tag}`

/**
 * Returns a lookup of span attributes per rpc tag, merged once and cached.
 *
 * @internal
 */
export const makeSpanAttributes = (
  userAttributes: Record<string, unknown> | undefined
): (tag: string) => Record<string, unknown> => {
  const cache = new Map<string, Record<string, unknown>>()
  return (tag) => {
    let attributes = cache.get(tag)
    if (attributes === undefined) {
      attributes = { "rpc.system.name": rpcSystemName, "rpc.method": tag, ...userAttributes }
      cache.set(tag, attributes)
    }
    return attributes
  }
}
