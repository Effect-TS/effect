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
import type { Cluster } from "../AlchemyCloudflareCluster.ts"
import * as CloudflareCluster from "../CloudflareCluster.ts"

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

  const handle: Cluster<never> = {
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
export const inertClusterHandle = (): Cluster<never> => ({
  provide: (effect) => effect,
  wake: () => () => Effect.void,
  get entityNamespace() {
    return planTimeOnly("entityNamespace")
  },
  get workflowNamespace() {
    return planTimeOnly("workflowNamespace")
  },
  get queueNamespace() {
    return planTimeOnly("queueNamespace")
  },
  get singletonNamespace() {
    return planTimeOnly("singletonNamespace")
  },
  get context() {
    return planTimeOnly("context")
  }
})

const planTimeOnly = (field: string): never => {
  throw new Error(
    `AlchemyCloudflareCluster: '${field}' is only available at runtime, not during plan evaluation`
  )
}
