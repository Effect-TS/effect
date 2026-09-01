/**
 * Deploys the Cloudflare cluster Durable Objects with Alchemy.
 *
 * @since 4.0.0
 */
import * as Cloudflare from "alchemy/Cloudflare"
import type * as Effect from "effect/Effect"
import * as CloudflareBindings from "./CloudflareBindings.ts"
import type {
  ClusterDurableQueue,
  ClusterEntity,
  ClusterSingleton,
  ClusterWorkflow
} from "./CloudflareDurableObjects.ts"
import { assertNoReservedBindings, makeSingletonTriggers } from "./internal/alchemy.ts"

/**
 * A Cron Trigger and the singleton names it wakes.
 *
 * @category models
 * @since 4.0.0
 */
export interface SingletonTrigger {
  readonly cron: string
  readonly names: ReadonlyArray<string>
}

/**
 * Alchemy Worker properties extended with Effect Cluster deployment options.
 *
 * @category models
 * @since 4.0.0
 */
export interface WorkerProps<
  Bindings extends Cloudflare.WorkerBindingProps = {},
  Assets extends Cloudflare.WorkerAssetsConfig | undefined = Cloudflare.WorkerAssetsConfig | undefined
> extends Omit<Cloudflare.WorkerProps<Bindings, Assets>, "env" | "exports" | "namespace"> {
  readonly env?: Bindings | undefined
  readonly singletonTriggers?: ReadonlyArray<SingletonTrigger> | undefined
}

const clusterBindings = {
  CLUSTER_ENTITY: Cloudflare.DurableObject<ClusterEntity>(CloudflareBindings.Names.entity, {
    className: "ClusterEntity"
  }),
  CLUSTER_WORKFLOW: Cloudflare.DurableObject<ClusterWorkflow>(CloudflareBindings.Names.workflow, {
    className: "ClusterWorkflow"
  }),
  CLUSTER_QUEUE: Cloudflare.DurableObject<ClusterDurableQueue>(CloudflareBindings.Names.queue, {
    className: "ClusterDurableQueue"
  }),
  CLUSTER_SINGLETON: Cloudflare.DurableObject<ClusterSingleton>(CloudflareBindings.Names.singleton, {
    className: "ClusterSingleton"
  })
} as const

type ClusterBindingProps = typeof clusterBindings & {
  readonly CLUSTER_SINGLETON_TRIGGERS: Record<string, Array<string>>
}

/**
 * Runtime bindings added to an Alchemy Worker by {@link worker}.
 *
 * @category models
 * @since 4.0.0
 */
export type WorkerBindings<
  Bindings extends Cloudflare.WorkerBindingProps = {},
  Assets extends Cloudflare.WorkerAssetsConfig | undefined = undefined
> = Cloudflare.NormalizedBindings<Bindings & ClusterBindingProps, Assets>

type NormalizedWorkerBindings<
  Bindings extends Cloudflare.WorkerBindingProps = {},
  Assets extends Cloudflare.WorkerAssetsConfig | undefined = undefined
> = {
  readonly [Name in keyof WorkerBindings<Bindings, Assets>]: WorkerBindings<Bindings, Assets>[Name]
}

/**
 * Deploys an Alchemy Worker with the Durable Objects required by Effect Cluster.
 *
 * **When to use**
 *
 * Use when deploying an Effect Cluster Worker through Alchemy instead of a
 * Wrangler configuration.
 *
 * **Details**
 *
 * Alchemy owns the native Worker, Durable Object bindings, SQLite migrations,
 * Cron Triggers, and local development. The Worker entry must export the four
 * classes from `CloudflareDurableObjects` and use `CloudflareWorker.makeRuntime`
 * to initialize its application.
 *
 * @category constructors
 * @since 4.0.0
 */
export const worker = <
  const Bindings extends Cloudflare.WorkerBindingProps = {},
  const Assets extends Cloudflare.WorkerAssetsConfig | undefined = undefined
>(
  id: string,
  props: WorkerProps<Bindings, Assets>
): Effect.Effect<Cloudflare.Worker<NormalizedWorkerBindings<Bindings, Assets>>, never, Cloudflare.Providers> => {
  const { env, singletonTriggers = [], ...workerProps } = props
  assertNoReservedBindings(env)
  const triggers = makeSingletonTriggers(workerProps.crons, singletonTriggers)
  const workerEnv = Object.assign({}, env, clusterBindings, {
    CLUSTER_SINGLETON_TRIGGERS: triggers.triggerMap
  })

  return Cloudflare.Worker<Bindings & ClusterBindingProps, Assets>(id, {
    ...workerProps,
    compatibility: {
      date: "2026-08-01",
      ...workerProps.compatibility
    },
    crons: triggers.crons,
    env: workerEnv
  })
}
