/**
 * Deploys the Cloudflare cluster with Alchemy v2 ("Infrastructure as
 * Effects").
 *
 * `make` runs inside an Effect-native `Cloudflare.Worker` init program. It
 * registers the four cluster Durable Object classes on the hosting Worker
 * (bindings, class exports, and SQLite migrations are all owned by Alchemy),
 * builds the cluster layer together with the user's handler layer into the
 * isolate-lifetime scope, and returns a handle for wiring the built context
 * into the Worker's handlers. The user never declares or re-exports Durable
 * Object classes.
 *
 * The Wrangler path (`CloudflareDurableObjects` + `CloudflareCluster.layer`)
 * never imports this module; `alchemy` is an optional peer dependency needed
 * only here.
 *
 * ```ts
 * import * as Cloudflare from "alchemy/Cloudflare"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 * import * as AlchemyCloudflareCluster from "@effect/platform-cloudflare/AlchemyCloudflareCluster"
 *
 * export default Cloudflare.Worker("MyApp", {
 *   main: import.meta.url
 * }, Effect.gen(function*() {
 *   const cluster = yield* AlchemyCloudflareCluster.make({
 *     entities: [Counter],
 *     layer: Layer.mergeAll(CounterLayer, MaintenanceLayer)
 *   })
 *
 *   yield* Cloudflare.Workers.cron("0 * * * *", cluster.wake("hourly-maintenance"))
 *
 *   return {
 *     fetch: cluster.provide(handler)
 *   }
 * }))
 * ```
 *
 * @since 4.0.0
 */
import * as Cloudflare from "alchemy/Cloudflare"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Entity from "effect/unstable/cluster/Entity"
import type { Sharding } from "effect/unstable/cluster/Sharding"
import type { PersistedQueueFactory } from "effect/unstable/persistence/PersistedQueue"
import type { WorkflowEngine } from "effect/unstable/workflow/WorkflowEngine"
import {
  type ClusterDurableQueueProgram,
  type ClusterEntityProgram,
  type ClusterSingletonProgram,
  type ClusterWorkflowProgram,
  type DurableObjectProgramState,
  type EntityDeliveryOptions,
  makeClusterDurableQueueProgram,
  makeClusterEntityProgram,
  makeClusterSingletonProgram,
  makeClusterWorkflowProgram
} from "./CloudflareDurableObjectPrograms.ts"
import { inertClusterHandle, makeClusterHandle } from "./internal/alchemyCluster.ts"

/**
 * The services `make` builds on top of the user layer: the cluster `Sharding`
 * service, the workflow engine, and the persisted queue factory.
 *
 * @category models
 * @since 4.0.0
 */
export type ClusterServices = Sharding | WorkflowEngine | PersistedQueueFactory

/**
 * The handle returned by {@link make}.
 *
 * @category models
 * @since 4.0.0
 */
export interface Cluster<in R = never> {
  /**
   * Attaches the built cluster context to a user Effect, for the Worker's
   * `fetch` handler and other entrypoints. Only provides the already-built
   * Context; it does not open a new Scope.
   */
  readonly provide: <A, E, R2>(effect: Effect.Effect<A, E, R2>) => Effect.Effect<A, E, Exclude<R2, R>>
  /**
   * A handler that wakes the named singleton, for `Cloudflare.Workers.cron`.
   * The name is the singleton name without the `Singleton/` prefix, and the
   * returned handler is already context-provided.
   */
  readonly wake: (name: string) => () => Effect.Effect<void>
  /**
   * The native namespace binding of the cluster entity class.
   */
  readonly entityNamespace: DurableObjectNamespace
  /**
   * The native namespace binding of the workflow class.
   */
  readonly workflowNamespace: DurableObjectNamespace
  /**
   * The native namespace binding of the durable queue class.
   */
  readonly queueNamespace: DurableObjectNamespace
  /**
   * The native namespace binding of the singleton class.
   */
  readonly singletonNamespace: DurableObjectNamespace
  /**
   * The Context built from the cluster layer and the user layer into the
   * isolate-lifetime Scope.
   */
  readonly context: Context.Context<R>
}

/**
 * The entity definitions and handler layer the cluster is built from.
 *
 * @category models
 * @since 4.0.0
 */
export interface MakeOptions<ROut, E, RIn> {
  /**
   * The complete set of entity definitions the Worker serves, as in
   * `CloudflareCluster.LayerOptions`.
   */
  readonly entities: ReadonlyArray<Entity.Entity<any, any>>
  /**
   * The user's merged handler layers: entity handlers, singletons, workflow
   * handlers, and any services they need.
   */
  readonly layer: Layer.Layer<ROut, E, RIn>
}

const programState = (state: Cloudflare.DurableObjectState["Service"]): DurableObjectProgramState => {
  const raw = state.raw as unknown as {
    readonly id: { readonly name?: string | undefined }
    readonly storage: DurableObjectProgramState["storage"]
    readonly exports: Record<string, unknown>
    waitUntil(promise: Promise<unknown>): void
  }
  return {
    id: raw.id,
    storage: raw.storage,
    exports: raw.exports,
    waitUntil: (promise) => raw.waitUntil(promise)
  }
}

interface EntityShape {
  readonly alarm: () => Effect.Effect<void>
  readonly hold: () => Effect.Effect<void>
  readonly invoke: ClusterEntityProgram["invoke"]
  readonly acknowledge: ClusterEntityProgram["acknowledge"]
  readonly interrupt: ClusterEntityProgram["interrupt"]
  readonly reset: ClusterEntityProgram["reset"]
  readonly deliverReply: ClusterEntityProgram["deliverReply"]
}

const ClusterEntity = Cloudflare.DurableObject<EntityShape>()(
  "ClusterEntity",
  Effect.gen(function*() {
    const state = yield* Cloudflare.DurableObjectState
    return Effect.gen(function*() {
      const program = yield* makeClusterEntityProgram(programState(state))
      return {
        alarm: () => program.alarm(),
        hold: () => program.hold(),
        invoke: (envelopeText: string, discard: boolean, delivery?: EntityDeliveryOptions) =>
          program.invoke(envelopeText, discard, delivery),
        acknowledge: program.acknowledge,
        interrupt: program.interrupt,
        reset: program.reset,
        deliverReply: program.deliverReply
      }
    })
  })
)

interface WorkflowShape {
  readonly alarm: () => Effect.Effect<void>
  readonly run: ClusterWorkflowProgram["run"]
  readonly poll: ClusterWorkflowProgram["poll"]
  readonly resume: ClusterWorkflowProgram["resume"]
  readonly interrupt: ClusterWorkflowProgram["interrupt"]
  readonly interruptUnsafe: ClusterWorkflowProgram["interruptUnsafe"]
  readonly deferredDone: ClusterWorkflowProgram["deferredDone"]
  readonly scheduleClock: ClusterWorkflowProgram["scheduleClock"]
}

const ClusterWorkflow = Cloudflare.DurableObject<WorkflowShape>()(
  "ClusterWorkflow",
  Effect.gen(function*() {
    const state = yield* Cloudflare.DurableObjectState
    return Effect.gen(function*() {
      const program = yield* makeClusterWorkflowProgram(programState(state))
      return {
        alarm: () => program.alarm(),
        run: program.run,
        poll: program.poll,
        resume: program.resume,
        interrupt: program.interrupt,
        interruptUnsafe: program.interruptUnsafe,
        deferredDone: program.deferredDone,
        scheduleClock: program.scheduleClock
      }
    })
  })
)

interface DurableQueueShape {
  readonly alarm: () => Effect.Effect<void>
  readonly offer: ClusterDurableQueueProgram["offer"]
  readonly take: ClusterDurableQueueProgram["take"]
  readonly cancelTake: ClusterDurableQueueProgram["cancelTake"]
  readonly complete: ClusterDurableQueueProgram["complete"]
  readonly fail: ClusterDurableQueueProgram["fail"]
  readonly release: ClusterDurableQueueProgram["release"]
  readonly extend: ClusterDurableQueueProgram["extend"]
}

const ClusterDurableQueue = Cloudflare.DurableObject<DurableQueueShape>()(
  "ClusterDurableQueue",
  Effect.gen(function*() {
    const state = yield* Cloudflare.DurableObjectState
    return Effect.gen(function*() {
      const program = yield* makeClusterDurableQueueProgram(programState(state))
      return {
        alarm: () => program.alarm(),
        offer: program.offer,
        take: program.take,
        cancelTake: program.cancelTake,
        complete: program.complete,
        fail: program.fail,
        release: program.release,
        extend: program.extend
      }
    })
  })
)

interface SingletonShape {
  readonly alarm: () => Effect.Effect<void>
  readonly wake: ClusterSingletonProgram["wake"]
}

const ClusterSingleton = Cloudflare.DurableObject<SingletonShape>()(
  "ClusterSingleton",
  Effect.gen(function*() {
    const state = yield* Cloudflare.DurableObjectState
    return Effect.gen(function*() {
      const program = yield* makeClusterSingletonProgram(programState(state))
      return {
        alarm: () => program.alarm(),
        wake: program.wake
      }
    })
  })
)

const makeUnsafe = Effect.fnUntraced(function*(options: MakeOptions<any, any, any>) {
  // Register the four Durable Object classes on the hosting Worker. At plan
  // time this declares the bindings and class exports Alchemy deploys; at
  // runtime it resolves the same bindings in every isolate, Worker and
  // Durable Object alike.
  yield* ClusterEntity
  yield* ClusterWorkflow
  yield* ClusterDurableQueue
  yield* ClusterSingleton

  if (!globalThis.__ALCHEMY_RUNTIME__) {
    // Plan/deploy evaluation only discovers the declarations above.
    return inertClusterHandle()
  }

  const env = yield* Cloudflare.WorkerEnvironment
  return yield* makeClusterHandle({
    entities: options.entities,
    layer: options.layer,
    env
  })
})

/**
 * Builds the Cloudflare cluster inside an Effect-native Alchemy Worker.
 *
 * **Details**
 *
 * Always registers all four Durable Object classes (entity, workflow, durable
 * queue, singleton) on the hosting Worker, so Alchemy owns their bindings and
 * SQLite migrations across deploys. At runtime it builds
 * `CloudflareCluster.layer` merged with the user's handler layer into the
 * isolate-lifetime Scope — the Scope is never closed, so do not wrap the
 * Worker init program in `Effect.provide(layer)` for cluster services.
 *
 * The returned handle exposes `provide` for the Worker's handlers, `wake` for
 * user-declared Cron Triggers
 * (`Cloudflare.Workers.cron(expr, cluster.wake("name"))`), and the four
 * native namespace bindings as escape hatches.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make: <ROut, E, RIn>(
  options: MakeOptions<ROut, E, RIn>
) => Effect.Effect<
  Cluster<ROut | ClusterServices>,
  E,
  Cloudflare.Worker | Exclude<RIn, ClusterServices>
> = makeUnsafe as any
