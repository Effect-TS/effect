import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as ActionClient from "../src/ActionClient.js"
import * as ActionClientTest from "../src/ActionClientTest.js"

// Re-export for backwards compatibility in tests
const makeTestLayer = ActionClientTest.make

describe("ActionClient", () => {
  describe("octokit", () => {
    it.effect("returns octokit client", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer()
        const client = yield* ActionClient.octokit.pipe(Effect.provide(layer))
        expect(client).toBeDefined()
        expect(typeof client.request).toBe("function")
      }))
  })

  describe("request", () => {
    it.effect("makes successful request", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          requestResult: { data: { login: "octocat" } }
        })
        const result = yield* ActionClient.request<{ data: { login: string } }>("GET /user").pipe(
          Effect.provide(layer)
        )
        expect(result.data.login).toBe("octocat")
      }))

    it.effect("converts error to ActionApiError", () =>
      Effect.gen(function*() {
        const error = Object.assign(new Error("Not Found"), { status: 404 })
        const layer = makeTestLayer({ requestResult: error })
        const result = yield* ActionClient.request("GET /repos/owner/repo").pipe(
          Effect.provide(layer),
          Effect.either
        )
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionApiError")
          expect(result.left.status).toBe(404)
          expect(result.left.method).toBe("GET /repos/owner/repo")
        }
      }))
  })

  describe("graphql", () => {
    it.effect("makes successful GraphQL request", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          graphqlResult: { repository: { name: "hello-world" } }
        })
        const result = yield* ActionClient.graphql<{ repository: { name: string } }>(
          "query { repository(owner: $owner, name: $name) { name } }",
          { owner: "octocat", name: "hello-world" }
        ).pipe(Effect.provide(layer))
        expect(result.repository.name).toBe("hello-world")
      }))

    it.effect("converts GraphQL error to ActionApiError", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ graphqlResult: new Error("GraphQL error") })
        const result = yield* ActionClient.graphql("query { viewer { login } }").pipe(
          Effect.provide(layer),
          Effect.either
        )
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionApiError")
          expect(result.left.method).toBe("graphql")
        }
      }))
  })

  describe("paginate", () => {
    it.effect("returns paginated results", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({
          paginateResult: [{ id: 1 }, { id: 2 }, { id: 3 }]
        })
        const result = yield* ActionClient.paginate<{ id: number }>("GET /repos/owner/repo/issues").pipe(
          Effect.provide(layer)
        )
        expect(result).toHaveLength(3)
        expect(result[0].id).toBe(1)
      }))

    it.effect("converts pagination error to ActionApiError", () =>
      Effect.gen(function*() {
        const layer = makeTestLayer({ paginateResult: new Error("Rate limited") })
        const result = yield* ActionClient.paginate("GET /repos/owner/repo/issues").pipe(
          Effect.provide(layer),
          Effect.either
        )
        expect(result._tag).toBe("Left")
        if (result._tag === "Left") {
          expect(result.left._tag).toBe("ActionApiError")
        }
      }))
  })
})
