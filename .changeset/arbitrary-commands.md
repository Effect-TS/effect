---
"effect": patch
---

Add `Arbitrary.commands`, `Arbitrary.command` and `Arbitrary.runCommands` for model-based testing: generate command sequences that a model allows, with symbolic references to earlier results, run them against the real system checking postconditions over each command's `Exit` and an optional invariant, and shrink failures by deleting commands.
