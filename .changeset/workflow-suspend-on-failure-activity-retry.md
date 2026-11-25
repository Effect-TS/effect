---
"effect": patch
---

Fix `Activity.retry` under `Workflow.SuspendOnFailure` so failed attempts reach the retry policy instead of suspending immediately. If the policy is exhausted and the error escapes, the workflow suspends and `resume` replays the stored failures.
