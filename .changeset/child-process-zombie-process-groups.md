---
"@effect/platform-node-shared": patch
---

Keep waiting for a detached `ChildProcess` process group that still exists but cannot be signalled, such as on macOS when only zombie members remain, instead of treating it as gone once the leader exits.
