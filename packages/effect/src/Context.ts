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
      spanOf(key).cached = true
    }
    return self
  }
  return arguments.length > 0 ? init(arguments[0], arguments[1]) : init
} as any

// The read every getter starts with: one `lookup` of the slot. Only a slot
// that holds no current value goes further, to `readMiss`.
const readKey = (self: Context<never>, key: Slot<any, any>, orThrow: boolean): unknown => {
  const value = lookup(self, key.key)
  return value !== notFound && value !== assembling ? value : readMiss(self, key, value, orThrow)
}

// A reference's default, as at the branch point; a record service's string
// assembles the record from its members' slots; anything else is `notFound`
// or `Service not found`. Callers that pass `orThrow: false` resolve
// references themselves, as the branch point's getters do.
const readMiss = (self: Context<never>, key: Slot<any, any>, found: unknown, orThrow: boolean): unknown => {
  if (orThrow && isReference(key)) return getDefaultValue(key)
  const record = hasRecords ? spans.get(key.key)?.record : undefined
  if (record !== undefined) return assemble(record, self, found, orThrow)
  if (!orThrow) return notFound
  throw serviceNotFoundError(key)
}

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

// Flattening replays overlays into a copy of the base. An overlay is a value,
// or the `assembling` marker a member write leaves over the slot of every
// record spanning the member; the marker deletes the record's slot, so a flat
// map never holds a marker or a record that disagrees with its members. No
// registry is consulted: the overlays already say what to do.
const applyOverlays = (map: Map<string, any>, overlay: Overlay | undefined): void => {
  if (!overlay) return
  applyOverlays(map, overlay.parent)
  writeFlat(map, overlay.key, overlay.value)
}

const writeFlat = (map: Map<string, any>, key: string, value: unknown): void => {
  if (value === assembling) map.delete(key)
  else map.set(key, value)
}

// Slot writes that bring values in from another flat map (`merge`, `mergeAll`)
// or remove them (`omit`) have no overlays to say which records they shadow,
// so they ask the registry: the slot of every record spanning the key is
// dropped. A program with no record service skips the registry.
const setSlot = (map: Map<string, any>, key: string, value: unknown): void => {
  map.set(key, value)
  if (hasRecords) dropParents(map, key)
}

const deleteSlot = (map: Map<string, any>, key: string): void => {
  map.delete(key)
  if (hasRecords) dropParents(map, key)
}

const dropParents = (map: Map<string, any>, key: string): void => {
  const span = spans.get(key)
  if (span !== undefined) {
    for (const parent of span.parents) map.delete(parent)
  }
}

const flatten = (self: ContextImpl<any>): ReadonlyMap<string, any> => {
  if (self._flat) return self._flat
  if (!self.overlay) return self._flat = self.base
  const map = new Map(self.base)
  applyOverlays(map, self.overlay)
  return self._flat = map
}

const withFlat = <B>(self: Context<never>, f: (map: Map<string, any>) => void): Context<B> => {
  const map = new Map(self.mapUnsafe)
  f(map)
  return makeImpl(undefined, map, undefined, 0, (self as ContextImpl<any>).maxDepth)
}

// A private symbol so user code cannot forge a value that reads as absent
const notFound = Symbol()
// Written over a record service's slot, as an overlay, when one of its members
// is written on top of it: the stored record is no longer current and a read
// assembles one from the members' slots. Never reaches a flat map (flattening
// deletes the record's slot instead), so `mapUnsafe` never shows it.
const assembling = Symbol()

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
): Context<I> => {
  const record = hasRecords ? spans.get(key.key)?.record : undefined
  if (record === undefined) return makeUnsafe(new Map([[key.key, service]]))
  const map = new Map<string, any>()
  writeRecord(map, record, service)
  return makeUnsafe(map)
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
): Context<Services | I> => addUnsafe(self, key.key, service))

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
  // One registry read says what the string is, in place of the branch
  // point's `cacheKeys.has`. Most strings are one slot: the code below is the
  // branch point's.
  const span = spans.get(key)
  if (span !== undefined) return addSpan(self, key, service, span)
  const impl = self as ContextImpl<Services>
  if (impl.depth >= impl.maxDepth) {
    // Avoid mapUnsafe: it would flatten the parent before copying.
    const map = new Map(impl._flat ?? impl.base)
    if (!impl._flat) applyOverlays(map, impl.overlay)
    map.set(key, service)
    return makeImpl(impl.cacheRoot, map, undefined, 0, impl.maxDepth)
  }
  return makeImpl(
    impl.cacheRoot,
    impl.base,
    { key, value: service, parent: impl.overlay },
    impl.depth + 1,
    impl.maxDepth
  )
}

// A string the registry knows: a record service (its members' slots and its
// own, in a fresh flat map), a member of one or more records (the slot, then
// one marker over the slot of every record spanning it), or a fiber-cached key
// (one slot and a new cache root).
const addSpan = <Services, I, S>(
  self: Context<Services>,
  key: string,
  service: S,
  span: Span
): Context<Services | I> => {
  if (span.record !== undefined) return withFlat(self, (map) => writeRecord(map, span.record!, service))
  let context = addSlot(self, key, service, !span.cached)
  for (const parent of span.parents) context = addSlot(context, parent, assembling, true)
  return context
}

// Writes one slot as an overlay, or into a fresh flat map once the overlays
// are deep enough. `keepCache` is false for the keys fibers cache, whose write
// starts a new cache root.
const addSlot = <Services, I, S>(
  self: Context<Services>,
  key: string,
  service: S,
  keepCache: boolean
): Context<Services | I> => {
  const impl = self as ContextImpl<Services>
  const cacheRoot = keepCache ? impl.cacheRoot : undefined
  if (impl.depth >= impl.maxDepth) {
    // Avoid mapUnsafe: it would flatten the parent before copying.
    const map = new Map(impl._flat ?? impl.base)
    if (!impl._flat) applyOverlays(map, impl.overlay)
    writeFlat(map, key, service)
    return makeImpl(cacheRoot, map, undefined, 0, impl.maxDepth)
  }

  return makeImpl(
    cacheRoot,
    impl.base,
    { key, value: service, parent: impl.overlay },
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
  if (value !== notFound && value !== assembling) return value as A
  const record = hasRecords ? spans.get(key)?.record : undefined
  if (record === undefined) return undefined
  const assembled = assemble(record, self, value, false)
  return assembled === notFound ? undefined : assembled as A
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
    return value !== notFound && value !== assembling ? value as S : readMiss(self, service, value, true) as S
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
  return withFlat(self, (map) => that.mapUnsafe.forEach((value, key) => setSlot(map, key, value)))
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
      setSlot(map, key, value)
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
  const keep: Array<string> = []
  for (let i = 0; i < services.length; i++) slotsOf(services[i].key, keep)
  if (keep.length <= 1) {
    const map = new Map<string, unknown>()
    if (keep.length === 1) {
      const value = lookup(self, keep[0])
      if (value !== notFound && value !== assembling) map.set(keep[0], value)
    }
    return makeImpl(undefined, map, undefined, 0, (self as ContextImpl<any>).maxDepth)
  }
  const wanted = new Set(keep)
  return withFlat(self, (map) =>
    map.forEach((_, key) => {
      if (!wanted.has(key)) map.delete(key)
    }))
}

// The slots a string occupies: itself, and for a record service its members'
// slots, recursively.
const slotsOf = (key: string, into: Array<string>): void => {
  into.push(key)
  const record = hasRecords ? spans.get(key)?.record : undefined
  if (record !== undefined) {
    for (let i = 0; i < record.slots.length; i++) slotsOf(record.slots[i].key.key, into)
  }
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
    for (let i = 0; i < keys.length; i++) deleteKey(map, keys[i].key)
  })

// Deletes the slots a string occupies, and the slot of every record spanning
// any of them.
const deleteKey = (map: Map<string, any>, key: string): void => {
  const record = hasRecords ? spans.get(key)?.record : undefined
  if (record !== undefined) {
    for (let i = 0; i < record.slots.length; i++) deleteKey(map, record.slots[i].key.key)
  }
  deleteSlot(map, key)
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
 * A callable key: a `Context.Key` whose shape is a function, and which can be
 * called in place of the implementation stored under it.
 *
 * **Details**
 *
 * `Operation<Id, Shape>` is the call signature of `Shape` with the key added
 * to the requirements of its result, intersected with `Key<Id, Shape>`. It is
 * provided, overridden, read, picked and omitted like any key, with the
 * existing `Context`, `Layer` and `Effect` APIs. It is a plain function, not
 * an Effect: `Effect.isEffect` is false and it cannot be yielded.
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
  export type Signature = EffectSignature | StreamSignature | SinkSignature

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
  export type KeyFor<Id extends string, Shape extends Signature> = [keyof Shape] extends [never] ?
    Shape extends (...args: any) => infer Result ? [Id] extends [Requirements<Result>] ? Id
      : Derivable<Shape> extends true ? Id
      : `The shape of "${Id}" is generic or overloaded: its result must require "${Id}"`
    : never
    : "The shape has properties: an operation is a bare function"

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
 * An operation is a `Context.Key`, so it is provided with `Layer.succeed`,
 * `Layer.effect` or `Effect.provideService`, overridden the same way, and read
 * as a value with `Effect.service` or `Context.get`.
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
 * `Stream.Operation`. A member that is an Effect rather than a function is
 * written as a function of no arguments.
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
 * @see {@link Operations} for grouping keys into a record service
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const Operation = <Shape extends Operation.EffectSignature, Brand = unknown>(): <const Id extends string>(
  key: Operation.KeyFor<Id, Shape>
) => Operation<Id & Brand, Shape> =>
(key) => makeOperation(key as string, effectCall) as any

const effectCall = (operation: Operation.Any, receiver: unknown, args: ArrayLike<unknown>) =>
  withFiber((fiber) => Reflect.apply(readKey(fiber.context, operation, true) as any, receiver, args))

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
// Every value is stored under a string, and the string decides what a write
// does. Most strings are one slot. A record service's string is written as its
// members' slots and its own; a member's string, when written, marks every
// record spanning it; a fiber-cached key's string starts a new cache root. The
// registry below records which, by string, so that every key with the same
// string behaves the same way, and `add` learns it in the one `Map` read the
// branch point spent on its set of cached keys.
//
// Invariants, which together make a record read one lookup:
//
// 1. A flat map holds a record service's own slot only while that record
//    agrees with its members' slots. Writing a record writes the members first
//    and the record last; writing or deleting any other slot drops the slot of
//    every record spanning it.
// 2. The `assembling` marker appears only in overlays, written directly above
//    a member's overlay, one per record spanning the member. Flattening deletes
//    the record's slot where it meets a marker, so no flat map holds one.
// 3. A read that finds a value returns it. A read that finds a marker assembles
//    the record from its members' slots and caches it on the context; a read
//    that finds nothing assembles and caches it on the base map, shared by
//    every context on that base whose overlays touch no member.
//
// Lifecycle: the registry is a module-level map, one per loaded copy of this
// module, filled as contracts are constructed and never emptied. A record
// constructed twice with one string (a module re-evaluated under HMR, a test
// that builds contracts per case) replaces its entry and adds no duplicate
// parent. Two copies of `effect` in one process keep two registries: a key
// from one copy written through the other's `Context.add` is one slot.

interface Span {
  cached: boolean
  record: RecordImpl | undefined
  readonly parents: Set<string>
}
const spans = new Map<string, Span>()
let hasRecords = false

const spanOf = (key: string): Span => {
  let span = spans.get(key)
  if (span === undefined) spans.set(key, span = { cached: false, record: undefined, parents: new Set() })
  return span
}

interface RecordImpl extends Operations<any, any> {
  readonly slots: ReadonlyArray<{ readonly name: string; readonly key: Slot<any, any> }>
  /** Every slot the record spans, transitively, for the overlay check in `assemble`. */
  readonly spanned: Set<string>
  /** Assembled records, by context or by base map; see invariant 3. */
  readonly assembled: WeakMap<object, unknown>
  /** The most recent entry of `assembled`, so a server reading per request on one base compares one field. */
  lastKey: object | undefined
  lastValue: unknown
}

// Writes a record into a flat map: each member under its slot (a member that
// is itself a record is spread the same way), then the record under its own.
const writeRecord = (map: Map<string, any>, record: RecordImpl, value: any): void => {
  const slots = record.slots
  for (let i = 0; i < slots.length; i++) {
    const key = slots[i].key.key
    const nested = spans.get(key)?.record
    if (nested !== undefined) writeRecord(map, nested, value[slots[i].name])
    else setSlot(map, key, value[slots[i].name])
  }
  setSlot(map, record.key, value)
}

const assemble = (record: RecordImpl, self: Context<never>, found: unknown, orThrow: boolean): unknown => {
  const impl = self as ContextImpl<never>
  const cacheKey: object = found === assembling || overlaysTouch(record, impl) ? self : impl.base
  if (cacheKey === record.lastKey) return record.lastValue
  const cached = record.assembled.get(cacheKey)
  if (cached !== undefined) {
    record.lastKey = cacheKey
    record.lastValue = cached
    return cached
  }
  const value: Record<string, unknown> = {}
  const slots = record.slots
  for (let i = 0; i < slots.length; i++) {
    const key = slots[i].key
    let member = readKey(self, key, false)
    if (member === notFound) {
      if (isReference(key)) member = getDefaultValue(key)
      else if (orThrow) throw serviceNotFoundError(key)
      else return notFound
    }
    value[slots[i].name] = member
  }
  record.assembled.set(cacheKey, value)
  record.lastKey = cacheKey
  record.lastValue = value
  return value
}

// A member written as an overlay before its record existed carries no marker;
// such a context must not share the base's assembly.
const overlaysTouch = (record: RecordImpl, impl: ContextImpl<never>): boolean => {
  for (let overlay = impl.overlay; overlay; overlay = overlay.parent) {
    if (record.spanned.has(overlay.key)) return true
  }
  return false
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
  const self = Service<any, any>(key) as any as Types.Mutable<RecordImpl>
  Object.setPrototypeOf(self, OperationsProto)
  self.members = members
  self.slots = Object.keys(members).map((name) => ({ name, key: members[name] }))
  self.spanned = new Set()
  self.assembled = new WeakMap()
  self.lastKey = undefined
  self.lastValue = undefined
  // Rebuilding a record with the same string replaces its registration.
  spanOf(key).record = self
  const span = (member: string): void => {
    self.spanned.add(member)
    const memberSpan = spanOf(member)
    memberSpan.parents.add(key)
    if (memberSpan.record !== undefined) {
      for (let i = 0; i < memberSpan.record.slots.length; i++) span(memberSpan.record.slots[i].key.key)
    }
  }
  for (let i = 0; i < self.slots.length; i++) span(self.slots[i].key.key)
  hasRecords = true
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
