/**
 * Runs durable workflows on the dedicated workflow Durable Object class.
 *
 * On this path one workflow execution is one Durable Object: the engine
 * encodes `(workflowName, executionId)` into a Durable Object name with the
 * same length-prefix scheme as entities and resolves the object through the
 * workflow namespace binding. Execution state, activity results keyed
 * `${name}/${attempt}`, durable deferred exits, and the clock due table all
 * live on the object's SQLite storage behind its single alarm.
 *
 * Every `DurableClock` is durable on this engine: the in-memory short-sleep
 * path is disabled, so even sub-minute sleeps persist a due row and arm the
 * alarm.
 *
 * @since 4.0.0
 */
import { Clock } from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Types from "effect/Types"
import * as Workflow from "effect/unstable/workflow/Workflow"
import * as WorkflowEngine from "effect/unstable/workflow/WorkflowEngine"
import type { ClusterWorkflowRunOptions } from "./CloudflareDurableObjectPrograms.ts"
import { encodeName } from "./internal/clusterName.ts"
import {
  CurrentExecutionHandle,
  deferredState,
  makeWorkflowRegistry,
  type WorkflowRegistration,
  type WorkflowRegistry,
  type WorkflowStub
} from "./internal/workflowRegistry.ts"
import { decodeExit, decodeResult, encodeExit, encodePayload } from "./internal/workflowWire.ts"

/**
 * Result of invoking a workflow Durable Object through a framework namespace.
 *
 * @category models
 * @since 4.0.0
 */
export type WorkflowCall<A> = Promise<A> | Effect.Effect<A, unknown>

/**
 * Framework-neutral client for one workflow Durable Object.
 *
 * @category models
 * @since 4.0.0
 */
export interface WorkflowClient {
  readonly run: (payload: string, options: ClusterWorkflowRunOptions) => WorkflowCall<string>
  readonly poll: () => WorkflowCall<string | undefined>
  readonly resume: () => WorkflowCall<void>
  readonly interrupt: () => WorkflowCall<void>
  readonly interruptUnsafe: () => WorkflowCall<void>
  readonly deferredDone: (name: string, exit: string) => WorkflowCall<void>
  readonly scheduleClock: (name: string, deferredName: string, wakeUp: number) => WorkflowCall<void>
}

/**
 * Workflow Durable Object namespace binding the engine is built from.
 *
 * @category layers
 * @since 4.0.0
 */
export type LayerOptions = Types.Simplify<{
  readonly workflowNamespace: Pick<DurableObjectNamespace, "getByName">
}>

const call = <A>(result: WorkflowCall<A>): Effect.Effect<A> =>
  Effect.isEffect(result) ? Effect.orDie(result) : Effect.promise(() => result)

/** @internal */
export const makeWithRegistry = Effect.fnUntraced(function*(
  options: { readonly getByName: (name: string) => WorkflowClient },
  registry: WorkflowRegistry
) {
  const clock = yield* Clock

  // Inside a run the execution's own handle avoids a self-RPC; every other
  // target resolves to its Durable Object stub through the namespace binding.
  const stubFor = Effect.fnUntraced(function*(workflowName: string, executionId: string) {
    const handle = yield* Effect.serviceOption(CurrentExecutionHandle)
    if (Option.isSome(handle) && handle.value.executionId === executionId) {
      return handle.value as WorkflowStub
    }
    return options.getByName(encodeName(workflowName, executionId))
  })

  const localHandle = Effect.fnUntraced(function*(operation: string) {
    const instance = yield* WorkflowEngine.WorkflowInstance
    const handle = yield* Effect.serviceOption(CurrentExecutionHandle)
    if (Option.isNone(handle)) {
      return yield* Effect.die(
        `CloudflareWorkflowEngine: ${operation} is only available inside a workflow Durable Object execution`
      )
    }
    return { instance, handle: handle.value } as const
  })

  return WorkflowEngine.makeUnsafe({
    register: Effect.fnUntraced(function*(workflow, execute) {
      const context = yield* Effect.context<never>()
      const registration: WorkflowRegistration = { workflow, execute, context }
      if (!registry.register(workflow._tag, registration)) {
        return yield* Effect.die(`Workflow '${workflow._tag}' is already registered`)
      }
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          registry.unregister(workflow._tag, registration)
        })
      )
    }),

    execute: Effect.fnUntraced(function*(workflow, opts) {
      const context = yield* Effect.context<never>()
      const payload = yield* encodePayload(workflow, opts.payload, context)
      const stub = yield* stubFor(workflow._tag, opts.executionId)
      const parent = opts.parent === undefined
        ? undefined
        : { workflowName: opts.parent.workflow._tag, executionId: opts.parent.executionId }
      const text = yield* call(stub.run(payload, { discard: opts.discard, parent }))
      if (opts.discard) return undefined
      return yield* decodeResult(workflow, text, context)
    }) as WorkflowEngine.Encoded["execute"],

    poll: Effect.fnUntraced(function*(workflow, executionId) {
      const context = yield* Effect.context<never>()
      const stub = yield* stubFor(workflow._tag, executionId)
      const text = yield* call(stub.poll())
      if (text === undefined) return Option.none()
      return Option.some(yield* decodeResult(workflow, text, context))
    }),

    interrupt: (workflow, executionId) =>
      Effect.flatMap(stubFor(workflow._tag, executionId), (stub) => call(stub.interrupt())),

    interruptUnsafe: (workflow, executionId) =>
      Effect.flatMap(stubFor(workflow._tag, executionId), (stub) => call(stub.interruptUnsafe())),

    resume: (workflow, executionId) =>
      Effect.flatMap(stubFor(workflow._tag, executionId), (stub) => call(stub.resume())),

    activityExecute: Effect.fnUntraced(function*(activity, attempt) {
      const { handle, instance } = yield* localHandle("Activity execution")
      const key = `${activity.name}/${attempt}`
      const stored = handle.loadActivity(key)
      if (stored !== undefined) {
        return new Workflow.Complete({ exit: yield* decodeExit(stored, Context.empty()) })
      }
      const activityInstance = WorkflowEngine.WorkflowInstance.initial(instance.workflow, instance.executionId)
      activityInstance.interrupted = instance.interrupted
      const result = yield* activity.executeEncoded.pipe(
        Workflow.intoResult,
        Effect.provideService(WorkflowEngine.WorkflowInstance, activityInstance)
      )
      if (result._tag === "Complete") {
        handle.saveActivity(key, yield* encodeExit(result.exit, Context.empty()))
      }
      return result
    }),

    deferredResult: Effect.fnUntraced(function*(deferred) {
      const { handle, instance } = yield* localHandle("DurableDeferred reads")
      const pending = deferredState.pendingResult(instance.executionId, deferred.name)
      if (pending !== undefined) return Option.some(pending)
      const stored = handle.loadDeferred(deferred.name)
      if (stored === undefined) return Option.none()
      return Option.some(yield* decodeExit(stored, Context.empty()))
    }),

    deferredDone: Effect.fnUntraced(function*({ deferredName, executionId, exit, workflowName }) {
      const text = yield* encodeExit(exit, Context.empty())
      const stub = yield* stubFor(workflowName, executionId)
      yield* call(stub.deferredDone(deferredName, text))
    }),

    scheduleClock: Effect.fnUntraced(function*(workflow, opts) {
      const wakeUp = clock.currentTimeMillisUnsafe() + Math.ceil(Duration.toMillis(opts.clock.duration))
      const stub = yield* stubFor(workflow._tag, opts.executionId)
      yield* call(stub.scheduleClock(opts.clock.name, opts.clock.deferred.name, wakeUp))
    })
  })
})

/**
 * Creates the `WorkflowEngine` service backed by the workflow Durable Object
 * namespace binding.
 *
 * **Details**
 *
 * Inside a workflow Durable Object the engine operates on the local execution
 * handle, so activities and deferred reads never leave the object. Everywhere
 * else it resolves the target execution's object with `getByName` and drives
 * it over the same-Worker binding.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options: LayerOptions) {
  return yield* makeWithRegistry(
    {
      getByName: (name) => options.workflowNamespace.getByName(name) as unknown as WorkflowClient
    },
    makeWorkflowRegistry()
  )
})

/**
 * Layer that provides the `WorkflowEngine` backed by the workflow Durable
 * Object namespace binding.
 *
 * **Details**
 *
 * `CloudflareCluster.layer` already includes this layer; use it directly only
 * when the workflow engine is needed without the rest of the cluster.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: LayerOptions): Layer.Layer<WorkflowEngine.WorkflowEngine> =>
  Layer.effect(WorkflowEngine.WorkflowEngine)(make(options))
