/**
 * The comment markers around each instance's nodes in server HTML:
 * `<!--[path-->` and `<!--]path-->`. A path is escaped so it can't end the
 * comment early.
 */

const escapes: Record<string, string> = { "%": "%25", "-": "%2D", "<": "%3C", ">": "%3E" }
const unescapes: Record<string, string> = { "%25": "%", "%2D": "-", "%3C": "<", "%3E": ">" }

/** @internal */
export const open = (path: string): string => `<!--[${escape(path)}-->`

/** @internal */
export const close = (path: string): string => `<!--]${escape(path)}-->`

const escape = (path: string): string => path.replace(/[%<>-]/g, (char) => escapes[char]!)

/**
 * Reads a comment's data as a marker.
 *
 * @internal
 */
export const parse = (data: string): { readonly _tag: "Open" | "Close"; readonly path: string } | undefined => {
  const kind = data[0] === "[" ? "Open" : data[0] === "]" ? "Close" : undefined
  if (kind === undefined) return undefined
  return { _tag: kind, path: data.slice(1).replace(/%(?:25|2D|3C|3E)/g, (code) => unescapes[code]!) }
}
