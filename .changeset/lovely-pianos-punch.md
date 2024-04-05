---
"@effect/schema": patch
---

Add `ParseIssueTitle` annotation, closes #2482

When a decoding or encoding operation fails, it's useful to have additional details in the default error message returned by `TreeFormatter` to understand exactly which value caused the operation to fail. To achieve this, you can set an annotation that depends on the value undergoing the operation and can return an excerpt of it, making it easier to identify the problematic value. A common scenario is when the entity being validated has an `id` field. The `ParseIssueTitle` annotation facilitates this kind of analysis during error handling.

The type of the annotation is:

```ts
export type ParseIssueTitleAnnotation = (
  issue: ParseIssue
) => string | undefined;
```

If you set this annotation on a schema and the provided function returns a `string`, then that string is used as the title by `TreeFormatter`, unless a `message` annotation (which has the highest priority) has also been set. If the function returns `undefined`, then the default title used by `TreeFormatter` is determined with the following priorities:

- `identifier`
- `title`
- `description`
- `ast.toString()`

**Example**

```ts
import type { ParseIssue } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";

const getOrderItemId = ({ actual }: ParseIssue) => {
  if (S.is(S.struct({ id: S.string }))(actual)) {
    return `OrderItem with id: ${actual.id}`;
  }
};

const OrderItem = S.struct({
  id: S.string,
  name: S.string,
  price: S.number,
}).annotations({
  identifier: "OrderItem",
  parseIssueTitle: getOrderItemId,
});

const getOrderId = ({ actual }: ParseIssue) => {
  if (S.is(S.struct({ id: S.number }))(actual)) {
    return `Order with id: ${actual.id}`;
  }
};

const Order = S.struct({
  id: S.number,
  name: S.string,
  items: S.array(OrderItem),
}).annotations({
  identifier: "Order",
  parseIssueTitle: getOrderId,
});

const decode = S.decodeUnknownSync(Order, { errors: "all" });

// No id available, so the `identifier` annotation is used as the title
decode({});
/*
throws
Error: Order
├─ ["id"]
│  └─ is missing
├─ ["name"]
│  └─ is missing
└─ ["items"]
   └─ is missing
*/

// An id is available, so the `parseIssueTitle` annotation is used as the title
decode({ id: 1 });
/*
throws
Error: Order with id: 1
├─ ["name"]
│  └─ is missing
└─ ["items"]
   └─ is missing
*/

decode({ id: 1, items: [{ id: "22b", price: "100" }] });
/*
throws
Error: Order with id: 1
├─ ["name"]
│  └─ is missing
└─ ["items"]
   └─ ReadonlyArray<OrderItem>
      └─ [0]
         └─ OrderItem with id: 22b
            ├─ ["name"]
            │  └─ is missing
            └─ ["price"]
               └─ Expected a number, actual "100"
*/
```

In the examples above, we can see how the `parseIssueTitle` annotation helps provide meaningful error messages when decoding fails.
