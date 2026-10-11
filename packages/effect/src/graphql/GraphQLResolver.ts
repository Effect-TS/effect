/**
 * Batch lookups through a GraphQL client method with `RequestResolver`.
 * {@link ordered} matches results by position; {@link findById} matches by
 * key. {@link request} turns either resolver into `(key) => Effect`.
 *
 * Client middleware still run. Compose `RequestResolver.setDelay` and
 * `RequestResolver.batchN` with `.pipe` to control batching.
 *
 * @stability experimental
 * @since 4.0.0
 */
import type { NonEmptyArray, NonEmptyReadonlyArray } from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Exit from "../Exit.ts"
import { dual } from "../Function.ts"
import * as Hash from "../Hash.ts"
import * as internalGraphQL from "../internal/graphql.ts"
import * as MutableHashMap from "../MutableHashMap.ts"
import * as Request from "../Request.ts"
import * as RequestResolver from "../RequestResolver.ts"
import type * as Types from "../Types.ts"
import type * as GraphQL from "./GraphQL.ts"
import type { OperationMethod, PartialResult } from "./GraphQLClient.ts"
import { DecodeError, GraphQLClientError, type GraphQLError, type Reason } from "./GraphQLClientError.ts"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type NonNull<A> = Exclude<A, null | undefined>

type Step<A, K> = K extends keyof NonNull<A> ? NonNull<A>[K] : never

// Check one segment at a time for autocomplete without enumerating all paths.
// The path must end at a list and cannot cross one.
type CheckPath<A, P> = NonNull<A> extends ReadonlyArray<any> ? readonly []
  : P extends readonly [infer Head, ...infer Tail]
    ? readonly [Head extends keyof NonNull<A> ? Head : keyof NonNull<A>, ...CheckPath<Step<A, Head>, Tail>]
  : readonly [keyof NonNull<A>]

type Path<A, P> = P extends CheckPath<A, P> ? P : CheckPath<A, P>

type AtPath<A, P> = P extends readonly [infer Head, ...infer Tail] ? AtPath<Step<A, Head>, Tail> : A

type Item<A, P> = NonNull<AtPath<A, P>> extends ReadonlyArray<infer I> ? NonNull<I> : never

type Typenames<I> = Types.IsUnion<I> extends true ?
  I extends { readonly __typename: infer T extends string } ? T : never
  : never

type Narrow<I, T> = [T] extends [never] ? I : Extract<I, { readonly __typename: T }>

interface KeyRequest<K, A, E, R> extends Request.Request<A, E, R> {
  readonly key: K
}

const KeyRequestProto = {
  ...Request.Class.prototype,
  [Equal.symbol](this: KeyRequest<any, any, any, any>, that: KeyRequest<any, any, any, any>): boolean {
    return Equal.equals(this.key, that.key)
  },
  [Hash.symbol](this: KeyRequest<any, any, any, any>): number {
    return Hash.hash(this.key)
  }
}

const makeRequest = <K, A, E, R>(key: K): KeyRequest<K, A, E, R> => {
  const self = Object.create(KeyRequestProto)
  self.key = key
  return self
}

// -----------------------------------------------------------------------------
// Running
// -----------------------------------------------------------------------------

/**
 * Looks up a key with an {@link ordered} or {@link findById} resolver.
 * Supports `request(resolver)(key)` and `request(key, resolver)`.
 *
 * **Details**
 *
 * Concurrent lookups are batched. Keys equal under `Equal` and `Hash`
 * are sent once per batch and share the result.
 *
 * **Example** (Looking up repositories by id)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol, GraphQLResolver } from "effect/graphql"
 *
 * const RepoNodes = GraphQL.query("RepoNodes", {
 *   document: "query RepoNodes($ids:[ID!]!){nodes(ids:$ids){... on Repository{name}}}",
 *   variables: { ids: Schema.Array(Schema.String) },
 *   result: Schema.Struct({ nodes: Schema.Array(Schema.NullOr(Schema.Struct({ name: Schema.String }))) })
 * })
 *
 * let calls = 0
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: (request) => {
 *     calls++
 *     const { ids } = request.variables as { ids: Array<string> }
 *     return Effect.succeed({ body: { data: { nodes: ids.map((id) => ({ name: `repo-${id}` })) } } })
 *   },
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoNodes))
 *   const getRepo = GraphQLResolver.request(GraphQLResolver.ordered(client.RepoNodes, {
 *     variables: (ids: ReadonlyArray<string>) => ({ ids }),
 *     path: ["nodes"]
 *   }))
 *   const repos = yield* Effect.forEach(["1", "2", "1"], getRepo, { concurrency: "unbounded" })
 *   return [repos.map((repo) => repo.name), calls]
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => [["repo-1", "repo-2", "repo-1"], 1]
 * ```
 *
 * @stability experimental
 * @category running
 * @since 4.0.0
 */
export const request: {
  <K, A, E, R>(
    resolver: RequestResolver.RequestResolver<KeyRequest<K, A, E, R>>
  ): (key: K) => Effect.Effect<A, E, R>
  <K, A, E, R>(key: K, resolver: RequestResolver.RequestResolver<KeyRequest<K, A, E, R>>): Effect.Effect<A, E, R>
} = dual(
  2,
  <K, A, E, R>(key: K, resolver: RequestResolver.RequestResolver<KeyRequest<K, A, E, R>>): Effect.Effect<A, E, R> =>
    Effect.request(makeRequest<K, A, E, R>(key), resolver)
)

// -----------------------------------------------------------------------------
// Resolvers
// -----------------------------------------------------------------------------

/**
 * Batches lookups by position for fields such as `nodes(ids:)` that return
 * one entry per key, in order.
 *
 * **Details**
 *
 * `variables` maps batch keys to operation variables; annotate its parameter
 * to set the key type. `path` selects a list through object fields, with
 * autocomplete at each level. For `__typename` unions, `typename` narrows
 * the success type and treats other types as missing.
 *
 * Null entries, typename mismatches and null parents fail with
 * `Cause.NoSuchElementError`. GraphQL errors whose paths start with
 * `[...path, i]` fail only entry `i`; its `ResponseError` contains those errors
 * and the response status. Other GraphQL errors fail the batch with the same
 * `ResponseError` as a non-partial call. Transport, encode and decode errors
 * also fail the batch. A list length mismatch fails with `DecodeError`.
 *
 * `pageInfo.hasNextPage: true` on the list's parent fails the batch with
 * `DecodeError` to avoid reporting unreturned entries as missing. Set the
 * operation's page size at least as large as `RequestResolver.batchN`.
 *
 * **Example** (Looking up repositories in a `Node` union)
 *
 * ```ts import.meta.vitest
 * import { Cause, Effect, Layer, RequestResolver, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol, GraphQLResolver } from "effect/graphql"
 *
 * const Repository = Schema.Struct({ __typename: Schema.Literal("Repository"), nameWithOwner: Schema.String })
 * const User = Schema.Struct({ __typename: Schema.Literal("User"), login: Schema.String })
 *
 * const RepoNodes = GraphQL.query("RepoNodes", {
 *   document: "query RepoNodes($ids:[ID!]!){nodes(ids:$ids){__typename ...on Repository{nameWithOwner} ...on User{login}}}",
 *   variables: { ids: Schema.Array(Schema.String) },
 *   result: Schema.Struct({ nodes: Schema.Array(Schema.NullOr(Schema.Union([Repository, User]))) })
 * })
 *
 * const store: Record<string, unknown> = {
 *   R_1: { __typename: "Repository", nameWithOwner: "Effect-TS/effect" },
 *   U_1: { __typename: "User", login: "tim" }
 * }
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: (request) => {
 *     const { ids } = request.variables as { ids: Array<string> }
 *     return Effect.succeed({ body: { data: { nodes: ids.map((id) => store[id] ?? null) } } })
 *   },
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(RepoNodes))
 *   const RepoById = GraphQLResolver.ordered(client.RepoNodes, {
 *     variables: (ids: ReadonlyArray<string>) => ({ ids }),
 *     path: ["nodes"],
 *     typename: "Repository"
 *   }).pipe(RequestResolver.batchN(100))
 *   const getRepo = GraphQLResolver.request(RepoById)
 *   return yield* Effect.forEach(
 *     ["R_1", "U_1", "R_2"],
 *     (id) => getRepo(id).pipe(
 *       Effect.map((repo) => repo.nameWithOwner),
 *       Effect.catchIf(Cause.isNoSuchElementError, () => Effect.succeed("missing"))
 *     ),
 *     { concurrency: "unbounded" }
 *   )
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => ["Effect-TS/effect", "missing", "missing"]
 * ```
 *
 * @stability experimental
 * @category resolvers
 * @since 4.0.0
 */
export const ordered = <
  Op extends GraphQL.Any,
  K,
  const P extends ReadonlyArray<string>,
  T extends Typenames<Item<GraphQL.Result<Op>, P>> = never
>(
  method: OperationMethod<Op>,
  options: {
    readonly variables: (keys: ReadonlyArray<K>) => GraphQL.Variables<Op>
    readonly path: Path<GraphQL.Result<Op>, P>
    readonly typename?: T | undefined
  }
): RequestResolver.RequestResolver<
  KeyRequest<
    K,
    Narrow<Item<GraphQL.Result<Op>, P>, T>,
    GraphQL.Error<Op> | Cause.NoSuchElementError,
    GraphQL.Services<Op>
  >
> => {
  const path = options.path as ReadonlyArray<string>
  return RequestResolver.make((entries) =>
    Effect.flatMap(callBatch(method, entries, options.variables), ({ keys, targets, result }) => {
      const fail = failWith(method)
      const byIndex = new Map<number, NonEmptyArray<GraphQLError>>()
      const others: Array<GraphQLError> = []
      for (const error of result.errors) {
        const index = entryIndex(error, path, keys.length)
        if (index === undefined) {
          others.push(error)
        } else {
          const errors = byIndex.get(index)
          if (errors === undefined) byIndex.set(index, [error])
          else errors.push(error)
        }
      }
      if (others.length > 0) return batchResponseError(fail, result)
      const list = findList(result.data, path)
      if (list === undefined) return completeAll(targets, constNoSuchElement)
      if (list.truncated) return fail(truncated(path))
      if (list.items.length !== keys.length) {
        return fail(
          new DecodeError({
            description: `Expected ${keys.length} entries at ${path.join(".")}, received ${list.items.length}`
          })
        )
      }
      const status = internalGraphQL.partialResponses.get(result)?.status
      for (let i = 0; i < targets.length; i++) {
        const errors = byIndex.get(i)
        const item = list.items[i]
        targets[i].completeUnsafe(
          errors !== undefined
            ? Exit.fail(
              new GraphQLClientError({
                operation: method.operation.name,
                reason: internalGraphQL.responseError(status === undefined ? undefined : { status }, errors)
              })
            )
            : matchesTypename(item, options.typename)
            ? Exit.succeed(item)
            : constNoSuchElement
        )
      }
      return Effect.void
    })
  )
}

/**
 * Batches lookups by key for searches and collections that return results
 * in any order.
 *
 * **Details**
 *
 * Write `key` before `variables` to infer the key type from its return type.
 * `variables` maps batch keys to operation variables. Keys are compared with
 * `Equal` and `Hash`. `path` and `typename` work as in {@link ordered};
 * `key` receives the narrowed item type.
 *
 * Missing keys, null parents and pagination behave as in {@link ordered}.
 * Any GraphQL error fails the batch with the same `ResponseError` as a
 * non-partial call, since error paths cannot be matched to keys.
 *
 * **Example** (Finding repositories through search)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol, GraphQLResolver } from "effect/graphql"
 *
 * const Repository = Schema.Struct({ __typename: Schema.Literal("Repository"), nameWithOwner: Schema.String })
 * const User = Schema.Struct({ __typename: Schema.Literal("User"), login: Schema.String })
 *
 * const SearchRepos = GraphQL.query("SearchRepos", {
 *   document: "query SearchRepos($query:String!){search(query:$query,type:REPOSITORY,first:100){pageInfo{hasNextPage} nodes{__typename ...on Repository{nameWithOwner} ...on User{login}}}}",
 *   variables: { query: Schema.String },
 *   result: Schema.Struct({
 *     search: Schema.Struct({
 *       pageInfo: Schema.Struct({ hasNextPage: Schema.Boolean }),
 *       nodes: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.Union([Repository, User]))))
 *     })
 *   })
 * })
 *
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: (request) => {
 *     const { query } = request.variables as { query: string }
 *     const nodes = query.split(" ").map((term) => ({ __typename: "Repository", nameWithOwner: term.slice(5) }))
 *     return Effect.succeed({ body: { data: { search: { pageInfo: { hasNextPage: false }, nodes: nodes.reverse() } } } })
 *   },
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(SearchRepos))
 *   const RepoByName = GraphQLResolver.findById(client.SearchRepos, {
 *     key: (repo) => repo.nameWithOwner,
 *     variables: (names) => ({ query: names.map((name) => `repo:${name}`).join(" ") }),
 *     path: ["search", "nodes"],
 *     typename: "Repository"
 *   })
 *   const repos = yield* Effect.forEach(
 *     ["Effect-TS/effect", "Effect-TS/website"],
 *     GraphQLResolver.request(RepoByName),
 *     { concurrency: "unbounded" }
 *   )
 *   return repos.map((repo) => repo.nameWithOwner)
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => ["Effect-TS/effect", "Effect-TS/website"]
 * ```
 *
 * @stability experimental
 * @category resolvers
 * @since 4.0.0
 */
export const findById = <
  Op extends GraphQL.Any,
  K,
  const P extends ReadonlyArray<string>,
  T extends Typenames<Item<GraphQL.Result<Op>, P>> = never
>(
  method: OperationMethod<Op>,
  options: {
    readonly variables: (keys: ReadonlyArray<K>) => GraphQL.Variables<Op>
    readonly path: Path<GraphQL.Result<Op>, P>
    readonly key: (item: Narrow<Item<GraphQL.Result<Op>, P>, T>) => K
    readonly typename?: T | undefined
  }
): RequestResolver.RequestResolver<
  KeyRequest<
    K,
    Narrow<Item<GraphQL.Result<Op>, P>, T>,
    GraphQL.Error<Op> | Cause.NoSuchElementError,
    GraphQL.Services<Op>
  >
> => {
  const path = options.path as ReadonlyArray<string>
  return RequestResolver.make((entries) =>
    Effect.flatMap(callBatch(method, entries, options.variables), ({ keys, targets, result }) => {
      const fail = failWith(method)
      if (result.errors.length > 0) return batchResponseError(fail, result)
      const list = findList(result.data, path)
      if (list === undefined) return completeAll(targets, constNoSuchElement)
      if (list.truncated) return fail(truncated(path))
      const pending = MutableHashMap.empty<K, Request.Entry<any>>()
      for (let i = 0; i < keys.length; i++) MutableHashMap.set(pending, keys[i], targets[i])
      for (const item of list.items) {
        if (!matchesTypename(item, options.typename)) continue
        const key = options.key(item as Narrow<Item<GraphQL.Result<Op>, P>, T>)
        const target = MutableHashMap.get(pending, key)
        if (target._tag === "None") continue
        MutableHashMap.remove(pending, key)
        target.value.completeUnsafe(Exit.succeed(item))
      }
      MutableHashMap.forEach(pending, (target) => target.completeUnsafe(constNoSuchElement))
      return Effect.void
    })
  )
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

const constNoSuchElement = Exit.fail(new Cause.NoSuchElementError())

/**
 * Calls the method in the first entry's context with deduplicated keys.
 * Each target completes all entries sharing its key.
 */
const callBatch = <Op extends GraphQL.Any, K>(
  method: OperationMethod<Op>,
  entries: NonEmptyArray<Request.Entry<KeyRequest<K, any, any, any>>>,
  variables: (keys: ReadonlyArray<K>) => GraphQL.Variables<Op>
) => {
  const keys: Array<K> = []
  const targets: Array<Request.Entry<KeyRequest<K, any, any, any>>> = []
  const indices = MutableHashMap.empty<K, number>()
  for (const entry of entries) {
    const index = MutableHashMap.get(indices, entry.request.key)
    if (index._tag === "None") {
      MutableHashMap.set(indices, entry.request.key, keys.length)
      keys.push(entry.request.key)
      targets.push(entry)
      continue
    }
    const previous = targets[index.value]
    targets[index.value] = {
      ...previous,
      completeUnsafe(exit) {
        previous.completeUnsafe(exit)
        entry.completeUnsafe(exit)
      }
    }
  }
  // Generic conditional parameters prevent calling the partial overload directly.
  const call = method as unknown as (
    variables: GraphQL.Variables<Op>,
    options: { readonly partial: true }
  ) => Effect.Effect<PartialResult<GraphQL.Result<Op>>, GraphQL.Error<Op>, GraphQL.Services<Op>>
  return call(variables(keys), { partial: true }).pipe(
    Effect.map((result) => ({ keys, targets, result })),
    Effect.provideContext(entries[0].context)
  )
}

const failWith = <Op extends GraphQL.Any>(method: OperationMethod<Op>) => (reason: Reason) =>
  Effect.fail(new GraphQLClientError({ operation: method.operation.name, reason }))

// Called only when result.errors is non-empty.
const batchResponseError = (
  fail: (reason: Reason) => Effect.Effect<never, GraphQLClientError>,
  result: PartialResult<unknown>
) =>
  fail(
    internalGraphQL.responseError(
      internalGraphQL.partialResponses.get(result),
      result.errors as NonEmptyReadonlyArray<GraphQLError>
    )
  )

const truncated = (path: ReadonlyArray<string>) =>
  new DecodeError({
    description: `pageInfo.hasNextPage is true next to ${
      path.join(".")
    }, so results beyond the page would be reported missing. Make the page size at least the RequestResolver.batchN size`
  })

const completeAll = (targets: ReadonlyArray<Request.Entry<any>>, exit: Exit.Exit<never, Cause.NoSuchElementError>) => {
  for (const target of targets) target.completeUnsafe(exit)
  return Effect.void
}

const entryIndex = (error: GraphQLError, path: ReadonlyArray<string>, length: number): number | undefined => {
  const errorPath = error.path
  if (errorPath === undefined || errorPath.length <= path.length) return undefined
  for (let i = 0; i < path.length; i++) {
    if (errorPath[i] !== path[i]) return undefined
  }
  const index = errorPath[path.length]
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < length ? index : undefined
}

const findList = (
  data: unknown,
  path: ReadonlyArray<string>
): { readonly items: ReadonlyArray<unknown>; readonly truncated: boolean } | undefined => {
  // Path guarantees object fields leading to a list.
  let parent = data as Record<string, unknown> | null | undefined
  for (let i = 0; i < path.length - 1; i++) {
    if (parent === null || parent === undefined) return undefined
    parent = parent[path[i]] as Record<string, unknown> | null | undefined
  }
  if (parent === null || parent === undefined) return undefined
  const items = parent[path[path.length - 1]] as ReadonlyArray<unknown> | null | undefined
  if (items === null || items === undefined) return undefined
  const pageInfo = parent.pageInfo as { readonly hasNextPage?: unknown } | null | undefined
  return { items, truncated: pageInfo?.hasNextPage === true }
}

const matchesTypename = (item: unknown, typename: string | undefined): boolean =>
  item !== null && item !== undefined &&
  (typename === undefined || (item as { readonly __typename?: unknown }).__typename === typename)
