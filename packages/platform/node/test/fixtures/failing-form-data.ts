import * as Http from "node:http"
import type { AddressInfo, Socket } from "node:net"

// Run outside Vitest: the native encoder can reject a detached promise while
// leaving consumption pending. Capture that rejection without hiding it.
const unhandled: Array<string> = []
process.on("unhandledRejection", (error) => unhandled.push(String(error)))
const streams: Array<ReadableStream<Uint8Array>> = []
class BrokenFile extends File {
  override stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
      start(controller) {
        controller.error(new Error("file read failed"))
      }
    })
    streams.push(stream)
    return stream
  }
}
const data = new FormData()
data.append("file", new BrokenFile(["contents"], "broken.txt"))
const mode = process.argv[2]
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

if (mode === "native") {
  const outcome = await Promise.race([
    new Response(data).arrayBuffer().then(() => "resolved", () => "rejected"),
    delay(1000).then(() => "timeout")
  ])
  await delay(0)
  console.log(JSON.stringify({ node: process.version, undici: process.versions.undici, outcome, unhandled }))
} else {
  const NodeClient = await import("@effect/platform-node/NodeHttpClient")
  const Effect = await import("effect/Effect")
  const HttpBody = await import("effect/http/HttpBody")
  const HttpClient = await import("effect/http/HttpClient")
  const sockets = new Set<Socket>()
  const server = Http.createServer((request) => {
    // Consume without responding so a successful response cannot mask failure.
    request.on("error", () => {})
    request.resume()
  })
  server.on("connection", (socket) => {
    sockets.add(socket)
    socket.on("close", () => sockets.delete(socket))
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  try {
    const address = server.address() as AddressInfo
    const result = await Effect.runPromise(
      Effect.gen(function*() {
        const outcome = yield* HttpClient.post(
          `http://127.0.0.1:${address.port}/`,
          { body: HttpBody.formData(data) }
        ).pipe(
          Effect.timeout("1 second"),
          Effect.match({
            onFailure: (error) => ({
              tag: error._tag,
              reason: error._tag === "HttpClientError" ? error.reason._tag : undefined
            }),
            onSuccess: () => ({ tag: "Success", reason: undefined })
          })
        )
        // Observe request cleanup BEFORE closing the client layer/agent, which
        // could otherwise hide a leaked request. Allow close events to arrive.
        yield* Effect.promise(async () => {
          for (let i = 0; i < 20 && sockets.size > 0; i++) await delay(10)
          await delay(0)
        })
        return {
          outcome,
          unhandled,
          streamsRead: streams.length,
          lockedStreams: streams.filter((stream) => stream.locked).length,
          openSockets: sockets.size
        }
      }).pipe(
        Effect.provide(mode === "node:http" ? NodeClient.layerNodeHttp : NodeClient.layerUndici),
        Effect.scoped
      )
    )
    console.log(JSON.stringify(result))
  } finally {
    // Emergency cleanup is deliberately after observation, not part of success.
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
