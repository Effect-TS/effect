---
title: AnthropicStructuredOutput.ts
nav_order: 2
parent: Modules
---

## AnthropicStructuredOutput.ts overview

Adapts Effect Schema codecs to the JSON Schema subset accepted by Anthropic
structured output.

The main entry point returns the JSON Schema to send to Anthropic and a codec
for decoding the model response back into the original application type.
Unsupported constraints can be omitted from the provider schema and remain
enforced by the returned codec.

Since v4.0.0

---

## Exports Grouped by Category

- [transforming](#transforming)
  - [toCodecAnthropic](#tocodecanthropic)

---

# transforming

## toCodecAnthropic

Converts a `Schema.Codec` to Anthropic structured-output JSON Schema and a
matching codec for model output.

**When to use**

Use when you send Effect Schema-backed structured output requests to
Anthropic and need provider-compatible JSON Schema without losing the decoded
application type.

**Details**

Returns the JSON Schema to include in the request and the codec to use when
decoding the model response. The codec remains authoritative: the provider
JSON Schema can be a lossy, less restrictive representation when Anthropic
cannot express an Effect Schema constraint.

**Gotchas**

- Some schemas use a provider-safe encoded shape: tuples become objects with
  numeric string keys, objects with index signatures become arrays of
  `[key, value]` pairs, and optional properties become required nullable
  properties.
- `oneOf` unions are emitted as `anyOf` unions.
- Unsupported constraints are removed from the provider schema and are still
  checked while decoding with the returned codec.
- Recursive schemas throw during conversion because Anthropic structured
  output does not support recursive references.

**See**

- `LanguageModel.CodecTransformer` for the structured-output transformer contract
- `OpenAiStructuredOutput.toCodecOpenAI` for the OpenAI-specific transformer

**Signature**

```ts
declare const toCodecAnthropic: <T, E, RD, RE>(
  schema: Schema.ConstraintCodec<T, E, RD, RE>
) => { readonly codec: Schema.ConstraintCodec<T, unknown, RD, RE>; readonly jsonSchema: JsonSchema.JsonSchema }
```

[Source](https://effect.website/blob/main/src/AnthropicStructuredOutput.ts#L56)

Since v4.0.0
