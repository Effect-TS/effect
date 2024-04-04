---
"effect": patch
---

add Logger.withConsoleLog/withConsoleError apis

These apis transform send a Logger's output to console.log/console.error respectively.

```ts
import { Logger } from "effect";

// send output to stdout
const stderrLogger = Logger.withConsoleError(Logger.stringLogger);
```
