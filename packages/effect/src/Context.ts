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

// A record service is the one kind of key that carries the `Operations`
// brand; like every other key it is a function, so the brand, not the
// `typeof`, tells it apart, and no getter loads another property of a key
// before `lookup`, as at the branch point. Each getter tests this inline, so
// that the loads of `key.key` stay one per getter, as they are at the branch
// point, rather than one site shared by all.
const isRecordKey = (key: Slot<any, any>): key is RecordImpl => (key as any)[OperationsTypeId] !== undefined

// The strings of the keys fibers cache: a write to one starts a new cache root.
const cacheKeys = new Set<string>()

const ServiceProto: any = {
  [ServiceTypeId]: ServiceTypeId,
  ...Effectable.Prototype<Service<never, any>>({
    label: "Service",
    evaluate(fiber) {
      return exitSucceed(get(fiber.context, this as any))
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
    return withFiber((fiber) => f(get(fiber.context, this)))
  },
  useSync<A>(this: Service<never, any>, f: (service: any) => A): Effect<A, never, never> {
    return withFiber((fiber) => exitSucceed(f(get(fiber.context, this))))
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
  /** Written by a record write, as one of its slots, rather than by adding the key alone. */
  readonly write: boolean
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

const lookup = (self: Context<any>, key: string): unknown => {
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
): Context<I> => isRecordKey(key) ? key["~write"](emptyContext, service) : makeUnsafe(new Map([[key.key, service]]))

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
): Context<Services | I> => isRecordKey(key) ? key["~write"](self, service) : addUnsafe(self, key.key, service))

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
    { key, value: service, parent: impl.overlay, write: false },
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
  const value = isRecordKey(key) ? key["~read"](self, false) : lookup(self, key.key)
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
    const value = isRecordKey(key) ? key["~read"](self, false) : lookup(self, key.key)
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
    const value = isRecordKey(service) ? service["~read"](self, true) : lookup(self, service.key)
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
  const value = isRecordKey(service) ? service["~read"](self, false) : lookup(self, service.key)
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
  if (services.length <= 1 && !services.some(isRecordKey)) {
    const map = new Map<string, unknown>()
    if (services.length === 1) {
      const key = services[0].key
      const value = lookup(self, key)
      if (value !== notFound) map.set(key, value)
    }
    return makeImpl(undefined, map, undefined, 0, (self as ContextImpl<any>).maxDepth)
  }
  // a record service keeps every slot it writes
  const keep = new Set(services.flatMap((key) => isRecordKey(key) ? key["~layout"].slots : [key.key]))
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
    for (const key of keys) {
      // a record service deletes every slot it writes
      for (const slot of isRecordKey(key) ? key["~layout"].slots : [key.key]) map.delete(slot)
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
   * adding the key to each result's requirements (`Derive`); `KeyFor`
   * rejects shapes for which the derived signature would lose information.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Call<Id extends string, Shape extends Signature> = Shape extends (...args: any) => infer Result ?
    [Id] extends [Requirements<Result>] ? Shape : Derive<Shape, Id>
    : Shape extends Effect<infer A, infer E, infer R> ? [Id] extends [R] ? Shape : Effect<A, E, R | Id>
    : never

  /**
   * The shape's call signature with the key added to each result's
   * requirements: one signature, or up to four overloads, each derived
   * separately. A shape it cannot rebuild exactly (a generic one whose type
   * parameter reaches the result, or more than four overloads) derives its
   * last signature at its constraints, which `KeyFor` rejects.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Derive<Shape, Id> = Shape extends (this: infer T, ...args: infer A) => infer R ?
    [(this: T, ...args: A) => R] extends [Shape] ? (this: T, ...args: A) => Require<R, Id>
    : Shape extends {
      (this: infer T1, ...args: infer A1): infer R1
      (this: infer T2, ...args: infer A2): infer R2
    } ? [((this: T1, ...args: A1) => R1) & ((this: T2, ...args: A2) => R2)] extends [Shape] ?
          & ((this: T1, ...args: A1) => Require<R1, Id>)
          & ((this: T2, ...args: A2) => Require<R2, Id>)
      : Shape extends {
        (this: infer T1, ...args: infer A1): infer R1
        (this: infer T2, ...args: infer A2): infer R2
        (this: infer T3, ...args: infer A3): infer R3
      } ?
        [((this: T1, ...args: A1) => R1) & ((this: T2, ...args: A2) => R2) & ((this: T3, ...args: A3) => R3)] extends
          [Shape] ?
            & ((this: T1, ...args: A1) => Require<R1, Id>)
            & ((this: T2, ...args: A2) => Require<R2, Id>)
            & ((this: T3, ...args: A3) => Require<R3, Id>)
        : Shape extends {
          (this: infer T1, ...args: infer A1): infer R1
          (this: infer T2, ...args: infer A2): infer R2
          (this: infer T3, ...args: infer A3): infer R3
          (this: infer T4, ...args: infer A4): infer R4
        } ? [
            & ((this: T1, ...args: A1) => R1)
            & ((this: T2, ...args: A2) => R2)
            & ((this: T3, ...args: A3) => R3)
            & ((this: T4, ...args: A4) => R4)
          ] extends [Shape] ?
              & ((this: T1, ...args: A1) => Require<R1, Id>)
              & ((this: T2, ...args: A2) => Require<R2, Id>)
              & ((this: T3, ...args: A3) => Require<R3, Id>)
              & ((this: T4, ...args: A4) => Require<R4, Id>)
          : (this: T, ...args: A) => Require<R, Id>
        : (this: T, ...args: A) => Require<R, Id>
      : (this: T, ...args: A) => Require<R, Id>
    : (this: T, ...args: A) => Require<R, Id>
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
   * shape itself. True for a plain signature and for up to four overloads;
   * false for a generic signature whose type parameter appears in the result,
   * because deriving instantiates type parameters at their constraints.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Derivable<Shape extends Signature> = Shape extends (...args: any) => any ?
    [Derive<Shape, never>] extends [Shape] ? true
    : false
    : false

  /**
   * The key parameter of an operation constructor: the key itself when the
   * shape's result is of the constructor's kind and names the key or can be
   * derived from, otherwise a message explaining why the definition is
   * rejected. A shape declaring `this` is rejected: an operation passes no
   * receiver, so an implementation's `this` is the object that provides it.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type KeyFor<Id extends string, Shape extends Signature, Kind extends ResultKind = "Effect"> = Shape extends
    (...args: any) => infer Result ?
    [keyof Shape] extends [never] ?
      void extends ThisParameterType<Shape> ? [KindOf<Result>] extends [Kind] ? [Id] extends [Requirements<Result>] ? Id
          : Derivable<Shape> extends true ? Id
          : `The shape of "${Id}" is generic: its result must require "${Id}"`
        : Fix[KindOf<Result>]
      : "The shape declares this: an implementation's receiver is the object that provides it"
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
 * fiber's context each time that result runs, and the call's arguments are
 * forwarded to it, with no receiver. Operations have no default
 * implementation.
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
 * **Gotchas**
 *
 * An overloaded shape (up to four overloads) is derived overload by overload.
 * A generic shape whose type parameter reaches its result names its key in
 * that result, otherwise the definition does not compile; a generic overload
 * inside an overload set is derived at its constraint unless it names its key.
 * A shape returning a Stream is defined with
 * `Stream.Operation`. A shape with properties is rejected: an operation is a
 * bare function. A shape declaring `this` is rejected: an implementation's
 * `this` is the object that provides it, never the caller's.
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
  <Shape extends Operation.FunctionSignature>(): <const Id extends string>(
    key: Operation.KeyFor<Id, Shape>
  ) => Operation<Id, Shape>
  /**
   * Creates an operation whose shape is an Effect: the Effect itself with the
   * key added to its requirements. Running it reads the implementation from
   * the running fiber's context and runs that.
   *
   * @since 4.0.0
   */
  readonly value: <Shape extends Operation.EffectValue>() => <const Id extends string>(
    key: Id
  ) => Operation<Id, Shape>
} = Object.assign(
  () => (key: string) => makeOperation(key, effectCall),
  { value: () => (key: string) => makeValueOperation(key) }
) as any

// The implementation is called without a receiver, whatever the call site: a
// record write stores each operation member bound to the object that provides
// it, so its `this` is that object from a bare call, a destructured member,
// `Effect.andThen` or a bundled namespace call alike.
const effectCall = (operation: Operation.Any, args: ArrayLike<unknown>) =>
  withFiber((fiber) => Reflect.apply(getUnsafe(fiber.context, operation) as any, undefined, args))

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
 * The implementation applied to a call's arguments, as an Effect of the
 * result. `Stream.Operation` and `Sink.Operation` unwrap it.
 *
 * @internal
 */
export const applyOperation = (
  operation: Operation.Any,
  args: ArrayLike<unknown>
): Effect<unknown> =>
  withFiberSucceed((fiber) => Reflect.apply(getUnsafe(fiber.context, operation) as any, undefined, args))

const operationToJSON = function(this: Operation.Any) {
  return {
    _id: "Operation",
    key: this.key
  }
}

/** @internal */
export const makeOperation = (
  key: string,
  call: (operation: Operation.Any, args: ArrayLike<unknown>) => unknown
): Operation.Any => {
  // the computed property names the function after the key without redefining `name`; the brand, `key` and
  // `toJSON` are own properties, so the function keeps `Function.prototype` and `.bind` and friends work. It
  // carries no `ServiceTypeId`: an operation is a slot, not a key.
  const operation = {
    [key]: function() {
      return call(operation as any, arguments)
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
 * A record service: a `Context.Service` whose members are keys, and which is
 * nothing but its members.
 *
 * **Details**
 *
 * An `Operations` key's shape is the record of its members' shapes and its
 * identifier is the union of its members' identifiers. Providing it writes
 * each member under that member's key and nothing else; reading it returns a
 * plain object with every member as its own property, built from the members'
 * slots, so an override of one member provided on top is in it, nested records
 * included. Each slot has one name in a record. An operation's
 * implementation is stored bound to the object that provides it, plain object
 * or class instance; any other member (a value operation, a service, a class)
 * is stored as the object holds it, with its identity and properties. The
 * members are also properties of the key, so `Users.find(id)` calls the
 * operation `find` of `Users = Context.Operations("app/Users", { find, … })`.
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
   * The shape of a record service: the record of its members' shapes. A
   * contract names it with an interface so diagnostics print the name:
   * `interface Shape extends Context.Operations.Shape<typeof members> {}`.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Shape<Ops extends Members> = { readonly [K in keyof Ops]: Service.Shape<Ops[K]> }

  /**
   * The type of a record built with the one-line form,
   * `Context.Operations(key, members)`: the record key with its members as
   * properties, printed with its key first, `Of<"app/Users", { … }>`.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Of<Key extends string, Ops extends Members> = Operations<Identifier<Ops>, Shape<Ops>> & Ops & {
    readonly key: Key
  }

  /**
   * The member names that are also properties of every record key (`use`,
   * `key`, `members`, `name`, …), which a record cannot expose as
   * properties of its own.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Reserved<Ops extends Members> = keyof Ops & (keyof Operations<any, any> | "name")

  /**
   * The literal string identifiers two members of a record share: a slot
   * reachable under two names (an alias, a nested record sharing a member, two
   * overlapping subsets), which a record rejects. A member whose identifier is
   * not a literal (`Context.Service<string>(key)`) is checked when the record
   * is constructed.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Shared<Ops extends Members> = {
    [K in keyof Ops]: Service.Identifier<Ops[K]> extends infer I ?
      I extends string ? string extends I ? never : Extract<Identifier<Omit<Ops, K>>, I> : never
      : never
  }[keyof Ops]

  /**
   * The key parameter of `Context.Operations(key, members)`: the key, or a
   * message naming a member whose name is a property of every key, or a slot
   * two members share.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Key<Ops extends Members, Name extends string = string> = [Reserved<Ops>] extends [never] ?
    [Shared<Ops>] extends [never] ? Name
    : `"${Shared<Ops> & string}" is reachable under two names: a slot has one name in a record`
    : `Member "${Reserved<Ops> & string}" has the name of a property of the key: rename it`

  /**
   * The key parameter of `Context.Operations<Self, Shape>()`: `string` when
   * `Self` contains every member's identifier and `Shape`, if given, is the
   * members' shape; otherwise a message naming the difference, so the error
   * lands on the key argument and reads as a sentence.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type KeyFor<Self, S, Ops extends Members> = unknown extends Self ?
    "Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"
    : [Identifier<Ops>] extends [Self] ? [S] extends [Types.unassigned] ? Key<Ops>
      : [S] extends [Shape<Ops>] ? [Shape<Ops>] extends [S] ? Key<Ops>
        : "Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"
      : "Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"
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
 * member and nothing else.
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
 * members' identifiers) and the shape (the record of their shapes), and the
 * members are properties of the key. A library names both, with the curried
 * form, as `Context.Service<Self, Shape>()` does: `type Self =
 * Context.Operations.Identifier<typeof members>`, `interface Shape extends
 * Context.Operations.Shape<typeof members> {}`, and `const Self =
 * Context.Operations<Self, Shape>()(key, members)`; diagnostics then print
 * `Self` and `Shape` instead of the members. The `Shape` argument is optional.
 * A declared identifier may be wider than the members' union; one that lacks a
 * member, a shape that is not the members' shape, a member whose name is a
 * property of every key, or a slot reachable under two names (an alias, a
 * nested record sharing a member), is a compile error on the key argument that
 * names it, and a defect when the types are bypassed.
 *
 * At run time a record is its members: providing it writes each member's slot
 * and no slot of its own, so `Layer.succeed(Record, impl)` and the merge of one
 * layer per member are the same context. Reading it returns a plain object
 * built from the slots; it is not the provided object, so `instanceof` and
 * identity do not survive a record read. A member missing from the provided
 * object is a defect naming the member's key.
 *
 * **Gotchas**
 *
 * An operation's implementation is bound to the object that provides it,
 * plain object or class instance: its `this` is that object from every call
 * site (`Users.create(x)`, a bare `create(x)`, `const { create } = yield*
 * Users`, `Effect.andThen(_, Users.create)`), and private fields work. So
 * `this.find(id)` is the object's own `find`, like a closure calling a
 * sibling closure, and a test's override of `find` does not reach it. Call a
 * sibling through its operation, `Users.find(id)`, which reads the context
 * and sees an override wherever it is provided.
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
 * // A member can be called on its own or through the key, or the record can be yielded
 * const program = Effect.gen(function*() {
 *   const direct = yield* readFile("a.txt")
 *   const viaKey = yield* FileSystem.readFile("b.txt")
 *   const fs = yield* FileSystem
 *   const viaRecord = yield* fs.readFile("c.txt")
 *   return [direct, viaKey, viaRecord]
 * })
 *
 * const result = Effect.runSync(Effect.provide(program, live))
 * result // => ["contents of a.txt", "contents of b.txt", "contents of c.txt"]
 * ```
 *
 * @see {@link Operation} for defining a member
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const Operations: {
  <const Name extends string, const Ops extends Operations.Members>(
    key: Operations.Key<Ops, Name>,
    members: Ops
  ): Operations.Of<Name, Ops>
  <Self, Shape = Types.unassigned>(): <const Ops extends Operations.Members>(
    key: Operations.KeyFor<Self, Shape, Ops>,
    members: Ops
  ) => Operations<Self, Operations.ShapeOf<Shape, Ops>> & Ops
} = function() {
  return arguments.length === 0
    ? (key: string, members: Operations.Members) => makeOperations(key, members)
    : makeOperations(arguments[0], arguments[1])
} as any

// -----------------------------------------------------------------------------
// Record services
// -----------------------------------------------------------------------------
//
// A record service is its members and nothing else. Written into a context, it
// is one ordinary overlay per slot it writes (one per member; a member that is
// a record contributes its own slots), or one flat map when the context is
// empty or at `maxDepth`: no overlay, map or getter knows what a record is, and
// `lookup` is the branch point's. A slot has one name in a record, so a write
// gives each slot one value and a read cannot disagree with the slots. Reading
// returns a plain object built from the slots alone, every time it is built: a
// nested record is rebuilt from the same slots, never patched. The one cache is
// a `WeakMap` from the storage a read starts at to the object built there.

interface RecordImpl extends Operations<any, any> {
  /** What the record writes and reads, fixed when the key is constructed. */
  readonly "~layout": RecordLayout
  /** The object built for each storage (an overlay or a base map): the one mutable piece. */
  readonly "~views": WeakMap<object, object>
  readonly "~write": <Services>(self: Context<Services>, value: unknown) => Context<any>
  readonly "~read": (self: Context<never>, orThrow: boolean) => unknown
}

interface RecordLayout {
  /**
   * The members in declaration order: the name each is read at, its slot, and
   * the positions its slots take in `slots` (one for a plain member, every
   * slot of a member that is a record, in that record's order).
   */
  readonly members: ReadonlyArray<{
    readonly name: string
    readonly key: Slot<any, any>
    readonly positions: ReadonlyArray<number>
    /** The key, when the member is a record. */
    readonly record: RecordImpl | undefined
  }>
  /** Every slot the record writes, in writing order; each appears once. */
  readonly slots: ReadonlyArray<string>
  /** The position of each slot in `slots`. */
  readonly positions: ReadonlyMap<string, number>
  /** The name of each slot that is a member itself, not a slot of a member record. */
  readonly names: ReadonlyMap<string, string>
}

// The value of every slot the record writes, by position, from the provided
// object. A member `value` lacks (`in` is false: a member whose value is
// `undefined` is a member) is a defect naming its slot. One rule for the
// receiver: the implementation of a function operation is stored bound to the
// object that provides it, own or inherited, plain object or class instance,
// so its `this` is that object wherever the operation is called from (a bare
// call, a destructured member, `Effect.andThen`, a bundled namespace call)
// and a private field works. Its `this.sibling` is therefore the object's own
// sibling, as a closure's call of a sibling closure is; calling the operation
// is what reads the context. Every other member (a value, a value operation, a
// `Context.Service` member whose shape is a function or a class) is stored as
// the object holds it, so its identity, `name`, properties and statics
// survive the write.
const collect = (
  record: RecordImpl,
  value: any,
  values: Array<unknown>,
  positions: ReadonlyArray<number> | undefined
): void => {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    throw missingMember(record, record["~layout"].members[0])
  }
  const members = record["~layout"].members
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    if (!(member.name in value)) throw missingMember(record, member)
    const provided = value[member.name]
    if (member.record !== undefined) {
      collect(member.record, provided, values, positions ? member.positions.map((p) => positions[p]) : member.positions)
    } else {
      const position = positions ? positions[member.positions[0]] : member.positions[0]
      values[position] = typeof provided === "function" && typeof member.key === "function" &&
          OperationTypeId in member.key
        ? bind.call(provided, value)
        : provided
    }
  }
}

const bind = Function.prototype.bind

const missingMember = (record: RecordImpl, member: RecordLayout["members"][number] | undefined) => {
  const error = new Error(
    member === undefined
      ? `Service not found: ${record.key}`
      : `Service not found: ${member.key.key} (the object provided for ${record.key} has no member "${member.name}")`
  )
  error.name = "ServiceNotFoundError"
  return error
}

// `Context.make` and `Context.add` for a record service: the members' slots,
// written as a flat map into a context that holds nothing or whose overlays
// have reached `maxDepth`, and as one ordinary overlay per slot otherwise,
// counting as one `add` toward `maxDepth`. A fiber-cached key among the
// slots starts a new cache root, as its own write would.
function writeRecord<Services>(this: RecordImpl, self: Context<Services>, value: unknown): Context<any> {
  const impl = self as ContextImpl<Services>
  const slots = this["~layout"].slots
  const values = new Array<unknown>(slots.length)
  collect(this, value, values, undefined)
  let cacheRoot: ContextImpl<any> | undefined = impl.cacheRoot
  for (let i = 0; i < slots.length; i++) {
    if (cacheKeys.has(slots[i])) {
      cacheRoot = undefined
      break
    }
  }
  if (impl.depth >= impl.maxDepth || (impl.overlay === undefined && impl.base.size === 0)) {
    const map = new Map(impl._flat ?? impl.base)
    if (!impl._flat) applyOverlays(map, impl.overlay)
    for (let i = 0; i < slots.length; i++) map.set(slots[i], values[i])
    return makeImpl(cacheRoot, map, undefined, 0, impl.maxDepth)
  }
  let overlay = impl.overlay
  for (let i = 0; i < slots.length; i++) overlay = { key: slots[i], value: values[i], parent: overlay, write: true }
  return makeImpl(cacheRoot, impl.base, overlay, impl.depth + 1, impl.maxDepth)
}

// The record as seen from a context: the members' slots read from the topmost
// overlay that holds one of them (or the base map, when none does), its
// storage. Overlays above the storage hold other slots and cannot change the
// result. A read either returns the object kept for its storage or builds one
// from the slots in one walk and keeps it there, with one shortcut: a direct
// member added alone (an override, not a slot of a record write) is the record
// of the storage below it, built and kept there first if it was never read,
// with the member replaced.
// A slot has one name, so the copy is what building would give; it is not
// kept, so a per-request override costs one copy and leaves nothing behind,
// whether or not the storage below was read before. The shortcut looks one
// storage down and never recurses, so a record write's own overlays, a subset
// written over the full record or a stack of overrides are built once, in one
// walk, and kept. A missing member makes the result `notFound`, or a defect
// naming the member when `orThrow` is set, and nothing is kept.
function readRecord(this: RecordImpl, self: Context<never>, orThrow: boolean): unknown {
  const impl = self as ContextImpl<never>
  const layout = this["~layout"]
  const views = this["~views"]
  let scope = impl.overlay
  while (scope !== undefined && !layout.positions.has(scope.key)) scope = scope.parent
  const base = impl.base
  const storage: object = scope ?? base
  const known = views.get(storage)
  if (known !== undefined) return known
  const name = scope === undefined || scope.write ? undefined : layout.names.get(scope.key)
  if (name !== undefined) {
    let below = scope!.parent
    while (below !== undefined && !layout.positions.has(below.key)) below = below.parent
    // the storage below is built and kept on the way: a layer's context may be read through per-request
    // overrides alone, and each would otherwise build and keep its own
    const kept = keep(this, below, base)
    if (kept !== undefined) return { ...kept, [name]: scope!.value }
  }
  const view = assemble(this, gather(layout, scope, base), orThrow)
  if (view !== notFound) views.set(storage, view as object)
  return view
}

// The record of a storage (an overlay, or the base map when `scope` is
// undefined): the kept object, or one built in one walk and kept, or
// `undefined` when a member is missing from it.
const keep = (record: RecordImpl, scope: Overlay | undefined, base: ReadonlyMap<string, any>): object | undefined => {
  const storage: object = scope ?? base
  const known = record["~views"].get(storage)
  if (known !== undefined) return known
  const view = assemble(record, gather(record["~layout"], scope, base), false)
  if (view === notFound) return undefined
  record["~views"].set(storage, view as object)
  return view as object
}

// The value of every slot of the record, by position, from `scope` down to
// `base`, in one walk, `notFound` where none is written. Not `lookup`: these
// reads must not advance the flatten counter.
const gather = (layout: RecordLayout, scope: Overlay | undefined, base: ReadonlyMap<string, any>): Array<unknown> => {
  const slots = layout.slots
  const values = new Array<unknown>(slots.length).fill(notFound)
  let missing = slots.length
  for (let o = scope; o !== undefined && missing > 0; o = o.parent) {
    const position = layout.positions.get(o.key)
    if (position !== undefined && values[position] === notFound) {
      values[position] = o.value
      missing--
    }
  }
  for (let i = 0; missing > 0 && i < slots.length; i++) {
    if (values[i] !== notFound) continue
    const value = base.get(slots[i])
    if (value !== undefined || base.has(slots[i])) {
      values[i] = value
      missing--
    }
  }
  return values
}

// A plain object with every member as its own property, in the record's
// order, from the slot values by position: a member that is a record is built
// the same way from its own positions. A missing reference reads its default;
// any other missing member is `Service not found: <member key>` when
// `orThrow` is set and `notFound` otherwise.
const assemble = (record: RecordImpl, values: ReadonlyArray<unknown>, orThrow: boolean): unknown => {
  const members = record["~layout"].members
  const object: Record<string, unknown> = {}
  for (let i = 0; i < members.length; i++) {
    const { key, name, positions, record: nested } = members[i]
    let member: unknown
    if (nested !== undefined) {
      member = assemble(nested, positions.map((p) => values[p]), orThrow)
      if (member === notFound) return notFound
    } else {
      member = values[positions[0]]
      if (member === notFound) {
        if (isReference(key)) member = getDefaultValue(key)
        else if (orThrow) throw serviceNotFoundError(key)
        else return notFound
      }
    }
    object[name] = member
  }
  return object
}

// `Object.assign` and a literal property name, as for `ValueOperationProto`:
// this is the one reference to the record code, and a bundle holding no
// record drops it with the prototype.
const OperationsProto = Object.assign({}, ServiceProto, {
  "~effect/Context/Operations": OperationsTypeId,
  "~write": writeRecord,
  "~read": readRecord,
  // `yield*`, `use` and `useSync` read the record as its key defines, without
  // passing through the getters: the record path stays out of the code the
  // optimiser compiles for ordinary keys.
  evaluate(this: RecordImpl, fiber: { readonly context: Context<never> }) {
    return exitSucceed(readRecord.call(this, fiber.context, true))
  },
  use(this: RecordImpl, f: (service: any) => Effect<any, any, any>): Effect<any, any, any> {
    return withFiber((fiber) => f(readRecord.call(this, fiber.context, true)))
  },
  useSync(this: RecordImpl, f: (service: any) => any): Effect<any, never, never> {
    return withFiber((fiber) => exitSucceed(f(readRecord.call(this, fiber.context, true))))
  },
  toJSON(this: RecordImpl) {
    return {
      _id: "Operations",
      key: this.key,
      members: Object.keys(this.members)
    }
  }
})

const makeOperations = (key: string, members: Operations.Members): Operations<any, any> => {
  // A function, like every other key, named after its key and without a
  // `prototype` or `length`; its prototype is the records' one. The members
  // are its own properties, so that `Record.member(...)` is the member.
  const self: Types.Mutable<RecordImpl> = ({ [key]: () => {} })[key] as any
  delete (self as any).length
  Object.setPrototypeOf(self, OperationsProto)
  self.key = key
  self.members = members
  self["~layout"] = makeLayout(key, members)
  self["~views"] = new WeakMap()
  for (const name of Object.keys(members)) {
    if (name in self) {
      throw new Error(`Context.Operations: member "${name}" of ${key} has the name of a property of the key: rename it`)
    }
  }
  for (const name of Object.keys(members)) (self as any)[name] = members[name]
  return self
}

const makeLayout = (key: string, members: Operations.Members): RecordLayout => {
  const slots: Array<string> = []
  const positions = new Map<string, number>()
  const names = new Map<string, string>()
  const owner = new Map<string, string>()
  const position = (slot: string, path: string): number => {
    if (positions.has(slot)) {
      throw new Error(
        `Context.Operations: "${
          owner.get(slot)
        }" and "${path}" of ${key} are one slot, ${slot}: a slot has one name in a record`
      )
    }
    positions.set(slot, slots.length)
    owner.set(slot, path)
    slots.push(slot)
    return slots.length - 1
  }
  const pathsOf = (record: RecordImpl, prefix: string): Array<string> =>
    record["~layout"].members.flatMap(({ key, name }) =>
      isRecordKey(key) ? pathsOf(key, `${prefix}.${name}`) : [`${prefix}.${name}`]
    )
  return {
    members: Object.keys(members).map((name) => {
      const member = members[name]
      if (isRecordKey(member)) {
        const paths = pathsOf(member, name)
        return {
          name,
          key: member,
          positions: member["~layout"].slots.map((slot, i) => position(slot, paths[i])),
          record: member
        }
      }
      names.set(member.key, name)
      return { name, key: member, positions: [position(member.key, name)], record: undefined }
    }),
    slots,
    positions,
    names
  }
}

/**
 * Tests whether a key is a record service.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isOperations = (u: unknown): u is Operations<any, any> => hasProperty(u, OperationsTypeId)
