/**
 * Query-string helpers shared by the Router and the server render, for the URL
 * a resolved route is replaced with.
 *
 * @internal
 */
import type * as Route from "../Route.ts"

/** The decoded key of a raw `key=value` query pair, or `undefined` if it isn't valid percent-encoding. */
const decodeKey = (pair: string): string | undefined => {
  const at = pair.indexOf("=")
  try {
    return decodeURIComponent((at < 0 ? pair : pair.slice(0, at)).replaceAll("+", " "))
  } catch {
    return undefined
  }
}

/**
 * The raw query pairs of `url` whose keys aren't in `keys`, as written and in order.
 *
 * @internal
 */
export const pairsWithout = (url: string, keys: ReadonlySet<string>): ReadonlyArray<string> => {
  const at = url.indexOf("?")
  if (at < 0) return []
  return url.slice(at + 1).split("&").filter((pair) => {
    const key = decodeKey(pair)
    return pair !== "" && (key === undefined || !keys.has(key))
  })
}

/**
 * The URL with the raw `pairs` appended to its query.
 *
 * @internal
 */
export const withPairs = (url: string, pairs: ReadonlyArray<string>): string =>
  pairs.length === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}${pairs.join("&")}`

/**
 * The URL a resolved one is replaced with, on the server and in the Router: a redirect or a
 * trailing slash becomes the printed route, and query params dropped as invalid are removed, the
 * others kept as written. Anything else keeps its URL.
 *
 * @internal
 */
export const canonical = (
  routes: Route.AnyUnion,
  resolved: Route.Resolved<{ readonly _tag: string }>,
  url: string
): string => {
  if (resolved.redirected) return routes.print(resolved.route)
  const at = url.indexOf("?")
  if (at < 0 || resolved.invalid.length === 0) return url
  return withPairs(url.slice(0, at), pairsWithout(url, new Set(resolved.invalid)))
}
