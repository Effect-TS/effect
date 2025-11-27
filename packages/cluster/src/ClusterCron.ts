/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc"
import * as Cron from "effect/Cron"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import * as ClusterSchema from "./ClusterSchema.js"
import { Persisted, Uninterruptible } from "./ClusterSchema.js"
import * as DeliverAt from "./DeliverAt.js"
import * as Entity from "./Entity.js"
import type { Sharding } from "./Sharding.js"
import * as Singleton from "./Singleton.js"

/**
 * @since 1.0.0
 * @category Constructors
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
   * Whether to run the next cron job based from the time of the previous run.
   *
   * Defaults to `false`, meaning the next run will be calculated from the
   * current time.
   */
  readonly calculateNextRunFromPrevious?: boolean | undefined

  /**
   * If set, the cron job will skip execution if the scheduled time is older
   * than this duration.
   *
   * This is useful to prevent running jobs that were scheduled too far in the
   * past.
   *
   * Defaults to "1 day".
   */
  readonly skipIfOlderThan?: Duration.DurationInput | undefined
}): Layer.Layer<never, never, Sharding | Exclude<R, Scope>> => {
  const CronEntity = Entity.make(`ClusterCron/${options.name}`, [
    Rpc.make("run", {
      payload: CronPayload
    })
      .annotate(Persisted, true)
      .annotate(Uninterruptible, true)
  ])
    .annotate(ClusterSchema.ShardGroup, () => options.shardGroup ?? "default")
    .annotate(ClusterSchema.ClientTracingEnabled, false)

  const InitialRun = Singleton.make(
    `ClusterCron/${options.name}`,
    Effect.gen(function*() {
      const now = yield* DateTime.now
      const next = DateTime.unsafeFromDate(Cron.next(options.cron, now))
      const entityId = options.calculateNextRunFromPrevious ? "initial" : DateTime.formatIso(next)
      const client = (yield* CronEntity.client)(entityId)
      yield* client.run({ dateTime: next }, { discard: true })
    }),
    { shardGroup: options.shardGroup }
  )

  const skipIfOlderThan = Option.fromNullable(options.skipIfOlderThan).pipe(
    Option.map(Duration.decode),
    Option.getOrElse(() => Duration.days(1))
  )

  const effect = Effect.fnUntraced(function*(dateTime: DateTime.Utc) {
    const now = yield* DateTime.now
    if (DateTime.lessThan(dateTime, DateTime.subtractDuration(now, skipIfOlderThan))) {
      return
    }
    return yield* options.execute
  }, Effect.orDie)

  const EntityLayer = CronEntity.toLayer(Effect.gen(function*() {
    const makeClient = yield* CronEntity.client
    return {
      run: (request) =>
        effect(request.payload.dateTime).pipe(
          Effect.exit,
          Effect.flatMap(Effect.fnUntraced(function*(exit) {
            if (Exit.isFailure(exit)) {
              yield* Effect.logWarning(exit.cause)
            }
            const now = yield* DateTime.now
            const next = DateTime.unsafeFromDate(Cron.next(
              options.cron,
              options.calculateNextRunFromPrevious ? request.payload.dateTime : now
            ))
            const client = makeClient(DateTime.formatIso(next))
            return yield* client.run({ dateTime: next }, { discard: true }).pipe(
              Effect.tapErrorCause((cause) => Effect.logWarning("Failed to schedule next run, retrying", cause)),
              Effect.sandbox,
              Effect.retry(retryPolicy),
              Effect.orDie
            )
          })),
          Effect.annotateLogs({
            module: "ClusterCron",
            name: options.name,
            dateTime: request.payload.dateTime
          })
        )
    }
  }))

  return Layer.merge(InitialRun, EntityLayer)
}

const retryPolicy = Schedule.exponential(200, 1.5).pipe(
  Schedule.union(Schedule.spaced("1 minute"))
)

class CronPayload extends Schema.Class<CronPayload>("@effect/cluster/ClusterCron/CronPayload")({
  dateTime: Schema.DateTimeUtc
}) {
  [PrimaryKey.symbol]() {
    return ""
  }
  [DeliverAt.symbol]() {
    return this.dateTime
  }
}
