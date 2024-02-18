---
"@effect/platform": patch
---

add Template module to platform

The Template module can be used to create effectful text templates.

Example:

```ts
import { Effect } from "effect";
import { Template } from "@effect/platform";

const t = Template.make`<html>${Effect.succeed(123)}</html>`;

Effect.runSync(t); // returns "<html>123</html>"
```
