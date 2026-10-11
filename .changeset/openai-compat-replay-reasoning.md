---
"@effect/ai-openai-compat": patch
---

Send the text, tool calls and reasoning of an assistant prompt message as a single chat message, as required by providers such as DeepSeek, Kimi and GLM during tool loops. Reasoning is replayed under the field the provider returned it in (`reasoning_content` or `reasoning`), defaulting to `reasoning_content`.

Reasoning parts that were built by hand, or saved before this release, have no recorded field and are sent as `reasoning_content`. Providers that only accept `reasoning`, such as Groq, may reject them. Set the field on those parts explicitly:

```ts
{ type: "reasoning", text: "...", options: { openai: { reasoningField: "reasoning" } } }
```
