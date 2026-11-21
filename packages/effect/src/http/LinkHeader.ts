/**
 * Parses and formats `Link` header values as defined by
 * [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288).
 *
 * A `Link` header lists links such as pagination (`next`, `prev`),
 * `canonical` and `alternate` pages, or `preload` hints. This module turns a
 * header value into an array of {@link Link} values, writes links back as a
 * header value, and offers {@link FromString} as a `Schema` codec for both
 * directions. Use `HttpClientResponse.links` and `HttpClientResponse.link` to
 * read links with their targets resolved against the response URL, and
 * `HttpServerResponse.appendHeader` or `HttpClientRequest.appendHeader` to add
 * a formatted value without replacing an existing `Link` header.
 *
 * Parsing follows the forgiving algorithm of RFC 8288 Appendix B. It never
 * fails: malformed input ends parsing and the links read so far are returned.
 * For every parameter the first occurrence wins, and an RFC 8187 extended
 * parameter such as `title*` is decoded and stored under its plain name,
 * taking precedence over the plain form.
 *
 * **Example** (Reading a pagination link)
 *
 * ```ts import.meta.vitest
 * import { LinkHeader } from "effect/http"
 *
 * const links = LinkHeader.parse('</items?page=2>; rel="next last", </items?page=1>; rel="prev"')
 * links.find((link) => link.rel.includes("next"))?.target // => "/items?page=2"
 * ```
 *
 * **Example** (Writing canonical and alternate links)
 *
 * ```ts import.meta.vitest
 * import { LinkHeader } from "effect/http"
 *
 * LinkHeader.format([
 *   { target: "https://example.com/en", rel: ["canonical"] },
 *   { target: "https://example.com/de", rel: ["alternate"], params: { hreflang: "de" } }
 * ]) // => '<https://example.com/en>; rel="canonical", <https://example.com/de>; rel="alternate"; hreflang="de"'
 * ```
 *
 * @stability unstable
 * @since 4.1.6
 */
import * as Schema from "../Schema.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as Str from "../String.ts"
import { decodeExtValue } from "./MultipartParser/internal/contentType.ts"

/**
 * A single link from a `Link` header.
 *
 * **Details**
 *
 * - `target` is the URI reference exactly as written, without resolving it.
 * - `rel` holds the lowercased relation types; it is empty when the link has
 *   no `rel` parameter.
 * - `params` holds every other parameter by lowercased name, such as
 *   `anchor`, `title`, `type` or `hreflang`. A parameter written without a
 *   value, such as `nopush`, maps to `""`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.6
 */
export interface Link {
  readonly target: string
  readonly rel: ReadonlyArray<string>
  readonly params: { readonly [name: string]: string }
}

const isWhitespace = (char: string | undefined): boolean => char === " " || char === "\t"

/**
 * Parses a `Link` header value into its links.
 *
 * **Details**
 *
 * Parsing follows RFC 8288 Appendix B and never fails. When it reaches input
 * that is not a link-value, it stops and returns the links read so far.
 *
 * - Parameter names and relation types are lowercased.
 * - For every parameter, including `rel`, the first occurrence wins.
 * - An extended parameter such as `title*` is decoded as RFC 8187 and stored
 *   under `title`, replacing the plain form. Undecodable values are ignored.
 *
 * **Gotchas**
 *
 * Targets are not resolved. Relative targets and the `anchor` parameter need
 * the URL of the request, which `HttpClientResponse.links` applies.
 *
 * @see {@link format} for the inverse operation
 *
 * @stability unstable
 * @category decoding
 * @since 4.1.6
 */
export const parse = (value: string): Array<Link> => {
  const links: Array<Link> = []
  const length = value.length
  let i = 0
  const skipWhitespace = () => {
    while (isWhitespace(value[i])) i++
  }
  while (true) {
    while (isWhitespace(value[i]) || value[i] === ",") i++
    if (value[i] !== "<") break
    const end = value.indexOf(">", i + 1)
    if (end === -1) break
    const target = value.slice(i + 1, end)
    i = end + 1

    const plain = new Map<string, string>()
    const extended = new Map<string, string>()
    while (true) {
      skipWhitespace()
      if (value[i] !== ";") break
      i++
      const nameStart = i
      while (i < length && value[i] !== "=" && value[i] !== ";" && value[i] !== ",") i++
      const name = value.slice(nameStart, i).trim().toLowerCase()
      let paramValue = ""
      if (value[i] === "=") {
        i++
        skipWhitespace()
        if (value[i] === "\"") {
          i++
          paramValue = ""
          while (i < length && value[i] !== "\"") {
            if (value[i] === "\\" && i + 1 < length) i++
            paramValue += value[i]
            i++
          }
          i++
        } else {
          const valueStart = i
          while (i < length && value[i] !== ";" && value[i] !== ",") i++
          paramValue = value.slice(valueStart, i).trim()
        }
      }
      if (name.length > 1 && name.endsWith("*")) {
        const baseName = name.slice(0, -1)
        const decoded = decodeExtValue(paramValue)
        if (decoded !== undefined && !extended.has(baseName)) extended.set(baseName, decoded)
      } else if (name !== "" && !plain.has(name)) {
        plain.set(name, paramValue)
      }
    }

    for (const [name, decoded] of extended) plain.set(name, decoded)
    const rel = plain.get("rel")
    plain.delete("rel")
    links.push({
      target,
      rel: rel === undefined ? [] : rel.toLowerCase().split(/[ \t]+/).filter((type) => type !== ""),
      params: Object.fromEntries(plain)
    })
  }
  return links
}

const quotableValue = /^[\t\x20-\x7e]*$/

const formatParam = (name: string, value: string): string => {
  if (value === "") return name
  if (quotableValue.test(value)) return `${name}="${value.replace(/["\\]/g, "\\$&")}"`
  const encoded = encodeURIComponent(Str.toWellFormed(value)).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  return `${name}*=UTF-8''${encoded}`
}

/**
 * Formats links as a `Link` header value.
 *
 * **Details**
 *
 * Each link is written as `<target>`, then `rel` when it has relation types,
 * then the other parameters, and links are joined with `", "`.
 *
 * - A parameter with the value `""` is written as a bare name.
 * - A value made of tabs, spaces and visible ASCII is written as a
 *   quoted-string, escaping `"` and `\\`.
 * - Any other value, such as non-ASCII text or line breaks, is written as an
 *   RFC 8187 extended parameter, for example `title*=UTF-8''Gr%C3%BC%C3%9Fe`.
 * - A `rel` key in `params` is ignored; use the `rel` field.
 *
 * An empty iterable gives `""`. Parsing the result gives back the same links.
 *
 * **Gotchas**
 *
 * `target` and parameter names are written as given. They must not contain
 * `>`, line breaks or other characters that are invalid in a header value.
 *
 * @see {@link parse} for the inverse operation
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.6
 */
export const format = (
  links: Iterable<{
    readonly target: string
    readonly rel: ReadonlyArray<string>
    readonly params?: { readonly [name: string]: string } | undefined
  }>
): string => {
  const out: Array<string> = []
  for (const link of links) {
    let value = `<${link.target}>`
    if (link.rel.length > 0) value += `; rel="${link.rel.join(" ")}"`
    if (link.params !== undefined) {
      for (const [name, paramValue] of Object.entries(link.params)) {
        if (name.toLowerCase() !== "rel") value += `; ${formatParam(name, paramValue)}`
      }
    }
    out.push(value)
  }
  return out.join(", ")
}

/**
 * Schema for `Link` header values, decoded with {@link parse} and encoded
 * with {@link format}.
 *
 * **When to use**
 *
 * Use with `HttpClientResponse.schemaHeaders` or HTTP API header schemas
 * that carry a `Link` header.
 *
 * **Details**
 *
 * Decoding never fails on a string, because {@link parse} is lenient.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.6
 */
export const FromString: Schema.Codec<ReadonlyArray<Link>, string> = Schema.String.annotate({
  expected: "a Link header value"
}).pipe(
  Schema.decodeTo(
    Schema.Array(Schema.Struct({
      target: Schema.String,
      rel: Schema.Array(Schema.String),
      params: Schema.Record(Schema.String, Schema.String)
    })),
    SchemaTransformation.transform<ReadonlyArray<Link>, string>({ decode: parse, encode: format })
  )
)
