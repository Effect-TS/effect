import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as ActionContext from "../src/ActionContext.js"
import * as ActionContextTest from "../src/ActionContextTest.js"

// Re-export for backwards compatibility in tests
const makeTestLayer = ActionContextTest.make

describe("ActionContext", () => {
  describe("basic properties", () => {
    it.effect("returns eventName", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ eventName: "pull_request" })
        const result = yield* ActionContext.eventName.pipe(Effect.provide(layer))
        expect(result).toBe("pull_request")
      }))

    it.effect("returns sha", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ sha: "def456" })
        const result = yield* ActionContext.sha.pipe(Effect.provide(layer))
        expect(result).toBe("def456")
      }))

    it.effect("returns ref", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ ref: "refs/heads/feature" })
        const result = yield* ActionContext.ref.pipe(Effect.provide(layer))
        expect(result).toBe("refs/heads/feature")
      }))

    it.effect("returns workflow", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ workflow: "Build and Test" })
        const result = yield* ActionContext.workflow.pipe(Effect.provide(layer))
        expect(result).toBe("Build and Test")
      }))

    it.effect("returns action", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ action: "my-action" })
        const result = yield* ActionContext.action.pipe(Effect.provide(layer))
        expect(result).toBe("my-action")
      }))

    it.effect("returns actor", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ actor: "monalisa" })
        const result = yield* ActionContext.actor.pipe(Effect.provide(layer))
        expect(result).toBe("monalisa")
      }))

    it.effect("returns job", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ job: "test" })
        const result = yield* ActionContext.job.pipe(Effect.provide(layer))
        expect(result).toBe("test")
      }))
  })

  describe("run properties", () => {
    it.effect("returns runId", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ runId: 99999 })
        const result = yield* ActionContext.runId.pipe(Effect.provide(layer))
        expect(result).toBe(99999)
      }))

    it.effect("returns runNumber", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ runNumber: 42 })
        const result = yield* ActionContext.runNumber.pipe(Effect.provide(layer))
        expect(result).toBe(42)
      }))

    it.effect("returns runAttempt", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ runAttempt: 3 })
        const result = yield* ActionContext.runAttempt.pipe(Effect.provide(layer))
        expect(result).toBe(3)
      }))
  })

  describe("URL properties", () => {
    it.effect("returns apiUrl", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ apiUrl: "https://api.github.example.com" })
        const result = yield* ActionContext.apiUrl.pipe(Effect.provide(layer))
        expect(result).toBe("https://api.github.example.com")
      }))

    it.effect("returns serverUrl", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ serverUrl: "https://github.example.com" })
        const result = yield* ActionContext.serverUrl.pipe(Effect.provide(layer))
        expect(result).toBe("https://github.example.com")
      }))

    it.effect("returns graphqlUrl", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ graphqlUrl: "https://api.github.example.com/graphql" })
        const result = yield* ActionContext.graphqlUrl.pipe(Effect.provide(layer))
        expect(result).toBe("https://api.github.example.com/graphql")
      }))
  })

  describe("payload", () => {
    it.effect("returns payload object", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          payload: {
            action: "opened",
            pull_request: { number: 123 }
          }
        })
        const result = yield* ActionContext.payload.pipe(Effect.provide(layer))
        expect(result).toEqual({
          action: "opened",
          pull_request: { number: 123 }
        })
      }))
  })

  describe("computed properties", () => {
    it.effect("returns repo", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          repo: { owner: "my-org", repo: "my-repo" }
        })
        const result = yield* ActionContext.repo.pipe(Effect.provide(layer))
        expect(result).toEqual({ owner: "my-org", repo: "my-repo" })
      }))

    it.effect("repo fails when not available", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          repo: new Error("GITHUB_REPOSITORY not set")
        })
        const result = yield* ActionContext.repo.pipe(Effect.provide(layer), Effect.either)
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionContextError")
          expect(result.left.reason).toBe("InvalidRepo")
        }
      }))

    it.effect("returns issue", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          issue: { owner: "my-org", repo: "my-repo", number: 42 }
        })
        const result = yield* ActionContext.issue.pipe(Effect.provide(layer))
        expect(result).toEqual({ owner: "my-org", repo: "my-repo", number: 42 })
      }))

    it.effect("issue fails when not available", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          issue: new Error("Not in issue/PR context")
        })
        const result = yield* ActionContext.issue.pipe(Effect.provide(layer), Effect.either)
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionContextError")
        }
      }))
  })
})
