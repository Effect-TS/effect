/**
 * @effect-native/github-action-scratchpad
 *
 * Effect-based GitHub Actions toolkit - prototype with no build step
 *
 * @since 0.0.1
 */

/**
 * GitHubActionRunner - Runner communication (logging, env, state, inputs/outputs)
 * @since 0.0.1
 */
export * as GitHubActionRunner from "./GitHubActionRunner.js"

/**
 * GitHubActionWorkflowContext - Workflow execution context (event, repo, sha, actor)
 * @since 0.0.1
 */
export * as GitHubActionWorkflowContext from "./GitHubActionWorkflowContext.js"

/**
 * GitHubActionClient - GitHub API client (Octokit)
 * @since 0.0.1
 */
export * as GitHubActionClient from "./GitHubActionClient.js"
