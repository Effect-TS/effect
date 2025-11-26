# Evidence Log: What Do These Modules Actually Do?

## Module 1: Currently "Core" (wraps @actions/core)

### Functional Responsibilities

| Function | Domain Concept | Category |
|----------|---------------|----------|
| `getInput` | Read workflow input parameters | **Workflow I/O** |
| `getBooleanInput` | Read workflow input parameters | **Workflow I/O** |
| `getMultilineInput` | Read workflow input parameters | **Workflow I/O** |
| `setOutput` | Write workflow output values | **Workflow I/O** |
| `debug`, `info`, `warning`, `error`, `notice` | Emit logs to runner | **Runner Logging** |
| `startGroup`, `endGroup`, `group` | Collapsible log sections | **Runner Logging** |
| `exportVariable` | Set environment variables | **Runner Environment** |
| `addPath` | Modify PATH | **Runner Environment** |
| `setSecret` | Mask sensitive values | **Runner Security** |
| `saveState`, `getState` | Persist state between steps | **Step State** |
| `setFailed` | Set action exit status | **Action Lifecycle** |

### [FALSIFIES] "Core" as a name

- The module is NOT about "core" abstractions
- It's about **communicating with the GitHub Actions Runner**
- The runner executes the action, provides inputs, captures outputs
- This is the **Runner Interface** or **Runner Communication**

### [SUPPORTS] Domain-Specific Name

Possible alternatives:
- `Runner` - The GitHub Actions runner that executes workflows
- `Workflow` - The workflow execution context
- `ActionRunner` - More specific to GitHub Actions
- `WorkflowIO` - Emphasizes the I/O nature

---

## Module 2: Currently "GitHub" (wraps @actions/github)

### Functional Responsibilities

| Function | Domain Concept | Category |
|----------|---------------|----------|
| `context` | Workflow trigger context (event, repo, sha, etc.) | **Workflow Context** |
| `repo`, `issue`, `sha`, `ref`, `actor` | Specific context properties | **Workflow Context** |
| `payload` | The webhook event payload | **Event Data** |
| `getOctokit` | Authenticated GitHub API client | **GitHub API** |

### [FALSIFIES] "GitHub" as a name

- Too broad - GitHub has MANY services (API, OAuth, Packages, etc.)
- The module has TWO distinct responsibilities:
  1. Workflow execution context (from environment variables + event payload)
  2. GitHub REST/GraphQL API client (Octokit)
- These might actually be **two separate modules**

### [SUPPORTS] Domain-Specific Names

For context:
- `WorkflowContext` - The context of the running workflow
- `ActionContext` - The context of the running action
- `TriggerContext` - What triggered this workflow

For API client:
- `GitHubApi` - The GitHub API client
- `Octokit` - Just use the library name
- `GitHubClient` - API client

---

## Key Finding

The current modules conflate multiple concerns:

1. **"Core"** mixes:
   - Workflow I/O (inputs/outputs)
   - Logging
   - Environment manipulation
   - State management
   - Lifecycle control

2. **"GitHub"** mixes:
   - Workflow context (read-only info about the run)
   - API client (for making GitHub API calls)
