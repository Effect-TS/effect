import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Layer, Ref, Schema } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLMiddleware, GraphQLResolver } from "effect/graphql"
import { GraphQLClientError, type ResponseError } from "effect/graphql/GraphQLClientError"
import type * as GraphQLProtocol from "effect/graphql/GraphQLProtocol"
import * as Headers from "effect/http/Headers"
import { protocolLayer } from "./fixtures.ts"

const Repository = Schema.Struct({ __typename: Schema.Literal("Repository"), nameWithOwner: Schema.String })
const User = Schema.Struct({ __typename: Schema.Literal("User"), login: Schema.String })
const Node = Schema.Union([Repository, User])

const RepoNodes = GraphQL.query("RepoNodes", {
  document:
    "query RepoNodes($ids:[ID!]!){nodes(ids:$ids){__typename ...on Repository{nameWithOwner} ...on User{login}}}",
  variables: { ids: Schema.Array(Schema.String) },
  result: Schema.Struct({ nodes: Schema.Array(Schema.NullOr(Node)) })
})

const SearchRepos = GraphQL.query("SearchRepos", {
  document:
    "query SearchRepos($query:String!){search(query:$query,type:REPOSITORY,first:100){pageInfo{hasNextPage endCursor} nodes{__typename ...on Repository{nameWithOwner} ...on User{login}}}}",
  variables: { query: Schema.String },
  result: Schema.Struct({
    search: Schema.Struct({
      pageInfo: Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: Schema.NullOr(Schema.String) }),
      nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Node)))
    })
  })
})

class CurrentUser extends Context.Service<CurrentUser, { readonly tenant: string }>()("test/CurrentUser") {}
class Auth extends GraphQLMiddleware.Service<Auth, { requires: CurrentUser }>()("test/Auth") {}

const AuthLive = Layer.succeed(
  Auth,
  GraphQLMiddleware.mapRequest(Effect.fnUntraced(function*(request) {
    const user = yield* CurrentUser
    return { ...request, headers: Headers.set(request.headers, "authorization", `Bearer ${user.tenant}`) }
  }))
)

const repo = (nameWithOwner: string) => ({ __typename: "Repository" as const, nameWithOwner })

/** Answers each request with `respond(variables)` and records the requests. */
const makeClient = (respond: (variables: any) => unknown) =>
  Effect.gen(function*() {
    const requests = yield* Ref.make<Array<GraphQLProtocol.GraphQLRequest>>([])
    const layer = protocolLayer({
      execute: (request) =>
        Effect.as(Ref.update(requests, (all) => [...all, request]), { body: respond(request.variables), status: 200 })
    })
    const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoNodes, SearchRepos)).pipe(Effect.provide(layer))
    return { client, requests }
  })

/** Requests every key concurrently and returns each entry's success or failure. */
const resolveAll = <K, A, E>(keys: ReadonlyArray<K>, get: (key: K) => Effect.Effect<A, E>) =>
  Effect.forEach(
    keys,
    (key) => Effect.map(Effect.result(get(key)), (r) => r._tag === "Success" ? r.success : r.failure),
    { concurrency: "unbounded" }
  )

const byId = (client: Effect.Success<ReturnType<typeof makeClient>>["client"]) =>
  GraphQLResolver.request(GraphQLResolver.ordered(client.RepoNodes, {
    variables: (ids: ReadonlyArray<string>) => ({ ids }),
    path: ["nodes"],
    typename: "Repository"
  }))

const byName = (client: Effect.Success<ReturnType<typeof makeClient>>["client"]) =>
  GraphQLResolver.request(GraphQLResolver.findById(client.SearchRepos, {
    key: (repo) => repo.nameWithOwner,
    variables: (names) => ({ query: names.map((name) => `repo:${name}`).join(" ") }),
    path: ["search", "nodes"],
    typename: "Repository"
  }))

const searchNames = (variables: { query: string }) => variables.query.split(" ").map((term) => term.slice(5))

const searchResult = (nodes: ReadonlyArray<unknown>, hasNextPage = false) => ({
  data: { search: { pageInfo: { hasNextPage, endCursor: null }, nodes } }
})

describe("GraphQLResolver", () => {
  describe("ordered", () => {
    it.effect("batches concurrent keys into one call; a null item or a typename mismatch is a miss", () =>
      Effect.gen(function*() {
        const store: Record<string, unknown> = {
          R_1: repo("Effect-TS/effect"),
          U_1: { __typename: "User", login: "tim" }
        }
        const { client, requests } = yield* makeClient((variables) => ({
          data: { nodes: variables.ids.map((id: string) => store[id] ?? null) }
        }))

        const results = yield* resolveAll(["R_1", "R_2", "U_1", "R_1"], byId(client))

        const sent = yield* Ref.get(requests)
        assert.strictEqual(sent.length, 1)
        assert.deepStrictEqual([...(sent[0].variables as { ids: Array<string> }).ids].sort(), ["R_1", "R_2", "U_1"])
        assert.deepStrictEqual(results[0], repo("Effect-TS/effect"))
        assert.deepStrictEqual(results[3], repo("Effect-TS/effect"))
        assert.instanceOf(results[1], Cause.NoSuchElementError)
        assert.instanceOf(results[2], Cause.NoSuchElementError)
      }))

    it.effect("an error at [...path, i] fails only entry i", () =>
      Effect.gen(function*() {
        const { client } = yield* makeClient((variables) => {
          const failed = variables.ids.indexOf("R_2")
          return {
            data: { nodes: variables.ids.map((id: string) => id === "R_2" ? null : repo(id)) },
            errors: [{ message: "Could not resolve", path: ["nodes", failed] }]
          }
        })

        const [ok, failed] = yield* resolveAll(["R_1", "R_2"], byId(client))

        assert.deepStrictEqual(ok, repo("R_1"))
        assert.instanceOf(failed, GraphQLClientError)
        assert.strictEqual(failed.reason._tag, "ResponseError")
        const reason = failed.reason as ResponseError
        assert.deepStrictEqual(reason.errors.map((error) => error.message), ["Could not resolve"])
        assert.strictEqual(reason.status, 200)
      }))

    it.effect("an error at any other path fails the batch", () =>
      Effect.gen(function*() {
        const { client } = yield* makeClient((variables) => ({
          data: { nodes: variables.ids.map(repo) },
          errors: [{ message: "Rate limited", path: ["rateLimit"] }]
        }))

        const results = yield* resolveAll(["R_1", "R_2"], byId(client))

        for (const result of results) {
          assert.instanceOf(result, GraphQLClientError)
          assert.strictEqual(result.reason._tag, "ResponseError")
        }
      }))
  })

  describe("findById", () => {
    it.effect("matches out-of-order results on a nested path by key; a missing key is a miss", () =>
      Effect.gen(function*() {
        const { client } = yield* makeClient((variables) =>
          searchResult(searchNames(variables).filter((name) => name !== "a/missing").map(repo).reverse())
        )

        const results = yield* resolveAll(["Effect-TS/effect", "a/missing", "Effect-TS/website"], byName(client))

        assert.deepStrictEqual(results[0], repo("Effect-TS/effect"))
        assert.instanceOf(results[1], Cause.NoSuchElementError)
        assert.deepStrictEqual(results[2], repo("Effect-TS/website"))
      }))

    it.effect("hasNextPage: true on the list's parent fails the batch", () =>
      Effect.gen(function*() {
        const { client } = yield* makeClient((variables) => searchResult(searchNames(variables).map(repo), true))

        const results = yield* resolveAll(["Effect-TS/effect", "Effect-TS/website"], byName(client))

        for (const result of results) {
          assert.instanceOf(result, GraphQLClientError)
          assert.strictEqual(result.reason._tag, "DecodeError")
        }
      }))
  })

  describe("batchKey", () => {
    it.effect("splits a batch by key and calls each group with its own services", () =>
      Effect.gen(function*() {
        const requests = yield* Ref.make<Array<GraphQLProtocol.GraphQLRequest>>([])
        const layer = protocolLayer({
          execute: (request) =>
            Effect.as(Ref.update(requests, (all) => [...all, request]), {
              body: { data: { nodes: (request.variables as { ids: Array<string> }).ids.map(repo) } },
              status: 200
            })
        })
        const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoNodes).middleware(Auth)).pipe(
          Effect.provide([layer, AuthLive])
        )
        const get = GraphQLResolver.request(GraphQLResolver.ordered(client.RepoNodes, {
          variables: (ids: ReadonlyArray<string>) => ({ ids }),
          path: ["nodes"],
          batchKey: (context) => Context.get(context, CurrentUser).tenant
        }))
        const getAs = (tenant: string, id: string) => Effect.provideService(get(id), CurrentUser, { tenant })

        const results = yield* Effect.all([getAs("a", "R_1"), getAs("b", "R_2"), getAs("a", "R_3")], {
          concurrency: "unbounded"
        })

        assert.deepStrictEqual(results, [repo("R_1"), repo("R_2"), repo("R_3")])
        const sent = yield* Ref.get(requests)
        assert.deepStrictEqual(
          sent.map((request) =>
            `${request.headers["authorization"]}: ${[...(request.variables as { ids: Array<string> }).ids].sort()}`
          ).sort(),
          ["Bearer a: R_1,R_3", "Bearer b: R_2"]
        )
      }))
  })
})
