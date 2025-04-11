/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import * as Activity from "@effect/workflow/Activity"
import * as DurableClock from "@effect/workflow/DurableClock"
import * as Workflow from "@effect/workflow/Workflow"
import { WorkflowEngine, WorkflowInstance } from "@effect/workflow/WorkflowEngine"
import * as Arr from "effect/Array"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import * as ClusterSchema from "./ClusterSchema.js"
import * as DeliverAt from "./DeliverAt.js"
import * as Entity from "./Entity.js"
import { EntityAddress } from "./EntityAddress.js"
import { EntityId } from "./EntityId.js"
import { EntityType } from "./EntityType.js"
import { MessageStorage } from "./MessageStorage.js"
import * as Sharding from "./Sharding.js"
import { Snowflake } from "./Snowflake.js"

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
  const activities = new Map<string, Activity.Any>()
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

  const resetActivityAttempt = Effect.fnUntraced(function*(options: {
    readonly workflow: Workflow.Any
    readonly executionId: string
    readonly activity: Activity.Any
    readonly attempt: number
  }) {
    const entityId = EntityId.make(options.executionId)
    const address = new EntityAddress({
      entityType: EntityType.make(`Workflow/${options.workflow.name}`),
      entityId,
      shardId: sharding.getShardId(entityId)
    })
    const requestId = yield* storage.requestIdForPrimaryKey({
      address,
      tag: "activity",
      id: activityPrimaryKey(options.activity.name, options.attempt)
    })
    if (Option.isNone(requestId)) return
    yield* sharding.reset(requestId.value)
  }, Effect.orDie)

  const requestReply = Effect.fnUntraced(function*(options: {
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
    const requestId = yield* storage.requestIdForPrimaryKey({ address, tag: options.tag, id: options.id })
    if (Option.isNone(requestId)) {
      return Option.none()
    }
    const replies = yield* storage.repliesForUnfiltered([requestId.value])
    return Arr.last(replies).pipe(
      Option.filter((reply) => reply._tag === "WithExit"),
      Option.map((reply) => reply)
    )
  })

  return WorkflowEngine.of({
    register: (workflow, execute) =>
      Effect.suspend(() => {
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
              run: (request: Entity.Request<any>) =>
                execute(request.payload, executionId).pipe(
                  Workflow.intoResult,
                  Effect.provideService(
                    WorkflowInstance,
                    WorkflowInstance.of({
                      workflow,
                      executionId,
                      suspended: false
                    })
                  )
                ) as any,
              activity: Effect.fnUntraced(function*(request: Entity.Request<any>) {
                const activityId = `${executionId}/${request.payload.name}`
                let activity = activities.get(activityId)
                while (!activity) {
                  const latch = Effect.unsafeMakeLatch()
                  activityLatches.set(activityId, latch)
                  yield* latch.await
                  activity = activities.get(activityId)
                }
                return yield* activity.execute.pipe(
                  Effect.provideService(Activity.CurrentAttempt, request.payload.attempt),
                  Workflow.intoResult,
                  Effect.provideService(
                    WorkflowInstance,
                    WorkflowInstance.of({
                      workflow,
                      executionId,
                      suspended: false
                    })
                  ),
                  Effect.ensuring(Effect.sync(() => {
                    activities.delete(activityId)
                  }))
                )
              }, Rpc.fork)
            }
          })
        ) as Effect.Effect<void>
      }),

    execute: Effect.fnUntraced(function*(workflow, executionId, payload) {
      const client = (yield* RcMap.get(clients, workflow.name))(executionId)
      return yield* client.run(payload).pipe(
        Effect.catchAll((cause) => Effect.succeed(new Workflow.Complete<any, any>({ exit: Exit.die(cause) })))
      )
    }, Effect.scoped),

    resume: Effect.fnUntraced(function*(workflowName: string, executionId: string) {
      const maybeReply = yield* requestReply({
        entityType: `Workflow/${workflowName}`,
        executionId,
        tag: "run",
        id: ""
      })
      const maybeSuspended = Option.filter(
        maybeReply,
        (reply) => reply.exit._tag === "Success" && (reply.exit.value as Workflow.Result<any, any>)._tag === "Suspended"
      )
      if (Option.isNone(maybeSuspended)) return
      yield* sharding.reset(Snowflake(maybeSuspended.value.requestId))
    }, Effect.orDie),

    activityExecute: Effect.fnUntraced(function*({ activity, attempt }) {
      const instance = yield* WorkflowInstance
      const activityId = `${instance.executionId}/${activity.name}`
      activities.set(activityId, activity)
      const latch = activityLatches.get(activityId)
      if (latch) {
        yield* latch.release
        activityLatches.delete(activityId)
      }
      const client = (yield* RcMap.get(clients, instance.workflow.name))(instance.executionId)
      while (true) {
        const result = yield* client.activity({ name: activity.name, attempt }).pipe(
          Effect.catchAll((cause) => Effect.succeed(new Workflow.Complete<any, any>({ exit: Exit.die(cause) })))
        )
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
        return result
      }
    }, Effect.scoped),

    deferredResult: Effect.fnUntraced(function*(deferred) {
      const instance = yield* WorkflowInstance
      const reply = yield* requestReply({
        entityType: DeferredEntity.type,
        executionId: instance.executionId,
        tag: "set",
        id: deferred.name
      })
      return Option.map(reply, (reply) => reply.exit)
    }, Effect.orDie),

    deferredDone({ deferred, executionId, exit }) {
      const client = deferredClient(executionId)
      return Effect.orDie(client.set({
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

const namespace = "@effect/cluster/ClusterWorkflowEngine" as const

const makeWorkflowEntity = (workflow: Workflow.Any) => {
  class RunPayload
    extends Schema.Class<RunPayload>(`${namespace}/${workflow.name}/Run`)(workflow.payloadSchema as any)
  {
    [PrimaryKey.symbol]() {
      return ""
    }
  }

  class ActivityPayload extends Schema.Class<ActivityPayload>(`${namespace}/${workflow.name}/Activity`)({
    name: Schema.String,
    attempt: Schema.Number
  }) {
    [PrimaryKey.symbol]() {
      return activityPrimaryKey(this.name, this.attempt)
    }
  }

  return Entity.make(`Workflow/${workflow.name}`, [
    Rpc.make("run", {
      payload: RunPayload,
      success: Workflow.Result({
        success: workflow.successSchema,
        error: workflow.errorSchema
      })
    }),
    Rpc.make("activity", {
      payload: ActivityPayload,
      success: Workflow.Result({
        success: Schema.Unknown,
        error: Schema.Unknown
      })
    })
  ]).annotateRpcs(ClusterSchema.Persisted, true)
}

const activityPrimaryKey = (activity: string, attempt: number) => `${activity}/${attempt}`

const ExitUnknown = Schema.encodedSchema(Schema.Exit({
  success: Schema.Unknown,
  failure: Schema.Unknown,
  defect: Schema.Defect
}))

class DeferredPayload extends Schema.Class<DeferredPayload>(`Workflow/DurableDeferred/Set`)({
  name: Schema.String,
  exit: ExitUnknown
}) {
  [PrimaryKey.symbol]() {
    return this.name
  }
}

const DeferredEntity = Entity.make("Workflow/-/DurableDeferred", [
  Rpc.make("set", {
    payload: DeferredPayload,
    success: ExitUnknown
  }).annotate(ClusterSchema.Persisted, true)
])

const DeferredEntityLayer = DeferredEntity.toLayer({
  set: (request) => Effect.succeed(request.payload.exit)
})

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
  Rpc.make("run", { payload: ClockPayload }).annotate(ClusterSchema.Persisted, true)
])

const ClockEntityLayer = ClockEntity.toLayer(Effect.gen(function*() {
  const engine = yield* WorkflowEngine
  const address = yield* Entity.CurrentAddress
  const executionId = address.entityId
  return {
    run: Effect.fnUntraced(function*(request) {
      const deferred = DurableClock.make({ name: request.payload.name, duration: Duration.zero }).deferred
      yield* engine.deferredDone({
        executionId: address.entityId,
        deferred,
        exit: { _tag: "Success", value: void 0 }
      })
      yield* engine.resume(request.payload.workflowName, executionId)
    })
  }
}))

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
