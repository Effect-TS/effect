# Theoretical Framework: Final Naming Proposal

## Effect Platform Naming Pattern

Effect platform packages use a **ludicrously verbose** naming convention:

```
{Platform} + {Concept} = {PlatformConcept}
```

Examples from `@effect/platform-bun`:
- `BunFileSystem`
- `BunHttpServer`
- `BunHttpServerRequest`
- `BunWorkerRunner`
- `BunCommandExecutor`
- `BunContext`

Examples from `@effect/platform-node`:
- `NodeFileSystem`
- `NodeHttpServer`
- `NodeHttpClient`
- `NodeWorkerRunner`
- `NodeRuntime`

The prefix makes it **ludicrously obvious** what platform you're targeting.

## Applying the Pattern to GitHub Actions

Our platform is **GitHub Actions**, so the prefix should be `GitHubAction`:

```
GitHubAction + {Concept} = GitHubAction{Concept}
```

### Module 1: `GitHubActionRunner`

**Wraps:** `@actions/core`

**Rationale:** The GitHub Actions **Runner** is the execution environment. This module provides all communication with the runner:
- Logging to runner output
- Reading inputs from runner
- Writing outputs to runner
- Setting environment variables
- Managing state between steps
- Controlling action exit status

**Service Name:** `GitHubActionRunner` (tag: `@effect-native/github-action/GitHubActionRunner`)

### Module 2: `GitHubActionWorkflowContext`

**Wraps:** `@actions/github` (context portion)

**Rationale:** This module provides the **context** of the current **workflow** execution:
- What event triggered the workflow
- Which repository is being acted on
- The commit SHA, branch/tag ref
- Who triggered it (actor)
- Run metadata (runId, runNumber, runAttempt)

**Service Name:** `GitHubActionWorkflowContext` (tag: `@effect-native/github-action/GitHubActionWorkflowContext`)

### Module 3: `GitHubActionClient`

**Wraps:** `@actions/github` (Octokit portion)

**Rationale:** This module provides an authenticated **GitHub API client**:
- REST API access via Octokit
- GraphQL API access

**Service Name:** `GitHubActionClient` (tag: `@effect-native/github-action/GitHubActionClient`)

---

## Final Structure

```
src/
├── index.ts                        # Re-exports all modules
├── GitHubActionRunner.ts           # Runner communication (logging, env, state)
├── GitHubActionWorkflowContext.ts  # Workflow execution context
└── GitHubActionClient.ts           # GitHub API client (Octokit)
```

## Usage Example

```typescript
import * as Effect from "effect/Effect"
import { 
  GitHubActionRunner, 
  GitHubActionWorkflowContext, 
  GitHubActionClient 
} from "@effect-native/github-action"

const program = Effect.gen(function* () {
  // Get workflow context
  const ctx = yield* GitHubActionWorkflowContext.context
  
  // Log to runner
  yield* GitHubActionRunner.info(`Running in ${ctx.repo.owner}/${ctx.repo.repo}`)
  
  // Get inputs
  const token = yield* GitHubActionRunner.getInput("github-token")
  
  // Use GitHub API
  const octokit = yield* GitHubActionClient.getOctokit(token)
  const { data: user } = yield* Effect.promise(() => octokit.rest.users.getAuthenticated())
  
  // Set output
  yield* GitHubActionRunner.setOutput("user", user.login)
})
```

## Why Verbose Names?

1. **Ludicrously obvious** - No ambiguity about what "Runner" means
2. **Consistent with Effect ecosystem** - Follows `{Platform}{Concept}` pattern
3. **Grep-friendly** - `rg "GitHubAction"` finds everything GitHub Actions related
4. **Self-documenting** - Code reads like English: "GitHubActionRunner.info"
5. **Future-proof** - If there's ever a `DockerRunner` or `CircleCIRunner`, no confusion
