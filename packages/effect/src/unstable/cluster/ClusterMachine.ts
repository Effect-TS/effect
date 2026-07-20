/**
 * Runs Effect machines as persisted Cluster entities.
 *
 * @since 4.0.0
 */
import * as Cause from "../../Cause.ts"
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as Machine from "../machine/Machine.ts"
import * as Rpc from "../rpc/Rpc.ts"
import type { PersistenceError } from "./ClusterError.ts"
import * as ClusterSchema from "./ClusterSchema.ts"
import * as Entity from "./Entity.ts"
import type { EntityAddress } from "./EntityAddress.ts"
import * as MessageStorage from "./MessageStorage.ts"
import type * as Sharding from "./Sharding.ts"
import type { Snowflake } from "./Snowflake.ts"

/**
 * Persisted machine checkpoint owned by the Cluster bridge.
 *
 * **Details**
 *
 * Machine identity and deployment version are stored around the generic
 * encoded snapshot. The request id records the request that produced the
 * checkpoint.
 *
 * @category models
 * @since 4.0.0
 */
export interface Checkpoint {
  readonly machineId: string
  readonly version: string
  readonly requestId: Snowflake
  readonly snapshot: Machine.Machine.EncodedSnapshot
}

/**
 * Result of loading a checkpoint for a Cluster machine request.
 *
 * **Details**
 *
 * `processed` reports whether the exact Cluster request id was already
 * committed. Storage implementations must retain enough request ids to detect
 * redelivery even after later requests have advanced the checkpoint.
 *
 * @category models
 * @since 4.0.0
 */
export interface LoadResult {
  readonly checkpoint: Option.Option<Checkpoint>
  readonly processed: boolean
}

/**
 * Result of atomically committing a Cluster machine request.
 *
 * @category models
 * @since 4.0.0
 */
export type CommitResult = CommitResult.Committed | CommitResult.Duplicate

/**
 * Constructors and types for Cluster machine commit results.
 *
 * @category models
 * @since 4.0.0
 */
export const CommitResult = {
  Committed: (): CommitResult.Committed => ({ _tag: "Committed" }),
  Duplicate: (): CommitResult.Duplicate => ({ _tag: "Duplicate" })
}

/**
 * Types for Cluster machine commit results.
 *
 * @since 4.0.0
 */
export declare namespace CommitResult {
  /**
   * Indicates that the request id and checkpoint were committed atomically.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Committed {
    readonly _tag: "Committed"
  }

  /**
   * Indicates that the request id was already committed.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Duplicate {
    readonly _tag: "Duplicate"
  }
}

/**
 * Checkpoint persistence service used by Cluster machines.
 *
 * **When to use**
 *
 * Use to connect `ClusterMachine` to a durable checkpoint store that can
 * atomically deduplicate request ids and replace the current checkpoint.
 *
 * **Gotchas**
 *
 * For checkpoint and emitted-message persistence to commit atomically, this
 * service must join the transaction opened through the configured
 * `MessageStorage`. The reply is persisted after that transaction; storing the
 * request id with the checkpoint makes a redelivery recover that reply without
 * applying the transition again. A separate transaction or database cannot
 * provide checkpoint-and-emission atomicity.
 *
 * @category services
 * @since 4.0.0
 */
export class Storage extends Context.Service<Storage, {
  readonly load: (
    address: EntityAddress,
    requestId: Snowflake
  ) => Effect.Effect<LoadResult, PersistenceError>
  readonly commit: (
    address: EntityAddress,
    checkpoint: Checkpoint
  ) => Effect.Effect<CommitResult, PersistenceError>
}>()("effect/cluster/ClusterMachine/Storage") {}

/**
 * Successful result returned after a Cluster machine request is committed or
 * recognized as a redelivery.
 *
 * @category models
 * @since 4.0.0
 */
export class Accepted extends Schema.TaggedClass<Accepted>("effect/cluster/ClusterMachine/Accepted")(
  "Accepted",
  {}
) {}

/**
 * Schema for reasons a Cluster machine request can be rejected without
 * advancing its checkpoint.
 *
 * @category models
 * @since 4.0.0
 */
export const RejectionReason = Schema.Literals([
  "MachineIdMismatch",
  "VersionMismatch",
  "InvalidCheckpoint",
  "UnsupportedProcessLocal",
  "TransitionFailure",
  "PersistenceFailure",
  "EmissionFailure"
])

/**
 * Type of {@link RejectionReason}.
 *
 * @category models
 * @since 4.0.0
 */
export type RejectionReason = typeof RejectionReason.Type

/**
 * Rejected Cluster machine request. Transaction-participating durable storage
 * leaves the previous checkpoint in place and suppresses emitted events.
 *
 * @category models
 * @since 4.0.0
 */
export class Rejected extends Schema.TaggedClass<Rejected>("effect/cluster/ClusterMachine/Rejected")(
  "Rejected",
  {
    reason: RejectionReason,
    message: Schema.String
  }
) {}

/**
 * Schema for Cluster machine request outcomes.
 *
 * @category schemas
 * @since 4.0.0
 */
export const SendResult = Schema.Union([Accepted, Rejected])

type SendRpc<Events extends ReadonlyArray<Machine.Machine.TaggedSchema>> = Rpc.Rpc<
  "send",
  Schema.Union<Events>,
  typeof SendResult
>

type MachineEvents<M extends Machine.Machine.Any> = M extends Machine.Machine<
  any,
  infer Events,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
> ? Events & ReadonlyArray<Machine.Machine.TaggedSchema> :
  never

type MachineEmits<M extends Machine.Machine.Any> = M extends Machine.Machine<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer Emits,
  any
> ? Emits & ReadonlyArray<Machine.Machine.TaggedSchema> :
  never

/**
 * Cluster adapter for one machine definition and entity type.
 *
 * **Details**
 *
 * The adapter exposes one persisted `send` RPC. Entity requests are serialized
 * by the normal Cluster entity concurrency and every accepted request advances
 * the checkpoint at most once.
 *
 * @category models
 * @since 4.0.0
 */
export interface ClusterMachine<
  in out Type extends string,
  in out M extends Machine.Machine.Any,
  out Services = MachineServices<M>
> {
  readonly machine: M
  readonly entity: Entity.Entity<Type, SendRpc<MachineEvents<M>>>

  /**
   * Creates the Cluster entity layer for this machine.
   *
   * **Gotchas**
   *
   * `enqueue` runs after the checkpoint write in the same `MessageStorage`
   * transaction. It must durably enqueue emitted events in that transaction;
   * arbitrary external effects are not atomic with the checkpoint. The reply
   * is persisted after commit and recovered through request-id deduplication if
   * delivery is interrupted. Machines that never emit may omit `enqueue`.
   */
  readonly toLayer: <R = never>(options?: {
    readonly enqueue?: (
      event: Machine.Machine.EmitOf<MachineEmits<M>>
    ) => Effect.Effect<void, unknown, R>
  }) => Layer.Layer<never, never, Storage | MessageStorage.MessageStorage | Sharding.Sharding | R | Services>
}

type MachineServices<M extends Machine.Machine.Any> = M extends Machine.Machine<
  infer States,
  infer Events,
  any,
  any,
  any,
  infer R,
  any,
  infer InitialR,
  any,
  any,
  infer Emits,
  any
> ?
    | ExcludeCompatibleRuntime<
      Machine.ExecutionServices<R | InitialR>,
      Machine.Machine.EventOf<Events & ReadonlyArray<Machine.Machine.TaggedSchema>>,
      Machine.Machine.EmitOf<Emits & ReadonlyArray<Machine.Machine.TaggedSchema>>
    >
    | Machine.Machine.SnapshotDecodingServices<States & Machine.Machine.StateSchemas>
    | Machine.Machine.SnapshotEncodingServices<States & Machine.Machine.StateSchemas>
  : never

type IsAny<A> = 0 extends (1 & A) ? true : false

type ExcludeCompatibleRuntime<Requirements, Events, Emits> = Requirements extends Machine.Runtime.Requirement<
  infer RequiredEvents,
  infer RequiredEmits
> ? IsAny<Requirements> extends true ? Requirements
  : [RequiredEvents] extends [Events] ? [RequiredEmits] extends [Emits] ? never : Requirements
  : Requirements
  : Requirements

const hasInvokes = (machine: Machine.Machine.Any): boolean =>
  Reflect.ownKeys(machine.handlers).some((key) => machine.handlers[key as string]?.invoke !== undefined)

const reject = (reason: RejectionReason, message: string): Rejected => new Rejected({ reason, message })

const fail = (reason: RejectionReason, message: string): Effect.Effect<never, Rejected> =>
  Effect.fail(reject(reason, message))

const messageFromCause = (cause: Cause.Cause<unknown>): string => {
  const squashed = Cause.squash(cause)
  return squashed instanceof globalThis.Error ? squashed.message : String(squashed)
}

const rejectionFromCause = (cause: Cause.Cause<unknown>): Rejected => {
  const error = Cause.findErrorOption(cause)
  if (Option.isSome(error) && error.value instanceof Rejected) {
    return error.value
  }
  if (Option.isSome(error) && error.value instanceof Machine.ProcessLocalError) {
    return reject("UnsupportedProcessLocal", `${error.value.operation} is process-local and is not supported`)
  }
  return reject("TransitionFailure", messageFromCause(cause))
}

const addressKey = (address: EntityAddress): string => `${address.entityType}\u0000${address.entityId}`

/**
 * Creates an in-memory Cluster machine checkpoint store.
 *
 * **When to use**
 *
 * Use when you test or run a local process that does not require checkpoints
 * to survive a restart.
 *
 * **Gotchas**
 *
 * This store is not durable and does not provide rollback with the in-memory
 * `MessageStorage` transaction marker.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeMemory: Effect.Effect<Storage["Service"]> = Effect.sync(() => {
  const entries = new Map<string, {
    checkpoint: Checkpoint
    readonly requests: Set<Snowflake>
  }>()
  return Storage.of({
    load: (address, requestId) =>
      Effect.sync(() => {
        const entry = entries.get(addressKey(address))
        return {
          checkpoint: Option.fromNullishOr(entry?.checkpoint),
          processed: entry?.requests.has(requestId) ?? false
        }
      }),
    commit: (address, checkpoint) =>
      Effect.sync(() => {
        const key = addressKey(address)
        const entry = entries.get(key)
        if (entry?.requests.has(checkpoint.requestId)) {
          return CommitResult.Duplicate()
        }
        if (entry === undefined) {
          entries.set(key, {
            checkpoint,
            requests: new Set([checkpoint.requestId])
          })
        } else {
          entry.checkpoint = checkpoint
          entry.requests.add(checkpoint.requestId)
        }
        return CommitResult.Committed()
      })
  })
})

/**
 * Layer providing the in-memory Cluster machine checkpoint store.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerMemory: Layer.Layer<Storage> = Layer.effect(Storage, makeMemory)

/**
 * Creates a persisted Cluster entity adapter for a machine.
 *
 * **When to use**
 *
 * Use when each Cluster entity id should own one durable machine snapshot and
 * accept schema-validated machine events through a persisted `send` RPC.
 *
 * **Details**
 *
 * A missing checkpoint runs initial planning before the first event. Existing
 * checkpoints are identity-checked, version-checked, decoded, and resumed
 * without rerunning initial entry behavior. Final checkpoints accept later
 * requests as no-ops. The stable bridge identity is `machine.id` when present,
 * otherwise the Cluster entity type.
 *
 * **Gotchas**
 *
 * Invoked processes, spawned children, action-time `runtime.raise`, timers,
 * subscriptions, and other process-local state are not durable and are
 * rejected. Planning-time raised events remain part of the current macrostep.
 * Arbitrary action effects may run again after a crash before checkpoint
 * commit, so the bridge does not provide exactly-once external effects.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = <
  const Type extends string,
  States extends Machine.Machine.StateSchemas,
  Events extends ReadonlyArray<Machine.Machine.TaggedSchema>,
  Input extends Schema.Top,
  UnhandledStates extends Machine.Machine.StateIdentifier<States>,
  E,
  R,
  InitialE,
  InitialR,
  FinalStates extends Machine.Machine.StateIdentifier<States>,
  Output,
  Emits extends ReadonlyArray<Machine.Machine.TaggedSchema>,
  OutputStates extends Machine.Machine.StateIdentifier<States>
>(
  type: Type,
  machine: Machine.Machine<
    States,
    Events,
    Input,
    UnhandledStates,
    E,
    R,
    InitialE,
    InitialR,
    FinalStates,
    Output,
    Emits,
    OutputStates
  >,
  options: {
    readonly version: string
  },
  ...input: [...Machine.Machine.InputArgs<Input>]
): ClusterMachine<
  Type,
  Machine.Machine<
    States,
    Events,
    Input,
    UnhandledStates,
    E,
    R,
    InitialE,
    InitialR,
    FinalStates,
    Output,
    Emits,
    OutputStates
  >,
  | ExcludeCompatibleRuntime<
    Machine.ExecutionServices<R | InitialR>,
    Machine.Machine.EventOf<Events>,
    Machine.Machine.EmitOf<Emits>
  >
  | Machine.Machine.SnapshotDecodingServices<States>
  | Machine.Machine.SnapshotEncodingServices<States>
> => {
  type M = Machine.Machine<
    States,
    Events,
    Input,
    UnhandledStates,
    E,
    R,
    InitialE,
    InitialR,
    FinalStates,
    Output,
    Emits,
    OutputStates
  >
  const eventSchema = Schema.Union(machine.events as MachineEvents<M>)
  const rpc = Rpc.make("send", {
    payload: eventSchema,
    success: SendResult
  })
    .annotate(ClusterSchema.Persisted, true) as SendRpc<MachineEvents<M>>
  const entity = Entity.make(type, [rpc])
  const machineId = machine.id ?? type

  const toLayer: ClusterMachine<
    Type,
    M,
    | ExcludeCompatibleRuntime<
      Machine.ExecutionServices<R | InitialR>,
      Machine.Machine.EventOf<Events>,
      Machine.Machine.EmitOf<Emits>
    >
    | Machine.Machine.SnapshotDecodingServices<States>
    | Machine.Machine.SnapshotEncodingServices<States>
  >["toLayer"] = (layerOptions) =>
    entity.toLayer(
      Effect.gen(function*() {
        const storage = yield* Storage
        const messageStorage = yield* MessageStorage.MessageStorage

        const handle = Effect.fnUntraced(function*(request: Entity.Request<SendRpc<MachineEvents<M>>>) {
          if (hasInvokes(machine)) {
            return yield* fail(
              "UnsupportedProcessLocal",
              "Machine invoke configurations are process-local and cannot be restored"
            )
          }

          const loaded = yield* storage.load(request.address, request.requestId).pipe(
            Effect.mapError((error) => reject("PersistenceFailure", String(error.cause)))
          )
          let current: Machine.Machine.Snapshot<States> | undefined
          const emitted: Array<Machine.Machine.EmitOf<MachineEmits<M>>> = []

          if (Option.isSome(loaded.checkpoint)) {
            const checkpoint = loaded.checkpoint.value
            if (loaded.processed) {
              return new Accepted({})
            }
            if (checkpoint.machineId !== machineId) {
              return yield* fail(
                "MachineIdMismatch",
                `Expected machine id ${machineId}, received ${checkpoint.machineId}`
              )
            }
            if (checkpoint.version !== options.version) {
              return yield* fail(
                "VersionMismatch",
                `Expected version ${options.version}, received ${checkpoint.version}`
              )
            }
            current = yield* Machine.decodeSnapshot(machine, checkpoint.snapshot).pipe(
              Effect.mapError((error) => reject("InvalidCheckpoint", String(error.cause)))
            )
          } else if (loaded.processed) {
            return yield* fail("InvalidCheckpoint", "The request was recorded without a checkpoint")
          }

          const runtime: Machine.Runtime<any, any> = {
            raise: () => Effect.die(new Machine.ProcessLocalError({ operation: "runtime.raise" })),
            sendParent: (event) =>
              Effect.sync(() => {
                emitted.push(event)
              })
          }

          if (current === undefined) {
            const initial = yield* Machine.planInitial(machine, ...input as any)
            yield* Machine.runActions(initial.actions, runtime)
            current = initial.state
            emitted.push(...initial.emittedEvents as any)
          }

          if (!Machine.isFinal(machine, current)) {
            const planned = yield* Machine.plan(machine, current, request.payload)
            yield* Machine.runActions(planned.actions, runtime)
            current = planned.next
            emitted.push(...planned.emittedEvents as any)
          }

          const encoded = yield* Machine.encodeSnapshot(machine, current)
          if (emitted.length > 0 && layerOptions?.enqueue === undefined) {
            return yield* fail("EmissionFailure", "No durable enqueue handler was configured")
          }
          const committed = yield* storage.commit(request.address, {
            machineId,
            version: options.version,
            requestId: request.requestId,
            snapshot: encoded
          }).pipe(
            Effect.mapError((error) => reject("PersistenceFailure", String(error.cause)))
          )
          if (committed._tag === "Duplicate") {
            return new Accepted({})
          }

          if (layerOptions?.enqueue !== undefined) {
            yield* Effect.forEach(emitted, layerOptions.enqueue, { discard: true }).pipe(
              Effect.mapError((error) => reject("EmissionFailure", String(error)))
            )
          }
          return new Accepted({})
        })

        return entity.of({
          send: (request) =>
            messageStorage.withTransaction(
              handle(request).pipe(
                Effect.catchCause((cause) =>
                  Cause.hasInterrupts(cause)
                    ? Effect.failCause(cause)
                    : Effect.fail(rejectionFromCause(cause))
                )
              )
            ).pipe(
              Effect.catchCause((cause) => {
                if (Cause.hasInterrupts(cause)) {
                  return Effect.failCause(cause)
                }
                const error = Cause.findErrorOption(cause)
                return Effect.succeed(
                  Option.isSome(error) && error.value instanceof Rejected
                    ? error.value
                    : reject("PersistenceFailure", messageFromCause(cause))
                )
              })
            ) as any
        })
      }) as any
    ) as any

  return {
    machine,
    entity,
    toLayer
  }
}
