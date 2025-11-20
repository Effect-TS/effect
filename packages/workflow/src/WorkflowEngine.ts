/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberMap from "effect/FiberMap"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as Activity from "./Activity.js"
import type { DurableClock } from "./DurableClock.js"
import type * as DurableDeferred from "./DurableDeferred.js"
import * as Workflow from "./Workflow.js"

/**
 * @since 1.0.0
 * @category Services
 */
export class WorkflowEngine extends Context.Tag("@effect/workflow/WorkflowEngine")<
  WorkflowEngine,
  {
    /**
     * Register a workflow with the engine.
     */
    readonly register: (
      workflow: Workflow.Any,
      execute: (
        payload: object,
        executionId: string
      ) => Effect.Effect<unknown, unknown, WorkflowInstance | WorkflowEngine>
    ) => Effect.Effect<void, never, Scope.Scope>

    /**
     * Execute a registered workflow.
     */
    readonly execute: <const Discard extends boolean>(
      options: {
        readonly workflow: Workflow.Any
        readonly executionId: string
        readonly payload: object
        readonly discard: Discard
        readonly parent?: WorkflowInstance["Type"] | undefined
      }
    ) => Effect.Effect<Discard extends true ? void : Workflow.Result<unknown, unknown>>

    /**
     * Poll a registered workflow for its current status.
     *
     * If the workflow has not run yet, it will return `undefined`, otherwise it
     * will return the current `Workflow.Result`.
     */
    readonly poll: (
      options: {
        readonly workflow: Workflow.Any
        readonly executionId: string
      }
    ) => Effect.Effect<Workflow.Result<unknown, unknown> | undefined>

    /**
     * Interrupt a registered workflow.
     */
    readonly interrupt: (
      workflow: Workflow.Any,
      executionId: string
    ) => Effect.Effect<void>

    /**
     * Resume a registered workflow.
     */
    readonly resume: (
      workflow: Workflow.Any,
      executionId: string
    ) => Effect.Effect<void>

    /**
     * Execute an activity from a workflow.
     */
    readonly activityExecute: (
      options: {
        readonly activity: Activity.Any
        readonly attempt: number
      }
    ) => Effect.Effect<Workflow.Result<unknown, unknown>, never, WorkflowInstance>

    /**
     * Try to retrieve the result of an DurableDeferred
     */
    readonly deferredResult: (
      deferred: DurableDeferred.Any
    ) => Effect.Effect<Option.Option<Schema.ExitEncoded<unknown, unknown, unknown>>, never, WorkflowInstance>

    /**
     * Set the result of a DurableDeferred, and then resume any waiting
     * workflows.
     */
    readonly deferredDone: (
      options: {
        readonly workflowName: string
        readonly executionId: string
        readonly deferredName: string
        readonly exit: Schema.ExitEncoded<unknown, unknown, unknown>
      }
    ) => Effect.Effect<void>

    /**
     * Schedule a wake up for a DurableClock
     */
    readonly scheduleClock: (options: {
      readonly workflow: Workflow.Any
      readonly executionId: string
      readonly clock: DurableClock
    }) => Effect.Effect<void>
  }
>() {}

/**
 * @since 1.0.0
 * @category Services
 */
export class WorkflowInstance extends Context.Tag("@effect/workflow/WorkflowEngine/WorkflowInstance")<
  WorkflowInstance,
  {
    /**
     * The workflow execution ID.
     */
    readonly executionId: string

    /**
     * The workflow definition.
     */
    readonly workflow: Workflow.Any

    /**
     * Whether the workflow has requested to be suspended.
     */
    suspended: boolean

    /**
     * Whether the workflow has requested to be interrupted.
     */
    interrupted: boolean

    /**
     * When SuspendOnFailure is triggered, the cause of the failure is stored
     * here.
     */
    cause: Cause.Cause<never> | undefined

    readonly activityState: {
      count: number
      readonly latch: Effect.Latch
    }
  }
>() {
  static initial(workflow: Workflow.Any, executionId: string): WorkflowInstance["Type"] {
    return WorkflowInstance.of({
      executionId,
      workflow,
      suspended: false,
      interrupted: false,
      cause: undefined,
      activityState: {
        count: 0,
        latch: Effect.unsafeMakeLatch()
      }
    })
  }
}

/**
 * @since 1.0.0
 * @category In-memory
 */
export const layerMemory: Layer.Layer<WorkflowEngine> = Layer.scoped(
  WorkflowEngine,
  Effect.gen(function*() {
    const scope = yield* Effect.scope

    const workflows = new Map<string, {
      readonly workflow: Workflow.Any
      readonly execute: (
        payload: object,
        executionId: string
      ) => Effect.Effect<unknown, unknown, WorkflowInstance | WorkflowEngine>
      readonly scope: Scope.Scope
    }>()

    type ExecutionState = {
      readonly payload: object
      readonly execute: (
        payload: object,
        executionId: string
      ) => Effect.Effect<unknown, unknown, WorkflowInstance | WorkflowEngine>
      readonly parent: string | undefined
      instance: WorkflowInstance["Type"]
      fiber: Fiber.RuntimeFiber<Workflow.Result<unknown, unknown>> | undefined
      resumeLatch?: Effect.Latch
    }
    const executions = new Map<string, ExecutionState>()

    type ActivityState = {
      exit: Exit.Exit<Workflow.Result<unknown, unknown>> | undefined
    }
    const activities = new Map<string, ActivityState>()

    const resume = Effect.fnUntraced(function*(executionId: string): Effect.fn.Return<void> {
      const state = executions.get(executionId)
      if (!state) return
      const exit = state.fiber?.unsafePoll()
      if (exit && exit._tag === "Success" && exit.value._tag === "Complete") {
        return
      } else if (state.fiber && !exit) {
        return
      }

      const entry = workflows.get(state.instance.workflow.name)!
      const instance = WorkflowInstance.initial(state.instance.workflow, state.instance.executionId)
      instance.interrupted = state.instance.interrupted
      state.instance = instance
      state.fiber = yield* state.execute(state.payload, state.instance.executionId).pipe(
        Effect.onExit(() => {
          if (!instance.interrupted) {
            return Effect.void
          }
          instance.suspended = false
          return Effect.withFiberRuntime<void>((fiber) => Effect.interruptible(Fiber.interrupt(fiber)))
        }),
        Workflow.intoResult,
        Effect.provideService(WorkflowInstance, instance),
        Effect.provideService(WorkflowEngine, engine),
        Effect.tap((result) => {
          if (!state.parent || result._tag !== "Complete") {
            return Effect.void
          }
          return Effect.forkIn(resume(state.parent), scope)
        }),
        Effect.forkIn(entry.scope)
      )
    })

    const deferredResults = new Map<string, Schema.ExitEncoded<any, any, any>>()

    const clocks = yield* FiberMap.make()

    const engine = WorkflowEngine.of({
      register: Effect.fnUntraced(function*(workflow, execute) {
        workflows.set(workflow.name, {
          workflow,
          execute,
          scope: yield* Effect.scope
        })
      }),
      execute: Effect.fnUntraced(function*(options) {
        const entry = workflows.get(options.workflow.name)
        if (!entry) {
          return yield* Effect.die(`Workflow ${options.workflow.name} is not registered`)
        }

        let state = executions.get(options.executionId)
        if (!state) {
          state = {
            payload: options.payload,
            execute: entry.execute,
            instance: WorkflowInstance.initial(options.workflow, options.executionId),
            fiber: undefined,
            parent: options.parent?.executionId
          }
          executions.set(options.executionId, state)
          yield* resume(options.executionId)
        }
        if (options.discard) return
        return (yield* Fiber.join(state.fiber!)) as any
      }),
      interrupt: Effect.fnUntraced(function*(_workflow, executionId) {
        const state = executions.get(executionId)
        if (!state) return
        state.instance.interrupted = true
        yield* resume(executionId)
      }),
      resume(_workflow, executionId) {
        return resume(executionId)
      },
      activityExecute: Effect.fnUntraced(function*(options) {
        const instance = yield* WorkflowInstance
        const activityId = `${instance.executionId}/${options.activity.name}/${options.attempt}`
        let state = activities.get(activityId)
        if (state) {
          const exit = state.exit
          if (exit && exit._tag === "Success" && exit.value._tag === "Suspended") {
            state.exit = undefined
          } else if (exit) {
            return yield* exit
          }
        } else {
          state = { exit: undefined }
          activities.set(activityId, state)
        }
        const activityInstance = WorkflowInstance.initial(instance.workflow, instance.executionId)
        activityInstance.interrupted = instance.interrupted
        return yield* options.activity.executeEncoded.pipe(
          Workflow.intoResult,
          Effect.provideService(WorkflowInstance, activityInstance),
          Effect.onExit((exit) => {
            state.exit = exit
            return Effect.void
          })
        )
      }),
      poll: (options) =>
        Effect.suspend(() => {
          const state = executions.get(options.executionId)
          if (!state) {
            return Effect.succeed(undefined)
          }
          const exit = state.fiber?.unsafePoll()
          return exit ?? Effect.succeed(undefined)
        }),
      deferredResult: Effect.fnUntraced(function*(deferred) {
        const instance = yield* WorkflowInstance
        const id = `${instance.executionId}/${deferred.name}`
        return Option.fromNullable(deferredResults.get(id))
      }),
      deferredDone: (options) =>
        Effect.suspend(() => {
          const id = `${options.executionId}/${options.deferredName}`
          if (deferredResults.has(id)) return Effect.void
          deferredResults.set(id, options.exit)
          return resume(options.executionId)
        }),
      scheduleClock: (options) =>
        engine.deferredDone({
          workflowName: options.workflow.name,
          executionId: options.executionId,
          deferredName: options.clock.deferred.name,
          exit: Schema.encodeSync(options.clock.deferred.exitSchema)(Exit.void)
        }).pipe(
          Effect.delay(options.clock.duration),
          FiberMap.run(clocks, `${options.executionId}/${options.clock.name}`, { onlyIfMissing: true }),
          Effect.asVoid
        )
    })

    return engine
  })
)
