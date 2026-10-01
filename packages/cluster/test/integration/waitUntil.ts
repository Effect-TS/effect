import { Clock, Duration, Effect, Option } from "effect"

export const waitUntil = Effect.fnUntraced(function*<E, R, E2, R2>(
  description: string,
  condition: Effect.Effect<boolean, E, R>,
  diagnostics: Effect.Effect<unknown, E2, R2>,
  timeout: Duration.DurationInput = "15 seconds"
) {
  const deadline = (yield* Clock.currentTimeMillis) + Duration.toMillis(timeout)
  while (true) {
    const result = yield* condition.pipe(
      Effect.timeoutOption(Duration.millis(Math.max(1, deadline - (yield* Clock.currentTimeMillis))))
    )
    if (Option.isNone(result)) break
    if (result.value) return
    if ((yield* Clock.currentTimeMillis) >= deadline) break
    yield* Effect.sleep(100)
  }
  return yield* Effect.fail(new Error(`${description}\n${JSON.stringify(yield* diagnostics, null, 2)}`))
})
