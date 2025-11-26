import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as GitHubActionRunner from "../src/GitHubActionRunner.js"

/**
 * Mock implementation of GitHubActionRunner for testing
 */
const mockInputs = new Map<string, string>([
  ["greeting", "Hello"],
  ["who-to-greet", "World"],
  ["enabled", "true"]
])

const mockOutputs = new Map<string, unknown>()
const logs: Array<{ level: string; message: string }> = []

const MockGitHubActionRunner: GitHubActionRunner.GitHubActionRunner = {
  getInput: (name) => Effect.sync(() => mockInputs.get(name) ?? ""),

  getMultilineInput: (name) =>
    Effect.sync(() => {
      const value = mockInputs.get(name) ?? ""
      return value.split("\n").filter((x) => x !== "")
    }),

  getBooleanInput: (name) =>
    Effect.try({
      try: () => {
        const val = mockInputs.get(name) ?? ""
        if (["true", "True", "TRUE"].includes(val)) return true
        if (["false", "False", "FALSE"].includes(val)) return false
        throw new Error(`Invalid boolean: ${val}`)
      },
      catch: () => new GitHubActionRunner.GitHubActionInvalidBooleanInputError(name, mockInputs.get(name) ?? "")
    }),

  setOutput: (name, value) =>
    Effect.sync(() => {
      mockOutputs.set(name, value)
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
      logs.push({ level: "warning", message })
    }),

  error: (message) =>
    Effect.sync(() => {
      logs.push({ level: "error", message })
    }),

  notice: (message) =>
    Effect.sync(() => {
      logs.push({ level: "notice", message })
    }),

  isDebug: Effect.succeed(false),

  startGroup: () => Effect.void,

  endGroup: Effect.void,

  group: (_name, effect) => effect,

  exportVariable: () => Effect.void,

  addPath: () => Effect.void,

  setSecret: () => Effect.void,

  saveState: () => Effect.void,

  getState: () => Effect.succeed(""),

  setFailed: (message) =>
    Effect.sync(() => {
      logs.push({ level: "failed", message })
    })
}

const MockGitHubActionRunnerLayer = Layer.succeed(GitHubActionRunner.GitHubActionRunner, MockGitHubActionRunner)

describe("GitHubActionRunner", () => {
  it.effect("getInput returns the input value", () =>
    Effect.gen(function*() {
      const result = yield* GitHubActionRunner.getInput("greeting")
      return result === "Hello"
    }).pipe(
      Effect.provide(MockGitHubActionRunnerLayer),
      Effect.map((result) => {
        if (!result) throw new Error("Expected greeting to be 'Hello'")
      })
    ))

  it.effect("getBooleanInput returns true for 'true'", () =>
    Effect.gen(function*() {
      const result = yield* GitHubActionRunner.getBooleanInput("enabled")
      return result === true
    }).pipe(
      Effect.provide(MockGitHubActionRunnerLayer),
      Effect.map((result) => {
        if (!result) throw new Error("Expected enabled to be true")
      })
    ))

  it.effect("setOutput stores the value", () =>
    Effect.gen(function*() {
      yield* GitHubActionRunner.setOutput("message", "Hello World!")
      return mockOutputs.get("message") === "Hello World!"
    }).pipe(
      Effect.provide(MockGitHubActionRunnerLayer),
      Effect.map((result) => {
        if (!result) throw new Error("Expected output to be set")
      })
    ))

  it.effect("info logs a message", () =>
    Effect.gen(function*() {
      logs.length = 0
      yield* GitHubActionRunner.info("Test message")
      return logs.some((log) => log.level === "info" && log.message === "Test message")
    }).pipe(
      Effect.provide(MockGitHubActionRunnerLayer),
      Effect.map((result) => {
        if (!result) throw new Error("Expected info log")
      })
    ))
})
