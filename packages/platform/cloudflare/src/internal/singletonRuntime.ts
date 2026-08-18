/**
 * Runs one singleton effect for each Worker Cron Trigger wake. Concurrent
 * duplicate wakes are ignored while the accepted wake is still running; once
 * it returns, the object has no live work and Cloudflare may hibernate it.
 *
 * @internal
 */
import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import * as Effect from "effect/Effect"
import { armAlarm } from "./entityStorage.ts"
import {
  beginSingletonWake,
  completeSingletonWake,
  ensureSingletonStorage,
  loadSingletonState
} from "./singletonStorage.ts"

/** @internal */
export interface SingletonRuntimeOptions {
  readonly sql: SqlStorage
  readonly alarm: Pick<DurableObjectStorage, "deleteAlarm" | "getAlarm" | "setAlarm">
  readonly now: () => number
  readonly run: Effect.Effect<void, unknown>
}

/** @internal */
export interface SingletonRuntime {
  readonly wake: () => Promise<void>
  readonly runAlarm: () => Promise<void>
}

/** @internal */
export const makeSingletonRuntime = (options: SingletonRuntimeOptions): SingletonRuntime => {
  ensureSingletonStorage(options.sql)
  let inFlight: Promise<void> | undefined

  const runPending = (armAt?: number): Promise<void> => {
    if (inFlight !== undefined) return Promise.resolve()
    const run = options.run.pipe(
      Effect.ensuring(
        Effect.promise(() => options.alarm.deleteAlarm()).pipe(
          Effect.ensuring(Effect.sync(() => completeSingletonWake(options.sql)))
        )
      )
    )
    const operation = Effect.runPromise(
      armAt === undefined ? run : Effect.andThen(armAlarm(options.alarm, armAt), run)
    )
    inFlight = operation
    void operation.then(
      () => {
        inFlight = undefined
      },
      () => {
        inFlight = undefined
      }
    )
    return operation
  }

  return {
    wake: () => {
      if (inFlight !== undefined) return Promise.resolve()
      const pending = loadSingletonState(options.sql).wakeAt
      if (pending !== undefined) return runPending()
      const now = options.now()
      if (!beginSingletonWake(options.sql, now)) return Promise.resolve()
      return runPending(now)
    },

    runAlarm: () => loadSingletonState(options.sql).wakeAt === undefined ? Promise.resolve() : runPending()
  }
}
