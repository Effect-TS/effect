---
"@effect/cli": patch
---

Allow options to appear after positional arguments

Previously, `@effect/cli` required all options to appear before positional arguments. For example, `cmd --force staging` worked but `cmd staging --force` failed with "Received unknown argument".

This change updates the option parsing logic to scan through all arguments to find options, regardless of their position relative to positional arguments. This aligns with the behavior of most CLI tools (git, npm, docker, etc.) which allow options anywhere in the command.

**Before:**
```bash
myapp deploy --force staging  # worked
myapp deploy staging --force  # failed: "Received unknown argument: '--force'"
```

**After:**
```bash
myapp deploy --force staging  # works
myapp deploy staging --force  # works
```
