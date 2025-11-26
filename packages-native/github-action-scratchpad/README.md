# @effect-native/github-action-scratchpad

Effect-based GitHub Actions toolkit prototype with no build step.

## Features

- **No build step** - Uses Node.js 24 native TypeScript support
- **Effect-based API** - Full Effect wrappers for GitHub Actions
- **Ludicrously obvious naming** - `GitHubActionRunner`, `GitHubActionWorkflowContext`, `GitHubActionClient`

## Modules

### GitHubActionRunner

Communicates with the GitHub Actions Runner:
- Inputs/outputs (`getInput`, `setOutput`)
- Logging (`debug`, `info`, `warning`, `error`, `notice`)
- Groups (`startGroup`, `endGroup`, `group`)
- Environment (`exportVariable`, `addPath`, `setSecret`)
- State (`saveState`, `getState`)
- Lifecycle (`setFailed`)

### GitHubActionWorkflowContext

Provides workflow execution context:
- Event payload
- Repository info
- Commit SHA, ref
- Actor
- Run metadata

### GitHubActionClient

GitHub API client (Octokit):
- `getOctokit(token)` - Get authenticated Octokit instance

## Usage

```typescript
import * as Effect from "effect/Effect"
import { 
  GitHubActionRunner, 
  GitHubActionWorkflowContext, 
  GitHubActionClient 
} from "@effect-native/github-action-scratchpad"

const program = Effect.gen(function* () {
  const ctx = yield* GitHubActionWorkflowContext.context
  yield* GitHubActionRunner.info(`Running in ${ctx.repo.owner}/${ctx.repo.repo}`)
  
  const token = yield* GitHubActionRunner.getInput("github-token")
  const octokit = yield* GitHubActionClient.getOctokit(token)
  
  yield* GitHubActionRunner.setOutput("result", "success")
})
```
