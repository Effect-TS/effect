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
import * as Cause from "../Cause.ts"
import * as Clock from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Exit from "../Exit.ts"
import * as Fiber from "../Fiber.ts"
import * as Hash from "../Hash.ts"
import { byReferenceInstances } from "../internal/equal.ts"
import { redactAST } from "../internal/schemaRedact.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Queue from "../Queue.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaParser from "../SchemaParser.ts"
import * as SchemaTransformation from "../SchemaTransformation.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"
import * as AsyncResult from "./AsyncResult.ts"

/**
 * Identifies a read: a class made by `Service`.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.3
 */
export const TypeId: TypeId = "~effect/reactivity/Loader"

/**
 * Identifies a read: a class made by `Service`.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.1.3
 */
export type TypeId = "~effect/reactivity/Loader"

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
> extends Context.ServiceClass<Self, Name, (args: Args) => Effect.Effect<A, E>>, Read<Args, A, E> {
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
   *
   * It returns the server value, never a patched one. Under a run's live
   * patch it returns a fresh entry's value, and otherwise calls the fetcher
   * for its callers alone, storing nothing. Inside a run, on an entry the
   * run invalidates, it always calls the fetcher in the caller's fiber, and
   * stores nothing.
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
  /** One entry, as an invalidation target. */
  entry(args: Args): EntryTarget<Read<Args, A, E>>
  /**
   * An optimistic patch of one entry, applied over its server value while the
   * run that declares it is queued or running. It implies invalidation of
   * the entry.
   */
  patch(args: Args, f: (value: A) => A): Patch<Read<Args, A, E>>
  /**
   * An optimistic patch of every entry of the read that holds a Success when
   * the run is issued. It implies invalidation of the whole read.
   */
  patchAll(f: (value: A, args: Args) => A): Patch<Read<Args, A, E>>
  /** A write of a run's result into one entry, for a Command's `writes`. */
  set(args: Args, value: A): Write<Read<Args, A, E>>
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
 * - An optional field of the `args` struct that is `undefined` is the same
 *   as a missing one: `{ id, page: undefined }` and `{ id }` are one entry.
 *   The property is dropped before the `args` Schema checks or encodes the
 *   arguments, so the read behaves as it does for the same arguments without
 *   the property.
 * - Only the fields of the `args` struct itself are covered. What a field
 *   holds reaches the Schema as it was passed: a nested struct, a union, a
 *   class, a record, a tuple, an `Option` or a collection. So do arguments
 *   that are not a struct, such as a `Schema.Class` or a union.
 * - Everywhere else the Schema's encoding decides. The default JSON encoding
 *   of a type that allows both `undefined` and `null` encodes both as
 *   `null`. So for a nested `page: Schema.optional(Schema.NullOr(Schema.Number))`,
 *   `{ filter: { page: undefined } }` and `{ filter: { page: null } }` are
 *   one entry, and the later call gets the data of the earlier one.
 *   `{ filter: {} }` is another entry. The same goes for a required key, a
 *   record's value and a tuple's element of such a type.
 * - That is what those encodings do, and other Schemas differ. What
 *   `Schema.Any` holds is not encoded, and there an `undefined` property is
 *   the same as a missing one. A value whose own encoding tells `undefined`
 *   from `null` gets two entries. When the fetcher tells the two apart, give
 *   the value such an encoding.
 * - The property's type decides whether `undefined` is allowed, so a
 *   `Schema.optionalKey(Schema.Number)` property rejects it. A type made with
 *   `Schema.declare` is not asked: under `Schema.optionalKey` its `undefined`
 *   is left to the Schema. An `undefined` that the Schema's own encoding
 *   produces is left to the Schema too.
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
  fetcher: Effect.Effect<
    (args: Service.ArgsType<Args>) => Effect.Effect<Success["Type"], Error["Type"]>,
    LE,
    LR
  >
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
  fetcher: Effect.Effect<Fetcher, any, any>
): any => {
  const def = makeDef(name, options)
  const Base = Context.Service<any, Fetcher>()(name)
  const withCache = <A, E, R>(
    f: (cache: CacheInternals, context: Context.Context<never>) => Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, any> =>
    Effect.flatMap(
      Effect.context<never>(),
      (context) => f(internals(Context.getUnsafe(context, Cache)), context)
    )
  const fetcherOf = (context: Context.Context<never>): Fetcher => Context.getUnsafe(context, Base)
  class ReadService extends Base {
    static readonly [TypeId]: any = def
    static readonly layer = Layer.effect(
      Base,
      Effect.gen(function*() {
        const scope = yield* Effect.scope
        const build = makeBuild(yield* fetcher)
        yield* Scope.addFinalizer(scope, closeBuild(build))
        return build.fetcher
      })
    )
    static get(args: unknown) {
      return withCache((cache, context) => cache.get(def, args, fetcherOf(context), Context.get(context, CurrentRun)))
    }
    static prefetch(args: unknown) {
      return withCache((cache, context) => Effect.sync(() => cache.prefetch(def, args, fetcherOf(context))))
    }
    static invalidate(args?: unknown) {
      return withCache((cache) =>
        Effect.sync(() =>
          cache.invalidate([args === undefined ? ReadService : entryTarget(ReadService, args)], {
            byHand: true
          })
        )
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
    static entry(args: unknown) {
      return entryTarget(ReadService, args)
    }
    static patch(args: unknown, f: (value: any) => any) {
      return patchOne(ReadService, args, f)
    }
    static patchAll(f: (value: any, args: any) => any) {
      return patchAll(ReadService, f)
    }
    static set(args: unknown, value: unknown) {
      return write(ReadService, args, value)
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
 * One entry of a read, as an invalidation target. Built by a read's `entry`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface EntryTarget<R extends Read.Any = Read.Any> {
  readonly _tag: "Entry"
  readonly read: R
  readonly args: Read.Args<R>
}

/**
 * What a run invalidates: a whole read, one entry or a tag.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Target = Read.Any | EntryTarget | Tag

/**
 * An optimistic patch, built by a read's `patch` or `patchAll`. It is a
 * pure function from a server value to the value to show.
 *
 * **Details**
 *
 * A patch is live while its run is queued or running: nothing fetches the
 * entry, and its watchers see the patched value. After the run succeeds the
 * patch is held until the entry settles or a write is stored. A failure, an
 * interrupt or a defect drops it at once.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export type Patch<R extends Read.Any = Read.Any> =
  | {
    readonly _tag: "Patch"
    readonly read: R
    readonly args: Read.Args<R>
    readonly patch: (value: Read.Success<R>) => Read.Success<R>
  }
  | {
    readonly _tag: "PatchAll"
    readonly read: R
    readonly patch: (value: Read.Success<R>, args: Read.Args<R>) => Read.Success<R>
  }

/**
 * A write of a run's result into one entry, built by a read's `set`. A
 * Command's `writes` is the only place one is used.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Write<R extends Read.Any = Read.Any> {
  readonly _tag: "Set"
  readonly read: R
  readonly args: Read.Args<R>
  readonly value: Read.Success<R>
}

/**
 * Applies, in order, every patch that targets the entry of `read` at `args`
 * to `value`, and leaves the others out.
 *
 * **When to use**
 *
 * Use to test a Command's `optimistic` patches without a cache. It is the
 * function the cache itself calls.
 *
 * **Example** (Testing a patch)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Loader } from "effect/reactivity"
 *
 * class GetCount extends Loader.Service<GetCount>()("counts/GetCount", {
 *   args: { id: Schema.String },
 *   success: Schema.Number,
 *   error: Schema.Never,
 *   staleTime: "1 minute"
 * }, Effect.succeed(() => Effect.succeed(0))) {}
 *
 * const patches = [GetCount.patch({ id: "a" }, (n) => n + 1)]
 * Loader.applyPatches(patches, GetCount, { id: "a" }, 1) // => 2
 * Loader.applyPatches(patches, GetCount, { id: "b" }, 1) // => 1
 * ```
 *
 * @stability experimental
 * @category utils
 * @since 4.1.3
 */
export const applyPatches = <R extends Read.Any>(
  patches: ReadonlyArray<Patch>,
  read: R,
  args: Read.Args<R>,
  value: Read.Success<R>
): Read.Success<R> => {
  const def = defOf(read)
  const argsKey = def.argsKey(args)
  for (const patch of patches) value = applyPatch(patch, def.name, argsKey, args, value) as Read.Success<R>
  return value
}

/**
 * Whether a run with these `invalidates` and `optimistic` declarations
 * invalidates the entry of `read` at `args`: a declared target hits it, or
 * a patch targets it.
 *
 * **When to use**
 *
 * Use to test a Command's declarations without a cache. It is the predicate
 * the cache resolves a run's targets with, and the one `get` uses inside a
 * run to tell the run's own targets.
 *
 * **Details**
 *
 * A write stored fresh is left out of its run's invalidation. This predicate
 * doesn't know about writes: it answers before they are subtracted.
 *
 * **Example** (Testing a Command's targets)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { Loader } from "effect/reactivity"
 *
 * const Users = Loader.Tag("users")
 *
 * class GetUser extends Loader.Service<GetUser>()("users/GetUser", {
 *   args: { id: Schema.String },
 *   success: Schema.String,
 *   error: Schema.Never,
 *   staleTime: "1 minute",
 *   tags: [Users]
 * }, Effect.succeed(({ id }) => Effect.succeed(id))) {}
 *
 * Loader.invalidatesEntry({ invalidates: [Users] }, GetUser, { id: "1" }) // => true
 * Loader.invalidatesEntry({ invalidates: [GetUser.entry({ id: "1" })] }, GetUser, { id: "2" }) // => false
 * ```
 *
 * @stability experimental
 * @category utils
 * @since 4.1.3
 */
export const invalidatesEntry = <R extends Read.Any>(
  run: {
    readonly invalidates: ReadonlyArray<Target>
    readonly optimistic?: ReadonlyArray<Patch> | undefined
  },
  read: R,
  args: Read.Args<R>
): boolean => {
  const def = defOf(read)
  return targetsHit(compileTargets(run.invalidates, run.optimistic), def.name, def.tags, def.argsKey(args))
}

/**
 * An opaque snapshot of one entry of a read, held in a Model field. The
 * effect/ui runtime builds it and opens it; nothing else can.
 *
 * **Details**
 *
 * It holds the read's name, the label, the entry's args key, a settled
 * result and whether that result includes an unconfirmed patch. It never
 * holds `Initial`, and `waiting` always decodes as false.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Snapshot<in out R extends Read.Any, in out Label extends string> {
  readonly "~effect/reactivity/Loader/Snapshot": {
    readonly _R: Types.Invariant<R>
    readonly _Label: Types.Invariant<Label>
  }
}

/**
 * The Schema `Loader.Snapshot` returns. Its type parameters are the read's
 * `args`, `success` and `error` Schemas.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface SnapshotSchema<R extends Read.Any, Label extends string> extends
  Schema.declareConstructor<
    Snapshot<R, Label>,
    Snapshot<R, Label>,
    readonly [
      Schema.Codec<Read.Args<R>, unknown>,
      Schema.Codec<Read.Success<R>, unknown>,
      Schema.Codec<Read.Error<R>, unknown>
    ]
  >
{}

/**
 * The Schema of a Model field that holds a snapshot of `read`, branded by
 * the read and the label.
 *
 * **Details**
 *
 * Two fields of one read can't take each other's snapshot: the type and the
 * check both carry the read and the label. The JSON codec writes the
 * entry's args key, built through the read's `args` Schema, and encodes the
 * value and the errors through the read's own Schemas, so a walk over a
 * Model's Schema reaches what a snapshot holds, a `Schema.Redacted`
 * included. Decoding rejects an args key that isn't canonical, so a snapshot
 * always names the entry it was taken from.
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.3
 */
export const Snapshot = <R extends Read.Any, const Label extends string>(
  read: R,
  label: Label
): SnapshotSchema<R, Label> => snapshotSchema(read, label) as any

/**
 * An opaque collection of snapshots of one read, one per args key, held in a
 * keyed Model field. The effect/ui runtime builds it and opens it; nothing
 * else can.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface SnapshotMap<in out R extends Read.Any, in out Label extends string> {
  readonly "~effect/reactivity/Loader/SnapshotMap": {
    readonly _R: Types.Invariant<R>
    readonly _Label: Types.Invariant<Label>
  }
}

/**
 * Helper types for `SnapshotMap`.
 *
 * @stability experimental
 * @since 4.1.3
 */
export declare namespace SnapshotMap {
  /**
   * `unknown` when the read's args are a struct, which a keyed field
   * requires, and a type `read` can't satisfy otherwise.
   *
   * @category utility types
   * @since 4.1.3
   */
  export type StructArgs<R extends Read.Any> = [Read.Args<R>] extends [{ readonly [x: string]: unknown }] ? unknown
    : { readonly "~error": "Loader.SnapshotMap: the read's args must be a struct" }
}

/**
 * The Schema `Loader.SnapshotMap` returns. Its type parameters are the read's
 * `args`, `success` and `error` Schemas.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface SnapshotMapSchema<R extends Read.Any, Label extends string> extends
  Schema.declareConstructor<
    SnapshotMap<R, Label>,
    SnapshotMap<R, Label>,
    readonly [
      Schema.Codec<Read.Args<R>, unknown>,
      Schema.Codec<Read.Success<R>, unknown>,
      Schema.Codec<Read.Error<R>, unknown>
    ]
  >
{}

/**
 * The Schema of a keyed Model field: many entries of `read`, one per args
 * key, branded by the read and the label.
 *
 * **When to use**
 *
 * Use when one component shows many reads of one kind, such as a row per
 * user id. The loader returns an array of args, and `h.loaded.<field>`
 * opens to an entry per unique args in that order. Use a child instance per
 * row instead when a row owns state of its own, such as an inline edit.
 *
 * **Details**
 *
 * It follows `Snapshot`'s rules: only the runtime builds one, the label is
 * its field's name, and it sits at the top level of the Model. The read's
 * args must be a struct. The runtime sends at most one message per keyed
 * field per drain round, with the whole collection. A drain runs before the
 * instance's first view, before a kept child's view when its props change,
 * before the Router saves the page a navigation leaves, and once in a flush
 * for changes from outside a render, so N results that land together are
 * one `update`. The message's `changes` are the
 * declared keys whose result changed since its last message, a new warm
 * key's first value included. A key set that drops a stored key also makes
 * a message due, once per key set, so an `update` that ignores it doesn't
 * get it again. A message can prune and carry changes at once, and a pure
 * prune has none. When a handler's `update` changes the key set again, or
 * another keyed field's, the next round sends that, until no message is
 * due. Nothing bounds the rounds. On the wire it is an array of
 * `Snapshot`'s tuples, one per key, in no meaningful order, and a duplicate
 * args key is a decode error.
 *
 * **Gotchas**
 *
 * - N cold keys start N fetches: batch them in the fetcher with a
 *   `RequestResolver`. Keys that register in one pass share a batch; child
 *   rows whose Layers build at different times don't.
 * - A `refetchInterval` runs one timer per entry, not per field. N keys
 *   refetch on N timers, each of which may wake on its own, so a refresh
 *   can be several fetch batches and several messages rather than one.
 *   Batching the cold keys of one pass doesn't extend to interval
 *   refetches.
 * - A fetcher defect on any key fails the instance holding the field. A
 *   defect in a batching resolver's `runAll` fails every watcher in the
 *   batch, so a child per row doesn't confine a defect to one row either.
 * - The Model field holds every settled key, so a large collection makes
 *   every `history.state` push, the SSR state and each log entry larger.
 * - An `update` whose prune message changes the key set so that it prunes
 *   again, forever, never lets the flush end. `Story` throws on it after
 *   100 rounds in one step.
 * - A mount over a stale key can send two messages before its first frame:
 *   the stale value, then the same value waiting once the fetch starts. Only
 *   the second commits.
 *
 * **Example** (Watching a user per id)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { AsyncResult, Loader } from "effect/reactivity"
 * import { Component } from "effect/ui"
 * import { Html } from "effect/ui/html"
 *
 * class GetUser extends Loader.Service<GetUser>()("users/GetUser", {
 *   args: { id: Schema.String },
 *   success: Schema.Struct({ id: Schema.String, name: Schema.String }),
 *   error: Schema.Never,
 *   staleTime: "30 seconds"
 * }, Effect.succeed(({ id }) => Effect.succeed({ id, name: `User ${id}` }))) {}
 *
 * const Users = Loader.SnapshotMap(GetUser, "users")
 * const Message = Schema.TaggedUnion({ UsersChanged: { users: Users } })
 *
 * const UserList = Component.make({
 *   name: "UserList",
 *   props: Schema.Struct({ ids: Schema.Array(Schema.String) }),
 *   model: Schema.Struct({ users: Users }),
 *   message: Message,
 *   elements: Html,
 *   loaders: { users: (_model, props) => props.ids.map((id) => ({ id })) },
 *   init: ($) => $.empty,
 *   update: (_model, message) => ({ users: message.users }),
 *   subscriptions: (_model, _props, watch) => [
 *     watch({ users: (users) => Message.make({ _tag: "UsersChanged", users }) })
 *   ],
 *   view: (_model, h) =>
 *     h.ul(h.loaded.users.map(({ args, result }) =>
 *       h.li(AsyncResult.isSuccess(result) ? result.value.name : "…").key(args.id)
 *     ))
 * })
 * ```
 *
 * @stability experimental
 * @category schemas
 * @since 4.1.3
 */
export const SnapshotMap = <R extends Read.Any, const Label extends string>(
  read: R & SnapshotMap.StructArgs<R>,
  label: Label
): SnapshotMapSchema<R, Label> => snapshotMapSchema(read, label) as any

/**
 * What started a fetch. Every fetch records exactly one, and the fetcher
 * never sees it.
 *
 * **Details**
 *
 * - `watch`: an entry's watcher count went from zero to one over a cold or
 *   stale entry. A watcher that joins others never refetches.
 * - `get` and `prefetch`: the call found a cold or stale entry with no
 *   fetch in flight. A `get` that calls the fetcher for its callers alone,
 *   storing nothing, records `get` too.
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
  { defaultValue: () => alwaysTrue }
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
  { defaultValue: () => alwaysTrue }
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
export class DuplicateName extends Data.TaggedClass("DuplicateName")<{
  readonly message: string
  readonly read: string
}> {}

/**
 * A function-form `refetchInterval` threw. The entry has no interval until
 * its next settle. `error` is what was thrown.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class IntervalThrew extends Data.TaggedClass("IntervalThrew")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly error: unknown
}> {}

/**
 * A function-form `refetchInterval` returned zero, a negative, or a bare
 * number under 1000. The entry has no interval until its next settle.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class IntervalInvalid extends Data.TaggedClass("IntervalInvalid")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/**
 * One entry's fetch was restarted 10 times in a row with no settle between.
 * Nothing changes; it's reported once per streak.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class FetchRestarted extends Data.TaggedClass("FetchRestarted")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/**
 * A patch made a value the read's `success` Schema rejects, the first time it
 * was applied. The value is used as is.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class PatchInvalid extends Data.TaggedClass("PatchInvalid")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly command: string
}> {}

/**
 * A patch changed the server value it was given, the first time it was
 * applied. A patch must return a new value.
 *
 * **Details**
 *
 * The cache encodes the server value with the read's `success` Schema before
 * a run's patches are first applied and after, and compares snapshots of the
 * two encodings with `Equal.equals`. The check sees everything the Schema
 * encodes. Where the Schema passes a value through as it is, as `Schema.Any`
 * does, it sees the value's own data properties, and not:
 *
 * - inside a value that implements `Equal` or is marked with
 *   `Equal.byReference`;
 * - state that only a getter reaches, such as a private field or a
 *   `WeakMap`.
 *
 * The check runs no getter and no `Equal` or `Hash` method of the value,
 * and finds an `Equal` value by the presence of its key. A patch that reads
 * a getter which memoizes into the value's own data is reported, since the
 * stored value changed. A `Proxy` has its `getPrototypeOf`, `has`,
 * `ownKeys` and `getOwnPropertyDescriptor` traps called, never `get` or
 * `set`, and one whose traps answer differently each time can be reported on
 * a patch that changed nothing. If a mutation goes unreported,
 * give the read a `success` Schema that encodes the value. A value the Schema
 * can't encode is not checked.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class PatchMutated extends Data.TaggedClass("PatchMutated")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly command: string
}> {}

/**
 * A run wrote an entry that existed when it started and that neither its
 * `invalidates` nor a patch covers. The write applies.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class UncoveredWrite extends Data.TaggedClass("UncoveredWrite")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly command: string
}> {}

/**
 * A read's own `invalidate` was called on a per-request server cache, where
 * an entry settles once. Nothing changes.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class InvalidateIgnored extends Data.TaggedClass("InvalidateIgnored")<{
  readonly message: string
  readonly read: string | undefined
}> {}

/**
 * An entry failed to encode when the server cache was serialised. It is left
 * out, and the client fetches it.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class EncodeFailed extends Data.TaggedClass("EncodeFailed")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/**
 * The serialised cache the client hydrates from isn't the expected shape. It
 * is ignored whole.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class HydrationMalformed extends Data.TaggedClass("HydrationMalformed")<{
  readonly message: string
}> {}

/**
 * A hydrated entry's arguments or value failed to decode when its read
 * registered. The entry is cold. `logKey` is there only when the arguments
 * decoded.
 *
 * @stability experimental
 * @category problems
 * @since 4.1.3
 */
export class HydrationDecodeFailed extends Data.TaggedClass("HydrationDecodeFailed")<{
  readonly message: string
  readonly read: string
  readonly part: "value" | "args"
  /** Only when `part` is `"value"`: decoded args are what a log key is built from. */
  readonly logKey: string | undefined
}> {}

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
export type Problem =
  | DuplicateName
  | IntervalThrew
  | IntervalInvalid
  | FetchRestarted
  | PatchInvalid
  | PatchMutated
  | UncoveredWrite
  | InvalidateIgnored
  | EncodeFailed
  | HydrationMalformed
  | HydrationDecodeFailed

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
 * The cache service. Reads look it up; its contents are
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
  const idleMs = cacheIdleMs(options?.idleTimeToLive)
  return Layer.effect(
    Cache,
    Effect.gen(function*() {
      const scope = yield* Effect.scope
      const context = yield* Effect.context<never>()
      return makeCache({
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

// =============================================================================
// Internals
// =============================================================================

// -----------------------------------------------------------------------------
// Type ids
// -----------------------------------------------------------------------------

const CacheTypeId = "~effect/reactivity/Loader/Cache"

const BuildTypeId = "~effect/reactivity/Loader/Build"

// -----------------------------------------------------------------------------
// Keys
// -----------------------------------------------------------------------------

// A fixed name for the kind of a leaf. Never its value, nor anything the value can set, such as its string tag: a
// key can hold a secret.
const kindOf = (leaf: unknown): string => {
  switch (typeof leaf) {
    case "number":
      return "a non-finite number"
    case "undefined":
      return "undefined"
    case "object":
      return "a class instance"
    default:
      return "a " + typeof leaf
  }
}

class NonJsonLeaf {
  readonly kind: string
  constructor(leaf: unknown) {
    this.kind = kindOf(leaf)
  }
}

/**
 * Canonical JSON: sorted object keys, `undefined` properties dropped, no
 * whitespace, `-0` kept apart from `0`. It parses back with `JSON.parse`.
 * Throws a `NonJsonLeaf` on a leaf JSON can't carry.
 *
 * @internal
 */
export const canonical = (u: unknown): string => {
  if (u === null || typeof u === "boolean") return String(u)
  if (typeof u === "string") return JSON.stringify(u)
  if (typeof u === "number") {
    if (!Number.isFinite(u)) throw new NonJsonLeaf(u)
    return Object.is(u, -0) ? "-0" : String(u)
  }
  if (Array.isArray(u)) {
    const parts: Array<string> = []
    // Not `map`: a hole must throw too.
    for (let i = 0; i < u.length; i++) parts.push(canonical(u[i]))
    return "[" + parts.join(",") + "]"
  }
  if (typeof u === "object") {
    const proto = Object.getPrototypeOf(u)
    if (proto !== Object.prototype && proto !== null) throw new NonJsonLeaf(u)
    const o = u as Record<string, unknown>
    const parts: Array<string> = []
    for (const key of Object.keys(o).sort()) {
      if (o[key] !== undefined) parts.push(JSON.stringify(key) + ":" + canonical(o[key]))
    }
    return "{" + parts.join(",") + "}"
  }
  throw new NonJsonLeaf(u)
}

/**
 * A snapshot of a value for the `PatchMutated` check, deep and following
 * cycles, that runs none of the value's own code. It only reflects on a
 * value, so of a `Proxy` only the `getPrototypeOf`, `has`, `ownKeys` and
 * `getOwnPropertyDescriptor` traps run, never `get` or `set`.
 *
 * - An `Equal` value, found by the presence of the `Equal` key without
 *   reading it, an `Equal.byReference` object and a function become an inert
 *   stand-in, the same one for the same object, so that no `Equal` or `Hash`
 *   method of theirs runs when snapshots are compared.
 * - `Date`, `RegExp`, `Map`, `Set` and binary data are recognized by their
 *   internal slots and read through the built-in getters and methods called
 *   directly, which read nothing through the object.
 * - An array is copied by element, read through its own property descriptors.
 *   An accessor element is not read, and its slot holds a marker.
 * - Any other object becomes a prototype-less record of its own data
 *   properties, non-enumerable and symbol keys included, without its `Hash`
 *   method. An accessor is never read, and nothing inherited is copied.
 * - Binary data is kept as its bytes, each kind apart, so an unchanged float
 *   array holding `NaN` stays equal to itself.
 *
 * Two snapshots compare with `Equal.equals` as the data did when each was
 * taken, and neither holds a live object: `Equal.equals` and `Hash.hash`
 * cache by object, and a hash cached before one mutation would hide the next.
 * Throws when a trap throws or a buffer is detached.
 */
const materialize = (u: unknown, seen = new Map<object, unknown>()): unknown => {
  if (typeof u === "function") return standIn(u)
  if (typeof u !== "object" || u === null) return u
  if (byReferenceInstances.has(u) || Equal.symbol in u) return standIn(u)
  const known = seen.get(u)
  if (known !== undefined) return known
  if (ArrayBuffer.isView(u)) {
    const kind: string | undefined = typedArrayTag.call(u)
    if (kind === undefined) {
      // A `DataView`: its getter throws on a detached buffer, skipping the check.
      return new DataView(copyBytes(dataViewBuffer.call(u), dataViewOffset.call(u), dataViewLength.call(u)).buffer)
    }
    // `Equal.equals` compares typed array elements with `!==`, which never matches `NaN` and matches `0` with `-0`,
    // and doesn't tell kinds apart. A record under a private key holds the kind and the bytes instead.
    const out: Record<PropertyKey, unknown> = Object.create(null)
    out[typedArrayKey] = [
      kind,
      copyBytes(typedArrayBuffer.call(u), typedArrayOffset.call(u), typedArrayLength.call(u)).buffer
    ]
    return out
  }
  if (Array.isArray(u)) {
    const length = Object.getOwnPropertyDescriptor(u, "length")!.value as number
    const out: Array<unknown> = new Array(length)
    seen.set(u, out)
    for (let i = 0; i < length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(u, i)
      out[i] = descriptor === undefined
        ? undefined
        : "value" in descriptor
        ? materialize(descriptor.value, seen)
        : accessorSlot
    }
    return out
  }
  // `instanceof` only walks the prototypes; the slot check then tells a built-in object from a `Proxy` or an
  // object made from its prototype, which are copied as records.
  if (u instanceof Date && hasSlot(dateTime, u)) return new Date(dateTime.call(u))
  if (u instanceof RegExp && hasSlot(regExpSource, u)) return new RegExp(regExpSource.call(u), regExpFlags(u))
  if (u instanceof ArrayBuffer && hasSlot(arrayBufferLength, u)) {
    return copyBytes(u as ArrayBuffer, 0, arrayBufferLength.call(u)).buffer
  }
  if (
    sharedArrayBufferLength !== undefined && u instanceof SharedArrayBuffer && hasSlot(sharedArrayBufferLength, u)
  ) {
    const length: number = sharedArrayBufferLength.call(u)
    const out = new SharedArrayBuffer(length)
    new Uint8Array(out).set(new Uint8Array(u as SharedArrayBuffer, 0, length))
    return out
  }
  if (u instanceof Map && hasSlot(mapSize, u)) {
    const out = new Map()
    seen.set(u, out)
    mapForEach.call(u, (value, key) => out.set(materialize(key, seen), materialize(value, seen)))
    return out
  }
  if (u instanceof Set && hasSlot(setSize, u)) {
    const out = new Set()
    seen.set(u, out)
    setForEach.call(u, (value) => out.add(materialize(value, seen)))
    return out
  }
  const out: Record<PropertyKey, unknown> = Object.create(null)
  seen.set(u, out)
  for (const key of Reflect.ownKeys(u)) {
    if (key === Hash.symbol) continue
    const descriptor = Object.getOwnPropertyDescriptor(u, key)
    if (descriptor !== undefined && "value" in descriptor) out[key] = materialize(descriptor.value, seen)
  }
  return out
}

/** The stand-ins for values held by reference: equal only to themselves, with no `Equal` or `Hash` method. */
const standIns = new WeakMap<object, object>()
const standIn = (u: object): object => {
  let out = standIns.get(u)
  if (out === undefined) {
    out = Equal.byReferenceUnsafe(Object.create(null) as object)
    standIns.set(u, out)
  }
  return out
}
const typedArrayKey = Symbol("effect/reactivity/Loader/typedArray")
/** Where an array has an accessor element: it is never read. */
const accessorSlot = Symbol("effect/reactivity/Loader/accessor")

// The built-in getters and methods, called directly: they read internal slots and nothing through the object, and
// throw on an object without the slot, a `Proxy` included.
type Intrinsic = (this: unknown, ...args: Array<any>) => any
const getter = (proto: object, key: PropertyKey): Intrinsic => Object.getOwnPropertyDescriptor(proto, key)!.get!
const hasSlot = (intrinsic: Intrinsic, u: object): boolean => {
  try {
    intrinsic.call(u)
    return true
  } catch {
    return false
  }
}
const typedArrayProto: object = Object.getPrototypeOf(Uint8Array.prototype)
const typedArrayTag = getter(typedArrayProto, Symbol.toStringTag)
const typedArrayBuffer = getter(typedArrayProto, "buffer")
const typedArrayOffset = getter(typedArrayProto, "byteOffset")
const typedArrayLength = getter(typedArrayProto, "byteLength")
const dataViewBuffer = getter(DataView.prototype, "buffer")
const dataViewOffset = getter(DataView.prototype, "byteOffset")
const dataViewLength = getter(DataView.prototype, "byteLength")
const arrayBufferLength = getter(ArrayBuffer.prototype, "byteLength")
const sharedArrayBufferLength = typeof SharedArrayBuffer === "undefined"
  ? undefined
  : getter(SharedArrayBuffer.prototype, "byteLength")
const dateTime: Intrinsic = Date.prototype.getTime
const regExpSource = getter(RegExp.prototype, "source")
// Each flag on its own: the `flags` getter reads them through the object.
const regExpFlagGetters = (
  [
    ["d", "hasIndices"],
    ["g", "global"],
    ["i", "ignoreCase"],
    ["m", "multiline"],
    ["s", "dotAll"],
    ["u", "unicode"],
    ["v", "unicodeSets"],
    ["y", "sticky"]
  ] as const
).flatMap(([flag, key]) => key in RegExp.prototype ? [[flag, getter(RegExp.prototype, key)] as const] : [])
const regExpFlags = (u: object): string => {
  let flags = ""
  for (const [flag, get] of regExpFlagGetters) if (get.call(u)) flags += flag
  return flags
}
const mapSize = getter(Map.prototype, "size")
const setSize = getter(Set.prototype, "size")
const mapForEach: (this: unknown, f: (value: unknown, key: unknown) => void) => void = Map.prototype.forEach
const setForEach: (this: unknown, f: (value: unknown) => void) => void = Set.prototype.forEach
/** A copy of a buffer's bytes in a new `ArrayBuffer`. A detached buffer throws, skipping the check. */
const copyBytes = (buffer: ArrayBufferLike, offset: number, length: number): Uint8Array<ArrayBuffer> =>
  new Uint8Array(buffer, offset, length).slice()

/**
 * A snapshot of the encoding of a server value, for the `PatchMutated`
 * check, or `undefined` when the check can't be made: the encoding or the
 * snapshot throws. Never throws, since the check only reports.
 */
const materializedEncoding = (encode: () => unknown): { readonly encoded: unknown } | undefined => {
  try {
    return { encoded: materialize(encode()) }
  } catch {
    return undefined
  }
}

const lazy = <A>(make: () => A): () => A => {
  let made: { readonly value: A } | undefined
  return () => (made ??= { value: make() }).value
}

/**
 * Whether a type names `undefined`: `Schema.optional` and `Schema.UndefinedOr`
 * name it, and `Schema.Unknown` holds anything. A union names it when any of
 * its members does, whatever the union's mode. A declaration doesn't name it,
 * since only its guard could say. A `suspend` is followed, once.
 */
const namesUndefined = (ast: SchemaAST.AST, seen: Set<SchemaAST.AST> = new Set()): boolean => {
  switch (ast._tag) {
    case "Undefined":
    case "Void":
    case "Unknown":
    case "Any":
      return true
    case "Union":
      return ast.types.some((type) => namesUndefined(type, seen))
    case "Suspend": {
      if (seen.has(ast)) return false
      seen.add(ast)
      return namesUndefined(ast.thunk(), seen)
    }
    default:
      return false
  }
}

/**
 * A copy of `o` without the named properties. Every other own property keeps
 * its descriptor, so no getter runs and a property that isn't enumerable
 * stays. The copy has the prototype of `o`, and is frozen, sealed or closed to
 * extension when `o` is.
 */
const copyWithout = (o: object, names: ReadonlyArray<PropertyKey>): object => {
  const descriptors: Record<PropertyKey, PropertyDescriptor> = Object.getOwnPropertyDescriptors(o)
  for (const name of names) delete descriptors[name]
  const out = Object.create(Object.getPrototypeOf(o), descriptors)
  if (Object.isFrozen(o)) Object.freeze(out)
  else if (Object.isSealed(o)) Object.seal(out)
  else if (!Object.isExtensible(o)) Object.preventExtensions(out)
  return out
}

/**
 * Drops every optional property that is `undefined` from args that are a
 * struct, so `{ id, page: undefined }` and `{ id }` build one key. `null` when
 * the args Schema isn't a struct, or is one with no such property.
 *
 * Only the struct the args themselves are is looked at. What a property holds
 * goes to the args Schema as it is: a nested struct, a union, a class, a
 * record, a tuple, an `Option` or a collection. So do args that are a union, a
 * class or a `suspend`.
 *
 * The drop happens before the args Schema checks or encodes anything, so the
 * read behaves as it does for the same args without the property. It goes by
 * the type side of the Schema: what an encoding produces is the Schema's
 * business.
 *
 * A property is dropped when it is the args' own data property, it is
 * `undefined`, the struct says it may be missing, and its type names
 * `undefined`. Nothing is matched against a value, and no check, encoding,
 * declaration's guard or getter runs to decide. So the Schema still rejects an
 * `undefined` that `Schema.optionalKey` forbids, and a property behind a getter
 * or one the args inherit is the Schema's as it is.
 *
 * Args with nothing to drop are returned as they are, not as a copy.
 */
const dropUndefinedOf = (ast: SchemaAST.AST): ((args: unknown) => unknown) | null => {
  if (ast._tag !== "Objects") return null
  const optional = ast.propertySignatures.flatMap((property) => {
    const type = property.type
    // Asked on first use: the type may be behind a `suspend` that can't be followed yet.
    return SchemaAST.isOptional(type) ? [{ name: property.name, allowed: lazy(() => namesUndefined(type)) }] : []
  })
  if (optional.length === 0) return null
  return (args) => {
    if (typeof args !== "object" || args === null || Array.isArray(args)) return args
    let names: Array<PropertyKey> | undefined
    for (const { allowed, name } of optional) {
      const descriptor = Object.getOwnPropertyDescriptor(args, name)
      if (descriptor !== undefined && "value" in descriptor && descriptor.value === undefined && allowed()) {
        ;(names ??= []).push(name)
      }
    }
    return names === undefined ? args : copyWithout(args, names)
  }
}

/**
 * The JSON encoder of an args Schema, run on the args once the optional
 * `undefined` properties of an args struct are dropped.
 */
const argsEncoder = (ast: SchemaAST.AST): (args: unknown) => unknown => {
  const encode = Schema.encodeUnknownSync(Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(ast)))
  const drop = dropUndefinedOf(ast)
  return drop === null ? encode : (args) => encode(drop(args))
}

// -----------------------------------------------------------------------------
// Host signals
// -----------------------------------------------------------------------------

interface SettableSignal extends Signal {
  readonly set: (value: boolean) => void
}

/**
 * A settable signal, for tests and for host Layers.
 *
 * @internal
 */
export const makeSignal = (initial = true): SettableSignal => {
  let current = initial
  const listeners = new Set<(value: boolean) => void>()
  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set: (value) => {
      if (value === current) return
      current = value
      for (const listener of Array.from(listeners)) listener(value)
    }
  }
}

const alwaysTrue: Signal = { get: () => true, subscribe: () => () => {} }

// -----------------------------------------------------------------------------
// Problems
// -----------------------------------------------------------------------------

/** How many restarts of one fetch in a row, with no settle between, are reported. */
const restartLimit = 10

// -----------------------------------------------------------------------------
// Read definitions
// -----------------------------------------------------------------------------

type Settled = AsyncResult.Success<any, any> | AsyncResult.Failure<any, any>

/**
 * The data of a read. A read's identity is this object, not its class.
 */
interface ReadDef {
  readonly name: string
  readonly args: Schema.Top
  readonly success: Schema.Top
  readonly error: Schema.Top
  readonly staleMs: number
  readonly idleMs: number | undefined
  /** The constant form in milliseconds (`Infinity` is no interval), or the function form. */
  readonly refetchInterval: number | ((result: Settled, args: any) => Duration.Input | undefined) | undefined
  readonly tags: ReadonlyArray<string>
  /** Throws when the args don't encode, or encode to something JSON can't carry. */
  readonly argsKey: (args: unknown) => string
  /** The args with the optional `undefined` properties of an args struct dropped, as the key sees them. */
  readonly normalize: (args: unknown) => unknown
  /** The key through the redacting args codec. Never throws. */
  readonly logKey: (args: unknown, argsKey: string) => string
  /** The JSON codecs of the read's Schemas, built on first use. Each throws on a value that doesn't fit. */
  readonly codec: () => ReadCodec
}

interface ReadCodec {
  readonly encodeSuccess: (value: unknown) => unknown
  readonly decodeSuccess: (encoded: unknown) => unknown
  readonly encodeError: (error: unknown) => unknown
  readonly decodeError: (encoded: unknown) => unknown
  /** Whether a value is of the `success` Schema's type. */
  readonly isSuccess: (value: unknown) => boolean
  /** The args an args key was built from: `JSON.parse`, then the args codec. */
  readonly decodeArgs: (argsKey: string) => unknown
}

const jsonCodec = (schema: Schema.Top) => Schema.toCodecJson(schema as Schema.Codec<unknown, unknown>)

const makeCodec = (args: Schema.Top, success: Schema.Top, error: Schema.Top): ReadCodec => {
  const successJson = jsonCodec(success)
  const errorJson = jsonCodec(error)
  const argsJson = jsonCodec(args)
  const decodeArgs = Schema.decodeUnknownSync(argsJson)
  return {
    encodeSuccess: Schema.encodeUnknownSync(successJson),
    decodeSuccess: Schema.decodeUnknownSync(successJson),
    encodeError: Schema.encodeUnknownSync(errorJson),
    decodeError: Schema.decodeUnknownSync(errorJson),
    isSuccess: Schema.is(success as Schema.Codec<unknown, unknown>),
    decodeArgs: (argsKey) => decodeArgs(JSON.parse(argsKey))
  }
}

const quote = (name: string): string => JSON.stringify(name)

const nonNegative = (name: string, field: string, input: Duration.Input): number => {
  const duration = Duration.fromInputUnsafe(input)
  if (Duration.isNegative(duration)) {
    throw new Error("[Loader] read " + quote(name) + ": " + field + " can't be negative")
  }
  return Duration.toMillis(duration)
}

const subSecondHint = "A bare number is milliseconds: write a sub-second interval as a Duration string, such as " +
  "\"500 millis\"."

/** The interval in milliseconds, or why the input isn't one. */
const parseInterval = (input: Duration.Input): number | "invalid" => {
  if (typeof input === "number" && !(input >= 1000)) return "invalid"
  const duration = Duration.fromInput(input)
  if (Option.isNone(duration)) return "invalid"
  const ms = Duration.toMillis(duration.value)
  return ms > 0 ? ms : "invalid"
}

/**
 * Builds a read's data, and throws on what a definition may not say.
 */
const makeDef = (name: string, options: {
  readonly args: Schema.Top | Schema.Struct.Fields
  readonly success: Schema.Top
  readonly error: Schema.Top
  readonly staleTime: Duration.Input
  readonly idleTimeToLive?: Duration.Input | undefined
  readonly refetchInterval?: RefetchInterval<any, any, any> | undefined
  readonly tags?: ReadonlyArray<{ readonly name: string }> | undefined
}): ReadDef => {
  const staleMs = nonNegative(name, "staleTime", options.staleTime)
  const idleMs = options.idleTimeToLive === undefined
    ? undefined
    : nonNegative(name, "idleTimeToLive", options.idleTimeToLive)
  let refetchInterval: ReadDef["refetchInterval"]
  if (typeof options.refetchInterval === "function") {
    refetchInterval = options.refetchInterval
  } else if (options.refetchInterval !== undefined) {
    const ms = parseInterval(options.refetchInterval)
    if (ms === "invalid") {
      throw new Error(
        "[Loader] read " + quote(name) + ": refetchInterval must be positive, and not a bare number under 1000. " +
          subSecondHint
      )
    }
    refetchInterval = ms
  }
  const args: Schema.Top = Schema.isSchema(options.args) ? options.args : Schema.Struct(options.args)
  // Built on first use: deriving a codec walks the Schema.
  let encodeArgs: ((args: unknown) => unknown) | undefined
  let encodeLogArgs: ((args: unknown) => unknown) | undefined | null = null
  const argsKey = (value: unknown): string => {
    encodeArgs ??= argsEncoder(args.ast)
    let encoded: unknown
    try {
      encoded = encodeArgs(value)
    } catch {
      // The Schema issue prints the value, so it isn't passed on.
      throw new Error("[Loader] read " + quote(name) + ": the args don't encode with the read's args Schema")
    }
    try {
      return canonical(encoded)
    } catch (leaf) {
      throw new Error(
        "[Loader] read " + quote(name) + ": the encoded args hold a value JSON can't carry (" +
          (leaf instanceof NonJsonLeaf ? leaf.kind : "unknown") + "). Give the args Schema a JSON encoding.",
        { cause: leaf }
      )
    }
  }
  const logKey = (value: unknown, key: string): string => {
    if (encodeLogArgs === null) {
      const redacted = redactAST(args.ast)
      // No `Schema.Redacted` in the args: the log key is the args key.
      encodeLogArgs = redacted === args.ast ? undefined : argsEncoder(redacted)
    }
    if (encodeLogArgs === undefined) return key
    try {
      return canonical(encodeLogArgs(value))
    } catch {
      return "\"~unserialisable\""
    }
  }
  let codec: ReadCodec | undefined
  let drop: ((args: unknown) => unknown) | null | undefined
  const normalize = (value: unknown): unknown => {
    if (drop === undefined) drop = dropUndefinedOf(args.ast)
    return drop === null ? value : drop(value)
  }
  return {
    name,
    args,
    normalize,
    success: options.success,
    error: options.error,
    codec: () => codec ??= makeCodec(args, options.success, options.error),
    staleMs,
    idleMs,
    refetchInterval,
    tags: (options.tags ?? []).map((tag) => tag.name),
    argsKey,
    logKey
  }
}

/**
 * The cache-wide idle time in milliseconds. Throws on a negative one.
 *
 * @internal
 */
export const cacheIdleMs = (input: Duration.Input | undefined): number => {
  const duration = Duration.fromInputUnsafe(input ?? "5 minutes")
  if (Duration.isNegative(duration)) throw new Error("[Loader] idleTimeToLive can't be negative")
  return Duration.toMillis(duration)
}

/** @internal */
export const defOf = (read: { readonly [TypeId]: unknown }): ReadDef => read[TypeId] as ReadDef

const isRead = <T>(u: T): u is Extract<T, { readonly [TypeId]: unknown }> =>
  (typeof u === "function" || (typeof u === "object" && u !== null)) && TypeId in u

// -----------------------------------------------------------------------------
// Targets, patches and writes
// -----------------------------------------------------------------------------

/**
 * Where the args key of an entry target, a patch or a write is kept. It is
 * built when the target is, so args that don't encode throw where the target
 * is made: in `invalidates`, `optimistic` or `writes`.
 */
const ArgsKey = "~argsKey"

// The args key a target, patch or write was built with.
const argsKeyOf = (x: { readonly _tag: "Entry" | "Patch" | "Set" }): string => (x as any)[ArgsKey]

const entryTarget = (read: Read.Any, args: unknown): EntryTarget =>
  ({ _tag: "Entry", read, args, [ArgsKey]: defOf(read).argsKey(args) }) as EntryTarget

const patchOne = (read: Read.Any, args: unknown, patch: (value: any) => any): Patch =>
  ({ _tag: "Patch", read, args, patch, [ArgsKey]: defOf(read).argsKey(args) }) as Patch

const patchAll = (read: Read.Any, patch: (value: any, args: any) => any): Patch => ({ _tag: "PatchAll", read, patch })

const write = (read: Read.Any, args: unknown, value: unknown): Write =>
  ({ _tag: "Set", read, args, value, [ArgsKey]: defOf(read).argsKey(args) }) as Write

/**
 * A run's declarations compiled for matching: the reads it names whole, the
 * entries it names one by one, and its tags.
 */
interface Targets {
  readonly reads: ReadonlySet<string>
  readonly entries: ReadonlyMap<string, ReadonlySet<string>>
  readonly tags: ReadonlySet<string>
}

/**
 * Declared targets plus those implied by patches: one entry for `patch`, the
 * whole read for `patchAll`.
 */
const compileTargets = (
  invalidates: ReadonlyArray<Target>,
  optimistic: ReadonlyArray<Patch> = []
): Targets => {
  const reads = new Set<string>()
  const entries = new Map<string, Set<string>>()
  const tags = new Set<string>()
  const addEntry = (name: string, argsKey: string): void => {
    let keys = entries.get(name)
    if (keys === undefined) entries.set(name, keys = new Set())
    keys.add(argsKey)
  }
  for (const target of invalidates) {
    if (isRead(target)) reads.add(defOf(target).name)
    else if (target._tag === "Entry") addEntry(defOf(target.read).name, argsKeyOf(target))
    else tags.add(target.name)
  }
  for (const patch of optimistic) {
    if (patch._tag === "Patch") addEntry(defOf(patch.read).name, argsKeyOf(patch))
    else reads.add(defOf(patch.read).name)
  }
  return { reads, entries, tags }
}

/**
 * Whether compiled targets hit an entry. `tags` is `undefined` for a raw
 * hydrated entry, whose read the cache hasn't seen: every tag hits it.
 */
const targetsHit = (
  targets: Targets,
  name: string,
  tags: ReadonlyArray<string> | undefined,
  argsKey: string
): boolean => {
  if (targets.reads.has(name) || targets.entries.get(name)?.has(argsKey) === true) return true
  if (targets.tags.size === 0) return false
  if (tags === undefined) return true
  return tags.some((tag) => targets.tags.has(tag))
}

/**
 * Applies one patch to a value of the entry of `name` at `argsKey`. A patch
 * of another entry leaves it as it is.
 */
const applyPatch = (patch: Patch, name: string, argsKey: string, args: unknown, value: unknown): unknown => {
  if (defOf(patch.read).name !== name) return value
  if (patch._tag === "PatchAll") return patch.patch(value, args)
  return argsKeyOf(patch) === argsKey ? patch.patch(value) : value
}

// -----------------------------------------------------------------------------
// Builds: which Layer build owns a fetch
// -----------------------------------------------------------------------------

type Fetcher = (args: any) => Effect.Effect<any, any>

/**
 * One Layer build of a read's service. The service value is a plain function,
 * so a fake is `Layer.succeed(Read, fn)`; a function from a real build carries
 * its build, and a fake gets one per cache that never closes.
 */
interface Build {
  readonly fetcher: Fetcher
  closed: boolean
  readonly listeners: Set<(build: Build) => void>
  /** The fetches running under this build, in any cache, until their cleanup has finished. */
  readonly fibers: Set<Fiber.Fiber<any, any>>
}

/**
 * Wraps a fetcher for one Layer build. A new function per build, so two builds
 * never share an identity.
 */
const makeBuild = (fetcher: Fetcher): Build => {
  const wrapped: Fetcher = (args) => fetcher(args)
  const build: Build = { fetcher: wrapped, closed: false, listeners: new Set(), fibers: new Set() }
  Object.defineProperty(wrapped, BuildTypeId, { value: build })
  return build
}

/**
 * Closes a build: every cache that used it restarts or reverts its fetches.
 * It ends when every fetch that ran under the build has finished its cleanup,
 * so a build's finalizer that runs this first releases nothing a fetch still
 * uses.
 */
const closeBuild = (build: Build): Effect.Effect<void> =>
  Effect.suspend(() => {
    if (build.closed) return Effect.void
    build.closed = true
    for (const listener of Array.from(build.listeners)) listener(build)
    build.listeners.clear()
    return Fiber.interruptAll(build.fibers)
  })

// -----------------------------------------------------------------------------
// Cache: the internal API
// -----------------------------------------------------------------------------

interface FetchEvent {
  readonly read: string
  readonly logKey: string
  readonly trigger: Trigger
  /** True when this start replaces an interrupted fetch. It keeps the trigger. */
  readonly restart: boolean
  /** The entry was hydrated and the fetch-free window is still open. */
  readonly inWindow: boolean
  /**
   * False for a fetcher call whose result is handed to `get` callers and never
   * stored: a run reading back its own target, or a `get` under a live patch.
   */
  readonly stored: boolean
}

interface WatchHandle {
  readonly logKey: () => string
  /** The entry's server state right now: `Initial` over a cold entry. */
  readonly current: () => AsyncResult.AsyncResult<any, any>
  /** The patched view right now, and whether it includes an unconfirmed patch. */
  readonly patchedView: () => PatchedView
  /** Drops the watcher count synchronously. Idempotent. */
  readonly unregister: () => void
}

interface PatchedView {
  readonly result: AsyncResult.AsyncResult<any, any>
  readonly patched: boolean
}

interface EntryInfo {
  readonly stored: AsyncResult.AsyncResult<any, any>
  /** The server state with every patch applied: what a loader field shows. */
  readonly view: AsyncResult.AsyncResult<any, any>
  /** Whether `view` includes an unconfirmed patch. */
  readonly patched: boolean
  readonly stale: boolean
  readonly watchers: number
  /** `held`: a refetch waits for the last live patch's run to exit. */
  readonly fetch: "none" | "running" | "held"
  /** The trigger of the fetch in flight, or the one a held fetch will start with. */
  readonly trigger: Trigger | undefined
  readonly patches: { readonly live: number; readonly held: number }
}

/**
 * How a run ended. `Stopped` is a run stopped before its work began: its
 * patches go and it invalidates nothing. `Failure` covers a typed failure,
 * an interrupt and a defect.
 */
type RunExit =
  | { readonly _tag: "Success"; readonly writes: ReadonlyArray<Write> }
  | { readonly _tag: "Failure" }
  | { readonly _tag: "Stopped" }

/**
 * One run of a Command, handed to the cache when it is issued.
 *
 * @internal
 */
export interface RunHandle {
  readonly command: string
  /** The predicate of `Loader.invalidatesEntry` over the run's declarations. */
  readonly invalidates: (def: ReadDef, argsKey: string) => boolean
  /** The work begins. A queued run is issued before it starts. */
  readonly start: () => void
  readonly isStarted: () => boolean
  /** Called once, at fiber exit. Later calls do nothing. */
  readonly finish: (exit: RunExit) => void
  /**
   * Runs a Command body in this run: starts it, provides it as `CurrentRun`,
   * and finishes it when the body's fiber exits. `writes` runs on success
   * only. When it throws, the run still settles, as a success with no
   * writes, and the body dies with what it threw.
   */
  readonly run: <A, E, R>(
    body: Effect.Effect<A, E, R>,
    writes?: ((success: A) => ReadonlyArray<Write>) | undefined
  ) => Effect.Effect<A, E, R>
}

/**
 * The `state["~loader"]` payload: entries by read name, as tagged tuples.
 */
type Dehydrated = Record<
  string,
  Array<
    | readonly [argsKey: string, tag: 0, encodedSuccess: unknown, timestamp: number]
    | readonly [argsKey: string, tag: 1, encodedErrors: ReadonlyArray<unknown>, timestamp: number]
  >
>

/**
 * The synchronous API of a cache, for the generated statics, the effect/ui
 * runtime and the test harnesses. The value of `Loader.Cache` is one of these.
 */
interface CacheInternals {
  readonly [CacheTypeId]: typeof CacheTypeId
  /** Hands the cache a read's definition. Its hydrated entries are decoded now. */
  readonly register: (def: ReadDef) => void
  /**
   * Registers a watcher. The count rises and the zero-to-one fetch decision is
   * made here, but the fetcher starts one scheduler step later and `onChange`
   * is never called for the state at registration: read `current()` or
   * `patchedView()`. With `patched`, `onChange` gets the patched view;
   * otherwise the server value, and `patched` is always false.
   */
  readonly watch: (
    def: ReadDef,
    args: unknown,
    fetcher: Fetcher,
    onChange: (result: Settled, patched: boolean) => void,
    onDefect?: ((cause: Cause.Cause<never>) => void) | undefined,
    options?: { readonly patched?: boolean | undefined } | undefined
  ) => WatchHandle
  /**
   * Holds the zero-to-one decisions until the returned release is called, by
   * every holder. Watchers register and unregister at once, and `onChange`
   * works as usual. At release, an entry fetches, if it is stale, and arms its
   * interval when every watcher it has was registered during the hold: no
   * watcher from before the hold survived it, whatever order the releases and
   * registrations came in. It skips the fetch when one of those watchers
   * registered inside the fetch-free window. The effect/ui runtime holds for
   * each render pass.
   *
   * A bare Failure that the last watcher leaving would drop is withheld from a
   * watcher registering on it during a hold: the watcher reads `Initial` and
   * gets no `onChange` until release. Then, if no watcher that has seen the
   * Failure survived, it is dropped and the entry fetches, as if the last
   * watcher had left first. Otherwise it is delivered.
   */
  readonly hold: () => () => void
  /** The server value. Doesn't create the entry or reset its idle timer. */
  readonly peek: (def: ReadDef, args: unknown) => AsyncResult.AsyncResult<any, any>
  /** `run` is the caller's, from `CurrentRun`. */
  readonly get: (def: ReadDef, args: unknown, fetcher: Fetcher, run: RunHandle | undefined) => Effect.Effect<any, any>
  readonly prefetch: (def: ReadDef, args: unknown, fetcher: Fetcher) => void
  /**
   * One synchronous batch: an entry hit twice restarts once. `byHand` is a
   * read's own `invalidate`, which a settle-once cache reports and ignores.
   */
  readonly invalidate: (
    targets: ReadonlyArray<Target>,
    options?: { readonly byHand?: boolean | undefined } | undefined
  ) => void
  /**
   * Begins a run at issue: registers its patches, which are live from now on.
   * Throws, registering nothing, when a patch throws on first application.
   */
  readonly beginRun: (options: {
    readonly command: string
    readonly invalidates: ReadonlyArray<Target>
    readonly optimistic?: ReadonlyArray<Patch> | undefined
  }) => RunHandle
  /**
   * Interrupts every fetch in flight and every pending `get`, and returns
   * every settled entry for `~loader`. An entry that can't be encoded is
   * left out and reported.
   */
  readonly dehydrate: () => Dehydrated
  /**
   * Holds the `~loader` payload's entries raw until their read registers.
   * Opens the fetch-free window unless `static`, where every entry has an
   * unknown age instead.
   */
  readonly hydrate: (raw: unknown, options?: { readonly static?: boolean | undefined } | undefined) => void
  /** Closes the fetch-free window: unwatched hydrated Failures go, raw ones included. */
  readonly closeWindow: () => void
  readonly isWindowOpen: () => boolean
  /**
   * History restore: fills a cold entry from a snapshot's Success, stored
   * stale. Never from a snapshot taken under a patch. Returns whether it did.
   */
  readonly seed: (snapshot: unknown) => boolean
  /** Called at every fetch start. */
  readonly onFetch: (listener: (event: FetchEvent) => void) => () => void
  /** Called once a stored fetch has ended and its entry has emitted. */
  readonly onFetchEnd: (listener: () => void) => () => void
  readonly inspect: (def: ReadDef, args: unknown) => EntryInfo | undefined
  /** The stored fetches in flight, and those held until a live patch's run exits. */
  readonly pending: () => ReadonlyArray<PendingFetch>
  /**
   * The entries with no settled result whose fetch is in flight, or, with
   * fetches off, that a watcher or `get` waits on. An entry whose fetcher
   * died isn't one: its fetch ended.
   */
  readonly misses: () => ReadonlyArray<{ readonly read: string; readonly logKey: string }>
  /**
   * Decodes every entry of a `~loader` payload with the reads this cache
   * knows, args key included, and encodes it again. Returns a line per entry
   * that doesn't come back as it was shipped.
   */
  readonly checkWire: (raw: unknown) => ReadonlyArray<string>
}

interface PendingFetch {
  readonly read: string
  readonly logKey: string
  readonly status: "running" | "held"
  readonly trigger: Trigger
}

/** @internal */
export const internals = (cache: { readonly [CacheTypeId]: unknown }): CacheInternals => cache as CacheInternals

/**
 * The run a Command body runs in. The effect/ui runtime provides it, so a
 * `get` in the body can tell its run's own targets.
 */
const CurrentRun: Context.Reference<RunHandle | undefined> = Context.Reference<RunHandle | undefined>(
  "effect/reactivity/Loader/CurrentRun",
  { defaultValue: () => undefined }
)

// -----------------------------------------------------------------------------
// Snapshots
// -----------------------------------------------------------------------------

const SnapshotTypeId = "~effect/reactivity/Loader/Snapshot"

/**
 * The annotation a snapshot Schema carries, so effect/ui finds the snapshot
 * fields of a Model.
 */
const snapshotAnnotationKey = "~effect/reactivity/Loader/Snapshot/field"

/** What a snapshot holds. */
interface SnapshotData {
  readonly def: ReadDef
  readonly label: string
  /** `undefined` only for the empty snapshot. */
  readonly argsKey: string | undefined
  readonly args: unknown
  /** `undefined` only for the empty snapshot. `waiting` lives in memory only. */
  readonly result: Settled | undefined
  /** The value includes an unconfirmed patch. Only ever true over a Success. */
  readonly patched: boolean
}

class SnapshotImpl implements Equal.Equal {
  readonly [SnapshotTypeId]: SnapshotData
  constructor(data: SnapshotData) {
    this[SnapshotTypeId] = data
  }
  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof SnapshotImpl)) return false
    const a = this[SnapshotTypeId]
    const b = that[SnapshotTypeId]
    return a.def.name === b.def.name && a.label === b.label && a.argsKey === b.argsKey && a.patched === b.patched &&
      Equal.equals(a.result, b.result)
  }
  [Hash.symbol](): number {
    const data = this[SnapshotTypeId]
    return Hash.string(data.def.name + "\u0000" + data.label + "\u0000" + data.argsKey)
  }
}

/** @internal */
export const makeSnapshot = (
  def: ReadDef,
  label: string,
  entry: { readonly args: unknown; readonly argsKey: string } | undefined,
  result: Settled | undefined,
  patched = false
): SnapshotImpl =>
  new SnapshotImpl({
    def,
    label,
    argsKey: entry?.argsKey,
    // As the key sees them, so the args Schema never meets an `undefined` the key dropped.
    args: entry === undefined ? undefined : def.normalize(entry.args),
    result: entry === undefined ? undefined : result,
    patched: entry !== undefined && patched && result?._tag === "Success"
  })

/** @internal */
export const snapshotData = (u: unknown): SnapshotData | undefined =>
  u instanceof SnapshotImpl ? u[SnapshotTypeId] : undefined

const settledMap = (
  result: Settled,
  success: (u: unknown) => Effect.Effect<unknown, SchemaIssue.Issue>,
  error: (u: unknown) => Effect.Effect<unknown, SchemaIssue.Issue>
): Effect.Effect<Settled, SchemaIssue.Issue> => {
  // `waiting` is carried over, so a watch handler's `make` keeps it. The JSON codec never sets it, so a decoded
  // snapshot is never waiting.
  const waiting = result.waiting
  if (result._tag === "Success") {
    return Effect.map(
      success(result.value),
      (value) => AsyncResult.success(value, { timestamp: result.timestamp, waiting })
    )
  }
  const fails = result.cause.reasons.filter(Cause.isFailReason)
  return Effect.flatMap(
    Effect.forEach(fails, (reason) => error(reason.error)),
    (errors) => {
      const cause = Cause.fromReasons(errors.map((e) => Cause.makeFailReason(e)))
      if (Option.isNone(result.previousSuccess)) return Effect.succeed(AsyncResult.failure(cause, { waiting }))
      const previous = result.previousSuccess.value
      return Effect.map(success(previous.value), (value) =>
        AsyncResult.failure(cause, {
          previousSuccess: Option.some(AsyncResult.success(value, { timestamp: previous.timestamp })),
          waiting
        }))
    }
  )
}

/**
 * The Schema of a Model field that holds a snapshot of a read. Its type
 * parameters are the read's `args`, `success` and `error` Schemas, so a walk
 * over the Model's AST, such as the log's redaction, reaches what a snapshot
 * holds. On the wire a snapshot is a tuple: `[]` when empty,
 * `[argsKey, 0, value, timestamp, patched]` for a Success, and
 * `[argsKey, 1, [error, ...], [value, timestamp] | null]` for a Failure with
 * its previous Success.
 *
 * The args key on the wire is built through the `args` type parameter, so
 * it is the entry's key in page state and its log key under the log's
 * redaction. Decoding takes the args from the key, decodes them all the way
 * and checks that they key back to it.
 */
const snapshotSchema = (
  read: { readonly [TypeId]: unknown },
  label: string
): Schema.Top => {
  const def = defOf(read)
  return Schema.make(
    new SchemaAST.Declaration(
      [def.args.ast, def.success.ast, def.error.ast],
      snapshotRun(def, label, true),
      {
        expected: "Loader.Snapshot(" + quote(def.name) + ", " + quote(label) + ")",
        [snapshotAnnotationKey]: { read: def.name, label, definition: read, keyed: false },
        toCodecJson: snapshotJson(def, label)
      } as Schema.Annotations.Annotations,
      undefined,
      undefined,
      undefined,
      undefined,
      snapshotRun(def, label, false)
    )
  )
}

const isSnapshotOf = (def: ReadDef, label: string) => (u: unknown): u is SnapshotImpl =>
  u instanceof SnapshotImpl && u[SnapshotTypeId].def.name === def.name && u[SnapshotTypeId].label === label

const snapshotIssue = (def: ReadDef, message: string) =>
  new SchemaIssue.InvalidValue({ message: "a snapshot of " + quote(def.name) + ": " + message })

/** Checks a snapshot against the read's Schemas, the type parameters. */
const snapshotRun = (def: ReadDef, label: string, decoding: boolean) => {
  const is = isSnapshotOf(def, label)
  return (typeParameters: ReadonlyArray<SchemaAST.AST>) => {
    const [args, success, error] = typeParameters.map((ast) =>
      SchemaParser.decodeUnknownEffect(Schema.make<Schema.Codec<unknown, unknown>>(ast))
    )
    return (
      input: unknown,
      ast: SchemaAST.Declaration,
      options: SchemaAST.ParseOptions
    ): Effect.Effect<SnapshotImpl, SchemaIssue.Issue> => {
      if (!is(input)) return Effect.fail(new SchemaIssue.InvalidType(ast, input, options))
      const data = input[SnapshotTypeId]
      if (data.result === undefined) return Effect.succeed(input)
      const result = data.result
      // The key stays as it is: it is the snapshot's identity. A decoded snapshot is accepted only when its
      // args, decoded all the way, key back to it, so it never names an entry other than the one it was taken from.
      return Effect.flatMap(
        Effect.all([
          args(data.args, options),
          // A patched value is used as it is: a patch that fails `success` is reported as `PatchInvalid`, and a
          // watch handler's `make` mustn't throw on it.
          settledMap(result, (u) => data.patched ? Effect.succeed(u) : success(u, options), (u) => error(u, options))
        ]),
        ([args, result]) => {
          if (decoding) {
            let back: string | undefined
            try {
              back = def.argsKey(args)
            } catch {
              back = undefined
            }
            if (back !== data.argsKey) return Effect.fail(snapshotIssue(def, "the args key isn't the key of its args"))
          }
          return Effect.succeed(new SnapshotImpl({ ...data, args, result }))
        }
      )
    }
  }
}

/**
 * The JSON form of a snapshot, built from the read's Schemas as the walk over the Model passes them: the
 * tuple Schema and the two steps between a tuple and a snapshot.
 */
const snapshotWire = (def: ReadDef, label: string, [args, success, error]: ReadonlyArray<Schema.Top>) => {
  const invalid = (message: string) => snapshotIssue(def, message)
  const argsJson = Schema.toCodecJson(args as Schema.Codec<unknown, unknown>)
  const encodeArgs = SchemaParser.encodeUnknownEffect(argsJson)
  const decodeArgs = SchemaParser.decodeUnknownEffect(argsJson)
  // `args` here is the encoded side of the args Schema, so these see the args as the declaration passes them.
  const toKey = (args: unknown, options: SchemaAST.ParseOptions): Effect.Effect<string, SchemaIssue.Issue> =>
    Effect.flatMap(encodeArgs(args, options), (encoded) => {
      try {
        return Effect.succeed(canonical(encoded))
      } catch {
        return Effect.fail(invalid("the encoded args hold a value JSON can't carry"))
      }
    })
  const fromKey = (
    key: string,
    options: SchemaAST.ParseOptions
  ): Effect.Effect<unknown, SchemaIssue.Issue> => {
    let parsed: unknown
    try {
      parsed = JSON.parse(key)
    } catch {
      return Effect.fail(invalid("the args key isn't JSON"))
    }
    // The declaration checks the key once the args are decoded all the way.
    return decodeArgs(parsed, options)
  }
  return {
    tuple: Schema.Union([
      Schema.Tuple([]),
      Schema.Tuple([Schema.String, Schema.Literal(0), success, Schema.Number, Schema.Boolean]),
      Schema.Tuple([
        Schema.String,
        Schema.Literal(1),
        Schema.Array(error),
        Schema.NullOr(Schema.Tuple([success, Schema.Number]))
      ])
    ]),
    decode: (tuple: any, options: SchemaAST.ParseOptions): Effect.Effect<SnapshotImpl, SchemaIssue.Issue> => {
      if (tuple.length === 0) return Effect.succeed(makeSnapshot(def, label, undefined, undefined))
      const [key, tag, payload, fourth, fifth] = tuple
      return Effect.map(fromKey(key, options), (args) => {
        const data = { def, label, argsKey: key as string, args }
        if (tag === 0) {
          return new SnapshotImpl({
            ...data,
            result: AsyncResult.success(payload, { timestamp: fourth }),
            patched: fifth === true
          })
        }
        return new SnapshotImpl({
          ...data,
          result: AsyncResult.failure(
            Cause.fromReasons((payload as ReadonlyArray<unknown>).map((e) => Cause.makeFailReason(e))),
            {
              previousSuccess: fourth === null
                ? Option.none()
                : Option.some(AsyncResult.success(fourth[0], { timestamp: fourth[1] }))
            }
          ),
          patched: false
        })
      })
    },
    encode: (snapshot: SnapshotImpl, options: SchemaAST.ParseOptions): Effect.Effect<any, SchemaIssue.Issue> => {
      const data = snapshot[SnapshotTypeId]
      const result = data.result
      if (result === undefined) return Effect.succeed([])
      return Effect.map(toKey(data.args, options), (key) =>
        result._tag === "Success"
          ? [key, 0, result.value, result.timestamp, data.patched]
          : [
            key,
            1,
            result.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error),
            Option.isSome(result.previousSuccess)
              ? [result.previousSuccess.value.value, result.previousSuccess.value.timestamp]
              : null
          ])
    }
  }
}

/** The JSON codec of a snapshot. */
const snapshotJson = (def: ReadDef, label: string) => (typeParameters: ReadonlyArray<Schema.Top>) => {
  const wire = snapshotWire(def, label, typeParameters)
  return Schema.link<SnapshotImpl>()(
    wire.tuple,
    SchemaTransformation.transformEffect<SnapshotImpl, any>({ decode: wire.decode, encode: wire.encode })
  )
}

// -----------------------------------------------------------------------------
// Snapshot maps
// -----------------------------------------------------------------------------

const SnapshotMapTypeId = "~effect/reactivity/Loader/SnapshotMap"

/** What a snapshot map holds: one settled snapshot per args key. */
interface SnapshotMapData {
  readonly def: ReadDef
  readonly label: string
  readonly entries: ReadonlyMap<string, SnapshotImpl>
}

class SnapshotMapImpl implements Equal.Equal {
  readonly [SnapshotMapTypeId]: SnapshotMapData
  constructor(data: SnapshotMapData) {
    this[SnapshotMapTypeId] = data
  }
  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof SnapshotMapImpl)) return false
    const a = this[SnapshotMapTypeId]
    const b = that[SnapshotMapTypeId]
    if (a.def.name !== b.def.name || a.label !== b.label || a.entries.size !== b.entries.size) return false
    for (const [key, snapshot] of a.entries) {
      if (!Equal.equals(snapshot, b.entries.get(key))) return false
    }
    return true
  }
  [Hash.symbol](): number {
    const data = this[SnapshotMapTypeId]
    return Hash.string(data.def.name + "\u0000" + data.label + "\u0000" + data.entries.size)
  }
}

/**
 * A snapshot map of the given snapshots, each one settled and of `def` and
 * `label`, with no two sharing an args key.
 *
 * @internal
 */
export const makeSnapshotMap = (
  def: ReadDef,
  label: string,
  snapshots: Iterable<unknown>
): SnapshotMapImpl => {
  const entries = new Map<string, SnapshotImpl>()
  for (const snapshot of snapshots) {
    const data = snapshotData(snapshot)!
    entries.set(data.argsKey!, snapshot as SnapshotImpl)
  }
  return new SnapshotMapImpl({ def, label, entries })
}

/** @internal */
export const snapshotMapData = (u: unknown): SnapshotMapData | undefined =>
  u instanceof SnapshotMapImpl ? u[SnapshotMapTypeId] : undefined

const snapshotMapSchema = (
  read: { readonly [TypeId]: unknown },
  label: string
): Schema.Top => {
  const def = defOf(read)
  const is = (u: unknown): u is SnapshotMapImpl =>
    u instanceof SnapshotMapImpl && u[SnapshotMapTypeId].def.name === def.name &&
    u[SnapshotMapTypeId].label === label
  const makeRun = (decoding: boolean) => (typeParameters: ReadonlyArray<SchemaAST.AST>) => {
    const one = snapshotRun(def, label, decoding)(typeParameters)
    return (
      input: unknown,
      ast: SchemaAST.Declaration,
      options: SchemaAST.ParseOptions
    ): Effect.Effect<SnapshotMapImpl, SchemaIssue.Issue> => {
      if (!is(input)) return Effect.fail(new SchemaIssue.InvalidType(ast, input, options))
      return Effect.map(
        Effect.forEach(input[SnapshotMapTypeId].entries.values(), (snapshot) => one(snapshot, ast, options)),
        (snapshots) => makeSnapshotMap(def, label, snapshots)
      )
    }
  }
  const toCodecJson = (typeParameters: ReadonlyArray<Schema.Top>) => {
    const wire = snapshotWire(def, label, typeParameters)
    return Schema.link<SnapshotMapImpl>()(
      Schema.Array(wire.tuple),
      SchemaTransformation.transformEffect<SnapshotMapImpl, ReadonlyArray<any>>({
        decode: (tuples, options) =>
          Effect.flatMap(Effect.forEach(tuples, (tuple) => wire.decode(tuple, options)), (snapshots) => {
            const keys = new Set<string>()
            for (const snapshot of snapshots) {
              const key = snapshot[SnapshotTypeId].argsKey
              if (key === undefined) return Effect.fail(snapshotIssue(def, "a keyed field holds an empty snapshot"))
              if (keys.has(key)) return Effect.fail(snapshotIssue(def, "a keyed field holds one args key twice"))
              keys.add(key)
            }
            return Effect.succeed(makeSnapshotMap(def, label, snapshots))
          }),
        encode: (map, options) =>
          Effect.forEach(map[SnapshotMapTypeId].entries.values(), (snapshot) => wire.encode(snapshot, options))
      })
    )
  }
  return Schema.make(
    new SchemaAST.Declaration(
      [def.args.ast, def.success.ast, def.error.ast],
      makeRun(true),
      {
        expected: "Loader.SnapshotMap(" + quote(def.name) + ", " + quote(label) + ")",
        [snapshotAnnotationKey]: { read: def.name, label, definition: read, keyed: true },
        toCodecJson
      } as Schema.Annotations.Annotations,
      undefined,
      undefined,
      undefined,
      undefined,
      makeRun(false)
    )
  )
}

// -----------------------------------------------------------------------------
// Cache: implementation
// -----------------------------------------------------------------------------

interface Watcher {
  readonly onChange: (result: Settled, patched: boolean) => void
  readonly onDefect: ((cause: Cause.Cause<never>) => void) | undefined
  readonly build: Build
  /** Gets the patched view, not the server value. */
  readonly patched: boolean
  /** The hold it registered under, or -1. */
  readonly generation: number
  /** Registered inside the fetch-free window. */
  readonly windowed: boolean
  /**
   * The bare Failure stored when it registered during a hold, withheld until the hold is released: the watcher
   * reads `Initial` meanwhile. Cleared once the entry stores anything else, or at release.
   */
  provisional: Settled | undefined
  last: AsyncResult.AsyncResult<any, any>
  lastPatched: boolean
  active: boolean
}

interface Waiter {
  readonly build: Build
  readonly resume: (exit: Exit.Exit<any, any>) => void
  /** Set when the waiter is a caller of a caller-only fetch, not of the stored one. */
  shared: Shared | undefined
}

interface FetchRec {
  readonly trigger: Trigger
  readonly build: Build
  fiber: Fiber.Fiber<any, any> | undefined
}

/**
 * A caller-only fetch: a fetcher call made for `get` callers under a live
 * patch, whose result is handed to them and never stored. The entry doesn't
 * see it.
 */
interface Shared {
  readonly entry: Entry
  build: Build
  readonly callers: Set<Waiter>
  fiber: Fiber.Fiber<any, any> | undefined
}

interface Idle {
  expiresAt: number
  cancel: () => void
}

interface Run {
  readonly command: string
  /** Issue order. */
  readonly issue: number
  readonly targets: Targets
  /** The sequence number at the run's start: a write or invalidation after it makes a write stale. */
  startSeq: number
  started: boolean
  done: boolean
  /** The entries its patches registered on. */
  readonly entries: Set<Entry>
}

interface PatchRec {
  readonly run: Run
  readonly patch: Patch
  /** Live while the run is queued or running. Held after its success, until a settle or a stored write. */
  live: boolean
}

type RawTuple = Dehydrated[string][number]

interface Entry {
  readonly def: ReadDef
  readonly argsKey: string
  readonly args: unknown
  logKey: string | undefined
  /** The settled server state, never waiting. `undefined` is cold. */
  result: Settled | undefined
  /** From `Clock`. Never `AsyncResult`'s timestamp, which is display-only. */
  settledAt: number
  invalidated: boolean
  removed: boolean
  readonly watchers: Set<Watcher>
  /** Pending `get` callers of the stored fetch. */
  readonly waiters: Set<Waiter>
  fetch: FetchRec | undefined
  /** Restarts since the last settle. */
  restarts: number
  idle: Idle | undefined
  /** The interval worked out for the current settle. `undefined`: not worked out yet. */
  interval: { readonly ms: number | undefined } | undefined
  intervalDue: number | undefined
  intervalCancel: (() => void) | undefined
  /** In issue order. */
  patches: Array<PatchRec>
  /** The first trigger deferred under a live patch. */
  deferred: Trigger | undefined
  /** The caller-only fetch `get` callers join, while a patch is live. */
  shared: Shared | undefined
  /** Sequence numbers: when the entry was made, and the last write or invalidation that hit it. */
  readonly born: number
  touched: number
  /** The issue number of the latest run that wrote or invalidated the entry. */
  reached: number
  /** Hydrated, and nothing has fetched or written it since. Only means something while the window is open. */
  hydrated: boolean
}

const runBody = <A, E, R>(
  handle: RunHandle,
  body: Effect.Effect<A, E, R>,
  writes: ((success: A) => ReadonlyArray<Write>) | undefined
): Effect.Effect<A, E, R> =>
  Effect.uninterruptibleMask((restore) => {
    handle.start()
    return Effect.flatMap(
      Effect.exit(restore(Effect.provideService(body, CurrentRun, handle))),
      (exit): Effect.Effect<A, E> => {
        if (exit._tag === "Failure") {
          handle.finish({ _tag: "Failure" })
          return exit
        }
        let sets: ReadonlyArray<Write> = []
        try {
          if (writes !== undefined) sets = writes(exit.value)
        } catch (error) {
          handle.finish({ _tag: "Success", writes: [] })
          return Effect.die(error)
        }
        handle.finish({ _tag: "Success", writes: sets })
        return exit
      }
    )
  })

const isBareFailure = (result: Settled | undefined): boolean =>
  result !== undefined && result._tag === "Failure" && Option.isNone(result.previousSuccess)

// A fetched Failure holds only its Fails, so it has the shape of a hydrated one.
const failsOnly = (cause: Cause.Cause<any>): Cause.Cause<any> =>
  Cause.fromReasons(cause.reasons.filter(Cause.isFailReason).map((reason) => Cause.makeFailReason(reason.error)))

const diesOnly = (cause: Cause.Cause<any>): Cause.Cause<never> =>
  Cause.fromReasons(cause.reasons.filter(Cause.isDieReason).map((reason) => Cause.makeDieReason(reason.defect)))

/** What a caller of a fetch gets: a defect, the Fails only, or an interrupt for a revert. */
const callerExit = (exit: Exit.Exit<any, any>): Exit.Exit<any, any> =>
  exit._tag === "Success"
    ? exit
    : Cause.hasDies(exit.cause)
    ? Exit.failCause(diesOnly(exit.cause))
    : Cause.hasFails(exit.cause)
    ? Exit.failCause(failsOnly(exit.cause))
    : Exit.interrupt()

const withWaiting = (result: Settled, waiting: boolean): Settled =>
  result.waiting === waiting
    ? result
    : result._tag === "Success"
    ? AsyncResult.success(result.value, { waiting, timestamp: result.timestamp })
    : AsyncResult.failure(result.cause, { previousSuccess: result.previousSuccess, waiting })

const settledEffect = (result: Settled): Effect.Effect<any, any> =>
  result._tag === "Success" ? Effect.succeed(result.value) : Effect.failCause(result.cause)

const isRawTuple = (u: unknown): u is RawTuple =>
  Array.isArray(u) && u.length === 4 && typeof u[0] === "string" && typeof u[3] === "number" &&
  (u[1] === 0 || (u[1] === 1 && Array.isArray(u[2])))

/** The `~loader` payload by read name and args key, or `undefined` when it isn't the tuple shape. */
const parseRaw = (input: unknown): Map<string, Map<string, RawTuple>> | undefined => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined
  const out = new Map<string, Map<string, RawTuple>>()
  for (const [name, tuples] of Object.entries(input)) {
    if (!Array.isArray(tuples)) return undefined
    const byKey = new Map<string, RawTuple>()
    for (const tuple of tuples) {
      if (!isRawTuple(tuple)) return undefined
      if (!byKey.has(tuple[0])) byKey.set(tuple[0], tuple)
    }
    if (byKey.size > 0) out.set(name, byKey)
  }
  return out
}

/**
 * Builds a cache synchronously. `context` supplies the `Clock` and the
 * scheduler, and every fetch and timer is forked with it. The cache is
 * disposed when `scope` closes.
 *
 * @internal
 */
export const makeCache = (options: {
  readonly scope: Scope.Scope
  readonly context: Context.Context<never>
  readonly visibility: Signal
  readonly connectivity: Signal
  /** The problems sink. A throw from it is swallowed. */
  readonly report: (problem: Problem) => void
  /** In milliseconds, from `cacheIdleMs`. */
  readonly idleMs: number
  /**
   * The server's per-request mode: an entry settles at most once and is never
   * stale after, every settle is stored, a read's own `invalidate` is ignored
   * and reported, and no idle timer, interval or host edge runs.
   */
  readonly settleOnce?: boolean | undefined
  /** `false`: no fetch ever starts, as on a server render with a budget of 0. */
  readonly fetches?: boolean | undefined
}): CacheInternals => {
  const { connectivity, context, visibility } = options
  const clock = Context.get(context, Clock.Clock)
  const defaultIdleMs = options.idleMs
  const settleOnce = options.settleOnce === true
  const fetches = options.fetches !== false

  const reads = new Map<string, ReadDef>()
  const duplicates = new WeakSet<ReadDef>()
  const index = new Map<string, Map<string, Entry>>()
  // Builds made for fakes, and every build this cache listens to.
  const fakeBuilds = new WeakMap<Fetcher, Build>()
  const attached = new Set<Build>()
  const fetchListeners = new Set<(event: FetchEvent) => void>()
  const fetchEndListeners = new Set<() => void>()
  const timers = new Set<Fiber.Fiber<any, any>>()
  // Every fetch fiber until its cleanup has finished, and per entry the interrupted one its next fetch waits for.
  const fetchFibers = new Set<Fiber.Fiber<any, any>>()
  const draining = new Map<string, Fiber.Fiber<any, any>>()
  const sharedFetches = new Set<Shared>()
  // Hydrated entries whose read hasn't registered yet.
  let raw = new Map<string, Map<string, RawTuple>>()
  let hydratedAt = 0
  let hydratedStatic = false
  let windowOpen = false
  // Writes and invalidations, entry creation and run starts share one sequence.
  let seq = 0
  let issued = 0
  let disposed = false

  const now = (): number => clock.currentTimeMillisUnsafe()
  const runFork = Effect.runForkWith(context)
  /** Runs `f` one scheduler step later. */
  const defer = (f: () => void): void => {
    runFork(Effect.andThen(Effect.yieldNow, Effect.sync(() => disposed ? undefined : f())))
  }
  /** A `Clock` sleep. Returns its cancel. */
  const timer = (ms: number, f: () => void): () => void => {
    const fiber: Fiber.Fiber<any, any> = runFork(Effect.andThen(
      Effect.sleep(ms),
      Effect.sync(() => {
        timers.delete(fiber)
        if (!disposed) f()
      })
    ))
    timers.add(fiber)
    return () => {
      timers.delete(fiber)
      fiber.interruptUnsafe()
    }
  }
  const report = (problem: Problem): void => {
    try {
      options.report(problem)
    } catch {
      // A check only reports: a sink that throws changes nothing.
    }
  }

  // -- registry and index -----------------------------------------------------
  /** First wins: the first definition under a name pins everything about the read. */
  const register = (def: ReadDef): ReadDef => {
    const existing = reads.get(def.name)
    if (existing === undefined) {
      reads.set(def.name, def)
      decodeRaw(def)
      return def
    }
    if (existing !== def && !duplicates.has(def)) {
      duplicates.add(def)
      report(
        new DuplicateName({
          read: def.name,
          message: "[Loader] a second read named " + quote(def.name) +
            " was registered in one cache. The first definition wins."
        })
      )
    }
    return existing
  }
  const allEntries = (): Array<Entry> => {
    const out: Array<Entry> = []
    for (const byKey of index.values()) for (const entry of byKey.values()) out.push(entry)
    return out
  }
  const lookup = (def: ReadDef, argsKey: string): Entry | undefined => index.get(def.name)?.get(argsKey)
  const ensureEntry = (def: ReadDef, args: unknown, argsKey = def.argsKey(args)): Entry => {
    const found = lookup(def, argsKey)
    if (found !== undefined) return found
    const entry: Entry = {
      def,
      argsKey,
      args,
      logKey: undefined,
      result: undefined,
      settledAt: 0,
      invalidated: false,
      removed: false,
      watchers: new Set(),
      waiters: new Set(),
      fetch: undefined,
      restarts: 0,
      idle: undefined,
      interval: undefined,
      intervalDue: undefined,
      intervalCancel: undefined,
      patches: [],
      deferred: undefined,
      shared: undefined,
      born: ++seq,
      touched: 0,
      reached: 0,
      hydrated: false
    }
    let byKey = index.get(def.name)
    if (byKey === undefined) index.set(def.name, byKey = new Map())
    byKey.set(argsKey, entry)
    return entry
  }
  const removeEntry = (entry: Entry): void => {
    if (entry.removed) return
    entry.removed = true
    cancelIdle(entry)
    stopInterval(entry)
    const byKey = index.get(entry.def.name)
    if (byKey !== undefined && byKey.get(entry.argsKey) === entry) {
      byKey.delete(entry.argsKey)
      if (byKey.size === 0) index.delete(entry.def.name)
    }
  }
  const drainKey = (entry: Entry): string => quote(entry.def.name) + entry.argsKey
  const logKeyOf = (entry: Entry): string => entry.logKey ??= entry.def.logKey(entry.args, entry.argsKey)

  // -- builds -----------------------------------------------------------------
  const buildOf = (fetcher: Fetcher): Build => {
    let build = (fetcher as { readonly [BuildTypeId]?: Build })[BuildTypeId]
    if (build === undefined) {
      build = fakeBuilds.get(fetcher)
      if (build === undefined) {
        build = { fetcher, closed: false, listeners: new Set(), fibers: new Set() }
        fakeBuilds.set(fetcher, build)
      }
      return build
    }
    if (!build.closed && !attached.has(build)) {
      attached.add(build)
      build.listeners.add(buildClosed)
    }
    return build
  }
  /** The build the cache uses when it asks itself: the earliest live watcher's, then a waiter's. */
  const survivingBuild = (entry: Entry): Build | undefined => {
    for (const watcher of entry.watchers) if (!watcher.build.closed) return watcher.build
    for (const waiter of entry.waiters) if (!waiter.build.closed) return waiter.build
    return undefined
  }

  // -- state ------------------------------------------------------------------
  const isStale = (entry: Entry): boolean =>
    settleOnce
      ? entry.result === undefined
      : entry.result === undefined || entry.result._tag === "Failure" || entry.invalidated ||
        now() - entry.settledAt >= entry.def.staleMs
  const hasLive = (entry: Entry): boolean => entry.patches.some((patch) => patch.live)
  /** Inside the fetch-free window, a hydrated entry. */
  const inWindow = (entry: Entry): boolean => windowOpen && entry.hydrated
  /** The server value. `waiting` means only that a stored fetch is in flight. */
  const view = (entry: Entry): AsyncResult.AsyncResult<any, any> => {
    const waiting = entry.fetch !== undefined
    return entry.result === undefined ? AsyncResult.initial(waiting) : withWaiting(entry.result, waiting)
  }
  /** The server value with every patch applied in issue order. A patch that throws is dropped from the entry. */
  const patchedViewOf = (entry: Entry, server: AsyncResult.AsyncResult<any, any>): PatchedView => {
    if (entry.patches.length === 0 || server._tag !== "Success") return { result: server, patched: false }
    let value = server.value
    for (const rec of entry.patches.slice()) {
      try {
        value = applyPatch(rec.patch, entry.def.name, entry.argsKey, entry.args, value)
      } catch {
        entry.patches = entry.patches.filter((other) => other !== rec)
      }
    }
    if (entry.patches.length === 0) return { result: server, patched: false }
    return {
      result: AsyncResult.success(value, { waiting: server.waiting, timestamp: server.timestamp }),
      patched: true
    }
  }
  /** Quiet over a cold entry, and skips a state equal to a watcher's last. */
  const emit = (entry: Entry): void => {
    if (entry.watchers.size === 0) return
    const server = view(entry)
    if (server._tag === "Initial") return
    let patchedView: PatchedView | undefined
    for (const watcher of Array.from(entry.watchers)) {
      if (!watcher.active) continue
      if (watcher.provisional !== undefined) {
        // The withheld Failure, waiting or not: still withheld.
        if (watcher.provisional === entry.result) continue
        watcher.provisional = undefined
      }
      let result: AsyncResult.AsyncResult<any, any> = server
      let patched = false
      if (watcher.patched) {
        patchedView ??= patchedViewOf(entry, server)
        result = patchedView.result
        patched = patchedView.patched
      }
      if (patched === watcher.lastPatched && Equal.equals(result, watcher.last)) continue
      watcher.last = result
      watcher.lastPatched = patched
      watcher.onChange(result as Settled, patched)
    }
  }
  const emitFetch = (entry: Entry, trigger: Trigger, restart: boolean, stored: boolean): void => {
    if (fetchListeners.size === 0) return
    const event: FetchEvent = {
      read: entry.def.name,
      logKey: logKeyOf(entry),
      trigger,
      restart,
      inWindow: inWindow(entry),
      stored
    }
    for (const listener of Array.from(fetchListeners)) {
      try {
        listener(event)
      } catch {
        // A listener can't change what the cache does.
      }
    }
  }

  // -- idle timer -------------------------------------------------------------
  const cancelIdle = (entry: Entry): void => {
    if (entry.idle !== undefined) {
      entry.idle.cancel()
      entry.idle = undefined
    }
  }
  // A live patch blocks collection. A patch held after success doesn't.
  const idleEligible = (entry: Entry): boolean =>
    !entry.removed && entry.watchers.size === 0 && entry.waiters.size === 0 && entry.fetch === undefined &&
    !hasLive(entry)
  const idleTtl = (entry: Entry): number => entry.def.idleMs ?? defaultIdleMs
  // Built like `RcMap`'s: an `expiresAt` a reset moves, and a sleep that goes round again.
  const startIdle = (entry: Entry): void => {
    cancelIdle(entry)
    // The server starts no idle timers.
    if (settleOnce) return
    const ttl = idleTtl(entry)
    if (ttl === Infinity) return
    if (ttl <= 0) return removeEntry(entry)
    const idle: Idle = { expiresAt: now() + ttl, cancel: () => {} }
    entry.idle = idle
    const sleep = (ms: number): void => {
      idle.cancel = timer(ms, () => {
        if (entry.idle !== idle) return
        const remaining = idle.expiresAt - now()
        if (remaining > 0) return sleep(remaining)
        entry.idle = undefined
        if (idleEligible(entry)) removeEntry(entry)
      })
    }
    sleep(ttl)
  }
  /** Called whenever the entry may have gone quiet: removes a cold one, starts the timer on a settled one. */
  const afterQuiet = (entry: Entry): void => {
    if (disposed || !idleEligible(entry)) return
    if (entry.result === undefined) return removeEntry(entry)
    if (entry.idle === undefined) startIdle(entry)
  }
  const resetIdle = (entry: Entry): void => {
    if (entry.idle !== undefined) entry.idle.expiresAt = now() + idleTtl(entry)
  }

  // -- interval ---------------------------------------------------------------
  const paused = (): boolean => !visibility.get() || !connectivity.get()
  const stopInterval = (entry: Entry): void => {
    if (entry.intervalCancel !== undefined) {
      entry.intervalCancel()
      entry.intervalCancel = undefined
    }
    entry.intervalDue = undefined
  }
  /** Worked out once per settle: a function form that throws or returns nonsense means none until the next. */
  const intervalMs = (entry: Entry): number | undefined => {
    if (entry.result === undefined) return undefined
    if (entry.interval !== undefined) return entry.interval.ms
    const ms = evaluateInterval(entry, entry.result)
    entry.interval = { ms }
    return ms
  }
  const evaluateInterval = (entry: Entry, result: Settled): number | undefined => {
    const interval = entry.def.refetchInterval
    if (interval === undefined) return undefined
    if (typeof interval === "number") return interval === Infinity ? undefined : interval
    let input: Duration.Input | undefined
    try {
      input = interval(result, entry.args)
    } catch (error) {
      const logKey = logKeyOf(entry)
      report(
        new IntervalThrew({
          read: entry.def.name,
          logKey,
          error,
          message: "[Loader] refetchInterval of " + quote(entry.def.name) + " threw at " + logKey +
            ". There is no interval until the next settle."
        })
      )
      return undefined
    }
    if (input === undefined) return undefined
    const ms = parseInterval(input)
    if (ms === "invalid") {
      const logKey = logKeyOf(entry)
      report(
        new IntervalInvalid({
          read: entry.def.name,
          logKey,
          message: "[Loader] refetchInterval of " + quote(entry.def.name) +
            " returned zero, a negative or a bare number under 1000 at " + logKey +
            ". There is no interval until the next settle. " + subSecondHint
        })
      )
      return undefined
    }
    return ms === Infinity ? undefined : ms
  }
  const fireInterval = (entry: Entry): void => {
    // Paused: the due time stays, and the edge pass picks it up.
    if (paused() || entry.fetch !== undefined || entry.watchers.size === 0) return
    const build = survivingBuild(entry)
    if (build !== undefined) ensureFetch(entry, "interval", build)
  }
  const armInterval = (entry: Entry): void => {
    if (entry.intervalCancel !== undefined) entry.intervalCancel()
    entry.intervalCancel = undefined
    if (entry.intervalDue === undefined) return
    const remaining = entry.intervalDue - now()
    if (remaining <= 0) {
      let cancelled = false
      entry.intervalCancel = () => {
        cancelled = true
      }
      defer(() => {
        if (cancelled) return
        entry.intervalCancel = undefined
        fireInterval(entry)
      })
      return
    }
    entry.intervalCancel = timer(remaining, () => {
      entry.intervalCancel = undefined
      fireInterval(entry)
    })
  }
  /** Counts from the last settle. Called at a settle and at the zero-to-one watch. */
  const scheduleInterval = (entry: Entry): void => {
    stopInterval(entry)
    if (settleOnce || entry.removed || entry.watchers.size === 0) return
    const ms = intervalMs(entry)
    if (ms === undefined) return
    entry.intervalDue = entry.settledAt + ms
    armInterval(entry)
  }
  /**
   * A fetch ended without a settle. If the interval's timer already fired,
   * nothing else would arm it again, so a new interval counts from now and
   * polling carries on. While paused the due time stays for the edge pass.
   */
  const rearmInterval = (entry: Entry): void => {
    if (settleOnce || disposed || entry.removed || entry.watchers.size === 0 || entry.fetch !== undefined) return
    if (entry.intervalCancel !== undefined || paused()) return
    const ms = intervalMs(entry)
    if (ms === undefined) return
    entry.intervalDue = now() + ms
    armInterval(entry)
  }
  const intervalElapsed = (entry: Entry): boolean => entry.intervalDue !== undefined && entry.intervalDue <= now()

  // -- fetching ---------------------------------------------------------------
  const startFetch = (entry: Entry, trigger: Trigger, build: Build, restart: boolean): void => {
    const fetch: FetchRec = { trigger, build, fiber: undefined }
    entry.fetch = fetch
    cancelIdle(entry)
    // Reported before the entry turns ordinary, so the event says whether it fetched inside the window.
    emitFetch(entry, trigger, restart, true)
    // A fetch after hydration makes the entry ordinary: a `get` joins it.
    entry.hydrated = false
    // The fetcher never starts inside the call that asked for it, nor before the fetch it replaces has finished
    // its cleanup. The wait is uninterruptible, so a chain of restarts still ends in order.
    const key = drainKey(entry)
    const previous = draining.get(key)
    const fiber = runFork(Effect.andThen(
      previous === undefined ? Effect.yieldNow : Effect.uninterruptible(Fiber.await(previous)),
      Effect.suspend(() => build.fetcher(entry.args))
    ))
    fetch.fiber = fiber
    fetchFibers.add(fiber)
    build.fibers.add(fiber)
    fiber.addObserver((exit) => {
      fetchFibers.delete(fiber)
      build.fibers.delete(fiber)
      if (draining.get(key) === fiber) draining.delete(key)
      onFetchExit(entry, fetch, exit)
      for (const listener of Array.from(fetchEndListeners)) {
        try {
          listener()
        } catch {
          // A listener can't change what the cache does.
        }
      }
    })
    emit(entry)
  }
  /**
   * Interrupts the fetch without settling anything, and without waiting for its cleanup: the entry's next fetch,
   * the build's close and the cache's disposal wait for that. The caller restarts or reverts.
   */
  const dropFetch = (entry: Entry, fetch: FetchRec): void => {
    entry.fetch = undefined
    if (fetch.fiber === undefined) return
    draining.set(drainKey(entry), fetch.fiber)
    fetch.fiber.interruptUnsafe()
  }
  /**
   * One fetch per entry: a caller that finds one in flight joins it. Under a
   * live patch nothing fetches, and the first trigger is kept for the check
   * made when the last live owner exits.
   */
  const ensureFetch = (entry: Entry, trigger: Trigger, build: Build): void => {
    if (entry.fetch !== undefined || disposed || !fetches) return
    if (settleOnce && entry.result !== undefined) return
    if (hasLive(entry)) {
      entry.deferred ??= trigger
      return
    }
    startFetch(entry, trigger, build, false)
  }
  /** A restarted fetch keeps its trigger. Ten in a row with no settle between are reported, once. */
  const restartFetch = (entry: Entry, dropped: FetchRec, build: Build): void => {
    entry.restarts++
    if (entry.restarts === restartLimit) {
      const logKey = logKeyOf(entry)
      report(
        new FetchRestarted({
          read: entry.def.name,
          logKey,
          message: "[Loader] the fetch of " + quote(entry.def.name) + " at " + logKey + " was restarted " +
            restartLimit + " times in a row without settling."
        })
      )
    }
    startFetch(entry, dropped.trigger, build, true)
  }
  const resumeWaiters = (entry: Entry, exit: Exit.Exit<any, any>): void => {
    if (entry.waiters.size === 0) return
    const waiters = Array.from(entry.waiters)
    entry.waiters.clear()
    for (const waiter of waiters) waiter.resume(exit)
  }
  /** A settle or a stored write: patches held after success are confirmed and go. */
  const store = (entry: Entry, result: Settled): void => {
    entry.result = result
    entry.settledAt = now()
    entry.invalidated = false
    entry.restarts = 0
    entry.interval = undefined
    entry.hydrated = false
    if (entry.patches.length > 0) entry.patches = entry.patches.filter((patch) => patch.live)
    scheduleInterval(entry)
  }
  /**
   * A fetch ended with nothing to store and nothing to restart it: the entry keeps its previous state, its
   * freshness included. Only a defect marks the previous Success stale.
   */
  const revert = (entry: Entry): void => {
    resumeWaiters(entry, Exit.interrupt())
    emit(entry)
    rearmInterval(entry)
    afterQuiet(entry)
  }
  const onFetchExit = (entry: Entry, fetch: FetchRec, exit: Exit.Exit<any, any>): void => {
    if (entry.fetch !== fetch || disposed) return
    entry.fetch = undefined
    const previous = entry.result
    const waiterExit = callerExit(exit)
    let defect: Cause.Cause<never> | undefined
    let stored = false
    if (exit._tag === "Success") {
      store(entry, AsyncResult.success(exit.value, { timestamp: now() }))
      stored = true
    } else if (Cause.hasDies(exit.cause)) {
      // Never stored: the previous state stays, marked stale, so a remount fetches fresh.
      defect = diesOnly(exit.cause)
      if (previous !== undefined) entry.invalidated = true
    } else if (Cause.hasFails(exit.cause)) {
      const previousSuccess = previous === undefined
        ? Option.none<AsyncResult.Success<any, any>>()
        : previous._tag === "Success"
        ? Option.some(previous)
        : previous.previousSuccess
      // An unwatched entry never holds a Failure with no previous Success, except on the server.
      if (entry.watchers.size > 0 || settleOnce || Option.isSome(previousSuccess)) {
        store(entry, AsyncResult.failure(failsOnly(exit.cause), { previousSuccess }))
        stored = true
      }
    }
    // Otherwise interrupted, such as by the fetcher itself: a revert, never a Failure.
    resumeWaiters(entry, waiterExit)
    if (defect !== undefined) {
      for (const watcher of Array.from(entry.watchers)) {
        if (watcher.active) watcher.onDefect?.(defect)
      }
    }
    emit(entry)
    if (!stored) rearmInterval(entry)
    afterQuiet(entry)
  }
  /** The dropped fetch restarts under a surviving build, or the entry reverts. */
  const restartOrRevert = (entry: Entry, dropped: FetchRec, fallback: Build | undefined): void => {
    const next = survivingBuild(entry) ?? fallback
    if (next !== undefined) restartFetch(entry, dropped, next)
    else revert(entry)
  }
  function buildClosed(build: Build): void {
    attached.delete(build)
    if (disposed) return
    for (const entry of allEntries()) {
      const fetch = entry.fetch
      if (fetch === undefined || fetch.build !== build) continue
      dropFetch(entry, fetch)
      restartOrRevert(entry, fetch, undefined)
    }
    for (const shared of Array.from(sharedFetches)) {
      if (shared.build !== build) continue
      let next: Build | undefined
      for (const caller of shared.callers) {
        if (!caller.build.closed) {
          next = caller.build
          break
        }
      }
      if (next === undefined) {
        endShared(shared, Exit.interrupt())
      } else {
        shared.build = next
        runShared(shared, true)
      }
    }
  }

  // -- caller-only fetches ----------------------------------------------------
  /**
   * Like a stored fetch, a caller-only one starts only once what it replaces has finished its cleanup: the stored
   * fetch it was converted from, or its own fetch under a build that closed.
   */
  const runShared = (shared: Shared, restart: boolean): void => {
    emitFetch(shared.entry, "get", restart, false)
    const build = shared.build
    const previous: Array<Fiber.Fiber<any, any>> = []
    const stored = draining.get(drainKey(shared.entry))
    if (stored !== undefined) previous.push(stored)
    const replaced = shared.fiber
    if (replaced !== undefined) {
      // Cleared first, so the replaced fiber's exit doesn't end the callers' fetch.
      shared.fiber = undefined
      replaced.interruptUnsafe()
      previous.push(replaced)
    }
    const fiber = runFork(Effect.andThen(
      previous.length === 0 ? Effect.yieldNow : Effect.uninterruptible(Fiber.awaitAll(previous)),
      Effect.suspend(() => build.fetcher(shared.entry.args))
    ))
    shared.fiber = fiber
    fetchFibers.add(fiber)
    build.fibers.add(fiber)
    fiber.addObserver((exit) => {
      fetchFibers.delete(fiber)
      build.fibers.delete(fiber)
      if (shared.fiber === fiber && !disposed) endShared(shared, exit)
    })
  }
  /** Hands the exit to the callers. Nothing is stored and the entry doesn't change. */
  const endShared = (shared: Shared, exit: Exit.Exit<any, any>): void => {
    sharedFetches.delete(shared)
    if (shared.entry.shared === shared) shared.entry.shared = undefined
    const fiber = shared.fiber
    shared.fiber = undefined
    if (exit._tag === "Failure" && fiber !== undefined) fiber.interruptUnsafe()
    const callers = Array.from(shared.callers)
    shared.callers.clear()
    const out = callerExit(exit)
    for (const caller of callers) caller.resume(out)
  }
  const startShared = (entry: Entry, build: Build, callers: Iterable<Waiter>, restart: boolean): Shared => {
    const shared: Shared = { entry, build, callers: new Set(), fiber: undefined }
    for (const caller of callers) {
      caller.shared = shared
      shared.callers.add(caller)
    }
    entry.shared = shared
    sharedFetches.add(shared)
    runShared(shared, restart)
    return shared
  }
  /** A caller leaves: the fetch lives while it has callers. */
  const leave = (entry: Entry, waiter: Waiter): void => {
    const shared = waiter.shared
    if (shared === undefined) {
      entry.waiters.delete(waiter)
    } else if (shared.callers.delete(waiter) && shared.callers.size === 0) {
      endShared(shared, Exit.interrupt())
    }
    afterQuiet(entry)
  }

  // -- watch, peek, get, prefetch ---------------------------------------------
  const watch: CacheInternals["watch"] = (def, args, fetcher, onChange, onDefect, watchOptions) => {
    const entry = ensureEntry(register(def), args)
    const build = buildOf(fetcher)
    const first = entry.watchers.size === 0
    const windowed = inWindow(entry)
    if (holds > 0) {
      // Decided at release. The window is read now, as the decision would have been.
      held.add(entry)
    } else if (first && isStale(entry) && !windowed) {
      // Only the zero-to-one transition is a fetch trigger: a joining watcher never refetches. Inside the
      // fetch-free window a hydrated entry isn't fetched.
      ensureFetch(entry, "watch", build)
    }
    const patched = watchOptions?.patched === true
    // A bare Failure that the last watcher leaving would drop is withheld until release, which drops it if no
    // watcher that has seen it survives, so the order of releases and registrations never shows it.
    const provisional = holds > 0 && isBareFailure(entry.result) && !settleOnce && !windowed ? entry.result : undefined
    const withheld = (): boolean => watcher.provisional !== undefined && watcher.provisional === entry.result
    // What it would read had the Failure already been dropped.
    const provisionalView = (): AsyncResult.AsyncResult<any, any> => AsyncResult.initial(entry.fetch !== undefined)
    const current = provisional !== undefined
      ? { result: provisionalView(), patched: false }
      : patched
      ? patchedViewOf(entry, view(entry))
      : { result: view(entry), patched: false }
    const watcher: Watcher = {
      onChange,
      onDefect,
      build,
      patched,
      generation: holds > 0 ? generation : -1,
      windowed,
      provisional,
      last: current.result,
      lastPatched: current.patched,
      active: true
    }
    entry.watchers.add(watcher)
    cancelIdle(entry)
    if (first && holds === 0) scheduleInterval(entry)
    return {
      logKey: () => logKeyOf(entry),
      current: () => withheld() ? provisionalView() : view(entry),
      patchedView: () => withheld() ? { result: provisionalView(), patched: false } : patchedViewOf(entry, view(entry)),
      unregister: () => {
        if (!watcher.active) return
        watcher.active = false
        entry.watchers.delete(watcher)
        if (entry.watchers.size > 0) return
        stopInterval(entry)
        if (isBareFailure(entry.result) && !settleOnce && !inWindow(entry)) entry.result = undefined
        afterQuiet(entry)
      }
    }
  }

  // -- hold -------------------------------------------------------------------
  let holds = 0
  // Raised when a hold begins with none open. A watcher at this generation or later registered during it.
  let generation = 0
  // Each entry a watcher registered on during the hold.
  const held = new Set<Entry>()
  const hold: CacheInternals["hold"] = () => {
    if (holds++ === 0) generation++
    const since = generation
    let released = false
    return () => {
      if (released) return
      released = true
      if (holds > 1) {
        holds--
        return
      }
      // Still held while deciding: a fetch started here can reach a watcher whose handler registers another,
      // which is decided in the next round, as part of this hold.
      while (held.size > 0) {
        const entries = Array.from(held)
        held.clear()
        for (const entry of entries) {
          if (entry.removed || entry.watchers.size === 0) continue
          let build: Build | undefined
          let fresh = true
          // Only the watchers that survive count: one that registered inside the window and left is gone.
          let windowed = false
          let withheld = false
          let seen = false
          for (const watcher of entry.watchers) {
            if (watcher.generation < since) fresh = false
            else if (watcher.windowed) windowed = true
            if (watcher.provisional !== undefined && watcher.provisional === entry.result) withheld = true
            else seen = true
            watcher.provisional = undefined
            if (build === undefined && !watcher.build.closed) build = watcher.build
          }
          if (withheld && !seen) {
            // No watcher that has seen the Failure survived: it goes, as when the last watcher leaves first.
            entry.result = undefined
            for (const watcher of entry.watchers) {
              watcher.last = AsyncResult.initial()
              watcher.lastPatched = false
            }
          }
          if (fresh) {
            if (!windowed && build !== undefined && isStale(entry)) ensureFetch(entry, "watch", build)
            scheduleInterval(entry)
          }
          // Otherwise the withheld Failure is delivered, to the watchers that haven't seen it.
          if (withheld && seen) emit(entry)
        }
      }
      holds--
    }
  }

  const peek: CacheInternals["peek"] = (def, args) => {
    const registered = register(def)
    const entry = lookup(registered, registered.argsKey(args))
    return entry === undefined ? AsyncResult.initial() : view(entry)
  }

  /** Waits for a caller-only fetch, joining the one in flight. */
  const getShared = (entry: Entry, build: Build): Effect.Effect<any, any> =>
    Effect.callback<any, any>((resume) => {
      const waiter: Waiter = { build, resume, shared: undefined }
      if (entry.shared === undefined) {
        startShared(entry, build, [waiter], false)
      } else {
        waiter.shared = entry.shared
        entry.shared.callers.add(waiter)
      }
      return Effect.sync(() => leave(entry, waiter))
    })

  /** Waits for the stored fetch, starting one when none is in flight. */
  const getStored = (entry: Entry, build: Build): Effect.Effect<any, any> =>
    Effect.callback<any, any>((resume) => {
      const waiter: Waiter = { build, resume, shared: undefined }
      entry.waiters.add(waiter)
      cancelIdle(entry)
      ensureFetch(entry, "get", build)
      return Effect.sync(() => leave(entry, waiter))
    })

  // The order of checks: own target, hydration window, live patch, staleness.
  const get: CacheInternals["get"] = (def, args, fetcher, run) =>
    Effect.suspend((): Effect.Effect<any, any> => {
      if (disposed) return Effect.interrupt
      const registered = register(def)
      const argsKey = registered.argsKey(args)
      // A started run reading back an entry it invalidates calls the fetcher itself: never from the store, never
      // joined and never stored.
      if (run !== undefined && run.isStarted() && run.invalidates(registered, argsKey)) {
        const existing = lookup(registered, argsKey)
        if (existing !== undefined) {
          resetIdle(existing)
          emitFetch(existing, "get", false, false)
        } else if (fetchListeners.size > 0) {
          const event: FetchEvent = {
            read: registered.name,
            logKey: registered.logKey(args, argsKey),
            trigger: "get",
            restart: false,
            inWindow: false,
            stored: false
          }
          for (const listener of Array.from(fetchListeners)) {
            try {
              listener(event)
            } catch {
              // A listener can't change what the cache does.
            }
          }
        }
        return buildOf(fetcher).fetcher(args)
      }
      const entry = ensureEntry(registered, args, argsKey)
      const result = entry.result
      if (result !== undefined && (inWindow(entry) || settleOnce)) {
        resetIdle(entry)
        return settledEffect(result)
      }
      const build = buildOf(fetcher)
      if (hasLive(entry)) {
        resetIdle(entry)
        // A live patch only registers over a Success, and no stored fetch runs under it.
        if (result !== undefined && result._tag === "Success" && !isStale(entry)) return Effect.succeed(result.value)
        return getShared(entry, build)
      }
      if (result !== undefined && result._tag === "Success" && !isStale(entry)) {
        resetIdle(entry)
        return Effect.succeed(result.value)
      }
      return getStored(entry, build)
    })

  const prefetch: CacheInternals["prefetch"] = (def, args, fetcher) => {
    if (disposed) return
    const entry = ensureEntry(register(def), args)
    // Nothing under a live patch.
    if (hasLive(entry)) return
    if (inWindow(entry) || !isStale(entry)) return resetIdle(entry)
    ensureFetch(entry, "prefetch", buildOf(fetcher))
    afterQuiet(entry)
  }

  // -- invalidation -----------------------------------------------------------
  /** Naming a read registers it, so its hydrated entries are decoded and matched exactly. */
  const registerTargets = (targets: ReadonlyArray<Target>): void => {
    for (const target of targets) {
      if (isRead(target)) register(defOf(target))
      else if (target._tag === "Entry") register(defOf(target.read))
    }
  }
  /** Target resolution, written over the predicate: every entry it hits. A tag drops every raw entry. */
  const resolve = (targets: Targets): Set<Entry> => {
    const out = new Set<Entry>()
    for (const entry of allEntries()) {
      if (targetsHit(targets, entry.def.name, entry.def.tags, entry.argsKey)) out.add(entry)
    }
    if (targets.tags.size > 0) raw.clear()
    return out
  }
  const invalidateEntry = (entry: Entry): void => {
    entry.touched = ++seq
    // A never-fetched entry is a no-op.
    if (entry.result === undefined && entry.fetch === undefined) return
    if (entry.result !== undefined) entry.invalidated = true
    // Under a live patch the refetch waits for the last live owner.
    if (hasLive(entry)) {
      entry.deferred ??= "invalidation"
      return
    }
    // A refetch held back by a patch keeps the trigger it was held with.
    const trigger = entry.deferred ?? "invalidation"
    entry.deferred = undefined
    const fetch = entry.fetch
    if (fetch !== undefined) {
      // In flight: interrupted and restarted, watched or not. A prefetch restarts under its own build.
      dropFetch(entry, fetch)
      return restartOrRevert(entry, fetch, fetch.build.closed ? undefined : fetch.build)
    }
    if (entry.watchers.size > 0) {
      const build = survivingBuild(entry)
      if (build !== undefined) ensureFetch(entry, trigger, build)
    }
  }
  const invalidate: CacheInternals["invalidate"] = (targets, invalidateOptions) => {
    if (disposed) return
    registerTargets(targets)
    if (settleOnce) {
      if (invalidateOptions?.byHand === true) {
        const named = targets.find((target) => isRead(target) || target._tag === "Entry")
        const read = named === undefined
          ? undefined
          : isRead(named)
          ? defOf(named).name
          : defOf((named as EntryTarget).read).name
        report(
          new InvalidateIgnored({
            read,
            message: "[Loader] invalidate" + (read === undefined ? "" : " of " + quote(read)) +
              " was called on a per-request server cache, where it does nothing."
          })
        )
      }
      return
    }
    for (const entry of resolve(compileTargets(targets))) invalidateEntry(entry)
  }

  // -- runs, patches and writes -----------------------------------------------
  /** The check made when a run's patches stop being live on an entry: a refetch that was held back. */
  const settleRunEntry = (entry: Entry): void => {
    if (entry.removed) return
    if (!hasLive(entry)) {
      // A caller-only fetch in flight finishes for its callers. Later `get`s don't join it.
      entry.shared = undefined
      const deferred = entry.deferred
      entry.deferred = undefined
      if (entry.fetch === undefined && entry.watchers.size > 0) {
        if (isStale(entry) || (intervalElapsed(entry) && !paused())) {
          const build = survivingBuild(entry)
          if (build !== undefined) ensureFetch(entry, deferred ?? "invalidation", build)
        } else if (entry.intervalDue !== undefined && entry.intervalCancel === undefined && !paused()) {
          armInterval(entry)
        }
      }
    }
    emit(entry)
    afterQuiet(entry)
  }
  /** `Equal.equals`, true when it throws: a check that only reports never fails a run. */
  const equalsOrTrue = (a: unknown, b: unknown): boolean => {
    try {
      return Equal.equals(a, b)
    } catch {
      return true
    }
  }
  const isValidSuccess = (entry: Entry, value: unknown): boolean => {
    try {
      return entry.def.codec().isSuccess(value)
    } catch {
      return true
    }
  }
  const storeWrite = (entry: Entry, value: unknown, fresh: boolean): void => {
    const fetch = entry.fetch
    store(entry, AsyncResult.success(value, { timestamp: now() }))
    if (!fresh) entry.invalidated = true
    // A fetch that began before the write would overwrite it with older data.
    if (fetch !== undefined) {
      dropFetch(entry, fetch)
      restartOrRevert(entry, fetch, fetch.build.closed ? undefined : fetch.build)
    }
    if (entry.idle !== undefined) startIdle(entry)
    emit(entry)
    afterQuiet(entry)
  }
  /** Returns the entries stored fresh, and adds those whose write was skipped to `skipped`. */
  const applyWrites = (run: Run, writes: ReadonlyArray<Write>, skipped: Set<Entry>): Set<Entry> => {
    const fresh = new Set<Entry>()
    for (const set of writes) {
      const def = register(defOf(set.read))
      const argsKey = argsKeyOf(set)
      const existing = lookup(def, argsKey)
      if (
        existing !== undefined && existing.born <= run.startSeq && !targetsHit(run.targets, def.name, def.tags, argsKey)
      ) {
        const logKey = logKeyOf(existing)
        report(
          new UncoveredWrite({
            read: def.name,
            logKey,
            command: run.command,
            message: "[Loader] " + quote(run.command) + " wrote " + quote(def.name) + " at " + logKey +
              ", which neither its invalidates nor a patch covers. The write applies."
          })
        )
      }
      const entry = existing ?? ensureEntry(def, set.args, argsKey)
      // A run issued later has already reached the entry: this answer may be the older one, so it isn't stored,
      // and the entry is invalidated.
      if (entry.reached > run.issue) {
        skipped.add(entry)
        continue
      }
      entry.reached = run.issue
      if (entry.patches.some((patch) => patch.live && patch.run !== run)) {
        // Under another run's live patch it isn't stored, and the entry goes stale.
        entry.touched = ++seq
        if (entry.result !== undefined) entry.invalidated = true
        entry.deferred ??= "invalidation"
        continue
      }
      const isFresh = entry.touched <= run.startSeq
      entry.touched = ++seq
      storeWrite(entry, set.value, isFresh)
      if (isFresh) fresh.add(entry)
    }
    return fresh
  }
  const beginRun: CacheInternals["beginRun"] = (runOptions) => {
    const optimistic = runOptions.optimistic ?? []
    registerTargets(runOptions.invalidates)
    const targets = compileTargets(runOptions.invalidates, optimistic)
    // A patch over an entry with no Success isn't registered, silently.
    const planned: Array<{ readonly entry: Entry; readonly patch: Patch }> = []
    for (const patch of optimistic) {
      const def = register(defOf(patch.read))
      if (patch._tag === "Patch") {
        const entry = lookup(def, argsKeyOf(patch))
        if (entry !== undefined && entry.result?._tag === "Success") planned.push({ entry, patch })
      } else {
        for (const entry of index.get(def.name)?.values() ?? []) {
          if (entry.result?._tag === "Success") planned.push({ entry, patch })
        }
      }
    }
    // First application is all-or-nothing: a throw here leaves nothing registered.
    const values = new Map<Entry, unknown>()
    const before = new Map<Entry, { readonly encoded: unknown } | undefined>()
    const invalid = new Set<Entry>()
    for (const { entry, patch } of planned) {
      if (!values.has(entry)) {
        const server = (entry.result as AsyncResult.Success<any, any>).value
        // Materialized: an encoding can share parts with the value, such as under `Schema.Any`.
        before.set(entry, materializedEncoding(() => entry.def.codec().encodeSuccess(server)))
        values.set(
          entry,
          (patchedViewOf(entry, entry.result!) as { readonly result: AsyncResult.Success<any, any> })
            .result.value
        )
      }
      const next = applyPatch(patch, entry.def.name, entry.argsKey, entry.args, values.get(entry))
      values.set(entry, next)
      if (!isValidSuccess(entry, next)) invalid.add(entry)
    }
    const run: Run = {
      command: runOptions.command,
      issue: ++issued,
      targets,
      startSeq: seq,
      started: false,
      done: false,
      entries: new Set()
    }
    for (const { entry, patch } of planned) {
      entry.patches.push({ run, patch, live: true })
      run.entries.add(entry)
    }
    for (const entry of run.entries) {
      const logKey = logKeyOf(entry)
      if (invalid.has(entry)) {
        report(
          new PatchInvalid({
            read: entry.def.name,
            logKey,
            command: run.command,
            message: "[Loader] a patch of " + quote(run.command) + " on " + quote(entry.def.name) + " at " + logKey +
              " made a value the read's success Schema rejects. It is used as is."
          })
        )
      }
      const encoded = before.get(entry)
      if (encoded !== undefined && entry.result?._tag === "Success") {
        const value = entry.result.value
        const after = materializedEncoding(() => entry.def.codec().encodeSuccess(value))
        if (after !== undefined && !equalsOrTrue(encoded.encoded, after.encoded)) {
          report(
            new PatchMutated({
              read: entry.def.name,
              logKey,
              command: run.command,
              message: "[Loader] a patch of " + quote(run.command) + " on " + quote(entry.def.name) + " at " +
                logKey + " changed the value it was given. A patch must return a new value."
            })
          )
        }
      }
      // No stored fetch runs on an entry with a live patch. `get` callers waiting on it get a caller-only fetch.
      const fetch = entry.fetch
      if (fetch !== undefined) {
        dropFetch(entry, fetch)
        entry.deferred ??= fetch.trigger
        if (entry.waiters.size > 0) {
          const waiters = Array.from(entry.waiters)
          entry.waiters.clear()
          const build = waiters.find((waiter) => !waiter.build.closed)?.build
          if (build === undefined) {
            for (const waiter of waiters) waiter.resume(Exit.interrupt())
          } else {
            startShared(entry, build, waiters, true)
          }
        }
      }
      cancelIdle(entry)
      emit(entry)
    }
    const handle: RunHandle = {
      command: run.command,
      run: (body, writes) => runBody(handle, body, writes),
      invalidates: (def, argsKey) => targetsHit(targets, def.name, def.tags, argsKey),
      start: () => {
        if (run.started || run.done) return
        run.started = true
        run.startSeq = seq
      },
      isStarted: () => run.started && !run.done,
      finish: (exit) => {
        if (run.done) return
        run.done = true
        // A run may outlive the cache.
        if (disposed) return
        if (exit._tag === "Success") {
          for (const entry of run.entries) {
            for (const patch of entry.patches) if (patch.run === run) patch.live = false
          }
          const skipped = new Set<Entry>()
          const fresh = applyWrites(run, exit.writes, skipped)
          if (!settleOnce) {
            const hit = resolve(targets)
            for (const entry of skipped) hit.add(entry)
            for (const entry of hit) {
              // Only a write stored fresh is left out of its run's own invalidation.
              if (fresh.has(entry)) continue
              if (run.issue > entry.reached) entry.reached = run.issue
              invalidateEntry(entry)
            }
          }
        } else {
          for (const entry of run.entries) entry.patches = entry.patches.filter((patch) => patch.run !== run)
          if (exit._tag === "Failure" && !settleOnce) {
            // A failed run may still have landed its server write, so an older answer is no longer the latest.
            for (const entry of resolve(targets)) {
              if (run.issue > entry.reached) entry.reached = run.issue
              invalidateEntry(entry)
            }
          }
        }
        for (const entry of run.entries) settleRunEntry(entry)
      }
    }
    return handle
  }

  // -- hydration --------------------------------------------------------------
  /** Decodes the raw hydrated entries of a read that just registered. */
  function decodeRaw(def: ReadDef): void {
    const byKey = raw.get(def.name)
    if (byKey === undefined) return
    raw.delete(def.name)
    for (const [wireKey, tuple] of byKey) {
      let args: unknown
      let argsKey: string
      try {
        args = def.codec().decodeArgs(wireKey)
        argsKey = def.argsKey(args)
      } catch {
        report(
          new HydrationDecodeFailed({
            read: def.name,
            part: "args",
            logKey: undefined,
            message: "[Loader] the args of a hydrated entry of " + quote(def.name) +
              " failed to decode. The entry is cold."
          })
        )
        continue
      }
      const existing = lookup(def, argsKey)
      if (existing?.result !== undefined) continue
      let result: Settled
      try {
        const codec = def.codec()
        result = tuple[1] === 0
          ? AsyncResult.success(codec.decodeSuccess(tuple[2]), { timestamp: tuple[3] })
          : AsyncResult.failure(
            Cause.fromReasons(tuple[2].map((error) => Cause.makeFailReason(codec.decodeError(error))))
          )
      } catch {
        const logKey = def.logKey(args, argsKey)
        report(
          new HydrationDecodeFailed({
            read: def.name,
            part: "value",
            logKey,
            message: "[Loader] a hydrated entry of " + quote(def.name) + " at " + logKey +
              " failed to decode. The entry is cold."
          })
        )
        continue
      }
      const entry = existing ?? ensureEntry(def, args, argsKey)
      entry.result = result
      // It ages from the client's mount. Under `static` its age is unknown: stale unless never stale by age.
      entry.settledAt = hydratedAt
      entry.invalidated = hydratedStatic && def.staleMs !== Infinity
      entry.hydrated = windowOpen
      afterQuiet(entry)
    }
  }
  const hydrate: CacheInternals["hydrate"] = (input, hydrateOptions) => {
    if (disposed) return
    const parsed = parseRaw(input)
    if (parsed === undefined) {
      report(new HydrationMalformed({ message: "[Loader] the ~loader state isn't the tuple shape. It was ignored." }))
      return
    }
    hydratedAt = now()
    hydratedStatic = hydrateOptions?.static === true
    windowOpen = !hydratedStatic
    raw = parsed
    // Reads the cache has already seen decode at once.
    for (const name of Array.from(raw.keys())) {
      const def = reads.get(name)
      if (def !== undefined) decodeRaw(def)
    }
  }
  const closeWindow = (): void => {
    if (!windowOpen) return
    windowOpen = false
    for (const [name, byKey] of raw) {
      for (const [argsKey, tuple] of byKey) if (tuple[1] === 1) byKey.delete(argsKey)
      if (byKey.size === 0) raw.delete(name)
    }
    for (const entry of allEntries()) {
      if (!entry.hydrated) continue
      entry.hydrated = false
      if (entry.watchers.size === 0 && isBareFailure(entry.result)) {
        entry.result = undefined
        afterQuiet(entry)
      }
    }
  }
  const dehydrate: CacheInternals["dehydrate"] = () => {
    const out: Dehydrated = {}
    for (const entry of allEntries()) {
      if (entry.fetch !== undefined) dropFetch(entry, entry.fetch)
      resumeWaiters(entry, Exit.interrupt())
      if (entry.shared !== undefined) endShared(entry.shared, Exit.interrupt())
      const result = entry.result
      if (result === undefined) {
        afterQuiet(entry)
        continue
      }
      try {
        const codec = entry.def.codec()
        const tuple: RawTuple = result._tag === "Success"
          ? [entry.argsKey, 0, codec.encodeSuccess(result.value), result.timestamp]
          : [
            entry.argsKey,
            1,
            result.cause.reasons.filter(Cause.isFailReason).map((reason) => codec.encodeError(reason.error)),
            entry.settledAt
          ]
        ;(out[entry.def.name] ??= []).push(tuple)
      } catch {
        const logKey = logKeyOf(entry)
        report(
          new EncodeFailed({
            read: entry.def.name,
            logKey,
            message: "[Loader] the entry of " + quote(entry.def.name) + " at " + logKey +
              " failed to encode. It was left out, and the client fetches it."
          })
        )
      }
    }
    return out
  }
  const checkWire: CacheInternals["checkWire"] = (input) => {
    const parsed = parseRaw(input)
    if (parsed === undefined) return ["the ~loader state isn't the tuple shape"]
    const out: Array<string> = []
    for (const [name, byKey] of parsed) {
      const def = reads.get(name)
      if (def === undefined) {
        out.push("the read " + quote(name) + " shipped entries, and this cache doesn't know it")
        continue
      }
      const codec = def.codec()
      for (const [wireKey, tuple] of byKey) {
        let args: unknown
        let logKey: string
        try {
          args = codec.decodeArgs(wireKey)
          const argsKey = def.argsKey(args)
          logKey = def.logKey(args, argsKey)
          if (argsKey !== wireKey) {
            out.push("an entry of " + quote(name) + " at " + logKey + " has args that key differently once decoded")
            continue
          }
        } catch {
          out.push("the args of an entry of " + quote(name) + " failed to decode")
          continue
        }
        try {
          const again = tuple[1] === 0
            ? codec.encodeSuccess(codec.decodeSuccess(tuple[2]))
            : tuple[2].map((error) => codec.encodeError(codec.decodeError(error)))
          if (JSON.stringify(again) !== JSON.stringify(tuple[2])) {
            out.push("the entry of " + quote(name) + " at " + logKey + " encodes differently once decoded")
          }
        } catch {
          out.push("the entry of " + quote(name) + " at " + logKey + " failed to decode or encode again")
        }
      }
    }
    return out
  }
  const seed: CacheInternals["seed"] = (snapshot) => {
    const data = snapshotData(snapshot)
    // A per-request cache never refetches a settled entry, so a seed there would be final.
    if (disposed || settleOnce || data === undefined) return false
    // Never from a value that may never have been saved.
    if (data.patched || data.argsKey === undefined || data.result?._tag !== "Success") return false
    const def = register(data.def)
    const existing = lookup(def, data.argsKey)
    if (existing?.result !== undefined) return false
    const entry = existing ?? ensureEntry(def, data.args, data.argsKey)
    entry.result = AsyncResult.success(data.result.value, { timestamp: data.result.timestamp })
    entry.settledAt = now()
    entry.invalidated = true
    afterQuiet(entry)
    return true
  }

  // -- host signals -----------------------------------------------------------
  /** One synchronous pass over watched entries, on a false-to-true edge with both signals then true. */
  const edgePass = (trigger: "visibility" | "connectivity"): void => {
    for (const entry of allEntries()) {
      if (entry.watchers.size === 0 || entry.fetch !== undefined) continue
      if (isStale(entry) || intervalElapsed(entry)) {
        const build = survivingBuild(entry)
        if (build !== undefined) ensureFetch(entry, trigger, build)
      } else if (entry.intervalDue !== undefined && entry.intervalCancel === undefined) {
        // Not due yet: it sleeps for the remainder.
        armInterval(entry)
      }
    }
  }
  const listen = (signal: Signal, trigger: "visibility" | "connectivity"): () => void => {
    let last = signal.get()
    return signal.subscribe((value) => {
      const was = last
      last = value
      if (disposed || settleOnce || was || !value || paused()) return
      edgePass(trigger)
    })
  }
  const offVisibility = listen(visibility, "visibility")
  const offConnectivity = listen(connectivity, "connectivity")

  // -- the service ------------------------------------------------------------
  const self: CacheInternals = {
    [CacheTypeId]: CacheTypeId,
    register: (def) => {
      register(def)
    },
    watch,
    hold,
    peek,
    get,
    prefetch,
    invalidate,
    beginRun,
    dehydrate,
    hydrate,
    closeWindow,
    isWindowOpen: () => windowOpen,
    seed,
    onFetch: (listener) => {
      fetchListeners.add(listener)
      return () => {
        fetchListeners.delete(listener)
      }
    },
    onFetchEnd: (listener) => {
      fetchEndListeners.add(listener)
      return () => {
        fetchEndListeners.delete(listener)
      }
    },
    misses: () => {
      const out: Array<{ readonly read: string; readonly logKey: string }> = []
      for (const entry of allEntries()) {
        if (entry.result !== undefined) continue
        const missed = entry.fetch !== undefined ||
          (!fetches && (entry.watchers.size > 0 || entry.waiters.size > 0))
        if (missed) out.push({ read: entry.def.name, logKey: logKeyOf(entry) })
      }
      return out
    },
    checkWire,
    pending: () => {
      const out: Array<PendingFetch> = []
      for (const entry of allEntries()) {
        const trigger = entry.fetch?.trigger ?? entry.deferred
        if (trigger === undefined) continue
        out.push({
          read: entry.def.name,
          logKey: logKeyOf(entry),
          status: entry.fetch !== undefined ? "running" : "held",
          trigger
        })
      }
      return out
    },
    inspect: (def, args) => {
      const registered = register(def)
      const entry = lookup(registered, registered.argsKey(args))
      if (entry === undefined) return undefined
      const stored = view(entry)
      const patched = patchedViewOf(entry, stored)
      return {
        stored,
        view: patched.result,
        patched: patched.patched,
        stale: isStale(entry),
        watchers: entry.watchers.size,
        fetch: entry.fetch !== undefined ? "running" : entry.deferred !== undefined ? "held" : "none",
        trigger: entry.fetch?.trigger ?? entry.deferred,
        patches: {
          live: entry.patches.filter((patch) => patch.live).length,
          held: entry.patches.filter((patch) => !patch.live).length
        }
      }
    }
  }

  Effect.runSync(Scope.addFinalizer(
    options.scope,
    Effect.suspend(() => {
      disposed = true
      offVisibility()
      offConnectivity()
      for (const build of attached) build.listeners.delete(buildClosed)
      attached.clear()
      for (const entry of allEntries()) {
        if (entry.fetch !== undefined) dropFetch(entry, entry.fetch)
        resumeWaiters(entry, Exit.interrupt())
      }
      for (const shared of Array.from(sharedFetches)) endShared(shared, Exit.interrupt())
      for (const fiber of Array.from(timers)) fiber.interruptUnsafe()
      timers.clear()
      // Disposal ends when every fetch has finished its cleanup.
      return Fiber.interruptAll(fetchFibers)
    })
  ))

  return self
}
