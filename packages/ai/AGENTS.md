# EFFECT AI

## OVERVIEW

Type-safe AI provider integrations. Nested workspace with 6 sub-packages.

## STRUCTURE

```
ai/
├── ai/              # Core abstractions (AiModel, AiToolkit)
├── openai/          # OpenAI provider
├── anthropic/       # Anthropic provider
├── google/          # Google AI provider
├── amazon-bedrock/  # AWS Bedrock provider
└── openrouter/      # OpenRouter provider
```

## WHERE TO LOOK

| Task              | Location                           | Notes                       |
| ----------------- | ---------------------------------- | --------------------------- |
| Model abstraction | `ai/src/AiModel.ts`                | Provider-agnostic interface |
| Tool definitions  | `ai/src/AiToolkit.ts`              | Schema-based tools          |
| Embeddings        | `ai/src/EmbeddingModel.ts`         | Vector embeddings           |
| OpenAI impl       | `openai/src/OpenAiClient.ts`       | GPT models                  |
| Anthropic impl    | `anthropic/src/AnthropicClient.ts` | Claude models               |

## CONVENTIONS

### Provider Pattern

```typescript
// Provider-specific client
const client = yield * OpenAiClient.OpenAiClient

// Use via abstract interface
const response = yield * AiModel.generate(model, prompt)
```

### Tool Definition

```typescript
const myTool = AiToolkit.make({
  name: "search",
  description: "Search the web",
  parameters: Schema.Struct({ query: Schema.String }),
  execute: ({ query }) => Effect.succeed(results)
})
```

### Streaming

```typescript
const stream = AiModel.stream(model, prompt)
yield* Stream.runForEach(stream, (chunk) => ...)
```

## GENERATED FILES

Large `Generated.ts` files in each provider (7k-22k LOC):

- Auto-generated type-safe API clients
- Do not edit manually

## ANTI-PATTERNS

- **Never hardcode provider** - Use AiModel abstraction
- **Never edit Generated.ts** - Regenerate from spec

## NOTES

- Nested workspace: `packages/ai/*` has own pnpm-workspace.yaml
- EmbeddingModel supports batched requests via RequestResolver
- Streaming responses use Effect Stream
- All providers return Effect types
