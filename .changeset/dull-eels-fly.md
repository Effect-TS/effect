---
"effect": patch
---

add Logger.withConsoleLog/withConsoleError apis

These apis send a Logger's output to console.log/console.error respectively.

```ts
import { Logger } from "effect";

// send output to stderr
const stderrLogger = Logger.withConsoleError(Logger.stringLogger);
```
