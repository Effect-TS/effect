# Impact Assessment: Naming Changes

## Changes Required

| Current | Proposed | Files Affected |
|---------|----------|----------------|
| `Core.ts` | `Runner.ts` | 1 source, 1 test, main.ts, index.ts |
| `GitHub.ts` | `WorkflowContext.ts` + `GitHubClient.ts` | 1 source → 2 sources, main.ts, index.ts |

## Social/Practical Audit

### Will users understand the names?

**Runner** - YES
- Users already know "GitHub Actions Runner" terminology
- The name immediately suggests "communication with the runner"

**WorkflowContext** - YES
- Clear it's about context, not editing workflows
- "Workflow" scopes it to GitHub Actions
- Avoids conflict with Effect's Context

**GitHubClient** - YES
- Standard naming pattern for API clients
- Clear it's for making GitHub API calls

### Is this a breaking change?

This is a prototype/scratchpad, so no users yet. No breaking change concern.

### Friction Points

1. **Three modules vs two** - More imports, but each import is more focused
2. **Longer names** - `WorkflowContext` is longer than `GitHub`, but clarity > brevity
3. **Split API client** - Users must consciously choose when they need the API

### Migration Path (if needed later)

```typescript
// OLD
import * as Core from "./Core.js"
import * as GitHub from "./GitHub.js"

// NEW
import * as Runner from "./Runner.js"
import * as WorkflowContext from "./WorkflowContext.js"
import * as GitHubClient from "./GitHubClient.js"
```

## Decision

✅ **PROCEED** with the rename:
- `Core` → `Runner`
- `GitHub` → `WorkflowContext` + `GitHubClient`

The names are:
- More descriptive
- Domain-appropriate  
- Conflict-free
- Future-proof
