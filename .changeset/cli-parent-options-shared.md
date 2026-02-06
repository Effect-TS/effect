---
"@effect/cli": patch
---

Fix shared options and edge cases for parent options after subcommand arguments

When a parent command and subcommand define the same option (e.g., both have `--verbose`), the subcommand now wins for options appearing after the subcommand. This matches CLI conventions (e.g., `git status --verbose` uses status's verbose, not git's).

Also fixes boolean parent options incorrectly consuming the next token as a value, and respects `--` as a separator during parent option extraction.
