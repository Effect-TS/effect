/**
 * Minimal glob matching for remote file systems.
 *
 * @internal
 */

const hasMagic = (segment: string) => /[*?[{]/.test(segment)

/**
 * Converts a glob pattern into a regular expression matching `/`-separated
 * relative paths. Supports `**`, `*`, `?`, `[...]` classes, and `{a,b}`
 * alternatives.
 *
 * @internal
 */
export const toRegExp = (pattern: string): RegExp => {
  let out = ""
  let braces = 0
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    switch (char) {
      case "*": {
        if (pattern[i + 1] === "*") {
          const atStart = i === 0 || pattern[i - 1] === "/"
          const atEnd = i + 2 === pattern.length || pattern[i + 2] === "/"
          if (atStart && atEnd) {
            i += 2
            out += i >= pattern.length ? ".*" : "(?:.*/)?"
            continue
          }
        }
        out += "[^/]*"
        break
      }
      case "?":
        out += "[^/]"
        break
      case "[": {
        const end = pattern.indexOf("]", i + 1)
        if (end === -1) {
          out += "\\["
          break
        }
        let body = pattern.slice(i + 1, end)
        if (body.startsWith("!")) body = "^" + body.slice(1)
        out += `[${body.replace(/\\/g, "\\\\")}]`
        i = end
        break
      }
      case "{":
        braces++
        out += "(?:"
        break
      case "}":
        if (braces > 0) {
          braces--
          out += ")"
        } else {
          out += "\\}"
        }
        break
      case ",":
        out += braces > 0 ? "|" : ","
        break
      default:
        out += char.replace(/[.+^$()|\\]/g, "\\$&")
    }
  }
  return new RegExp(`^${out}$`)
}

/**
 * Splits a pattern into the literal directory prefix that can be walked
 * directly and the remaining pattern, plus the maximum walk depth (or
 * `Infinity` when the pattern contains `**`).
 *
 * @internal
 */
export const plan = (pattern: string): {
  readonly base: string
  readonly maxDepth: number
} => {
  const segments = pattern.split("/")
  const base: Array<string> = []
  while (segments.length > 1 && !hasMagic(segments[0])) {
    base.push(segments.shift()!)
  }
  const maxDepth = segments.includes("**") ? Infinity : base.length + segments.length
  return { base: base.join("/"), maxDepth }
}
