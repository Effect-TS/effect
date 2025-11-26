/**
 * Main entry point for the GitHub Action
 *
 * This file is executed directly by Node.js 24 with native TypeScript support.
 * No build/bundle step required.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as GitHubActionRunner from "./src/GitHubActionRunner.js"
import * as GitHubActionWorkflowContext from "./src/GitHubActionWorkflowContext.js"

/**
 * The main action logic using Effect
 */
const program = Effect.gen(function* () {
  // Get inputs
  const greeting = yield* GitHubActionRunner.getInput("greeting")
  const whoToGreet = yield* GitHubActionRunner.getInput("who-to-greet")

  // Get context (will fail gracefully if not in GitHub Actions environment)
  const contextResult = yield* Effect.either(GitHubActionWorkflowContext.context)

  const contextInfo = contextResult._tag === "Right"
    ? `Running in ${contextResult.right.repo.owner}/${contextResult.right.repo.repo}`
    : "Running outside GitHub Actions context"

  // Construct the message
  const message = `${greeting} ${whoToGreet}!`

  // Log with grouping
  yield* GitHubActionRunner.group("Action Execution", Effect.gen(function* () {
    yield* GitHubActionRunner.info(`Context: ${contextInfo}`)
    yield* GitHubActionRunner.info(`Message: ${message}`)

    const debugEnabled = yield* GitHubActionRunner.isDebug
    if (debugEnabled) {
      yield* GitHubActionRunner.debug("Debug mode is enabled")
    }
  }))

  // Set output
  yield* GitHubActionRunner.setOutput("message", message)

  yield* GitHubActionRunner.notice(`Action completed successfully: ${message}`)

  return message
})

/**
 * Run the action with error handling
 */
const runAction = program.pipe(
  Effect.catchAllDefect((defect) =>
    Effect.gen(function* () {
      yield* GitHubActionRunner.setFailed(`Unexpected error: ${String(defect)}`)
      return undefined as never
    })
  ),
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* GitHubActionRunner.setFailed(`Action failed: ${String(error)}`)
      return undefined as never
    })
  ),
  Effect.provide(Layer.merge(GitHubActionRunner.layer, GitHubActionWorkflowContext.layer))
)

// Execute
Effect.runPromise(runAction).catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
