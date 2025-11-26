# Stress Test: Breaking the Name Proposals

## Testing "Runner" (for Core)

### What-If: User confusion with self-hosted runners?

GitHub has "self-hosted runners" and "GitHub-hosted runners" (the VMs).

**Risk:** User might think `Runner` is about *managing* runners, not communicating with the runner their action runs on.

**Verdict:** LOW RISK. The context of "inside an action" makes it clear.

### What-If: Name collision?

```typescript
import { Runner } from "@effect-native/github-action"
import { Runner } from "some-other-package" // Conflict!
```

**Verdict:** MEDIUM RISK. "Runner" is fairly common. Consider:
- `ActionRunner` (redundant with package name)
- `WorkflowRunner` (slightly verbose but unique)
- Keep `Runner` - it's descriptive and unlikely to conflict in action code

### What-If: Future expansion?

What if we add more runner-related features?
- Job matrix control
- Step outputs
- Annotations

**Verdict:** `Runner` is a good umbrella term for all these.

---

## Testing "Workflow" (for GitHub context + API)

### What-If: User wants to create/modify workflows?

They might expect `Workflow` to let them edit `.github/workflows/*.yml` files.

**Risk:** The module only provides *read-only* context, not workflow management.

**Verdict:** HIGH RISK. Misleading name.

### What-If: We split context from API client later?

If we later split `Workflow` into `Context` + `GitHubClient`, the name "Workflow" won't make sense for the API client.

**Verdict:** HIGH RISK. Name doesn't scale.

### Alternative: "Context" instead of "Workflow"

```typescript
import { Context } from "@effect-native/github-action"
```

**Problem:** Conflicts with Effect's `Context` module!

```typescript
import * as Context from "effect/Context" // Core Effect module
import * as Context from "@effect-native/github-action/Context" // Name collision!
```

**Verdict:** FATAL RISK. Cannot use "Context" as a module name.

### Alternative: "WorkflowContext"

```typescript
import { WorkflowContext } from "@effect-native/github-action"
```

**Verdict:** SAFE. Descriptive, unique, no conflicts.

---

## Testing Three-Module Split

| Module | Contents |
|--------|----------|
| `Runner` | Logging, env, state, setFailed |
| `Inputs` | getInput, setOutput |
| `WorkflowContext` | context, repo, sha, Octokit |

### What-If: Too many imports?

```typescript
import * as Runner from "@effect-native/github-action/Runner"
import * as Inputs from "@effect-native/github-action/Inputs"
import * as WorkflowContext from "@effect-native/github-action/WorkflowContext"
```

**Verdict:** MEDIUM RISK. More imports, but cleaner separation.

### What-If: Keep inputs/outputs with context?

Inputs and outputs ARE part of the workflow context (defined in action.yml).

**Verdict:** Inputs/outputs could go in `WorkflowContext`.

---

## Stress Test Results

| Proposal | Risk Level | Issues |
|----------|------------|--------|
| `Core` → `Runner` | LOW | Acceptable |
| `GitHub` → `Workflow` | HIGH | Misleading for workflow editing |
| `GitHub` → `Context` | FATAL | Conflicts with Effect's Context |
| `GitHub` → `WorkflowContext` | LOW | Safe and descriptive |
| Three-module split | MEDIUM | More complexity |
