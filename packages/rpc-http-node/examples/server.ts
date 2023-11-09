import * as Router from "@effect/rpc-http-node/Router"
import * as Server from "@effect/rpc-http-node/Server"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Http from "node:http"
import { schema, UserId } from "./schema.js"

// Implement the RPC server router
const router = Router.make(schema, {
  getUserIds: Effect.succeed(Chunk.map(Chunk.range(1, 100), UserId)),
  getUser: (id) => Effect.succeed({ id, name: `User ${id}` })
})

// Create the HTTP handler, which takes the http request details and returns
// the responses to send back to the client.
const handler = Server.make(router)

// Use the handler in a Node.js HTTP server
const server = Http.createServer((req, res) => Effect.runFork(handler(req, res)))

server.listen(3000, () => console.log("Server listening on port 3000"))
