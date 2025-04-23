import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("make", () => {
  it("required fields", () => {
    const schema = S.Struct({ a: S.String })
    Util.assertions.make.succeed(schema, { a: "a" })
  })

  it("optional fields", () => {
    const schema = S.Struct({ a: S.optional(S.String) })
    Util.assertions.make.succeed(schema, { a: "a" })
    Util.assertions.make.succeed(schema, {})
  })

  it("should validate the input by default", () => {
    const schema = S.Struct({ a: S.NonEmptyString })
    Util.assertions.make.fail(
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
    deepStrictEqual(schema.make({ a: "" }, true), { a: "" })
    deepStrictEqual(schema.make({ a: "" }, { disableValidation: true }), { a: "" })
  })

  it("should support defaults", () => {
    const schema = S.Struct({
      a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => 0))
    })
    deepStrictEqual(schema.make({}), { a: 0 })
    deepStrictEqual(schema.make({ a: 1 }), { a: 1 })
  })

  it("should support lazy defaults", () => {
    let i = 0
    const schema = S.Struct({
      a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => ++i))
    })
    deepStrictEqual(schema.make({}), { a: 1 })
    deepStrictEqual(schema.make({}), { a: 2 })
    schema.make({ a: 10 })
    deepStrictEqual(schema.make({}), { a: 3 })
  })

  it("should treat `undefined` as missing field", () => {
    const schema = S.Struct({
      a: S.propertySignature(S.UndefinedOr(S.Number)).pipe(S.withConstructorDefault(() => 0))
    })
    deepStrictEqual(schema.make({}), { a: 0 })
    deepStrictEqual(schema.make({ a: undefined }), { a: 0 })
  })

  it("should accept void if the struct has no fields", () => {
    const schema = S.Struct({})
    deepStrictEqual(schema.make({}), {})
    deepStrictEqual(schema.make(undefined), {})
    deepStrictEqual(schema.make(undefined, true), {})
    deepStrictEqual(schema.make(undefined, false), {})
    deepStrictEqual(schema.make(), {})
  })

  it("should accept void if the Class has all the fields with a default", () => {
    const schema = S.Struct({
      a: S.propertySignature(S.Number).pipe(S.withConstructorDefault(() => 0))
    })
    deepStrictEqual(schema.make({}), { a: 0 })
    deepStrictEqual(schema.make(undefined), { a: 0 })
    deepStrictEqual(schema.make(undefined, true), { a: 0 })
    deepStrictEqual(schema.make(undefined, false), { a: 0 })
    deepStrictEqual(schema.make(), { a: 0 })
  })

  it("props declarations with defaults (data last)", () => {
    const b = Symbol.for("b")
    const schema = S.Struct({
      a: S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "")),
      [b]: S.Number.pipe(S.propertySignature, S.withConstructorDefault(() => 0))
    })
    Util.assertions.make.succeed(schema, { a: "a", [b]: 2 })
    Util.assertions.make.succeed(schema, { a: "a" }, { a: "a", [b]: 0 })
    Util.assertions.make.succeed(schema, { [b]: 2 }, { a: "", [b]: 2 })
    Util.assertions.make.succeed(schema, {}, { a: "", [b]: 0 })
  })

  it("props declarations with defaults (data first)", () => {
    const b = Symbol.for("b")
    const schema = S.Struct({
      a: S.withConstructorDefault(S.propertySignature(S.String), () => ""),
      [b]: S.withConstructorDefault(S.propertySignature(S.Number), () => 0)
    })
    Util.assertions.make.succeed(schema, { a: "a", [b]: 2 })
    Util.assertions.make.succeed(schema, { a: "a" }, { a: "a", [b]: 0 })
    Util.assertions.make.succeed(schema, { [b]: 2 }, { a: "", [b]: 2 })
    Util.assertions.make.succeed(schema, {}, { a: "", [b]: 0 })
  })

  it("props transformations with defaults (data last)", () => {
    const b = Symbol.for("b")
    const schema = S.Struct({
      a: S.String.pipe(S.optionalWith({ default: () => "-" }), S.withConstructorDefault(() => "")),
      [b]: S.Number.pipe(S.optionalWith({ default: () => -1 }), S.withConstructorDefault(() => 0))
    })
    Util.assertions.make.succeed(schema, { a: "a", [b]: 2 })
    Util.assertions.make.succeed(schema, { a: "a" }, { a: "a", [b]: 0 })
    Util.assertions.make.succeed(schema, { [b]: 2 }, { a: "", [b]: 2 })
    Util.assertions.make.succeed(schema, {}, { a: "", [b]: 0 })
  })

  it("withConstructorDefault + withDecodingDefault", () => {
    const schema = S.Struct({
      a: S.optional(S.Number).pipe(S.withDecodingDefault(() => 1), S.withConstructorDefault(() => 0))
    })
    Util.assertions.make.succeed(schema, {}, { a: 0 })
  })
})
