/**
 * The small glob matcher the `documents` patterns use (EFF-1834 point 3):
 * `*`, `**`, `?` and `{a,b}`, matched against `/`-separated paths relative
 * to the config file.
 *
 * @internal
 */

export interface Glob {
  /** The leading directory segments without wildcards, e.g. `src/app` for `src/app/**\/*.graphql`. */
  readonly root: string
  readonly matches: (path: string) => boolean
}

const wildcard = /[*?{]/

const escapeRegExp = (char: string): string => /[.+^$()|[\]\\]/.test(char) ? `\\${char}` : char

/** Strips a leading `./`; patterns are always relative to the config file. */
const normalize = (pattern: string): string => pattern.replace(/^(?:\.\/)+/, "")

const toRegExpSource = (pattern: string): string => {
  let out = ""
  let i = 0
  let braces = 0
  while (i < pattern.length) {
    const char = pattern[i]!
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        const atSegmentStart = i === 0 || pattern[i - 1] === "/"
        if (atSegmentStart && pattern[i + 2] === "/") {
          out += "(?:[^/]+/)*"
          i += 3
          continue
        }
        out += ".*"
        i += 2
        continue
      }
      out += "[^/]*"
    } else if (char === "?") {
      out += "[^/]"
    } else if (char === "{") {
      braces++
      out += "(?:"
    } else if (char === "}" && braces > 0) {
      braces--
      out += ")"
    } else if (char === "," && braces > 0) {
      out += "|"
    } else {
      out += escapeRegExp(char)
    }
    i++
  }
  return out
}

export const make = (pattern: string): Glob => {
  const normalized = normalize(pattern)
  const segments = normalized.split("/")
  const rootSegments: Array<string> = []
  for (const segment of segments.slice(0, -1)) {
    if (wildcard.test(segment)) break
    rootSegments.push(segment)
  }
  const regExp = new RegExp(`^${toRegExpSource(normalized)}$`)
  return {
    root: rootSegments.join("/"),
    matches: (path) => regExp.test(path)
  }
}
