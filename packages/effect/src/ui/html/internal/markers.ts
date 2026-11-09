/**
 * The comment markers around each instance's nodes in server HTML:
 * `<!--[path-->` and `<!--]path-->`.
 *
 * A path is escaped so it can't end the comment early, and so it reads back
 * exactly after HTML parsing: the parser turns CR and CRLF into LF and NUL
 * into U+FFFD, and a lone surrogate can't be encoded as UTF-8. Those
 * characters, the other C0 controls and DEL are written as `%XX` or `%uXXXX`.
 */

// The control characters are what must be escaped.
// oxlint-disable-next-line no-control-regex
const unsafe = /[%<>\-\u0000-\u001f\u007f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g

const hex = (code: number, width: number): string => code.toString(16).toUpperCase().padStart(width, "0")

const escape = (path: string): string =>
  path.replace(unsafe, (char) => {
    const code = char.charCodeAt(0)
    return code < 0x100 ? `%${hex(code, 2)}` : `%u${hex(code, 4)}`
  })

/** @internal */
export const open = (path: string): string => `<!--[${escape(path)}-->`

/** @internal */
export const close = (path: string): string => `<!--]${escape(path)}-->`

/**
 * Reads a comment's data as a marker.
 *
 * @internal
 */
export const parse = (data: string): { readonly _tag: "Open" | "Close"; readonly path: string } | undefined => {
  const kind = data[0] === "[" ? "Open" : data[0] === "]" ? "Close" : undefined
  if (kind === undefined) return undefined
  return {
    _tag: kind,
    path: data.slice(1).replace(
      /%u([0-9A-F]{4})|%([0-9A-F]{2})/g,
      (_, wide: string | undefined, narrow: string | undefined) => String.fromCharCode(parseInt(wide ?? narrow!, 16))
    )
  }
}
