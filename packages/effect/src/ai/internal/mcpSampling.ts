import * as Predicate from "../../Predicate.ts"

/**
 * Reports invalid sampling tool-message ordering. Dated schemas validate the
 * payload shape separately.
 *
 * @internal
 */
export const samplingMessageError = (request: unknown): string | undefined => {
  if (!Predicate.isReadonlyObject(request) || !Array.isArray(request.messages)) return undefined

  let pending: Set<string> | undefined
  for (const [index, message] of request.messages.entries()) {
    if (!Predicate.isReadonlyObject(message) || (message.role !== "user" && message.role !== "assistant")) {
      return undefined
    }
    const blocks: ReadonlyArray<unknown> = Array.isArray(message.content) ? message.content : [message.content]

    if (pending !== undefined) {
      if (message.role !== "user") {
        return `Sampling message ${index} must provide the preceding tool results as a user message`
      }
      for (const block of blocks) {
        if (!Predicate.isReadonlyObject(block)) return undefined
        if (block.type !== "tool_result") {
          return `Sampling message ${index} must contain only tool results`
        }
        if (typeof block.toolUseId !== "string") return undefined
        if (!pending.delete(block.toolUseId)) {
          return `Sampling message ${index} contains an unexpected or repeated tool result`
        }
      }
      if (pending.size > 0) return `Sampling message ${index} is missing a tool result`
      pending = undefined
      continue
    }

    for (const block of blocks) {
      if (!Predicate.isReadonlyObject(block)) return undefined
      if (block.type === "tool_result") {
        return `Sampling message ${index} contains a tool result without a preceding assistant tool use`
      }
      if (block.type !== "tool_use") continue
      if (message.role !== "assistant") return `Sampling message ${index} must use the assistant role for tool uses`
      if (typeof block.id !== "string") return undefined
      pending ??= new Set()
      if (pending.has(block.id)) return `Sampling message ${index} contains a repeated tool use identifier`
      pending.add(block.id)
    }
  }
  return pending === undefined ? undefined : "Sampling messages must end after the pending tool results"
}
