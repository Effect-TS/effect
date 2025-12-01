/**
 * @since 1.0.0
 */
import * as PersistedQueue from "@effect/experimental/PersistedQueue"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Activity from "./Activity.js"
import * as DurableDeferred from "./DurableDeferred.js"
import type * as WorkflowEngine from "./WorkflowEngine.js"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export type TypeId = "~@effect/workflow/DurableQueue"

/**
 * @since 1.0.0
 * @category Type IDs
 */
export const TypeId: TypeId = "~@effect/workflow/DurableQueue"

/**
 * @since 1.0.0
 * @category Models
 */
export interface DurableQueue<
  Payload extends Schema.Schema.Any,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
> {
  readonly [TypeId]: TypeId
  readonly name: string
  readonly payloadSchema: Payload
  readonly idempotencyKey: (payload: Payload["Type"]) => string
  readonly deferred: DurableDeferred.DurableDeferred<Success, Error>
}

/**
 * A `DurableQueue` wraps a `PersistedQueue`, providing a way to wait for items
 * to finish processing using a `DurableDeferred`.
 *
 * ```ts
 * import { DurableQueue, Workflow } from "@effect/workflow"
 * import { Effect, Schema } from "effect"
 *
 * // Define a DurableQueue that can be used to derive workers and offer items for
 * // processing.
 * const ApiQueue = DurableQueue.make({
 *   name: "ApiQueue",
 *   payload: {
 *     id: Schema.String
 *   },
 *   success: Schema.Void,
 *   error: Schema.Never,
 *   idempotencyKey(payload) {
 *     return payload.id
 *   }
 * })
 *
 * const MyWorkflow = Workflow.make({
 *   name: "MyWorkflow",
 *   payload: {
 *     id: Schema.String
 *   },
 *   idempotencyKey: ({ id }) => id
 * })
 *
 * const MyWorkflowLayer = MyWorkflow.toLayer(
 *   Effect.fn(function*() {
 *     // Add an item to the DurableQueue defined above.
 *     //
 *     // When the worker has finished processing the item, the workflow will
 *     // resume.
 *     //
 *     yield* DurableQueue.process(ApiQueue, { id: "api-call-1" })
 *
 *     yield* Effect.log("Workflow succeeded!")
 *   })
 * )
 *
 * // Define a worker layer that can process items from the DurableQueue.
 * const ApiWorker = DurableQueue.worker(
 *   ApiQueue,
 *   Effect.fn(function*({ id }) {
 *     yield* Effect.log(`Worker processing API call with id: ${id}`)
 *   }),
 *   { concurrency: 5 } // Process up to 5 items concurrently
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = <
  Payload extends Schema.Schema.Any | Schema.Struct.Fields,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(
  options: {
    readonly name: string
    readonly payload: Payload
    readonly idempotencyKey: (
      payload: Payload extends Schema.Struct.Fields ? Schema.Struct<Payload>["Type"] : Payload["Type"]
    ) => string
    readonly success?: Success | undefined
    readonly error?: Error | undefined
  }
): DurableQueue<
  Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload,
  Success,
  Error
> => ({
  [TypeId]: TypeId,
  name: options.name,
  payloadSchema: Schema.isSchema(options.payload) ? options.payload : Schema.Struct(options.payload) as any,
  idempotencyKey: options.idempotencyKey as any,
  deferred: DurableDeferred.make(`DurableQueue/${options.name}`, {
    success: options.success,
    error: options.error
  })
})

const queueSchemas = new WeakMap<Schema.Schema.Any, Schema.Schema.Any>()
const getQueueSchema = <Payload extends Schema.Schema.Any>(
  payload: Payload
): Schema.Struct<{
  token: typeof Schema.String
  payload: Payload
  traceId: typeof Schema.String
  spanId: typeof Schema.String
  sampled: typeof Schema.Boolean
}> => {
  let schema = queueSchemas.get(payload)
  if (!schema) {
    schema = Schema.Struct({
      token: Schema.String,
      traceId: Schema.String,
      spanId: Schema.String,
      sampled: Schema.Boolean,
      payload
    })
    queueSchemas.set(payload, schema)
  }
  return schema as any
}

/**
 * @since 1.0.0
 * @category Processing
 */
export const process: <
  Payload extends Schema.Schema.Any,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(
  self: DurableQueue<Payload, Success, Error>,
  payload: Payload["Type"],
  options?: {
    readonly retrySchedule?: Schedule.Schedule<any, PersistedQueue.PersistedQueueError> | undefined
  }
) => Effect.Effect<
  Success["Type"],
  Error["Type"],
  | WorkflowEngine.WorkflowEngine
  | WorkflowEngine.WorkflowInstance
  | PersistedQueue.PersistedQueueFactory
  | Success["Context"]
  | Error["Context"]
  | Payload["Context"]
> = Effect.fnUntraced(function*<
  Payload extends Schema.Schema.Any,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(self: DurableQueue<Payload, Success, Error>, payload: Payload["Type"], options?: {
  readonly retrySchedule?: Schedule.Schedule<any, PersistedQueue.PersistedQueueError> | undefined
}) {
  const queueName = `DurableQueue/${self.name}`
  const queue = yield* PersistedQueue.make({
    name: queueName,
    schema: getQueueSchema(self.payloadSchema)
  })
  const id = yield* Activity.idempotencyKey(`${queueName}/${self.idempotencyKey(payload)}`)

  const deferred = DurableDeferred.make(`${self.deferred.name}/${id}`, {
    success: self.deferred.successSchema,
    error: self.deferred.errorSchema
  })
  const token = yield* DurableDeferred.token(deferred)

  yield* Effect.useSpan(`DurableQueue/${self.name}/process`, {
    captureStackTrace: false,
    attributes: { id }
  }, (span) =>
    queue.offer({
      token,
      payload,
      traceId: span.traceId,
      spanId: span.spanId,
      sampled: span.sampled
    } as any, { id }).pipe(
      Effect.tapErrorCause(Effect.logWarning),
      Effect.catchTag("ParseError", Effect.die),
      Effect.retry(options?.retrySchedule ?? defaultRetrySchedule),
      Effect.orDie,
      Effect.annotateLogs({
        package: "@effect/workflow",
        module: "DurableQueue",
        fiber: "process",
        queueName: self.name
      })
    ))

  return yield* DurableDeferred.await(deferred)
})

const defaultRetrySchedule = Schedule.exponential(500, 1.5).pipe(
  Schedule.union(Schedule.spaced("1 minute"))
)

/**
 * @since 1.0.0
 * @category Worker
 */
export const makeWorker: <
  Payload extends Schema.Schema.Any,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  R
>(
  self: DurableQueue<Payload, Success, Error>,
  f: (payload: Payload["Type"]) => Effect.Effect<Success["Type"], Error["Type"], R>,
  options?: { readonly concurrency?: number | undefined } | undefined
) => Effect.Effect<
  never,
  never,
  | WorkflowEngine.WorkflowEngine
  | PersistedQueue.PersistedQueueFactory
  | R
  | Payload["Context"]
  | Success["Context"]
  | Error["Context"]
> = Effect.fnUntraced(function*<
  Payload extends Schema.Schema.Any,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  R
>(
  self: DurableQueue<Payload, Success, Error>,
  f: (payload: Payload["Type"]) => Effect.Effect<Success["Type"], Error["Type"], R>,
  options?: {
    readonly concurrency?: number | undefined
  }
) {
  const queue = yield* PersistedQueue.make({
    name: `DurableQueue/${self.name}`,
    schema: getQueueSchema(self.payloadSchema)
  })
  const concurrency = options?.concurrency ?? 1

  const worker = queue.take((item_) => {
    const item = item_ as any as {
      token: DurableDeferred.Token
      payload: Payload["Type"]
      traceId: string
      spanId: string
      sampled: boolean
    }
    return f(item.payload).pipe(
      Effect.exit,
      Effect.flatMap((exit) =>
        DurableDeferred.done(self.deferred, {
          token: item.token,
          exit
        })
      ),
      Effect.asVoid,
      Effect.withSpan(`DurableQueue/${self.name}/worker`, {
        captureStackTrace: false,
        parent: {
          _tag: "ExternalSpan",
          traceId: item.traceId,
          spanId: item.spanId,
          sampled: item.sampled,
          context: Context.empty()
        }
      })
    )
  }).pipe(
    Effect.catchAllCause(Effect.logWarning),
    Effect.forever,
    Effect.annotateLogs({
      package: "@effect/workflow",
      module: "DurableQueue",
      fiber: "worker"
    })
  )

  yield* Effect.replicateEffect(worker, concurrency, { concurrency, discard: true })
  return yield* Effect.never
})

/**
 * @since 1.0.0
 * @category Worker
 */
export const worker: <
  Payload extends Schema.Schema.Any,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  R
>(
  self: DurableQueue<Payload, Success, Error>,
  f: (payload: Payload["Type"]) => Effect.Effect<Success["Type"], Error["Type"], R>,
  options?: {
    readonly concurrency?: number | undefined
  } | undefined
) => Layer.Layer<
  never,
  never,
  | WorkflowEngine.WorkflowEngine
  | PersistedQueue.PersistedQueueFactory
  | R
  | Payload["Context"]
  | Success["Context"]
  | Error["Context"]
> = (self, f, options) => Layer.scopedDiscard(Effect.forkScoped(makeWorker(self, f, options)))
