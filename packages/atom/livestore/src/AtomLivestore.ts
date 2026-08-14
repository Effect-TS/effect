/**
 * Connects [LiveStore](https://livestore.dev) stores to atoms.
 *
 * `Tag` creates a `Context.Service` class for a LiveStore `Store`, backed by
 * an atom runtime. The service exposes atoms for accessing the store, helpers
 * for creating reactive query atoms that update whenever the underlying data
 * changes, and a writable atom for committing events to the store.
 *
 * @since 4.0.0
 */
import type {
  CreateStoreOptions,
  LiveStoreEvent,
  LiveStoreSchema,
  OtelOptions,
  Queryable,
  Store
} from "@livestore/livestore"
import { createStore, provideOtel } from "@livestore/livestore"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { constUndefined } from "effect/Function"
import * as Layer from "effect/Layer"
import type { Mutable } from "effect/Types"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"

/**
 * A `Context.Service` for a LiveStore `Store` integrated with atom
 * reactivity.
 *
 * **Details**
 *
 * It exposes the atom runtime used to create the store, atoms for accessing
 * the store as an `AsyncResult` or unsafely as a plain value, query helpers
 * that return reactive atoms, and a writable atom for committing events.
 *
 * @category models
 * @since 4.0.0
 */
export interface AtomLiveStore<Self, Id extends string, S extends LiveStoreSchema, TContext = {}>
  extends Context.Service<Self, Store<S, TContext>>
{
  new(_: never): Context.ServiceClass.Shape<Id, Store<S, TContext>>

  /**
   * The atom `Layer` that creates the store.
   */
  readonly layer: Atom.Atom<Layer.Layer<Self>>

  /**
   * The `AtomRuntime` that builds the store `Layer`. It can be used to create
   * atoms that have access to the store service.
   */
  readonly runtime: Atom.AtomRuntime<Self>

  /**
   * An atom that allows you to access the `Store`. It will emit an
   * `AsyncResult` that contains the store, or an error if it could not be
   * created.
   */
  readonly store: Atom.Atom<AsyncResult.AsyncResult<Store<S, TContext>>>

  /**
   * An atom that allows you to access the `Store`. It will emit the store, or
   * `undefined` if it has not been created yet.
   */
  readonly storeUnsafe: Atom.Atom<Store<S, TContext> | undefined>

  /**
   * Creates an atom that resolves a query. It embeds the loading of the store
   * and will emit an `AsyncResult` containing the query result, updating
   * whenever the underlying data changes.
   */
  readonly makeQuery: <A>(
    query: Queryable<A> | ((get: Atom.AtomContext) => Queryable<A>)
  ) => Atom.Atom<AsyncResult.AsyncResult<A>>

  /**
   * Creates an atom that resolves a query, updating whenever the underlying
   * data changes. If the store has not been created yet, it will emit
   * `undefined`.
   */
  readonly makeQueryUnsafe: <A>(
    query: Queryable<A> | ((get: Atom.AtomContext) => Queryable<A>)
  ) => Atom.Atom<A | undefined>

  /**
   * An `Atom.Writable` that allows you to commit an event to the store.
   *
   * If the store has not been created yet, the event is discarded.
   */
  readonly commit: Atom.Writable<void, LiveStoreEvent.Input.ForSchema<S>>
}

/**
 * Options for creating an `AtomLiveStore` service, extending LiveStore's
 * `CreateStoreOptions`.
 *
 * @category models
 * @since 4.0.0
 */
export type Options<S extends LiveStoreSchema, TContext = {}> =
  & CreateStoreOptions<S, TContext>
  & {
    readonly otelOptions?: Partial<OtelOptions> | undefined
    /**
     * The `RuntimeFactory` used to create the atom runtime for the store.
     *
     * Only used when `options` is not a function.
     */
    readonly runtime?: Atom.RuntimeFactory | undefined
  }

/**
 * Creates a `Context.Service` class for a LiveStore `Store` backed by an atom
 * runtime.
 *
 * **Example**
 *
 * ```ts
 * import { AtomLivestore } from "@effect/atom-livestore"
 * import { makeInMemoryAdapter } from "@livestore/adapter-web"
 * import { schema } from "./schema.ts"
 *
 * class StoreTag extends AtomLivestore.Tag<StoreTag>()("StoreTag", {
 *   schema,
 *   storeId: "default",
 *   adapter: makeInMemoryAdapter()
 * }) {}
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export const Tag = <Self>() =>
<const Id extends string, S extends LiveStoreSchema, TContext = {}>(
  id: Id,
  options: Options<S, TContext> | ((get: Atom.AtomContext) => Options<S, TContext>)
): AtomLiveStore<Self, Id, S, TContext> => {
  const self: Mutable<AtomLiveStore<Self, Id, S, TContext>> = Context.Service<Self, Store<S, TContext>>()(id) as any

  const layerFromOptions = (opts: Options<S, TContext>) => {
    const otelOptions: Parameters<typeof provideOtel>[0] = {}
    if (opts.otelOptions?.tracer !== undefined) {
      otelOptions.otelTracer = opts.otelOptions.tracer
    }
    if (opts.otelOptions?.rootSpanContext !== undefined) {
      otelOptions.parentSpanContext = opts.otelOptions.rootSpanContext
    }
    return Layer.effect(
      self,
      createStore(opts).pipe(
        provideOtel(otelOptions),
        Effect.orDie
      )
    )
  }

  const runtimeFactory = (typeof options === "function" ? undefined : options.runtime) ?? Atom.runtime
  self.runtime = runtimeFactory(
    typeof options === "function" ? (get) => layerFromOptions(options(get)) : layerFromOptions(options)
  )
  self.layer = self.runtime.layer as Atom.Atom<Layer.Layer<Self>>
  self.store = self.runtime.atom(self.use(Effect.succeed))
  self.storeUnsafe = Atom.readable((get) => {
    const result = get(self.store)
    return AsyncResult.getOrElse(result, constUndefined)
  })
  self.makeQuery = <A>(query: Queryable<A> | ((get: Atom.AtomContext) => Queryable<A>)) =>
    Atom.readable((get) => {
      const result = get(self.store)
      return AsyncResult.map(result, (store) => {
        const q = typeof query === "function" ? query(get) : query
        get.addFinalizer(
          store.subscribe(q, (value) => {
            get.setSelf(AsyncResult.success(value))
          })
        )
        return store.query(q)
      })
    })
  self.makeQueryUnsafe = <A>(query: Queryable<A> | ((get: Atom.AtomContext) => Queryable<A>)) =>
    Atom.readable((get) => {
      const store = get(self.storeUnsafe)
      if (store === undefined) {
        return undefined
      }
      const q = typeof query === "function" ? query(get) : query
      get.addFinalizer(
        store.subscribe(q, (value) => {
          get.setSelf(value)
        })
      )
      return store.query(q)
    })
  self.commit = Atom.writable((get) => {
    get(self.storeUnsafe)
  }, (ctx, value: LiveStoreEvent.Input.ForSchema<S>) => {
    ctx.get(self.storeUnsafe)?.commit(value)
  })
  return self as AtomLiveStore<Self, Id, S, TContext>
}
