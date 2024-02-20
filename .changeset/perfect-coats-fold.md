---
"@effect/schema": minor
---

ParseResult: switch to classes and remove constructors

Before

```ts
import * as ParseResult from "@effect/schema/ParseResult";

ParseResult.type(ast, actual);
```

Now

```ts
import * as ParseResult from "@effect/schema/ParseResult";

new ParseResult.Type(ast, actual);
```
