/**
 * Runs an Effect Cluster application inside a Cloudflare Worker.
 *
 * @since 4.0.0
 */
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import type * as Entity from "effect/unstable/cluster/Entity"
import type { Sharding } from "effect/unstable/cluster/Sharding"
import type { PersistedQueueFactory } from "effect/unstable/persistence/PersistedQueue"
import type { WorkflowEngine } from "effect/unstable/workflow/WorkflowEngine"
import * as CloudflareBindings from "./CloudflareBindings.ts"
import * as CloudflareCluster from "./CloudflareCluster.ts"
import * as CloudflareDurableObjects from "./CloudflareDurableObjects.ts"

/**
 * Canonical Worker binding names used by the Cloudflare cluster runtime.
 *
 * @category models
 * @since 4.0.0
 */
export const BindingNames = CloudflareBindings.Names

/**
 * Worker environment bindings required by the Cloudflare cluster runtime.
 *
 * @category models
 * @since 4.0.0
 */
export interface Bindings {
  readonly CLUSTER_ENTITY: DurableObjectNamespace<CloudflareDurableObjects.ClusterEntity>
  readonly CLUSTER_WORKFLOW: DurableObjectNamespace<CloudflareDurableObjects.ClusterWorkflow>
  readonly CLUSTER_QUEUE: DurableObjectNamespace<CloudflareDurableObjects.ClusterDurableQueue>
  readonly CLUSTER_SINGLETON: DurableObjectNamespace<CloudflareDurableObjects.ClusterSingleton>
  readonly CLUSTER_SINGLETON_TRIGGERS?: Readonly<Record<string, ReadonlyArray<string>>> | undefined
}

/**
 * Options for building a cluster layer from canonical Worker bindings.
 *
 * @category layers
 * @since 4.0.0
 */
export interface LayerOptions {
  readonly entities: ReadonlyArray<Entity.Entity<any, any>>
  readonly env: Bindings
}

/**
 * Builds the Cloudflare cluster layer from its canonical Worker bindings.
 *
 * **When to use**
 *
 * Use when deployment tooling creates the standard `CLUSTER_*` bindings.
 *
 * @see {@link CloudflareCluster.layer} for custom Worker binding names
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options: LayerOptions
): Layer.Layer<Sharding | WorkflowEngine | PersistedQueueFactory> =>
  CloudflareCluster.layer({
    entities: options.entities,
    entityNamespace: options.env.CLUSTER_ENTITY,
    workflowNamespace: options.env.CLUSTER_WORKFLOW,
    queueNamespace: options.env.CLUSTER_QUEUE,
    singletonNamespace: options.env.CLUSTER_SINGLETON
  })

/**
 * Options for an isolate-lifetime Cloudflare cluster runtime.
 *
 * @category runtime
 * @since 4.0.0
 */
export interface RuntimeOptions<R, E> {
  readonly entities: ReadonlyArray<Entity.Entity<any, any>>
  readonly layer: Layer.Layer<R, E, Sharding | WorkflowEngine | PersistedQueueFactory>
}

/**
 * Runs application effects against one lazily initialized runtime per Worker isolate.
 *
 * @category runtime
 * @since 4.0.0
 */
export interface Runtime<R, E> {
  readonly initialize: (
    env: Bindings
  ) => Promise<ManagedRuntime.ManagedRuntime<R | Sharding | WorkflowEngine | PersistedQueueFactory, E>>
  readonly run: <A, E2>(
    env: Bindings,
    effect: Effect.Effect<A, E2, R | Sharding | WorkflowEngine | PersistedQueueFactory>
  ) => Promise<A>
  readonly scheduled: (
    controller: ScheduledController,
    env: Bindings,
    context: ExecutionContext
  ) => void
}

/**
 * Creates an isolate-lifetime runtime for Cloudflare Worker handlers.
 *
 * **When to use**
 *
 * Use when a class-based Worker needs to share one application layer build
 * with the cluster Durable Objects.
 *
 * **Details**
 *
 * The returned `scheduled` handler dispatches singleton names configured in
 * the optional `CLUSTER_SINGLETON_TRIGGERS` JSON binding.
 *
 * @category runtime
 * @since 4.0.0
 */
export const makeRuntime = <R, E>(options: RuntimeOptions<R, E>): Runtime<R, E> => {
  type Services = R | Sharding | WorkflowEngine | PersistedQueueFactory
  let runtime: ManagedRuntime.ManagedRuntime<Services, E> | undefined
  const initialize = CloudflareDurableObjects.setInitializer((env: Bindings) => {
    const current = runtime ?? ManagedRuntime.make(
      options.layer.pipe(Layer.provideMerge(layer({ entities: options.entities, env })))
    )
    runtime = current
    return current.context().then(() => current)
  })

  return {
    initialize,
    run: async (env, effect) => (await initialize(env)).runPromise(effect),
    scheduled: (controller, env, context) => {
      const names = env.CLUSTER_SINGLETON_TRIGGERS?.[controller.cron]
      if (names === undefined || names.length === 0) return
      context.waitUntil(
        Promise.all(
          names.map((name) => env.CLUSTER_SINGLETON.getByName(`Singleton/${name}`).wake())
        ).then(() => void 0)
      )
    }
  }
}
