/**
 * GitHubActionClient - Effect wrappers for GitHub API client (Octokit)
 *
 * Provides an Effect-based interface for making authenticated GitHub API calls
 * using Octokit within GitHub Actions.
 *
 * @since 0.0.1
 */
import * as GHGitHub from "@actions/github"
import type { GitHub } from "@actions/github/lib/utils.js"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * Authenticated Octokit instance type
 * @since 0.0.1
 */
export type GitHubActionOctokitInstance = InstanceType<typeof GitHub>

/**
 * GitHub Actions API Client service interface
 * @since 0.0.1
 */
export interface GitHubActionClient {
  /**
   * Get an authenticated Octokit client
   */
  readonly getOctokit: (token: string) => Effect.Effect<GitHubActionOctokitInstance>
}

/**
 * Tag for the GitHubActionClient service
 * @since 0.0.1
 */
export const GitHubActionClient = Context.GenericTag<GitHubActionClient>(
  "@effect-native/github-action/GitHubActionClient"
)

/**
 * Live implementation of GitHubActionClient
 * @since 0.0.1
 */
export const GitHubActionClientLive: GitHubActionClient = {
  getOctokit: (token) => Effect.sync(() => GHGitHub.getOctokit(token))
}

/**
 * Live layer for GitHubActionClient
 * @since 0.0.1
 */
export const layer: Layer.Layer<GitHubActionClient> = Layer.succeed(GitHubActionClient, GitHubActionClientLive)

// --- Accessor functions ---

/**
 * Get an authenticated Octokit client
 * @since 0.0.1
 */
export const getOctokit = (token: string): Effect.Effect<GitHubActionOctokitInstance, never, GitHubActionClient> =>
  Effect.flatMap(GitHubActionClient, (client) => client.getOctokit(token))
