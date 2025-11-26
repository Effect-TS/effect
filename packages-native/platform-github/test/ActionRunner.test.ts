import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as ActionRunner from "../src/ActionRunner.js"
import * as ActionRunnerTest from "../src/ActionRunnerTest.js"

// Re-export for backwards compatibility in tests
const makeTestLayer = ActionRunnerTest.make

describe("ActionRunner", () => {
  describe("getInput", () => {
    it.effect("returns input value", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: { name: "world" } })
        const result = yield* ActionRunner.getInput("name").pipe(Effect.provide(test.layer))
        expect(result).toBe("world")
      }))

    it.effect("trims whitespace by default", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: { name: "  world  " } })
        const result = yield* ActionRunner.getInput("name").pipe(Effect.provide(test.layer))
        expect(result).toBe("world")
      }))

    it.effect("returns empty string for missing input", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: {} })
        const result = yield* ActionRunner.getInput("name").pipe(Effect.provide(test.layer))
        expect(result).toBe("")
      }))
  })

  describe("getMultilineInput", () => {
    it.effect("splits by newline", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: { items: "a\nb\nc" } })
        const result = yield* ActionRunner.getMultilineInput("items").pipe(Effect.provide(test.layer))
        expect(result).toEqual(["a", "b", "c"])
      }))

    it.effect("filters empty lines", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: { items: "a\n\nb\n" } })
        const result = yield* ActionRunner.getMultilineInput("items").pipe(Effect.provide(test.layer))
        expect(result).toEqual(["a", "b"])
      }))
  })

  describe("getBooleanInput", () => {
    it.effect("returns true for 'true'", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: { flag: "true" } })
        const result = yield* ActionRunner.getBooleanInput("flag").pipe(Effect.provide(test.layer))
        expect(result).toBe(true)
      }))

    it.effect("returns false for 'false'", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: { flag: "false" } })
        const result = yield* ActionRunner.getBooleanInput("flag").pipe(Effect.provide(test.layer))
        expect(result).toBe(false)
      }))

    it.effect("fails for invalid value", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({ inputs: { flag: "maybe" } })
        const result = yield* ActionRunner.getBooleanInput("flag").pipe(
          Effect.provide(test.layer),
          Effect.either
        )
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionInputError")
          expect(result.left.reason).toBe("InvalidType")
        }
      }))
  })

  describe("setOutput", () => {
    it.effect("sets output value", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.setOutput("result", "success").pipe(Effect.provide(test.layer))
        expect(test.outputs["result"]).toBe("success")
      }))
  })

  describe("logging", () => {
    it.effect("logs debug message", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.debug("debug message").pipe(Effect.provide(test.layer))
        expect(test.logs).toContainEqual({ level: "debug", message: "debug message" })
      }))

    it.effect("logs info message", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.info("info message").pipe(Effect.provide(test.layer))
        expect(test.logs).toContainEqual({ level: "info", message: "info message" })
      }))

    it.effect("logs warning message", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.warning("warning message").pipe(Effect.provide(test.layer))
        expect(test.logs).toContainEqual({ level: "warning", message: "warning message" })
      }))

    it.effect("logs error message", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.error("error message").pipe(Effect.provide(test.layer))
        expect(test.logs).toContainEqual({ level: "error", message: "error message" })
      }))

    it.effect("logs notice message", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.notice("notice message").pipe(Effect.provide(test.layer))
        expect(test.logs).toContainEqual({ level: "notice", message: "notice message" })
      }))
  })

  describe("groups", () => {
    it.effect("startGroup and endGroup work", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.startGroup("my-group").pipe(Effect.provide(test.layer))
        expect(test.groups).toContain("my-group")
        yield* ActionRunner.endGroup.pipe(Effect.provide(test.layer))
        expect(test.groups).not.toContain("my-group")
      }))

    it.effect("group wraps function", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        const result = yield* ActionRunner.group("my-group", () => Effect.succeed(42)).pipe(
          Effect.provide(test.layer)
        )
        expect(result).toBe(42)
        expect(test.groups).toEqual([])
      }))
  })

  describe("environment", () => {
    it.effect("exportVariable sets env var", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.exportVariable("MY_VAR", "my-value").pipe(Effect.provide(test.layer))
        expect(test.env["MY_VAR"]).toBe("my-value")
      }))

    it.effect("addPath adds to path", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.addPath("/usr/local/bin").pipe(Effect.provide(test.layer))
        expect(test.paths).toContain("/usr/local/bin")
      }))

    it.effect("setSecret masks secret", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.setSecret("my-secret").pipe(Effect.provide(test.layer))
        expect(test.secrets).toContain("my-secret")
      }))
  })

  describe("state", () => {
    it.effect("saveState and getState work", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.saveState("key", "value").pipe(Effect.provide(test.layer))
        const result = yield* ActionRunner.getState("key").pipe(Effect.provide(test.layer))
        expect(result).toBe("value")
      }))
  })

  describe("setFailed", () => {
    it.effect("marks action as failed", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        yield* ActionRunner.setFailed("Something went wrong").pipe(Effect.provide(test.layer))
        expect(test.getFailed()).toEqual({ message: "Something went wrong" })
      }))
  })

  describe("getIDToken", () => {
    it.effect("returns OIDC token", () =>
      Effect.gen(function*() {
        const test = makeTestLayer({})
        const result = yield* ActionRunner.getIDToken().pipe(Effect.provide(test.layer))
        expect(result).toBe("mock-oidc-token")
      }))
  })
})
