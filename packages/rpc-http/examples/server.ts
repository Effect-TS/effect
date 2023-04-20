import * as Chunk from "@effect/data/Chunk"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as RpcHttp from "@effect/rpc-http"
import { UserId, schema } from "@effect/rpc-http/examples/schema"
import * as Server from "@effect/rpc/Server"
import * as Http from "node:http"
import type { Readable } from "node:stream"

// Implement the RPC server router
const router = Server.router(schema, {
  getUserIds: Effect.succeed(Chunk.map(Chunk.range(1, 100), UserId)),
  getUser: (id) => Effect.succeed({ id, name: `User ${id}` }),
})

// Create the HTTP handler, which takes the http request details and returns
// the responses to send back to the client.
const handler = RpcHttp.server.make(router)

const server = Http.createServer((req, res) => {
  const { method, url } = req

  if (method === "POST" && url === "/") {
    pipe(
      // First we need the JSON body parsed
      bodyToString(req),
      Effect.flatMap(parseJson),
      Effect.tap((body) =>
        Effect.log(`Got batch of ${(body as any).length} requests`),
      ),
      Effect.flatMap((body) =>
        // Pass it to the handler
        handler({
          url: req.url!,
          headers: new Headers(req.headers as any),
          body,
        }),
      ),
      Effect.tap((responses) =>
        // Send the responses back to the client
        Effect.sync(() => {
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
          })
          res.end(JSON.stringify(responses))
        }),
      ),
      Effect.tapErrorCause(() =>
        // Error handling
        Effect.sync(() => {
          res.writeHead(500)
          res.end()
        }),
      ),
      Effect.runCallback,
    )
  } else {
    res.statusCode = 404
    res.end()
  }
})

server.listen(3000, () => {
  console.log("Server listening on port 3000")
})

// Helpers
const bodyToString = (stream: Readable) =>
  Effect.async<never, Error, string>((resume) => {
    let data = ""
    stream.setEncoding("utf8")
    stream.on("data", (chunk) => {
      data += chunk
    })
    stream.once("end", () => {
      resume(Effect.succeed(data))
    })
    stream.once("error", (error) => {
      resume(Effect.fail(error))
    })
  })

const parseJson = (body: string) =>
  Effect.tryCatch(
    () => JSON.parse(body) as unknown,
    (error) => new Error(`Failed to parse JSON: ${error}`),
  )
