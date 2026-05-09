/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcServer from "@effect/rpc/RpcServer"
import { DurableDeferred } from "@effect/workflow"
import * as Activity from "@effect/workflow/Activity"
import * as DurableClock from "@effect/workflow/DurableClock"
import * as Workflow from "@effect/workflow/Workflow"
import { makeUnsafe, WorkflowEngine, WorkflowInstance } from "@effect/workflow/WorkflowEngine"
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import * as PrimaryKey from "effect/PrimaryKey"
import * as RcMap from "effect/RcMap"
import type * as Record from "effect/Record"
import * as Runtime from "effect/Runtime"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as ClusterSchema from "./ClusterSchema.js"
import * as DeliverAt from "./DeliverAt.js"
import * as Entity from "./Entity.js"
import { EntityAddress } from "./EntityAddress.js"
import { EntityId } from "./EntityId.js"
import { EntityType } from "./EntityType.js"
import { MessageStorage } from "./MessageStorage.js"
import type { WithExitEncoded } from "./Reply.js"
import * as Reply from "./Reply.js"
import * as Sharding from "./Sharding.js"
import * as Snowflake from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.gen(function*() {
  const sharding = yield* Sharding.Sharding
  const storage = yield* MessageStorage

  const workflows = new Map<string, Workflow.Any>()
  const entities = new Map<
    string,
    Entity.Entity<
      string,
      | Rpc.Rpc<
        "run",
        Schema.Struct<
          Record<
            typeof payloadParentKey,
            Schema.optional<
              Schema.Struct<{
                workflowName: typeof Schema.String
                executionId: typeof Schema.String
              }>
            >
          >
        >,
        Schema.Schema<Workflow.Result<any, any>>
      >
      | Rpc.Rpc<"deferred", Schema.Struct<{ name: typeof Schema.String; exit: typeof ExitUnknown }>, typeof ExitUnknown>
      | Rpc.Rpc<
        "activity",
        Schema.Struct<{ name: typeof Schema.String; attempt: typeof Schema.Number }>,
        Schema.Schema<Workflow.Result<any, any>>
      >
      | Rpc.Rpc<"resume", Schema.Struct<{}>>
    >
  >()
  const partialEntities = new Map<
    string,
    Entity.Entity<
      string,
      | Rpc.Rpc<"deferred", Schema.Struct<{ name: typeof Schema.String; exit: typeof ExitUnknown }>, typeof ExitUnknown>
      | Rpc.Rpc<
        "activity",
        Schema.Struct<{ name: typeof Schema.String; attempt: typeof Schema.Number }>,
        Schema.Schema<Workflow.Result<any, any>>
      >
      | Rpc.Rpc<"resume">
    >
  >()
  const ensureEntity = (workflow: Workflow.Any) => {
    let entity = entities.get(workflow.name)
    if (!entity) {
      entity = makeWorkflowEntity(workflow) as any
      workflows.set(workflow.name, workflow)
      entities.set(workflow.name, entity as any)
    }
    return entity!
  }
  const ensurePartialEntity = (workflowName: string) => {
    let entity = partialEntities.get(workflowName)
    if (!entity) {
      entity = makePartialWorkflowEntity(workflowName) as any
      partialEntities.set(workflowName, entity as any)
    }
    return entity!
  }

  const activities = new Map<string, {
    readonly activity: Activity.Any
    readonly runtime: Runtime.Runtime<any>
  }>()
  const interruptedActivities = new Set<string>()
  const activityLatches = new Map<string, Effect.Latch>()
  const clients = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(workflowName: string) {
      const entity = entities.get(workflowName)
      if (!entity) {
        return yield* Effect.dieMessage(`Workflow ${workflowName} not registered`)
      }
      return yield* entity.client
    }),
    idleTimeToLive: "5 minutes"
  })
  const clientsPartial = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(workflowName: string) {
      const entity = entities.get(workflowName) ?? ensurePartialEntity(workflowName)
      return yield* entity.client
    }),
    idleTimeToLive: "5 minutes"
  })
  const clockClient = yield* ClockEntity.client

  const requestIdFor = Effect.fnUntraced(function*(options: {
    readonly workflow: Workflow.Any
    readonly entityType: string
    readonly executionId: string
    readonly tag: string
    readonly id: string
  }) {
    const shardGroup = Context.get(options.workflow.annotations, ClusterSchema.ShardGroup)(
      options.executionId as EntityId
    )
    const entityId = EntityId.make(options.executionId)
    const address = new EntityAddress({
      entityType: EntityType.make(options.entityType),
      entityId,
      shardId: sharding.getShardId(entityId, shardGroup)
    })
    return yield* storage.requestIdForPrimaryKey({ address, tag: options.tag, id: options.id })
  })

  const replyForRequestId = Effect.fnUntraced(function*(requestId: Snowflake.Snowflake) {
    const replies = yield* storage.repliesForUnfiltered([requestId])
    return Arr.last(replies).pipe(
      Option.filter((reply) => reply._tag === "WithExit"),
      Option.map((reply) =>
        reply as WithExitEncoded<Rpc.Rpc<string, Schema.Struct<{}>, Schema.Schema<Workflow.Result<any, any>>>>
      )
    )
  })

  const requestReply = Effect.fnUntraced(function*(options: {
    readonly workflow: Workflow.Any
    readonly entityType: string
    readonly executionId: string
    readonly tag: string
    readonly id: string
  }) {
    const requestId = yield* requestIdFor(options)
    if (Option.isNone(requestId)) {
      return Option.none()
    }
    return yield* replyForRequestId(requestId.value)
  })

  const resetActivityAttempt = Effect.fnUntraced(
    function*(options: {
      readonly workflow: Workflow.Any
      readonly executionId: string
      readonly activity: Activity.Any
      readonly attempt: number
    }) {
      const requestId = yield* requestIdFor({
        workflow: options.workflow,
        entityType: `Workflow/${options.workflow.name}`,
        executionId: options.executionId,
        tag: "activity",
        id: activityPrimaryKey(options.activity.name, options.attempt)
      })
      if (Option.isNone(requestId)) return
      yield* sharding.reset(requestId.value)
    },
    Effect.retry({
      times: 3,
      schedule: Schedule.exponential(250)
    }),
    Effect.orDie
  )

  const clearClock = Effect.fnUntraced(function*(options: {
    readonly workflow: Workflow.Any
    readonly executionId: string
  }) {
    const shardGroup = Context.get(options.workflow.annotations, ClusterSchema.ShardGroup)(
      options.executionId as EntityId
    )
    const entityId = EntityId.make(options.executionId)
    const shardId = sharding.getShardId(entityId, shardGroup)
    const clockAddress = new EntityAddress({
      entityType: ClockEntity.type,
      entityId,
      shardId
    })
    yield* storage.clearAddress(clockAddress)
  })

  const resume = Effect.fnUntraced(function*(workflow: Workflow.Any, executionId: string) {
    const maybeReply = yield* requestReply({
      workflow,
      entityType: `Workflow/${workflow.name}`,
      executionId,
      tag: "run",
      id: ""
    })
    const maybeSuspended = Option.filter(
      maybeReply,
      (reply) => reply.exit._tag === "Success" && reply.exit.value._tag === "Suspended"
    )
    if (Option.isNone(maybeSuspended)) return
    yield* sharding.reset(Snowflake.Snowflake(maybeSuspended.value.requestId))
    yield* sharding.pollStorage
  })

  const sendResumeParent = Effect.fnUntraced(function*(options: {
    readonly workflowName: string
    readonly executionId: string
  }) {
    const requestId = yield* requestIdFor({
      workflow: workflows.get(options.workflowName)!,
      entityType: `Workflow/${options.workflowName}`,
      executionId: options.executionId,
      tag: "resume",
      id: ""
    })
    if (Option.isNone(requestId)) {
      const client = (yield* RcMap.get(clientsPartial, options.workflowName))(options.executionId)
      return yield* client.resume({} as any, { discard: true })
    }
    const reply = yield* replyForRequestId(requestId.value)
    if (Option.isNone(reply)) return
    yield* sharding.reset(requestId.value)
  }, Effect.scoped)

  const engine = makeUnsafe({
    register: (workflow, execute) =>
      Effect.suspend(() =>
        sharding.registerEntity(
          ensureEntity(workflow),
          Effect.gen(function*() {
            const address = yield* Entity.CurrentAddress
            const executionId = address.entityId
            return {
              run: (request: Entity.Request<any>) => {
                const instance = WorkflowInstance.initial(workflow, executionId)
                const payload = request.payload
                let parent: { workflowName: string; executionId: string } | undefined
                if (payload[payloadParentKey]) {
                  parent = payload[payloadParentKey]
                }
                return execute(workflow.payloadSchema.make(payload), executionId).pipe(
                  Effect.onExit((exit) => {
                    const suspendOnFailure = Context.get(workflow.annotations, Workflow.SuspendOnFailure)
                    if (!instance.suspended && !(suspendOnFailure && exit._tag === "Failure")) {
                      return parent ? ensureSuccess(sendResumeParent(parent)) : Effect.void
                    }
                    return engine.deferredResult(InterruptSignal).pipe(
                      Effect.flatMap((maybeExit) => {
                        if (maybeExit === undefined) {
                          return Effect.void
                        }
                        instance.suspended = false
                        instance.interrupted = true
                        return Effect.zipRight(
                          Effect.ignore(clearClock({ workflow, executionId })),
                          Effect.withFiberRuntime<void>((fiber) => Effect.interruptible(Fiber.interrupt(fiber)))
                        )
                      }),
                      Effect.orDie
                    )
                  }),
                  Workflow.intoResult,
                  Effect.provideService(WorkflowInstance, instance)
                ) as any
              },

              activity(request: Entity.Request<any>) {
                const activityId = `${executionId}/${request.payload.name}`
                const instance = WorkflowInstance.initial(workflow, executionId)
                interruptedActivities.delete(activityId)
                return Effect.gen(function*() {
                  let entry = activities.get(activityId)
                  while (!entry) {
                    const latch = Effect.unsafeMakeLatch()
                    activityLatches.set(activityId, latch)
                    yield* latch.await
                    entry = activities.get(activityId)
                  }
                  const contextMap = new Map(entry.runtime.context.unsafeMap)
                  contextMap.set(Activity.CurrentAttempt.key, request.payload.attempt)
                  contextMap.set(WorkflowInstance.key, instance)
                  const runtime = Runtime.make({
                    context: Context.unsafeMake(contextMap),
                    fiberRefs: entry.runtime.fiberRefs,
                    runtimeFlags: Runtime.defaultRuntimeFlags
                  })
                  return yield* entry.activity.executeEncoded.pipe(
                    Effect.provide(runtime)
                  )
                }).pipe(
                  Workflow.intoResult,
                  Effect.catchAllCause((cause) => {
                    const interruptors = Cause.interruptors(cause)
                    // we only want to store interrupts as suspends when the
                    // client requested it
                    const ids = Array.from(interruptors, (id) => Array.from(FiberId.ids(id))).flat()
                    const suspend = ids.includes(RpcServer.fiberIdClientInterrupt.id)
                    if (suspend) {
                      interruptedActivities.add(activityId)
                      return Effect.succeed(new Workflow.Suspended())
                    }
                    return Effect.failCause(cause)
                  }),
                  Effect.provideService(WorkflowInstance, instance),
                  Effect.provideService(Activity.CurrentAttempt, request.payload.attempt),
                  Effect.ensuring(Effect.sync(() => {
                    activities.delete(activityId)
                  })),
                  Rpc.wrap({
                    fork: true,
                    uninterruptible: true
                  })
                )
              },

              deferred: Effect.fnUntraced(function*(request: Entity.Request<any>) {
                yield* ensureSuccess(resume(workflow, executionId))
                return request.payload.exit
              }),

              resume: () => ensureSuccess(resume(workflow, executionId))
            }
          })
        ) as Effect.Effect<void, never, Scope.Scope>
      ),

    execute: (workflow, { discard, executionId, parent, payload }) => {
      ensureEntity(workflow)
      return RcMap.get(clients, workflow.name).pipe(
        Effect.flatMap((make) =>
          make(executionId).run(
            parent ?
              {
                ...payload,
                [payloadParentKey]: { workflowName: parent.workflow.name, executionId: parent.executionId }
              } :
              payload,
            { discard }
          )
        ),
        Effect.orDie,
        Effect.scoped
      )
    },

    poll: Effect.fnUntraced(function*(workflow, executionId) {
      const entity = ensureEntity(workflow)
      const exitSchema = Rpc.exitSchema(entity.protocol.requests.get("run")!)
      const oreply = yield* requestReply({
        workflow,
        entityType: `Workflow/${workflow.name}`,
        executionId,
        tag: "run",
        id: ""
      })
      if (Option.isNone(oreply)) return undefined
      const exit = yield* (Schema.decode(exitSchema)(oreply.value.exit) as Effect.Effect<
        Exit.Exit<any, any>,
        ParseResult.ParseError
      >)
      return yield* exit
    }, Effect.orDie),

    interrupt: Effect.fnUntraced(
      function*(workflow, executionId) {
        ensureEntity(workflow)
        const oreply = yield* requestReply({
          workflow,
          entityType: `Workflow/${workflow.name}`,
          executionId,
          tag: "run",
          id: ""
        })
        const nonSuspendedReply = oreply.pipe(
          Option.filter((reply) => reply.exit._tag !== "Success" || reply.exit.value._tag !== "Suspended")
        )
        if (Option.isSome(nonSuspendedReply)) {
          return
        }

        yield* engine.deferredDone(InterruptSignal, {
          workflowName: workflow.name,
          executionId,
          deferredName: InterruptSignal.name,
          exit: Exit.void
        })
      },
      Effect.retry({
        while: (e) => e._tag === "PersistenceError",
        times: 3,
        schedule: Schedule.exponential(250)
      }),
      Effect.orDie
    ),

    resume: (workflow, executionId) => ensureSuccess(resume(workflow, executionId)),

    activityExecute: Effect.fnUntraced(
      function*(activity, attempt) {
        const runtime = yield* Effect.runtime<WorkflowInstance>()
        const context = runtime.context
        const instance = Context.get(context, WorkflowInstance)
        yield* Effect.annotateCurrentSpan("executionId", instance.executionId)
        const activityId = `${instance.executionId}/${activity.name}`
        const client = (yield* RcMap.get(clientsPartial, instance.workflow.name))(instance.executionId)
        while (true) {
          if (!activities.has(activityId)) {
            activities.set(activityId, { activity, runtime })
            const latch = activityLatches.get(activityId)
            if (latch) {
              yield* latch.release
              activityLatches.delete(activityId)
            }
          }
          const result = yield* Effect.orDie(client.activity({ name: activity.name, attempt }))
          // If the activity has suspended and did not execute, we need to resume
          // it by resetting the attempt and re-executing.
          if (result._tag === "Suspended" && (activities.has(activityId) || interruptedActivities.has(activityId))) {
            yield* resetActivityAttempt({
              workflow: instance.workflow,
              executionId: instance.executionId,
              activity,
              attempt
            })
            continue
          }
          activities.delete(activityId)
          return result
        }
      },
      Effect.scoped
    ),

    deferredResult: (deferred) =>
      WorkflowInstance.pipe(
        Effect.flatMap((instance) =>
          requestReply({
            workflow: instance.workflow,
            entityType: `Workflow/${instance.workflow.name}`,
            executionId: instance.executionId,
            tag: "deferred",
            id: deferred.name
          })
        ),
        Effect.map((oreply) => {
          if (Option.isNone(oreply)) {
            return undefined
          }
          const reply = oreply.value
          const decoded = decodeDeferredWithExit(reply as any)
          return decoded.exit._tag === "Success"
            ? decoded.exit.value
            : decoded.exit
        }),
        Effect.retry({
          while: (e) => e._tag === "PersistenceError",
          times: 3,
          schedule: Schedule.exponential(250)
        }),
        Effect.orDie
      ),

    deferredDone: Effect.fnUntraced(
      function*({ deferredName, executionId, exit, workflowName }) {
        const client = yield* RcMap.get(clientsPartial, workflowName)
        return yield* Effect.orDie(
          client(executionId).deferred({
            name: deferredName,
            exit
          }, { discard: true })
        )
      },
      Effect.scoped
    ),

    scheduleClock(workflow, options) {
      const client = clockClient(options.executionId)
      return DateTime.now.pipe(
        Effect.flatMap((now) =>
          client.run({
            name: options.clock.name,
            workflowName: workflow.name,
            wakeUp: DateTime.addDuration(now, options.clock.duration)
          }, { discard: true })
        ),
        Effect.orDie
      )
    }
  })

  return engine
})

const retryPolicy = Schedule.exponential(200, 1.5).pipe(
  Schedule.union(Schedule.spaced("1 minute"))
)

const ensureSuccess = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.sandbox,
    Effect.retry(retryPolicy),
    Effect.orDie
  )

const ActivityRpc = Rpc.make("activity", {
  payload: {
    name: Schema.String,
    attempt: Schema.Number
  },
  primaryKey: ({ attempt, name }) => activityPrimaryKey(name, attempt),
  success: Workflow.Result({
    success: Schema.Unknown,
    error: Schema.Unknown
  })
})
  .annotate(ClusterSchema.Persisted, true)
  .annotate(ClusterSchema.Uninterruptible, "server")

const payloadParentKey = "~@effect/workflow/parent" as const

const makeWorkflowEntity = (workflow: Workflow.Any) =>
  Entity.make(`Workflow/${workflow.name}`, [
    Rpc.make("run", {
      payload: {
        ...workflow.payloadSchema.fields,
        [payloadParentKey]: Schema.optional(Schema.Struct({
          workflowName: Schema.String,
          executionId: Schema.String
        }))
      },
      primaryKey: () => "",
      success: Workflow.Result({
        success: workflow.successSchema,
        error: workflow.errorSchema
      })
    })
      .annotate(ClusterSchema.Persisted, true)
      .annotate(ClusterSchema.Uninterruptible, true),

    DeferredRpc,
    ResumeRpc,
    ActivityRpc
  ]).annotateContext(workflow.annotations)

const ExitUnknown = Schema.Exit({
  success: Schema.Unknown,
  failure: Schema.Unknown,
  defect: Schema.Defect
})

const DeferredRpc = Rpc.make("deferred", {
  payload: {
    name: Schema.String,
    exit: ExitUnknown
  },
  primaryKey: ({ name }) => name,
  success: ExitUnknown
})
  .annotate(ClusterSchema.Persisted, true)
  .annotate(ClusterSchema.Uninterruptible, true)

const decodeDeferredWithExit = Schema.decodeSync(Reply.WithExit.schema(DeferredRpc))

const ResumeRpc = Rpc.make("resume", {
  payload: {},
  primaryKey: () => ""
})
  .annotate(ClusterSchema.Persisted, true)
  .annotate(ClusterSchema.Uninterruptible, true)

const makePartialWorkflowEntity = (workflowName: string) =>
  Entity.make(`Workflow/${workflowName}`, [
    DeferredRpc,
    ResumeRpc,
    ActivityRpc
  ])

const activityPrimaryKey = (activity: string, attempt: number) => `${activity}/${attempt}`

class ClockPayload extends Schema.Class<ClockPayload>(`Workflow/DurableClock/Run`)({
  name: Schema.String,
  workflowName: Schema.String,
  wakeUp: Schema.DateTimeUtcFromNumber
}) {
  [PrimaryKey.symbol]() {
    return this.name
  }
  [DeliverAt.symbol]() {
    return this.wakeUp
  }
}

const ClockEntity = Entity.make("Workflow/-/DurableClock", [
  Rpc.make("run", { payload: ClockPayload })
    .annotate(ClusterSchema.Persisted, true)
    .annotate(ClusterSchema.Uninterruptible, true)
])

const ClockEntityLayer = ClockEntity.toLayer(Effect.gen(function*() {
  const engine = yield* WorkflowEngine
  const address = yield* Entity.CurrentAddress
  const executionId = address.entityId
  return {
    run(request) {
      const deferred = DurableClock.make({ name: request.payload.name, duration: Duration.zero }).deferred
      return ensureSuccess(engine.deferredDone(deferred, {
        workflowName: request.payload.workflowName,
        executionId,
        deferredName: deferred.name,
        exit: Exit.void
      }))
    }
  }
}))

const InterruptSignal = DurableDeferred.make("Workflow/InterruptSignal")

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  WorkflowEngine,
  never,
  Sharding.Sharding | MessageStorage
> = ClockEntityLayer.pipe(
  Layer.provideMerge(Layer.scoped(WorkflowEngine, make))
)
