/**
 * @title Continuing an existing MCP sampling tool loop
 *
 * Pair assistant tool uses with their matching results before requesting the
 * next sampling turn. Sampling remains supported for existing integrations.
 */
import { McpSchema } from "effect/ai"

// Sampling is deprecated in MCP 2026-07-28: keep this pattern for existing
// integrations, and call a model provider directly in new code. The client
// must declare `sampling.tools`.

// Keep each result with the tool use it answers, even when tools run in
// parallel.
interface CompletedToolUse {
  readonly toolUse: McpSchema.ToolUseContent
  readonly resultText: string
}

export const requestNextSamplingTurn = (
  instruction: string,
  completed: readonly [CompletedToolUse, ...Array<CompletedToolUse>]
): McpSchema.InputRequired =>
  new McpSchema.InputRequired({
    inputRequests: {
      summary: {
        method: "sampling/createMessage",
        params: {
          maxTokens: 1_024,
          messages: [
            { role: "user", content: { type: "text", text: instruction } },
            // Every tool use from the preceding assistant response.
            { role: "assistant", content: completed.map(({ toolUse }) => toolUse) },
            // Immediately followed by only their results, one per tool-use ID.
            // Send further instructions in a later message.
            {
              role: "user",
              content: completed.map(({ resultText, toolUse }) => ({
                type: "tool_result",
                toolUseId: toolUse.id,
                content: [{ type: "text", text: resultText }]
              }))
            }
          ]
        }
      }
    }
  })

// Return this from an MCP tool or prompt handler; modern clients receive it as
// an input request. On legacy connections, pass the same messages to
// `McpReverseClient.createMessage`. Either way, the server rejects an
// unbalanced history before sending it.
