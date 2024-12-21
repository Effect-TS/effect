import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("make", () => {
  it("required fields", () => {
    const schema = S.Struct({ a: S.String })
    Util.expectConstructorSuccess(schema, { a: "a" })
  })

  it("optional fields", () => {
    const schema = S.Struct({ a: S.optional(S.String) })
    Util.expectConstructorSuccess(schema, { a: "a" })
    Util.expectConstructorSuccess(schema, {})
  })

  it("should validate the input by default", () => {
    const schema = S.Struct({ a: S.NonEmptyString })
    Util.expectConstructorFailure(
      schema,
      { a: "" },
      `{ readonly a: NonEmptyString }
└─ ["a"]
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected a non empty string, actual ""`
    )
  })

  it("validation can be disabled", () => {
    const schema = S.Struct({ a: S.NonEmptyString })
    expect(schema.make({ a: "" }, true)).toStrictEqual({ a: "" })
    expect(schema.make({ a: "" }, { disableValidation: true })).toStrictEqual({ a: "" })
  })

  it("should support defaults", () => {
    const schema = S.Struct({
      a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => 0))
    })
    expect(schema.make({})).toStrictEqual({ a: 0 })
    expect(schema.make({ a: 1 })).toStrictEqual({ a: 1 })
  })

  it("should support lazy defaults", () => {
    let i = 0
    const schema = S.Struct({
      a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => ++i))
    })
    expect(schema.make({})).toStrictEqual({ a: 1 })
    expect(schema.make({})).toStrictEqual({ a: 2 })
    schema.make({ a: 10 })
    expect(schema.make({})).toStrictEqual({ a: 3 })
  })

  it("should treat `undefined` as missing field", () => {
    const schema = S.Struct({
      a: S.propertySignature(S.UndefinedOr(S.Number)).pipe(S.withConstructorDefault(() => 0))
    })
    expect(schema.make({})).toStrictEqual({ a: 0 })
    expect(schema.make({ a: undefined })).toStrictEqual({ a: 0 })
  })

  it("should accept void if the struct has no fields", () => {
    const schema = S.Struct({})
    expect(schema.make({})).toStrictEqual({})
    expect(schema.make(undefined)).toStrictEqual({})
    expect(schema.make(undefined, true)).toStrictEqual({})
    expect(schema.make(undefined, false)).toStrictEqual({})
    expect(schema.make()).toStrictEqual({})
  })

  it("should accept void if the Class has all the fields with a default", () => {
    const schema = S.Struct({
      a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => 0))
    })
    expect(schema.make({})).toStrictEqual({ a: 0 })
    expect(schema.make(undefined)).toStrictEqual({ a: 0 })
    expect(schema.make(undefined, true)).toStrictEqual({ a: 0 })
    expect(schema.make(undefined, false)).toStrictEqual({ a: 0 })
    expect(schema.make()).toStrictEqual({ a: 0 })
  })

  it("props declarations with defaults (data last)", () => {
    const b = Symbol.for("b")
    const schema = S.Struct({
      a: S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "")),
      [b]: S.Number.pipe(S.propertySignature, S.withConstructorDefault(() => 0))
    })
    Util.expectConstructorSuccess(schema, { a: "a", [b]: 2 })
    Util.expectConstructorSuccess(schema, { a: "a" }, { a: "a", [b]: 0 })
    Util.expectConstructorSuccess(schema, { [b]: 2 }, { a: "", [b]: 2 })
    Util.expectConstructorSuccess(schema, {}, { a: "", [b]: 0 })
  })

  it("props declarations with defaults (data first)", () => {
    const b = Symbol.for("b")
    const schema = S.Struct({
      a: S.withConstructorDefault(S.propertySignature(S.String), () => ""),
      [b]: S.withConstructorDefault(S.propertySignature(S.Number), () => 0)
    })
    Util.expectConstructorSuccess(schema, { a: "a", [b]: 2 })
    Util.expectConstructorSuccess(schema, { a: "a" }, { a: "a", [b]: 0 })
    Util.expectConstructorSuccess(schema, { [b]: 2 }, { a: "", [b]: 2 })
    Util.expectConstructorSuccess(schema, {}, { a: "", [b]: 0 })
  })

  it("props transformations with defaults (data last)", () => {
    const b = Symbol.for("b")
    const schema = S.Struct({
      a: S.String.pipe(S.optionalWith({ default: () => "-" }), S.withConstructorDefault(() => "")),
      [b]: S.Number.pipe(S.optionalWith({ default: () => -1 }), S.withConstructorDefault(() => 0))
    })
    Util.expectConstructorSuccess(schema, { a: "a", [b]: 2 })
    Util.expectConstructorSuccess(schema, { a: "a" }, { a: "a", [b]: 0 })
    Util.expectConstructorSuccess(schema, { [b]: 2 }, { a: "", [b]: 2 })
    Util.expectConstructorSuccess(schema, {}, { a: "", [b]: 0 })
  })

  it("withConstructorDefault + withDecodingDefault", () => {
    const schema = S.Struct({
      a: S.optional(S.Number).pipe(S.withConstructorDefault(() => 0), S.withDecodingDefault(() => 1))
    })
    Util.expectConstructorSuccess(schema, {}, { a: 0 })
  })
})
