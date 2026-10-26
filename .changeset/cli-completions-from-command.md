---
"effect": patch
---

Add `Completions.fromCommand` to `effect/cli`. It converts an existing `Command` tree into a `CommandDescriptor`, so build tooling can generate shell completion scripts with `Completions.generate` without running the CLI.
