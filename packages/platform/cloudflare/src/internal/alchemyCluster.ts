/**
 * The alchemy-free half of `AlchemyCloudflareCluster.make`: building the
 * cluster handle from resolved namespace bindings. Kept separate so it can be
 * exercised without importing `alchemy`, whose runtime must match the
 * published `effect` release rather than this workspace.
 *
 * @internal
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import type * as Entity from "effect/unstable/cluster/Entity"
import * as CloudflareCluster from "../CloudflareCluster.ts"

/** @internal */
export interface ClusterHandle {
  readonly provide: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, any>
  readonly wake: (name: string) => () => Effect.Effect<void>
  readonly entityNamespace: DurableObjectNamespace
  readonly workflowNamespace: DurableObjectNamespace
  readonly queueNamespace: DurableObjectNamespace
  readonly singletonNamespace: DurableObjectNamespace
  readonly context: Context.Context<never>
}

/** @internal */
export interface ClusterHandleOptions {
  readonly entities: ReadonlyArray<Entity.Entity<any, any>>
  readonly layer: Layer.Layer<never, any, any>
  readonly env: Record<string, unknown>
}

/** @internal */
export const makeClusterHandle = Effect.fnUntraced(function*(options: ClusterHandleOptions) {
  const entityNamespace = options.env.ClusterEntity as DurableObjectNamespace
  const workflowNamespace = options.env.ClusterWorkflow as DurableObjectNamespace
  const queueNamespace = options.env.ClusterDurableQueue as DurableObjectNamespace
  const singletonNamespace = options.env.ClusterSingleton as DurableObjectNamespace

  // The isolate-lifetime scope. workerd has no isolate-teardown hook, so it
  // is never closed; the built services live for the isolate, exactly like
  // the Wrangler path's `setInitializer` build.
  const scope = Scope.makeUnsafe()
  const context = yield* Layer.buildWithScope(
    options.layer.pipe(
      Layer.provideMerge(CloudflareCluster.layer({
        entities: options.entities,
        entityNamespace,
        workflowNamespace,
        queueNamespace,
        singletonNamespace
      }))
    ),
    scope
  ).pipe(
    // Drop the build's memo map so a Layer the user provides inside a
    // handler builds per event instead of sharing one instance pinned to
    // the first request's IoContext.
    Effect.map(Context.omit(Layer.CurrentMemoMap))
  )

  const handle: ClusterHandle = {
    provide: (effect) => Effect.provideContext(effect, context),
    wake: (name) => () =>
      Effect.promise(() =>
        (singletonNamespace.getByName(`Singleton/${name}`) as unknown as {
          readonly wake: () => Promise<void>
        }).wake()
      ),
    entityNamespace,
    workflowNamespace,
    queueNamespace,
    singletonNamespace,
    context
  }
  return handle
})

/**
 * The plan-time handle: the deploy-machine evaluation only discovers the
 * Durable Object declarations, and nothing returned from the Worker init
 * program runs outside the deployed isolate.
 *
 * @internal
 */
export const inertClusterHandle = (): ClusterHandle => ({
  provide: (effect) => effect as Effect.Effect<any, any, any>,
  wake: () => () => Effect.void,
  entityNamespace: undefined as unknown as DurableObjectNamespace,
  workflowNamespace: undefined as unknown as DurableObjectNamespace,
  queueNamespace: undefined as unknown as DurableObjectNamespace,
  singletonNamespace: undefined as unknown as DurableObjectNamespace,
  context: undefined as unknown as Context.Context<never>
})
