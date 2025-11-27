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
  const eventName = yield* ActionContext.eventName
  const repo = yield* ActionContext.repo
  yield* ActionRunner.info(`Event: ${eventName}, Repo: ${repo.owner}/${repo.repo}`)

  // Use GitHub API
  const result = yield* ActionClient.request<{ data: { login: string } }>("GET /user")
  yield* ActionRunner.info(`Authenticated as ${result.data.login}`)

  yield* ActionRunner.setOutput("greeting", `Hello, ${name}!`)
})

// Run with all services provided
Action.runMain(program)
```

## Testing

The package exports test utilities for each service:

```typescript
import { Effect } from "effect"
import { ActionRunner, ActionRunnerTest } from "@effect-native/platform-github"
import { it, expect } from "@effect/vitest"

it.effect("my action works", () =>
  Effect.gen(function* () {
    const test = ActionRunnerTest.make({ inputs: { name: "world" } })
    const result = yield* ActionRunner.getInput("name").pipe(Effect.provide(test.layer))
    expect(result).toBe("world")
    
    yield* ActionRunner.setOutput("greeting", "Hello!").pipe(Effect.provide(test.layer))
    expect(test.outputs["greeting"]).toBe("Hello!")
  })
)
```

## License

MIT
