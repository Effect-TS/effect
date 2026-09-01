/**
 * Models concrete HTTP media types and their parameters.
 *
 * This module strictly parses and formats concrete `Content-Type` values using
 * the RFC 9110 grammar. It intentionally does not implement the more forgiving
 * WHATWG MIME parser or model file-extension lookup, wildcards, `Accept`, or
 * media ranges.
 *
 * @since 4.0.0
 */
import * as Data from "../../Data.ts"
import * as Equal from "../../Equal.ts"
import * as Equ from "../../Equivalence.ts"
import { dual } from "../../Function.ts"
import * as Hash from "../../Hash.ts"
import * as Inspectable from "../../Inspectable.ts"
import * as Option from "../../Option.ts"
import * as Pipeable from "../../Pipeable.ts"
import * as Predicate from "../../Predicate.ts"
import * as Result from "../../Result.ts"

/**
 * Type identifier for `MediaType` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/http/MediaType"

/**
 * Type of the identifier used to brand `MediaType` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = typeof TypeId

/**
 * A normalized media-type parameter.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parameter {
  readonly name: string
  readonly value: string
}

/**
 * Parts accepted when constructing a concrete media type.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parts {
  readonly type: string
  readonly subtype: string
  readonly parameters?:
    | Readonly<Record<string, string>>
    | Iterable<readonly [name: string, value: string]>
    | undefined
}

/**
 * A parsed, immutable concrete HTTP media type.
 *
 * **Gotchas**
 *
 * This model excludes wildcard media ranges and quality parameters used by
 * `Accept` negotiation. Parameter values containing `obs-text` use JavaScript's
 * isomorphic U+0080 through U+00FF representation of the corresponding octets.
 *
 * @category models
 * @since 4.0.0
 */
export interface MediaType extends Equal.Equal, Pipeable.Pipeable, Inspectable.Inspectable {
  readonly [TypeId]: TypeId
  readonly type: string
  readonly subtype: string
  readonly suffix: Option.Option<string>
  readonly parameters: ReadonlyArray<Parameter>
}

/**
 * Input accepted when constructing a media type.
 *
 * @category models
 * @since 4.0.0
 */
export type Input = MediaType | Parts | string

/**
 * Describes a media type parse failure at an offset in the original input.
 *
 * @category errors
 * @since 4.0.0
 */
export class MediaTypeParseError extends Data.TaggedError("MediaTypeParseError")<{
  readonly input: string
  readonly offset: number
  readonly message: string
}> {}

/**
 * Returns `true` if the provided value is a `MediaType` value.
 *
 * @category guards
 * @since 4.0.0
 */
export const isMediaType = (input: unknown): input is MediaType => Predicate.hasProperty(input, TypeId)

const parametersEqual = (left: ReadonlyArray<Parameter>, right: ReadonlyArray<Parameter>): boolean => {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i++) {
    if (left[i].name !== right[i].name || left[i].value !== right[i].value) return false
  }
  return true
}

/**
 * Exact equivalence for normalized media types, including parameters.
 *
 * @category instances
 * @since 4.0.0
 */
export const Equivalence: Equ.Equivalence<MediaType> = Equ.make((left, right) =>
  left.type === right.type && left.subtype === right.subtype && parametersEqual(left.parameters, right.parameters)
)

const Proto: MediaType = {
  [TypeId]: TypeId,
  type: "",
  subtype: "",
  suffix: Option.none(),
  parameters: [],
  pipe() {
    return Pipeable.pipeArguments(this, arguments)
  },
  [Equal.symbol](this: MediaType, that: unknown): boolean {
    return isMediaType(that) && Equivalence(this, that)
  },
  [Hash.symbol](this: MediaType): number {
    let hash = Hash.combine(Hash.string(this.type))(Hash.string(this.subtype))
    for (const parameter of this.parameters) {
      hash = Hash.combine(Hash.string(parameter.name))(hash)
      hash = Hash.combine(Hash.string(parameter.value))(hash)
    }
    return hash
  },
  toString(this: MediaType): string {
    return format(this)
  },
  toJSON(this: MediaType): unknown {
    return format(this)
  },
  [Inspectable.NodeInspectSymbol](this: MediaType): unknown {
    return format(this)
  }
}

const isTchar = (code: number): boolean =>
  (code >= 48 && code <= 57) ||
  (code >= 65 && code <= 90) ||
  (code >= 97 && code <= 122) ||
  code === 33 || code === 35 || code === 36 || code === 37 || code === 38 || code === 39 || code === 42 ||
  code === 43 || code === 45 || code === 46 || code === 94 || code === 95 || code === 96 || code === 124 || code === 126

const tokenEnd = (input: string, start: number): number => {
  let end = start
  while (end < input.length && isTchar(input.charCodeAt(end))) end++
  return end
}

const isToken = (value: string): boolean => {
  return value.length > 0 && tokenEnd(value, 0) === value.length
}

const isDecodedValue = (value: string): boolean => {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code !== 9 && (code < 32 || code === 127 || code > 255)) return false
  }
  return true
}

const isRestrictedName = (value: string): boolean => {
  if (value.length === 0 || value.length > 127) return false
  const first = value.charCodeAt(0)
  if (!((first >= 48 && first <= 57) || (first >= 65 && first <= 90) || (first >= 97 && first <= 122))) {
    return false
  }
  for (let i = 1; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (
      (code < 48 || code > 57) &&
      (code < 65 || code > 90) &&
      (code < 97 || code > 122) &&
      code !== 33 && code !== 35 && code !== 36 && code !== 38 && code !== 43 && code !== 45 && code !== 46 &&
      code !== 94 && code !== 95
    ) return false
  }
  return true
}

const suffixOf = (type: string, subtype: string): Option.Option<string> => {
  const index = subtype.lastIndexOf("+")
  return isRestrictedName(type) && isRestrictedName(subtype) && index > 0 && index < subtype.length - 1
    ? Option.some(subtype.slice(index + 1))
    : Option.none()
}

const fromValidated = (type: string, subtype: string, parameters: Array<Parameter>): MediaType => {
  parameters = parameters.map((parameter) =>
    parameter.name === "charset" ? { name: parameter.name, value: parameter.value.toLowerCase() } : parameter
  )
  parameters.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
  const self = Object.create(Proto)
  self.type = type
  self.subtype = subtype
  self.suffix = suffixOf(type, subtype)
  self.parameters = Object.freeze(parameters.map((parameter) => Object.freeze(parameter)))
  return Object.freeze(self)
}

const fail = (input: string, offset: number, message: string) =>
  Result.fail(new MediaTypeParseError({ input, offset, message }))

/**
 * Creates a concrete media type from validated parts.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (parts: Parts): Result.Result<MediaType, MediaTypeParseError> => {
  const input = `${parts.type}/${parts.subtype}`
  if (!isToken(parts.type) || parts.type === "*") return fail(input, 0, "Expected a valid media type")
  if (!isToken(parts.subtype) || parts.subtype === "*") {
    return fail(input, parts.type.length + 1, "Expected a valid media subtype")
  }
  const parameters: Array<Parameter> = []
  const names = new Set<string>()
  const entries = parts.parameters === undefined
    ? []
    : Symbol.iterator in parts.parameters
    ? parts.parameters as Iterable<readonly [string, string]>
    : Object.entries(parts.parameters)
  for (const [rawName, value] of entries) {
    const name = rawName.toLowerCase()
    if (!isToken(rawName)) return fail(input, input.length, `Invalid parameter name ${JSON.stringify(rawName)}`)
    if (!isDecodedValue(value)) return fail(input, input.length, `Invalid value for parameter ${JSON.stringify(name)}`)
    if (names.has(name)) return fail(input, input.length, `Duplicate parameter ${JSON.stringify(name)}`)
    names.add(name)
    parameters.push({ name, value })
  }
  return Result.succeed(fromValidated(parts.type.toLowerCase(), parts.subtype.toLowerCase(), parameters))
}

/**
 * Creates a concrete media type from parts, throwing when any part is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const makeUnsafe = (parts: Parts): MediaType => Result.getOrThrow(make(parts))

const skipOws = (input: string, start: number): number => {
  let index = start
  while (input.charCodeAt(index) === 32 || input.charCodeAt(index) === 9) index++
  return index
}

/**
 * Parses a concrete HTTP media type and its parameters.
 *
 * **Details**
 *
 * Names are lowercased, quoted pairs are decoded, duplicate parameter names are
 * rejected, and leading or trailing optional whitespace is ignored.
 *
 * @category constructors
 * @since 4.0.0
 */
export const parse = (input: string): Result.Result<MediaType, MediaTypeParseError> => {
  const length = input.length
  let index = skipOws(input, 0)
  const typeStart = index
  index = tokenEnd(input, index)
  if (index === typeStart) return fail(input, index, "Expected a media type")
  const type = input.slice(typeStart, index).toLowerCase()
  if (type === "*") return fail(input, typeStart, "Media type cannot be a wildcard")
  if (input.charCodeAt(index) !== 47) return fail(input, index, "Expected '/' after the media type")
  index++
  const subtypeStart = index
  index = tokenEnd(input, index)
  if (index === subtypeStart) return fail(input, index, "Expected a media subtype after '/'")
  const subtype = input.slice(subtypeStart, index).toLowerCase()
  if (subtype === "*") return fail(input, subtypeStart, "Media subtype cannot be a wildcard")

  const parameters: Array<Parameter> = []
  const names = new Set<string>()
  while (true) {
    index = skipOws(input, index)
    if (index === length) return Result.succeed(fromValidated(type, subtype, parameters))
    if (input.charCodeAt(index) !== 59) {
      return fail(input, index, `Unexpected character ${JSON.stringify(input[index])}`)
    }
    index = skipOws(input, index + 1)
    if (index === length || input.charCodeAt(index) === 59) {
      return fail(input, index, "Expected a parameter name after ';'")
    }

    const nameStart = index
    index = tokenEnd(input, index)
    if (index === nameStart) return fail(input, index, "Expected a parameter name after ';'")
    const name = input.slice(nameStart, index).toLowerCase()
    if (input.charCodeAt(index) !== 61) {
      return fail(input, index, `Expected '=' after parameter ${JSON.stringify(name)}`)
    }
    index++

    let value = ""
    if (input.charCodeAt(index) === 34) {
      index++
      let closed = false
      while (index < length) {
        const code = input.charCodeAt(index)
        if (code === 34) {
          index++
          closed = true
          break
        }
        if (code === 92) {
          const escaped = input.charCodeAt(index + 1)
          if (
            index + 1 >= length ||
            (escaped !== 9 && escaped !== 32 && (escaped < 33 || escaped === 127 || escaped > 255))
          ) {
            return fail(input, index, `Invalid escape in parameter ${JSON.stringify(name)}`)
          }
          value += input[index + 1]
          index += 2
          continue
        }
        if (
          code !== 9 && code !== 32 && code !== 33 && (code < 35 || code > 91) && (code < 93 || code > 126) &&
          (code < 128 || code > 255)
        ) {
          return fail(input, index, `Invalid character in parameter ${JSON.stringify(name)}`)
        }
        value += input[index++]
      }
      if (!closed) return fail(input, index, `Unterminated quoted value for parameter ${JSON.stringify(name)}`)
    } else {
      const valueStart = index
      index = tokenEnd(input, index)
      if (index === valueStart) return fail(input, index, `Expected a value for parameter ${JSON.stringify(name)}`)
      value = input.slice(valueStart, index)
    }
    if (names.has(name)) return fail(input, nameStart, `Duplicate parameter ${JSON.stringify(name)}`)
    names.add(name)
    parameters.push({ name, value })
  }
}

/**
 * Parses a concrete media type, throwing when the input is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const parseUnsafe = (input: string): MediaType => Result.getOrThrow(parse(input))

/**
 * Converts a supported input into a normalized media type.
 *
 * @category constructors
 * @since 4.0.0
 */
export const fromInput = (input: Input): Result.Result<MediaType, MediaTypeParseError> =>
  isMediaType(input) ? Result.succeed(input) : typeof input === "string" ? parse(input) : make(input)

/**
 * Converts a supported input into a normalized media type, throwing when the
 * input is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const fromInputUnsafe = (input: Input): MediaType => Result.getOrThrow(fromInput(input))

/**
 * Returns the normalized `type/subtype` without parameters.
 *
 * @category getters
 * @since 4.0.0
 */
export const essence = (self: MediaType): string => `${self.type}/${self.subtype}`

/**
 * Returns the subtype portion before an RFC 6838-compatible structured syntax suffix.
 *
 * **Gotchas**
 *
 * Returns the complete subtype when the type or subtype does not satisfy the
 * RFC 6838 registered-name grammar or does not have a structured suffix.
 *
 * @category getters
 * @since 4.0.0
 */
export const baseSubtype = (self: MediaType): string =>
  Option.match(self.suffix, {
    onNone: () => self.subtype,
    onSome: (suffix) => self.subtype.slice(0, -(suffix.length + 1))
  })

const formatValue = (value: string): string => {
  if (isToken(value)) return value
  return `"${value.replace(/["\\]/g, "\\$&")}"`
}

/**
 * Formats a media type as a deterministic HTTP field value.
 *
 * @category formatting
 * @since 4.0.0
 */
export const format = (self: MediaType): string => {
  let output = essence(self)
  for (const parameter of self.parameters) output += `; ${parameter.name}=${formatValue(parameter.value)}`
  return output
}

/**
 * Returns a named parameter value, ignoring parameter-name casing.
 *
 * @category getters
 * @since 4.0.0
 */
export const getParameter: {
  (name: string): (self: MediaType) => Option.Option<string>
  (self: MediaType, name: string): Option.Option<string>
} = dual(2, (self: MediaType, name: string): Option.Option<string> => {
  if (!isToken(name)) return Option.none()
  const normalized = name.toLowerCase()
  const parameter = self.parameters.find((parameter) => parameter.name === normalized)
  return parameter === undefined ? Option.none() : Option.some(parameter.value)
})

/**
 * Returns the normalized value of the `charset` parameter.
 *
 * **Details**
 *
 * Charset names are case-insensitive, so the returned value is lowercased.
 *
 * @category getters
 * @since 4.0.0
 */
export const getCharset = (self: MediaType): Option.Option<string> =>
  Option.map(getParameter(self, "charset"), (value) => value.toLowerCase())

/**
 * Returns whether a named parameter is present.
 *
 * @category predicates
 * @since 4.0.0
 */
export const hasParameter: {
  (name: string): (self: MediaType) => boolean
  (self: MediaType, name: string): boolean
} = dual(2, (self: MediaType, name: string): boolean => Option.isSome(getParameter(self, name)))

/**
 * Returns whether two media types have the same normalized type and subtype.
 *
 * @category comparisons
 * @since 4.0.0
 */
export const sameEssence: {
  (that: MediaType): (self: MediaType) => boolean
  (self: MediaType, that: MediaType): boolean
} = dual(2, (self: MediaType, that: MediaType): boolean => self.type === that.type && self.subtype === that.subtype)

/**
 * Returns whether a candidate has the expected essence and all expected parameters.
 *
 * **Details**
 *
 * Charset values are compared case-insensitively. Other parameter values use
 * exact comparison because their semantics are defined by each media type.
 *
 * @category comparisons
 * @since 4.0.0
 */
export const matchesParameters: {
  (expected: MediaType): (candidate: MediaType) => boolean
  (candidate: MediaType, expected: MediaType): boolean
} = dual(
  2,
  (candidate: MediaType, expected: MediaType): boolean =>
    sameEssence(candidate, expected) &&
    expected.parameters.every((parameter) =>
      Option.exists(
        getParameter(candidate, parameter.name),
        (value) =>
          parameter.name === "charset"
            ? value.toLowerCase() === parameter.value.toLowerCase()
            : value === parameter.value
      )
    )
)

/**
 * Returns whether the normalized top-level type equals `type`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isType: {
  (type: string): (self: MediaType) => boolean
  (self: MediaType, type: string): boolean
} = dual(2, (self: MediaType, type: string): boolean => isToken(type) && self.type === type.toLowerCase())

/**
 * Returns whether the normalized subtype equals `subtype`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isSubtype: {
  (subtype: string): (self: MediaType) => boolean
  (self: MediaType, subtype: string): boolean
} = dual(2, (self: MediaType, subtype: string): boolean => isToken(subtype) && self.subtype === subtype.toLowerCase())

/**
 * Returns whether the structured syntax suffix equals `suffix`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const hasSuffix: {
  (suffix: string): (self: MediaType) => boolean
  (self: MediaType, suffix: string): boolean
} = dual(
  2,
  (self: MediaType, suffix: string): boolean =>
    isToken(suffix) && Option.getOrUndefined(self.suffix) === suffix.toLowerCase()
)

/**
 * Returns whether the media type belongs to the JSON media-type family.
 *
 * **Details**
 *
 * Recognizes `application/json`, `text/json`, and RFC 6838-compatible subtypes
 * with a `+json` structured syntax suffix.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isJson = (self: MediaType): boolean =>
  (self.type === "application" && self.subtype === "json") ||
  (self.type === "text" && self.subtype === "json") ||
  Option.getOrUndefined(self.suffix) === "json"

/**
 * Returns whether the media type belongs to the XML media-type family.
 *
 * **Details**
 *
 * Recognizes `application/xml`, `text/xml`, and RFC 6838-compatible subtypes
 * with a `+xml` structured syntax suffix.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isXml = (self: MediaType): boolean =>
  ((self.type === "application" || self.type === "text") && self.subtype === "xml") ||
  Option.getOrUndefined(self.suffix) === "xml"

/**
 * Returns whether the normalized top-level type is `text`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isText = (self: MediaType): boolean => self.type === "text"

/**
 * The `application/json` media type.
 *
 * @category constants
 * @since 4.0.0
 */
export const applicationJson: MediaType = makeUnsafe({ type: "application", subtype: "json" })
/**
 * The `application/octet-stream` media type.
 *
 * @category constants
 * @since 4.0.0
 */
export const applicationOctetStream: MediaType = makeUnsafe({ type: "application", subtype: "octet-stream" })
/**
 * The `application/x-www-form-urlencoded` media type.
 *
 * @category constants
 * @since 4.0.0
 */
export const applicationFormUrlEncoded: MediaType = makeUnsafe({
  type: "application",
  subtype: "x-www-form-urlencoded"
})
/**
 * The `multipart/form-data` media type.
 *
 * @category constants
 * @since 4.0.0
 */
export const multipartFormData: MediaType = makeUnsafe({ type: "multipart", subtype: "form-data" })
/**
 * The `text/plain` media type.
 *
 * @category constants
 * @since 4.0.0
 */
export const textPlain: MediaType = makeUnsafe({ type: "text", subtype: "plain" })
