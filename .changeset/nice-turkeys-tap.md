---
"@effect/schema": patch
---

add `includeTypeAnnotations` option to `JSONSchema.make`

This option allows you to include type annotations in the generated schema.

```typescript
import { JSONSchema, Schema } from "@effect/schema/JSONSchema"

class User extends Schema.Class<User>("User")(
  {
    id: Schema.String,
    name: Schema.String
  },
  // will be included in the generated schema
  { description: "Represents an User" }
) {}

const schema = JSONSchema.make(User, { includeTypeAnnotations: true })
console.log(JSON.stringify(schema, null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "id",
    "name"
  ],
  "properties": {
    "id": {
      "type": "string"
    },
    "name": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "description": "Represents an User",
  "title": "User"
}
*/
```
