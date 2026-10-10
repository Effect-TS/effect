import { assert, describe, it } from "@effect/vitest"
import { Context, DateTime, Effect, Layer, Ref, Schema } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLMiddleware } from "effect/graphql"
import type { GraphQLError } from "effect/graphql/GraphQLClientError"
import { AddComment, executeLayer, expectReason, IssuesGroup, RepoIssues, Viewer, ViewerGroup } from "./fixtures.ts"

class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()("test/CurrentUser") {}
class TokenExpired extends Schema.TaggedError<TokenExpired>()("TokenExpired", { user: Schema.String }) {}

class Auth extends GraphQLMiddleware.Service<Auth, { requires: CurrentUser; error: TokenExpired }>()("test/Auth") {}
class Log extends GraphQLMiddleware.Service<Log>()("test/Log") {}
class OpA extends GraphQLMiddleware.Service<OpA>()("test/OpA") {}
class OpB extends GraphQLMiddleware.Service<OpB>()("test/OpB") {}
class GroupA extends GraphQLMiddleware.Service<GroupA>()("test/GroupA") {}
class GroupB extends GraphQLMiddleware.Service<GroupB>()("test/GroupB") {}

const AuthLive = Layer.succeed(
  Auth,
  GraphQLMiddleware.mapRequest(Effect.fnUntraced(function*(request) {
    const user = yield* CurrentUser
    if (user.id === "expired") return yield* new TokenExpired({ user: user.id })
    return { ...request, headers: { ...request.headers, authorization: `Bearer ${user.id}` } }
  }))
)

const viewerData = { data: { viewer: { login: "tim" } } }

describe("GraphQLClient", () => {
  describe("middleware", () => {
    it.effect("group middleware runs outside operation middleware, attach order within a level", () =>
      Effect.gen(function*() {
        const log = yield* Ref.make<Array<string>>([])
        const record = (name: string) =>
          GraphQLMiddleware.mapRequest((request) => Effect.as(Ref.update(log, (all) => [...all, name]), request))

        const group = GraphQLGroup.make(GraphQL.middleware(GraphQL.middleware(Viewer, OpA), OpB))
          .middleware(GroupA)
          .middleware(GroupB)
        const { layer } = yield* executeLayer(viewerData)

        yield* GraphQLClient.make(group).pipe(
          Effect.flatMap((client) => client.Viewer()),
          Effect.provide([
            layer,
            Layer.succeed(OpA, record("OpA")),
            Layer.succeed(OpB, record("OpB")),
            Layer.succeed(GroupA, record("GroupA")),
            Layer.succeed(GroupB, record("GroupB"))
          ])
        )
        assert.deepStrictEqual(yield* Ref.get(log), ["GroupA", "GroupB", "OpA", "OpB"])
      }))

    it.effect("middleware attached to one operation does not run for the others", () =>
      Effect.gen(function*() {
        const log = yield* Ref.make<Array<string>>([])
        const group = GraphQLGroup.make(GraphQL.middleware(RepoIssues, OpA), Viewer)
        const { layer } = yield* executeLayer({ data: { viewer: { login: "tim" }, repository: null } })

        yield* GraphQLClient.make(group).pipe(
          Effect.flatMap((client) =>
            Effect.andThen(client.Viewer(), client.RepoIssues({ owner: "Effect-TS", name: "effect" }))
          ),
          Effect.provide([
            layer,
            Layer.succeed(
              OpA,
              GraphQLMiddleware.mapRequest((request) =>
                Effect.as(Ref.update(log, (all) => [...all, request.operationName]), request)
              )
            )
          ])
        )
        assert.deepStrictEqual(yield* Ref.get(log), ["RepoIssues"])
      }))

    it.effect("mapRequest applies a request transform and its requirements and errors reach the caller", () =>
      Effect.gen(function*() {
        const { layer, requests } = yield* executeLayer(viewerData)
        const client = yield* GraphQLClient.make(ViewerGroup.middleware(Auth)).pipe(Effect.provide([layer, AuthLive]))

        yield* client.Viewer().pipe(Effect.provideService(CurrentUser, { id: "tim" }))
        assert.strictEqual((yield* Ref.get(requests))[0].headers["authorization"], "Bearer tim")

        const error = yield* client.Viewer().pipe(
          Effect.provideService(CurrentUser, { id: "expired" }),
          Effect.flip
        )
        assert.instanceOf(error, TokenExpired)
        assert.strictEqual((yield* Ref.get(requests)).length, 1)
      }))

    it.effect("middleware sees per-call headers and the raw response extensions", () =>
      Effect.gen(function*() {
        const seenHeaders = yield* Ref.make<Record<string, string>>({})
        const seenExtensions = yield* Ref.make<unknown>(undefined)
        const LogLive = Layer.succeed(Log, {
          execute: ({ next, request }) =>
            Ref.set(seenHeaders, request.headers).pipe(
              Effect.andThen(next(request)),
              Effect.tap((result) => Ref.set(seenExtensions, result.extensions))
            ),
          subscribe: ({ next, request }) => next(request)
        })
        const { layer } = yield* executeLayer({ ...viewerData, extensions: { cost: { requested: 1 } } })

        const result = yield* GraphQLClient.make(ViewerGroup.middleware(Log)).pipe(
          Effect.flatMap((client) => client.Viewer(undefined, { headers: { "x-request-id": "abc" } })),
          Effect.provide([layer, LogLive])
        )
        assert.deepStrictEqual(result, { viewer: { login: "tim" } })
        assert.strictEqual((yield* Ref.get(seenHeaders))["x-request-id"], "abc")
        assert.deepStrictEqual(yield* Ref.get(seenExtensions), { cost: { requested: 1 } })
      }))

    it.effect("the per-call context option provides services to middleware", () =>
      Effect.gen(function*() {
        const { layer, requests } = yield* executeLayer(viewerData)
        const client = yield* GraphQLClient.make(ViewerGroup.middleware(Auth)).pipe(Effect.provide([layer, AuthLive]))

        // No outer provideService: the context option satisfies CurrentUser.
        yield* client.Viewer(undefined, { context: Context.make(CurrentUser, { id: "ctx" }) })
        assert.strictEqual((yield* Ref.get(requests))[0].headers["authorization"], "Bearer ctx")
      }))
  })

  describe("variables", () => {
    it.effect("encodes variables through the custom scalar codec", () =>
      Effect.gen(function*() {
        const { layer, requests } = yield* executeLayer({ data: { repository: null } })
        yield* GraphQLClient.make(IssuesGroup).pipe(
          Effect.flatMap((client) =>
            client.RepoIssues({
              owner: "Effect-TS",
              name: "effect",
              since: DateTime.makeUnsafe("2026-01-01T00:00:00Z")
            })
          ),
          Effect.provide(layer)
        )
        const [request] = yield* Ref.get(requests)
        assert.strictEqual(request.operationName, "RepoIssues")
        assert.strictEqual(request.query, RepoIssues.document)
        assert.deepStrictEqual(request.variables, {
          owner: "Effect-TS",
          name: "effect",
          since: "2026-01-01T00:00:00.000Z"
        })
      }))

    it.effect("decodes results through the custom scalar codec", () =>
      Effect.gen(function*() {
        const { layer } = yield* executeLayer({
          data: {
            repository: {
              issues: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [{ number: 1, title: "Hi", createdAt: "2026-01-01T00:00:00Z" }]
              }
            }
          }
        })
        const result = yield* GraphQLClient.make(IssuesGroup).pipe(
          Effect.flatMap((client) => client.RepoIssues({ owner: "Effect-TS", name: "effect" })),
          Effect.provide(layer)
        )
        const node = result.repository!.issues!.nodes![0]!
        assert.isTrue(DateTime.isDateTime(node.createdAt))
        assert.strictEqual(DateTime.formatIso(node.createdAt), "2026-01-01T00:00:00.000Z")
      }))

    it.effect("a rejected input is an EncodeError and nothing is sent", () =>
      Effect.gen(function*() {
        const First = GraphQL.query("First", {
          document: "query First($first:Int!){viewer{login}}",
          variables: { first: Schema.Int.check(Schema.isGreaterThan(0)) },
          result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
        })
        const { layer, requests } = yield* executeLayer(viewerData)
        const reason = yield* GraphQLClient.make(GraphQLGroup.make(First)).pipe(
          Effect.flatMap((client) => client.First({ first: 0 })),
          Effect.provide(layer),
          expectReason("EncodeError")
        )
        assert.isString(reason.description)
        assert.deepStrictEqual(yield* Ref.get(requests), [])
      }))
  })

  describe("results", () => {
    it.effect("a response with errors fails with ResponseError carrying the raw data", () =>
      Effect.gen(function*() {
        const { layer } = yield* executeLayer({
          data: { repository: null },
          errors: [{ message: "Could not resolve", path: ["repository"], extensions: { type: "NOT_FOUND" } }]
        })
        const reason = yield* GraphQLClient.make(IssuesGroup).pipe(
          Effect.flatMap((client) => client.RepoIssues({ owner: "Effect-TS", name: "nope" })),
          Effect.provide(layer),
          expectReason("ResponseError")
        )
        assert.deepStrictEqual(reason.data, { repository: null })
        assert.strictEqual(reason.errors[0].path?.[0], "repository")
      }))

    it.effect("data that does not match the result schema is a DecodeError", () =>
      Effect.gen(function*() {
        const { layer } = yield* executeLayer({ data: { viewer: { login: 42 } } })
        const reason = yield* GraphQLClient.make(ViewerGroup).pipe(
          Effect.flatMap((client) => client.Viewer()),
          Effect.provide(layer),
          expectReason("DecodeError")
        )
        assert.isString(reason.description)
      }))
  })

  describe("partial results", () => {
    const partialIssues = {
      data: {
        repository: {
          issues: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ number: 1, title: "Hi", createdAt: "2026-01-01T00:00:00Z" }, null]
          }
        }
      },
      errors: [{ message: "Not found", path: ["repository", "issues", "nodes", 1] }]
    }

    const callRepoIssues = (result: unknown) =>
      Effect.gen(function*() {
        const { layer } = yield* executeLayer(result)
        const client = yield* GraphQLClient.make(IssuesGroup).pipe(Effect.provide(layer))
        return {
          partial: client.RepoIssues({ owner: "Effect-TS", name: "effect" }, { partial: true }),
          strict: client.RepoIssues({ owner: "Effect-TS", name: "effect" })
        }
      })

    it.effect("errors plus decodable data returns both", () =>
      Effect.gen(function*() {
        const { partial } = yield* callRepoIssues(partialIssues)
        const { data, errors } = yield* partial
        assert.strictEqual(data.repository!.issues!.nodes![0]!.title, "Hi")
        assert.strictEqual(data.repository!.issues!.nodes![1], null)
        assert.deepStrictEqual<ReadonlyArray<GraphQLError>>(errors, [{
          message: "Not found",
          path: ["repository", "issues", "nodes", 1]
        }])
      }))

    it.effect("partial: true with no errors returns errors: []", () =>
      Effect.gen(function*() {
        const { partial } = yield* callRepoIssues({ data: { repository: null } })
        const { data, errors } = yield* partial
        assert.deepStrictEqual(data, { repository: null })
        assert.deepStrictEqual(errors, [])
      }))

    it.effect("data: null plus errors is a ResponseError", () =>
      Effect.gen(function*() {
        const { partial } = yield* callRepoIssues({ data: null, errors: [{ message: "boom" }] })
        const reason = yield* expectReason("ResponseError")(partial)
        assert.deepStrictEqual(reason.errors, [{ message: "boom" }])
      }))

    it.effect("missing data plus errors is a ResponseError", () =>
      Effect.gen(function*() {
        const { partial } = yield* callRepoIssues({ errors: [{ message: "boom" }] })
        yield* expectReason("ResponseError")(partial)
      }))

    it.effect("data: null with no errors is a DecodeError", () =>
      Effect.gen(function*() {
        const { partial, strict } = yield* callRepoIssues({ data: null })
        yield* expectReason("DecodeError")(partial)
        yield* expectReason("DecodeError")(strict)
      }))

    it.effect("data: null with no errors is a DecodeError even when the result codec accepts null", () =>
      Effect.gen(function*() {
        // GraphQL forbids a null `data` without `errors`; the client rejects it
        // before the result codec gets a say.
        const Raw = GraphQL.query("Raw", { document: "query Raw{__typename}", result: Schema.Json })
        const { layer } = yield* executeLayer({ data: null })
        const client = yield* GraphQLClient.make(GraphQLGroup.make(Raw)).pipe(Effect.provide(layer))
        yield* expectReason("DecodeError")(client.Raw())
        yield* expectReason("DecodeError")(client.Raw(undefined, { partial: true }))
      }))

    it.effect("a codec failure plus errors is a DecodeError, not a ResponseError", () =>
      Effect.gen(function*() {
        const { partial } = yield* callRepoIssues({
          data: {
            repository: {
              issues: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [{ number: 1, title: "Hi", createdAt: "not a date" }]
              }
            }
          },
          errors: [{ message: "unrelated" }]
        })
        yield* expectReason("DecodeError")(partial)
      }))

    it.effect("a partial mutation returns { data, errors }", () =>
      Effect.gen(function*() {
        const { layer } = yield* executeLayer({
          data: { addComment: null },
          errors: [{ message: "Resource not accessible", path: ["addComment"] }]
        })
        const { data, errors } = yield* GraphQLClient.make(GraphQLGroup.make(AddComment)).pipe(
          Effect.flatMap((client) => client.AddComment({ subjectId: "I_1", body: "hi" }, { partial: true })),
          Effect.provide(layer)
        )
        assert.deepStrictEqual(data, { addComment: null })
        assert.strictEqual(errors.length, 1)
      }))

    it.effect("the default path still fails with ResponseError and keeps data raw", () =>
      Effect.gen(function*() {
        const { strict } = yield* callRepoIssues(partialIssues)
        const reason = yield* expectReason("ResponseError")(strict)
        // Raw JSON, not decoded: createdAt is still the wire string.
        assert.deepStrictEqual(reason.data, partialIssues.data)
      }))
  })
})
