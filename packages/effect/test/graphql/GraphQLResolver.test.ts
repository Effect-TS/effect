import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Layer, Ref, RequestResolver, Schema, Stream } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLMiddleware, GraphQLResolver } from "effect/graphql"
import { GraphQLClientError, type ResponseError } from "effect/graphql/GraphQLClientError"
import * as GraphQLProtocol from "effect/graphql/GraphQLProtocol"
import * as Headers from "effect/http/Headers"
import * as UrlParams from "effect/http/UrlParams"
import { graphqlResponse, httpClientLayer, protocolLayer } from "./fixtures.ts"

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

// Generated operations carry a document template, which `aliased` repeats
// once per slice.
const PullRequest = GraphQL.query("PullRequest", {
  document: {
    variables: [{ name: "name", body: "String!" }, { name: "number", body: "Int!" }],
    selections: [{
      name: "repository",
      body: ["(owner:\"Effect-TS\",name:$", "name", "){pullRequest(number:$", "number", "){title}}"]
    }],
    fragments: []
  },
  variables: { name: Schema.String, number: Schema.Int },
  result: Schema.Struct({
    repository: Schema.NullOr(Schema.Struct({ pullRequest: Schema.NullOr(Schema.Struct({ title: Schema.String })) }))
  })
})

const RepoIssues = GraphQL.query("RepoIssues", {
  document: {
    variables: [{ name: "name", body: "String!" }, { name: "after", body: "String" }],
    selections: [{
      name: "repository",
      body: [
        "(owner:\"Effect-TS\",name:$",
        "name",
        "){issues(first:1,after:$",
        "after",
        "){pageInfo{hasNextPage endCursor}nodes{number}}}"
      ]
    }],
    fragments: []
  },
  variables: { name: Schema.String, after: Schema.optional(Schema.NullOr(Schema.String)) },
  result: Schema.Struct({
    repository: Schema.NullOr(Schema.Struct({
      issues: Schema.Struct({
        pageInfo: Schema.Struct({ hasNextPage: Schema.Boolean, endCursor: Schema.NullOr(Schema.String) }),
        nodes: Schema.Array(Schema.Struct({ number: Schema.Int }))
      })
    }))
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
    const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoNodes, SearchRepos, PullRequest, RepoIssues)).pipe(
      Effect.provide(layer)
    )
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

/** Splits batched variables (`_0_name`, `_1_name`, …) into each slice's variables, keyed by prefix. */
const slices = (variables: unknown): Record<string, Record<string, any>> => {
  const out: Record<string, Record<string, any>> = {}
  for (const [key, value] of Object.entries(variables as Record<string, unknown>)) {
    const [, prefix, name] = /^(_\d+_)(.+)$/.exec(key)!
    out[prefix] ??= {}
    out[prefix][name] = value
  }
  return out
}

/** Answers every slice with `respond(variables)` under its aliased `repository` field. */
const answerSlices = (variables: unknown, respond: (variables: any) => unknown) =>
  Object.fromEntries(
    Object.entries(slices(variables)).map(([prefix, slice]) => [`${prefix}repository`, respond(slice)])
  )

const pullRequest = (variables: { readonly name: string; readonly number: number }) => ({
  pullRequest: { title: `${variables.name}#${variables.number}` }
})

const getPullRequest = (client: Effect.Success<ReturnType<typeof makeClient>>["client"]) =>
  GraphQLResolver.request(GraphQLResolver.aliased(client.PullRequest))

const lookups = [{ name: "effect", number: 1 }, { name: "effect", number: 2 }]

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

  describe("aliased", () => {
    it.effect("concurrent lookups make one POST whose document repeats the operation under aliases", () =>
      Effect.gen(function*() {
        const sent: Array<{ readonly method: string; readonly body: any }> = []
        // Queries go over GET, but a batch must not.
        const layer = GraphQLProtocol.layerHttp({ url: "http://localhost/graphql", queryMethod: "GET" }).pipe(
          Layer.provide(httpClientLayer((request, bodyText) => {
            const body = bodyText === undefined ? undefined : JSON.parse(bodyText)
            sent.push({ method: request.method, body })
            return graphqlResponse({ data: answerSlices(body?.variables ?? {}, pullRequest) })
          }))
        )
        const client = yield* GraphQLClient.make(GraphQLGroup.make(PullRequest)).pipe(Effect.provide(layer))
        const keys = [1, 2, 3].map((number) => ({ name: "effect", number }))

        const results = yield* Effect.forEach(
          keys,
          GraphQLResolver.request(GraphQLResolver.aliased(client.PullRequest)),
          { concurrency: "unbounded" }
        )

        assert.deepStrictEqual(results, keys.map((key) => ({ repository: pullRequest(key) })))
        assert.strictEqual(sent.length, 1)
        assert.strictEqual(sent[0].method, "POST")
        assert.strictEqual(
          sent[0].body.query,
          "query PullRequest($_0_name:String!$_0_number:Int!$_1_name:String!$_1_number:Int!$_2_name:String!$_2_number:Int!){_0_repository:repository(owner:\"Effect-TS\",name:$_0_name){pullRequest(number:$_0_number){title}}_1_repository:repository(owner:\"Effect-TS\",name:$_1_name){pullRequest(number:$_1_number){title}}_2_repository:repository(owner:\"Effect-TS\",name:$_2_name){pullRequest(number:$_2_number){title}}}"
        )
        assert.deepStrictEqual(Object.values(slices(sent[0].body.variables)).map((slice) => slice.number).sort(), [
          1,
          2,
          3
        ])
      }))

    it.effect("an error at path[0] fails only its slice, with the path un-prefixed", () =>
      Effect.gen(function*() {
        const { client } = yield* makeClient((variables) => {
          const prefix = Object.entries(slices(variables)).find(([, slice]) => slice.number === 2)![0]
          return {
            data: answerSlices(variables, (slice) => slice.number === 2 ? { pullRequest: null } : pullRequest(slice)),
            errors: [{ message: "Could not resolve", path: [`${prefix}repository`, "pullRequest"] }]
          }
        })

        const [ok, failed] = yield* resolveAll(lookups, getPullRequest(client))

        assert.deepStrictEqual(ok, { repository: pullRequest(lookups[0]) })
        assert.instanceOf(failed, GraphQLClientError)
        assert.strictEqual(failed.reason._tag, "ResponseError")
        const reason = failed.reason as ResponseError
        assert.deepStrictEqual(reason.errors.map((error) => error.path), [["repository", "pullRequest"]])
      }))

    it.effect("an error without a path fails the batch", () =>
      Effect.gen(function*() {
        const { client } = yield* makeClient((variables) => ({
          data: answerSlices(variables, pullRequest),
          errors: [{ message: "Rate limited" }]
        }))

        const results = yield* resolveAll(lookups, getPullRequest(client))

        for (const result of results) {
          assert.instanceOf(result, GraphQLClientError)
          assert.strictEqual(result.reason._tag, "ResponseError")
        }
      }))

    it.effect("lookups whose encoded variables are equal share one slice", () =>
      Effect.gen(function*() {
        const page = { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: 1 }] }
        const { client, requests } = yield* makeClient((variables) => ({
          data: answerSlices(variables, () => ({ issues: page }))
        }))

        // Not `Equal`, but both encode to `{"name":"effect"}`.
        const results = yield* resolveAll(
          [{ name: "effect" }, { name: "effect", after: undefined }],
          GraphQLResolver.request(GraphQLResolver.aliased(client.RepoIssues))
        )

        assert.deepStrictEqual(results, [{ repository: { issues: page } }, { repository: { issues: page } }])
        const sent = yield* Ref.get(requests)
        assert.strictEqual(sent.length, 1)
        assert.deepStrictEqual(Object.keys(slices(sent[0].variables)), ["_0_"])
      }))

    it.effect("GraphQLClient.pages over an aliased method batches each round of pages", () =>
      Effect.gen(function*() {
        const { client, requests } = yield* makeClient((variables) => ({
          data: answerSlices(variables, (slice) => {
            const base = slice.name === "effect" ? 0 : 100
            return {
              issues: slice.after == null
                ? { pageInfo: { hasNextPage: true, endCursor: "c1" }, nodes: [{ number: base + 1 }] }
                : { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: base + 2 }] }
            }
          })
        }))
        const getIssues = GraphQLResolver.request(GraphQLResolver.aliased(client.RepoIssues))

        const numbers = yield* Effect.forEach(
          ["effect", "website"],
          (name) =>
            Stream.runCollect(
              GraphQLClient.pages(getIssues, { variables: { name }, connection: (result) => result.repository?.issues })
            ).pipe(Effect.map((pages) => pages.map((page) => page.nodes.map((node) => node.number)))),
          { concurrency: "unbounded" }
        )

        assert.deepStrictEqual(numbers, [[[1], [2]], [[101], [102]]])
        const sent = yield* Ref.get(requests)
        assert.deepStrictEqual(sent.map((request) => Object.keys(slices(request.variables)).length), [2, 2])
      }))

    it.effect("over a makeTest client, the handler is called once per slice", () =>
      Effect.gen(function*() {
        const received: Array<{ readonly name: string; readonly number: number }> = []
        const client = GraphQLClient.makeTest(GraphQLGroup.make(PullRequest))({
          PullRequest: (variables) => {
            received.push(variables)
            return Effect.succeed({ repository: pullRequest(variables) })
          }
        })

        const results = yield* Effect.forEach(
          lookups,
          GraphQLResolver.request(GraphQLResolver.aliased(client.PullRequest)),
          { concurrency: "unbounded" }
        )

        assert.deepStrictEqual(results, lookups.map((key) => ({ repository: pullRequest(key) })))
        assert.deepStrictEqual(received.map((variables) => variables.number).sort(), [1, 2])
      }))

    it.effect("through withCache, the method keeps operation, partial results and call options", () =>
      Effect.gen(function*() {
        const { client, requests } = yield* makeClient((variables) => {
          const prefix = Object.entries(slices(variables)).find(([, slice]) => slice.number === 2)![0]
          return {
            data: answerSlices(variables, (slice) => slice.number === 2 ? { pullRequest: null } : pullRequest(slice)),
            errors: [{ message: "Could not resolve", path: [`${prefix}repository`, "pullRequest"] }]
          }
        })
        const cached = yield* GraphQLResolver.aliased(client.PullRequest).pipe(
          RequestResolver.withCache({ capacity: 10 })
        )
        const get = GraphQLResolver.request(cached)

        const [ok, failed]: ReadonlyArray<GraphQLClient.PartialResult<GraphQL.Result<typeof PullRequest>>> =
          yield* Effect
            .forEach(lookups, (variables) => get(variables, { partial: true, headers: { "x-trace": "t1" } }), {
              concurrency: "unbounded"
            })

        assert.strictEqual(get.operation, PullRequest)
        assert.deepStrictEqual(ok, { data: { repository: pullRequest(lookups[0]) }, errors: [] })
        assert.deepStrictEqual(failed.data, { repository: { pullRequest: null } })
        assert.deepStrictEqual(failed.errors.map((error) => error.path), [["repository", "pullRequest"]])
        const sent = yield* Ref.get(requests)
        assert.deepStrictEqual(sent.map((request) => request.headers["x-trace"]), ["t1"])
      }))

    it.effect("batchKey, headers and URL params each split batches on their own", () =>
      Effect.gen(function*() {
        const requests = yield* Ref.make<Array<GraphQLProtocol.GraphQLRequest>>([])
        const layer = protocolLayer({
          execute: (request) =>
            Effect.as(Ref.update(requests, (all) => [...all, request]), {
              body: { data: answerSlices(request.variables, pullRequest) },
              status: 200
            })
        })
        const client = yield* GraphQLClient.make(GraphQLGroup.make(PullRequest).middleware(Auth)).pipe(
          Effect.provide([layer, AuthLive])
        )
        const get = GraphQLResolver.request(GraphQLResolver.aliased(client.PullRequest, {
          batchKey: (context) => Context.get(context, CurrentUser).tenant
        }))
        const lookup = (
          tenant: string,
          number: number,
          options?: { readonly headers?: Headers.Input; readonly urlParams?: UrlParams.Input }
        ) => Effect.provideService(get({ name: "effect", number }, options), CurrentUser, { tenant })

        // Lookup 1 is the baseline; 2 shares its batch, and 3, 4 and 5 each
        // differ from it in one thing only.
        yield* Effect.all([
          lookup("a", 1),
          lookup("a", 2),
          lookup("b", 3),
          lookup("a", 4, { headers: { "x-preview": "1" } }),
          lookup("a", 5, { urlParams: { preview: "1" } })
        ], { concurrency: "unbounded" })

        const sent = yield* Ref.get(requests)
        assert.deepStrictEqual(
          sent.map((request) =>
            [
              request.headers["authorization"],
              request.headers["x-preview"] ?? "-",
              UrlParams.getAll(request.urlParams, "preview").join() || "-",
              Object.values(slices(request.variables)).map((slice) => slice.number).sort().join()
            ].join(" ")
          ).sort(),
          ["Bearer a - - 1,2", "Bearer a - 1 5", "Bearer a 1 - 4", "Bearer b - - 3"]
        )
      }))
  })
})
