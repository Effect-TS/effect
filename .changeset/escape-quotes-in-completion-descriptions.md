---
"@effect/cli": patch
---

Escape quotes in generated shell completion descriptions.

Subcommand descriptions are interpolated into single-quoted strings in the generated zsh and fish scripts. A quote in a description — an apostrophe in `Clear the project's cache` — closed the string early, so the remainder of the description and then the generated script itself were re-parsed as completion candidates.
