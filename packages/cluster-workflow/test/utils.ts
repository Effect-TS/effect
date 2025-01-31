import * as Activity from "@effect/cluster-workflow/Activity"
import { vi } from "@effect/vitest"
import type { Mock } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import type * as Schema from "effect/Schema"

export function mockEffect<A, E>(
  impl: () => Exit.Exit<A, E>
): { effect: Effect.Effect<A, E>; spy: Mock<() => Exit.Exit<A, E>> } {
  const spy = vi.fn(impl)
  const effect = pipe(Effect.sync(spy), Effect.flatten)
  return { spy, effect }
}

export function mockActivity<A, IA, E, IE>(
  persistenceId: string,
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>,
  impl: () => Exit.Exit<A, E>
) {
  const { effect, spy } = mockEffect(impl)

  const activityWithBody = <R>(fa: Effect.Effect<A, E, R>) =>
    pipe(
      effect,
      Effect.zipRight(fa),
      Activity.make(persistenceId, success, failure)
    )

  const activity = pipe(
    effect,
    Activity.make(persistenceId, success, failure)
  )

  return { spy, activity, activityWithBody }
}
