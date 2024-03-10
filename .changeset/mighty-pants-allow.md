---
"@effect/platform": patch
---

added PlatformLogger module, for writing logs to a file

If you wanted to write logfmt logs to a file, you can do the following:

```ts
import { PlatformLogger } from "@effect/platform";
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, Logger } from "effect";

const fileLogger = Logger.logfmtLogger.pipe(PlatformLogger.toFile("log.txt"));
const LoggerLive = Logger.replaceScoped(Logger.defaultLogger, fileLogger).pipe(
  Layer.provide(NodeFileSystem.layer)
);

Effect.log("a").pipe(
  Effect.zipRight(Effect.log("b")),
  Effect.zipRight(Effect.log("c")),
  Effect.provide(LoggerLive),
  NodeRuntime.runMain
);
```
