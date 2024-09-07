---
"@effect/cli": patch
---

Ensure `QuitException` terminates command-line processing.

A `QuitException` raised by a `Prompt` that is executing as a fallback for a CLI option will terminate processing of the command line.

