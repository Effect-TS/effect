/**
 * Class-independent Durable Object programs behind the Cloudflare cluster
 * integration.
 *
 * @since 4.0.0
 */
import type { DurableObjectStorage } from "@cloudflare/workers-types"
import * as Effect from "effect/Effect"
import * as ClusterMetrics from "effect/unstable/cluster/ClusterMetrics"
import * as EntityAddress from "effect/unstable/cluster/EntityAddress"
import * as EntityId from "effect/unstable/cluster/EntityId"
import * as EntityType from "effect/unstable/cluster/EntityType"
import * as ShardId from "effect/unstable/cluster/ShardId"
import { decodeName, encodeName } from "./internal/clusterName.ts"
import { makeEntityKeepAlive } from "./internal/entityKeepAlive.ts"
import { makeEntityManager } from "./internal/entityRuntime.ts"
import { armAlarm, earliestDeliverAt, ensureEntityStorage } from "./internal/entityStorage.ts"
import { makeQueueRuntime } from "./internal/queueRuntime.ts"
import { earliestLeaseExpiry } from "./internal/queueStorage.ts"
import { getSingletonRegistration } from "./internal/singletonRegistry.ts"
import { makeSingletonRuntime } from "./internal/singletonRuntime.ts"
import { ensureSingletonStorage, loadSingletonState, rememberSingletonName } from "./internal/singletonStorage.ts"
import type { WorkflowStub } from "./internal/workflowRegistry.ts"
import { makeWorkflowRuntime } from "./internal/workflowRuntime.ts"
import { earliestClockWakeUp, ensureWorkflowStorage, loadExecution } from "./internal/workflowStorage.ts"

const exportedNamespace = <Stub>(
  state: DurableObjectProgramState,
  className: string
): { readonly getByName: (name: string) => Stub } | undefined =>
  state.exports[className] as
    | { readonly getByName: (name: string) => Stub }
    | undefined

/**
 * Native Durable Object capabilities required by the cluster programs.
 *
 * @category models
 * @since 4.0.0
 */
export interface DurableObjectProgramState {
  readonly id: { readonly name?: string | undefined }
  readonly storage: DurableObjectStorage
  readonly exports: Record<string, unknown>
  readonly waitUntil: (promise: Promise<unknown>) => void
}

/**
 * Delivery options accepted by the cluster entity transport program.
 *
 * @category models
 * @since 4.0.0
 */
export interface EntityDeliveryOptions {
  readonly deliverAt?: number | undefined
  readonly primaryKey?: string | null | undefined
  readonly replyTo?: string | undefined
}

/**
 * Result returned by the cluster entity transport program.
 *
 * @category models
 * @since 4.0.0
 */
export type EntityInvokeResult = {
  readonly _tag: "Success"
  readonly requestId: string
  readonly replies: ReadonlyArray<string>
} | {
  readonly _tag: "MailboxFull"
} | {
  readonly _tag: "EncodedMessageTooLarge"
} | {
  readonly _tag: "AskDeduplicatedToTell"
}

/**
 * Effect-valued program for one cluster entity Durable Object instance.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterEntityProgram {
  readonly alarm: () => Effect.Effect<void>
  readonly hold: () => Effect.Effect<void>
  readonly invoke: (
    envelopeText: string,
    discard: boolean,
    delivery?: EntityDeliveryOptions
  ) => Effect.Effect<EntityInvokeResult>
  readonly acknowledge: (requestId: string, replyId: string) => Effect.Effect<ReadonlyArray<string>>
  readonly interrupt: (storageRequestId: string, clientRequestId?: string) => Effect.Effect<void>
  readonly reset: (requestId: string) => Effect.Effect<void>
  readonly deliverReply: (requestId: string, reply: string) => Effect.Effect<boolean>
}

/**
 * Creates an Effect that initializes and returns the handlers for a cluster
 * entity Durable Object.
 *
 * **When to use**
 *
 * Use when a framework creates the native Durable Object class and needs the
 * entity persistence, alarm, and RPC behavior without extending the bundled
 * `ClusterEntity` class.
 *
 * **Details**
 *
 * Run the returned Effect during Durable Object initialization. It restores
 * persisted alarms before returning the handler object.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeClusterEntityProgram = Effect.fnUntraced(function*(state: DurableObjectProgramState) {
  const entityName = state.id.name ?? ""
  const name = decodeName(entityName)
  if (name === undefined) throw new Error("ClusterEntity requires a canonical entity Durable Object name")
  const keepAlive = makeEntityKeepAlive(() => {
    const namespace = exportedNamespace<{ readonly hold: () => Promise<void> }>(state, "ClusterEntity")
    if (namespace === undefined) {
      return Promise.reject(
        new Error("CloudflareCluster: ClusterEntity export is unavailable for keep-alive")
      )
    }
    return namespace.getByName(entityName).hold()
  })
  const manager = makeEntityManager({
    storage: state.storage,
    address: EntityAddress.make({
      shardId: ShardId.make("default", 1),
      entityType: EntityType.make(name.type),
      entityId: EntityId.make(name.id)
    }),
    entityName,
    keepAlive,
    waitUntil: (effect) => state.waitUntil(Effect.runPromise(effect)),
    getNamespace: () =>
      exportedNamespace<{
        readonly deliverReply: (requestId: string, reply: string) => Promise<boolean>
      }>(state, "ClusterEntity")
  })
  const sql = state.storage.sql
  ensureEntityStorage(sql)
  const deliverAt = earliestDeliverAt(sql)
  if (deliverAt !== undefined) {
    yield* armAlarm(state.storage, deliverAt)
  }
  return {
    alarm: () => manager.alarm,
    hold: () => keepAlive.await,
    invoke: (envelopeText, discard, delivery) => manager.invoke(envelopeText, discard, delivery),
    acknowledge: manager.acknowledge,
    interrupt: manager.interrupt,
    reset: manager.reset,
    deliverReply: manager.deliverReply
  } satisfies ClusterEntityProgram
})

/**
 * Execution options accepted by the cluster workflow program.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterWorkflowRunOptions {
  readonly discard: boolean
  readonly parent?: { readonly workflowName: string; readonly executionId: string } | undefined
}

/**
 * Effect-valued program for one workflow execution Durable Object.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterWorkflowProgram {
  readonly run: (payload: string, options: ClusterWorkflowRunOptions) => Effect.Effect<string>
  readonly poll: () => Effect.Effect<string | undefined>
  readonly resume: () => Effect.Effect<void>
  readonly interrupt: () => Effect.Effect<void>
  readonly interruptUnsafe: () => Effect.Effect<void>
  readonly deferredDone: (name: string, exit: string) => Effect.Effect<void>
  readonly scheduleClock: (name: string, deferredName: string, wakeUp: number) => Effect.Effect<void>
  readonly alarm: () => Effect.Effect<void>
}

/**
 * Creates an Effect that initializes and returns the handlers for a workflow
 * execution Durable Object.
 *
 * **When to use**
 *
 * Use when a framework creates the native Durable Object class and needs the
 * Effect Workflow journal, alarm, and RPC behavior without extending the
 * bundled `ClusterWorkflow` class.
 *
 * **Details**
 *
 * Run the returned Effect during Durable Object initialization. It restores
 * persisted alarms before returning the handler object.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeClusterWorkflowProgram = Effect.fnUntraced(function*(state: DurableObjectProgramState) {
  ensureWorkflowStorage(state.storage.sql)
  let name: string | undefined
  if (state.id.name !== undefined) {
    if (decodeName(state.id.name) === undefined) {
      throw new Error("ClusterWorkflow requires a canonical workflow Durable Object name")
    }
    name = state.id.name
  } else {
    const stored = loadExecution(state.storage.sql)
    name = stored === undefined ? undefined : encodeName(stored.workflowName, stored.executionId)
  }
  let runtime: ReturnType<typeof makeWorkflowRuntime> | undefined
  const getRuntime = () => {
    if (runtime !== undefined) return runtime
    if (name === undefined) {
      throw new Error("ClusterWorkflow requires a canonical workflow Durable Object name")
    }
    runtime = makeWorkflowRuntime({
      name,
      sql: state.storage.sql,
      alarm: state.storage,
      now: () => Date.now(),
      waitUntil: (promise) => state.waitUntil(promise),
      getStub: (objectName) => {
        const namespace = exportedNamespace<WorkflowStub>(state, "ClusterWorkflow")
        if (namespace === undefined) {
          throw new Error("CloudflareCluster: ClusterWorkflow export is unavailable for workflow delivery")
        }
        return namespace.getByName(objectName)
      }
    })
    return runtime
  }
  const wakeUp = earliestClockWakeUp(state.storage.sql)
  if (wakeUp !== undefined) {
    yield* armAlarm(state.storage, wakeUp)
  }
  return {
    run: (payload, options) => Effect.promise(() => getRuntime().run(payload, options)),
    poll: () => Effect.promise(() => getRuntime().poll()),
    resume: () => Effect.promise(() => getRuntime().resume()),
    interrupt: () => Effect.promise(() => getRuntime().interrupt()),
    interruptUnsafe: () => Effect.promise(() => getRuntime().interruptUnsafe()),
    deferredDone: (deferredName, exit) => Effect.promise(() => getRuntime().deferredDone(deferredName, exit)),
    scheduleClock: (clockName, deferredName, wakeAt) =>
      Effect.promise(() => getRuntime().scheduleClock(clockName, deferredName, wakeAt)),
    alarm: () => name === undefined ? Effect.void : Effect.promise(() => getRuntime().runAlarm())
  } satisfies ClusterWorkflowProgram
})

/**
 * Item leased from the durable queue program.
 *
 * @category models
 * @since 4.0.0
 */
export interface DurableQueueItem {
  readonly id: string
  readonly element: string
  readonly attempts: number
}

/**
 * Effect-valued program for one durable queue Durable Object.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterDurableQueueProgram {
  readonly offer: (id: string, element: string) => Effect.Effect<void>
  readonly take: (takerId: string, maxAttempts: number, leaseMillis: number) => Effect.Effect<DurableQueueItem>
  readonly cancelTake: (takerId: string) => Effect.Effect<void>
  readonly complete: (id: string) => Effect.Effect<void>
  readonly fail: (id: string, lastFailure: string) => Effect.Effect<void>
  readonly release: (id: string) => Effect.Effect<void>
  readonly extend: (id: string, leaseMillis: number) => Effect.Effect<void>
  readonly alarm: () => Effect.Effect<void>
}

/**
 * Creates an Effect that initializes and returns the handlers for a durable
 * queue Durable Object.
 *
 * **When to use**
 *
 * Use when a framework creates the native Durable Object class and needs the
 * queue persistence, leasing, and alarm behavior without extending the
 * bundled `ClusterDurableQueue` class.
 *
 * **Details**
 *
 * Run the returned Effect during Durable Object initialization. It restores
 * persisted alarms before returning the handler object.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeClusterDurableQueueProgram = Effect.fnUntraced(function*(state: DurableObjectProgramState) {
  if (state.id.name !== undefined && decodeName(state.id.name) === undefined) {
    throw new Error("ClusterDurableQueue requires a canonical queue Durable Object name")
  }
  const runtime = makeQueueRuntime({
    sql: state.storage.sql,
    alarm: state.storage,
    now: () => Date.now()
  })
  const expiry = earliestLeaseExpiry(state.storage.sql)
  if (expiry !== undefined) {
    yield* armAlarm(state.storage, expiry)
  }
  return {
    offer: (id, element) => Effect.promise(() => runtime.offer(id, element)),
    take: (takerId, maxAttempts, leaseMillis) => Effect.promise(() => runtime.take(takerId, maxAttempts, leaseMillis)),
    cancelTake: (takerId) => Effect.promise(() => runtime.cancelTake(takerId)),
    complete: (id) => Effect.promise(() => runtime.complete(id)),
    fail: (id, lastFailure) => Effect.promise(() => runtime.fail(id, lastFailure)),
    release: (id) => Effect.promise(() => runtime.release(id)),
    extend: (id, leaseMillis) => Effect.promise(() => runtime.extend(id, leaseMillis)),
    alarm: () => Effect.promise(() => runtime.runAlarm())
  } satisfies ClusterDurableQueueProgram
})

/**
 * Effect-valued program for one cluster singleton Durable Object.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterSingletonProgram {
  readonly wake: () => Effect.Effect<void>
  readonly alarm: () => Effect.Effect<void>
}

/**
 * Creates an Effect that initializes and returns the handlers for a cluster
 * singleton Durable Object.
 *
 * **When to use**
 *
 * Use when a framework creates the native Durable Object class and needs the
 * singleton wake and watchdog behavior without extending the bundled
 * `ClusterSingleton` class.
 *
 * **Details**
 *
 * Run the returned Effect during Durable Object initialization. It restores
 * persisted alarms before returning the handler object.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeClusterSingletonProgram = Effect.fnUntraced(function*(state: DurableObjectProgramState) {
  const sql = state.storage.sql
  ensureSingletonStorage(sql)
  if (state.id.name !== undefined) {
    if (!state.id.name.startsWith("Singleton/")) {
      throw new Error("ClusterSingleton requires a Singleton/<name> Durable Object name")
    }
    rememberSingletonName(sql, state.id.name)
  }
  const stored = loadSingletonState(sql)
  const name = state.id.name ?? stored.name
  let runtime: ReturnType<typeof makeSingletonRuntime> | undefined
  const getRuntime = () => {
    if (runtime !== undefined) return runtime
    if (name === undefined) {
      throw new Error("ClusterSingleton requires a Singleton/<name> Durable Object name")
    }
    const registration = getSingletonRegistration(name.slice("Singleton/".length))
    if (registration === undefined) {
      throw new Error(`CloudflareCluster: no singleton registered under the name "${name.slice("Singleton/".length)}"`)
    }
    const run = Effect.sync(() => {
      ClusterMetrics.singletons.modifyUnsafe(BigInt(1), registration.context)
    }).pipe(
      Effect.andThen(registration.run),
      Effect.scoped,
      Effect.ensuring(Effect.sync(() => {
        ClusterMetrics.singletons.modifyUnsafe(BigInt(-1), registration.context)
      })),
      Effect.provideContext(registration.context),
      Effect.orDie
    )
    runtime = makeSingletonRuntime({
      sql,
      alarm: state.storage,
      now: () => Date.now(),
      run
    })
    return runtime
  }
  if (stored.wakeAt !== undefined) {
    yield* armAlarm(state.storage, stored.wakeAt)
  }
  return {
    wake: () => Effect.promise(() => getRuntime().wake()),
    alarm: () =>
      loadSingletonState(sql).wakeAt === undefined ? Effect.void : Effect.promise(() => getRuntime().runAlarm())
  } satisfies ClusterSingletonProgram
})
