---
"@effect/schema": patch
---

Schema: add `transformation: false` option to `pluck`.

Given a schema `Schema<A, I, R>` and a key `K`, this function extracts a specific field from the `A` type, producing a new schema that represents a transformation from the `I` type to `A[K]`.

**If the option `{ transformation: false }` is provided**, the returned schema `Schema<A[K], I[K], R>` only represents the value of the field without any transformation.

**Example**

```ts
import * as S from "@effect/schema/Schema";

// ---------------------------------------------
// use case: pull out a single field from a
// struct through a transformation
// ---------------------------------------------

const mytable = S.struct({
  column1: S.NumberFromString,
  column2: S.number,
});

// const pullOutColumn1: S.Schema<number, {
//     readonly column1: string;
//     readonly column2: number;
// }, never>
const pullOutColumn1 = mytable.pipe(S.pluck("column1"));

console.log(
  S.decode(S.array(pullOutColumn1))([
    { column1: "1", column2: 100 },
    { column1: "2", column2: 300 },
  ])
);
// Output: { _id: 'Either', _tag: 'Right', right: [ 1, 2 ] }

// ---------------------------------------------
// use case: pull out a single field from a
// struct (no transformation)
// ---------------------------------------------

// const pullOutColumn1Value: S.Schema<number, string, never>
const pullOutColumn1Value = mytable.pipe(
  S.pluck("column1", { transformation: false })
);

console.log(S.decode(S.array(pullOutColumn1Value))(["1", "2"]));
// Output: { _id: 'Either', _tag: 'Right', right: [ 1, 2 ] }
```
