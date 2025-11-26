/**
 * GitHubActionWorkflowContext - Effect wrappers for GitHub Actions workflow context
 *
 * Provides an Effect-based interface for accessing the GitHub Actions workflow
 * execution context including event payload, repository info, and run metadata.
 *
 * @since 0.0.1
 */
import * as GHGitHub from "@actions/github"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * Webhook payload type
 * @since 0.0.1
 */
export interface GitHubActionWebhookPayload {
  readonly [key: string]: unknown
  readonly repository?: {
    readonly owner: { readonly login: string; readonly [key: string]: unknown }
    readonly name: string
    readonly [key: string]: unknown
  }
  readonly issue?: { readonly number: number; readonly [key: string]: unknown }
  readonly pull_request?: { readonly number: number; readonly [key: string]: unknown }
  readonly sender?: { readonly type?: string; readonly login?: string; readonly [key: string]: unknown }
  readonly action?: string
  readonly number?: number
}

/**
 * Repository reference
 * @since 0.0.1
 */
export interface GitHubActionRepoRef {
  readonly owner: string
  readonly repo: string
}

/**
 * Issue/PR reference
 * @since 0.0.1
 */
export interface GitHubActionIssueRef extends GitHubActionRepoRef {
  readonly number: number
}

/**
 * GitHub Actions workflow context data
 * @since 0.0.1
 */
export interface GitHubActionWorkflowContextData {
  /** Webhook payload object that triggered the workflow */
  readonly payload: GitHubActionWebhookPayload
  /** Name of the event that triggered the workflow */
  readonly eventName: string
  /** SHA of the commit that triggered the workflow */
  readonly sha: string
  /** Git ref (branch or tag) that triggered the workflow */
  readonly ref: string
  /** Name of the workflow */
  readonly workflow: string
  /** Name of the action */
  readonly action: string
  /** Login of the actor who triggered the workflow */
  readonly actor: string
  /** Name of the job */
  readonly job: string
  /** Run attempt number */
  readonly runAttempt: number
  /** Run number */
  readonly runNumber: number
  /** Unique identifier of the run */
  readonly runId: number
  /** GitHub API URL */
  readonly apiUrl: string
  /** GitHub server URL */
  readonly serverUrl: string
  /** GitHub GraphQL API URL */
  readonly graphqlUrl: string
  /** Repository owner and name */
  readonly repo: GitHubActionRepoRef
  /** Issue/PR reference (if applicable) */
  readonly issue: GitHubActionIssueRef
}

/**
 * Error when repository context is not available
 * @since 0.0.1
 */
export class GitHubActionRepoContextError extends Error {
  /** @since 0.0.1 */
  readonly _tag = "GitHubActionRepoContextError"
  constructor() {
    super("context.repo requires a GITHUB_REPOSITORY environment variable like 'owner/repo'")
  }
}

/**
 * GitHub Actions Workflow Context service interface
 * @since 0.0.1
 */
export interface GitHubActionWorkflowContext {
  /**
   * Get the full workflow context
   */
  readonly context: Effect.Effect<GitHubActionWorkflowContextData, GitHubActionRepoContextError>
}

/**
 * Tag for the GitHubActionWorkflowContext service
 * @since 0.0.1
 */
export const GitHubActionWorkflowContext = Context.GenericTag<GitHubActionWorkflowContext>(
  "@effect-native/github-action/GitHubActionWorkflowContext"
)

/**
 * Convert the raw context to our typed context data
 */
const getContextData = (): Effect.Effect<GitHubActionWorkflowContextData, GitHubActionRepoContextError> =>
  Effect.try({
    try: () => {
      const ctx = GHGitHub.context
      return {
        payload: ctx.payload as GitHubActionWebhookPayload,
        eventName: ctx.eventName,
        sha: ctx.sha,
        ref: ctx.ref,
        workflow: ctx.workflow,
        action: ctx.action,
        actor: ctx.actor,
        job: ctx.job,
        runAttempt: ctx.runAttempt,
        runNumber: ctx.runNumber,
        runId: ctx.runId,
        apiUrl: ctx.apiUrl,
        serverUrl: ctx.serverUrl,
        graphqlUrl: ctx.graphqlUrl,
        repo: ctx.repo,
        issue: ctx.issue
      }
    },
    catch: () => new GitHubActionRepoContextError()
  })

/**
 * Live implementation of GitHubActionWorkflowContext
 * @since 0.0.1
 */
export const GitHubActionWorkflowContextLive: GitHubActionWorkflowContext = {
  context: getContextData()
}

/**
 * Live layer for GitHubActionWorkflowContext
 * @since 0.0.1
 */
export const layer: Layer.Layer<GitHubActionWorkflowContext> = Layer.succeed(
  GitHubActionWorkflowContext,
  GitHubActionWorkflowContextLive
)

// --- Accessor functions ---

/**
 * Get the full workflow context
 * @since 0.0.1
 */
export const context: Effect.Effect<
  GitHubActionWorkflowContextData,
  GitHubActionRepoContextError,
  GitHubActionWorkflowContext
> = Effect.flatMap(GitHubActionWorkflowContext, (ctx) => ctx.context)

/**
 * Get the webhook payload
 * @since 0.0.1
 */
export const payload: Effect.Effect<
  GitHubActionWebhookPayload,
  GitHubActionRepoContextError,
  GitHubActionWorkflowContext
> = Effect.map(context, (ctx) => ctx.payload)

/**
 * Get the event name
 * @since 0.0.1
 */
export const eventName: Effect.Effect<string, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.eventName
)

/**
 * Get the repository reference
 * @since 0.0.1
 */
export const repo: Effect.Effect<GitHubActionRepoRef, GitHubActionRepoContextError, GitHubActionWorkflowContext> =
  Effect.map(context, (ctx) => ctx.repo)

/**
 * Get the issue/PR reference
 * @since 0.0.1
 */
export const issue: Effect.Effect<GitHubActionIssueRef, GitHubActionRepoContextError, GitHubActionWorkflowContext> =
  Effect.map(context, (ctx) => ctx.issue)

/**
 * Get the commit SHA
 * @since 0.0.1
 */
export const sha: Effect.Effect<string, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.sha
)

/**
 * Get the git ref (branch/tag)
 * @since 0.0.1
 */
export const ref: Effect.Effect<string, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.ref
)

/**
 * Get the actor who triggered the workflow
 * @since 0.0.1
 */
export const actor: Effect.Effect<string, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.actor
)

/**
 * Get the workflow name
 * @since 0.0.1
 */
export const workflow: Effect.Effect<string, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.workflow
)

/**
 * Get the job name
 * @since 0.0.1
 */
export const job: Effect.Effect<string, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.job
)

/**
 * Get the run ID
 * @since 0.0.1
 */
export const runId: Effect.Effect<number, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.runId
)

/**
 * Get the run number
 * @since 0.0.1
 */
export const runNumber: Effect.Effect<number, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.runNumber
)

/**
 * Get the run attempt number
 * @since 0.0.1
 */
export const runAttempt: Effect.Effect<number, GitHubActionRepoContextError, GitHubActionWorkflowContext> = Effect.map(
  context,
  (ctx) => ctx.runAttempt
)
