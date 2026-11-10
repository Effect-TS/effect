/**
 * A keyed data cache. A read is a class service: a name, Schemas for its
 * arguments and result, how long a result stays fresh, and a fetcher. The
 * cache keeps one entry per read and arguments, shares a fetch between the
 * callers that want it, refetches a stale entry when something asks for it,
 * and collects an entry nothing has used for a while.
 *
 * A read's fetcher is built once per Layer build and captures the services it
 * uses, so code that calls `get` requires the read and the cache, never what
 * the fetcher is made of. A fake is `Layer.succeed(GetUser, (args) => ...)`.
 *
 * Plain Effect code provides the cache with `Loader.layer()`. Every time-based
 * rule runs on the `Clock`, so `TestClock` drives it, and
 * `effect/testing/TestLoader` is the harness for tests.
 *
 * **Example** (Defining a read and sharing its fetch)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema } from "effect"
 * import { Loader } from "effect/reactivity"
 *
 * let requests = 0
 *
 * class GetUser extends Loader.Service<GetUser>()("users/GetUser", {
 *   args: { id: Schema.String },
 *   success: Schema.Struct({ id: Schema.String, name: Schema.String }),
 *   error: Schema.Never,
 *   staleTime: "30 seconds"
 * }, Effect.sync(() => ({ id }) => Effect.sync(() => ({ id, name: `User ${++requests}` })))) {}
 *
 * const program = Effect.gen(function*() {
 *   // Two callers at once share one fetch, and the second call is served from the cache.
 *   const [a, b] = yield* Effect.all([GetUser.get({ id: "1" }), GetUser.get({ id: "1" })], {
 *     concurrency: "unbounded"
 *   })
 *   const c = yield* GetUser.get({ id: "1" })
 *   return [a.name, b.name, c.name, requests]
 * }).pipe(Effect.provide(Layer.merge(GetUser.layer, Loader.layer())))
 *
 * await Effect.runPromise(program) // => ["User 1", "User 1", "User 1", 1]
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Layer from "../Layer.ts"
import * as Queue from "../Queue.ts"
import type * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"
import type * as AsyncResult from "./AsyncResult.ts"
import * as internal from "./internal/loader.ts"

/**
 * Identifies a read: a class made by `Service`.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.3
 */
export const TypeId: TypeId = internal.ReadTypeId

/**
 * Identifies a read: a class made by `Service`.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.3
 */
export type TypeId = "~effect/reactivity/Loader"

/**
 * The value behind a read's service: a function of the arguments that returns
 * the result. It requires nothing, because it captured its services when its
 * Layer was built.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Fetcher<Args, A, E> = (args: Args) => Effect.Effect<A, E>

/**
 * How often a watched entry refetches: a duration, or a function of the last
 * settled result and the arguments that returns one, or `undefined` to stop.
 *
 * **Details**
 *
 * The function form is called once per settle with the result the fetcher
 * produced, a Success or a Failure. A duration under one second has to be
 * spelt as a Duration string such as `"500 millis"`: a bare number under 1000
 * is rejected, since `refetchInterval: 5` is a 5 ms poll written by mistake.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type RefetchInterval<Args, A, E> =
  | Duration.Input
  | ((
    result: AsyncResult.Success<A, E> | AsyncResult.Failure<A, E>,
    args: Args
  ) => Duration.Input | undefined)

/**
 * What every read has in common: its name, and the types of its arguments,
 * its result and its error.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Read<in out Args, in out A, in out E> {
  readonly [TypeId]: Read.Variance<Args, A, E>
}

/**
 * Helper types for `Read`.
 *
 * @stability experimental
 * @since 4.1.3
 */
export declare namespace Read {
  /**
   * Phantom variance for a read's arguments, result and error.
   *
   * @category models
   * @since 4.1.3
   */
  export interface Variance<in out Args, in out A, in out E> {
    readonly _Args: Types.Invariant<Args>
    readonly _A: Types.Invariant<A>
    readonly _E: Types.Invariant<E>
  }

  /**
   * Any read.
   *
   * @category models
   * @since 4.1.3
   */
  export type Any = Read<any, any, any> | Read<any, any, never>

  /**
   * The arguments of a read.
   *
   * @category utility types
   * @since 4.1.3
   */
  export type Args<R> = R extends Read<infer Args, infer _A, infer _E> ? Args : never

  /**
   * The result of a read.
   *
   * @category utility types
   * @since 4.1.3
   */
  export type Success<R> = R extends Read<infer _Args, infer A, infer _E> ? A : never

  /**
   * The error of a read.
   *
   * @category utility types
   * @since 4.1.3
   */
  export type Error<R> = R extends Read<infer _Args, infer _A, infer E> ? E : never
}

/**
 * A read class, as returned by `Service`.
 *
 * **Details**
 *
 * It's a `Context.Service` whose value is the read's fetcher. `layer` builds
 * the fetcher, and the static methods look the cache up, so they require the
 * cache and, where they may fetch, the read itself.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Service<
  in out Self,
  in out Name extends string,
  in out Args,
  in out A,
  in out E,
  out LE,
  out LR
> extends Context.ServiceClass<Self, Name, Fetcher<Args, A, E>>, Read<Args, A, E> {
  /**
   * The fetcher's Layer. It requires what the fetcher captured. A fetch runs
   * under the build that asked for it, and is interrupted when that build's
   * Scope closes. The close waits for the fetch's cleanup before it releases
   * what the fetcher captured.
   */
  readonly layer: Layer.Layer<Self, LE, LR>
  /**
   * Returns the stored value when it's fresh, and fetches otherwise, joining
   * a fetch already in flight. The result of the fetch is stored.
   *
   * **Gotchas**
   *
   * A call waiting on a fetch that reverts is interrupted. A fetch reverts
   * when the fetcher interrupts itself, and when the Scope of the caller's
   * build closes while no other build watches or waits for the entry. The
   * call never fails with an error the fetcher didn't raise, and never
   * returns a stale value in its place.
   */
  get(args: Args): Effect.Effect<A, E, Self | Cache>
  /**
   * Starts a fetch that outlives the caller, unless the entry is fresh, and
   * returns nothing.
   */
  prefetch(args: Args): Effect.Effect<void, never, Self | Cache>
  /**
   * Marks one entry, or every entry of the read when called without
   * arguments, stale. A watched entry refetches at once, a fetch in flight is
   * restarted, and any other entry refetches the next time it's asked for.
   */
  invalidate(args?: Args): Effect.Effect<void, never, Cache>
  /**
   * Watches an entry: loads it if it's cold or stale and nothing else watches
   * it, then emits every change. The Stream starts with the current state
   * when the entry is settled, skips a state equal to the last one, and dies
   * with a fetcher's defect.
   */
  changes(args: Args): Stream.Stream<AsyncResult.AsyncResult<A, E>, never, Self | Cache>
  /**
   * Reads an entry's state without fetching. It doesn't create the entry or
   * keep it alive.
   */
  peek(args: Args): Effect.Effect<AsyncResult.AsyncResult<A, E>, never, Cache>
}

/**
 * Helper types for `Service`.
 *
 * @stability experimental
 * @since 4.1.3
 */
export declare namespace Service {
  /**
   * The arguments type of an `args` option: the Schema's type, or the type of
   * the struct a fields record makes.
   *
   * @category utility types
   * @since 4.1.3
   */
  export type ArgsType<Args extends Schema.Top | Schema.Struct.Fields> = Args extends Schema.Top ? Args["Type"]
    : Args extends Schema.Struct.Fields ? Schema.Struct<Args>["Type"]
    : never

  /**
   * A Schema whose JSON encoding needs no services, which is what an entry's
   * arguments, result and error have to be.
   *
   * @category models
   * @since 4.1.3
   */
  export type NoServices = Schema.Top & {
    readonly DecodingServices: never
    readonly EncodingServices: never
  }
}

/**
 * Defines a read: a class service with a name, its options, and an Effect
 * that builds its fetcher.
 *
 * **When to use**
 *
 * Use when data is loaded by its arguments and shared: every caller of the
 * same read with the same arguments sees one entry and one fetch.
 *
 * **Details**
 *
 * - `args` is a fields record or any Schema. The cache derives an entry's key
 *   from the encoded arguments, so a read with no arguments writes `args: {}`.
 * - `success` and `error` are required Schemas. A read that can't fail
 *   writes `error: Schema.Never`.
 * - `staleTime` is required. Zero means always stale and `"Infinity"` means
 *   never stale by age. A stale entry is still served at once; it refetches
 *   when its first watcher arrives, on `get` or `prefetch`, on a host edge,
 *   on its interval, or when it's invalidated.
 * - `idleTimeToLive` is how long an entry nothing watches stays in the cache.
 *   It overrides the cache's default of 5 minutes.
 * - `refetchInterval` polls an entry while it's watched.
 * - `tags` lists the invalidation tags the read belongs to.
 *
 * The fetcher's Effect runs once per Layer build and returns the function
 * that fetches. Retries go inside the fetcher, with `Effect.retry`: the cache
 * never retries.
 *
 * **Gotchas**
 *
 * - The definition throws on a negative `staleTime` or `idleTimeToLive`, and
 *   on a constant `refetchInterval` that is zero, negative or a bare number
 *   under 1000.
 * - Calling a read throws when its arguments don't encode, or encode to
 *   something JSON can't carry.
 * - `{ id }` and `{ id, page: 1 }` are two entries, even when a default makes
 *   them one request.
 * - An optional property that is `undefined` is the same as a missing one:
 *   `{ id, page: undefined }` and `{ id }` are one entry. The property is
 *   dropped from the arguments before the `args` Schema checks or encodes
 *   them, so the read behaves as it does for the same arguments without the
 *   property. That holds wherever the arguments have a struct, the fields of
 *   a `Schema.Class` included. What an `Option`, a collection or another
 *   declared type holds is left as it was passed.
 * - The property's type decides whether `undefined` is allowed, so a
 *   `Schema.optionalKey(Schema.Number)` property rejects it. A required key
 *   keeps its `undefined`, as do a record's values and a tuple's elements. An
 *   `undefined` that the Schema's own encoding produces is left to the Schema.
 * - Only a property the arguments hold as their own plain data is dropped.
 *   One they inherit, or one behind a getter, is left to the Schema.
 * - The arguments are never changed. When a property is dropped, the Schema
 *   gets a copy without it.
 * - The fetcher gets the arguments of the call that created the entry, so it
 *   can see either form.
 *
 * **Example** (A read that captures a service)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Layer, Schema } from "effect"
 * import { Loader } from "effect/reactivity"
 *
 * class UsersApi extends Context.Service<UsersApi, {
 *   readonly name: (id: string) => Effect.Effect<string>
 * }>()("UsersApi") {}
 *
 * class GetUserName extends Loader.Service<GetUserName>()("users/GetUserName", {
 *   args: { id: Schema.String },
 *   success: Schema.String,
 *   error: Schema.Never,
 *   staleTime: "1 minute"
 * }, Effect.gen(function*() {
 *   const api = yield* UsersApi
 *   return ({ id }) => api.name(id)
 * })) {}
 *
 * const layer = GetUserName.layer.pipe(
 *   Layer.provide(Layer.succeed(UsersApi, { name: (id) => Effect.succeed(`user-${id}`) })),
 *   Layer.merge(Loader.layer())
 * )
 *
 * await Effect.runPromise(GetUserName.get({ id: "1" }).pipe(Effect.provide(layer))) // => "user-1"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const Service: <Self>() => <
  const Name extends string,
  const Args extends Service.NoServices | { readonly [x: string]: Service.NoServices },
  Success extends Service.NoServices,
  Error extends Service.NoServices,
  LE,
  LR
>(
  name: Name,
  options: {
    readonly args: Args
    readonly success: Success
    readonly error: Error
    readonly staleTime: Duration.Input
    readonly idleTimeToLive?: Duration.Input | undefined
    readonly refetchInterval?:
      | RefetchInterval<Service.ArgsType<Args>, Success["Type"], Error["Type"]>
      | undefined
    readonly tags?: ReadonlyArray<Tag> | undefined
  },
  fetcher: Effect.Effect<Fetcher<Service.ArgsType<Args>, Success["Type"], Error["Type"]>, LE, LR>
) => Service<Self, Name, Service.ArgsType<Args>, Success["Type"], Error["Type"], LE, Exclude<LR, Scope.Scope>> = () =>
(
  name: string,
  options: {
    readonly args: Schema.Top | Schema.Struct.Fields
    readonly success: Schema.Top
    readonly error: Schema.Top
    readonly staleTime: Duration.Input
    readonly idleTimeToLive?: Duration.Input | undefined
    readonly refetchInterval?: RefetchInterval<any, any, any> | undefined
    readonly tags?: ReadonlyArray<Tag> | undefined
  },
  fetcher: Effect.Effect<Fetcher<any, any, any>, any, any>
): any => {
  const def = internal.makeDef(name, options)
  const Base = Context.Service<any, Fetcher<any, any, any>>()(name)
  const withCache = <A, E, R>(
    f: (cache: internal.CacheInternals, context: Context.Context<never>) => Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, any> =>
    Effect.flatMap(
      Effect.context<never>(),
      (context) => f(internal.internals(Context.getUnsafe(context, Cache)), context)
    )
  const fetcherOf = (context: Context.Context<never>): Fetcher<any, any, any> => Context.getUnsafe(context, Base)
  class ReadService extends Base {
    static readonly [TypeId] = def
    static readonly layer = Layer.effect(
      Base,
      Effect.gen(function*() {
        const scope = yield* Effect.scope
        const build = internal.makeBuild(yield* fetcher)
        yield* Scope.addFinalizer(scope, internal.closeBuild(build))
        return build.fetcher
      })
    )
    static get(args: unknown) {
      return withCache((cache, context) => cache.get(def, args, fetcherOf(context)))
    }
    static prefetch(args: unknown) {
      return withCache((cache, context) => Effect.sync(() => cache.prefetch(def, args, fetcherOf(context))))
    }
    static invalidate(args?: unknown) {
      return withCache((cache) =>
        Effect.sync(() => cache.invalidate([args === undefined ? { _tag: "Read", def } : { _tag: "Entry", def, args }]))
      )
    }
    static changes(args: unknown) {
      return Stream.callback<AsyncResult.AsyncResult<any, any>>((queue) =>
        withCache((cache, context) =>
          Effect.acquireRelease(
            Effect.sync(() => {
              let last: AsyncResult.AsyncResult<any, any> | undefined
              const offer = (result: AsyncResult.AsyncResult<any, any>): void => {
                if (last !== undefined && Equal.equals(result, last)) return
                last = result
                Queue.offerUnsafe(queue, result)
              }
              const handle = cache.watch(def, args, fetcherOf(context), offer, (cause) => {
                Queue.failCauseUnsafe(queue, cause)
              })
              // The cache never calls back for the state at registration.
              const current = handle.current()
              if (current._tag !== "Initial") offer(current)
              return handle
            }),
            (handle) => Effect.sync(handle.unregister)
          )
        )
      )
    }
    static peek(args: unknown) {
      return withCache((cache) => Effect.sync(() => cache.peek(def, args)))
    }
  }
  return ReadService
}

/**
 * A declared invalidation tag. A tag is a plain name, so two
 * `Loader.Tag("users")` calls are one tag.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Tag {
  readonly _tag: "Tag"
  readonly name: string
}

/**
 * Declares an invalidation tag, to list in a read's `tags`.
 *
 * **When to use**
 *
 * Use to invalidate several reads together, such as everything that shows a
 * user, without naming each read where the invalidation happens.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const Tag = (name: string): Tag => ({ _tag: "Tag", name })

/**
 * What started a fetch. Every fetch records exactly one, and the fetcher
 * never sees it.
 *
 * **Details**
 *
 * - `watch`: an entry's watcher count went from zero to one over a cold or
 *   stale entry. A watcher that joins others never refetches.
 * - `get` and `prefetch`: the call found a cold or stale entry with no
 *   fetch in flight.
 * - `visibility` and `connectivity`: the host signal went from false to
 *   true, and a watched entry was stale or its interval had elapsed.
 * - `interval`: a watched entry's `refetchInterval` fired.
 * - `invalidation`: an invalidation hit a watched entry.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Trigger = "watch" | "get" | "prefetch" | "visibility" | "connectivity" | "interval" | "invalidation"

/**
 * A boolean a host reports, with a synchronous getter and a listener. It is
 * state, not a pulse: the cache reads the level as well as its edges.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Signal {
  /** The current value. */
  readonly get: () => boolean
  /** Calls `listener` with the new value on every change. Returns the unsubscribe. */
  readonly subscribe: (listener: (value: boolean) => void) => () => void
}

/**
 * Whether the host is visible, such as a browser tab in the foreground.
 * Defaults to always true, so servers and CLIs provide nothing.
 *
 * **Details**
 *
 * When it goes from false to true, and `Connectivity` is true as well, the
 * cache refetches every watched entry that is stale or whose interval elapsed
 * meanwhile. While it's false, intervals don't fire. The cache reads it once,
 * when it's built.
 *
 * @stability experimental
 * @category references
 * @since 4.1.3
 */
export const Visibility: Context.Reference<Signal> = Context.Reference<Signal>(
  "effect/reactivity/Loader/Visibility",
  { defaultValue: () => internal.alwaysTrue }
)

/**
 * Whether the host is online. Defaults to always true, so servers and CLIs
 * provide nothing.
 *
 * **Details**
 *
 * When it goes from false to true, and `Visibility` is true as well, the cache
 * refetches every watched entry that is stale or whose interval elapsed
 * meanwhile. While it's false, intervals don't fire. Being offline never
 * blocks a fetch: the fetcher fails, and the reconnect refetches. The cache
 * reads it once, when it's built.
 *
 * @stability experimental
 * @category references
 * @since 4.1.3
 */
export const Connectivity: Context.Reference<Signal> = Context.Reference<Signal>(
  "effect/reactivity/Loader/Connectivity",
  { defaultValue: () => internal.alwaysTrue }
)

/**
 * A second read was defined under a name already in the cache. The first
 * definition wins: it pins the Schemas, the stale and idle times, the interval
 * and the tags.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export const DuplicateName: typeof internal.DuplicateName = internal.DuplicateName

/**
 * A second read was defined under a name already in the cache. The first
 * definition wins: it pins the Schemas, the stale and idle times, the interval
 * and the tags.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export type DuplicateName = internal.DuplicateName

/**
 * A function-form `refetchInterval` threw. The entry has no interval until
 * its next settle. `error` is what was thrown.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export const IntervalThrew: typeof internal.IntervalThrew = internal.IntervalThrew

/**
 * A function-form `refetchInterval` threw. The entry has no interval until
 * its next settle. `error` is what was thrown.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export type IntervalThrew = internal.IntervalThrew

/**
 * A function-form `refetchInterval` returned zero, a negative, or a bare
 * number under 1000. The entry has no interval until its next settle.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export const IntervalInvalid: typeof internal.IntervalInvalid = internal.IntervalInvalid

/**
 * A function-form `refetchInterval` returned zero, a negative, or a bare
 * number under 1000. The entry has no interval until its next settle.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export type IntervalInvalid = internal.IntervalInvalid

/**
 * One entry's fetch was restarted 10 times in a row with no settle between.
 * Nothing changes; it's reported once per streak.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export const FetchRestarted: typeof internal.FetchRestarted = internal.FetchRestarted

/**
 * One entry's fetch was restarted 10 times in a row with no settle between.
 * Nothing changes; it's reported once per streak.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export type FetchRestarted = internal.FetchRestarted

/**
 * The problems the cache reports. A problem never changes what the cache
 * does: it is reported, and behaviour carries on.
 *
 * **Details**
 *
 * A problem names its read and the entry's log key, which is the entry's key
 * built with every `Schema.Redacted` argument redacted. It never carries a
 * value or the key itself.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export type Problem = DuplicateName | IntervalThrew | IntervalInvalid | FetchRestarted

/**
 * Helper types for `Problem`.
 *
 * @stability experimental
 * @since 4.1.3
 */
export declare namespace Problem {
  /**
   * What the `Problems` sink takes: any tagged problem with a message. It is
   * open, since modules built on the cache report their own.
   *
   * @category models
   * @since 4.1.3
   */
  export interface Any {
    readonly _tag: string
    readonly message: string
  }
}

/**
 * Where the cache reports problems: a synchronous function, called with each
 * one. The default is `console.warn(problem.message)`.
 *
 * **When to use**
 *
 * Use to send problems somewhere else, such as a Logger, by providing a
 * function that forks `Effect.logWarning`.
 *
 * **Details**
 *
 * Every check runs in every build. The cache reads the sink once, when it's
 * built, and swallows anything the sink throws.
 *
 * @stability experimental
 * @category references
 * @since 4.1.3
 */
export const Problems: Context.Reference<(problem: Problem.Any) => void> = Context.Reference<
  (problem: Problem.Any) => void
>("effect/reactivity/Loader/Problems", {
  // oxlint-disable-next-line no-console
  defaultValue: () => (problem) => console.warn(problem.message)
})

/**
 * The cache service. Reads look it up; its contents are internal.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export class Cache extends Context.Service<Cache, {
  readonly "~effect/reactivity/Loader/Cache": "~effect/reactivity/Loader/Cache"
}>()("effect/reactivity/Loader/Cache") {}

/**
 * Layer that provides a cache for plain Effect code.
 *
 * **Details**
 *
 * `idleTimeToLive` is how long an entry stays once nothing watches it, 5
 * minutes by default; a read can override it. The cache takes `Visibility`,
 * `Connectivity`, `Problems` and the `Clock` from where the Layer is built,
 * and is disposed with the Layer's Scope: fetches in flight are interrupted,
 * and the close waits for their cleanup.
 *
 * **Gotchas**
 *
 * Throws on a negative `idleTimeToLive`.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = (options?: {
  readonly idleTimeToLive?: Duration.Input | undefined
}): Layer.Layer<Cache> => {
  const idleMs = internal.cacheIdleMs(options?.idleTimeToLive)
  return Layer.effect(
    Cache,
    Effect.gen(function*() {
      const scope = yield* Effect.scope
      const context = yield* Effect.context<never>()
      return internal.makeCache({
        scope,
        context,
        idleMs,
        visibility: Context.get(context, Visibility),
        connectivity: Context.get(context, Connectivity),
        report: Context.get(context, Problems)
      })
    })
  )
}
