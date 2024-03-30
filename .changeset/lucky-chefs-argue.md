---
"@effect/schema": patch
---

ParseResult: Add `output` field to `TupleType` and `TypeLiteral`. While the operation may not be entirely successful, it still provides some useful output or information.

Examples (Tuple)

```ts
import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";

const schema = S.array(S.number);
const result = S.decodeUnknownEither(schema)([1, "a", 2, "b"], {
  errors: "all",
});
if (Either.isLeft(result)) {
  const issue = result.left.error;
  if (issue._tag === "TupleType") {
    console.log(issue.output); // [1, 2]
  }
}
```

Examples (TypeLiteral)

```ts
import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";

const schema = S.record(S.string, S.number);
const result = S.decodeUnknownEither(schema)(
  { a: 1, b: "b", c: 2, d: "d" },
  { errors: "all" }
);
if (Either.isLeft(result)) {
  const issue = result.left.error;
  if (issue._tag === "TypeLiteral") {
    console.log(issue.output); // { a: 1, c: 2 }
  }
}
```
