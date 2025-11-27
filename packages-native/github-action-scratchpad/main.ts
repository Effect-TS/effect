/**
 * Main entry point for the GitHub Action Demo
 *
 * This file demonstrates @effect-native/platform-github for building
 * GitHub Actions with Effect. Runs on Node.js 24 with native TypeScript support.
 */
import {
  Action,
  ActionClient,
  ActionContext,
  ActionRunner,
  Input
} from "@effect-native/platform-github"
import * as Effect from "effect/Effect"

/**
 * The main action logic using Effect
 *
 * Demonstrates the full Effect-based GitHub Action toolkit:
 * - Reading inputs via Input module (Schema-first parsing)
 * - Accessing workflow context via ActionContext
 * - Making API calls via ActionClient (Octokit)
 * - Structured logging with groups
 * - Setting outputs
 */
const program = Effect.gen(function* () {
  // Parse inputs using the new Input module
  // github-token is handled internally by Action.runMain via GITHUB_TOKEN env var
  // Here we demonstrate optional inputs with defaults
  const verbose = yield* Input.boolean("verbose").pipe(
    Effect.orElseSucceed(() => false)
  )

  // Get workflow context
  const eventName = yield* ActionContext.eventName
  const actor = yield* ActionContext.actor
  const sha = yield* ActionContext.sha
  const ref = yield* ActionContext.ref
  const workflow = yield* ActionContext.workflow
  const runId = yield* ActionContext.runId
  const runNumber = yield* ActionContext.runNumber
  const serverUrl = yield* ActionContext.serverUrl
  const payload = yield* ActionContext.payload
  const repo = yield* ActionContext.repo

  yield* ActionRunner.group("Workflow Context", () =>
    Effect.gen(function* () {
      yield* ActionRunner.info(`Event: ${eventName}`)
      yield* ActionRunner.info(`Repository: ${repo.owner}/${repo.repo}`)
      yield* ActionRunner.info(`Actor: ${actor}`)
      yield* ActionRunner.info(`SHA: ${sha.substring(0, 7)}`)
      yield* ActionRunner.info(`Ref: ${ref}`)
      yield* ActionRunner.info(`Workflow: ${workflow}`)
      yield* ActionRunner.info(`Run ID: ${runId}`)
      yield* ActionRunner.info(`Run Number: ${runNumber}`)
      if (verbose) {
        yield* ActionRunner.debug(`Server URL: ${serverUrl}`)
        yield* ActionRunner.debug(`Full SHA: ${sha}`)
      }
    })
  )

  // Only comment on PRs
  const prNumber = (payload as { pull_request?: { number?: number } }).pull_request?.number
  if (prNumber) {
    yield* ActionRunner.group("Creating PR Comment", () =>
      Effect.gen(function* () {
        yield* ActionRunner.info(`PR #${prNumber} detected`)

        const commentBody = [
          "## Effect GitHub Action Demo",
          "",
          "This comment was created using **@effect-native/platform-github** running on Node.js with native TypeScript support.",
          "",
          "### Workflow Context",
          "",
          "| Property | Value |",
          "|----------|-------|",
          `| Event | \`${eventName}\` |`,
          `| Actor | @${actor} |`,
          `| SHA | \`${sha.substring(0, 7)}\` |`,
          `| Ref | \`${ref}\` |`,
          `| Workflow | ${workflow} |`,
          `| Run | [#${runNumber}](${serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${runId}) |`,
          "",
          "### Technical Details",
          "",
          "- **Runtime**: Node.js 24 with native TypeScript support",
          "- **Package**: `@effect-native/platform-github`",
          "- **Services Used**:",
          "  - `Input` - Schema-first input parsing",
          "  - `ActionRunner` - Logging, outputs",
          "  - `ActionContext` - Workflow metadata",
          "  - `ActionClient` - Octokit API client",
          "",
          "---",
          `*Timestamp: ${new Date().toISOString()}*`
        ].join("\n")

        // Create the comment using ActionClient
        yield* ActionClient.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
          owner: repo.owner,
          repo: repo.repo,
          issue_number: prNumber,
          body: commentBody
        })

        yield* ActionRunner.info(`Comment created on PR #${prNumber}`)
      })
    )
  } else {
    yield* ActionRunner.info("Not a PR event, skipping comment creation")
  }

  // Set outputs
  yield* ActionRunner.setOutput("repo", `${repo.owner}/${repo.repo}`)
  yield* ActionRunner.setOutput("sha", sha)
  yield* ActionRunner.setOutput("actor", actor)
  yield* ActionRunner.setOutput("event", eventName)

  yield* ActionRunner.notice(`Effect GitHub Action completed successfully!`, {
    title: "Action Complete"
  })

  return { repo, sha, actor }
})

// Run the action - errors are handled automatically by runMain
// InputValidationFailure and ActionFailed are formatted nicely for GitHub UI
Action.runMain(program)
