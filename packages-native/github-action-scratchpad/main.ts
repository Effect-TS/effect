/**
 * Main entry point for the GitHub Action
 *
 * This file is executed directly by Node.js 24 with native TypeScript support.
 * No build/bundle step required.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as GitHubActionClient from "./src/GitHubActionClient.ts"
import * as GitHubActionRunner from "./src/GitHubActionRunner.ts"
import * as GitHubActionWorkflowContext from "./src/GitHubActionWorkflowContext.ts"

/**
 * The main action logic using Effect
 *
 * Demonstrates the full Effect-based GitHub Action toolkit:
 * - Reading inputs via GitHubActionRunner
 * - Accessing workflow context via GitHubActionWorkflowContext
 * - Making API calls via GitHubActionClient (Octokit)
 * - Structured logging with groups
 * - Setting outputs
 */
const program = Effect.gen(function* () {
  // Get the GitHub token (required for API calls)
  const token = yield* GitHubActionRunner.getInput("github-token", { required: true })

  // Get workflow context
  const ctx = yield* GitHubActionWorkflowContext.context

  // Get the authenticated Octokit client
  const octokit = yield* GitHubActionClient.getOctokit(token)

  yield* GitHubActionRunner.group("Workflow Context", Effect.gen(function* () {
    yield* GitHubActionRunner.info(`Event: ${ctx.eventName}`)
    yield* GitHubActionRunner.info(`Repository: ${ctx.repo.owner}/${ctx.repo.repo}`)
    yield* GitHubActionRunner.info(`Actor: ${ctx.actor}`)
    yield* GitHubActionRunner.info(`SHA: ${ctx.sha.substring(0, 7)}`)
    yield* GitHubActionRunner.info(`Ref: ${ctx.ref}`)
    yield* GitHubActionRunner.info(`Workflow: ${ctx.workflow}`)
    yield* GitHubActionRunner.info(`Run ID: ${ctx.runId}`)
    yield* GitHubActionRunner.info(`Run Number: ${ctx.runNumber}`)
  }))

  // Only comment on PRs
  const prNumber = ctx.payload.pull_request?.number
  if (prNumber) {
    yield* GitHubActionRunner.group("Creating PR Comment", Effect.gen(function* () {
      yield* GitHubActionRunner.info(`PR #${prNumber} detected`)

      const commentBody = [
        "## Effect GitHub Action Demo",
        "",
        "This comment was created by an Effect-based GitHub Action running **native TypeScript** (no build step!).",
        "",
        "### Workflow Context",
        "",
        "| Property | Value |",
        "|----------|-------|",
        `| Event | \`${ctx.eventName}\` |`,
        `| Actor | @${ctx.actor} |`,
        `| SHA | \`${ctx.sha.substring(0, 7)}\` |`,
        `| Ref | \`${ctx.ref}\` |`,
        `| Workflow | ${ctx.workflow} |`,
        `| Run | [#${ctx.runNumber}](${ctx.serverUrl}/${ctx.repo.owner}/${ctx.repo.repo}/actions/runs/${ctx.runId}) |`,
        "",
        "### Technical Details",
        "",
        "- **Runtime**: Node.js 24 with native TypeScript support",
        "- **Effect Version**: Using Effect for structured concurrency and dependency injection",
        "- **Services Used**:",
        "  - `GitHubActionRunner` - Logging, inputs, outputs",
        "  - `GitHubActionWorkflowContext` - Workflow metadata",
        "  - `GitHubActionClient` - Octokit API client",
        "",
        "---",
        `*Timestamp: ${new Date().toISOString()}*`
      ].join("\n")

      // Create the comment using Octokit
      yield* Effect.tryPromise({
        try: () =>
          octokit.rest.issues.createComment({
            owner: ctx.repo.owner,
            repo: ctx.repo.repo,
            issue_number: prNumber,
            body: commentBody
          }),
        catch: (error) => new Error(`Failed to create comment: ${error}`)
      })

      yield* GitHubActionRunner.info(`Comment created on PR #${prNumber}`)
    }))
  } else {
    yield* GitHubActionRunner.info("Not a PR event, skipping comment creation")
  }

  // Set outputs
  yield* GitHubActionRunner.setOutput("repo", `${ctx.repo.owner}/${ctx.repo.repo}`)
  yield* GitHubActionRunner.setOutput("sha", ctx.sha)
  yield* GitHubActionRunner.setOutput("actor", ctx.actor)
  yield* GitHubActionRunner.setOutput("event", ctx.eventName)

  yield* GitHubActionRunner.notice(`Effect GitHub Action completed successfully!`, {
    title: "Action Complete"
  })

  return { repo: ctx.repo, sha: ctx.sha, actor: ctx.actor }
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
  Effect.provide(
    Layer.mergeAll(
      GitHubActionRunner.layer,
      GitHubActionWorkflowContext.layer,
      GitHubActionClient.layer
    )
  )
)

// Execute
Effect.runPromise(runAction).catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
