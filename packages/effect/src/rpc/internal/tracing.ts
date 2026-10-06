/** @internal */
export const rpcSystemName = "effect_rpc"

/**
 * Names the span after the RPC method, or `${spanPrefix}.${tag}` when a prefix
 * is configured.
 *
 * @internal
 */
export const spanName = (spanPrefix: string | undefined, tag: string): string =>
  spanPrefix === undefined ? tag : `${spanPrefix}.${tag}`

/**
 * Caches the span attributes for each RPC tag. User attributes override the
 * defaults.
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
