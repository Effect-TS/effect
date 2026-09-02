---
"effect": patch
---

Fix `Sink.flatMap` losing pending leftovers when the next sink consumes no input, such as `Sink.take(0)` or `Sink.succeed`. Preserve those values in input order so subsequent sinks can consume them before new upstream input.
