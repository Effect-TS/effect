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
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import type * as Activity from "./Activity.js"
import type { DurableClock } from "./DurableClock.js"
import type * as DurableDeferred from "./DurableDeferred.js"
import * as Workflow from "./Workflow.js"

/**
 * @since 4.0.0
 * @category Services
 */
export class WorkflowEngine extends Context.Tag("@effect/workflow/WorkflowEngine")<
  WorkflowEngine,
  {
    /**
     * Register a workflow with the engine.
     */
    readonly register: <
      Name extends string,
      Payload extends Workflow.AnyStructSchema,
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All,
      R
    >(
      workflow: Workflow.Workflow<Name, Payload, Success, Error>,
      execute: (
        payload: Payload["Type"],
        executionId: string
      ) => Effect.Effect<Success["Type"], Error["Type"], R>
    ) => Effect.Effect<
      void,
      never,
      | Scope.Scope
      | Exclude<
        R,
        | WorkflowEngine
        | WorkflowInstance
        | Workflow.Execution<Name>
        | Scope.Scope
      >
      | Payload["Context"]
      | Success["Context"]
      | Error["Context"]
    >

    /**
     * Execute a registered workflow.
     */
    readonly execute: <
      Name extends string,
      Payload extends Workflow.AnyStructSchema,
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All,
      const Discard extends boolean = false
    >(
      workflow: Workflow.Workflow<Name, Payload, Success, Error>,
      options: {
        readonly executionId: string
        readonly payload: Payload["Type"]
        readonly discard?: Discard | undefined
        readonly suspendedRetrySchedule?:
          | Schedule.Schedule<any, unknown>
          | undefined
      }
    ) => Effect.Effect<
      Discard extends true ? string : Success["Type"],
      Error["Type"],
      | Payload["Context"]
      | Success["Context"]
      | Error["Context"]
    >

    /**
     * Execute a registered workflow.
     */
    readonly poll: <
      Name extends string,
      Payload extends Workflow.AnyStructSchema,
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All
    >(
      workflow: Workflow.Workflow<Name, Payload, Success, Error>,
      executionId: string
    ) => Effect.Effect<
      Workflow.Result<Success["Type"], Error["Type"]> | undefined,
      never,
      Success["Context"] | Error["Context"]
    >

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
    readonly activityExecute: <
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All,
      R
    >(
      activity: Activity.Activity<Success, Error, R>,
      attempt: number
    ) => Effect.Effect<
      Workflow.Result<Success["Type"], Error["Type"]>,
      never,
      | Success["Context"]
      | Error["Context"]
      | R
      | WorkflowInstance
    >

    /**
     * Try to retrieve the result of an DurableDeferred
     */
    readonly deferredResult: <
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All
    >(
      deferred: DurableDeferred.DurableDeferred<Success, Error>
    ) => Effect.Effect<
      Exit.Exit<Success["Type"], Error["Type"]> | undefined,
      never,
      WorkflowInstance
    >

    /**
     * Set the result of a DurableDeferred, and then resume any waiting
     * workflows.
     */
    readonly deferredDone: <
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All
    >(
      deferred: DurableDeferred.DurableDeferred<Success, Error>,
      options: {
        readonly workflowName: string
        readonly executionId: string
        readonly deferredName: string
        readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
      }
    ) => Effect.Effect<
      void,
      never,
      Success["Context"] | Error["Context"]
    >

    /**
     * Schedule a wake up for a DurableClock
     */
    readonly scheduleClock: (
      workflow: Workflow.Any,
      options: {
        readonly executionId: string
        readonly clock: DurableClock
      }
    ) => Effect.Effect<void>
  }
>() {}

/**
 * @since 4.0.0
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
     * The workflow scope, that represents the lifetime of the workflow.
     */
    readonly scope: Scope.CloseableScope

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
  static initial(
    workflow: Workflow.Any,
    executionId: string
  ): WorkflowInstance["Type"] {
    return WorkflowInstance.of({
      executionId,
      workflow,
      scope: Effect.runSync(Scope.make()),
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
 * @since 4.0.0
 * @category Encoded
 */
export interface Encoded {
  readonly register: (
    workflow: Workflow.Any,
    execute: (
      payload: object,
      executionId: string
    ) => Effect.Effect<unknown, unknown, WorkflowInstance | WorkflowEngine>
  ) => Effect.Effect<void, never, Scope.Scope>
  readonly execute: <const Discard extends boolean>(
    workflow: Workflow.Any,
    options: {
      readonly executionId: string
      readonly payload: object
      readonly discard: Discard
      readonly parent?: WorkflowInstance["Type"] | undefined
    }
  ) => Effect.Effect<
    Discard extends true ? void : Workflow.Result<unknown, unknown>
  >
  readonly poll: (
    workflow: Workflow.Any,
    executionId: string
  ) => Effect.Effect<Workflow.Result<unknown, unknown> | undefined>
  readonly interrupt: (
    workflow: Workflow.Any,
    executionId: string
  ) => Effect.Effect<void>
  readonly resume: (
    workflow: Workflow.Any,
    executionId: string
  ) => Effect.Effect<void>
  readonly activityExecute: (
    activity: Activity.Any,
    attempt: number
  ) => Effect.Effect<
    Workflow.Result<unknown, unknown>,
    never,
    WorkflowInstance
  >
  readonly deferredResult: (
    deferred: DurableDeferred.Any
  ) => Effect.Effect<
    Exit.Exit<unknown, unknown> | undefined,
    never,
    WorkflowInstance
  >
  readonly deferredDone: (options: {
    readonly workflowName: string
    readonly executionId: string
    readonly deferredName: string
    readonly exit: Exit.Exit<unknown, unknown>
  }) => Effect.Effect<void>
  readonly scheduleClock: (
    workflow: Workflow.Any,
    options: {
      readonly executionId: string
      readonly clock: DurableClock
    }
  ) => Effect.Effect<void>
}

/**
 * @since 4.0.0
 * @category Constructors
 */
export const makeUnsafe = (options: Encoded): WorkflowEngine["Type"] =>
  WorkflowEngine.of({
    register: Effect.fnUntraced(function*(workflow, execute) {
      const context = yield* Effect.context<WorkflowEngine>()
      yield* options.register(workflow, (payload, executionId) =>
        Effect.suspend(() =>
          execute(payload, executionId)
        ).pipe(
          Effect.mapInputContext(
            (input) => Context.merge(context, input) as Context.Context<any>
          )
        ))
    }),
    execute: Effect.fnUntraced(function*<
      Name extends string,
      Payload extends Workflow.AnyStructSchema,
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All,
      const Discard extends boolean = false
    >(
      self: Workflow.Workflow<Name, Payload, Success, Error>,
      opts: {
        readonly executionId: string
        readonly payload: Payload["Type"]
        readonly discard?: Discard | undefined
        readonly suspendedRetrySchedule?:
          | Schedule.Schedule<any, unknown>
          | undefined
      }
    ) {
      const payload = opts.payload
      const executionId = opts.executionId
      const suspendedRetrySchedule = opts.suspendedRetrySchedule ?? defaultRetrySchedule
      yield* Effect.annotateCurrentSpan({ executionId })
      let result: Workflow.Result<Success["Type"], Error["Type"]> | undefined

      // link interruption with parent workflow
      const parentInstance = yield* Effect.serviceOption(WorkflowInstance)
      if (Option.isSome(parentInstance)) {
        const instance = parentInstance.value
        yield* Effect.addFinalizer(() => {
          if (!instance.interrupted || result?._tag === "Complete") {
            return Effect.void
          }
          return options.interrupt(self, executionId)
        })
      }

      if (opts.discard) {
        yield* options.execute(self, {
          executionId,
          payload: payload as object,
          discard: true
        })
        return executionId
      }

      const run = options.execute(self, {
        executionId,
        payload: payload as object,
        discard: false,
        parent: Option.getOrUndefined(parentInstance)
      })
      if (Option.isSome(parentInstance)) {
        result = yield* Workflow.wrapActivityResult(
          run,
          (result) => result._tag === "Suspended"
        )
        if (result._tag === "Suspended") {
          return yield* Workflow.suspend(parentInstance.value)
        }
        return yield* result.exit
      }

      let sleep: Effect.Effect<any> | undefined
      while (true) {
        result = yield* run
        if (result._tag === "Complete") {
          return yield* result.exit as Exit.Exit<any>
        }
        sleep ??= (yield* Schedule.driver(suspendedRetrySchedule)).next(void 0).pipe(
          Effect.catchAll(() => Effect.dieMessage(`${self.name}.execute: suspendedRetrySchedule exhausted`))
        )
        yield* sleep
      }
    }),
    poll: options.poll,
    interrupt: options.interrupt,
    resume: options.resume,
    activityExecute: Effect.fnUntraced(function*<
      Success extends Schema.Schema.Any,
      Error extends Schema.Schema.All,
      R
    >(activity: Activity.Activity<Success, Error, R>, attempt: number) {
      const result = yield* options.activityExecute(activity, attempt)
      if (result._tag === "Suspended") {
        return result
      }
      const exit = yield* Effect.orDie(
        Schema.decode(activity.exitSchema)(result.exit)
      )
      return new Workflow.Complete({ exit })
    }),
    deferredResult: Effect.fnUntraced(
      function*<Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
        deferred: DurableDeferred.DurableDeferred<Success, Error>
      ) {
        const instance = yield* WorkflowInstance
        yield* Effect.annotateCurrentSpan({
          executionId: instance.executionId
        })
        const exit = yield* options.deferredResult(deferred)
        if (exit === undefined) {
          return exit
        }
        return yield* Effect.orDie(
          Schema.decodeUnknown(deferred.exitSchema)(exit)
        ) as Effect.Effect<Exit.Exit<Success["Type"], Error["Type"]>>
      }
    ),
    deferredDone: Effect.fnUntraced(
      function*<Success extends Schema.Schema.Any, Error extends Schema.Schema.All>(
        deferred: DurableDeferred.DurableDeferred<Success, Error>,
        opts: {
          readonly workflowName: string
          readonly executionId: string
          readonly deferredName: string
          readonly exit: Exit.Exit<Success["Type"], Error["Type"]>
        }
      ) {
        return yield* options.deferredDone({
          workflowName: opts.workflowName,
          executionId: opts.executionId,
          deferredName: opts.deferredName,
          exit: yield* Schema.encode(deferred.exitSchema)(
            opts.exit
          ) as Effect.Effect<Exit.Exit<unknown, unknown>>
        })
      }
    ),
    scheduleClock: options.scheduleClock
  })

const defaultRetrySchedule = Schedule.exponential(200, 1.5).pipe(
  Schedule.either(Schedule.spaced(30000))
)

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

    const deferredResults = new Map<string, Exit.Exit<any, any>>()

    const clocks = yield* FiberMap.make()

    const engine = makeUnsafe({
      register: Effect.fnUntraced(function*(workflow, execute) {
        workflows.set(workflow.name, {
          workflow,
          execute,
          scope: yield* Effect.scope
        })
      }),
      execute: Effect.fnUntraced(function*(workflow, options) {
        const entry = workflows.get(workflow.name)
        if (!entry) {
          return yield* Effect.die(`Workflow ${workflow.name} is not registered`)
        }

        let state = executions.get(options.executionId)
        if (!state) {
          state = {
            payload: options.payload,
            execute: entry.execute,
            instance: WorkflowInstance.initial(workflow, options.executionId),
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
      activityExecute: Effect.fnUntraced(function*(activity, attempt) {
        const instance = yield* WorkflowInstance
        const activityId = `${instance.executionId}/${activity.name}/${attempt}`
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
        return yield* activity.executeEncoded.pipe(
          Workflow.intoResult,
          Effect.provideService(WorkflowInstance, activityInstance),
          Effect.onExit((exit) => {
            state.exit = exit
            return Effect.void
          })
        )
      }),
      poll: (_workflow, executionId) =>
        Effect.suspend(() => {
          const state = executions.get(executionId)
          if (!state) {
            return Effect.succeed(undefined)
          }
          const exit = state.fiber?.unsafePoll()
          return exit ?? Effect.succeed(undefined)
        }),
      deferredResult: Effect.fnUntraced(function*(deferred) {
        const instance = yield* WorkflowInstance
        const id = `${instance.executionId}/${deferred.name}`
        return deferredResults.get(id)
      }),
      deferredDone: (options) =>
        Effect.suspend(() => {
          const id = `${options.executionId}/${options.deferredName}`
          if (deferredResults.has(id)) return Effect.void
          deferredResults.set(id, options.exit)
          return resume(options.executionId)
        }),
      scheduleClock: (workflow, options) =>
        engine.deferredDone(options.clock.deferred, {
          workflowName: workflow.name,
          executionId: options.executionId,
          deferredName: options.clock.deferred.name,
          exit: Exit.void
        }).pipe(
          Effect.delay(options.clock.duration),
          FiberMap.run(clocks, `${options.executionId}/${options.clock.name}`, { onlyIfMissing: true }),
          Effect.asVoid
        )
    })

    return engine
  })
)
