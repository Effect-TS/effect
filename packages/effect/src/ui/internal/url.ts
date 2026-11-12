/** The decoded key of a raw `key=value` query pair, or `undefined` if it isn't valid percent-encoding. */
export const decodeKey = (pair: string): string | undefined => {
  const at = pair.indexOf("=")
  try {
    return decodeURIComponent((at < 0 ? pair : pair.slice(0, at)).replaceAll("+", " "))
  } catch {
    return undefined
  }
}

/** The URL without the query params under `keys`, the others kept as written. */
export const withoutParams = (url: string, keys: ReadonlySet<string>): string => {
  const at = url.indexOf("?")
  if (at < 0) return url
  const kept = url.slice(at + 1).split("&").filter((pair) => {
    const key = decodeKey(pair)
    return pair !== "" && (key === undefined || !keys.has(key))
  })
  return kept.length === 0 ? url.slice(0, at) : `${url.slice(0, at)}?${kept.join("&")}`
}
