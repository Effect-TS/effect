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
      watched.add(key)
    }
    return self
  }
  return arguments.length > 0 ? init(arguments[0], arguments[1]) : init
} as any

// The read every getter starts with: one `lookup` of the slot. Only an empty
// slot goes further, to `readMiss`.
const readKey = (self: Context<never>, key: Slot<any, any>, orThrow: boolean): unknown => {
  const value = lookup(self, key.key)
  if (value !== notFound) return value
  // a reference's default, as at the branch point; callers that pass
  // `orThrow: false` resolve references themselves, as the branch point's
  // getters do
  if (orThrow && isReference(key)) return getDefaultValue(key)
  return readMiss(self, key, orThrow)
}

// An empty slot that is not a reference: a record service assembles the
// record from its members' slots; anything else is `notFound` or `Service not
// found`.
const readMiss = (self: Context<never>, key: Slot<any, any>, orThrow: boolean): unknown => {
  if (isRecordKey(key)) return assemble(key, self, orThrow)
  if (!orThrow) return notFound
  throw serviceNotFoundError(key)
}

// The strings of the keys fibers cache, as at the branch point: a write to one
// starts a new cache root.
const cacheKeys = new Set<string>()

// The strings a write may have to do more for than store a slot: the keys
// fibers cache, and the strings of every record service this module has
// constructed and of every slot one of them spans. `add` consults it in the one
// `Set` read the branch point spent on `cacheKeys`; a string outside it is
// written by the branch point's code, one inside it is checked against the key
// and the context, which alone decide what happens. The set changes no result:
// a context can only hold a record whose strings are in it.
const watched = new Set<string>()

const ServiceProto: any = {
  [ServiceTypeId]: ServiceTypeId,
  ...Effectable.Prototype<Service<never, any>>({
    label: "Service",
    evaluate(fiber) {
      return exitSucceed(readKey(fiber.context, this as any, true))
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
    return withFiber((fiber) => f(readKey(fiber.context, this, true)))
  },
  useSync<A>(this: Service<never, any>, f: (service: any) => A): Effect<A, never, never> {
    return withFiber((fiber) => exitSucceed(f(readKey(fiber.context, this, true))))
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
  /** The record services written into `base` through their keys; see "Storage". */
  records: RecordIndex | undefined
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
}

// Keep small bases cheap to read; larger bases are worth copying only after
// enough fall-throughs to amortize the copy.
const FlattenAfterBaseHits = 8

// A constructor rather than `Object.create(Proto)`: V8 gives an object built by
// a constructor an in-object slot for every field it assigns, where an object
// created from a prototype gets four and keeps the rest in a side array that
// is reallocated past seven.
function ContextClass(
  this: ContextImpl<any>,
  cacheRoot: ContextImpl<any> | undefined,
  base: ReadonlyMap<string, any>,
  records: RecordIndex | undefined,
  overlay: Overlay | undefined,
  depth: number,
  maxDepth: number
) {
  this.cacheRoot = cacheRoot ?? this
  this.base = base
  this.records = records
  this.overlay = overlay
  this.depth = depth
  this._flat = undefined
  this.baseHits = 0
  this.maxDepth = maxDepth
}

const makeImpl = <Services>(
  cacheRoot: ContextImpl<any> | undefined,
  base: ReadonlyMap<string, any>,
  records: RecordIndex | undefined,
  overlay: Overlay | undefined,
  depth: number,
  maxDepth: number
): ContextImpl<Services> => new (ContextClass as any)(cacheRoot, base, records, overlay, depth, maxDepth)

const applyOverlays = (map: Map<string, any>, overlay: Overlay | undefined): void => {
  if (!overlay) return
  applyOverlays(map, overlay.parent)
  map.set(overlay.key, overlay.value)
}

const flatten = (self: ContextImpl<any>): ReadonlyMap<string, any> => {
  if (self._flat) return self._flat
  if (!self.overlay) return self._flat = self.base
  const map = new Map(self.base)
  applyOverlays(map, self.overlay)
  return self._flat = map
}

// A fresh flat context: a copy of `self`'s map and record index, edited by `f`,
// which returns the index the result keeps.
const withFlat = <B>(
  self: Context<never>,
  f: (map: Map<string, any>, records: Map<string, RecordImpl> | undefined) => RecordIndex | undefined
): Context<B> => {
  const impl = self as ContextImpl<never>
  const map = new Map(self.mapUnsafe)
  const records = impl.records === undefined ? undefined : new Map(impl.records.byKey)
  return makeImpl(undefined, map, f(map, records), undefined, 0, impl.maxDepth)
}

// A private symbol so user code cannot forge a value that reads as absent
const notFound = Symbol()

const lookup = (self: Context<never>, key: string): unknown => {
  const impl = self as ContextImpl<any>
  for (let overlay = impl.overlay; overlay; overlay = overlay.parent) {
    if (overlay.key === key) return overlay.value
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
  return makeImpl(
    undefined,
    mapUnsafe,
    undefined,
    undefined,
    0,
    Number.isInteger(maxDepth) && maxDepth! >= 0 ? maxDepth! : 8
  )
}

const Proto: Omit<
  ContextImpl<never>,
  "cacheRoot" | "base" | "records" | "overlay" | "depth" | "_flat" | "baseHits" | "maxDepth"
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
ContextClass.prototype = Proto
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
): Context<I> => {
  if (!isRecordKey(key)) return makeUnsafe(new Map([[key.key, service]]))
  const map = new Map<string, any>()
  const records = new Map<string, RecordImpl>()
  writeRecord(map, records, key, service, new Set())
  return makeImpl(undefined, map, indexOf(records), undefined, 0, 8)
}

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
): Context<Services | I> =>
  watched.has(key.key)
    ? isRecordKey(key) ? addRecord(self, key, service) : addWatched(self, key.key, service)
    : addPlain(self, key.key, service, (self as ContextImpl<Services>).cacheRoot))

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
): Context<Services | I> =>
  watched.has(key)
    ? addWatched(self, key, service)
    : addPlain(self, key, service, (self as ContextImpl<Services>).cacheRoot)

// One slot, as at the branch point: an overlay, or a fresh flat map once the
// overlays are deep enough. `cacheRoot` is `undefined` for the keys fibers
// cache, whose write starts a new cache root.
const addPlain = <Services, I, S>(
  self: Context<Services>,
  key: string,
  service: S,
  cacheRoot: ContextImpl<any> | undefined
): Context<Services | I> => {
  const impl = self as ContextImpl<Services>
  if (impl.depth >= impl.maxDepth) {
    // Avoid mapUnsafe: it would flatten the parent before copying.
    const map = new Map(impl._flat ?? impl.base)
    if (!impl._flat) applyOverlays(map, impl.overlay)
    map.set(key, service)
    return makeImpl(cacheRoot, map, impl.records, undefined, 0, impl.maxDepth)
  }
  return makeImpl(
    cacheRoot,
    impl.base,
    impl.records,
    { key, value: service, parent: impl.overlay },
    impl.depth + 1,
    impl.maxDepth
  )
}

// A watched string: a slot a record in this context spans is written into a
// fresh flat map, where the record is rebuilt (see "Storage"); a fiber-cached
// key starts a new cache root; anything else is one slot.
const addWatched = <Services, I, S>(self: Context<Services>, key: string, service: S): Context<Services | I> => {
  const impl = self as ContextImpl<Services>
  if (impl.records !== undefined && impl.records.spanned.has(key)) return addSpanned(self, key, service)
  return addPlain(self, key, service, cacheKeys.has(key) ? undefined : impl.cacheRoot)
}

// A write to a slot a record present spans: a fresh flat map with the slot
// written and the record rebuilt from its slots.
const addSpanned = <Services, I, S>(self: Context<Services>, key: string, service: S): Context<Services | I> =>
  withFlat(self, (map, records) => {
    map.set(key, service)
    settle(map, records!, [key], undefined)
    return indexOf(records!)
  })

// A record service is written into a fresh flat map: its members' slots, its
// own, and the rebuild of any other record present that spans a slot it wrote.
const addRecord = <Services, I, S>(self: Context<Services>, record: RecordImpl, service: S): Context<Services | I> =>
  withFlat(self, (map, records) => {
    const written = new Set<string>()
    const byKey = records ?? new Map<string, RecordImpl>()
    writeRecord(map, byKey, record, service, written)
    settle(map, byKey, written, written)
    return indexOf(byKey)
  })

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
  const value = readKey(self, key, false)
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
    const value = readKey(self, key, false)
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
    const value = lookup(self, service.key)
    if (value !== notFound) return value as S
    if (isReference(service)) return getDefaultValue(service)
    return readMiss(self, service, true) as S
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
  const value = readKey(self, service, false)
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
  return withFlat(self, (map, records) => indexOf(mergeInto(map, records, that as ContextImpl<R1>)))
})

// Copies `that`'s slots over `map`. A record of `map` that spans a slot `that`
// writes is rebuilt, unless `that` writes the record itself; the records of
// `that` are current, since they were current in `that`'s flat map.
const mergeInto = (
  map: Map<string, any>,
  records: Map<string, RecordImpl> | undefined,
  that: ContextImpl<any>
): Map<string, RecordImpl> | undefined => {
  const thatMap = that.mapUnsafe
  thatMap.forEach((value, key) => map.set(key, value))
  if (that.records === undefined) {
    if (records !== undefined) settle(map, records, thatMap.keys(), undefined)
    return records
  }
  const byKey = records ?? new Map<string, RecordImpl>()
  that.records.byKey.forEach((record, key) => byKey.set(key, record))
  if (records !== undefined) settle(map, records, thatMap.keys(), that.records.byKey)
  return byKey
}

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
  let records: Map<string, RecordImpl> | undefined
  for (let i = 0; i < ctxs.length; i++) {
    const impl = ctxs[i] as ContextImpl<any>
    // a context holding no record is copied slot by slot, as at the branch point
    if (records === undefined && impl.records === undefined) impl.mapUnsafe.forEach((value, key) => map.set(key, value))
    else records = mergeInto(map, records, impl)
  }
  return makeImpl(undefined, map, indexOf(records), undefined, 0, 8)
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
  const impl = self as ContextImpl<any>
  if (services.length <= 1 && (services.length === 0 || !isRecordKey(services[0]))) {
    // one plain key: one lookup, which leaves the source's flat cache alone
    const map = new Map<string, unknown>()
    if (services.length === 1) {
      const value = lookup(self, services[0].key)
      if (value !== notFound) map.set(services[0].key, value)
    }
    return makeImpl(undefined, map, undefined, undefined, 0, impl.maxDepth)
  }
  // the wanted slots: each key's own and, for a record service, every slot it
  // spans, kept in the source's order; the index keeps the records whose own
  // slot is kept
  const wanted = new Set<string>()
  for (let i = 0; i < services.length; i++) {
    const key = services[i]
    if (isRecordKey(key)) key.spanned.forEach((slot) => wanted.add(slot))
    wanted.add(key.key)
  }
  return withFlat(self, (map, records) => {
    map.forEach((_, key) => {
      if (!wanted.has(key)) map.delete(key)
    })
    records?.forEach((_, key) => {
      if (!map.has(key)) records.delete(key)
    })
    return indexOf(records)
  })
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
  withFlat(self, (map, records) => {
    const deleted = new Set<string>()
    for (let i = 0; i < keys.length; i++) deleteKey(map, records, keys[i], deleted)
    if (records !== undefined) settle(map, records, deleted, undefined)
    return indexOf(records)
  })

// Deletes the slots a key occupies: its own and, for a record service, its
// members', recursively. A record present that spanned one of them is settled
// afterwards, and dropped, since a member it needs is gone.
const deleteKey = (
  map: Map<string, any>,
  records: Map<string, RecordImpl> | undefined,
  key: Slot<any, any>,
  deleted: Set<string>
): void => {
  if (isRecordKey(key)) {
    for (let i = 0; i < key.slots.length; i++) deleteKey(map, records, key.slots[i].key, deleted)
    records?.delete(key.key)
  }
  map.delete(key.key)
  deleted.add(key.key)
}

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
   * shape names it or can be derived from, otherwise a message explaining why
   * the definition is rejected.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type KeyFor<Id extends string, Shape extends Signature> = Shape extends (...args: any) => infer Result ?
    [keyof Shape] extends [never] ? [Id] extends [Requirements<Result>] ? Id
      : Derivable<Shape> extends true ? Id
      : `The shape of "${Id}" is generic or overloaded: its result must require "${Id}"`
    : "The shape has properties: an operation is a bare function"
    : Id

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
  <Shape extends Operation.EffectSignature, Brand = unknown>(): <const Id extends string>(
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
  withFiber((fiber) => Reflect.apply(readKey(fiber.context, operation, true) as any, receiver, args))

// An Effect that reads the implementation stored under its key and continues
// with it. It carries the operation brand and no `ServiceTypeId`: it is a slot,
// an Effect, and not a `Context.Key`, whose evaluation would return the
// implementation rather than run it.
const ValueOperationProto = {
  ...Effectable.Prototype<Effect<unknown>>({
    label: "Operation",
    evaluate(fiber) {
      return readKey(fiber.context, this as any, true) as Effect<unknown>
    }
  }),
  [OperationTypeId]: OperationTypeId,
  toJSON(this: Operation.Any) {
    return {
      _id: "Operation",
      key: this.key
    }
  }
}

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
  withFiberSucceed((fiber) => Reflect.apply(readKey(fiber.context, operation, true) as any, receiver, args))

// A function whose prototype carries the operation brand and still
// `Function.prototype`, so `.bind` and friends work. It carries no
// `ServiceTypeId`: an operation is a slot, not a key.
const OperationProto = Object.assign(Object.create(Function.prototype), {
  [OperationTypeId]: OperationTypeId,
  toJSON(this: Operation.Any) {
    return {
      _id: "Operation",
      key: this.key
    }
  }
})

/** @internal */
export const makeOperation = (
  key: string,
  call: (operation: Operation.Any, receiver: unknown, args: ArrayLike<unknown>) => unknown
): Operation.Any => {
  // the computed property names the function after the key without redefining `name`
  const operation = {
    [key]: function(this: unknown) {
      return call(operation as any, this, arguments)
    }
  }[key] as any
  Object.setPrototypeOf(operation, OperationProto)
  operation.key = key
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
 * identifier is the union of its members' identifiers. Providing it writes the
 * record under its own key and each member under that member's key; reading it
 * returns the provided record when no member has been provided more recently,
 * and otherwise assembles the record from the members' slots. Every
 * `Context`, `Layer` and `Effect` API that takes a key accepts it.
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
 * Creates a record service: a key stored one slot per member, beside the
 * record itself.
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
 * members' identifiers) and the shape (the record of their shapes). To give
 * them names that diagnostics print, declare them and pass them to the curried
 * form, as `Context.Service<Self, Shape>()` does:
 * `type Self = Context.Operations.Identifier<typeof members>`,
 * `interface Shape extends Context.Operations.Shape<typeof members> {}` and
 * `const Self = Context.Operations<Self, Shape>()(key, members)`. The `Shape`
 * argument is optional. A declared identifier may be wider than the members'
 * union, which is how a record service keeps an existing identity while its
 * members become keys; a declared identifier that lacks a member, or a shape
 * that differs from the members', is a compile error on the key argument that
 * names the difference.
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
// Storage
// -----------------------------------------------------------------------------
//
// A record service is stored as its members' slots and its own. The key object
// carries the member list, so every write that needs it has it, and a context
// remembers which records were written into it (`records`, by string, beside
// the flat map), so a later write knows which records it touches. Nothing is
// kept outside the context: two contexts built the same way behave the same
// way whatever else the process has constructed.
//
// Invariants:
//
// 1. A flat map holds a record service's slot only while every slot the record
//    spans is present, and the value there agrees with those slots. The record
//    is written members first, then itself; a write or removal of a slot a
//    present record spans goes into a fresh flat map, where the record is
//    rebuilt from the slots (`add`, `merge`, `mergeAll`) or dropped when a
//    member is gone (`omit`). Overlays therefore never cover a slot a present
//    record spans, and a read of a present record is one lookup.
// 2. A record that was never written into a context (its members were
//    provided one by one) has no slot: a read through its key assembles it
//    from the members' slots, once per context, and a missing non-reference
//    member is `Service not found: <member key>`.
// 3. `records` lists exactly the records whose slot is present, so a program
//    that holds no record pays one field read per `add`, and `mergeAll` of
//    plain contexts consults nothing.

interface RecordImpl extends Operations<any, any> {
  readonly slots: ReadonlyArray<{ readonly name: string; readonly key: Slot<any, any> }>
  /** Every slot the record spans, transitively through member records. */
  readonly spanned: ReadonlySet<string>
  /** An object with every member name and no values: cloning it is the cheap way to build a record. */
  readonly template: Record<string, undefined>
  /** Records assembled for contexts that hold no slot for this record (invariant 2), by context. */
  readonly assembled: WeakMap<object, Record<string, unknown>>
  /** The members and the object of the latest assembly, reused by a context whose members are the same values. */
  latest: { readonly values: ReadonlyArray<unknown>; readonly value: Record<string, unknown> } | undefined
}

// What a context knows about the records written into it: the records by
// string, and every slot one of them spans or occupies, which is the set a
// write consults in one lookup.
interface RecordIndex {
  readonly byKey: ReadonlyMap<string, RecordImpl>
  readonly spanned: ReadonlySet<string>
}

const indexOf = (byKey: Map<string, RecordImpl> | undefined): RecordIndex | undefined => {
  if (byKey === undefined || byKey.size === 0) return undefined
  const spanned = new Set<string>()
  byKey.forEach((record, key) => {
    spanned.add(key)
    record.spanned.forEach((slot) => spanned.add(slot))
  })
  return { byKey, spanned }
}

// A record service is the one kind of key that is not a function, so every
// function-shaped key answers in one `typeof`, whatever mix of key shapes the
// process holds.
const isRecordKey = (key: Slot<any, any>): key is RecordImpl =>
  typeof key === "object" && (key as any)[OperationsTypeId] !== undefined

// Writes a record into a flat map: each member under its slot (a member that
// is itself a record is written the same way), then the record under its own,
// which the index then lists. `written` collects every slot touched.
const writeRecord = (
  map: Map<string, any>,
  records: Map<string, RecordImpl>,
  record: RecordImpl,
  value: any,
  written: Set<string>
): void => {
  const slots = record.slots
  for (let i = 0; i < slots.length; i++) {
    const key = slots[i].key
    if (isRecordKey(key)) writeRecord(map, records, key, value[slots[i].name], written)
    else {
      map.set(key.key, value[slots[i].name])
      written.add(key.key)
    }
  }
  map.set(record.key, value)
  records.set(record.key, record)
  written.add(record.key)
}

// Restores invariant 1 after the slots in `written` changed: every record in
// `records` spanning one of them, other than those in `fresh` (written whole by
// this same operation), is rebuilt from the slots, or dropped when a member it
// needs is absent. A record whose own slot was overwritten by a plain write
// leaves the index: the slot is a plain slot now. Member records are settled
// before the records containing them, so the latter read settled slots.
const settle = (
  map: Map<string, any>,
  records: Map<string, RecordImpl>,
  written: Iterable<string>,
  fresh: { has(key: string): boolean } | undefined
): void => {
  let touched: Array<RecordImpl> | undefined
  for (const key of written) {
    for (const record of records.values()) {
      if (fresh !== undefined && fresh.has(record.key)) continue
      if (record.key === key) records.delete(key)
      else if (record.spanned.has(key) && !(touched ??= []).includes(record)) touched.push(record)
    }
  }
  if (touched !== undefined) {
    touched.sort((a, b) => a.spanned.size - b.spanned.size)
    for (let i = 0; i < touched.length; i++) {
      const record = touched[i]
      const value = assembleFrom(map, record)
      if (value === notFound) {
        map.delete(record.key)
        records.delete(record.key)
      } else map.set(record.key, value)
    }
  }
}

// The record assembled from a flat map's slots, or `notFound` when a member it
// needs is absent. A member record without a slot of its own is assembled the
// same way; a reference member falls back to its default.
const assembleFrom = (map: ReadonlyMap<string, any>, record: RecordImpl): unknown => {
  const slots = record.slots
  const values: Array<unknown> = new Array(slots.length)
  for (let i = 0; i < slots.length; i++) {
    const key = slots[i].key
    let member: unknown
    if (map.has(key.key)) member = map.get(key.key)
    else if (isRecordKey(key)) member = assembleFrom(map, key)
    else if (isReference(key)) member = getDefaultValue(key)
    else return notFound
    if (member === notFound) return notFound
    values[i] = member
  }
  return build(record, values)
}

// A record object from its members' values: a clone of the record's template,
// so every store is to a property the object already has, which costs a third
// of building the object property by property.
const build = (record: RecordImpl, values: ReadonlyArray<unknown>): Record<string, unknown> => {
  const value: Record<string, unknown> = { ...record.template }
  const slots = record.slots
  for (let i = 0; i < slots.length; i++) value[slots[i].name] = values[i]
  return value
}

// Invariant 2: the record read through its key from a context that holds no
// slot for it, assembled from the members' slots and remembered for that
// context, so every read of one context returns one object. Contexts whose
// members are the same values share the object.
const assemble = (record: RecordImpl, self: Context<never>, orThrow: boolean): unknown => {
  const cached = record.assembled.get(self)
  if (cached !== undefined) return cached
  const slots = record.slots
  const values: Array<unknown> = new Array(slots.length)
  for (let i = 0; i < slots.length; i++) {
    const key = slots[i].key
    let member = peek(self as ContextImpl<never>, key.key)
    if (member === notFound) {
      if (isRecordKey(key)) member = assemble(key, self, orThrow)
      else if (isReference(key)) member = getDefaultValue(key)
      else if (orThrow) throw serviceNotFoundError(key)
      else return notFound
      if (member === notFound) return notFound
    }
    values[i] = member
  }
  let value: Record<string, unknown>
  const latest = record.latest
  if (latest !== undefined && sameValues(latest.values, values)) value = latest.value
  else record.latest = { values, value: value = build(record, values) }
  record.assembled.set(self, value)
  return value
}

const sameValues = (a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>): boolean => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// `lookup` without the flatten counter: the thirty reads of one assembly must
// not count as thirty fall-throughs to the base, or every context that assembles
// a record would copy its base map.
const peek = (impl: ContextImpl<never>, key: string): unknown => {
  for (let overlay = impl.overlay; overlay; overlay = overlay.parent) {
    if (overlay.key === key) return overlay.value
  }
  return impl.base.has(key) ? impl.base.get(key) : notFound
}

const OperationsProto = {
  ...ServiceProto,
  [OperationsTypeId]: OperationsTypeId,
  toJSON(this: RecordImpl) {
    return {
      _id: "Operations",
      key: this.key,
      members: Object.keys(this.members)
    }
  }
}

const makeOperations = (key: string, members: Operations.Members): Operations<any, any> => {
  // a plain object, not a function like other keys: see `isRecordKey`
  const self: Types.Mutable<RecordImpl> = Object.create(OperationsProto)
  self.key = key
  self.members = members
  self.slots = Object.keys(members).map((name) => ({ name, key: members[name] }))
  const spanned = new Set<string>()
  for (let i = 0; i < self.slots.length; i++) {
    const member = self.slots[i].key
    spanned.add(member.key)
    if (isRecordKey(member)) member.spanned.forEach((slot) => spanned.add(slot))
  }
  self.spanned = spanned
  watched.add(key)
  spanned.forEach((slot) => watched.add(slot))
  const template: Record<string, undefined> = {}
  for (let i = 0; i < self.slots.length; i++) template[self.slots[i].name] = undefined
  self.template = template
  self.assembled = new WeakMap()
  self.latest = undefined
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
