/**
 * @title Continuing an existing MCP sampling tool loop
 *
 * Pair assistant tool uses with their matching results before requesting the
 * next sampling turn. Sampling remains supported for existing integrations.
 */
import { McpSchema } from "effect/ai"

// Sampling is deprecated in MCP 2026-07-28. Use this pattern to maintain an
// existing client-sampling integration; new applications should call a model
// provider directly. The client must declare sampling.tools support.

// A result belongs to one actual tool-use block from the previous assistant
// sampling response. Keep the pair together while executing parallel tools.
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
            // Include every tool use from the assistant's preceding response.
            { role: "assistant", content: completed.map(({ toolUse }) => toolUse) },
            // This immediately following user message contains only results,
            // exactly one for each ID. Put later instructions in a new message.
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

// Return this InputRequired from an MCP tool or prompt handler. Modern clients
// receive it as a multi round-trip input request. When using a legacy reverse
// client, pass the same message history to McpReverseClient.createMessage.
// The server rejects incomplete histories before sending them to the client.
