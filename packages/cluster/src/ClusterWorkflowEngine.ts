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

  const workflows = new Map<string, Workflow.Any>()
  const entities = new Map<
    string,
    Entity.Entity<
      string,
      | Rpc.Rpc<"run", Schema.Struct<{}>, Schema.Schema<Workflow.Result<any, any>>>
      | Rpc.Rpc<"deferred", Schema.Struct<{ name: typeof Schema.String; exit: typeof ExitUnknown }>, typeof ExitUnknown>
      | Rpc.Rpc<
        "activity",
        Schema.Struct<{ name: typeof Schema.String; attempt: typeof Schema.Number }>,
        Schema.Schema<Workflow.Result<any, any>>
      >
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
    Effect.orDie,
    (effect, { activity, attempt, executionId }) =>
      Effect.withSpan(effect, "WorkflowEngine.resetActivityAttempt", {
        attributes: {
          name: activity.name,
          executionId,
          attempt
        }
      })
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

  return WorkflowEngine.of({
    register(workflow, execute) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const engine = this
      return Effect.suspend(() => {
        if (entities.has(workflow.name)) {
          return Effect.dieMessage(`Workflow ${workflow.name} already registered`)
        }
        return sharding.registerEntity(
          ensureEntity(workflow),
          Effect.gen(function*() {
            const address = yield* Entity.CurrentAddress
            const executionId = address.entityId
            return {
              run: (request: Entity.Request<any>) => {
                const instance = WorkflowInstance.initial(workflow, executionId)
                return execute(request.payload, executionId).pipe(
                  Effect.ensuring(Effect.suspend(() => {
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
                          Effect.ignore(clearClock({ workflow, executionId })),
                          Effect.interrupt
                        )
                      }),
                      Effect.orDie
                    )
                  })),
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
                  WorkflowInstance.initial(workflow, executionId)
                )
                return yield* entry.activity.executeEncoded.pipe(
                  Workflow.intoResult,
                  Effect.provide(Context.unsafeMake(contextMap)),
                  Effect.ensuring(Effect.sync(() => {
                    activities.delete(activityId)
                  }))
                )
              }, Rpc.fork),

              deferred: Effect.fnUntraced(function*(request: Entity.Request<any>) {
                yield* ensureSuccess(resume(workflow, executionId))
                return request.payload.exit
              })
            }
          })
        ) as Effect.Effect<void>
      })
    },

    execute: ({ discard, executionId, payload, workflow }) => {
      ensureEntity(workflow)
      return RcMap.get(clients, workflow.name).pipe(
        Effect.flatMap((make) => make(executionId).run(payload, { discard })),
        Effect.orDie,
        Effect.scoped
      )
    },

    interrupt: Effect.fnUntraced(
      function*(this: WorkflowEngine["Type"], workflow, executionId) {
        const reply = yield* requestReply({
          workflow,
          entityType: `Workflow/${workflow.name}`,
          executionId,
          tag: "run",
          id: ""
        })
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
      Effect.orDie,
      (effect, workflow, executionId) =>
        Effect.withSpan(effect, "WorkflowEngine.interrupt", {
          attributes: {
            name: workflow.name,
            executionId
          }
        })
    ),

    activityExecute: Effect.fnUntraced(
      function*({ activity, attempt }) {
        const context = yield* Effect.context<WorkflowInstance>()
        const instance = Context.get(context, WorkflowInstance)
        yield* Effect.annotateCurrentSpan("executionId", instance.executionId)
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
      },
      Effect.scoped,
      (effect, { activity, attempt }) =>
        Effect.withSpan(effect, "WorkflowEngine.activityExecute", {
          attributes: {
            name: activity.name,
            attempt
          }
        })
    ),

    deferredResult: (deferred) =>
      WorkflowInstance.pipe(
        Effect.tap((instance) => Effect.annotateCurrentSpan("executionId", instance.executionId)),
        Effect.flatMap((instance) =>
          requestReply({
            workflow: instance.workflow,
            entityType: `Workflow/${instance.workflow.name}`,
            executionId: instance.executionId,
            tag: "deferred",
            id: deferred.name
          })
        ),
        Effect.map(Option.map((reply) =>
          reply.exit._tag === "Success"
            ? reply.exit.value as any as Schema.ExitEncoded<unknown, unknown, unknown>
            : reply.exit
        )),
        Effect.retry({
          while: (e) => e._tag === "PersistenceError",
          times: 3,
          schedule: Schedule.exponential(250)
        }),
        Effect.orDie,
        Effect.withSpan("WorkflowEngine.deferredResult", {
          attributes: {
            name: deferred.name
          }
        })
      ),

    deferredDone: Effect.fnUntraced(
      function*({ deferred, executionId, exit, workflowName }) {
        const client = yield* RcMap.get(clients, workflowName)
        return yield* Effect.orDie(
          client(executionId).deferred({
            name: deferred.name,
            exit
          }, { discard: true })
        )
      },
      Effect.scoped,
      (effect, { deferred, executionId }) =>
        Effect.withSpan(effect, "WorkflowEngine.deferredDone", {
          attributes: {
            name: deferred.name,
            executionId
          }
        })
    ),

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
}).annotate(ClusterSchema.Persisted, true)

const makeWorkflowEntity = (workflow: Workflow.Any) =>
  Entity.make(`Workflow/${workflow.name}`, [
    Rpc.make("run", {
      payload: workflow.payloadSchema.fields,
      primaryKey: () => "",
      success: Workflow.Result({
        success: workflow.successSchema,
        error: workflow.errorSchema
      })
    })
      .annotate(ClusterSchema.Persisted, true)
      .annotate(ClusterSchema.Uninterruptible, true),

    Rpc.make("deferred", {
      payload: {
        name: Schema.String,
        exit: ExitUnknown
      },
      primaryKey: ({ name }) => name,
      success: ExitUnknown
    })
      .annotate(ClusterSchema.Persisted, true)
      .annotate(ClusterSchema.Uninterruptible, true),

    ActivityRpc
  ]).annotateContext(workflow.annotations)

const activityPrimaryKey = (activity: string, attempt: number) => `${activity}/${attempt}`

const ExitUnknown = Schema.encodedSchema(Schema.Exit({
  success: Schema.Unknown,
  failure: Schema.Unknown,
  defect: Schema.Defect
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
> = ClockEntityLayer.pipe(
  Layer.provideMerge(Layer.scoped(WorkflowEngine, make))
)
