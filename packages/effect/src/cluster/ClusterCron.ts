/**
 * Runs recurring cron jobs through cluster sharding.
 *
 * This module turns a `Cron.Cron` schedule into a `Layer` that coordinates one
 * recurring job across a cluster. It registers a singleton for the initial
 * scheduling step and a persisted entity message for each run. This is useful
 * for distributed maintenance work where the job should be owned by the cluster
 * rather than by every runner independently.
 *
 * With `calculateNextRunFromPrevious`, every run is processed by a single
 * entity per cron job, so runs never overlap and are caught up in order. The
 * scheduled time of the current run is available through
 * `CurrentScheduledTime`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import * as Cron from "../Cron.ts"
import * as DateTime from "../DateTime.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as PrimaryKey from "../PrimaryKey.ts"
import * as Rpc from "../rpc/Rpc.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import type { Scope } from "../Scope.ts"
import * as ClusterSchema from "./ClusterSchema.ts"
import { Persisted, Uninterruptible } from "./ClusterSchema.ts"
import * as DeliverAt from "./DeliverAt.ts"
import * as Entity from "./Entity.ts"
import type { Sharding } from "./Sharding.ts"
import * as Singleton from "./Singleton.ts"

/**
 * Service tag for the scheduled time of the cron run currently executing.
 *
 * **When to use**
 *
 * Use inside the `execute` effect of `make` to read the time the current run
 * was scheduled for.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class CurrentScheduledTime extends Context.Service<
  CurrentScheduledTime,
  DateTime.Utc
>()("effect/cluster/ClusterCron/CurrentScheduledTime") {}

/**
 * Creates a layer that runs a cron job through the cluster sharding system.
 *
 * **Details**
 *
 * The job is scheduled as persisted entity messages, with an initial singleton
 * scheduling step and optional controls for shard group, next-run calculation,
 * and skipping stale scheduled runs.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = <E, R>(options: {
  readonly name: string
  readonly cron: Cron.Cron
  readonly execute: Effect.Effect<void, E, R>

  /**
   * Choose a shard group to run this cron job on.
   */
  readonly shardGroup?: string | undefined

  /**
   * Controls whether the next cron job is based on the time of the previous
   * run.
   *
   * **Details**
   *
   * Defaults to `false`, meaning the next run will be calculated from the
   * current time.
   *
   * When enabled, all runs are processed one at a time by a single entity, so
   * missed runs are caught up in order without overlapping.
   */
  readonly calculateNextRunFromPrevious?: boolean | undefined

  /**
   * If set, the cron job will skip execution if the scheduled time is older
   * than this duration.
   *
   * **When to use**
   *
   * Use to prevent running jobs that were scheduled too far in the past.
   *
   * **Details**
   *
   * Defaults to "1 day".
   */
  readonly skipIfOlderThan?: Duration.Input | undefined
}): Layer.Layer<never, never, Sharding | Exclude<Exclude<R, CurrentScheduledTime>, Scope>> => {
  const CronEntity = Entity.make(`ClusterCron/${options.name}`, [
    Rpc.make("run", {
      payload: CronPayload
    })
      .annotate(Persisted, true)
      .annotate(Uninterruptible, true),
    Rpc.make("start").annotate(Persisted, true)
  ])
    .annotate(ClusterSchema.ShardGroup, () => options.shardGroup ?? "default")
    .annotate(ClusterSchema.ClientTracingEnabled, false)

  const InitialRun = Singleton.make(
    `ClusterCron/${options.name}`,
    Effect.gen(function*() {
      const makeClient = yield* CronEntity.client
      if (options.calculateNextRunFromPrevious) {
        // the executor schedules the next run if its chain has been lost.
        // `start` has no primary key, so each retry is a new message
        return yield* makeClient(executorId).start().pipe(
          Effect.tapCause((cause) => Effect.logWarning("Failed to start cron job, retrying", cause)),
          Effect.sandbox,
          Effect.retry(retryPolicy),
          Effect.orDie
        )
      }
      const now = yield* DateTime.now
      const next = DateTime.fromDateUnsafe(Cron.next(options.cron, now))
      yield* makeClient(DateTime.formatIso(next)).run({ dateTime: next }, { discard: true }).pipe(
        Effect.tapCause((cause) => Effect.logWarning("Failed to schedule initial run, retrying", cause)),
        Effect.sandbox,
        Effect.retry(retryPolicy),
        Effect.orDie
      )
    }),
    { shardGroup: options.shardGroup }
  )

  const skipIfOlderThan = Option.fromUndefinedOr(options.skipIfOlderThan).pipe(
    Option.map(Duration.fromInputUnsafe),
    Option.getOrElse(() => Duration.days(1))
  )

  const effect = Effect.fnUntraced(function*(dateTime: DateTime.Utc) {
    const now = yield* DateTime.now
    if (DateTime.isLessThan(dateTime, DateTime.subtractDuration(now, skipIfOlderThan))) {
      return
    }
    return yield* Effect.provideService(options.execute, CurrentScheduledTime, dateTime)
  }, Effect.orDie)

  const EntityLayer = CronEntity.toLayer(Effect.gen(function*() {
    const address = yield* Entity.CurrentAddress
    const makeClient = yield* CronEntity.client
    const schedule = (dateTime: DateTime.Utc) => {
      const payload = options.calculateNextRunFromPrevious
        ? new CronPayload({ dateTime, executor: true })
        : new CronPayload({ dateTime })
      const client = makeClient(options.calculateNextRunFromPrevious ? executorId : DateTime.formatIso(dateTime))
      return client.run(payload, { discard: true }).pipe(
        Effect.tapCause((cause) => Effect.logWarning("Failed to schedule next run, retrying", cause)),
        Effect.sandbox,
        Effect.retry(retryPolicy),
        Effect.orDie
      )
    }
    // runs are processed one at a time, so a run processed before `start`
    // means the chain is alive
    let processedRun = false
    return {
      run: (request) => {
        if (options.calculateNextRunFromPrevious && address.entityId !== executorId) {
          // a run scheduled by an earlier release joins the executor's chain
          return schedule(request.payload.dateTime)
        }
        processedRun = true
        return Effect.onExitPrimitive(
          effect(request.payload.dateTime),
          Effect.fnUntraced(function*(exit) {
            if (Exit.isFailure(exit)) {
              yield* Effect.logWarning(exit.cause)
            }
            const now = yield* DateTime.now
            return yield* schedule(DateTime.fromDateUnsafe(Cron.next(
              options.cron,
              options.calculateNextRunFromPrevious ? request.payload.dateTime : now
            )))
          }),
          true
        ).pipe(
          Effect.annotateLogs({
            module: "effect/cluster/ClusterCron",
            name: options.name,
            dateTime: request.payload.dateTime
          })
        )
      },
      start: () => {
        if (processedRun) return Effect.void
        // deduplicated against the pending run if the chain is alive
        return Effect.flatMap(
          DateTime.now,
          (now) => schedule(DateTime.fromDateUnsafe(Cron.next(options.cron, now)))
        )
      }
    }
  }))

  return Layer.merge(InitialRun, EntityLayer)
}

const executorId = "executor"

const retryPolicy = Schedule.min([
  Schedule.exponential(200, 1.5),
  Schedule.spaced("1 minute")
])

class CronPayload extends Schema.Class<CronPayload>("effect/cluster/ClusterCron/CronPayload")({
  dateTime: Schema.DateTimeUtc,
  // set for runs sent to the executor, which share one entity address
  executor: Schema.optional(Schema.Boolean)
}) {
  [PrimaryKey.symbol]() {
    return this.executor ? DateTime.formatIso(this.dateTime) : ""
  }
  [DeliverAt.symbol]() {
    return this.dateTime
  }
}
