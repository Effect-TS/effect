---
"@effect/ai-openai": patch
---

Report failed OpenAI provider-executed tool calls as failure tool results in both `generateText` and `streamText`, preserving the call details.

- Web and file searches with a non-`completed` status are failures. Failure payloads preserve the status, action or queries, and partial file results.
- Code interpreter calls with a non-`completed` status are failures. Results now include `status` alongside `outputs`, and omitted outputs are normalized to `null`. Response decoding now accepts the `interpreting` and `failed` statuses and `null` outputs that OpenAI documents for these calls.
- Image generation calls with a non-`completed` status are failures carrying `status` and `result`. Partial images remain preliminary successful results.
- MCP calls that report an `error` are failures carrying the error message; successful MCP results no longer include `error`.

Success types now restrict `status` to `"completed"`; handle other statuses when `isFailure` is `true`. File-search success and failure results require `results`, an array or `null`. Streaming normalizes omitted file-search results to `null`, matching `generateText`.
