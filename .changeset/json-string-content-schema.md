---
"effect": patch
---

Restore `contentSchema` for `Schema.fromJsonString` in JSON Schema and OpenAPI output, closes #9353.

The encoded string now carries a `Schema.isJsonContent` check that lists the JSON form of the inner schema as a representation dependency. JSON Schema output embeds it as `contentSchema`, and identified schemas become definitions, so `HttpApiSchema.StreamSse({ data })` and JSON string payloads document their data schema in `components.schemas` again. Add `SchemaRepresentation.isJsonContentReviver` for reconstructing persisted documents. OpenAI and Anthropic structured output do not emit content-only definitions.
