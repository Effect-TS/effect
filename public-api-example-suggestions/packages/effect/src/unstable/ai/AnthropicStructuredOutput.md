# Example Suggestions: `effect/unstable/ai/AnthropicStructuredOutput`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/AnthropicStructuredOutput.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/AnthropicStructuredOutput.toCodecAnthropic` |   54 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/ai/AnthropicStructuredOutput.toCodecAnthropic`

- **Source:** `packages/effect/src/unstable/ai/AnthropicStructuredOutput.ts:54`
- **Kind / category:** `root-declaration` / `Codec Transformation`
- **Priority:** **recommended**
- **Current description:** Converts a `Schema.Codec` to Anthropic structured-output JSON Schema and a matching codec for model output.
- **Signature hint:** `declare function toCodecAnthropic<T, E, RD, RE>(schema: Schema.ConstraintCodec<T, E, RD, RE>): { readonly codec: Schema.ConstraintCodec<T, unknown, RD, RE>; readonly jsonSchema: JsonSchema.JsonSchema; }`
- **Import guidance:** Start from `import { AnthropicStructuredOutput } from "effect/unstable/ai"` and use `AnthropicStructuredOutput.toCodecAnthropic`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `AnthropicStructuredOutput.toCodecAnthropic`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
