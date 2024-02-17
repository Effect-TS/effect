---
"@effect/schema": minor
---

Updated the `MessageAnnotation` type to accept a `ParseIssue`; it's now `(issue: ParseResult.ParseIssue) => string` to support custom error messages, which can be triggered under any circumstances.

You can retrieve the actual value by accessing the `actual` property of the `issue` object:

```diff
import * as S from "@effect/schema/Schema";

const schema = S.string.pipe(
  S.filter((s): s is string => s.length === 1, {
-    message: (actual) => `invalid value ${actual}`,
+    message: (issue) => `invalid value ${issue.actual}`,
  })
);
```
