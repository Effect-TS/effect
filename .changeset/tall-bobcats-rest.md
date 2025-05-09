---
"effect": patch
---

Schema: TaggedError no longer crashes when the `message` field is explicitly defined.

If you define a `message` field in your schema, `TaggedError` will no longer add its own `message` getter. This avoids a stack overflow caused by infinite recursion.

Before

```ts
import { Schema } from "effect"

class Todo extends Schema.TaggedError<Todo>()("Todo", {
  message: Schema.optional(Schema.String)
}) {}

// ❌ Throws "Maximum call stack size exceeded"
console.log(Todo.make({}))
```

After

```ts
// ✅ Works correctly
console.log(Todo.make({}))
```
