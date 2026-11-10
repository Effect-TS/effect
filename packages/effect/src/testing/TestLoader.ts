/**
 * A test harness for `effect/reactivity/Loader` on its own: the public cache
 * Layer, with host signals a test can set, a record of every fetch that
 * started, a read-only view of an entry, and a collector for the problems the
 * cache reports.
 *
 * Time is the `TestClock`'s: stale times, idle times and intervals all run on
 * the `Clock`, so `TestClock.adjust` drives them.
 *
 * **Example** (Asserting on what the cache fetched)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema } from "effect"
 * import { Loader } from "effect/reactivity"
 * import { TestLoader } from "effect/testing"
 *
 * class GetUser extends Loader.Service<GetUser>()("users/GetUser", {
 *   args: { id: Schema.String },
 *   success: Schema.String,
 *   error: Schema.Never,
 *   staleTime: "30 seconds"
 * }, Effect.succeed(({ id }) => Effect.succeed(`user-${id}`))) {}
 *
 * const program = Effect.gen(function*() {
 *   yield* GetUser.get({ id: "1" })
 *   yield* GetUser.get({ id: "1" })
 *   return yield* TestLoader.fetches
 * }).pipe(Effect.provide(Layer.merge(GetUser.layer, TestLoader.layer())))
 *
 * await Effect.runPromise(program) // => [{ read: "users/GetUser", logKey: `{"id":"1"}`, trigger: "get", restart: false }]
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import type * as AsyncResult from "../reactivity/AsyncResult.ts"
import * as internal from "../reactivity/internal/loader.ts"
import * as Loader from "../reactivity/Loader.ts"

/**
 * A fetch the cache started: the read's name, the entry's log key, the
 * trigger, and whether it replaced an interrupted fetch.
 *
 * **Details**
 *
 * The log key is the entry's key with every `Schema.Redacted` argument
 * redacted. A caller that joins a fetch in flight records nothing.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Fetch {
  readonly read: string
  readonly logKey: string
  readonly trigger: Loader.Trigger
  readonly restart: boolean
}

/**
 * A read-only view of one cache entry.
 *
 * **Details**
 *
 * `stored` is the entry's state, `Initial` during a first fetch. `stale` is
 * whether the next trigger would refetch it, `watchers` how many watch it,
 * and `trigger` what started the fetch in flight.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Entry<A, E> {
  readonly stored: AsyncResult.AsyncResult<A, E>
  readonly stale: boolean
  readonly watchers: number
  readonly fetch: "none" | "running"
  readonly trigger: Loader.Trigger | undefined
}

/**
 * The defect a `TestLoader` Scope closes with when the cache reported problems
 * the test didn't take with `expectProblem`.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.3
 */
export class ProblemsError extends Data.TaggedError("ProblemsError")<{
  readonly problems: ReadonlyArray<Loader.Problem.Any>
}> {
  override get message(): string {
    return "The cache reported " + this.problems.length + " problem(s) the test didn't expect:\n" +
      this.problems.map((problem) => "  " + problem._tag + ": " + problem.message).join("\n")
  }
}

/**
 * The `TestLoader` service: the controls and the records of one test cache.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export interface TestLoader {
  /** Sets `Loader.Visibility`. It starts true. */
  readonly setVisible: (visible: boolean) => void
  /** Sets `Loader.Connectivity`. It starts true. */
  readonly setOnline: (online: boolean) => void
  /** Every fetch started so far, in order. */
  readonly fetches: () => ReadonlyArray<Fetch>
  /** The entry of a read and arguments, or `undefined` when the cache has none. */
  readonly entry: <R extends Loader.Read.Any>(
    read: R,
    args: Loader.Read.Args<R>
  ) => Entry<Loader.Read.Success<R>, Loader.Read.Error<R>> | undefined
  /** The problems reported and not yet taken. */
  readonly problems: () => ReadonlyArray<Loader.Problem.Any>
  /** Takes every reported problem with this tag. Throws when there is none. */
  readonly expectProblem: <Tag extends string>(tag: Tag) => ReadonlyArray<
    [Extract<Loader.Problem, { readonly _tag: Tag }>] extends [never] ? Loader.Problem.Any
      : Extract<Loader.Problem, { readonly _tag: Tag }>
  >
}

/**
 * The `TestLoader` service.
 *
 * @stability experimental
 * @category services
 * @since 4.1.3
 */
export const TestLoader: Context.Service<TestLoader, TestLoader> = Context.Service<TestLoader>(
  "effect/testing/TestLoader"
)

/**
 * Layer that provides `Loader.Cache` for a test, together with `TestLoader`.
 *
 * **Details**
 *
 * The cache is the one `Loader.layer` builds, with the same options. Its
 * `Loader.Visibility` and `Loader.Connectivity` are settable and start true,
 * and its problems go to the collector instead of the console.
 *
 * **Gotchas**
 *
 * A reported problem fails the test: the Layer's Scope closes with a
 * `ProblemsError` defect unless `expectProblem` took every problem first.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = (options?: {
  readonly idleTimeToLive?: Duration.Input | undefined
}): Layer.Layer<TestLoader | Loader.Cache> => {
  const cacheLayer = Loader.layer(options)
  return Layer.unwrap(Effect.sync(() => {
    const visibility = internal.makeSignal(true)
    const connectivity = internal.makeSignal(true)
    let problems: Array<Loader.Problem.Any> = []
    const fetches: Array<Fetch> = []
    const harness = Layer.effect(
      TestLoader,
      Effect.gen(function*() {
        const cache = internal.internals(yield* Loader.Cache)
        const off = cache.onFetch((event) => fetches.push(event))
        yield* Effect.addFinalizer(() =>
          Effect.suspend(() => {
            off()
            return problems.length === 0 ? Effect.void : Effect.die(new ProblemsError({ problems }))
          })
        )
        return {
          setVisible: visibility.set,
          setOnline: connectivity.set,
          fetches: () => fetches.slice(),
          entry: (read: Loader.Read.Any, args: unknown) => cache.inspect(internal.defOf(read), args),
          problems: () => problems.slice(),
          expectProblem: (tag: string) => {
            const matched = problems.filter((problem) => problem._tag === tag)
            if (matched.length === 0) {
              throw new Error(
                "[TestLoader] expected a " + tag + " problem, and the cache reported " +
                  (problems.length === 0 ? "none" : problems.map((problem) => problem._tag).join(", "))
              )
            }
            problems = problems.filter((problem) => problem._tag !== tag)
            return matched
          }
        } as unknown as TestLoader
      })
    )
    return Layer.provideMerge(harness, cacheLayer).pipe(
      Layer.provide(Layer.mergeAll(
        Layer.succeed(Loader.Visibility, visibility),
        Layer.succeed(Loader.Connectivity, connectivity),
        Layer.succeed(Loader.Problems, (problem: Loader.Problem.Any) => {
          problems.push(problem)
        })
      ))
    )
  }))
}

/**
 * Sets `Loader.Visibility` for the test cache.
 *
 * **Details**
 *
 * Going from false to true, with the cache online, refetches every watched
 * entry that is stale or whose interval elapsed while it was hidden.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.3
 */
export const setVisible = (visible: boolean): Effect.Effect<void, never, TestLoader> =>
  Effect.map(Effect.service(TestLoader), (loader) => loader.setVisible(visible))

/**
 * Sets `Loader.Connectivity` for the test cache.
 *
 * **Details**
 *
 * Going from false to true, with the cache visible, refetches every watched
 * entry that is stale or whose interval elapsed while it was offline.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.3
 */
export const setOnline = (online: boolean): Effect.Effect<void, never, TestLoader> =>
  Effect.map(Effect.service(TestLoader), (loader) => loader.setOnline(online))

/**
 * Returns every fetch the test cache started so far, in order.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.3
 */
export const fetches: Effect.Effect<ReadonlyArray<Fetch>, never, TestLoader> = Effect.map(
  Effect.service(TestLoader),
  (loader) => loader.fetches()
)

/**
 * Returns a read-only view of one entry, or `undefined` when the cache has no
 * entry for the read and arguments. It doesn't create the entry or keep it
 * alive.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.3
 */
export const entry = <R extends Loader.Read.Any>(
  read: R,
  args: Loader.Read.Args<R>
): Effect.Effect<Entry<Loader.Read.Success<R>, Loader.Read.Error<R>> | undefined, never, TestLoader> =>
  Effect.map(Effect.service(TestLoader), (loader) => loader.entry(read, args))

/**
 * Returns the problems the test cache reported and no `expectProblem` took.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.3
 */
export const problems: Effect.Effect<ReadonlyArray<Loader.Problem.Any>, never, TestLoader> = Effect.map(
  Effect.service(TestLoader),
  (loader) => loader.problems()
)

/**
 * Takes every reported problem with the given tag, so it no longer fails the
 * test, and returns them.
 *
 * **Gotchas**
 *
 * Dies when the cache reported no problem with that tag.
 *
 * @stability experimental
 * @category testing
 * @since 4.1.3
 */
export const expectProblem = <Tag extends string>(tag: Tag): Effect.Effect<
  ReadonlyArray<
    [Extract<Loader.Problem, { readonly _tag: Tag }>] extends [never] ? Loader.Problem.Any
      : Extract<Loader.Problem, { readonly _tag: Tag }>
  >,
  never,
  TestLoader
> => Effect.map(Effect.service(TestLoader), (loader) => loader.expectProblem(tag))
