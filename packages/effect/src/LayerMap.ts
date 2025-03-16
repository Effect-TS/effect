/**
 * @since 3.14.0
 * @experimental
 */
import * as Context from "./Context.js"
import type * as Duration from "./Duration.js"
import * as Effect from "./Effect.js"
import { identity } from "./Function.js"
import * as Layer from "./Layer.js"
import * as RcMap from "./RcMap.js"
import * as Scope from "./Scope.js"
import type { Mutable } from "./Types.js"

/**
 * @since 3.14.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("effect/LayerMap")

/**
 * @since 3.14.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 3.14.0
 * @category Models
 * @experimental
 */
export interface LayerMap<in K, in out I, out S, out E = never> {
  readonly [TypeId]: TypeId

  /**
   * The internal RcMap that stores the resources.
   */
  readonly rcMap: RcMap.RcMap<K, readonly [Context.Context<I>, S], E>

  /**
   * Retrieves an instance of the resource associated with the key.
   */
  get(key: K): Effect.Effect<S, E, Scope.Scope>

  /**
   * Provides an instance of the resource associated with the key
   * to the given effect.
   */
  provide(key: K): <A, EX, R>(effect: Effect.Effect<A, EX, R>) => Effect.Effect<A, EX | E, Exclude<R, I>>

  /**
   * Invalidates the resource associated with the key.
   */
  invalidate(key: K): Effect.Effect<void>
}

/**
 * @since 3.14.0
 * @category Constructors
 * @experimental
 *
 * A `LayerMap` allows you to create a map of Layer's that can be used to
 * dynamically access resources based on a key.
 *
 * ```ts
 * import { Completions } from "@effect/ai"
 * import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"
 * import { FetchHttpClient } from "@effect/platform"
 * import { NodeRuntime } from "@effect/platform-node"
 * import { Config, Effect, Layer, LayerMap } from "effect"
 *
 * // create the openai client layer
 * const OpenAiLayer = OpenAiClient.layerConfig({
 *   apiKey: Config.redacted("OPENAI_API_KEY")
 * }).pipe(Layer.provide(FetchHttpClient.layer))
 *
 * // create a service that wraps a LayerMap
 * class AiClients extends LayerMap.Service<AiClients>()("AiClients", {
 *   // this LayerMap will provide the ai Completions service
 *   provides: Completions.Completions,
 *
 *   // define the lookup function for the layer map
 *   //
 *   // The returned Layer will be used to provide the Completions service for the
 *   // given model.
 *   lookup: (model: OpenAiCompletions.Model) => OpenAiCompletions.layer({ model }),
 *
 *   // If a layer is not used for a certain amount of time, it can be removed
 *   idleTimeToLive: "5 seconds",
 *
 *   // Supply the dependencies for the layers in the LayerMap
 *   dependencies: [OpenAiLayer]
 * }) {}
 *
 * // usage
 * Effect.gen(function*() {
 *   // access and use the generic Completions service
 *   const ai = yield* Completions.Completions
 *   const response = yield* ai.create("Hello, world!")
 *   console.log(response.text)
 * }).pipe(
 *   // use the AiClients service to provide a variant of the Completions service
 *   AiClients.provide("gpt-4o"),
 *   // provide the LayerMap service
 *   Effect.provide(AiClients.Default),
 *   NodeRuntime.runMain
 * )
 * ```
 */
export const make: <
  Accessor extends Context.Tag<any, any> | Effect.Effect<any, any, any>,
  K,
  L extends Layer.Layer<Exclude<Effect.Effect.Context<Accessor>, Scope.Scope>, any, any>
>(
  tagOrAccessor: Accessor,
  lookup: (key: K) => L,
  options?: {
    readonly idleTimeToLive?: Duration.DurationInput | undefined
  } | undefined
) => Effect.Effect<
  LayerMap<
    K,
    Exclude<Effect.Effect.Context<Accessor>, Scope.Scope>,
    Effect.Effect.Success<Accessor>,
    Effect.Effect.Error<Accessor> | (L extends Layer.Layer<infer _A, infer _E, infer _R> ? _E : never)
  >,
  never,
  Scope.Scope | (L extends Layer.Layer<infer _A, infer _E, infer _R> ? _R : never)
> = Effect.fnUntraced(function*<I, S, K, EL, RL, E = never>(
  tagOrAccessor: Effect.Effect<S, E, I>,
  lookup: (key: K) => Layer.Layer<Exclude<I, Scope.Scope>, EL, RL>,
  options?: {
    readonly idleTimeToLive?: Duration.DurationInput | undefined
  } | undefined
) {
  const context = yield* Effect.context<never>()

  // If we are inside another layer build, use the current memo map,
  // otherwise create a new one.
  const memoMap = context.unsafeMap.has(Layer.CurrentMemoMap.key)
    ? Context.get(context, Layer.CurrentMemoMap)
    : yield* Layer.makeMemoMap

  const rcMap = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(key: K) {
      const scope = yield* Effect.scope
      const context = yield* (Layer.buildWithMemoMap(lookup(key), memoMap, scope) as Effect.Effect<
        Context.Context<Exclude<I, Scope.Scope>>
      >)
      const service = yield* (Effect.provide(tagOrAccessor, context) as Effect.Effect<S>)
      return [context, service] as const
    }),
    idleTimeToLive: options?.idleTimeToLive
  })

  return identity<LayerMap<K, Exclude<I, Scope.Scope>, S, any>>({
    [TypeId]: TypeId,
    rcMap,
    get: (key) => Effect.map(RcMap.get(rcMap, key), ([, service]) => service),
    provide: (key) => (effect) =>
      Effect.scopedWith((scope) =>
        Effect.flatMap(
          Scope.extend(RcMap.get(rcMap, key), scope),
          ([context]) => Effect.provide(effect, context)
        )
      ),
    invalidate: (key) => RcMap.invalidate(rcMap, key)
  })
})

/**
 * @since 3.14.0
 * @category Constructors
 * @experimental
 */
export const fromRecord = <
  Accessor extends Context.Tag<any, any> | Effect.Effect<any, any, any>,
  const Layers extends Record<string, Layer.Layer<Exclude<Effect.Effect.Context<Accessor>, Scope.Scope>, any, any>>
>(
  tagOrAccessor: Accessor,
  layers: Layers,
  options?: {
    readonly idleTimeToLive?: Duration.DurationInput | undefined
  } | undefined
): Effect.Effect<
  LayerMap<
    keyof Layers,
    Exclude<Effect.Effect.Context<Accessor>, Scope.Scope>,
    Effect.Effect.Success<Accessor>,
    | Effect.Effect.Error<Accessor>
    | (Layers[keyof Layers] extends Layer.Layer<infer _A, infer _E, infer _R> ? _E : never)
  >,
  never,
  Scope.Scope | (Layers[keyof Layers] extends Layer.Layer<infer _A, infer _E, infer _R> ? _R : never)
> => make(tagOrAccessor, (key: keyof Layers) => layers[key], options)

/**
 * @since 3.14.0
 * @category Service
 */
export interface TagClass<
  in out Self,
  in out Id extends string,
  in out K,
  in out I,
  in out S,
  in out E,
  in out R,
  in out Deps extends Layer.Layer<any, any, any>
> extends Context.TagClass<Self, Id, LayerMap<K, I, S, E>> {
  /**
   * A default layer for the `LayerMap` service.
   */
  readonly Default: Layer.Layer<
    Self,
    (Deps extends Layer.Layer<infer _A, infer _E, infer _R> ? _E : never),
    | Exclude<R, (Deps extends Layer.Layer<infer _A, infer _E, infer _R> ? _A : never)>
    | (Deps extends Layer.Layer<infer _A, infer _E, infer _R> ? _R : never)
  >

  /**
   * A default layer for the `LayerMap` service without the dependencies provided.
   */
  readonly DefaultWithoutDependencies: Layer.Layer<Self, never, R>

  /**
   * Retrieves an instance of the resource associated with the key.
   */
  readonly get: (key: K) => Effect.Effect<S, E, Scope.Scope | Self>

  /**
   * Provides an instance of the resource associated with the key to the given
   * effect.
   */
  readonly provide: (
    key: K
  ) => <A, EX, R>(effect: Effect.Effect<A, EX, R>) => Effect.Effect<A, EX | E, Exclude<R, I> | Self>

  /**
   * Invalidates the resource associated with the key.
   */
  readonly invalidate: (key: K) => Effect.Effect<void, never, Self>
}

/**
 * @since 3.14.0
 * @category Service
 * @experimental
 *
 * Create a `LayerMap` service that provides a dynamic set of resources based on
 * a key.
 *
 * ```ts
 * import { Completions } from "@effect/ai"
 * import { OpenAiClient, OpenAiCompletions } from "@effect/ai-openai"
 * import { FetchHttpClient } from "@effect/platform"
 * import { NodeRuntime } from "@effect/platform-node"
 * import { Config, Effect, Layer, LayerMap } from "effect"
 *
 * // create the openai client layer
 * const OpenAiLayer = OpenAiClient.layerConfig({
 *   apiKey: Config.redacted("OPENAI_API_KEY")
 * }).pipe(Layer.provide(FetchHttpClient.layer))
 *
 * // create a service that wraps a LayerMap
 * class AiClients extends LayerMap.Service<AiClients>()("AiClients", {
 *   // this LayerMap will provide the ai Completions service
 *   provides: Completions.Completions,
 *
 *   // define the lookup function for the layer map
 *   //
 *   // The returned Layer will be used to provide the Completions service for the
 *   // given model.
 *   lookup: (model: OpenAiCompletions.Model) => OpenAiCompletions.layer({ model }),
 *
 *   // If a layer is not used for a certain amount of time, it can be removed
 *   idleTimeToLive: "5 seconds",
 *
 *   // Supply the dependencies for the layers in the LayerMap
 *   dependencies: [OpenAiLayer]
 * }) {}
 *
 * // usage
 * Effect.gen(function*() {
 *   // access and use the generic Completions service
 *   const ai = yield* Completions.Completions
 *   const response = yield* ai.create("Hello, world!")
 *   console.log(response.text)
 * }).pipe(
 *   // use the AiClients service to provide a variant of the Completions service
 *   AiClients.provide("gpt-4o"),
 *   // provide the LayerMap service
 *   Effect.provide(AiClients.Default),
 *   NodeRuntime.runMain
 * )
 * ```
 */
export const Service = <Self>() =>
<
  const Id extends string,
  Accessor extends Context.Tag<any, any> | Effect.Effect<any, any, any>,
  Lookup extends {
    readonly lookup: (key: any) => Layer.Layer<Exclude<Effect.Effect.Context<Accessor>, Scope.Scope>, any, any>
  } | {
    readonly layers: Record<string, Layer.Layer<Exclude<Effect.Effect.Context<Accessor>, Scope.Scope>, any, any>>
  },
  const Deps extends ReadonlyArray<Layer.Layer<any, any, any>> = []
>(
  id: Id,
  options: Lookup & {
    readonly provides: Accessor
    readonly dependencies?: Deps | undefined
    readonly idleTimeToLive?: Duration.DurationInput | undefined
  }
): TagClass<
  Self,
  Id,
  Lookup extends { readonly lookup: (key: infer K) => any } ? K
    : Lookup extends { readonly layers: infer Layers } ? keyof Layers
    : never,
  Exclude<Effect.Effect.Context<Accessor>, Scope.Scope>,
  Effect.Effect.Success<Accessor>,
  Effect.Effect.Error<Accessor> | Service.Error<Lookup>,
  Service.Context<Lookup>,
  Deps[number]
> => {
  const Err = globalThis.Error as any
  const limit = Err.stackTraceLimit
  Err.stackTraceLimit = 2
  const creationError = new Err()
  Err.stackTraceLimit = limit

  function TagClass() {}
  const TagClass_ = TagClass as any as Mutable<TagClass<Self, Id, string, any, any, any, any, any>>
  Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag<Self, any>(id)))
  TagClass.key = id
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack
    }
  })
  TagClass_.get = (key: string) => Effect.flatMap(TagClass_, (layerMap) => layerMap.get(key))
  TagClass_.provide = (key: string) => (effect) =>
    Effect.flatMap(TagClass_, (layerMap) => layerMap.provide(key)(effect))
  TagClass_.invalidate = (key: string) => Effect.flatMap(TagClass_, (layerMap) => layerMap.invalidate(key))

  TagClass_.DefaultWithoutDependencies = Layer.scoped(
    TagClass_,
    "lookup" in options
      ? make(options.provides, options.lookup, options)
      : fromRecord(options.provides, options.layers as any, options)
  )
  TagClass_.Default = options.dependencies && options.dependencies.length > 0 ?
    Layer.provide(TagClass_.DefaultWithoutDependencies, options.dependencies as any) :
    TagClass_.DefaultWithoutDependencies

  return TagClass as any
}

/**
 * @since 3.14.0
 * @category Service
 * @experimental
 */
export declare namespace Service {
  /**
   * @since 3.14.0
   * @category Service
   * @experimental
   */
  export type Key<Options> = Options extends { readonly lookup: (key: infer K) => any } ? K
    : Options extends { readonly layers: infer Layers } ? keyof Layers
    : never

  /**
   * @since 3.14.0
   * @category Service
   * @experimental
   */
  export type Layers<Options> = Options extends { readonly lookup: (key: infer _K) => infer Layers } ? Layers
    : Options extends { readonly layers: infer Layers } ? Layers[keyof Layers]
    : never

  /**
   * @since 3.14.0
   * @category Service
   * @experimental
   */
  export type Error<Options> = Layers<Options> extends Layer.Layer<infer _A, infer _E, infer _R> ? _E : never

  /**
   * @since 3.14.0
   * @category Service
   * @experimental
   */
  export type Context<Options> = Layers<Options> extends Layer.Layer<infer _A, infer _E, infer _R> ? _R : never
}
