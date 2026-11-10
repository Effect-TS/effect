/**
 * PROTOTYPE (EFF-3558). A data-loading cache: reads are class services with a
 * Schema'd key, the cache dedupes fetches, tracks staleness, watchers,
 * invalidation, optimistic patches, writes, idle GC, intervals and SSR
 * dehydration.
 *
 * No effect/ui imports and no Reactivity dependency.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Cause from "../Cause.ts"
import * as Clock from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Exit from "../Exit.ts"
import type * as Fiber from "../Fiber.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Queue from "../Queue.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import * as AsyncResult from "./AsyncResult.ts"

// -----------------------------------------------------------------------------
// Keys
// -----------------------------------------------------------------------------

// Copied from Subscription's encodeDep: strings are JSON, everything else is
// its literal, so NaN, Infinity and -0 stay distinct.
const encodeLeaf = (leaf: unknown): string =>
  typeof leaf === "string"
    ? JSON.stringify(leaf)
    : Object.is(leaf, -0)
    ? "-0"
    : typeof leaf === "bigint"
    ? String(leaf) + "n"
    : String(leaf)

const encodeKey = (u: unknown): string => {
  if (Array.isArray(u)) return "[" + u.map(encodeKey).join(",") + "]"
  if (typeof u === "object" && u !== null) {
    const o = u as Record<string, unknown>
    return "{" + Object.keys(o).sort().filter((k) =>
      o[k] !== undefined
    ).map((k) => JSON.stringify(k) + ":" + encodeKey(o[k])).join(",") + "}"
  }
  return encodeLeaf(u)
}

// -----------------------------------------------------------------------------
// Host signals
// -----------------------------------------------------------------------------

/**
 * A boolean with a sync getter and a listener. State, not a pulse.
 *
 * @stability unstable
 * @since 4.1.3
 * @category signals
 */
export interface Signal {
  readonly get: () => boolean
  /** The listener is called with the new value on every change. */
  readonly subscribe: (listener: (value: boolean) => void) => () => void
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category signals
 */
export interface SettableSignal extends Signal {
  readonly set: (value: boolean) => void
}

/**
 * A settable signal, for tests and for host Layers.
 *
 * @stability unstable
 * @since 4.1.3
 * @category signals
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

/**
 * @stability unstable
 * @since 4.1.3
 * @category signals
 */
export const Visibility: Context.Reference<Signal> = Context.Reference<Signal>(
  "effect/reactivity/Loader/Visibility",
  { defaultValue: () => alwaysTrue }
)

/**
 * @stability unstable
 * @since 4.1.3
 * @category signals
 */
export const Connectivity: Context.Reference<Signal> = Context.Reference<Signal>(
  "effect/reactivity/Loader/Connectivity",
  { defaultValue: () => alwaysTrue }
)

// -----------------------------------------------------------------------------
// Definitions and targets
// -----------------------------------------------------------------------------

/**
 * @stability unstable
 * @since 4.1.3
 * @category type IDs
 */
export const TypeId = "~effect/reactivity/Loader"

/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type Fetcher<Args, A, E> = (args: Args) => Effect.Effect<A, E>

/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type RefetchInterval<Args, A, E> =
  | Duration.Input
  | ((
    result: AsyncResult.Success<A, E> | AsyncResult.Failure<A, E>,
    args: Args
  ) => Duration.Input | undefined)

/**
 * The data of a read. Internal: identity of a read is this object, not the
 * class (a user class extends the generated one).
 *
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface ReadInternal<Args = any, A = any, E = any> {
  readonly key: string
  readonly args: Schema.Codec<Args, any>
  readonly success: Schema.Codec<A, any>
  readonly error: Schema.Codec<E, any>
  readonly staleMs: number
  readonly idleMs: number | undefined
  // Loosely typed, and methods (bivariant) below, so a read with `error: Schema.Never` is still an
  // `AnyDefinition`: `any` isn't assignable to `never` in a parameter position.
  readonly refetchInterval: RefetchInterval<any, any, any> | undefined
  readonly tags: ReadonlyArray<string>
  argsKey(args: Args): string
  encodeSuccess(a: A): unknown
  decodeSuccess(u: unknown): A
  encodeError(e: E): unknown
  decodeError(u: unknown): E
}

/**
 * Anything that carries a read's definition. The read class is one, and it is
 * also the "whole read" invalidation target.
 *
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface Definition<Args, A, E> {
  readonly [TypeId]: ReadInternal<Args, A, E>
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type AnyDefinition = Definition<any, any, any>

/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type ArgsOf<R> = R extends Definition<infer Args, infer _A, infer _E> ? Args : never
/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type SuccessOf<R> = R extends Definition<infer _Args, infer A, infer _E> ? A : never
/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type ErrorOf<R> = R extends Definition<infer _Args, infer _A, infer E> ? E : never

/**
 * A declared tag. Listed statically on reads, used as an invalidation target.
 *
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export interface Tag {
  readonly _tag: "Tag"
  readonly name: string
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export const Tag = (name: string): Tag => ({ _tag: "Tag", name })

/**
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export interface EntryTarget {
  readonly _tag: "Entry"
  readonly read: AnyDefinition
  readonly args: unknown
  readonly argsKey: string
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export interface PatchTarget {
  readonly _tag: "Patch"
  readonly read: AnyDefinition
  readonly args: unknown
  readonly argsKey: string
  readonly fn: (value: any) => any
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export interface PatchAllTarget {
  readonly _tag: "PatchAll"
  readonly read: AnyDefinition
  readonly fn: (value: any, args: any) => any
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export interface SetTarget {
  readonly _tag: "Set"
  readonly read: AnyDefinition
  readonly args: unknown
  readonly argsKey: string
  readonly value: unknown
}

/**
 * An invalidation target: a whole read, one entry, or a tag.
 *
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export type Target = AnyDefinition | EntryTarget | Tag

/**
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export type Patch = PatchTarget | PatchAllTarget

/**
 * @stability unstable
 * @since 4.1.3
 * @category targets
 */
export const isRead = (u: unknown): u is AnyDefinition =>
  (typeof u === "function" || (typeof u === "object" && u !== null)) && TypeId in (u as object)

// -----------------------------------------------------------------------------
// Cache: internal interface
// -----------------------------------------------------------------------------

/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type Trigger = "watch" | "get" | "prefetch" | "visibility" | "connectivity" | "interval" | "invalidation"

/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface FetchEvent {
  readonly read: string
  readonly argsKey: string
  readonly trigger: Trigger
  /** True when this start replaces an interrupted fetch (it keeps the trigger). */
  readonly restart: boolean
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface WatchHandle<A, E> {
  readonly argsKey: string
  /** Drops the watcher count synchronously. Idempotent. */
  readonly unregister: () => void
  /** The patched view right now (Initial over a cold entry). */
  readonly current: () => AsyncResult.AsyncResult<A, E>
}

/**
 * An opaque reference to a cache entry, as returned by applyWrites.
 *
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface EntryRef {
  readonly "~effect/reactivity/Loader/EntryRef": never
}

/**
 * The \`state["~loader"]\` shape.
 *
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export type Dehydrated = Record<
  string,
  Array<
    | readonly [argsKey: string, tag: 0, encodedSuccess: unknown, timestamp: number]
    | readonly [argsKey: string, tag: 1, encodedErrors: ReadonlyArray<unknown>, timestamp: number]
  >
>

/**
 * One mutation run: its patches, and what happens at its exit.
 *
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface RunHandle {
  /** What the run's patches imply for invalidation (EFF-3555 #11). */
  readonly implied: ReadonlyArray<Target>
  /** Marks the moment the work really begins (a queued run starts later than it is issued). */
  readonly start: () => void
  /**
   * Marks the exit. "success": writes, then invalidation (declared plus implied,
   * minus fresh writes), patches held until confirmed. "failure" (typed
   * failure, interrupt, defect): patches removed, invalidation applied.
   * "stopped" (before the work began): patches removed, nothing invalidated.
   */
  readonly finish: (options: {
    readonly exit: "success" | "failure" | "stopped"
    readonly invalidates?: ReadonlyArray<Target> | undefined
    readonly writes?: ReadonlyArray<SetTarget> | undefined
  }) => void
}

/**
 * The synchronous internal API of a cache. Not public: for the effect/ui
 * runtime and tests.
 *
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface CacheInternals {
  /** Registers a definition (decodes its hydrated entries). Every other method does this itself. */
  readonly register: (read: AnyDefinition) => void
  /**
   * Registers a watcher. Synchronous: the count rises here, the zero-to-one
   * fetch decision is made here, but the fetcher starts one scheduler step
   * later and \`onChange\` is never called inside this call. \`fetcher\` is the
   * read's service value from the watcher's context; it names the Layer build.
   */
  readonly watch: <Args, A, E>(
    read: Definition<Args, A, E>,
    args: Args,
    fetcher: Fetcher<Args, A, E>,
    onChange: (result: AsyncResult.Success<A, E> | AsyncResult.Failure<A, E>) => void,
    onDefect?: (cause: Cause.Cause<never>) => void
  ) => WatchHandle<A, E>
  /** The patched view. Doesn't create the entry or reset its idle timer. */
  readonly peek: <Args, A, E>(read: Definition<Args, A, E>, args: Args) => AsyncResult.AsyncResult<A, E>
  readonly get: <Args, A, E>(
    read: Definition<Args, A, E>,
    args: Args,
    fetcher: Fetcher<Args, A, E>
  ) => Effect.Effect<A, E>
  readonly prefetch: <Args, A, E>(read: Definition<Args, A, E>, args: Args, fetcher: Fetcher<Args, A, E>) => void
  /** One synchronous batch. */
  readonly applyInvalidation: (
    targets: ReadonlyArray<Target>,
    options?: { readonly exclude?: Iterable<EntryRef> | undefined }
  ) => void
  /** Registers a run's patches at issue. Throws (and registers nothing) if any patch throws. */
  readonly beginRun: (patches?: ReadonlyArray<Patch>) => RunHandle
  /** Stores a successful run's writes. Returns the entries stored fresh. \`run.finish\` calls this itself. */
  readonly applyWrites: (run: RunHandle, sets: ReadonlyArray<SetTarget>) => ReadonlyArray<EntryRef>
  /** Called at every fetch start. */
  readonly onFetch: (listener: (event: FetchEvent) => void) => () => void
  readonly isFetching: () => boolean
  /** Called whenever the number of fetches in flight drops to zero. */
  readonly onIdle: (listener: () => void) => () => void
  readonly awaitIdle: Effect.Effect<void>
  /** Interrupts fetches in flight and pending \`get\`s, and returns the \`~loader\` payload. */
  readonly dehydrate: () => Dehydrated
  /** Holds raw entries until their read registers. Opens the fetch-free window unless \`static\`. */
  readonly hydrate: (raw: unknown, options?: { readonly static?: boolean | undefined }) => void
  readonly openWindow: () => void
  readonly closeWindow: () => void
  readonly isWindowOpen: () => boolean
  /** Test and dev help. */
  readonly inspect: (read: AnyDefinition, args: unknown) => {
    readonly exists: boolean
    readonly watchers: number
    readonly fetching: boolean
    readonly stale: boolean
    readonly patches: number
  }
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category cache
 */
export const CacheTypeId = "~effect/reactivity/Loader/Cache"

/**
 * The cache service. Its only member is the internal API.
 *
 * @stability unstable
 * @since 4.1.3
 * @category cache
 */
export class Cache extends Context.Service<Cache, {
  readonly [CacheTypeId]: CacheInternals
}>()("effect/reactivity/Loader/Cache") {}

/**
 * @stability unstable
 * @since 4.1.3
 * @category cache
 */
export const internals = (cache: Cache["Service"]): CacheInternals => cache[CacheTypeId]

/**
 * @stability unstable
 * @since 4.1.3
 * @category cache
 */
export interface CacheOptions {
  /** Default 5 minutes. A read can override it. */
  readonly idleTimeToLive?: Duration.Input | undefined
  /**
   * Server per-request mode: an entry settles at most once, every settle is
   * stored, invalidation is a no-op, no idle timers and no intervals.
   */
  readonly settleOnce?: boolean | undefined
  /** Budget 0: no fetch ever starts. A \`get\` waits until \`dehydrate\`. */
  readonly noFetch?: boolean | undefined
}

// -----------------------------------------------------------------------------
// Builds: which Layer build owns a fetch
// -----------------------------------------------------------------------------

interface Build {
  readonly fetcher: (args: any) => Effect.Effect<any, any>
  closed: boolean
  readonly caches: Set<{ readonly buildClosed: (build: Build) => void }>
}

// The service value is a plain function (so a fake is Layer.succeed(Read, fn)),
// so the build it belongs to is found through this table.
const builds = new WeakMap<object, Build>()
const buildOf = (fetcher: (args: any) => Effect.Effect<any, any>): Build => {
  let build = builds.get(fetcher)
  if (build === undefined) {
    build = { fetcher, closed: false, caches: new Set() }
    builds.set(fetcher, build)
  }
  return build
}

// -----------------------------------------------------------------------------
// Cache: implementation
// -----------------------------------------------------------------------------

type Settled = AsyncResult.Success<any, any> | AsyncResult.Failure<any, any>

interface Watcher {
  readonly onChange: (result: Settled) => void
  readonly onDefect: ((cause: Cause.Cause<never>) => void) | undefined
  readonly build: Build
  last: AsyncResult.AsyncResult<any, any> | undefined
  started: boolean
  active: boolean
}

interface Waiter {
  readonly build: Build
  readonly resume: (exit: Exit.Exit<any, any>) => void
}

interface Run {
  startSeq: number
  done: boolean
  readonly entries: Set<Entry>
}

interface PatchRec {
  readonly run: Run
  readonly fn: (value: any, args: any) => any
  live: boolean
}

interface FetchRec {
  readonly trigger: Trigger
  readonly build: Build
  fiber: Fiber.Fiber<any, any> | undefined
}

interface Entry {
  readonly def: ReadInternal
  readonly argsKey: string
  args: unknown
  argsKnown: boolean
  /** The settled server state, never waiting. undefined is cold. */
  result: Settled | undefined
  settledAt: number
  invalidated: boolean
  hydrated: boolean
  /** Sequence of the last write or invalidation. */
  touch: number
  removed: boolean
  readonly watchers: Set<Watcher>
  readonly waiters: Set<Waiter>
  patches: Array<PatchRec>
  fetch: FetchRec | undefined
  deferred: Trigger | undefined
  idleCancel: (() => void) | undefined
  intervalDue: number | undefined
  intervalCancel: (() => void) | undefined
}

type RawTuple = readonly [string, 0 | 1, unknown, number]

const warn = (message: string): void => {
  // eslint-disable-next-line no-console
  console.warn("[Loader] " + message)
}

const isBareFailure = (result: Settled | undefined): boolean =>
  result !== undefined && result._tag === "Failure" && Option.isNone(result.previousSuccess)

const failsOnly = (cause: Cause.Cause<any>): Cause.Cause<any> =>
  Cause.fromReasons(cause.reasons.filter(Cause.isFailReason).map((reason) => Cause.makeFailReason(reason.error)))

const parseRaw = (raw: unknown): Map<string, Map<string, RawTuple>> | undefined => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined
  const out = new Map<string, Map<string, RawTuple>>()
  for (const [name, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) return undefined
    const byKey = new Map<string, RawTuple>()
    for (const tuple of list) {
      if (
        !Array.isArray(tuple) || tuple.length !== 4 || typeof tuple[0] !== "string" ||
        (tuple[1] !== 0 && tuple[1] !== 1) || typeof tuple[3] !== "number" ||
        (tuple[1] === 1 && !Array.isArray(tuple[2]))
      ) return undefined
      byKey.set(tuple[0], tuple as any)
    }
    out.set(name, byKey)
  }
  return out
}

/**
 * Builds a cache synchronously. \`context\` supplies the Clock, the Scheduler
 * and the two host signals, and every fetch and timer is forked with it. The
 * cache is disposed when \`scope\` closes.
 *
 * @stability unstable
 * @since 4.1.3
 * @category cache
 */
export const makeCacheUnsafe = (
  options: CacheOptions & {
    readonly scope: Scope.Scope
    readonly context?: Context.Context<never> | undefined
  }
): Cache["Service"] => {
  const context = options.context ?? Context.empty()
  const clock = Context.get(context, Clock.Clock)
  const visibility = Context.get(context, Visibility)
  const connectivity = Context.get(context, Connectivity)
  const settleOnce = options.settleOnce === true
  const noFetch = options.noFetch === true
  const defaultIdle = Duration.fromInputUnsafe(options.idleTimeToLive ?? "5 minutes")
  if (Duration.isNegative(defaultIdle)) throw new Error("Loader: idleTimeToLive can't be negative")
  const defaultIdleMs = Duration.toMillis(defaultIdle)

  const reads = new Map<string, ReadInternal>()
  const index = new Map<string, Map<string, Entry>>()
  let raw = new Map<string, Map<string, RawTuple>>()
  let hydratedAt = 0
  let hydratedStatic = false
  let windowOpen = false
  let seq = 0
  let inFlight = 0
  let disposed = false
  const fetchListeners = new Set<(event: FetchEvent) => void>()
  const idleListeners = new Set<() => void>()
  const timers = new Set<Fiber.Fiber<any, any>>()

  const now = () => clock.currentTimeMillisUnsafe()
  const runFork = Effect.runForkWith(context)
  const defer = (f: () => void): void => {
    runFork(Effect.andThen(Effect.yieldNow, Effect.sync(() => disposed ? undefined : f())))
  }
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

  // -- index ------------------------------------------------------------------
  const allEntries = (): Array<Entry> => {
    const out: Array<Entry> = []
    for (const byKey of index.values()) for (const entry of byKey.values()) out.push(entry)
    return out
  }
  const entriesOf = (name: string): Array<Entry> => Array.from(index.get(name)?.values() ?? [])
  const makeEntry = (def: ReadInternal, argsKey: string): Entry => {
    const entry: Entry = {
      def,
      argsKey,
      args: undefined,
      argsKnown: false,
      result: undefined,
      settledAt: 0,
      invalidated: false,
      hydrated: false,
      touch: 0,
      removed: false,
      watchers: new Set(),
      waiters: new Set(),
      patches: [],
      fetch: undefined,
      deferred: undefined,
      idleCancel: undefined,
      intervalDue: undefined,
      intervalCancel: undefined
    }
    let byKey = index.get(def.key)
    if (byKey === undefined) index.set(def.key, byKey = new Map())
    byKey.set(argsKey, entry)
    return entry
  }
  const removeEntry = (entry: Entry): void => {
    if (entry.removed) return
    entry.removed = true
    cancelIdle(entry)
    stopInterval(entry)
    const byKey = index.get(entry.def.key)
    if (byKey !== undefined && byKey.get(entry.argsKey) === entry) {
      byKey.delete(entry.argsKey)
      if (byKey.size === 0) index.delete(entry.def.key)
    }
  }

  const register = (read: AnyDefinition): ReadInternal => {
    const def = read[TypeId]
    const existing = reads.get(def.key)
    if (existing === def) return def
    if (existing !== undefined) warn("two reads named " + JSON.stringify(def.key) + " in one cache")
    reads.set(def.key, def)
    const held = raw.get(def.key)
    if (held !== undefined) {
      raw.delete(def.key)
      for (const [argsKey, tuple] of held) {
        let result: Settled
        try {
          result = tuple[1] === 0
            ? AsyncResult.success(def.decodeSuccess(tuple[2]), { timestamp: tuple[3] })
            : AsyncResult.failure(
              Cause.fromReasons(
                (tuple[2] as ReadonlyArray<unknown>).map((error) => Cause.makeFailReason(def.decodeError(error)))
              )
            )
        } catch {
          warn("a hydrated entry of " + JSON.stringify(def.key) + " failed to decode")
          continue
        }
        if (index.get(def.key)?.has(argsKey)) continue
        const entry = makeEntry(def, argsKey)
        entry.result = result
        entry.settledAt = hydratedAt
        entry.hydrated = !hydratedStatic
        entry.invalidated = hydratedStatic && def.staleMs !== Infinity
        afterQuiet(entry)
      }
    }
    return def
  }

  const lookup = (def: ReadInternal, argsKey: string, args: unknown): Entry | undefined => {
    const entry = index.get(def.key)?.get(argsKey)
    if (entry !== undefined && !entry.argsKnown) {
      entry.args = args
      entry.argsKnown = true
    }
    return entry
  }
  const ensureEntry = (def: ReadInternal, args: unknown, argsKey = def.argsKey(args)): Entry => {
    const found = lookup(def, argsKey, args)
    if (found !== undefined) return found
    const entry = makeEntry(def, argsKey)
    entry.args = args
    entry.argsKnown = true
    return entry
  }

  // -- state ------------------------------------------------------------------
  const isStale = (entry: Entry): boolean =>
    entry.result === undefined || entry.result._tag === "Failure" || entry.invalidated ||
    now() - entry.settledAt >= entry.def.staleMs
  const hasLive = (entry: Entry): boolean => entry.patches.some((patch) => patch.live)
  const withWaiting = (result: Settled, waiting: boolean): Settled =>
    result.waiting === waiting
      ? result
      : result._tag === "Success"
      ? AsyncResult.success(result.value, { waiting, timestamp: result.timestamp })
      : AsyncResult.failure(result.cause, { previousSuccess: result.previousSuccess, waiting })
  const patchedValue = (entry: Entry, value: any): any => {
    for (const patch of entry.patches.slice()) {
      try {
        value = patch.fn(value, entry.args)
      } catch {
        // A throw on a later recompute drops that patch from that entry.
        entry.patches = entry.patches.filter((p) => p !== patch)
      }
    }
    return value
  }
  const view = (entry: Entry): AsyncResult.AsyncResult<any, any> => {
    const result = entry.result
    if (result === undefined) return AsyncResult.initial(entry.fetch !== undefined)
    if (entry.patches.length > 0 && result._tag === "Success") {
      return AsyncResult.success(patchedValue(entry, result.value), { waiting: true, timestamp: result.timestamp })
    }
    return withWaiting(result, entry.fetch !== undefined)
  }
  const emit = (entry: Entry): void => {
    if (entry.watchers.size === 0) return
    const current = view(entry)
    if (current._tag === "Initial") return
    for (const watcher of Array.from(entry.watchers)) {
      if (!watcher.active || !watcher.started) continue
      if (watcher.last !== undefined && Equal.equals(current, watcher.last)) continue
      watcher.last = current
      watcher.onChange(current)
    }
  }
  const survivingBuild = (entry: Entry): Build | undefined => {
    for (const watcher of entry.watchers) if (!watcher.build.closed) return watcher.build
    for (const waiter of entry.waiters) if (!waiter.build.closed) return waiter.build
    return undefined
  }
  const notifyIdle = (): void => {
    if (inFlight !== 0) return
    for (const listener of Array.from(idleListeners)) listener()
  }

  // -- idle timer -------------------------------------------------------------
  const cancelIdle = (entry: Entry): void => {
    if (entry.idleCancel !== undefined) {
      entry.idleCancel()
      entry.idleCancel = undefined
    }
  }
  const idleEligible = (entry: Entry): boolean =>
    !entry.removed && entry.watchers.size === 0 && entry.waiters.size === 0 && entry.fetch === undefined &&
    entry.patches.length === 0
  const startIdle = (entry: Entry): void => {
    cancelIdle(entry)
    if (settleOnce) return
    const ttl = entry.def.idleMs ?? defaultIdleMs
    if (ttl === Infinity) return
    if (ttl <= 0) return removeEntry(entry)
    entry.idleCancel = timer(ttl, () => {
      entry.idleCancel = undefined
      if (idleEligible(entry)) removeEntry(entry)
    })
  }
  /** Called whenever the entry may have become quiet: removes a cold one, starts the timer on a settled one. */
  const afterQuiet = (entry: Entry): void => {
    if (!idleEligible(entry)) return
    if (entry.result === undefined) return removeEntry(entry)
    if (entry.idleCancel === undefined) startIdle(entry)
  }
  const touchIdle = (entry: Entry): void => {
    if (entry.idleCancel !== undefined) startIdle(entry)
  }

  // -- interval ---------------------------------------------------------------
  const stopInterval = (entry: Entry): void => {
    if (entry.intervalCancel !== undefined) {
      entry.intervalCancel()
      entry.intervalCancel = undefined
    }
    entry.intervalDue = undefined
  }
  const intervalMs = (entry: Entry): number | undefined => {
    const interval = entry.def.refetchInterval
    if (interval === undefined || entry.result === undefined) return undefined
    let input: Duration.Input | undefined
    if (typeof interval === "function") {
      try {
        input = interval(entry.result, entry.args)
      } catch {
        warn("refetchInterval of " + JSON.stringify(entry.def.key) + " threw")
        return undefined
      }
    } else {
      input = interval
    }
    if (input === undefined) return undefined
    const ms = Option.match(Duration.fromInput(input), { onNone: () => NaN, onSome: Duration.toMillis })
    if (!(ms > 0)) {
      warn("refetchInterval of " + JSON.stringify(entry.def.key) + " must be positive")
      return undefined
    }
    return ms === Infinity ? undefined : ms
  }
  const fireInterval = (entry: Entry): void => {
    // Paused: the due time stays, and the edge pass picks it up.
    if (!visibility.get() || !connectivity.get()) return
    if (entry.fetch !== undefined || entry.watchers.size === 0) return
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
  /** Counts from the last settle. Called at a settle, a stored write and the zero-to-one watch. */
  const scheduleInterval = (entry: Entry): void => {
    stopInterval(entry)
    if (settleOnce || entry.watchers.size === 0) return
    const ms = intervalMs(entry)
    if (ms === undefined) return
    entry.intervalDue = entry.settledAt + ms
    armInterval(entry)
  }

  // -- fetching ---------------------------------------------------------------
  const startFetch = (entry: Entry, trigger: Trigger, build: Build, restart: boolean): void => {
    const fetch: FetchRec = { trigger, build, fiber: undefined }
    entry.fetch = fetch
    inFlight++
    cancelIdle(entry)
    build.caches.add(self)
    for (const listener of Array.from(fetchListeners)) {
      listener({ read: entry.def.key, argsKey: entry.argsKey, trigger, restart })
    }
    // The fetcher never starts inside the call that asked for it.
    const fiber = runFork(Effect.andThen(Effect.yieldNow, Effect.suspend(() => build.fetcher(entry.args))))
    fetch.fiber = fiber
    fiber.addObserver((exit) => onFetchExit(entry, fetch, exit))
    emit(entry)
  }
  /** Interrupts the fetch without settling anything. The caller restarts or reverts. */
  const dropFetch = (entry: Entry): FetchRec | undefined => {
    const fetch = entry.fetch
    if (fetch === undefined) return undefined
    entry.fetch = undefined
    inFlight--
    fetch.fiber?.interruptUnsafe()
    return fetch
  }
  const ensureFetch = (entry: Entry, trigger: Trigger, build: Build): void => {
    if (entry.fetch !== undefined || disposed) return
    if (hasLive(entry)) {
      // Deferred until the last live owner exits. A prefetch does nothing.
      if (trigger !== "prefetch") entry.deferred ??= trigger
      return
    }
    if (noFetch) return
    if (settleOnce && entry.result !== undefined) return
    const first = entry.deferred ?? trigger
    entry.deferred = undefined
    startFetch(entry, first, build, false)
  }
  const sweepHeld = (entry: Entry): void => {
    if (entry.patches.length === 0 || entry.fetch !== undefined || hasLive(entry)) return
    entry.patches = []
  }
  const resumeWaiters = (entry: Entry, exit: Exit.Exit<any, any>): void => {
    if (entry.waiters.size === 0) return
    const waiters = Array.from(entry.waiters)
    entry.waiters.clear()
    for (const waiter of waiters) waiter.resume(exit)
  }
  const store = (entry: Entry, result: Settled): void => {
    entry.result = result
    entry.settledAt = now()
    entry.invalidated = false
    entry.hydrated = false
    scheduleInterval(entry)
  }
  /** A fetch ended with nothing to store and nothing to restart it. */
  const revert = (entry: Entry): void => {
    resumeWaiters(entry, Exit.interrupt())
    sweepHeld(entry)
    emit(entry)
    afterQuiet(entry)
    notifyIdle()
  }
  const onFetchExit = (entry: Entry, fetch: FetchRec, exit: Exit.Exit<any, any>): void => {
    if (entry.fetch !== fetch) return
    entry.fetch = undefined
    inFlight--
    const previous = entry.result
    let waiterExit: Exit.Exit<any, any> = exit
    let defect: Cause.Cause<never> | undefined
    if (exit._tag === "Success") {
      store(entry, AsyncResult.success(exit.value, { timestamp: now() }))
    } else if (Cause.hasDies(exit.cause)) {
      // Never stored: the previous state stays, marked stale.
      defect = exit.cause as Cause.Cause<never>
      if (previous !== undefined) entry.invalidated = true
    } else if (Cause.hasFails(exit.cause)) {
      const cause = failsOnly(exit.cause)
      waiterExit = Exit.failCause(cause)
      const previousSuccess = previous === undefined
        ? Option.none<AsyncResult.Success<any, any>>()
        : previous._tag === "Success"
        ? Option.some(previous)
        : previous.previousSuccess
      if (entry.watchers.size > 0 || settleOnce || Option.isSome(previousSuccess)) {
        store(entry, AsyncResult.failure(cause, { previousSuccess }))
      }
    }
    // else: interrupted. The entry reverts to its previous state.
    sweepHeld(entry)
    resumeWaiters(entry, waiterExit)
    if (defect !== undefined) {
      for (const watcher of Array.from(entry.watchers)) {
        if (watcher.active) watcher.onDefect?.(defect)
      }
    }
    emit(entry)
    afterQuiet(entry)
    notifyIdle()
  }
  const buildClosed = (build: Build): void => {
    if (disposed) return
    for (const entry of allEntries()) {
      if (entry.fetch?.build !== build) continue
      const { trigger } = dropFetch(entry)!
      const next = survivingBuild(entry)
      if (next !== undefined) startFetch(entry, trigger, next, true)
      else revert(entry)
    }
  }

  // -- watch, peek, get, prefetch -----------------------------------------------
  const watch: CacheInternals["watch"] = (read, args, fetcher, onChange, onDefect) => {
    const def = register(read)
    const entry = ensureEntry(def, args)
    const build = buildOf(fetcher)
    build.caches.add(self)
    const watcher: Watcher = { onChange, onDefect, build, last: undefined, started: false, active: true }
    const first = entry.watchers.size === 0
    entry.watchers.add(watcher)
    cancelIdle(entry)
    if (first) {
      // Only the zero-to-one transition is a fetch trigger, and not inside the fetch-free window.
      if (isStale(entry) && !(windowOpen && entry.hydrated)) ensureFetch(entry, "watch", build)
      scheduleInterval(entry)
    }
    defer(() => {
      if (!watcher.active) return
      watcher.started = true
      emit(entry)
    })
    return {
      argsKey: entry.argsKey,
      current: () => view(entry),
      unregister: () => {
        if (!watcher.active) return
        watcher.active = false
        entry.watchers.delete(watcher)
        if (entry.watchers.size > 0) return
        stopInterval(entry)
        // An unwatched entry never holds a bare Failure.
        if (isBareFailure(entry.result) && !settleOnce && !(windowOpen && entry.hydrated)) entry.result = undefined
        afterQuiet(entry)
      }
    }
  }

  const peek: CacheInternals["peek"] = (read, args) => {
    const def = register(read)
    const entry = lookup(def, def.argsKey(args), args)
    return entry === undefined ? AsyncResult.initial() : view(entry)
  }

  const settledEffect = (result: Settled): Effect.Effect<any, any> =>
    result._tag === "Success" ? Effect.succeed(result.value) : Effect.failCause(result.cause)

  const get: CacheInternals["get"] = (read, args, fetcher) =>
    Effect.suspend((): Effect.Effect<any, any> => {
      const def = register(read)
      const entry = ensureEntry(def, args)
      const build = buildOf(fetcher)
      const result = entry.result
      if (entry.patches.length > 0) {
        // The server value, never the patched one. No fetch may run on the
        // entry, so a stale one is fetched for the caller and nothing is stored.
        // (Under a LIVE patch this is undecided in EFF-3556; same answer here.)
        if (result !== undefined && result._tag === "Success" && !isStale(entry)) return Effect.succeed(result.value)
        return fetcher(args)
      }
      if (result !== undefined && result._tag === "Success" && !isStale(entry)) {
        touchIdle(entry)
        return Effect.succeed(result.value)
      }
      if (result !== undefined && ((windowOpen && entry.hydrated) || settleOnce)) return settledEffect(result)
      return Effect.callback<any, any>((resume) => {
        const waiter: Waiter = { build, resume }
        entry.waiters.add(waiter)
        cancelIdle(entry)
        build.caches.add(self)
        ensureFetch(entry, "get", build)
        return Effect.sync(() => {
          entry.waiters.delete(waiter)
          afterQuiet(entry)
        })
      })
    })

  const prefetch: CacheInternals["prefetch"] = (read, args, fetcher) => {
    const def = register(read)
    const entry = ensureEntry(def, args)
    if (hasLive(entry)) return
    if (!isStale(entry) || (windowOpen && entry.hydrated && entry.result !== undefined)) return touchIdle(entry)
    ensureFetch(entry, "prefetch", buildOf(fetcher))
    afterQuiet(entry)
  }

  // -- invalidation -----------------------------------------------------------
  const resolveTargets = (targets: ReadonlyArray<Target>): Set<Entry> => {
    const out = new Set<Entry>()
    for (const target of targets) {
      if (isRead(target)) {
        for (const entry of entriesOf(register(target).key)) out.add(entry)
      } else if (target._tag === "Entry") {
        const entry = lookup(register(target.read), target.argsKey, target.args)
        if (entry !== undefined) out.add(entry)
      } else {
        // The cache can't know the tags of a read it hasn't seen.
        raw = new Map()
        for (const def of reads.values()) {
          if (def.tags.includes(target.name)) { for (const entry of entriesOf(def.key)) out.add(entry) }
        }
      }
    }
    return out
  }
  const restartOrRevert = (entry: Entry): void => {
    const fetch = dropFetch(entry)!
    // Under a watcher's build, never the mutation's.
    const next = survivingBuild(entry) ?? (fetch.build.closed ? undefined : fetch.build)
    if (next !== undefined) startFetch(entry, fetch.trigger, next, true)
    else revert(entry)
  }
  const invalidateEntry = (entry: Entry): void => {
    entry.touch = ++seq
    if (entry.result === undefined && entry.fetch === undefined) return
    if (entry.result !== undefined) entry.invalidated = true
    if (hasLive(entry)) {
      entry.deferred ??= "invalidation"
      return
    }
    if (entry.fetch !== undefined) return restartOrRevert(entry)
    if (entry.watchers.size > 0 || entry.waiters.size > 0) {
      const build = survivingBuild(entry)
      if (build !== undefined) ensureFetch(entry, "invalidation", build)
    }
  }
  const applyInvalidation: CacheInternals["applyInvalidation"] = (targets, opts) => {
    if (settleOnce) {
      if (targets.length > 0) warn("invalidate is a no-op on a per-request cache")
      return
    }
    const exclude = new Set<unknown>(opts?.exclude ?? [])
    for (const entry of resolveTargets(targets)) {
      if (!exclude.has(entry)) invalidateEntry(entry)
    }
  }

  // -- patches and writes -------------------------------------------------------
  const runs = new WeakMap<RunHandle, Run>()
  /** The check made when a run exits: a refetch that was held back, and the held patches. */
  const settlePatches = (entry: Entry): void => {
    if (!hasLive(entry) && entry.fetch === undefined) {
      const due = entry.intervalDue !== undefined && entry.intervalDue <= now()
      if ((entry.watchers.size > 0 || entry.waiters.size > 0) && (isStale(entry) || due)) {
        const build = survivingBuild(entry)
        if (build !== undefined) ensureFetch(entry, "invalidation", build)
      }
      entry.deferred = undefined
      sweepHeld(entry)
    }
    emit(entry)
    afterQuiet(entry)
  }
  const applyWritesRun = (run: Run, sets: ReadonlyArray<SetTarget>): Array<Entry> => {
    const fresh: Array<Entry> = []
    for (const set of sets) {
      const def = register(set.read)
      const entry = ensureEntry(def, set.args, set.argsKey)
      if (entry.patches.some((patch) => patch.live && patch.run !== run)) {
        // Under another run's live patch it isn't stored and the entry goes stale.
        entry.touch = ++seq
        if (entry.result !== undefined) entry.invalidated = true
        entry.deferred ??= "invalidation"
        continue
      }
      const isFresh = entry.touch <= run.startSeq
      entry.touch = ++seq
      store(entry, AsyncResult.success(set.value, { timestamp: now() }))
      if (!isFresh) entry.invalidated = true
      entry.patches = entry.patches.filter((patch) => patch.live)
      // A fetch that began before the write would overwrite it with older data.
      if (entry.fetch !== undefined) restartOrRevert(entry)
      if (isFresh) fresh.push(entry)
      emit(entry)
      if (entry.idleCancel !== undefined) startIdle(entry)
      else afterQuiet(entry)
    }
    return fresh
  }
  const beginRun: CacheInternals["beginRun"] = (patches = []) => {
    const planned: Array<{ readonly entry: Entry; readonly fn: (value: any, args: any) => any }> = []
    const implied: Array<Target> = []
    for (const patch of patches) {
      const def = register(patch.read)
      if (patch._tag === "Patch") {
        implied.push({ _tag: "Entry", read: patch.read, args: patch.args, argsKey: patch.argsKey })
        const entry = lookup(def, patch.argsKey, patch.args)
        // A patch over an entry with no Success isn't registered.
        if (entry?.result?._tag === "Success") planned.push({ entry, fn: patch.fn })
      } else {
        implied.push(patch.read)
        for (const entry of entriesOf(def.key)) {
          if (entry.result?._tag === "Success" && entry.argsKnown) planned.push({ entry, fn: patch.fn })
        }
      }
    }
    // All-or-nothing: a throw here leaves nothing registered.
    const preview = new Map<Entry, unknown>()
    for (const { entry, fn } of planned) {
      const current = preview.has(entry)
        ? preview.get(entry)
        : patchedValue(entry, (entry.result as AsyncResult.Success<any, any>).value)
      preview.set(entry, fn(current, entry.args))
    }
    const run: Run = { startSeq: seq, done: false, entries: new Set() }
    for (const { entry, fn } of planned) {
      entry.patches.push({ run, fn, live: true })
      run.entries.add(entry)
    }
    for (const entry of run.entries) {
      // No fetch runs on an entry with a live patch.
      const fetch = dropFetch(entry)
      if (fetch !== undefined) entry.deferred ??= fetch.trigger
      cancelIdle(entry)
      emit(entry)
    }
    if (planned.length > 0) notifyIdle()
    const handle: RunHandle = {
      implied,
      start: () => {
        run.startSeq = seq
      },
      finish: (opts) => {
        if (run.done) return
        run.done = true
        const targets = [...(opts.invalidates ?? []), ...implied]
        if (opts.exit === "success") {
          for (const entry of run.entries) {
            for (const patch of entry.patches) if (patch.run === run) patch.live = false
          }
          const written = opts.writes === undefined ? [] : applyWritesRun(run, opts.writes)
          applyInvalidation(targets, { exclude: written as any })
        } else {
          for (const entry of run.entries) entry.patches = entry.patches.filter((patch) => patch.run !== run)
          if (opts.exit === "failure") applyInvalidation(targets)
        }
        for (const entry of run.entries) settlePatches(entry)
      }
    }
    runs.set(handle, run)
    return handle
  }
  const applyWrites: CacheInternals["applyWrites"] = (handle, sets) => {
    const run = runs.get(handle)
    if (run === undefined) throw new Error("Loader: unknown run")
    return applyWritesRun(run, sets) as any
  }

  // -- host edges -------------------------------------------------------------
  const edgePass = (trigger: Trigger): void => {
    for (const entry of allEntries()) {
      if (entry.watchers.size === 0 || entry.fetch !== undefined) continue
      const due = entry.intervalDue !== undefined && entry.intervalDue <= now()
      if (isStale(entry) || due) {
        const build = survivingBuild(entry)
        if (build !== undefined) ensureFetch(entry, trigger, build)
      } else if (entry.intervalDue !== undefined && entry.intervalCancel === undefined) {
        armInterval(entry)
      }
    }
  }
  const onEdge = (trigger: Trigger) => (value: boolean): void => {
    if (disposed || settleOnce || !value) return
    if (visibility.get() && connectivity.get()) edgePass(trigger)
  }
  const offVisibility = visibility.subscribe(onEdge("visibility"))
  const offConnectivity = connectivity.subscribe(onEdge("connectivity"))

  // -- SSR --------------------------------------------------------------------
  const dehydrate: CacheInternals["dehydrate"] = () => {
    const out: Dehydrated = {}
    for (const entry of allEntries()) {
      dropFetch(entry)
      resumeWaiters(entry, Exit.interrupt())
      const result = entry.result
      if (result === undefined) {
        afterQuiet(entry)
        continue
      }
      try {
        const list = out[entry.def.key] ??= []
        if (result._tag === "Success") {
          list.push([entry.argsKey, 0, entry.def.encodeSuccess(result.value), result.timestamp])
        } else {
          list.push([
            entry.argsKey,
            1,
            result.cause.reasons.filter(Cause.isFailReason).map((reason) => entry.def.encodeError(reason.error)),
            entry.settledAt
          ])
        }
      } catch {
        warn("an entry of " + JSON.stringify(entry.def.key) + " failed to encode")
      }
    }
    for (const name of Object.keys(out)) if (out[name].length === 0) delete out[name]
    notifyIdle()
    return out
  }
  const hydrate: CacheInternals["hydrate"] = (input, opts) => {
    const parsed = parseRaw(input)
    if (parsed === undefined) {
      if (input !== undefined) warn("malformed ~loader state, ignored")
      return
    }
    hydratedAt = now()
    hydratedStatic = opts?.static === true
    windowOpen = !hydratedStatic
    raw = parsed
    // Reads the cache has already seen decode at once.
    for (const name of Array.from(raw.keys())) {
      const def = reads.get(name)
      if (def !== undefined) {
        reads.delete(name)
        register({ [TypeId]: def })
      }
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

  const internal: CacheInternals = {
    register: (read) => {
      register(read)
    },
    watch,
    peek,
    get,
    prefetch,
    applyInvalidation,
    beginRun,
    applyWrites,
    onFetch: (listener) => {
      fetchListeners.add(listener)
      return () => {
        fetchListeners.delete(listener)
      }
    },
    isFetching: () => inFlight > 0,
    onIdle: (listener) => {
      idleListeners.add(listener)
      return () => {
        idleListeners.delete(listener)
      }
    },
    awaitIdle: Effect.callback<void>((resume) => {
      if (inFlight === 0) return resume(Effect.void)
      const listener = () => {
        idleListeners.delete(listener)
        resume(Effect.void)
      }
      idleListeners.add(listener)
      return Effect.sync(() => {
        idleListeners.delete(listener)
      })
    }),
    dehydrate,
    hydrate,
    openWindow: () => {
      windowOpen = true
    },
    closeWindow,
    isWindowOpen: () => windowOpen,
    inspect: (read, args) => {
      const def = register(read)
      const entry = index.get(def.key)?.get(def.argsKey(args))
      return {
        exists: entry !== undefined,
        watchers: entry?.watchers.size ?? 0,
        fetching: entry?.fetch !== undefined,
        stale: entry === undefined ? true : isStale(entry),
        patches: entry?.patches.length ?? 0
      }
    }
  }
  const self = { [CacheTypeId]: internal, buildClosed }

  Effect.runSync(Scope.addFinalizer(
    options.scope,
    Effect.sync(() => {
      disposed = true
      offVisibility()
      offConnectivity()
      for (const entry of allEntries()) {
        dropFetch(entry)
        resumeWaiters(entry, Exit.interrupt())
      }
      for (const fiber of Array.from(timers)) fiber.interruptUnsafe()
      timers.clear()
    })
  ))

  return self
}

/**
 * A cache for plain Effect code. The effect/ui runtime builds its own.
 *
 * @stability unstable
 * @since 4.1.3
 * @category cache
 */
export const layer = (options?: CacheOptions): Layer.Layer<Cache> =>
  Layer.effect(
    Cache,
    Effect.gen(function*() {
      const scope = yield* Effect.scope
      const context = yield* Effect.context<never>()
      return makeCacheUnsafe({ ...options, scope, context })
    })
  )

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

/**
 * A read: a class service whose value is the fetcher.
 *
 * @stability unstable
 * @since 4.1.3
 * @category models
 */
export interface Service<
  in out Self,
  in out Key extends string,
  in out Args,
  in out A,
  in out E,
  out LE,
  out LR
> extends Context.ServiceClass<Self, Key, Fetcher<Args, A, E>>, Definition<Args, A, E> {
  /** The fetcher's Layer. Fetches it starts are interrupted when the build's Scope closes. */
  readonly layer: Layer.Layer<Self, LE, LR>
  /** A fresh stored value, or a fetch. The server value, never a patched one. */
  get(args: Args): Effect.Effect<A, E, Self | Cache>
  /** Starts a fetch that outlives its caller. */
  prefetch(args: Args): Effect.Effect<void, never, Self | Cache>
  /** Marks one entry, or every entry of the read, stale. */
  invalidate(args?: Args): Effect.Effect<void, never, Cache>
  /** Ensure loaded, then emit changes. A subscriber is a watcher. Dies with a fetcher's defect. */
  changes(args: Args): Stream.Stream<AsyncResult.AsyncResult<A, E>, never, Self | Cache>
  /** The patched view, without fetching. */
  peek(args: Args): Effect.Effect<AsyncResult.AsyncResult<A, E>, never, Cache>
  entry(args: Args): EntryTarget
  patch(args: Args, fn: (value: A) => A): PatchTarget
  patchAll(fn: (value: A, args: Args) => A): PatchAllTarget
  set(args: Args, value: A): SetTarget
}

/**
 * @stability unstable
 * @since 4.1.3
 * @category constructors
 */
export const Service: <Self>() => <
  const Key extends string,
  ArgsS extends Schema.Codec<any, any>,
  SuccessS extends Schema.Codec<any, any>,
  ErrorS extends Schema.Codec<any, any>,
  LE,
  LR
>(
  key: Key,
  options: {
    readonly args: ArgsS
    readonly success: SuccessS
    readonly error: ErrorS
    readonly staleTime: Duration.Input
    readonly idleTimeToLive?: Duration.Input | undefined
    readonly refetchInterval?: RefetchInterval<ArgsS["Type"], SuccessS["Type"], ErrorS["Type"]> | undefined
    readonly tags?: ReadonlyArray<Tag> | undefined
  },
  fetcher: Effect.Effect<Fetcher<ArgsS["Type"], SuccessS["Type"], ErrorS["Type"]>, LE, LR>
) => Service<Self, Key, ArgsS["Type"], SuccessS["Type"], ErrorS["Type"], LE, Exclude<LR, Scope.Scope>> = () =>
(
  key: string,
  options: {
    readonly args: Schema.Codec<any, any>
    readonly success: Schema.Codec<any, any>
    readonly error: Schema.Codec<any, any>
    readonly staleTime: Duration.Input
    readonly idleTimeToLive?: Duration.Input | undefined
    readonly refetchInterval?: RefetchInterval<any, any, any> | undefined
    readonly tags?: ReadonlyArray<Tag> | undefined
  },
  fetcher: Effect.Effect<Fetcher<any, any, any>, any, any>
): any => {
  const stale = Duration.fromInputUnsafe(options.staleTime)
  if (Duration.isNegative(stale)) throw new Error("Loader " + key + ": staleTime can't be negative")
  const idle = options.idleTimeToLive === undefined ? undefined : Duration.fromInputUnsafe(options.idleTimeToLive)
  if (idle !== undefined && Duration.isNegative(idle)) {
    throw new Error("Loader " + key + ": idleTimeToLive can't be negative")
  }
  if (options.refetchInterval !== undefined && typeof options.refetchInterval !== "function") {
    const interval = Duration.fromInputUnsafe(options.refetchInterval)
    if (Duration.isNegative(interval) || Duration.isZero(interval)) {
      throw new Error("Loader " + key + ": refetchInterval must be positive")
    }
  }
  const lazy = <A>(f: () => A): () => A => {
    let value: { readonly value: A } | undefined
    return () => (value ??= { value: f() }).value
  }
  const argsCodec = lazy(() => Schema.encodeUnknownSync(Schema.toCodecJson(options.args)))
  const successEncode = lazy(() => Schema.encodeUnknownSync(Schema.toCodecJson(options.success)))
  const successDecode = lazy(() => Schema.decodeUnknownSync(Schema.toCodecJson(options.success)))
  const errorEncode = lazy(() => Schema.encodeUnknownSync(Schema.toCodecJson(options.error)))
  const errorDecode = lazy(() => Schema.decodeUnknownSync(Schema.toCodecJson(options.error)))
  const def: ReadInternal = {
    key,
    args: options.args,
    success: options.success,
    error: options.error,
    staleMs: Duration.toMillis(stale),
    idleMs: idle === undefined ? undefined : Duration.toMillis(idle),
    refetchInterval: options.refetchInterval,
    tags: (options.tags ?? []).map((tag) => tag.name),
    argsKey: (args) => encodeKey(argsCodec()(args)),
    encodeSuccess: (a) => successEncode()(a),
    decodeSuccess: (u) => successDecode()(u),
    encodeError: (e) => errorEncode()(e),
    decodeError: (u) => errorDecode()(u)
  }
  const Base = Context.Service<any, any>()(key)
  const withCache = <A, E>(
    f: (cache: CacheInternals, context: Context.Context<never>) => Effect.Effect<A, E, any>
  ): Effect.Effect<A, E, any> =>
    Effect.flatMap(
      Effect.context<never>(),
      (context) => f((Context.get(context, Cache as any) as Cache["Service"])[CacheTypeId], context)
    )
  const read: AnyDefinition = { [TypeId]: def }
  class ReadService extends Base {
    static readonly [TypeId] = def
    static readonly layer = Layer.effect(
      Base,
      Effect.gen(function*() {
        const scope = yield* Effect.scope
        const fn = yield* fetcher
        // A new function per build, so two builds never share an identity.
        const wrapped = (args: unknown) => fn(args)
        const build = buildOf(wrapped)
        yield* Scope.addFinalizer(
          scope,
          Effect.sync(() => {
            build.closed = true
            for (const cache of Array.from(build.caches)) cache.buildClosed(build)
            build.caches.clear()
          })
        )
        return wrapped
      })
    )
    static get(args: unknown) {
      return withCache((cache, context) => cache.get(read, args, Context.get(context, Base as any) as any))
    }
    static prefetch(args: unknown) {
      return withCache((cache, context) =>
        Effect.sync(() => cache.prefetch(read, args, Context.get(context, Base as any) as any))
      )
    }
    static invalidate(...args: [args?: unknown]) {
      return withCache((cache) =>
        Effect.sync(() =>
          cache.applyInvalidation([
            args.length === 0 || args[0] === undefined
              ? read
              : { _tag: "Entry", read, args: args[0], argsKey: def.argsKey(args[0]) }
          ])
        )
      )
    }
    static changes(args: unknown) {
      return Stream.callback<AsyncResult.AsyncResult<any, any>>((queue) =>
        withCache((cache, context) =>
          Effect.acquireRelease(
            Effect.sync(() =>
              cache.watch(
                read,
                args,
                Context.get(context, Base as any) as any,
                (result) => {
                  Queue.offerUnsafe(queue, result)
                },
                (cause) => {
                  Queue.failCauseUnsafe(queue, cause)
                }
              )
            ),
            (handle) => Effect.sync(handle.unregister)
          )
        )
      )
    }
    static peek(args: unknown) {
      return withCache((cache) => Effect.sync(() => cache.peek(read, args)))
    }
    static entry(args: unknown): EntryTarget {
      return { _tag: "Entry", read, args, argsKey: def.argsKey(args) }
    }
    static patch(args: unknown, fn: (value: any) => any): PatchTarget {
      return { _tag: "Patch", read, args, argsKey: def.argsKey(args), fn }
    }
    static patchAll(fn: (value: any, args: any) => any): PatchAllTarget {
      return { _tag: "PatchAll", read, fn }
    }
    static set(args: unknown, value: unknown): SetTarget {
      return { _tag: "Set", read, args, argsKey: def.argsKey(args), value }
    }
  }
  return ReadService
}
