/**
 * Stores Effect services in typed maps.
 *
 * A `Context` holds service implementations under `Context.Service` or
 * `Context.Reference` keys, and its type records which keys are present.
 * Effects use contexts as their environment, so services can be provided once
 * instead of passed through every function call. This module includes helpers
 * for creating keys, building contexts, adding and reading services, merging
 * contexts, and selecting or removing services.
 *
 * @stability stable
 * @since 4.0.0
 */
import type { Effect, EffectIterator } from "./Effect.ts"
import * as Effectable from "./Effectable.ts"
import * as Equal from "./Equal.ts"
import { dual, type LazyArg } from "./Function.ts"
import * as Hash from "./Hash.ts"
import type { Inspectable } from "./Inspectable.ts"
import { exitSucceed, PipeInspectableProto, withFiber, withFiberSucceed } from "./internal/core.ts"
import * as Option from "./Option.ts"
import type { Pipeable } from "./Pipeable.ts"
import { hasProperty } from "./Predicate.ts"
import type * as Sink from "./Sink.ts"
import type * as Stream from "./Stream.ts"
import type * as Types from "./Types.ts"

/**
 * String literal type used as the runtime type identifier for `Context`
 * service keys.
 *
 * @stability stable
 * @category type IDs
 * @since 4.0.0
 */
export type ServiceTypeId = "~effect/Context/Service"

/**
 * Runtime type identifier attached to `Context` service keys and used by
 * `isKey` to recognize them.
 *
 * @stability stable
 * @category type IDs
 * @since 4.0.0
 */
export const ServiceTypeId: ServiceTypeId = "~effect/Context/Service"

/**
 * What every function that provides, reads, picks or omits a service accepts:
 * an identifier, a shape, and the string the value is stored under.
 *
 * **Details**
 *
 * `Identifier` tracks the requirement in Effect types, `Shape` is the value
 * stored, and `key` is the string it is stored under. A `Context.Key` is a
 * `Slot` that is also an Effect, so it can be yielded; a `Context.Operation`
 * is a `Slot` that is a function, so it is called instead. `Context.make`,
 * `Context.add`, `Context.get`, `Layer.succeed`, `Effect.provideService` and
 * the other key-taking functions accept any `Slot`.
 *
 * @see {@link Key} for slots that are Effects
 * @see {@link Operation} for slots that are functions
 *
 * @stability stable
 * @category models
 * @since 4.0.0
 */
export interface Slot<out Identifier, out Shape> {
  readonly Service: Shape
  readonly Identifier: Identifier
  readonly key: string
}

/**
 * Typed identifier for a service stored in a `Context`.
 *
 * **When to use**
 *
 * Use as the typed handle for storing, retrieving, and requiring a specific
 * service in a `Context`.
 *
 * **Details**
 *
 * `Identifier` tracks the requirement in Effect types, while `Shape` is the
 * service implementation retrieved by the key. A `Key` is a `Slot` that is
 * also an Effect value, so yielding it inside `Effect.gen` retrieves the
 * service from the current fiber context. `Context.Service`,
 * `Context.Reference` and `Context.Operations` keys are all `Key`s.
 *
 * @see {@link Slot} for the supertype every key-taking function accepts
 * @see {@link Service} for creating required service keys
 * @see {@link Reference} for creating service keys with default values
 *
 * @stability stable
 * @category models
 * @since 4.0.0
 */
export interface Key<out Identifier, out Shape> extends Slot<Identifier, Shape>, Effect<Shape, never, Identifier> {
  readonly [ServiceTypeId]: ServiceTypeId
}

/**
 * Context key with helper methods for working with a service.
 *
 * **Details**
 *
 * `context` creates a one-service `Context`, `use` and `useSync` retrieve the
 * service from the current Effect context before applying a function, and `of`
 * is a type-level helper for service values.
 *
 * **Example** (Defining a service key)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * // Define an identifier for a database service
 * const Database = Context.Service<{ query: (sql: string) => string }>(
 *   "Database"
 * )
 *
 * // The key can be used to store and retrieve services
 * const context = Context.make(Database, { query: (sql) => `Result: ${sql}` })
 * Context.get(context, Database).query("SELECT 1") // => "Result: SELECT 1"
 * ```
 *
 * @stability stable
 * @category services
 * @since 4.0.0
 */
export interface Service<in out Identifier, in out Shape> extends Key<Identifier, Shape> {
  of(this: void, self: Shape): Shape
  context(self: Shape): Context<Identifier>
  use<A, E, R>(f: (service: Shape) => Effect<A, E, R>): Effect<A, E, R | Identifier>
  useSync<A>(f: (service: Shape) => A): Effect<A, never, Identifier>
}

/**
 * Class-style service key produced by `Context.Service<Self, Shape>()("Id")`.
 *
 * **When to use**
 *
 * Use when declaring a service as a class so the class value can serve as the
 * `Context` key.
 *
 * **Details**
 *
 * The class itself is the `Context` key, and its string `key` identifies the
 * service at runtime.
 *
 * @see {@link Service} for creating function-style keys or class-style service keys
 *
 * @stability stable
 * @category services
 * @since 4.0.0
 */
export interface ServiceClass<in out Self, in out Identifier extends string, in out Shape>
  extends Service<Self, Shape>
{
  new(_: never): ServiceClass.Shape<Identifier, Shape>
  readonly key: Identifier
}

/**
 * Namespace containing helper types for class-style `Context.Service`
 * declarations.
 *
 * @stability stable
 * @since 4.0.0
 */
export declare namespace ServiceClass {
  /**
   * Runtime and type-level metadata carried by a class-style service key,
   * including its service type identifier, string key, and service shape.
   *
   * @category services
   * @since 4.0.0
   */
  export interface Shape<Identifier extends string, Service> {
    readonly [ServiceTypeId]: typeof ServiceTypeId
    readonly key: Identifier
    readonly Service: Service
  }
}

/**
 * Creates a `Context` service key.
 *
 * **When to use**
 *
 * Use when you need to define a context service key for a dependency that must
 * be provided by the surrounding context.
 *
 * **Details**
 *
 * Call `Context.Service("Key")` for a function-style key, or use the two-stage
 * form `Context.Service<Self, Shape>()("Key")` for class-style service
 * declarations. The returned key can be yielded as an Effect and passed to
 * `Context.make`, `Context.add`, and the Context getter functions.
 *
 * **Gotchas**
 *
 * The string key is the runtime identity of the service. Reusing the same key
 * string for unrelated services makes them occupy the same slot in a
 * `Context`.
 *
 * **Example** (Creating service keys)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * // Create a simple service
 * const Database = Context.Service<{
 *   query: (sql: string) => string
 * }>("Database")
 *
 * // Create a service class
 * class Config extends Context.Service<Config, {
 *   port: number
 * }>()("Config") {}
 *
 * // Use the services to create contexts
 * const db = Context.make(Database, {
 *   query: (sql) => `Result: ${sql}`
 * })
 * const config = Context.make(Config, { port: 8080 })
 * Context.get(db, Database).query("SELECT 1") // => "Result: SELECT 1"
 * Context.get(config, Config).port // => 8080
 * ```
 *
 * @see {@link Reference} for service keys with default values
 *
 * @stability stable
 * @category services
 * @since 4.0.0
 */
export const Service: {
  <Identifier, Shape = Identifier>(
    key: string,
    options?: {
      /** @internal */
      readonly fiberCached?: boolean | undefined
    } | undefined
  ): Service<Identifier, Shape>
  <Self, Shape>(): <
    const Identifier extends string,
    E,
    R = Types.unassigned,
    Args extends ReadonlyArray<any> = never
  >(
    id: Identifier,
    options?: {
      readonly make?: ((...args: Args) => Effect<Shape, E, R>) | Effect<Shape, E, R> | undefined
      /** @internal */
      readonly fiberCached?: boolean | undefined
    } | undefined
  ) =>
    & ServiceClass<Self, Identifier, Shape>
    & ([Types.unassigned] extends [R] ? unknown
      : { readonly make: [Args] extends [never] ? Effect<Shape, E, R> : (...args: Args) => Effect<Shape, E, R> })
  <Self>(): <
    const Identifier extends string,
    Make extends Effect<any, any, any> | ((...args: any) => Effect<any, any, any>)
  >(
    id: Identifier,
    options: {
      readonly make: Make
      /** @internal */
      readonly fiberCached?: boolean | undefined
    }
  ) =>
    & ServiceClass<
      Self,
      Identifier,
      Make extends
        Effect<infer _A, infer _E, infer _R> | ((...args: infer _Args) => Effect<infer _A, infer _E, infer _R>) ? _A
        : never
    >
    & { readonly make: Make }
} = function() {
  function KeyClass() {}
  const self = KeyClass as any as Types.Mutable<Reference<any>>
  Object.setPrototypeOf(self, ServiceProto)
  const init = (key: string, options?: {
    readonly defaultValue?: any
    readonly make?: any
    readonly fiberCached?: boolean
  }) => {
    self.key = key
    if (options?.defaultValue) {
      self[ReferenceTypeId] = ReferenceTypeId
      self.defaultValue = options.defaultValue
    }
    if (options?.make) {
      ;(self as any).make = options.make
    }
    if (options?.fiberCached) {
      cacheKeys.add(key)
    }
    return self
  }
  return arguments.length > 0 ? init(arguments[0], arguments[1]) : init
} as any

// The read every getter starts with: one `lookup` of the key's slot, or, for
// a record service, the read its key defines (see "Record services" at the
// end of this module). `orThrow` only matters to a record whose member is
// missing: it names the member in the error.
const read = (self: Context<never>, key: Slot<any, any>, orThrow: boolean): unknown =>
  isRecordKey(key) ? key.read(self, orThrow) : lookup(self, key.key)

// A record service is the one kind of key that is not a function, so every
// function-shaped key answers in one `typeof`.
const isRecordKey = (key: Slot<any, any>): key is RecordImpl =>
  typeof key === "object" && (key as any)[OperationsTypeId] !== undefined

// The strings of the keys fibers cache: a write to one starts a new cache root.
const cacheKeys = new Set<string>()

const ServiceProto: any = {
  [ServiceTypeId]: ServiceTypeId,
  ...Effectable.Prototype<Service<never, any>>({
    label: "Service",
    evaluate(fiber) {
      return exitSucceed(getUnsafe(fiber.context, this as any))
    }
  }),
  toJSON<I, A>(this: Service<I, A>) {
    return {
      _id: "Service",
      key: this.key
    }
  },
  of<Service>(this: void, self: Service): Service {
    return self
  },
  context<Identifier, Shape>(
    this: Service<Identifier, Shape>,
    self: Shape
  ): Context<Identifier> {
    return make(this, self)
  },
  use<A, E, R>(this: Service<never, any>, f: (service: any) => Effect<A, E, R>): Effect<A, E, R> {
    return withFiber((fiber) => f(getUnsafe(fiber.context, this)))
  },
  useSync<A>(this: Service<never, any>, f: (service: any) => A): Effect<A, never, never> {
    return withFiber((fiber) => exitSucceed(f(getUnsafe(fiber.context, this))))
  }
}

const ReferenceTypeId = "~effect/Context/Reference" as const

/**
 * Service key with a lazily computed default value.
 *
 * **Details**
 *
 * When a `Reference` is requested from a `Context` that does not contain an
 * override, Context getters that resolve references return the cached default
 * value instead of failing.
 *
 * **Example** (Defining a reference with a default value)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * // Define a reference with a default value
 * const messages: Array<string> = []
 * const LoggerRef: Context.Reference<{ log: (msg: string) => void }> =
 *   Context.Reference("Logger", {
 *     defaultValue: () => ({ log: (msg) => { messages.push(msg) } })
 *   })
 *
 * // The reference can be used without explicit provision
 * const context = Context.empty()
 * const logger = Context.get(context, LoggerRef) // Uses default value
 * logger.log("default logger")
 * messages // => ["default logger"]
 * ```
 *
 * @stability stable
 * @category services
 * @since 3.11.0
 */
export interface Reference<in out Shape> extends Service<never, Shape> {
  readonly [ReferenceTypeId]: typeof ReferenceTypeId
  readonly defaultValue: () => Shape
  [Symbol.iterator](): EffectIterator<Reference<Shape>>
  new(_: never): {}
}

/**
 * Namespace containing utility types for `Context` service keys.
 *
 * **Example** (Extracting service types)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * const Database = Context.Service<{
 *   query: (sql: string) => string
 * }>("Database")
 *
 * // Extract service type from a key
 * type DatabaseService = Context.Service.Shape<typeof Database>
 *
 * // Extract identifier type from a key
 * type DatabaseId = Context.Service.Identifier<typeof Database>
 *
 * Database.key // => "Database"
 * ```
 *
 * @stability stable
 * @since 2.0.0
 */
export declare namespace Service {
  /**
   * Type that matches any `Context` service key regardless of its identifier or
   * service shape.
   *
   * **Example** (Typing any service key)
   *
   * ```ts import.meta.vitest
   * import { Context } from "effect"
   *
   * // Any represents any possible service type
   * const services: Array<Context.Service.Any> = [
   *   Context.Service<{ log: (msg: string) => void }>("Logger"),
   *   Context.Service<{ query: (sql: string) => string }>("Database")
   * ]
   * services.map((service) => service.key) // => ["Logger", "Database"]
   * ```
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Any = Key<never, any> | Key<any, any>

  /**
   * Extracts the service implementation type stored behind a `Context` service
   * key.
   *
   * **Example** (Extracting a service shape)
   *
   * ```ts import.meta.vitest
   * import { Context } from "effect"
   *
   * const Database = Context.Service<{ query: (sql: string) => string }>(
   *   "Database"
   * )
   *
   * // Extract the service shape from the service
   * type DatabaseService = Context.Service.Shape<typeof Database>
   * // DatabaseService is { query: (sql: string) => string }
   * Database.key // => "Database"
   * ```
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Shape<T> = T extends Slot<infer _I, infer S> ? S : never

  /**
   * Extracts the identifier, or requirement type, associated with a `Context`
   * service key.
   *
   * **Example** (Extracting a service identifier)
   *
   * ```ts import.meta.vitest
   * import { Context } from "effect"
   *
   * const Database = Context.Service<{ query: (sql: string) => string }>(
   *   "Database"
   * )
   *
   * // Extract the identifier type from a key
   * type DatabaseId = Context.Service.Identifier<typeof Database>
   * // DatabaseId is the identifier type
   * Database.key // => "Database"
   * ```
   *
   * @category utility types
   * @since 2.0.0
   */
  export type Identifier<T> = T extends Slot<infer I, infer _S> ? I : never
}

const TypeId = "~effect/Context" as const

/**
 * Immutable collection of service implementations used for dependency
 * injection in Effect programs.
 *
 * **Details**
 *
 * The type parameter tracks the service identifiers available in the context.
 * At runtime, services are stored by each key's string `key`.
 *
 * **Example** (Creating a context with multiple services)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * // Create a context with multiple services
 * const Logger = Context.Service<{ log: (msg: string) => void }>("Logger")
 * const Database = Context.Service<{ query: (sql: string) => string }>(
 *   "Database"
 * )
 *
 * const context = Context.make(Logger, { log: (_msg: string) => {} })
 *   .pipe(Context.add(Database, { query: (sql) => `Result: ${sql}` }))
 * Context.get(context, Database).query("SELECT 1") // => "Result: SELECT 1"
 * ```
 *
 * @stability stable
 * @category models
 * @since 2.0.0
 */
export interface Context<in Services> extends Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _Services: Types.Contravariant<Services>
  }
  readonly mapUnsafe: ReadonlyMap<string, any>
}

interface ContextImpl<in Services> extends Context<Services> {
  cacheRoot: ContextImpl<any> | undefined
  base: ReadonlyMap<string, any>
  baseHits: number
  overlay: Overlay | undefined
  depth: number
  _flat: ReadonlyMap<string, any> | undefined
  maxDepth: number
}

interface Overlay {
  readonly key: string
  readonly value: unknown
  readonly parent: Overlay | undefined
  /**
   * Set on an overlay written by a record service: the members it holds
   * beside `value`, the provided object. See "Record services" at the end of
   * this module.
   */
  readonly record: RecordOverlay | undefined
}

interface RecordOverlay {
  readonly key: RecordImpl
  /** The members, in the order of the record key's `index`. */
  readonly values: ReadonlyArray<unknown>
}

// Keep small bases cheap to read; larger bases are worth copying only after
// enough fall-throughs to amortize the copy.
const FlattenAfterBaseHits = 8

const makeImpl = <Services>(
  cacheRoot: ContextImpl<any> | undefined,
  base: ReadonlyMap<string, any>,
  overlay: Overlay | undefined,
  depth: number,
  maxDepth: number
): ContextImpl<Services> => {
  const self: ContextImpl<Services> = Object.create(Proto)
  self.cacheRoot = cacheRoot ?? self
  self.base = base
  self.overlay = overlay
  self.depth = depth
  self._flat = undefined
  self.baseHits = 0
  self.maxDepth = maxDepth
  return self
}

const applyOverlays = (map: Map<string, any>, overlay: Overlay | undefined): void => {
  if (!overlay) return
  applyOverlays(map, overlay.parent)
  if (overlay.record !== undefined) writeSlots(map, overlay.record.key, overlay.record.values)
  map.set(overlay.key, overlay.value)
}

const flatten = (self: ContextImpl<any>): ReadonlyMap<string, any> => {
  if (self._flat) return self._flat
  if (!self.overlay) return self._flat = self.base
  const map = new Map(self.base)
  applyOverlays(map, self.overlay)
  return self._flat = map
}

// A fresh flat context: a copy of `self`'s map, edited by `f`.
const withFlat = <B>(self: Context<any>, f: (map: Map<string, any>) => void): Context<B> => {
  const map = new Map(self.mapUnsafe)
  f(map)
  return makeImpl(undefined, map, undefined, 0, (self as ContextImpl<any>).maxDepth)
}

// A private symbol so user code cannot forge a value that reads as absent
const notFound = Symbol()

const lookup = (self: Context<never>, key: string): unknown => {
  const impl = self as ContextImpl<any>
  for (let overlay = impl.overlay; overlay; overlay = overlay.parent) {
    if (overlay.key === key) return overlay.value
    if (overlay.record !== undefined) {
      const i = overlay.record.key.index.get(key)
      if (i !== undefined) return overlay.record.values[i]
    }
  }
  const value = impl.base.get(key)
  // Misses must not advance the counter: reference-default lookups miss the
  // base on every fiber cache refresh, which would flatten every short-lived
  // request context and reintroduce the O(services) per-request cost
  if (value === undefined && !impl.base.has(key)) return notFound
  if (impl.overlay && ++impl.baseHits >= impl.base.size && impl.baseHits >= FlattenAfterBaseHits) {
    impl.base = flatten(impl)
    impl.overlay = undefined
    impl.depth = 0
  }
  return value
}

/**
 * Creates a `Context` from an existing service map.
 *
 * **When to use**
 *
 * Use when constructing a low-level `Context` from a trusted map whose lifecycle
 * you control.
 *
 * **Details**
 *
 * `options.maxDepth` sets how many `add` calls are kept as overlays before the
 * context is rebased into a flat map (default `8`). Lower values make lookups
 * cheaper, higher values make additions to a large base cheaper. Invalid
 * values fall back to the default.
 *
 * Contexts derived with `add`, `pick`, `omit`, and `merge` keep the setting
 * (`merge` from its first non-empty argument). `make`, `empty`, and `mergeAll`
 * use the default. Layers are combined with `mergeAll`, so apply it to the
 * final context rather than inside a layer.
 *
 * **Gotchas**
 *
 * Excessively large `maxDepth` values can cause stack overflow when overlays
 * are materialized or rebased. Choose a modest value.
 *
 * The provided map is retained without copying and must not be mutated after
 * construction. Prefer `empty`, `make`, `add`, or `merge` for normal Context
 * construction.
 *
 * **Example** (Creating a context from a map)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * // Create a context from a Map (unsafe)
 * const map = new Map([
 *   ["Logger", { log: (_msg: string) => {} }]
 * ])
 *
 * const context = Context.makeUnsafe(map)
 * context.mapUnsafe.size // => 1
 * ```
 *
 * @stability stable
 * @category constructors
 * @since 4.0.0
 */
export const makeUnsafe = <Services = never>(
  mapUnsafe: ReadonlyMap<string, any>,
  options?: { readonly maxDepth?: number }
): Context<Services> => {
  const maxDepth = options?.maxDepth
  // NaN or Infinity would never trigger a rebase, so fall back to the default
  return makeImpl(undefined, mapUnsafe, undefined, 0, Number.isInteger(maxDepth) && maxDepth! >= 0 ? maxDepth! : 8)
}

const Proto: Omit<
  ContextImpl<never>,
  "cacheRoot" | "base" | "overlay" | "depth" | "_flat" | "baseHits" | "maxDepth"
> = {
  get mapUnsafe() {
    return flatten(this as any as ContextImpl<any>)
  },
  ...PipeInspectableProto,
  [TypeId]: {
    _Services: (_: never) => _
  },
  toJSON(this: Context<never>) {
    return {
      _id: "Context",
      services: Array.from(this.mapUnsafe).map(([key, value]) => ({ key, value }))
    }
  },
  [Equal.symbol]<A>(this: Context<A>, that: unknown): boolean {
    if (!isContext(that)) return false
    const self = this.mapUnsafe
    const other = that.mapUnsafe
    if (self.size !== other.size) return false
    for (const [key, value] of self) {
      if (!other.has(key) || !Equal.equals(value, other.get(key))) return false
    }
    return true
  },
  [Hash.symbol]<A>(this: Context<A>): number {
    return Hash.number(this.mapUnsafe.size)
  }
}

/** @internal */
export const hasSameCache = <Services, Services2>(
  self: Context<Services>,
  that: Context<Services2>
): boolean => (self as ContextImpl<Services>).cacheRoot === (that as ContextImpl<Services2>).cacheRoot

/**
 * Checks whether the provided argument is a `Context`.
 *
 * **When to use**
 *
 * Use to narrow an unknown value before passing it to APIs that require a
 * `Context`.
 *
 * **Details**
 *
 * This checks the runtime `Context` marker and does not inspect which services
 * the context contains.
 *
 * **Gotchas**
 *
 * This guard only proves that the value is a `Context`; it does not prove that
 * any specific service is present.
 *
 * **Example** (Checking for contexts)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 * Context.isContext(Context.empty()) // => true
 * ```
 *
 * @see {@link isKey} for checking service keys
 * @see {@link isReference} for checking references with defaults
 *
 * @stability stable
 * @category guards
 * @since 2.0.0
 */
export const isContext = (u: unknown): u is Context<never> => hasProperty(u, TypeId)

/**
 * Checks whether the provided argument is a `Key`.
 *
 * **Example** (Checking for keys)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 * Context.isKey(Context.Service("Service")) // => true
 * ```
 *
 * @stability stable
 * @category guards
 * @since 4.0.0
 */
export const isKey = (u: unknown): u is Key<any, any> => hasProperty(u, ServiceTypeId)

/**
 * Checks whether the provided argument is a `Reference`.
 *
 * **Example** (Checking for references)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * const LoggerRef = Context.Reference("Logger", {
 *   defaultValue: () => ({ log: (_msg: string) => {} })
 * })
 *
 * Context.isReference(LoggerRef) // => true
 * Context.isReference(Context.Service("Key")) // => false
 * ```
 *
 * @stability stable
 * @category guards
 * @since 3.11.0
 */
export const isReference = <I, S>(u: Slot<I, S>): u is Reference<S> => !!(u as Reference<S>)[ReferenceTypeId]

/**
 * Returns an empty `Context`.
 *
 * **Example** (Creating an empty context)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 * Context.empty().mapUnsafe.size // => 0
 * ```
 *
 * @stability stable
 * @category constructors
 * @since 2.0.0
 */
export const empty = (): Context<never> => emptyContext
const emptyContext = makeUnsafe(new Map())

/**
 * Creates a new `Context` with a single service associated to the key.
 *
 * **Example** (Creating a context with one service)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 *
 * const context = Context.make(Port, { PORT: 8080 })
 *
 * Context.get(context, Port).PORT // => 8080
 * ```
 *
 * @stability stable
 * @category constructors
 * @since 2.0.0
 */
export const make = <I, S>(
  key: Slot<I, S>,
  service: Types.NoInfer<S>
): Context<I> => isRecordKey(key) ? key.write(emptyContext, service) : makeUnsafe(new Map([[key.key, service]]))

/**
 * Adds a service to a given `Context`.
 *
 * **When to use**
 *
 * Use when you need to store a known service value in a `Context`.
 *
 * **Details**
 *
 * If the context already contains the same service key, the new service
 * replaces the previous one.
 *
 * **Example** (Adding a service to a context)
 *
 * ```ts import.meta.vitest
 * import { Context, pipe } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 *
 * const someContext = Context.make(Port, { PORT: 8080 })
 *
 * const context = pipe(
 *   someContext,
 *   Context.add(Timeout, { TIMEOUT: 5000 })
 * )
 *
 * const values = [Context.get(context, Port).PORT, Context.get(context, Timeout).TIMEOUT]
 * values // => [8080, 5000]
 * ```
 *
 * @see {@link addOrOmit} for adding or removing a service from an `Option`
 *
 * @stability stable
 * @category combining
 * @since 2.0.0
 */
export const add: {
  <I, S>(
    key: Slot<I, S>,
    service: Types.NoInfer<S>
  ): <Services>(self: Context<Services>) => Context<Services | I>
  <Services, I, S>(
    self: Context<Services>,
    key: Slot<I, S>,
    service: Types.NoInfer<S>
  ): Context<Services | I>
} = dual(3, <Services, I, S>(
  self: Context<Services>,
  key: Slot<I, S>,
  service: Types.NoInfer<S>
): Context<Services | I> => isRecordKey(key) ? key.write(self, service) : addUnsafe(self, key.key, service))

/**
 * Adds a service by key to a given `Context` using a string key.
 *
 * @stability stable
 * @category combining
 * @since 4.0.0
 */
export const addUnsafe = <Services, I, S>(
  self: Context<Services>,
  key: string,
  service: Types.NoInfer<S>
): Context<Services | I> => {
  const impl = self as ContextImpl<Services>
  const cacheRoot = cacheKeys.has(key) ? undefined : impl.cacheRoot
  if (impl.depth >= impl.maxDepth) {
    // Avoid mapUnsafe: it would flatten the parent before copying.
    const map = new Map(impl._flat ?? impl.base)
    if (!impl._flat) applyOverlays(map, impl.overlay)
    map.set(key, service)
    return makeImpl(cacheRoot, map, undefined, 0, impl.maxDepth)
  }

  return makeImpl(
    cacheRoot,
    impl.base,
    { key, value: service, parent: impl.overlay, record: undefined },
    impl.depth + 1,
    impl.maxDepth
  )
}

/**
 * Adds or removes a service depending on an `Option`.
 *
 * **When to use**
 *
 * Use when you need to add or omit a `Context` service based on an `Option`.
 *
 * **Details**
 *
 * When `service` is `Option.some`, the value is stored for the key. When it is
 * `Option.none`, the key is removed from the returned `Context`.
 *
 * **Example** (Adding optional services)
 *
 * ```ts import.meta.vitest
 * import { Context, Option } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 *
 * const withPort = Context.empty().pipe(
 *   Context.addOrOmit(Port, Option.some({ PORT: 8080 }))
 * )
 *
 * const withoutPort = withPort.pipe(
 *   Context.addOrOmit(Port, Option.none())
 * )
 * Context.getOption(withPort, Port) // => Option.some({ PORT: 8080 })
 * Context.getOption(withoutPort, Port) // => Option.none()
 * ```
 *
 * @see {@link add} for always storing a service value
 *
 * @stability stable
 * @category combining
 * @since 4.0.0
 */
export const addOrOmit: {
  <I, S>(
    key: Slot<I, S>,
    service: Option.Option<Types.NoInfer<S>>
  ): <Services>(self: Context<Services>) => Context<Exclude<Services, I>>
  <Services, I, S>(
    self: Context<Services>,
    key: Slot<I, S>,
    service: Option.Option<Types.NoInfer<S>>
  ): Context<Exclude<Services, I>>
} = dual(3, <Services, I, S>(
  self: Context<Services>,
  key: Slot<I, S>,
  service: Option.Option<Types.NoInfer<S>>
): Context<Exclude<Services, I>> =>
  service._tag === "None"
    ? omit(key)(self)
    : add(self, key, service.value) as any)

/**
 * Gets the service for a key, or evaluates the fallback when a non-reference
 * key is absent.
 *
 * **When to use**
 *
 * Use when you need a fallback for a missing `Context.Service` key while still
 * resolving `Context.Reference` defaults.
 *
 * **Details**
 *
 * If the key is a `Context.Reference` and no override is stored in the
 * context, its cached default value is returned instead of the fallback.
 *
 * **Gotchas**
 *
 * The fallback is not evaluated for missing `Context.Reference` keys because
 * references resolve to their default value.
 *
 * **Example** (Falling back for missing services)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * const Logger = Context.Service<{ log: (msg: string) => void }>("Logger")
 * const Database = Context.Service<{ query: (sql: string) => string }>(
 *   "Database"
 * )
 *
 * const context = Context.make(Logger, { log: (_msg: string) => {} })
 *
 * const logger = Context.getOrElse(context, Logger, () => ({ log: () => {} }))
 * const database = Context.getOrElse(
 *   context,
 *   Database,
 *   () => ({ query: () => "fallback" })
 * )
 *
 * logger === Context.get(context, Logger) // => true
 * database.query("SELECT 1") // => "fallback"
 * ```
 *
 * @see {@link getOption} for returning `Option.none` when a non-reference key is missing
 *
 * @stability stable
 * @category getters
 * @since 3.7.0
 */
export const getOrElse: {
  <S, I, B>(key: Slot<I, S>, orElse: LazyArg<B>): <Services>(self: Context<Services>) => S | B
  <Services, S, I, B>(self: Context<Services>, key: Slot<I, S>, orElse: LazyArg<B>): S | B
} = dual(3, <Services, S, I, B>(self: Context<Services>, key: Slot<I, S>, orElse: LazyArg<B>): S | B => {
  const value = read(self, key, false)
  if (value !== notFound) return value as any
  return isReference(key) ? getDefaultValue(key) : orElse()
})

/**
 * Returns the service currently stored for a key, or `undefined` when the key
 * is absent.
 *
 * **When to use**
 *
 * Use when you need to read the service stored for a key without resolving
 * `Context.Reference` defaults.
 *
 * **Gotchas**
 *
 * This is a raw lookup and does not resolve default values for
 * `Context.Reference` keys.
 *
 * @see {@link getOption} for a reference-aware optional lookup
 *
 * @stability stable
 * @category getters
 * @since 4.0.0
 */
export const getOrUndefined: {
  <S, I>(key: Slot<I, S>): <Services>(self: Context<Services>) => S | undefined
  <Services, S, I>(self: Context<Services>, key: Slot<I, S>): S | undefined
} = dual(
  2,
  <Services, S, I>(self: Context<Services>, key: Slot<I, S>): S | undefined => {
    const value = read(self, key, false)
    return value === notFound ? undefined : value as S
  }
)

/** @internal */
export const getOrUndefinedUnsafe = <A, Services = never>(self: Context<Services>, key: string): A | undefined => {
  const value = lookup(self, key)
  return value === notFound ? undefined : value as A
}

/**
 * Gets the service for a key, throwing if an absent non-reference key cannot be
 * resolved.
 *
 * **When to use**
 *
 * Use when you need to read a service from a context whose type does not prove
 * the service is present.
 *
 * **Details**
 *
 * If the key is a `Context.Reference` and no override is stored in the
 * context, its cached default value is returned. For absent non-reference keys,
 * this function throws a runtime error.
 *
 * **Example** (Getting services unsafely)
 *
 * ```ts import.meta.vitest
 * import { Context, Option } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 *
 * const context = Context.make(Port, { PORT: 8080 })
 *
 * Context.getUnsafe(context, Port).PORT // => 8080
 * Context.getOption(context, Timeout) // => Option.none()
 * ```
 *
 * @see {@link get} for type-checked service access
 * @see {@link getOption} for optional service access
 *
 * @stability stable
 * @category unsafe
 * @since 4.0.0
 */
export const getUnsafe: {
  <S, I>(service: Slot<I, S>): <Services>(self: Context<Services>) => S
  <Services, S, I>(self: Context<Services>, services: Slot<I, S>): S
} = dual(
  2,
  <Services, I extends Services, S>(self: Context<Services>, service: Slot<I, S>): S => {
    const value = read(self, service, true)
    if (value === notFound) {
      if (isReference(service)) return getDefaultValue(service as any)
      throw serviceNotFoundError(service)
    }
    return value as any
  }
)

/**
 * Gets a service from the context that corresponds to the given key.
 *
 * **When to use**
 *
 * Use when you need type-checked access to a service already included in the
 * context type.
 *
 * **Example** (Getting a service from a context)
 *
 * ```ts import.meta.vitest
 * import { Context, pipe } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 *
 * const context = pipe(
 *   Context.make(Port, { PORT: 8080 }),
 *   Context.add(Timeout, { TIMEOUT: 5000 })
 * )
 *
 * Context.get(context, Timeout).TIMEOUT // => 5000
 * ```
 *
 * @see {@link getOption} for optional service access
 * @see {@link getOrElse} for fallback values
 *
 * @stability stable
 * @category getters
 * @since 2.0.0
 */
export const get: {
  <I, S>(service: Slot<I, S>): (self: Context<I>) => S
  <Services, I extends Services, S>(service: Slot<I, S>): (self: Context<Services>) => S
  <Services, I extends Services, S>(self: Context<Services>, service: Slot<I, S>): S
} = getUnsafe

const defaultValueCacheKey = "~effect/Context/defaultValue" as const

const getDefaultValue = (ref: Reference<any>) => {
  if (defaultValueCacheKey in ref) {
    return ref[defaultValueCacheKey] as any
  }
  return (ref as any)[defaultValueCacheKey] = ref.defaultValue()
}

const serviceNotFoundError = (service: Slot<any, any>) => {
  const error = new Error(
    `Service not found${service.key ? `: ${String(service.key)}` : ""}`
  )
  if (error.stack) {
    const lines = error.stack.split("\n")
    lines.splice(1, 3)
    error.stack = lines.join("\n")
  }
  return error
}

/**
 * Gets the service for a key safely wrapped in an `Option`.
 *
 * **When to use**
 *
 * Use when you need to read a `Context` service as an `Option` so absence is
 * represented as data.
 *
 * **Details**
 *
 * Returns `Option.some` when the service is stored in the context. If the key
 * is a `Context.Reference` and no override is stored, returns `Option.some` of
 * the cached default value. Missing non-reference keys return `Option.none`.
 *
 * **Example** (Getting optional services)
 *
 * ```ts import.meta.vitest
 * import { Context, Option } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 *
 * const context = Context.make(Port, { PORT: 8080 })
 *
 * Context.getOption(context, Port) // => Option.some({ PORT: 8080 })
 * Context.getOption(context, Timeout) // => Option.none()
 * ```
 *
 * @see {@link getOrElse} for returning a fallback value directly
 *
 * @stability stable
 * @category getters
 * @since 2.0.0
 */
export const getOption: {
  <S, I>(service: Slot<I, S>): <Services>(self: Context<Services>) => Option.Option<S>
  <Services, S, I>(self: Context<Services>, service: Slot<I, S>): Option.Option<S>
} = dual(2, <Services, I extends Services, S>(self: Context<Services>, service: Slot<I, S>): Option.Option<S> => {
  const value = read(self, service, false)
  if (value !== notFound) return Option.some(value as any)
  return isReference(service) ? Option.some(getDefaultValue(service as any)) : Option.none()
})

/**
 * Merges two `Context`s into one.
 *
 * **When to use**
 *
 * Use when you need to combine two contexts.
 *
 * **Details**
 *
 * When both contexts contain the same service key, the service from `that`
 * overrides the service from `self`.
 *
 * **Example** (Merging two contexts)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 *
 * const firstContext = Context.make(Port, { PORT: 8080 })
 * const secondContext = Context.make(Timeout, { TIMEOUT: 5000 })
 *
 * const context = Context.merge(firstContext, secondContext)
 *
 * const values = [Context.get(context, Port).PORT, Context.get(context, Timeout).TIMEOUT]
 * values // => [8080, 5000]
 * ```
 *
 * @see {@link mergeAll} for merging more than two contexts at once
 *
 * @stability stable
 * @category combining
 * @since 2.0.0
 */
export const merge: {
  <R1>(that: Context<R1>): <Services>(self: Context<Services>) => Context<R1 | Services>
  <Services, R1>(self: Context<Services>, that: Context<R1>): Context<Services | R1>
} = dual(2, <Services, R1>(self: Context<Services>, that: Context<R1>): Context<Services | R1> => {
  if (self.mapUnsafe.size === 0) return that as any
  if (that.mapUnsafe.size === 0) return self as any
  return withFlat(self, (map) => that.mapUnsafe.forEach((value, key) => map.set(key, value)))
})

/**
 * Merges any number of `Context`s into one.
 *
 * **When to use**
 *
 * Use when you need to combine a variadic list of contexts.
 *
 * **Details**
 *
 * When multiple contexts contain the same service key, the service from the
 * last context with that key is kept.
 *
 * **Example** (Merging multiple contexts)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 * const Host = Context.Service<{ HOST: string }>("Host")
 *
 * const firstContext = Context.make(Port, { PORT: 8080 })
 * const secondContext = Context.make(Timeout, { TIMEOUT: 5000 })
 * const thirdContext = Context.make(Host, { HOST: "localhost" })
 *
 * const context = Context.mergeAll(
 *   firstContext,
 *   secondContext,
 *   thirdContext
 * )
 *
 * context.mapUnsafe.size // => 3
 * ```
 *
 * @see {@link merge} for merging two contexts
 *
 * @stability stable
 * @category combining
 * @since 3.12.0
 */
export const mergeAll = <T extends Array<unknown>>(
  ...ctxs: [...{ [K in keyof T]: Context<T[K]> }]
): Context<T[number]> => {
  const map = new Map()
  for (let i = 0; i < ctxs.length; i++) {
    ctxs[i].mapUnsafe.forEach((value, key) => {
      map.set(key, value)
    })
  }
  return makeUnsafe(map)
}

/**
 * Returns a new `Context` that contains only the specified services.
 *
 * **When to use**
 *
 * Use when you want to keep an allowlist of services in a `Context`.
 *
 * **Example** (Picking services from a context)
 *
 * ```ts import.meta.vitest
 * import { Context, Option, pipe } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 *
 * const someContext = pipe(
 *   Context.make(Port, { PORT: 8080 }),
 *   Context.add(Timeout, { TIMEOUT: 5000 })
 * )
 *
 * const context = pipe(someContext, Context.pick(Port))
 *
 * Context.getOption(context, Port) // => Option.some({ PORT: 8080 })
 * Context.getOption(context, Timeout) // => Option.none()
 * ```
 *
 * @see {@link omit} for removing selected services
 *
 * @stability stable
 * @category filtering
 * @since 2.0.0
 */
export const pick = <S extends ReadonlyArray<Slot<any, any>>>(
  ...services: S
) =>
<Services>(self: Context<Services>): Context<Services & Service.Identifier<S[number]>> => {
  if (services.length <= 1 && (services.length === 0 || !isRecordKey(services[0]))) {
    const map = new Map<string, unknown>()
    if (services.length === 1) {
      const key = services[0].key
      const value = lookup(self, key)
      if (value !== notFound) map.set(key, value)
    }
    return makeImpl(undefined, map, undefined, 0, (self as ContextImpl<any>).maxDepth)
  }
  // a record service keeps every slot it writes
  const keep = new Set<string>()
  for (let i = 0; i < services.length; i++) {
    const key = services[i]
    if (isRecordKey(key)) key.spanned.forEach((slot) => keep.add(slot))
    else keep.add(key.key)
  }
  return withFlat(self, (map) =>
    map.forEach((_, key) => {
      if (!keep.has(key)) map.delete(key)
    }))
}

/**
 * Returns a new `Context` with the specified service keys removed.
 *
 * **When to use**
 *
 * Use when you want to remove a denylist of services from a `Context`.
 *
 * **Example** (Omitting services from a context)
 *
 * ```ts import.meta.vitest
 * import { Context, Option, pipe } from "effect"
 *
 * const Port = Context.Service<{ PORT: number }>("Port")
 * const Timeout = Context.Service<{ TIMEOUT: number }>("Timeout")
 *
 * const someContext = pipe(
 *   Context.make(Port, { PORT: 8080 }),
 *   Context.add(Timeout, { TIMEOUT: 5000 })
 * )
 *
 * const context = pipe(someContext, Context.omit(Timeout))
 *
 * Context.getOption(context, Port) // => Option.some({ PORT: 8080 })
 * Context.getOption(context, Timeout) // => Option.none()
 * ```
 *
 * @see {@link pick} for keeping selected services
 *
 * @stability stable
 * @category filtering
 * @since 2.0.0
 */
export const omit = <S extends ReadonlyArray<Slot<any, any>>>(
  ...keys: S
) =>
<Services>(self: Context<Services>): Context<Exclude<Services, Service.Identifier<S[number]>>> =>
  withFlat(self, (map) => {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // a record service deletes every slot it writes
      if (isRecordKey(key)) key.spanned.forEach((slot) => map.delete(slot))
      else map.delete(key.key)
    }
  })

/**
 * Creates a context key with a default value.
 *
 * **When to use**
 *
 * Use when you need to define a context key with a lazily computed default
 * value.
 *
 * **Details**
 *
 * `Context.Reference` allows you to create a key that can hold a value. You
 * can provide a default value for the service, which will automatically be used
 * when the context is accessed, or override it with a custom implementation
 * when needed. The default value is computed lazily and cached on the
 * reference.
 *
 * **Example** (Creating references with default values)
 *
 * ```ts import.meta.vitest
 * import { Context } from "effect"
 *
 * // Create a reference with a default value
 * const messages: Array<string> = []
 * const LoggerRef = Context.Reference("Logger", {
 *   defaultValue: () => ({ log: (msg: string) => messages.push(`Default: ${msg}`) })
 * })
 *
 * // The reference provides the default value when accessed from an empty context
 * const context = Context.empty()
 * const logger = Context.get(context, LoggerRef)
 *
 * // You can also override the default value
 * const customContext = Context.make(LoggerRef, {
 *   log: (msg: string) => messages.push(`Custom: ${msg}`)
 * })
 * const customLogger = Context.get(customContext, LoggerRef)
 * logger.log("default")
 * customLogger.log("message")
 * messages // => ["Default: default", "Custom: message"]
 * ```
 *
 * @see {@link Service} for required services without default values
 *
 * @stability stable
 * @category services
 * @since 3.11.0
 */
export const Reference: <Service>(
  key: string,
  options: {
    readonly defaultValue: () => Service
    /** @internal */
    readonly fiberCached?: boolean | undefined
  }
) => Reference<Service> = Service as any

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

/**
 * String literal type used as the runtime type identifier for operations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export type OperationTypeId = "~effect/Context/Operation"

/**
 * Runtime type identifier attached to operations and used by `isOperation`
 * to recognize them.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const OperationTypeId: OperationTypeId = "~effect/Context/Operation"

/**
 * A slot that stands in for its implementation: for a function shape, a
 * function that is called in place of the implementation stored under it; for
 * an Effect shape, an Effect that runs the one stored under it.
 *
 * **Details**
 *
 * `Operation<Id, Shape>` is the shape with the key added to the requirements
 * of its result, intersected with `Slot<Id, Shape>`. It is provided,
 * overridden, read, picked and omitted like any key, with the existing
 * `Context`, `Layer` and `Effect` APIs. An operation with a function shape is
 * a plain function, not an Effect: `Effect.isEffect` is false and it cannot be
 * yielded. One with an Effect shape is an Effect and is yielded.
 *
 * @see {@link Operation} for creating an operation whose result is an Effect
 * @see {@link Operations} for grouping keys into a record service
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Operation<Id extends string, Shape extends Operation.Signature> =
  & Operation.Call<Id, Shape>
  & Slot<Id, Shape>
  & {
    readonly [OperationTypeId]: OperationTypeId
    readonly key: Id
  }

/**
 * Namespace containing utility types for operations.
 *
 * @stability unstable
 * @since 4.0.0
 */
export declare namespace Operation {
  /**
   * A shape `Context.Operation` accepts: a function returning an Effect.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type EffectSignature = (...args: any) => Effect<any, any, any>

  /**
   * A shape `Stream.Operation` accepts: a function returning a Stream.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type StreamSignature = (...args: any) => Stream.Stream<any, any, any>

  /**
   * A shape `Sink.Operation` accepts: a function returning a Sink.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SinkSignature = (...args: any) => Sink.Sink<any, any, any, any, any>

  /**
   * Any shape an operation can have.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Signature = EffectSignature | StreamSignature | SinkSignature | EffectValue

  /**
   * A shape `Context.Operation.value` accepts: an Effect. The operation is that
   * Effect with the key added to its requirements; running it runs the
   * implementation stored under the key.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type EffectValue = Effect<any, any, any>

  /**
   * A function shape of any result kind: what `Context.Operation`,
   * `Stream.Operation` and `Sink.Operation` accept, each rejecting the other
   * kinds with a message naming the constructor to use.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type FunctionSignature = EffectSignature | StreamSignature | SinkSignature

  /**
   * The call signature of an operation.
   *
   * **Details**
   *
   * For a shape whose result already requires the key, the shape is the call
   * signature. For any other shape the signature is derived from the shape,
   * adding the key to the result's requirements; `KeyFor` rejects shapes for
   * which the derived signature would lose information.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Call<Id extends string, Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ? [Id] extends [Requirements<Result>] ? Shape
    : (this: This, ...args: Args) => Require<Result, Id>
    : Shape extends Effect<infer A, infer E, infer R> ? [Id] extends [R] ? Shape : Effect<A, E, R | Id>
    : never

  /**
   * The requirements of an operation result.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Requirements<Result> = Result extends Effect<infer _A, infer _E, infer R> ? R
    : Result extends Stream.Stream<infer _A, infer _E, infer R> ? R
    : Result extends Sink.Sink<infer _A, infer _In, infer _L, infer _E, infer R> ? R
    : never

  /**
   * An operation result with the key added to its requirements.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Require<Result, Id> = Result extends Effect<infer A, infer E, infer R> ? Effect<A, E, R | Id>
    : Result extends Stream.Stream<infer A, infer E, infer R> ? Stream.Stream<A, E, R | Id>
    : Result extends Sink.Sink<infer A, infer In, infer L, infer E, infer R> ? Sink.Sink<A, In, L, E, R | Id>
    : never

  /**
   * Whether a call signature derived from the shape is as precise as the
   * shape itself. False for generic shapes whose type parameter appears in the
   * result and for overloaded shapes, because deriving instantiates type
   * parameters at their constraints and keeps only the last overload.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Derivable<Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ?
    [(this: This, ...args: Args) => Result] extends [Shape] ? true
    : false
    : false

  /**
   * The key parameter of an operation constructor: the key itself when the
   * shape's result is of the constructor's kind and names the key or can be
   * derived from, otherwise a message explaining why the definition is
   * rejected.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type KeyFor<Id extends string, Shape extends Signature, Kind extends ResultKind = "Effect"> = Shape extends
    (...args: any) => infer Result ?
    [keyof Shape] extends [never] ? [KindOf<Result>] extends [Kind] ? [Id] extends [Requirements<Result>] ? Id
        : Derivable<Shape> extends true ? Id
        : `The shape of "${Id}" is generic or overloaded: its result must require "${Id}"`
      : Fix[KindOf<Result>]
    : "The shape has properties: an operation is a bare function"
    : Id

  /**
   * The kind of value an operation's result is: fixed by the constructor that
   * defines the operation, because a call result must be exactly one kind of
   * runtime value and a type argument is erased.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ResultKind = "Effect" | "Stream" | "Sink"

  /**
   * The kind of a result type.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type KindOf<Result> = Result extends Effect<any, any, any> ? "Effect"
    : Result extends Stream.Stream<any, any, any> ? "Stream"
    : Result extends Sink.Sink<any, any, any, any, any> ? "Sink"
    : never

  /**
   * The message for a shape given to the constructor of another result kind,
   * naming the constructor to use.
   *
   * @category utility types
   * @since 4.0.0
   */
  export interface Fix {
    readonly Effect: "The shape returns an Effect: define it with Context.Operation"
    readonly Stream: "The shape returns a Stream: define it with Stream.Operation"
    readonly Sink: "The shape returns a Sink: define it with Sink.Operation"
  }

  /**
   * Any operation.
   *
   * @category utility types
   * @since 4.0.0
   */
  export interface Any extends Slot<any, any> {
    readonly [OperationTypeId]: OperationTypeId
  }
}

/**
 * Creates an operation whose result is an Effect: a key that is called in
 * place of its implementation.
 *
 * **When to use**
 *
 * Use to define one member of a service as its own key, so a program that
 * calls it bundles only its implementation and a test can replace it alone.
 *
 * **Details**
 *
 * The key is the identity of the operation at both levels: the string the
 * implementation is stored under, and the type that appears in `R` while the
 * operation is unprovided. A call returns the shape's result with the key
 * added to its requirements; the implementation is read from the running
 * fiber's context each time that result runs, and the call's receiver and
 * arguments are forwarded to it. Operations have no default implementation.
 *
 * An operation is a `Context.Slot`, so it is provided with `Layer.succeed`,
 * `Layer.effect` or `Effect.provideService`, overridden the same way, and read
 * as a value with `Effect.service` or `Context.get`.
 *
 * A member whose shape is an Effect rather than a function (`columns:
 * Effect<number>`) is defined with `Context.Operation.value`: the operation is
 * then that Effect with the key in its requirements, and running it runs the
 * implementation stored under the key.
 *
 * The optional `Brand` type argument intersects an existing identity into the
 * operation's: `Context.Operation<Shape, FileSystem>()("effect/FileSystem/readFile")`
 * is required as `"effect/FileSystem/readFile" & FileSystem`, which a
 * `Layer<FileSystem>` satisfies. It is how an existing record service exposes
 * its members as operations before its own identity becomes their union.
 *
 * **Gotchas**
 *
 * A generic or overloaded shape names its key in its result, otherwise the
 * definition does not compile. A shape returning a Stream is defined with
 * `Stream.Operation`. A shape with properties is rejected: an operation is a
 * bare function.
 *
 * **Example** (Defining, calling and providing an operation)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Layer } from "effect"
 *
 * const greet = Context.Operation<(name: string) => Effect.Effect<string>>()("app/greet")
 *
 * // A call adds the key to R: Effect<string, never, "app/greet">
 * const program = greet("world")
 *
 * // The implementation is provided for the operation, as for any key
 * const live = Layer.succeed(greet, (name) => Effect.succeed(`hello ${name}`))
 *
 * Effect.runSync(Effect.provide(program, live)) // => "hello world"
 * ```
 *
 * **Example** (A member that is an Effect)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Layer } from "effect"
 *
 * // The shape is an Effect, so the operation is one: it is yielded, not called
 * const columns = Context.Operation.value<Effect.Effect<number>>()("app/Terminal/columns")
 *
 * // Effect<number, never, "app/Terminal/columns">
 * const program = Effect.map(columns, (width) => width * 2)
 *
 * // The implementation is the Effect itself
 * const live = Layer.succeed(columns, Effect.succeed(40))
 *
 * Effect.runSync(Effect.provide(program, live)) // => 80
 * ```
 *
 * @see {@link Operations} for grouping keys into a record service
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const Operation: {
  <Shape extends Operation.FunctionSignature, Brand = unknown>(): <const Id extends string>(
    key: Operation.KeyFor<Id, Shape>
  ) => Operation<Id & Brand, Shape>
  /**
   * Creates an operation whose shape is an Effect: the Effect itself with the
   * key added to its requirements. Running it reads the implementation from
   * the running fiber's context and runs that.
   *
   * @since 4.0.0
   */
  readonly value: <Shape extends Operation.EffectValue, Brand = unknown>() => <const Id extends string>(
    key: Id
  ) => Operation<Id & Brand, Shape>
} = Object.assign(
  () => (key: string) => makeOperation(key, effectCall),
  { value: () => (key: string) => makeValueOperation(key) }
) as any

const effectCall = (operation: Operation.Any, receiver: unknown, args: ArrayLike<unknown>) =>
  withFiber((fiber) => Reflect.apply(getUnsafe(fiber.context, operation) as any, receiver, args))

// An Effect that reads the implementation stored under its key and continues
// with it. It carries the operation brand and no `ServiceTypeId`: it is a slot,
// an Effect, and not a `Context.Key`, whose evaluation would return the
// implementation rather than run it.
// Built with `Object.assign` and a literal property name, not a spread or
// `[OperationTypeId]`, so that a bundle which never constructs a value
// operation drops it: the package build annotates a top-level call pure, and
// a bundler keeps a spread or a computed key as a possible side effect.
const ValueOperationProto = Object.assign(
  Effectable.Prototype<Effect<unknown>>({
    label: "Operation",
    evaluate(fiber) {
      return getUnsafe(fiber.context, this as any) as Effect<unknown>
    }
  }),
  {
    "~effect/Context/Operation": OperationTypeId,
    toJSON(this: Operation.Any) {
      return {
        _id: "Operation",
        key: this.key
      }
    }
  }
)

const makeValueOperation = (key: string): Operation.Any => {
  const operation = Object.create(ValueOperationProto)
  operation.key = key
  return operation
}

/**
 * The implementation applied to a call's receiver and arguments, as an Effect
 * of the result. `Stream.Operation` and `Sink.Operation` unwrap it.
 *
 * @internal
 */
export const applyOperation = (
  operation: Operation.Any,
  receiver: unknown,
  args: ArrayLike<unknown>
): Effect<unknown> =>
  withFiberSucceed((fiber) => Reflect.apply(getUnsafe(fiber.context, operation) as any, receiver, args))

const operationToJSON = function(this: Operation.Any) {
  return {
    _id: "Operation",
    key: this.key
  }
}

/** @internal */
export const makeOperation = (
  key: string,
  call: (operation: Operation.Any, receiver: unknown, args: ArrayLike<unknown>) => unknown
): Operation.Any => {
  // the computed property names the function after the key without redefining `name`; the brand, `key` and
  // `toJSON` are own properties, so the function keeps `Function.prototype` and `.bind` and friends work. It
  // carries no `ServiceTypeId`: an operation is a slot, not a key.
  const operation = {
    [key]: function(this: unknown) {
      return call(operation as any, this, arguments)
    }
  }[key] as any
  operation[OperationTypeId] = OperationTypeId
  operation.key = key
  operation.toJSON = operationToJSON
  return operation
}

/**
 * Tests whether a value is an operation.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isOperation = (u: unknown): u is Operation.Any => hasProperty(u, OperationTypeId)

/**
 * String literal type used as the runtime type identifier for record
 * services.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export type OperationsTypeId = "~effect/Context/Operations"

/**
 * Runtime type identifier attached to record services and used by
 * `isOperations` to recognize them.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const OperationsTypeId: OperationsTypeId = "~effect/Context/Operations"

/**
 * A record service: a `Context.Service` whose members are keys, stored one
 * slot each beside the record itself.
 *
 * **Details**
 *
 * An `Operations` key's shape is the record of its members' shapes and its
 * identifier is the union of its members' identifiers. Providing it writes
 * each member under that member's key and the record under its own; reading it
 * returns the provided record while every member's slot still holds the member
 * it came with, and otherwise an object inheriting from it that carries the
 * overriding members as its own properties. A member that is a method on the
 * provided object's prototype is stored bound to the object, so it runs with
 * the object as `this` standalone as well as through the record.
 * Every `Context`, `Layer` and `Effect` API that takes a key accepts it.
 *
 * @see {@link Operations} for creating one
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Operations<in out Identifier, in out Shape> extends Service<Identifier, Shape> {
  readonly [OperationsTypeId]: OperationsTypeId
  /**
   * The members, by name: the key each slot of the record is read from and
   * written to.
   */
  readonly members: { readonly [K in keyof Shape]: Slot<any, Shape[K]> }
}

/**
 * Namespace containing utility types for record services.
 *
 * @stability unstable
 * @since 4.0.0
 */
export declare namespace Operations {
  /**
   * The members of a record service, by name: operations, services,
   * references, or record services.
   *
   * @category utility types
   * @since 4.0.0
   */
  export interface Members {
    readonly [name: string]: Slot<any, any>
  }

  /**
   * The identifier of a record service: the union of its members'
   * identifiers.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Identifier<Ops extends Members> = { [K in keyof Ops]: Service.Identifier<Ops[K]> }[keyof Ops]

  /**
   * The shape of a record service: the record of its members' shapes.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Shape<Ops extends Members> = { readonly [K in keyof Ops]: Service.Shape<Ops[K]> }

  /**
   * The names at which two record shapes differ.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ShapeDifference<A, B> = {
    [K in keyof A | keyof B]: K extends keyof A ?
      K extends keyof B ? [A[K]] extends [B[K]] ? [B[K]] extends [A[K]] ? never
          : K
        : K
      : K
      : K
  }[keyof A | keyof B]

  /**
   * The key parameter of `Context.Operations<Self, Shape>()`: `string` when
   * `Self` contains every member's identifier and `Shape`, if given, is
   * exactly the members' shape; otherwise a message naming the difference, so
   * the error lands on the key argument and reads as a sentence.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type KeyFor<Self, S, Ops extends Members> = unknown extends Self ?
    "Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"
    : [Identifier<Ops>] extends [Self] ? [S] extends [Types.unassigned] ? string
      : [S] extends [Shape<Ops>] ? [Shape<Ops>] extends [S] ? string
        : `Shape differs from the members' shape at "${ShapeDifference<S, Shape<Ops>> & string}"`
      : `Shape differs from the members' shape at "${ShapeDifference<S, Shape<Ops>> & string}"`
    : `Self lacks the identifier of "${Exclude<Identifier<Ops>, Self> & string}"`

  /**
   * The shape of a record built with `Context.Operations<Self, Shape>()`: the
   * declared `Shape`, or the members' shape when none was declared.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ShapeOf<S, Ops extends Members> = [S] extends [Types.unassigned] ? Shape<Ops> : S
}

/**
 * Creates a record service: a key whose members are keys, stored one slot per
 * member beside the record itself.
 *
 * **When to use**
 *
 * Use to give a contract's members a single identity, so `yield*` returns the
 * record of implementations, `Layer<Record>` provides every member, and a
 * program's requirements can be annotated with one name. A record over some
 * of another record's members is a record service like any other.
 *
 * **Details**
 *
 * `Context.Operations(key, members)` infers the identifier (the union of the
 * members' identifiers) and the shape (the record of their shapes). A library
 * gives them names that diagnostics print, with the curried form, as
 * `Context.Service<Self, Shape>()` does: the operations in a module of their
 * own, imported as a namespace for the member list (`import * as members from
 * "./operations.ts"`), `type Self = Context.Operations.Identifier<typeof
 * members>`, the interface the operations take their shapes from as `Shape`,
 * and `const Self = Context.Operations<Self, Shape>()(key, members)`. A record
 * over some of the members takes `Pick<Shape, "a" | "b">` as its shape. The
 * `Shape` argument is optional. A declared identifier may be wider than the
 * members' union, which is how a record service keeps an existing identity
 * while its members become keys; a declared identifier that lacks a member, or
 * a shape that differs from the members', is a compile error on the key
 * argument that names the difference.
 *
 * At run time, a record added to a context is one overlay holding the provided
 * object and its members, whatever the context's size; reading it returns the
 * provided object, or, once a member has been provided on top, an object
 * inheriting from it with the overriding members as its own properties, built
 * on each read, so `Object.keys` and a spread of that object list the
 * overriding members only.
 *
 * **Example** (A record service from two operations)
 *
 * ```ts import.meta.vitest
 * import { Context, Effect, Layer } from "effect"
 *
 * const readFile = Context.Operation<(path: string) => Effect.Effect<string>>()("app/FileSystem/readFile")
 * const writeFile = Context.Operation<(path: string, data: string) => Effect.Effect<void>>()(
 *   "app/FileSystem/writeFile"
 * )
 * const FileSystem = Context.Operations("app/FileSystem", { readFile, writeFile })
 *
 * // Providing the record provides every member
 * const live = Layer.succeed(FileSystem, {
 *   readFile: (path) => Effect.succeed(`contents of ${path}`),
 *   writeFile: () => Effect.void
 * })
 *
 * // A member can be called on its own, or the record can be yielded
 * const program = Effect.gen(function*() {
 *   const direct = yield* readFile("a.txt")
 *   const fs = yield* FileSystem
 *   const viaRecord = yield* fs.readFile("b.txt")
 *   return [direct, viaRecord]
 * })
 *
 * Effect.runSync(Effect.provide(program, live)) // => ["contents of a.txt", "contents of b.txt"]
 * ```
 *
 * @see {@link Operation} for defining a member
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const Operations: {
  <const Ops extends Operations.Members>(
    key: string,
    members: Ops
  ): Operations<Operations.Identifier<Ops>, Operations.Shape<Ops>>
  <Self, Shape = Types.unassigned>(): <const Ops extends Operations.Members>(
    key: Operations.KeyFor<Self, Shape, Ops>,
    members: Ops
  ) => Operations<Self, Operations.ShapeOf<Shape, Ops>>
} = function() {
  return arguments.length === 0
    ? (key: string, members: Operations.Members) => makeOperations(key, members)
    : makeOperations(arguments[0], arguments[1])
} as any

// -----------------------------------------------------------------------------
// Record services
// -----------------------------------------------------------------------------
//
// A record service occupies its members' slots and one more, its own, which
// holds the object that was provided. Added to a context, it is one overlay
// holding that object and a snapshot of its members, which `lookup` reads a
// member from by position; in a flat map it is one entry per slot. The
// members' slots are the truth: a member provided on top of the record is an
// ordinary overlay, written and read like any other slot. Reading the record
// returns the provided object while the members' slots still hold what the
// record wrote, and otherwise an object inheriting from it with the overriding
// members as its own properties, built on each read. Nothing about this lives
// outside the record key and the contexts it reads, except the methods bound
// to the objects they were found on (below):
// `Context` keeps no index of records, and only this section and the two
// `record` checks in `lookup` and `applyOverlays` know the rules.

interface RecordImpl extends Operations<any, any> {
  /** The members in declaration order: the name each is read at, and its slot. */
  readonly slots: ReadonlyArray<{ readonly name: string; readonly key: Slot<any, any> }>
  /**
   * Every slot the record writes beside its own, by position in a snapshot:
   * its members' slots, and, for a member that is a record, that record's
   * slots followed by its own.
   */
  readonly index: ReadonlyMap<string, number>
  /** The slots of `index` by position, for writing a snapshot into a flat map. */
  readonly slotList: ReadonlyArray<string>
  /** Every slot the record writes: its own and those in `index`. */
  readonly spanned: ReadonlySet<string>
  /** The member each indexed slot belongs to, by name. */
  readonly names: ReadonlyMap<string, string>
  /** The objects assembled for storages, by base map or overlay; see `assemble`. */
  readonly views: WeakMap<object, object>
  /** The last storage read and its object: the one-entry cache in front of `views`. */
  lastStorage: object | undefined
  lastView: object | undefined
  readonly write: <Services>(self: Context<Services>, value: unknown) => Context<any>
  readonly read: (self: Context<never>, orThrow: boolean) => unknown
}

// The members of `value` in index order, read once, now; a member that is a
// record contributes its own snapshot followed by the member object.
const snapshot = (record: RecordImpl, value: any): ReadonlyArray<unknown> => {
  const values: Array<unknown> = []
  const slots = record.slots
  const methods = hasMethods(value)
  for (let i = 0; i < slots.length; i++) {
    const { key, name } = slots[i]
    if (isRecordKey(key)) {
      const nested = snapshot(key, value[name])
      for (let j = 0; j < nested.length; j++) values.push(nested[j])
      values.push(value[name])
    } else {
      values.push(memberOf(value, name, methods))
    }
  }
  return values
}

// Whether members of `value` can come from a prototype: a plain object's cannot.
const hasMethods = (value: object): boolean => {
  const prototype = Object.getPrototypeOf(value)
  return prototype !== null && prototype !== Object.prototype
}

// The member `name` of `value` as the record stores it: the property as it is,
// except a method found on the object's prototype chain, which is stored bound
// to the object so that the member called standalone runs with the object as
// `this`, as it does through the record. The bound function is made once per
// object and method, so two writes of one object store the same members and
// a flat map holding them reads as the object.
const boundMethods = new WeakMap<object, Map<string, Function>>()
const memberOf = (value: any, name: string, methods: boolean): unknown => {
  const member = value[name]
  if (
    !methods || typeof member !== "function" || Object.hasOwn(value, name) ||
    !(name in Object.getPrototypeOf(value))
  ) {
    return member
  }
  let bound = boundMethods.get(value)
  if (bound === undefined) boundMethods.set(value, bound = new Map())
  let fn = bound.get(name)
  if (fn === undefined) bound.set(name, fn = member.bind(value))
  return fn
}

// Writes a snapshot into a flat map, one slot per entry of the index. The
// caller writes the record's own slot.
const writeSlots = (map: Map<string, any>, record: RecordImpl, values: ReadonlyArray<unknown>): void => {
  const slots = record.slotList
  for (let i = 0; i < slots.length; i++) map.set(slots[i], values[i])
}

// `Context.make` and `Context.add` for a record service. Into a context that
// holds nothing, or one whose overlays have reached `maxDepth`, the record is
// written as a flat map, as any key is. Otherwise it is one overlay holding
// the provided object and a snapshot of its members, which costs the snapshot
// and nothing of the context's size. A fiber-cached key among its slots starts
// a new cache root, as its own write would.
function addRecord<Services>(this: RecordImpl, self: Context<Services>, value: unknown): Context<any> {
  const impl = self as ContextImpl<Services>
  const values = snapshot(this, value)
  let cacheRoot = impl.cacheRoot
  cacheKeys.forEach((key) => {
    if (this.spanned.has(key)) cacheRoot = undefined
  })
  if (impl.depth >= impl.maxDepth || (impl.overlay === undefined && impl.base.size === 0)) {
    const map = new Map(impl._flat ?? impl.base)
    if (!impl._flat) applyOverlays(map, impl.overlay)
    writeSlots(map, this, values)
    map.set(this.key, value)
    return makeImpl(cacheRoot, map, undefined, 0, impl.maxDepth)
  }
  return makeImpl(
    cacheRoot,
    impl.base,
    { key: this.key, value, parent: impl.overlay, record: { key: this, values } },
    impl.depth + 1,
    impl.maxDepth
  )
}

function readRecord(this: RecordImpl, self: Context<never>, orThrow: boolean): unknown {
  const impl = self as ContextImpl<never>
  return readFrom(this, impl.overlay, impl.base, orThrow)
}

// The record as seen from `overlay` down to `base`. Walking down, the first
// overlay that touches the record decides: a record overlay that wrote this
// record, whole or as a member of an outer record, holds the provided object;
// a plain overlay holding one of its members is an override; an overlay
// holding its own key by string, or a record overlay sharing some of its
// members, stops the walk and the record is assembled from there, as it is
// from the base map when no overlay touches it. With no override the result is
// returned as it is. Otherwise it is an object that inherits from it and
// carries the overriding members as its own properties, built on each read:
// one small object, cheaper than remembering it.
const readFrom = (
  record: RecordImpl,
  overlay: Overlay | undefined,
  base: ReadonlyMap<string, any>,
  orThrow: boolean
): unknown => {
  // the overrides, topmost first; one is the common case and allocates nothing
  let first: Overlay | undefined
  let more: Array<Overlay> | undefined
  let provided: unknown = notFound
  let o = overlay
  for (; o !== undefined; o = o.parent) {
    if (o.record !== undefined) {
      if (o.key === record.key) {
        provided = o.value
        break
      }
      const i = o.record.key.index.get(record.key)
      if (i !== undefined) {
        provided = o.record.values[i]
        break
      }
      if (shares(record, o.record.key)) {
        provided = assemble(record, o, base, orThrow)
        break
      }
    } else if (o.key === record.key) {
      provided = assemble(record, o, base, orThrow)
      break
    } else if (record.index.has(o.key)) {
      if (first === undefined) first = o
      else (more ??= []).push(o)
    }
  }
  if (o === undefined) provided = assemble(record, undefined, base, orThrow)
  if (first === undefined || provided === notFound) return provided
  // applied bottom-up, so the topmost wins
  const view = Object.create(provided as object)
  if (more !== undefined) {
    for (let i = more.length - 1; i >= 0; i--) {
      if (!override(record, view, more[i], overlay, base, orThrow)) return notFound
    }
  }
  return override(record, view, first, overlay, base, orThrow) ? view : notFound
}

// Sets the member an override overlay holds on a view; a member that is a
// record is read as one, from the top, so its own overrides apply.
const override = (
  record: RecordImpl,
  view: Record<string, unknown>,
  o: Overlay,
  overlay: Overlay | undefined,
  base: ReadonlyMap<string, any>,
  orThrow: boolean
): boolean => {
  const name = record.names.get(o.key)!
  const member = record.members[name]
  if (isRecordKey(member)) {
    const nested = readFrom(member, overlay, base, orThrow)
    if (nested === notFound) return false
    view[name] = nested
  } else {
    view[name] = o.value
  }
  return true
}

// The object remembered for a storage, checking the last one read before the map.
const remembered = (record: RecordImpl, storage: object): object | undefined => {
  if (record.lastStorage === storage) return record.lastView
  const view = record.views.get(storage)
  if (view !== undefined) {
    record.lastStorage = storage
    record.lastView = view
  }
  return view
}

const remember = (record: RecordImpl, storage: object, view: object): void => {
  record.views.set(storage, view)
  record.lastStorage = storage
  record.lastView = view
}

// Whether two records write a common member slot.
const shares = (a: RecordImpl, b: RecordImpl): boolean => {
  const [small, large] = a.index.size <= b.index.size ? [a, b] : [b, a]
  for (const slot of small.index.keys()) {
    if (large.index.has(slot)) return true
  }
  return false
}

// The record from `scope` (an overlay, or the base map when undefined) down:
// the provided object when every member's slot still holds what the record
// wrote for it, otherwise an object inheriting from it with the differing
// members as own properties, or a plain object of the members when the record
// was never provided whole. Remembered on the key for the scope. A missing
// member that is a reference reads its default; any other missing member is
// `Service not found: <member key>` when `orThrow` is set and `notFound`
// otherwise, in which case nothing is remembered.
const assemble = (
  record: RecordImpl,
  scope: Overlay | undefined,
  base: ReadonlyMap<string, any>,
  orThrow: boolean
): unknown => {
  const storage: object = scope ?? base
  const cached = remembered(record, storage)
  if (cached !== undefined) return cached
  const stored = peekFrom(scope, base, record.key)
  const provided: object | typeof notFound = typeof stored === "object" && stored !== null ? stored : notFound
  const methods = provided !== notFound && hasMethods(provided)
  let view: Record<string, unknown> | undefined = provided === notFound ? {} : undefined
  const slots = record.slots
  for (let i = 0; i < slots.length; i++) {
    const { key, name } = slots[i]
    let member = isRecordKey(key) ? readFrom(key, scope, base, orThrow) : peekFrom(scope, base, key.key)
    if (member === notFound) {
      if (isRecordKey(key)) return notFound
      if (isReference(key)) member = getDefaultValue(key)
      else if (orThrow) throw serviceNotFoundError(key)
      else return notFound
    }
    if (provided !== notFound) {
      if (memberOf(provided, name, methods) === member) continue
      if (view === undefined) view = Object.create(provided)
    }
    view![name] = member
  }
  const result = view ?? provided
  remember(record, storage, result as object)
  return result
}

// `lookup` from a given overlay down, without the flatten counter: the reads
// of one assembly must not count as fall-throughs to the base, or every
// context that reads a record would copy its base map.
const peekFrom = (overlay: Overlay | undefined, base: ReadonlyMap<string, any>, key: string): unknown => {
  for (let o = overlay; o !== undefined; o = o.parent) {
    if (o.key === key) return o.value
    if (o.record !== undefined) {
      const i = o.record.key.index.get(key)
      if (i !== undefined) return o.record.values[i]
    }
  }
  return base.has(key) ? base.get(key) : notFound
}

// `Object.assign` and a literal property name, as for `ValueOperationProto`:
// this is the one reference to the record code, and a bundle holding no
// record drops it with the prototype.
const OperationsProto = Object.assign({}, ServiceProto, {
  "~effect/Context/Operations": OperationsTypeId,
  write: addRecord,
  read: readRecord,
  toJSON(this: RecordImpl) {
    return {
      _id: "Operations",
      key: this.key,
      members: Object.keys(this.members)
    }
  }
})

const makeOperations = (key: string, members: Operations.Members): Operations<any, any> => {
  // a plain object, not a function like other keys: see `isRecordKey`
  const self: Types.Mutable<RecordImpl> = Object.create(OperationsProto)
  self.key = key
  self.members = members
  self.slots = Object.keys(members).map((name) => ({ name, key: members[name] }))
  // positions follow `snapshot`'s pushes, so a slot two members share keeps the later member's position
  const index = new Map<string, number>()
  const names = new Map<string, string>()
  let position = 0
  for (let i = 0; i < self.slots.length; i++) {
    const { key, name } = self.slots[i]
    if (isRecordKey(key)) {
      key.index.forEach((_, slot) => {
        index.set(slot, position++)
        names.set(slot, name)
      })
    }
    index.set(key.key, position++)
    names.set(key.key, name)
  }
  self.index = index
  self.slotList = [...index.keys()]
  self.names = names
  self.spanned = new Set([key, ...index.keys()])
  self.views = new WeakMap()
  self.lastStorage = undefined
  self.lastView = undefined
  return self
}

/**
 * Tests whether a key is a record service.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isOperations = (u: unknown): u is Operations<any, any> => hasProperty(u, OperationsTypeId)
