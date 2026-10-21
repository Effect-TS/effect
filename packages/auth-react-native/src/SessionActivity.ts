/**
 * React Native foreground activity for automatic session renewal.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { AppState } from "react-native"

/**
 * Stream of the initial and subsequent app foreground state for automatic session renewal. Consuming
 * the stream owns the React Native AppState subscription.
 *
 * @stability unstable
 * @category streams
 * @since 4.1.0
 */
export const activity: Stream.Stream<boolean> = Stream.callback<boolean>(
  Effect.fnUntraced(function*(queue) {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const subscription = AppState.addEventListener("change", (state) => {
          Queue.offerUnsafe(queue, state === "active")
        })

        Queue.offerUnsafe(queue, AppState.currentState === "active")

        return subscription
      }),
      (subscription) => Effect.sync(() => subscription.remove())
    )
  })
)
