import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Queue from "effect/Queue"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import type * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

import { renewalKey, RenewalSession } from "../sessions/renewal.ts"
import { reportAtomDefects } from "./failures.ts"

/**
 * Emits initial visibility and subsequent visibility/focus changes, only when consumed.
 *
 * @internal
 */
export const browserActivity: Stream.Stream<boolean> = Stream.callback<boolean>(
  Effect.fnUntraced(function*(queue) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      yield* Queue.offer(queue, false)

      return
    }

    const update = () => Queue.offerUnsafe(queue, document.visibilityState === "visible")

    yield* Effect.acquireRelease(
      Effect.sync(() => {
        window.addEventListener("focus", update)
        document.addEventListener("visibilitychange", update)
        update()
      }),
      () =>
        Effect.sync(() => {
          window.removeEventListener("focus", update)
          document.removeEventListener("visibilitychange", update)
        })
    )
  })
)

/**
 * One worker per mounted session atom. All resources belong to the atom's Scope.
 *
 * @internal
 */
export const maintainSession = Effect.fnUntraced(function*<E, R>(options: {
  readonly session: Atom.Atom<AsyncResult.AsyncResult<unknown, E>>
  readonly activity: Stream.Stream<boolean>
  readonly read: Effect.Effect<unknown, E, R>
  readonly renew: (key: string, generation: number) => Effect.Effect<unknown, E, R>
  readonly generation: Effect.Effect<number>
  readonly lastAttempt: Effect.Effect<string | undefined>
  readonly deadline: (session: unknown) => number | undefined
  readonly publish: (result: AsyncResult.AsyncResult<void, E>) => void
}) {
  const registry = yield* AtomRegistry.AtomRegistry
  const clock = yield* Clock.Clock
  const wake = yield* Queue.sliding<void>(1)
  let foreground = false
  let initialized = false
  let resume = false
  let current: { readonly key: string; readonly due: number } | undefined
  let blocked: string | undefined

  const observe = (value: unknown) => {
    const due = options.deadline(value)

    current = Schema.is(RenewalSession)(value) && due !== undefined
      ? { key: renewalKey(value), due }
      : undefined
    if (value === null) options.publish(AsyncResult.success(undefined))
  }

  yield* Effect.acquireRelease(
    Effect.sync(() =>
      registry.subscribe(
        options.session,
        (result) => {
          if (AsyncResult.isSuccess(result) && !result.waiting) observe(result.value)
          else if (!AsyncResult.isSuccess(result)) current = undefined
          Queue.offerUnsafe(wake, undefined)
        },
        { immediate: true }
      )
    ),
    (unsubscribe) => Effect.sync(unsubscribe)
  )

  yield* options.activity.pipe(
    Stream.runForEach((active) =>
      Effect.sync(() => {
        if (active && initialized) {
          resume = true
          // Reads are safe to retry on a later foreground signal. The client's
          // attempt fence still prevents retrying an uncertain credential write.
          blocked = undefined
        }
        initialized = true
        foreground = active
        Queue.offerUnsafe(wake, undefined)
      })
    ),
    reportAtomDefects,
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        foreground = false
        options.publish(AsyncResult.failure(cause))
        Queue.offerUnsafe(wake, undefined)
      })
    ),
    Effect.forkScoped
  )

  while (true) {
    if (resume && foreground) {
      resume = false
      current = undefined
      registry.refresh(options.session)
    }

    const next = current

    if (
      !foreground ||
      next === undefined ||
      next.key === blocked ||
      next.key === (yield* options.lastAttempt)
    ) {
      yield* Queue.take(wake)
      continue
    }

    const remaining = next.due - clock.currentTimeMillisUnsafe()

    if (remaining > 0) {
      options.publish(AsyncResult.success(undefined))
      yield* Effect.raceFirst(Queue.take(wake), Effect.sleep(Math.min(remaining, 2_147_483_647)))
      continue
    }

    const generation = yield* options.generation

    const result = yield* Effect.exit(
      Effect.gen(function*() {
        // Recheck authoritative state before writing; cached hints only schedule this read.
        const session = yield* options.read

        observe(session)
        if (!foreground || generation !== (yield* options.generation)) return
        if (
          current === undefined ||
          current.key !== next.key ||
          current.due > clock.currentTimeMillisUnsafe()
        ) {
          registry.refresh(options.session)

          return
        }
        current = undefined
        yield* options.renew(next.key, generation)
      })
    )

    if (Exit.isFailure(result)) {
      blocked = next.key
      options.publish(AsyncResult.failure(result.cause))
    } else options.publish(AsyncResult.success(undefined))
  }
})
