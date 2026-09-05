import * as Effect from "effect/Effect"

export const readMcpHttpResponse = (response: Response): Effect.Effect<unknown> =>
  Effect.promise(async () => {
    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
      return response.json()
    }
    const messages = (await response.text())
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6)))
    return messages.at(-1)
  })
