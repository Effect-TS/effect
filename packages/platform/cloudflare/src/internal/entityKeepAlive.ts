/**
 * Keep-alive for one entity Durable Object, in three separate pieces of
 * state:
 *
 * - `wanted` mirrors the persisted `keep_alive` flag that a restart restores.
 * - `holding` tracks whether the self `hold()` RPC is in flight.
 * - The holder count belongs to the current handler build only. Persisting it
 *   would break on restart: an `EntityResource` re-acquired by the rebuild
 *   adds a holder on top of the stored count, which then never returns to 0.
 *
 * @internal
 */
import * as Effect from "effect/Effect"
import * as Latch from "effect/Latch"

/** @internal */
export interface EntityKeepAlive {
  /** The `Entity.keepAlive` handler. */
  readonly update: (enabled: boolean) => Effect.Effect<void>
  /** The body of the self `hold()` RPC; resolves once the hold is released. */
  readonly await: Effect.Effect<void>
  readonly holderCount: () => number
  /** Forgets the holders of a closed handler build. The hold stays. */
  readonly resetHolders: () => void
  /** Starts the self hold when keep-alive is wanted and none is in flight. */
  readonly restore: () => void
}

/** @internal */
export interface EntityKeepAliveOptions {
  /** The persisted flag, read when the Durable Object starts. */
  readonly wanted?: boolean | undefined
  /**
   * Persists the flag. Runs in a forked fiber with the value current at that
   * point, and the hold is released only after a `false` write completes.
   */
  readonly persist?: ((wanted: boolean) => Effect.Effect<void>) | undefined
  /** Upper bound of the retry delay after a failed hold RPC. */
  readonly retryCapMillis?: (() => number) | undefined
}

/** @internal */
export const makeEntityKeepAlive = (
  startHold: () => Promise<void>,
  options?: EntityKeepAliveOptions
): EntityKeepAlive => {
  const latch = Latch.makeUnsafe(true)
  let holders = 0
  let wanted = options?.wanted ?? false
  let holding = false
  let generation = 0

  const attempt = (current: number, failures: number): void => {
    startHold().then(
      () => {
        if (current === generation) holding = false
      },
      (error) => {
        if (current !== generation) return
        // A safeguard only: production probes never saw a rejected hold.
        const cap = options?.retryCapMillis?.() ?? 30_000
        const delay = Math.random() * Math.min(cap, 100 * 2 ** failures)
        void Effect.runFork(Effect.logWarning("Entity keep-alive hold failed, retrying", error))
        setTimeout(() => {
          if (current === generation) attempt(current, failures + 1)
        }, delay)
      }
    )
  }

  const restore = () => {
    if (!wanted || holding) return
    holding = true
    latch.closeUnsafe()
    attempt(++generation, 0)
  }

  const release = () => {
    if (!holding) return
    holding = false
    generation++
    latch.openUnsafe()
  }

  const setWanted = (next: boolean) => {
    if (wanted === next) return
    wanted = next
    if (next) restore()
    const persist = options?.persist
    if (persist === undefined) {
      if (!next) release()
      return
    }
    // Mailbox writes wait for an open user transaction, so writing inline
    // would deadlock `Entity.keepAlive` called inside `withTransaction`.
    void Effect.runFork(
      Effect.suspend(() => persist(wanted)).pipe(
        Effect.ensuring(Effect.sync(() => {
          if (!wanted) release()
        }))
      )
    )
  }

  const update = (enabled: boolean): Effect.Effect<void> =>
    Effect.sync(() => {
      if (enabled) {
        holders++
        setWanted(true)
        // A hold that ended without a release is started again.
        restore()
        return
      }
      // With no holders in memory the flag may still be set: a fresh object
      // after a restart has count 0 while its stored row says 1.
      if (holders > 0) holders--
      if (holders === 0) setWanted(false)
    })

  return {
    update,
    await: latch.await,
    holderCount: () => holders,
    resetHolders: () => {
      holders = 0
    },
    restore
  }
}
