import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { InputValidationFailure } from "../src/ActionError.js"
import * as ActionRunnerTest from "../src/ActionRunnerTest.js"
import * as Input from "../src/Input.js"

describe("Input", () => {
  describe("raw", () => {
    it.effect("returns input value", () =>
      Effect.gen(function*() {
        const value = yield* Input.raw("my-input")
        expect(value).toBe("hello world")
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { "my-input": "hello world" }
          }).layer
        )
      ))

    it.effect("returns empty string when input is missing", () =>
      Effect.gen(function*() {
        const value = yield* Input.raw("missing")
        expect(value).toBe("")
      }).pipe(
        Effect.provide(ActionRunnerTest.make({ inputs: {} }).layer)
      ))
  })

  describe("parse", () => {
    it.effect("parses string input", () =>
      Effect.gen(function*() {
        const value = yield* Input.parse("name", Schema.String)
        expect(value).toBe("Alice")
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { name: "Alice" }
          }).layer
        )
      ))

    it.effect("parses integer input", () =>
      Effect.gen(function*() {
        const value = yield* Input.parse("count", Schema.NumberFromString.pipe(Schema.int()))
        expect(value).toBe(42)
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { count: "42" }
          }).layer
        )
      ))

    it.effect("fails on invalid integer", () =>
      Effect.gen(function*() {
        const result = yield* Input.parse("count", Schema.NumberFromString).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InputValidationFailure)
          expect(result.left.input).toBe("count")
          expect(result.left.reason).toBe("SchemaValidation")
        }
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { count: "not-a-number" }
          }).layer
        )
      ))

    it.effect("fails on missing required input with NonEmptyString", () =>
      Effect.gen(function*() {
        const result = yield* Input.parse("required", Schema.NonEmptyString).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InputValidationFailure)
          expect(result.left.input).toBe("required")
        }
      }).pipe(
        Effect.provide(ActionRunnerTest.make({ inputs: {} }).layer)
      ))

    it.effect("parses JSON input", () =>
      Effect.gen(function*() {
        const MySchema = Schema.Struct({
          name: Schema.String,
          count: Schema.Number
        })
        const value = yield* Input.parse("config", Schema.parseJson(MySchema))
        expect(value).toEqual({ name: "test", count: 5 })
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { config: "{\"name\": \"test\", \"count\": 5}" }
          }).layer
        )
      ))

    it.effect("fails on invalid JSON", () =>
      Effect.gen(function*() {
        const result = yield* Input.parse("config", Schema.parseJson(Schema.Unknown)).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InputValidationFailure)
          expect(result.left.input).toBe("config")
        }
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { config: "not valid json{" }
          }).layer
        )
      ))

    it.effect("parses Redacted input", () =>
      Effect.gen(function*() {
        const value = yield* Input.parse("token", Schema.Redacted(Schema.NonEmptyString))
        // Redacted values are opaque
        expect(typeof value).toBe("object")
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { token: "secret-token-123" }
          }).layer
        )
      ))

    it.effect("works with Effect.option for optional inputs", () =>
      Effect.gen(function*() {
        const value = yield* Input.parse("optional", Schema.String).pipe(Effect.option)
        expect(Option.isSome(value)).toBe(true)
        if (Option.isSome(value)) {
          expect(value.value).toBe("present")
        }
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { optional: "present" }
          }).layer
        )
      ))

    it.effect("works with Effect.orElseSucceed for defaults", () =>
      Effect.gen(function*() {
        const value = yield* Input.parse("count", Schema.NumberFromString).pipe(
          Effect.orElseSucceed(() => 10)
        )
        expect(value).toBe(10)
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: {} // missing
          }).layer
        )
      ))
  })

  describe("YamlBoolean", () => {
    const testCases = [
      { input: "true", expected: true },
      { input: "True", expected: true },
      { input: "TRUE", expected: true },
      { input: "yes", expected: true },
      { input: "Yes", expected: true },
      { input: "on", expected: true },
      { input: "1", expected: true },
      { input: "false", expected: false },
      { input: "False", expected: false },
      { input: "FALSE", expected: false },
      { input: "no", expected: false },
      { input: "No", expected: false },
      { input: "off", expected: false },
      { input: "0", expected: false },
      { input: "", expected: false }
    ]

    for (const { expected, input } of testCases) {
      it.effect(`parses "${input}" as ${expected}`, () =>
        Effect.gen(function*() {
          const value = yield* Input.parse("flag", Input.YamlBoolean)
          expect(value).toBe(expected)
        }).pipe(
          Effect.provide(
            ActionRunnerTest.make({
              inputs: { flag: input }
            }).layer
          )
        ))
    }

    it.effect("fails on invalid boolean", () =>
      Effect.gen(function*() {
        const result = yield* Input.parse("flag", Input.YamlBoolean).pipe(
          Effect.either
        )
        expect(result._tag).toBe("Left")
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { flag: "maybe" }
          }).layer
        )
      ))
  })

  describe("convenience helpers", () => {
    it.effect("Input.string returns string", () =>
      Effect.gen(function*() {
        const value = yield* Input.string("name")
        expect(value).toBe("test")
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { name: "test" }
          }).layer
        )
      ))

    it.effect("Input.integer returns number", () =>
      Effect.gen(function*() {
        const value = yield* Input.integer("count")
        expect(value).toBe(42)
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { count: "42" }
          }).layer
        )
      ))

    it.effect("Input.boolean returns boolean", () =>
      Effect.gen(function*() {
        const value = yield* Input.boolean("flag")
        expect(value).toBe(true)
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { flag: "yes" }
          }).layer
        )
      ))

    it.effect("Input.secret returns Redacted", () =>
      Effect.gen(function*() {
        const value = yield* Input.secret("token")
        expect(typeof value).toBe("object")
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { token: "secret" }
          }).layer
        )
      ))

    it.effect("Input.json parses and validates", () =>
      Effect.gen(function*() {
        const MySchema = Schema.Struct({ x: Schema.Number })
        const value = yield* Input.json("data", MySchema)
        expect(value).toEqual({ x: 5 })
      }).pipe(
        Effect.provide(
          ActionRunnerTest.make({
            inputs: { data: "{\"x\": 5}" }
          }).layer
        )
      ))
  })
})
