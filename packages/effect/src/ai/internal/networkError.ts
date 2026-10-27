// Node, Deno and Bun wordings for a rejected header value
const invalidHeaderValue = /invalid header value|has invalid value/i

// absolute URLs end at whitespace, the end of the text, or Deno's `): ` separator
const embeddedUrl = /[a-z][a-z\d+.-]*:\/\/\S+?(?=\):\s|\s|$)/gi

/**
 * Node's `fetch` keeps the reason one level below `TypeError: fetch failed`,
 * and a refused `localhost` connection is an `AggregateError` with an empty
 * message that keeps the reasons in `errors`.
 */
const causeMessage = (cause: Error): string => {
  const message = cause.message === "" && cause instanceof AggregateError
    ? cause.errors.flatMap((error) => error instanceof Error && error.message !== "" ? [error.message] : []).join(", ")
    : cause.message
  // a rejected header value can come from outside the request, such as `FetchHttpClient.RequestInit`,
  // and a URL can carry userinfo or query secrets
  return invalidHeaderValue.test(message) ? "Invalid HTTP header value" : message.replace(embeddedUrl, "<url>")
}

export const describe = (cause: unknown): string | undefined => {
  const messages: Array<string> = []
  for (let depth = 0; depth < 3 && cause instanceof Error; depth++, cause = cause.cause) {
    const message = causeMessage(cause)
    if (message !== "") messages.push(message)
  }
  return messages.length === 0 ? undefined : messages.join(": ")
}
