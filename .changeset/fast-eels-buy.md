---
"@effect/schema": patch
---

add `{ exact: true }` optional argument to the `partial` API, mirroring the implementation in the `optional` API, closes #2140

The `partial` operation allows you to make all properties within a schema optional.

By default, the `partial` operation adds a union with `undefined` to the types. If you wish to avoid this, you can opt-out by passing a `{ exact: true }` argument to the `partial` operation.

**Example**

```ts
import * as S from "@effect/schema/Schema";

/*
const schema: S.Schema<{
    readonly a?: string | undefined;
}, {
    readonly a?: string | undefined;
}, never>
*/
const schema = S.partial(S.struct({ a: S.string }));

S.decodeUnknownSync(schema)({ a: "a" }); // ok
S.decodeUnknownSync(schema)({ a: undefined }); // ok

/*
const exact: S.Schema<{
    readonly a?: string;
}, {
    readonly a?: string;
}, never>
*/
const exactSchema = S.partial(S.struct({ a: S.string }), { exact: true });

S.decodeUnknownSync(exactSchema)({ a: "a" }); // ok
S.decodeUnknownSync(exactSchema)({ a: undefined });
/*
throws:
Error: { a?: string }
└─ ["a"]
   └─ Expected a string, actual undefined
*/
```
