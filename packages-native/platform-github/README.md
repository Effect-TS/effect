# @effect-native/platform-github

Effect-based platform package for GitHub Actions development.

## Installation

```bash
pnpm add @effect-native/platform-github
```

## Features

- **ActionRunner** - Effect-wrapped access to @actions/core (inputs, outputs, logging, groups, state, OIDC)
- **ActionContext** - Typed workflow context (event, repo, sha, actor, payload)
- **ActionClient** - Effect-wrapped Octokit for GitHub API access
- **ActionSummary** - Chainable job summary builder

## Usage

```typescript
import { Effect } from "effect"
import { Action, ActionRunner, ActionContext, ActionClient } from "@effect-native/platform-github"

const program = Effect.gen(function* () {
  // Access runner functionality
  const name = yield* ActionRunner.getInput("name")
  yield* ActionRunner.info(`Hello, ${name}!`)

  // Access workflow context
  const ctx = yield* ActionContext.ActionContext
  yield* ActionRunner.info(`Running in ${ctx.repo.owner}/${ctx.repo.repo}`)

  // Use GitHub API
  const client = yield* ActionClient.ActionClient
  const { data: user } = yield* client.request("GET /user")
  yield* ActionRunner.info(`Authenticated as ${user.login}`)

  yield* ActionRunner.setOutput("greeting", `Hello, ${name}!`)
})

// Run with all services provided
Action.runMain(program)
```

## License

MIT
