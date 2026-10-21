// taken from https://github.com/fastify/fast-content-type-parse
// under the MIT license

/**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */
const paramRE =
  /; *([!#$%&'*+.^\w`|~-]+)=("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u{10ffff}]|\\[\v\u0020-\u{10ffff}])*"|[!#$%&'*+.^\w`|~-]+) */gu

/**
 * RegExp to match *( ";" disposition-parm ) in RFC 6266 sec 4.1, which allows
 * optional whitespace around separators
 */
const dispositionParamRE =
  /;[ \t]*([!#$%&'*+.^\w`|~-]+)[ \t]*=[ \t]*("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u{10ffff}]|\\[\v\u0020-\u{10ffff}])*"|[!#$%&'*+.^\w`|~-]+)[ \t]*/gu

/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */
const quotedPairRE = /\\([\v\u0020-\u{10ffff}])/gu

/**
 * RegExp to match type in RFC 7231 sec 3.1.1.1
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */
const mediaTypeRE = /^[!#$%&'*+.^\w|~-]+\/[!#$%&'*+.^\w|~-]+$/u
const dispositionTypeRE = /^[!#$%&'*+.^\w|~-]+$/u

// default ContentType to prevent repeated object creation
const defaultContentType = { value: "", parameters: Object.create(null) }

export function parse(
  header: string | undefined
): {
  readonly value: string
  readonly parameters: Record<string, string>
} {
  if (typeof header !== "string") {
    return defaultContentType
  }

  let index = header.indexOf(";")
  const type = index !== -1 ? header.slice(0, index).trim() : header.trim()

  if (mediaTypeRE.test(type) === false) {
    return defaultContentType
  }

  const result = {
    value: type.toLowerCase(),
    parameters: Object.create(null)
  }

  // parse parameters
  if (index === -1) {
    return result
  }

  let key: string
  let match: RegExpExecArray | null
  let value: string

  paramRE.lastIndex = index

  while ((match = paramRE.exec(header))) {
    if (match.index !== index) {
      return defaultContentType
    }

    index += match[0].length
    key = match[1].toLowerCase()
    value = match[2]

    if (value[0] === "\"") {
      // remove quotes and escapes
      value = value.slice(1, value.length - 1)

      if (quotedPairRE.test(value)) {
        value = value.replace(quotedPairRE, "$1")
      }
    }

    result.parameters[key] = value
  }

  if (index !== header.length) {
    return defaultContentType
  }

  return result
}

/**
 * Parses a Content-Disposition header according to RFC 6266, returning
 * `undefined` when it is malformed or repeats a parameter.
 *
 * Quoted-pairs are left as-is, so unescaped backslashes in file paths survive.
 */
export function parseDisposition(
  header: string | ReadonlyArray<string> | undefined
):
  | {
    readonly value: string
    readonly parameters: Record<string, string>
  }
  | undefined
{
  if (header === undefined) {
    return defaultContentType
  } else if (typeof header !== "string") {
    return undefined
  }

  let index = header.indexOf(";")
  const type = index !== -1 ? header.slice(0, index).trim() : header.trim()

  if (dispositionTypeRE.test(type) === false) {
    return undefined
  }

  const result = {
    value: type.toLowerCase(),
    parameters: Object.create(null) as Record<string, string>
  }

  if (index === -1) {
    return result
  }

  let key: string
  let match: RegExpExecArray | null
  let value: string

  dispositionParamRE.lastIndex = index

  while ((match = dispositionParamRE.exec(header))) {
    if (match.index !== index) {
      return undefined
    }

    index += match[0].length
    key = match[1].toLowerCase()
    value = match[2]

    if (key in result.parameters) {
      return undefined
    }

    result.parameters[key] = value[0] === "\"" ? value.slice(1, value.length - 1) : value
  }

  if (index !== header.length) {
    return undefined
  }

  return result
}
