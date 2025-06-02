/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import { DurableDeferred } from "@effect/workflow"
import * as Activity from "@effect/workflow/Activity"
import * as DurableClock from "@effect/workflow/DurableClock"
import * as Workflow from "@effect/workflow/Workflow"
import { WorkflowEngine, WorkflowInstance } from "@effect/workflow/WorkflowEngine"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as RcMap from "effect/RcMap"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as ClusterSchema from "./ClusterSchema.js"
import * as DeliverAt from "./DeliverAt.js"
import * as Entity from "./Entity.js"
import { EntityAddress } from "./EntityAddress.js"
import { EntityId } from "./EntityId.js"
import { EntityType } from "./EntityType.js"
import { MessageStorage } from "./MessageStorage.js"
import type { WithExitEncoded } from "./Reply.js"
import * as Sharding from "./Sharding.js"
import * as Snowflake from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.gen(function*() {
  const sharding = yield* Sharding.Sharding
  const storage = yield* MessageStorage

  const entities = new Map<
    string,
    Entity.Entity<
      | Rpc.Rpc<"run", Schema.Struct<{}>, Schema.Schema<Workflow.Result<any, any>>>
      | Rpc.Rpc<
        "activity",
        Schema.Struct<{ name: typeof Schema.String; attempt: typeof Schema.Number }>,
        Schema.Schema<Workflow.Result<any, any>>
      >
    >
  >()
  const activities = new Map<string, {
    readonly activity: Activity.Any
    readonly context: Context.Context<any>
  }>()
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
  const clockClient = yield* ClockEntity.client
  const deferredClient = yield* DeferredEntity.client

  const requestIdFor = Effect.fnUntraced(function*(options: {
    readonly entityType: string
    readonly executionId: string
    readonly tag: string
    readonly id: string
  }) {
    const entityId = EntityId.make(options.executionId)
    const address = new EntityAddress({
      entityType: EntityType.make(options.entityType),
      entityId,
      shardId: sharding.getShardId(entityId)
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
    readonly executionId: string
  }) {
    const entityId = EntityId.make(options.executionId)
    const shardId = sharding.getShardId(entityId)
    const clockAddress = new EntityAddress({
      entityType: ClockEntity.type,
      entityId,
      shardId
    })
    yield* storage.clearAddress(clockAddress)
  })

  return WorkflowEngine.of({
    register(workflow, execute) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const engine = this
      return Effect.suspend(() => {
        if (entities.has(workflow.name)) {
          return Effect.dieMessage(`Workflow ${workflow.name} already registered`)
        }
        const entity = makeWorkflowEntity(workflow)
        entities.set(workflow.name, entity as any)
        return sharding.registerEntity(
          entity,
          Effect.gen(function*() {
            const address = yield* Entity.CurrentAddress
            const executionId = address.entityId
            return {
              run: (request: Entity.Request<any>) => {
                const instance = WorkflowInstance.of({
                  workflow,
                  executionId,
                  suspended: false
                })
                return execute(request.payload, executionId).pipe(
                  Effect.onExit(() => {
                    if (!instance.suspended) {
                      return Effect.void
                    }
                    return engine.deferredResult(InterruptSignal).pipe(
                      Effect.flatMap((maybeResult) => {
                        if (Option.isNone(maybeResult)) {
                          return Effect.void
                        }
                        instance.suspended = false
                        return Effect.zipRight(
                          Effect.ignore(clearClock({ executionId })),
                          Effect.interrupt
                        )
                      }),
                      Effect.orDie
                    )
                  }),
                  Effect.scoped,
                  Workflow.intoResult,
                  Effect.provideService(WorkflowInstance, instance)
                ) as any
              },
              activity: Effect.fnUntraced(function*(request: Entity.Request<any>) {
                const activityId = `${executionId}/${request.payload.name}`
                let entry = activities.get(activityId)
                while (!entry) {
                  const latch = Effect.unsafeMakeLatch()
                  activityLatches.set(activityId, latch)
                  yield* latch.await
                  entry = activities.get(activityId)
                }
                const contextMap = new Map(entry.context.unsafeMap)
                contextMap.set(Activity.CurrentAttempt.key, request.payload.attempt)
                contextMap.set(
                  WorkflowInstance.key,
                  WorkflowInstance.of({
                    workflow,
                    executionId,
                    suspended: false
                  })
                )
                return yield* entry.activity.executeEncoded.pipe(
                  Workflow.intoResult,
                  Effect.provide(Context.unsafeMake(contextMap)),
                  Effect.ensuring(Effect.sync(() => {
                    activities.delete(activityId)
                  }))
                )
              }, Rpc.fork)
            }
          })
        ) as Effect.Effect<void>
      })
    },

    execute: ({ discard, executionId, payload, workflow }) =>
      RcMap.get(clients, workflow.name).pipe(
        Effect.flatMap((make) => make(executionId).run(payload, { discard })),
        Effect.orDie,
        Effect.scoped
      ),

    interrupt: Effect.fnUntraced(
      function*(this: WorkflowEngine["Type"], workflow, executionId) {
        const requestId = yield* requestIdFor({
          entityType: `Workflow/${workflow.name}`,
          executionId,
          tag: "run",
          id: ""
        })
        if (Option.isNone(requestId)) {
          return
        }
        const reply = yield* replyForRequestId(requestId.value)
        const nonSuspendedReply = reply.pipe(
          Option.filter((reply) => reply.exit._tag !== "Success" || reply.exit.value._tag !== "Suspended")
        )
        if (Option.isSome(nonSuspendedReply)) {
          return
        }

        yield* this.deferredDone({
          workflowName: workflow.name,
          executionId,
          deferred: InterruptSignal,
          exit: { _tag: "Success", value: void 0 }
        })
      },
      Effect.retry({
        while: (e) => e._tag === "PersistenceError",
        times: 3,
        schedule: Schedule.exponential(250)
      }),
      Effect.orDie
    ),

    resume: Effect.fnUntraced(
      function*(workflowName: string, executionId: string) {
        const maybeReply = yield* requestReply({
          entityType: `Workflow/${workflowName}`,
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
      },
      Effect.retry({
        while: (e) => e._tag === "PersistenceError",
        times: 3,
        schedule: Schedule.exponential(250)
      }),
      Effect.orDie
    ),

    activityExecute: Effect.fnUntraced(function*({ activity, attempt }) {
      const context = yield* Effect.context<WorkflowInstance>()
      const instance = Context.get(context, WorkflowInstance)
      const activityId = `${instance.executionId}/${activity.name}`
      activities.set(activityId, { activity, context })
      const latch = activityLatches.get(activityId)
      if (latch) {
        yield* latch.release
        activityLatches.delete(activityId)
      }
      const client = (yield* RcMap.get(clients, instance.workflow.name))(instance.executionId)
      while (true) {
        const result = yield* Effect.orDie(client.activity({ name: activity.name, attempt }))
        // If the activity has suspended and did not execute, we need to resume
        // it by resetting the attempt and re-executing.
        if (result._tag === "Suspended" && activities.has(activityId)) {
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
    }, Effect.scoped),

    deferredResult: (deferred) =>
      WorkflowInstance.pipe(
        Effect.flatMap((instance) =>
          requestReply({
            entityType: DeferredEntity.type,
            executionId: instance.executionId,
            tag: "set",
            id: deferred.name
          })
        ),
        Effect.map(Option.map((reply) => reply.exit)),
        Effect.retry({
          while: (e) => e._tag === "PersistenceError",
          times: 3,
          schedule: Schedule.exponential(250)
        }),
        Effect.orDie
      ),

    deferredDone({ deferred, executionId, exit, workflowName }) {
      const client = deferredClient(executionId)
      return Effect.orDie(client.set({
        workflowName,
        name: deferred.name,
        exit
      }))
    },

    scheduleClock(options) {
      const client = clockClient(options.executionId)
      return DateTime.now.pipe(
        Effect.flatMap((now) =>
          client.run({
            name: options.clock.name,
            workflowName: options.workflow.name,
            wakeUp: DateTime.addDuration(now, options.clock.duration)
          }, { discard: true })
        ),
        Effect.orDie
      )
    }
  })
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

const makeWorkflowEntity = (workflow: Workflow.Any) =>
  Entity.make(`Workflow/${workflow.name}`, [
    Rpc.make("run", {
      payload: workflow.payloadSchema.fields,
      primaryKey: () => "",
      success: Workflow.Result({
        success: workflow.successSchema,
        error: workflow.errorSchema
      })
    }),
    ActivityRpc
  ])
    .annotateRpcs(ClusterSchema.Persisted, true)
    .annotateRpcs(ClusterSchema.Uninterruptible, true)

const activityPrimaryKey = (activity: string, attempt: number) => `${activity}/${attempt}`

const ExitUnknown = Schema.encodedSchema(Schema.Exit({
  success: Schema.Unknown,
  failure: Schema.Unknown,
  defect: Schema.Defect
}))

const DeferredEntity = Entity.make("Workflow/-/DurableDeferred", [
  Rpc.make("set", {
    payload: {
      workflowName: Schema.String,
      name: Schema.String,
      exit: ExitUnknown
    },
    primaryKey: ({ name }) => name,
    success: ExitUnknown
  }),
  Rpc.make("resume", {
    payload: {
      workflowName: Schema.String,
      name: Schema.String
    },
    primaryKey: ({ name }) => name
  })
])
  .annotateRpcs(ClusterSchema.Persisted, true)
  .annotateRpcs(ClusterSchema.Uninterruptible, true)

const DeferredEntityLayer = DeferredEntity.toLayer(Effect.gen(function*() {
  const engine = yield* WorkflowEngine
  const address = yield* Entity.CurrentAddress
  const executionId = address.entityId
  const client = (yield* DeferredEntity.client)(executionId)
  return {
    set: (request) =>
      Effect.as(
        ensureSuccess(client.resume(request.payload, { discard: true })),
        request.payload.exit
      ),
    resume: (request) => engine.resume(request.payload.workflowName, executionId)
  }
}))

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
      return ensureSuccess(engine.deferredDone({
        workflowName: request.payload.workflowName,
        executionId,
        deferred,
        exit: { _tag: "Success", value: void 0 }
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
> = DeferredEntityLayer.pipe(
  Layer.merge(ClockEntityLayer),
  Layer.provideMerge(Layer.scoped(WorkflowEngine, make))
)
