---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Fail `ChildProcess` exit codes when a `stdin` or `additionalFds` input stream fails, instead of reporting a successful exit after truncated input.
