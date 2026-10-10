import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer, Ref, Stream } from "effect"
import { GraphQLClient, GraphQLMiddleware } from "effect/graphql"
import type * as GraphQLProtocol from "effect/graphql/GraphQLProtocol"
import { expectReason, IssuesGroup, protocolLayer } from "./fixtures.ts"

const issue = (number: number) => ({ number, title: `#${number}`, createdAt: "2026-01-01T00:00:00Z" })

const page = (nodes: ReadonlyArray<unknown> | null, pageInfo: { hasNextPage: boolean; endCursor: string | null }) => ({
  data: { repository: { issues: { pageInfo, nodes } } }
})

const noRepository = { data: { repository: null } }

/** Scripts one response per `after` cursor; the first page is keyed `start`. */
const pagedLayer = (pages: Record<string, unknown>) =>
  Effect.gen(function*() {
    const requests = yield* Ref.make<Array<GraphQLProtocol.GraphQLRequest>>([])
    const layer = protocolLayer({
      execute: (request) =>
        Effect.gen(function*() {
          yield* Ref.update(requests, (all) => [...all, request])
          const after = (request.variables as { after?: string | null }).after ?? "start"
          return pages[after]
        })
    })
    return { layer, requests }
  })

const threePages = {
  start: page([issue(1), issue(2)], { hasNextPage: true, endCursor: "c1" }),
  c1: page([issue(3), issue(4)], { hasNextPage: true, endCursor: "c2" }),
  c2: page([issue(5)], { hasNextPage: false, endCursor: null })
}

const variables = { owner: "Effect-TS", name: "effect" }

const makeClient = <R>(layer: Layer.Layer<R>) => GraphQLClient.make(IssuesGroup).pipe(Effect.provide(layer))

describe("GraphQLClient.pages / items", () => {
  it.effect("fetches page after page, passing endCursor as $after, until hasNextPage is false", () =>
    Effect.gen(function*() {
      const { layer, requests } = yield* pagedLayer(threePages)
      const client = yield* makeClient(layer)
      const pages = yield* Stream.runCollect(
        GraphQLClient.pages(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      )
      assert.deepStrictEqual(pages.map((p) => p.pageInfo.endCursor), ["c1", "c2", null])
      assert.deepStrictEqual(
        (yield* Ref.get(requests)).map((r) => (r.variables as { after?: string | null }).after),
        [undefined, "c1", "c2"]
      )
    }))

  it.effect("items flattens nodes across pages and keeps null entries", () =>
    Effect.gen(function*() {
      const { layer } = yield* pagedLayer({
        start: page([issue(1), null], { hasNextPage: true, endCursor: "c1" }),
        c1: page([issue(2)], { hasNextPage: false, endCursor: null })
      })
      const client = yield* makeClient(layer)
      const items = yield* Stream.runCollect(
        GraphQLClient.items(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      )
      assert.deepStrictEqual(items.map((i) => i === null ? null : i.number), [1, null, 2])
    }))

  it.effect("a null connection on the first page is an empty stream", () =>
    Effect.gen(function*() {
      const { layer } = yield* pagedLayer({ start: noRepository })
      const client = yield* makeClient(layer)
      const pages = yield* Stream.runCollect(
        GraphQLClient.pages(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      )
      const items = yield* Stream.runCollect(
        GraphQLClient.items(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      )
      assert.deepStrictEqual(pages, [])
      assert.deepStrictEqual(items, [])
    }))

  it.effect("a null connection on a later page is a PaginationError naming the cursor used", () =>
    Effect.gen(function*() {
      const { layer } = yield* pagedLayer({ ...threePages, c1: noRepository })
      const client = yield* makeClient(layer)
      const reason = yield* Stream.runCollect(
        GraphQLClient.pages(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      ).pipe(expectReason("PaginationError"))
      assert.strictEqual(reason.cursor, "c1")
      assert.isFalse(reason.isRetryable)
    }))

  it.effect("a cursor that does not advance is a PaginationError", () =>
    Effect.gen(function*() {
      const { layer, requests } = yield* pagedLayer({
        ...threePages,
        c1: page([issue(3)], { hasNextPage: true, endCursor: "c1" })
      })
      const client = yield* makeClient(layer)
      const reason = yield* Stream.runCollect(
        GraphQLClient.pages(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      ).pipe(expectReason("PaginationError"))
      assert.strictEqual(reason.cursor, "c1")
      // It fails instead of fetching the same page again.
      assert.strictEqual((yield* Ref.get(requests)).length, 2)
    }))

  it.effect("hasNextPage with a null endCursor is a PaginationError", () =>
    Effect.gen(function*() {
      const { layer } = yield* pagedLayer({
        start: page([issue(1)], { hasNextPage: true, endCursor: null })
      })
      const client = yield* makeClient(layer)
      const reason = yield* Stream.runCollect(
        GraphQLClient.items(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      ).pipe(expectReason("PaginationError"))
      assert.strictEqual(reason.cursor, null)
    }))

  it.effect("middleware runs on every page and sees the forwarded options", () =>
    Effect.gen(function*() {
      class Count extends GraphQLMiddleware.Service<Count>()("test/Count") {}
      const seen = yield* Ref.make<Array<string | undefined>>([])
      const { layer } = yield* pagedLayer(threePages)
      const client = yield* GraphQLClient.make(IssuesGroup.middleware(Count)).pipe(
        Effect.provide([
          layer,
          Layer.succeed(
            Count,
            GraphQLMiddleware.mapRequest((request) =>
              Effect.as(Ref.update(seen, (all) => [...all, request.headers["x-page-run"]]), request)
            )
          )
        ])
      )
      yield* Stream.runDrain(
        GraphQLClient.pages(client.RepoIssues, {
          variables,
          connection: (r) => r.repository?.issues,
          options: { headers: { "x-page-run": "1" } }
        })
      )
      assert.deepStrictEqual(yield* Ref.get(seen), ["1", "1", "1"])
    }))

  it.effect("Stream.take stops further fetches", () =>
    Effect.gen(function*() {
      const { layer, requests } = yield* pagedLayer(threePages)
      const client = yield* makeClient(layer)
      const pages = yield* GraphQLClient.pages(client.RepoIssues, {
        variables,
        connection: (r) => r.repository?.issues
      }).pipe(Stream.take(1), Stream.runCollect)
      assert.strictEqual(pages.length, 1)
      assert.strictEqual((yield* Ref.get(requests)).length, 1)
    }))

  it.effect("interrupting the stream interrupts the page fetch in flight", () =>
    Effect.gen(function*() {
      const secondPageStarted = yield* Deferred.make<void>()
      const secondPageInterrupted = yield* Deferred.make<void>()
      const layer = protocolLayer({
        execute: (request) =>
          (request.variables as { after?: string | null }).after === undefined
            ? Effect.succeed(threePages.start)
            : Deferred.succeed(secondPageStarted, undefined).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Deferred.succeed(secondPageInterrupted, undefined))
            )
      })
      const client = yield* makeClient(layer)
      const fiber = yield* Stream.runCollect(
        GraphQLClient.pages(client.RepoIssues, { variables, connection: (r) => r.repository?.issues })
      ).pipe(Effect.forkChild)
      yield* Deferred.await(secondPageStarted)
      yield* Fiber.interrupt(fiber)
      yield* Deferred.await(secondPageInterrupted)
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(fiber)))
    }))
})
