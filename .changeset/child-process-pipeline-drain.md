---
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
---

Fix `ChildProcess.pipeTo` pipelines hanging when an earlier stage writes a lot of output to a stream that is not piped to the next stage.
