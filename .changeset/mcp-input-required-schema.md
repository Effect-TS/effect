---
"effect": minor
---

`McpSchema.InputRequired` is now a schema class and `McpSchema.McpInputRequest` is now a schema, so a toolkit tool can declare `failure: McpSchema.InputRequired`.

### Migration

- The `McpSchema.InputRequired` constructor now validates its fields and throws when they are invalid, for example for an unknown input request `method`.
- A `Schema.instanceOf(McpSchema.InputRequired)` failure schema has no JSON codec, so in `failureMode: "return"` it fails with `ToolResultEncodingError`. Declare `failure: McpSchema.InputRequired` instead.
