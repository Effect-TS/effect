---
"@effect/ai-openai": patch
---

Report failed OpenAI provider-executed tool calls as failure tool results in both `generateText` and `streamText`, preserving the call details.

- Web and file searches with a non-`completed` status are failures. Failure payloads preserve the status, action or queries, and partial file results.
- Code interpreter calls with a non-`completed` status are failures. Results include `status` and normalize omitted `outputs` to `null`. Decoding accepts the `interpreting` and `failed` statuses and null outputs.
- Image generation calls with a non-`completed` status are failures carrying `status` and `result`. Partial images remain preliminary successful results.
- MCP calls that report an `error` are failures carrying the error message; successful MCP results no longer include `error`.

Omitted code-interpreter and image-generation statuses default to `completed`. Code-interpreter calls accept null or omitted code. Streams complete parameter JSON and emit one matching call before its result even without `code.done`, preserving any streamed code. Parameter JSON now uses `container_id` instead of `containerId` and correctly escapes its value.

Search and code-interpreter success types restrict `status` to `"completed"`; handle other statuses when `isFailure` is `true`. File-search success and failure results require `results`, an array or `null`. Streaming normalizes omitted file-search results to `null`, matching `generateText`.
