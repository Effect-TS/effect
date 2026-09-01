import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import { Equal, Hash, Option, Result } from "effect"
import { MediaType } from "effect/unstable/http"

const assertFailure = (
  input: string,
  message: string,
  offset?: number
) => {
  const result = MediaType.parse(input)
  strictEqual(Result.isFailure(result), true)
  if (Result.isFailure(result)) {
    strictEqual(result.failure.message, `${message} at offset ${result.failure.offset}`)
    if (offset !== undefined) strictEqual(result.failure.offset, offset)
  }
}

describe("MediaType", () => {
  it("parses and normalizes concrete media types", () => {
    const mediaType = MediaType.fromInputUnsafe("\t Application/Vnd.Example+JSON ; Charset=utf-8; profile=Example \t")
    strictEqual(mediaType.type, "application")
    strictEqual(mediaType.subtype, "vnd.example+json")
    strictEqual(Option.getOrUndefined(mediaType.suffix), "json")
    deepStrictEqual(mediaType.parameters, [
      { name: "charset", value: "utf-8" },
      { name: "profile", value: "Example" }
    ])
    strictEqual(MediaType.format(mediaType), "application/vnd.example+json; charset=utf-8; profile=Example")
  })

  it("distinguishes structured suffixes from broad HTTP token syntax", () => {
    const structured = MediaType.fromInputUnsafe("application/vnd.example+json")
    strictEqual(MediaType.baseSubtype(structured), "vnd.example")

    for (const input of ["application/+json", "application/vnd.*+json", "application/example+", "app*/problem+json"]) {
      const mediaType = MediaType.fromInputUnsafe(input)
      strictEqual(MediaType.baseSubtype(mediaType), mediaType.subtype)
      strictEqual(Option.isNone(mediaType.suffix), true)
      strictEqual(MediaType.hasSuffix(mediaType, "json"), false)
    }
  })

  it("accepts every tchar but rejects wildcard ranges", () => {
    const token = "!#$%&'*+-.^_`|~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    strictEqual(
      MediaType.essence(MediaType.fromInputUnsafe(`${token}/${token}`)),
      `${token.toLowerCase()}/${token.toLowerCase()}`
    )
    assertFailure("*/*", "Media type cannot be a wildcard", 0)
    assertFailure("text/*", "Media subtype cannot be a wildcard", 5)
  })

  it("parses quoted values, escapes, empty separators, and obs-text", () => {
    const mediaType = MediaType.fromInputUnsafe(
      "text/plain;;; a=token; b=\"a; b\"; c=\"\\\"\\\\\"; d=\"\tÿ\"; empty=\"\";"
    )
    strictEqual(MediaType.getParameter(mediaType, "b").pipe(Option.getOrUndefined), "a; b")
    strictEqual(MediaType.getParameter(mediaType, "c").pipe(Option.getOrUndefined), "\"\\")
    strictEqual(MediaType.getParameter(mediaType, "d").pipe(Option.getOrUndefined), "\tÿ")
    strictEqual(MediaType.format(mediaType), "text/plain; a=token; b=\"a; b\"; c=\"\\\"\\\\\"; d=\"\tÿ\"; empty=\"\"")
  })

  it("preserves intentional differences from Go and WHATWG parsers", () => {
    // Go's MIME grammar accepts braces and equal duplicate parameters; RFC 9110 does not.
    assertFailure("text/plain; filename={file}.txt", "Expected a value for parameter \"filename\"")
    assertFailure("text/plain; charset=utf-8; charset=utf-8", "Duplicate parameter \"charset\"")
    // Go preserves unnecessary backslashes for legacy IE paths; RFC quoted-pair decodes them.
    strictEqual(
      MediaType.format(MediaType.fromInputUnsafe("text/plain; escaped=\"foo\\xbar\"")),
      "text/plain; escaped=fooxbar"
    )
    // WHATWG recovers from malformed parameters; this parser validates the complete input.
    assertFailure("text/html; charset=\"shift_jis\"iso-2022-jp", "Unexpected character \"i\"")
    assertFailure("text/plain; charset=utf-8; broken", "Expected '=' after parameter \"broken\"")
    // HTTP OWS is SP / HTAB, not arbitrary Unicode whitespace.
    assertFailure("text/plain;\u00a0charset=utf-8", "Expected a parameter name after ';'")
  })

  it("rejects malformed input with a structured error", () => {
    assertFailure("", "Expected a media type")
    assertFailure("text", "Expected '/' after the media type")
    assertFailure("text/", "Expected a media subtype after '/'")
    assertFailure("text /plain", "Expected '/' after the media type")
    assertFailure("text/plain; charset =utf-8", "Expected '=' after parameter \"charset\"")
    assertFailure("text/plain; charset=", "Expected a value for parameter \"charset\"")
    assertFailure("text/plain; charset=\"unterminated", "Unterminated quoted value for parameter \"charset\"")
    assertFailure("text/plain; charset=\"x\\\"", "Unterminated quoted value for parameter \"charset\"")
    assertFailure("text/plain; charset=\"x\r\nInjected: yes\"", "Invalid character in parameter \"charset\"")
    assertFailure("text/plain; charset=\"\u007f\"", "Invalid character in parameter \"charset\"")
    assertFailure("text/plain; charset=\"\\\u007f\"", "Invalid escape in parameter \"charset\"")
    assertFailure("text/plain; charset=\"Ā\"", "Invalid character in parameter \"charset\"")
    assertFailure("text/plain garbage", "Unexpected character \"g\"")
    assertFailure("text/plain; A=1; a=2", "Duplicate parameter \"a\"")
  })

  it("constructs immutable values and rejects invalid parts", () => {
    const entries: Array<readonly [string, string]> = [["Profile", "a b"], ["charset", "utf-8"]]
    const mediaType = Result.getOrThrow(MediaType.make({ type: "Text", subtype: "Plain", parameters: entries }))
    entries.push(["later", "ignored"])
    strictEqual(MediaType.format(mediaType), "text/plain; charset=utf-8; profile=\"a b\"")
    strictEqual(Object.isFrozen(mediaType), true)
    strictEqual(Object.isFrozen(mediaType.parameters), true)
    strictEqual(Result.isFailure(MediaType.make({ type: "text", subtype: "plain", parameters: { x: "Ā" } })), true)
  })

  it("converts supported input shapes", () => {
    const existing = MediaType.textPlain
    strictEqual(Result.getOrThrow(MediaType.fromInput(existing)), existing)
    strictEqual(
      MediaType.format(Result.getOrThrow(MediaType.fromInput("Text/Plain; Charset=UTF-8"))),
      "text/plain; charset=UTF-8"
    )
    strictEqual(
      MediaType.format(MediaType.fromInputUnsafe({ type: "application", subtype: "json" })),
      "application/json"
    )
    strictEqual(Result.isFailure(MediaType.fromInput("invalid")), true)
    throws(() => MediaType.fromInputUnsafe("invalid"))
  })

  it("recognizes branded MediaType values", () => {
    strictEqual(MediaType.isMediaType(MediaType.textPlain), true)
    strictEqual(MediaType.isMediaType({ [MediaType.TypeId]: MediaType.TypeId }), true)
    strictEqual(MediaType.isMediaType({}), false)
  })

  it("uses parameter-aware equality and hashing", () => {
    const left = MediaType.fromInputUnsafe("TEXT/PLAIN; B=two; a=one")
    const right = MediaType.fromInputUnsafe("text/plain; a=\"one\"; b=two")
    const different = MediaType.fromInputUnsafe("text/plain; a=ONE; b=two")
    strictEqual(Equal.equals(left, right), true)
    strictEqual(Hash.hash(left), Hash.hash(right))
    strictEqual(Equal.equals(left, different), false)
    strictEqual(MediaType.sameEssence(left, different), true)
  })

  it("supports parameter, essence, and suffix predicates", () => {
    const candidate = MediaType.fromInputUnsafe("application/problem+json; charset=utf-8; profile=errors")
    const expected = MediaType.fromInputUnsafe("application/problem+json; charset=utf-8")
    strictEqual(MediaType.matchesParameters(candidate, expected), true)
    strictEqual(MediaType.matchesParameters(expected, candidate), false)
    strictEqual(candidate.pipe(MediaType.isType("APPLICATION")), true)
    strictEqual(MediaType.isSubtype(candidate, "problem+json"), true)
    strictEqual(candidate.pipe(MediaType.hasSuffix("JSON")), true)
    strictEqual(MediaType.hasParameter(candidate, "CHARSET"), true)
    strictEqual(Option.isNone(MediaType.getParameter(candidate, "not valid")), true)
  })

  it("applies charset semantics without changing generic parameter identity", () => {
    const upper = MediaType.fromInputUnsafe("text/plain; charset=UTF-8; profile=Example")
    const lower = MediaType.fromInputUnsafe("text/plain; charset=utf-8; profile=Example")
    strictEqual(Option.getOrUndefined(MediaType.getCharset(upper)), "utf-8")
    strictEqual(MediaType.matchesParameters(upper, lower), true)
    strictEqual(MediaType.matchesParameters(lower, upper), true)
    strictEqual(Equal.equals(upper, lower), false)

    const differentProfile = MediaType.fromInputUnsafe("text/plain; charset=utf-8; profile=example")
    strictEqual(MediaType.matchesParameters(upper, differentProfile), false)
  })

  it("classifies common media-type families", () => {
    strictEqual(MediaType.isJson(MediaType.applicationJson), true)
    strictEqual(MediaType.isJson(MediaType.fromInputUnsafe("application/problem+json")), true)
    strictEqual(MediaType.isJson(MediaType.fromInputUnsafe("text/json")), true)
    strictEqual(MediaType.isJson(MediaType.fromInputUnsafe("application/json-seq")), false)
    strictEqual(MediaType.isXml(MediaType.fromInputUnsafe("application/atom+xml")), true)
    strictEqual(MediaType.isXml(MediaType.fromInputUnsafe("text/xml")), true)
    strictEqual(MediaType.isText(MediaType.fromInputUnsafe("text/event-stream")), true)
    strictEqual(MediaType.isText(MediaType.applicationJson), false)
  })
})
