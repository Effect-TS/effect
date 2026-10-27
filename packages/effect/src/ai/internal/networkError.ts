import type * as HttpClientError from "../../http/HttpClientError.ts"

// Node, Deno and Bun wordings for a rejected header value
const invalidHeaderValue = /invalid header value|has invalid value/i

// Node, Deno and Bun wordings for a URL that fails to parse, which print the raw input
const invalidUrl = /invalid url|failed to parse url|cannot be parsed as a url/i

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
  if (invalidHeaderValue.test(message)) return "Invalid HTTP header value"
  if (invalidUrl.test(message)) return "Invalid URL"
  return message.replace(embeddedUrl, "<url>")
}

const describeCause = (cause: unknown): string | undefined => {
  const messages: Array<string> = []
  for (let depth = 0; depth < 3 && cause instanceof Error; depth++, cause = cause.cause) {
    const message = causeMessage(cause)
    if (message !== "") messages.push(message)
  }
  return messages.length === 0 ? undefined : messages.join(": ")
}

export const describe = (error: HttpClientError.RequestError): string | undefined => {
  const description = describeCause(error.cause)
  // the cause of an invalid URL can print the raw input, in any engine's wording
  return description !== undefined && error._tag === "InvalidUrlError" ? "Invalid URL" : description
}
