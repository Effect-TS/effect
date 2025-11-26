import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ActionInputError } from "../src/ActionError.js"
import * as ActionRunner from "../src/ActionRunner.js"

// Test layer that mocks @actions/core behavior
const makeTestLayer = (options: {
  inputs?: Record<string, string>
  outputs?: Record<string, unknown>
  logs?: Array<{ level: string; message: string }>
  groups?: string[]
  secrets?: string[]
  state?: Record<string, string>
  env?: Record<string, string>
  paths?: string[]
  failed?: { message: string } | null
}) => {
  const inputs = options.inputs ?? {}
  const outputs = options.outputs ?? {}
  const logs: Array<{ level: string; message: string }> = options.logs ?? []
  const groups: string[] = options.groups ?? []
  const secrets: string[] = options.secrets ?? []
  const state = options.state ?? {}
  const env = options.env ?? {}
  const paths: string[] = options.paths ?? []
  let failed: { message: string } | null = options.failed ?? null

  const runner: ActionRunner.ActionRunner = {
    [ActionRunner.TypeId]: ActionRunner.TypeId,

    getInput: (name, opts) =>
      Effect.sync(() => {
        const val = inputs[name] ?? ""
        if (opts?.required && !val) {
          throw new Error(`Input required and not supplied: ${name}`)
        }
        return opts?.trimWhitespace === false ? val : val.trim()
      }),

    getMultilineInput: (name, opts) =>
      Effect.sync(() => {
        const val = inputs[name] ?? ""
        if (opts?.required && !val) {
          throw new Error(`Input required and not supplied: ${name}`)
        }
        const lines = val.split("\n").filter((x) => x !== "")
        return opts?.trimWhitespace === false ? lines : lines.map((l) => l.trim())
      }),

    getBooleanInput: (name, opts) =>
      Effect.try({
        try: () => {
          const val = inputs[name] ?? ""
          if (opts?.required && !val) {
            throw new Error(`Input required and not supplied: ${name}`)
          }
          if (["true", "True", "TRUE"].includes(val)) return true
          if (["false", "False", "FALSE"].includes(val)) return false
          throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}`)
        },
        catch: (error) =>
          new ActionInputError({
            reason: "InvalidType",
            name,
            cause: error
          })
      }),

    setOutput: (name, value) =>
      Effect.sync(() => {
        ;(outputs as Record<string, unknown>)[name] = value
      }),

    debug: (message) =>
      Effect.sync(() => {
        logs.push({ level: "debug", message })
      }),

    info: (message) =>
      Effect.sync(() => {
        logs.push({ level: "info", message })
      }),

    warning: (message) =>
      Effect.sync(() => {
        logs.push({ level: "warning", message: message instanceof Error ? message.message : message })
      }),

    error: (message) =>
      Effect.sync(() => {
        logs.push({ level: "error", message: message instanceof Error ? message.message : message })
      }),

    notice: (message) =>
      Effect.sync(() => {
        logs.push({ level: "notice", message: message instanceof Error ? message.message : message })
      }),

    startGroup: (name) =>
      Effect.sync(() => {
        groups.push(name)
      }),

    endGroup: () =>
      Effect.sync(() => {
        groups.pop()
      }),

    group: <A, E, R>(name: string, fn: () => Effect.Effect<A, E, R>) =>
      Effect.acquireUseRelease(
        Effect.sync(() => {
          groups.push(name)
        }),
        () => fn(),
        () =>
          Effect.sync(() => {
            groups.pop()
          })
      ),

    exportVariable: (name, value) =>
      Effect.sync(() => {
        env[name] = value
      }),

    addPath: (path) =>
      Effect.sync(() => {
        paths.push(path)
      }),

    setSecret: (secret) =>
      Effect.sync(() => {
        secrets.push(secret)
      }),

    saveState: (name, value) =>
      Effect.sync(() => {
        state[name] = typeof value === "string" ? value : JSON.stringify(value)
      }),

    getState: (name) =>
      Effect.sync(() => {
        return state[name] ?? ""
      }),

    setFailed: (message) =>
      Effect.sync(() => {
        failed = { message: message instanceof Error ? message.message : message }
      }),

    getIDToken: () => Effect.succeed("mock-oidc-token")
  }

  return {
    layer: Layer.succeed(ActionRunner.ActionRunner, runner),
    outputs,
    logs,
    groups,
    secrets,
    state,
    env,
    paths,
    getFailed: () => failed
  }
}

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
