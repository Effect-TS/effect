/**
 * The internals of `effect/reactivity/Loader`: keys, read definitions, Layer
 * builds, problems and the cache itself. Nothing here is module-level state.
 *
 * @internal
 */
import * as Cause from "../../Cause.ts"
import * as Clock from "../../Clock.ts"
import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import * as Exit from "../../Exit.ts"
import * as Fiber from "../../Fiber.ts"
import { redactAST } from "../../internal/schemaRedact.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as AsyncResult from "../AsyncResult.ts"

// -----------------------------------------------------------------------------
// Type ids
// -----------------------------------------------------------------------------

/** @internal */
export const ReadTypeId = "~effect/reactivity/Loader"

/** @internal */
export const CacheTypeId = "~effect/reactivity/Loader/Cache"

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
 */
const canonical = (u: unknown): string => {
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

// -----------------------------------------------------------------------------
// Host signals
// -----------------------------------------------------------------------------

/** @internal */
export interface Signal {
  readonly get: () => boolean
  readonly subscribe: (listener: (value: boolean) => void) => () => void
}

/** @internal */
export interface SettableSignal extends Signal {
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

/** @internal */
export const alwaysTrue: Signal = { get: () => true, subscribe: () => () => {} }

// -----------------------------------------------------------------------------
// Problems
// -----------------------------------------------------------------------------

/** The public `Loader.DuplicateName`. */
export class DuplicateName extends Data.TaggedClass("DuplicateName")<{
  readonly message: string
  readonly read: string
}> {}

/** The public `Loader.IntervalThrew`. */
export class IntervalThrew extends Data.TaggedClass("IntervalThrew")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
  readonly error: unknown
}> {}

/** The public `Loader.IntervalInvalid`. */
export class IntervalInvalid extends Data.TaggedClass("IntervalInvalid")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/** The public `Loader.FetchRestarted`. */
export class FetchRestarted extends Data.TaggedClass("FetchRestarted")<{
  readonly message: string
  readonly read: string
  readonly logKey: string
}> {}

/** @internal */
export type Problem = DuplicateName | IntervalThrew | IntervalInvalid | FetchRestarted

/** How many restarts of one fetch in a row, with no settle between, are reported. */
const restartLimit = 10

// -----------------------------------------------------------------------------
// Read definitions
// -----------------------------------------------------------------------------

/** @internal */
export type Settled = AsyncResult.Success<any, any> | AsyncResult.Failure<any, any>

/** @internal */
export type RefetchInterval =
  | Duration.Input
  | ((result: Settled, args: any) => Duration.Input | undefined)

/**
 * The data of a read. A read's identity is this object, not its class.
 *
 * @internal
 */
export interface ReadDef {
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
  /** The key through the redacting args codec. Never throws. */
  readonly logKey: (args: unknown, argsKey: string) => string
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
 *
 * @internal
 */
export const makeDef = (name: string, options: {
  readonly args: Schema.Top | Schema.Struct.Fields
  readonly success: Schema.Top
  readonly error: Schema.Top
  readonly staleTime: Duration.Input
  readonly idleTimeToLive?: Duration.Input | undefined
  readonly refetchInterval?: RefetchInterval | undefined
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
    encodeArgs ??= Schema.encodeUnknownSync(Schema.toCodecJson(args as Schema.Codec<unknown, unknown>))
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
      encodeLogArgs = redacted === args.ast
        ? undefined
        : Schema.encodeUnknownSync(Schema.toCodecJson(Schema.make<Schema.Codec<unknown, unknown>>(redacted)))
    }
    if (encodeLogArgs === undefined) return key
    try {
      return canonical(encodeLogArgs(value))
    } catch {
      return "\"~unserialisable\""
    }
  }
  return {
    name,
    args,
    success: options.success,
    error: options.error,
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
export const defOf = (read: { readonly [ReadTypeId]: unknown }): ReadDef => read[ReadTypeId] as ReadDef

// -----------------------------------------------------------------------------
// Builds: which Layer build owns a fetch
// -----------------------------------------------------------------------------

/** @internal */
export type Fetcher = (args: any) => Effect.Effect<any, any>

/**
 * One Layer build of a read's service. The service value is a plain function,
 * so a fake is `Layer.succeed(Read, fn)`; a function from a real build carries
 * its build, and a fake gets one per cache that never closes.
 *
 * @internal
 */
export interface Build {
  readonly fetcher: Fetcher
  closed: boolean
  readonly listeners: Set<(build: Build) => void>
  /** The fetches running under this build, in any cache, until their cleanup has finished. */
  readonly fibers: Set<Fiber.Fiber<any, any>>
}

/**
 * Wraps a fetcher for one Layer build. A new function per build, so two builds
 * never share an identity.
 *
 * @internal
 */
export const makeBuild = (fetcher: Fetcher): Build => {
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
 *
 * @internal
 */
export const closeBuild = (build: Build): Effect.Effect<void> =>
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

/** @internal */
export type Trigger = "watch" | "get" | "prefetch" | "visibility" | "connectivity" | "interval" | "invalidation"

/** @internal */
export interface FetchEvent {
  readonly read: string
  readonly logKey: string
  readonly trigger: Trigger
  /** True when this start replaces an interrupted fetch. It keeps the trigger. */
  readonly restart: boolean
}

/** @internal */
export interface WatchHandle {
  readonly logKey: () => string
  /** The entry's state right now: `Initial` over a cold entry. */
  readonly current: () => AsyncResult.AsyncResult<any, any>
  /** Drops the watcher count synchronously. Idempotent. */
  readonly unregister: () => void
}

/** @internal */
export type InvalidationTarget =
  | { readonly _tag: "Read"; readonly def: ReadDef }
  | { readonly _tag: "Entry"; readonly def: ReadDef; readonly args: unknown }
  | { readonly _tag: "Tag"; readonly name: string }

/** @internal */
export interface EntryInfo {
  readonly stored: AsyncResult.AsyncResult<any, any>
  readonly stale: boolean
  readonly watchers: number
  readonly fetch: "none" | "running"
  readonly trigger: Trigger | undefined
}

/**
 * The synchronous API of a cache, for the generated statics, the effect/ui
 * runtime and the test harnesses. The value of `Loader.Cache` is one of these.
 *
 * @internal
 */
export interface CacheInternals {
  readonly [CacheTypeId]: typeof CacheTypeId
  /**
   * Registers a watcher. The count rises and the zero-to-one fetch decision is
   * made here, but the fetcher starts one scheduler step later and `onChange`
   * is never called for the state at registration: read `current()`.
   */
  readonly watch: (
    def: ReadDef,
    args: unknown,
    fetcher: Fetcher,
    onChange: (result: Settled) => void,
    onDefect?: ((cause: Cause.Cause<never>) => void) | undefined
  ) => WatchHandle
  /** The server value. Doesn't create the entry or reset its idle timer. */
  readonly peek: (def: ReadDef, args: unknown) => AsyncResult.AsyncResult<any, any>
  readonly get: (def: ReadDef, args: unknown, fetcher: Fetcher) => Effect.Effect<any, any>
  readonly prefetch: (def: ReadDef, args: unknown, fetcher: Fetcher) => void
  /** One synchronous batch: an entry hit twice restarts once. */
  readonly invalidate: (targets: ReadonlyArray<InvalidationTarget>) => void
  /** Called at every fetch start. */
  readonly onFetch: (listener: (event: FetchEvent) => void) => () => void
  readonly inspect: (def: ReadDef, args: unknown) => EntryInfo | undefined
}

/** @internal */
export const internals = (cache: { readonly [CacheTypeId]: unknown }): CacheInternals => cache as CacheInternals

// -----------------------------------------------------------------------------
// Cache: implementation
// -----------------------------------------------------------------------------

interface Watcher {
  readonly onChange: (result: Settled) => void
  readonly onDefect: ((cause: Cause.Cause<never>) => void) | undefined
  readonly build: Build
  last: AsyncResult.AsyncResult<any, any>
  active: boolean
}

interface Waiter {
  readonly build: Build
  readonly resume: (exit: Exit.Exit<any, any>) => void
}

interface FetchRec {
  readonly trigger: Trigger
  readonly build: Build
  fiber: Fiber.Fiber<any, any> | undefined
}

interface Idle {
  expiresAt: number
  cancel: () => void
}

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
  /** Pending `get` callers. */
  readonly waiters: Set<Waiter>
  fetch: FetchRec | undefined
  /** Restarts since the last settle. */
  restarts: number
  idle: Idle | undefined
  /** The interval worked out for the current settle. `undefined`: not worked out yet. */
  interval: { readonly ms: number | undefined } | undefined
  intervalDue: number | undefined
  intervalCancel: (() => void) | undefined
}

const isBareFailure = (result: Settled | undefined): boolean =>
  result !== undefined && result._tag === "Failure" && Option.isNone(result.previousSuccess)

// A fetched Failure holds only its Fails, so it has the shape of a hydrated one.
const failsOnly = (cause: Cause.Cause<any>): Cause.Cause<any> =>
  Cause.fromReasons(cause.reasons.filter(Cause.isFailReason).map((reason) => Cause.makeFailReason(reason.error)))

const diesOnly = (cause: Cause.Cause<any>): Cause.Cause<never> =>
  Cause.fromReasons(cause.reasons.filter(Cause.isDieReason).map((reason) => Cause.makeDieReason(reason.defect)))

const withWaiting = (result: Settled, waiting: boolean): Settled =>
  result.waiting === waiting
    ? result
    : result._tag === "Success"
    ? AsyncResult.success(result.value, { waiting, timestamp: result.timestamp })
    : AsyncResult.failure(result.cause, { previousSuccess: result.previousSuccess, waiting })

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
}): CacheInternals => {
  const { connectivity, context, visibility } = options
  const clock = Context.get(context, Clock.Clock)
  const defaultIdleMs = options.idleMs

  const reads = new Map<string, ReadDef>()
  const duplicates = new WeakSet<ReadDef>()
  const index = new Map<string, Map<string, Entry>>()
  // Builds made for fakes, and every build this cache listens to.
  const fakeBuilds = new WeakMap<Fetcher, Build>()
  const attached = new Set<Build>()
  const fetchListeners = new Set<(event: FetchEvent) => void>()
  const timers = new Set<Fiber.Fiber<any, any>>()
  // Every fetch fiber until its cleanup has finished, and per entry the interrupted one its next fetch waits for.
  const fetchFibers = new Set<Fiber.Fiber<any, any>>()
  const draining = new Map<string, Fiber.Fiber<any, any>>()
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
  const ensureEntry = (def: ReadDef, args: unknown): Entry => {
    const argsKey = def.argsKey(args)
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
      intervalCancel: undefined
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
    entry.result === undefined || entry.result._tag === "Failure" || entry.invalidated ||
    now() - entry.settledAt >= entry.def.staleMs
  /** The server value. `waiting` means only that a fetch is in flight. */
  const view = (entry: Entry): AsyncResult.AsyncResult<any, any> => {
    const waiting = entry.fetch !== undefined
    return entry.result === undefined ? AsyncResult.initial(waiting) : withWaiting(entry.result, waiting)
  }
  /** Quiet over a cold entry, and skips a state equal to a watcher's last. */
  const emit = (entry: Entry): void => {
    if (entry.watchers.size === 0) return
    const current = view(entry)
    if (current._tag === "Initial") return
    for (const watcher of Array.from(entry.watchers)) {
      if (!watcher.active || Equal.equals(current, watcher.last)) continue
      watcher.last = current
      watcher.onChange(current)
    }
  }

  // -- idle timer -------------------------------------------------------------
  const cancelIdle = (entry: Entry): void => {
    if (entry.idle !== undefined) {
      entry.idle.cancel()
      entry.idle = undefined
    }
  }
  const idleEligible = (entry: Entry): boolean =>
    !entry.removed && entry.watchers.size === 0 && entry.waiters.size === 0 && entry.fetch === undefined
  const idleTtl = (entry: Entry): number => entry.def.idleMs ?? defaultIdleMs
  // Built like `RcMap`'s: an `expiresAt` a reset moves, and a sleep that goes round again.
  const startIdle = (entry: Entry): void => {
    cancelIdle(entry)
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
    if (entry.removed || entry.watchers.size === 0) return
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
    if (disposed || entry.removed || entry.watchers.size === 0 || entry.fetch !== undefined) return
    if (entry.intervalCancel !== undefined || paused()) return
    const ms = intervalMs(entry)
    if (ms === undefined) return
    entry.intervalDue = now() + ms
    armInterval(entry)
  }

  // -- fetching ---------------------------------------------------------------
  const startFetch = (entry: Entry, trigger: Trigger, build: Build, restart: boolean): void => {
    const fetch: FetchRec = { trigger, build, fiber: undefined }
    entry.fetch = fetch
    cancelIdle(entry)
    if (fetchListeners.size > 0) {
      const event: FetchEvent = { read: entry.def.name, logKey: logKeyOf(entry), trigger, restart }
      for (const listener of Array.from(fetchListeners)) {
        try {
          listener(event)
        } catch {
          // A listener can't change what the cache does.
        }
      }
    }
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
  /** One fetch per entry: a caller that finds one in flight joins it. */
  const ensureFetch = (entry: Entry, trigger: Trigger, build: Build): void => {
    if (entry.fetch !== undefined || disposed) return
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
  const store = (entry: Entry, result: Settled): void => {
    entry.result = result
    entry.settledAt = now()
    entry.invalidated = false
    entry.restarts = 0
    entry.interval = undefined
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
    let waiterExit: Exit.Exit<any, any> = exit
    let defect: Cause.Cause<never> | undefined
    let stored = false
    if (exit._tag === "Success") {
      store(entry, AsyncResult.success(exit.value, { timestamp: now() }))
      stored = true
    } else if (Cause.hasDies(exit.cause)) {
      // Never stored: the previous state stays, marked stale, so a remount fetches fresh.
      defect = diesOnly(exit.cause)
      waiterExit = Exit.failCause(defect)
      if (previous !== undefined) entry.invalidated = true
    } else if (Cause.hasFails(exit.cause)) {
      const cause = failsOnly(exit.cause)
      waiterExit = Exit.failCause(cause)
      const previousSuccess = previous === undefined
        ? Option.none<AsyncResult.Success<any, any>>()
        : previous._tag === "Success"
        ? Option.some(previous)
        : previous.previousSuccess
      // An unwatched entry never holds a Failure with no previous Success.
      if (entry.watchers.size > 0 || Option.isSome(previousSuccess)) {
        store(entry, AsyncResult.failure(cause, { previousSuccess }))
        stored = true
      }
    } else {
      // Interrupted, such as by the fetcher itself: a revert, never a Failure.
      waiterExit = Exit.interrupt()
    }
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
  }

  // -- watch, peek, get, prefetch ---------------------------------------------
  const watch: CacheInternals["watch"] = (def, args, fetcher, onChange, onDefect) => {
    const entry = ensureEntry(register(def), args)
    const build = buildOf(fetcher)
    const first = entry.watchers.size === 0
    // Only the zero-to-one transition is a fetch trigger: a joining watcher never refetches.
    if (first && isStale(entry)) ensureFetch(entry, "watch", build)
    const watcher: Watcher = { onChange, onDefect, build, last: view(entry), active: true }
    entry.watchers.add(watcher)
    cancelIdle(entry)
    if (first) scheduleInterval(entry)
    return {
      logKey: () => logKeyOf(entry),
      current: () => view(entry),
      unregister: () => {
        if (!watcher.active) return
        watcher.active = false
        entry.watchers.delete(watcher)
        if (entry.watchers.size > 0) return
        stopInterval(entry)
        if (isBareFailure(entry.result)) entry.result = undefined
        afterQuiet(entry)
      }
    }
  }

  const peek: CacheInternals["peek"] = (def, args) => {
    const registered = register(def)
    const entry = lookup(registered, registered.argsKey(args))
    return entry === undefined ? AsyncResult.initial() : view(entry)
  }

  const get: CacheInternals["get"] = (def, args, fetcher) =>
    Effect.suspend((): Effect.Effect<any, any> => {
      if (disposed) return Effect.interrupt
      const entry = ensureEntry(register(def), args)
      const result = entry.result
      if (result !== undefined && result._tag === "Success" && !isStale(entry)) {
        resetIdle(entry)
        return Effect.succeed(result.value)
      }
      const build = buildOf(fetcher)
      return Effect.callback<any, any>((resume) => {
        const waiter: Waiter = { build, resume }
        entry.waiters.add(waiter)
        cancelIdle(entry)
        ensureFetch(entry, "get", build)
        return Effect.sync(() => {
          entry.waiters.delete(waiter)
          afterQuiet(entry)
        })
      })
    })

  const prefetch: CacheInternals["prefetch"] = (def, args, fetcher) => {
    if (disposed) return
    const entry = ensureEntry(register(def), args)
    if (!isStale(entry)) return resetIdle(entry)
    ensureFetch(entry, "prefetch", buildOf(fetcher))
    afterQuiet(entry)
  }

  // -- invalidation -----------------------------------------------------------
  const resolveTargets = (targets: ReadonlyArray<InvalidationTarget>): Set<Entry> => {
    const out = new Set<Entry>()
    const addAll = (name: string): void => {
      const byKey = index.get(name)
      if (byKey !== undefined) { for (const entry of byKey.values()) out.add(entry) }
    }
    for (const target of targets) {
      if (target._tag === "Read") {
        addAll(register(target.def).name)
      } else if (target._tag === "Entry") {
        const def = register(target.def)
        const entry = lookup(def, def.argsKey(target.args))
        if (entry !== undefined) out.add(entry)
      } else {
        // The cache can't know the tags of a read it hasn't seen, and a tag that matches none is silent.
        for (const def of reads.values()) if (def.tags.includes(target.name)) addAll(def.name)
      }
    }
    return out
  }
  const invalidateEntry = (entry: Entry): void => {
    // A never-fetched entry is a no-op.
    if (entry.result === undefined && entry.fetch === undefined) return
    if (entry.result !== undefined) entry.invalidated = true
    const fetch = entry.fetch
    if (fetch !== undefined) {
      // In flight: interrupted and restarted, watched or not. A prefetch restarts under its own build.
      dropFetch(entry, fetch)
      return restartOrRevert(entry, fetch, fetch.build.closed ? undefined : fetch.build)
    }
    if (entry.watchers.size > 0) {
      const build = survivingBuild(entry)
      if (build !== undefined) ensureFetch(entry, "invalidation", build)
    }
  }
  const invalidate: CacheInternals["invalidate"] = (targets) => {
    if (disposed) return
    for (const entry of resolveTargets(targets)) invalidateEntry(entry)
  }

  // -- host signals -----------------------------------------------------------
  /** One synchronous pass over watched entries, on a false-to-true edge with both signals then true. */
  const edgePass = (trigger: "visibility" | "connectivity"): void => {
    for (const entry of allEntries()) {
      if (entry.watchers.size === 0 || entry.fetch !== undefined) continue
      const due = entry.intervalDue !== undefined && entry.intervalDue <= now()
      if (isStale(entry) || due) {
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
      if (disposed || was || !value || paused()) return
      edgePass(trigger)
    })
  }
  const offVisibility = listen(visibility, "visibility")
  const offConnectivity = listen(connectivity, "connectivity")

  // -- the service ------------------------------------------------------------
  const self: CacheInternals = {
    [CacheTypeId]: CacheTypeId,
    watch,
    peek,
    get,
    prefetch,
    invalidate,
    onFetch: (listener) => {
      fetchListeners.add(listener)
      return () => {
        fetchListeners.delete(listener)
      }
    },
    inspect: (def, args) => {
      const registered = register(def)
      const entry = lookup(registered, registered.argsKey(args))
      if (entry === undefined) return undefined
      return {
        stored: view(entry),
        stale: isStale(entry),
        watchers: entry.watchers.size,
        fetch: entry.fetch === undefined ? "none" : "running",
        trigger: entry.fetch?.trigger
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
      for (const fiber of Array.from(timers)) fiber.interruptUnsafe()
      timers.clear()
      // Disposal ends when every fetch has finished its cleanup.
      return Fiber.interruptAll(fetchFibers)
    })
  ))

  return self
}
