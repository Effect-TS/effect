import * as Prompt from "@effect/cli/Prompt"
import { NodeRuntime, NodeTerminal } from "@effect/platform-node"
import { Console, Effect } from "effect"

// Demonstration of success, failure, and custom final messages
const program = Effect.gen(function*() {
  // Success case with custom success message
  const user = yield* Prompt.spinner(
    Effect.sleep("1200 millis").pipe(Effect.as({ id: 42, name: "Ada" })),
    {
      message: "Fetching user…",
      onSuccess: (user: { id: number; name: string }) => `Loaded ${user.name} (ID: ${user.id})`
    }
  )
  yield* Console.log(`User: ${JSON.stringify(user)}`)

  // Failure case with custom error message and proper error handling
  yield* Prompt.spinner(
    Effect.sleep("800 millis").pipe(Effect.zipRight(Effect.fail(new Error("Network timeout")))),
    {
      message: "Processing data…",
      onFailure: (error: Error) => `Processing failed: ${error.message}`
    }
  ).pipe(
    Effect.catchAll((error) => Console.log(`Caught error: ${error.message}`))
  )

  // Success case with both success and error mappers
  yield* Prompt.spinner(
    Effect.sleep("600 millis").pipe(Effect.as({ uploaded: 5, skipped: 2 })),
    {
      message: "Uploading files…",
      onSuccess: (result: { uploaded: number; skipped: number }) => `Uploaded ${result.uploaded} files (${result.skipped} skipped)`,
      onFailure: (error: unknown) => `Upload failed: ${error}`
    }
  )

  // Simple case without custom messages (uses original message)
  yield* Prompt.spinner(
    Effect.sleep("300 millis").pipe(Effect.as("done")),
    {
      message: "Cleaning up…"
    }
  )

  // Timeout case - demonstrates spinner handles timeout/interruption gracefully
  yield* Prompt.spinner(
    Effect.sleep("2 seconds").pipe(Effect.as("completed")),
    {
      message: "Long running task…",
      onSuccess: () => "Task completed successfully",
      onFailure: () => "Task timed out"
    }
  ).pipe(
    Effect.timeout("800 millis"),
    Effect.catchAll((error) => Console.log(`Caught timeout: ${error._tag}`))
  )

  // Die case - demonstrates spinner handles defects gracefully
  yield* Prompt.spinner(
    Effect.sleep("400 millis").pipe(Effect.zipRight(Effect.die("Unexpected system error"))),
    {
      message: "Risky operation…",
      onFailure: (error: unknown) => `Operation failed: ${error}`
    }
  ).pipe(
    Effect.catchAllCause((cause) => Console.log(`Caught defect: ${cause}`))
  )

  yield* Console.log("All done!")
})

const MainLive = NodeTerminal.layer

program.pipe(Effect.provide(MainLive), NodeRuntime.runMain)
