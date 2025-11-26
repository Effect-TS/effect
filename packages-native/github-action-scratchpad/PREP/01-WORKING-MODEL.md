# Working Model: Module Naming

## Updated Understanding

The evidence shows that "Core" and "GitHub" are **package-centric names** not **domain-centric names**. 

The domain is **GitHub Actions Workflows**, and the concepts are:

### Domain Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  WorkflowContext │    │           Runner                  │  │
│  │  ──────────────  │    │           ──────                  │  │
│  │  • event payload │    │  ┌─────────┐  ┌────────────────┐ │  │
│  │  • repo info     │    │  │ Inputs  │  │    Outputs     │ │  │
│  │  • sha, ref      │    │  │ ─────── │  │    ───────     │ │  │
│  │  • actor         │    │  │ getInput│  │ setOutput      │ │  │
│  │  • run metadata  │    │  └─────────┘  └────────────────┘ │  │
│  └──────────────────┘    │                                   │  │
│                          │  ┌─────────┐  ┌────────────────┐ │  │
│  ┌──────────────────┐    │  │ Logging │  │  Environment   │ │  │
│  │   GitHubClient   │    │  │ ─────── │  │  ───────────── │ │  │
│  │   ────────────   │    │  │ info    │  │ exportVariable │ │  │
│  │  • Octokit       │    │  │ debug   │  │ addPath        │ │  │
│  │  • REST API      │    │  │ warning │  │ setSecret      │ │  │
│  │  • GraphQL       │    │  │ error   │  └────────────────┘ │  │
│  └──────────────────┘    │  │ group   │                     │  │
│                          │  └─────────┘  ┌────────────────┐ │  │
│                          │               │     State      │ │  │
│                          │               │     ─────      │ │  │
│                          │               │ saveState      │ │  │
│                          │               │ getState       │ │  │
│                          │               └────────────────┘ │  │
│                          └──────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Proposed Module Structure

### Option A: Two Modules (Minimal Change)

| Current | Proposed | Rationale |
|---------|----------|-----------|
| `Core` | `Runner` | This module interfaces with the GitHub Actions Runner |
| `GitHub` | `Workflow` | This module provides workflow context + GitHub API client |

**Pros:** Simple rename, maintains 1:1 mapping with upstream
**Cons:** Still conflates context and API client

### Option B: Three Modules (Better Separation)

| Module | Responsibility |
|--------|---------------|
| `Runner` | Logging, environment, state, lifecycle (setFailed) |
| `Workflow` | Inputs, outputs, context (payload, repo, sha, actor) |
| `GitHubClient` | Octokit API client |

**Pros:** Clean separation of concerns
**Cons:** More modules to import

### Option C: Keep Together, Better Names

| Current | Proposed | Rationale |
|---------|----------|-----------|
| `Core` | `Runner` | The runner is what executes the action |
| `GitHub` | `Context` | The context is what triggered the action |

**Pros:** Simple, descriptive
**Cons:** "Context" is generic (but less so than "Core" or "GitHub")

## Recommendation: Option A with Caveats

Use **`Runner`** and **`Workflow`**:

- `Runner` - Everything that communicates with the Actions runner
- `Workflow` - Everything about the workflow execution (context + API)

This is the simplest change that adds real semantic meaning.
