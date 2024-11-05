/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Mailbox from "effect/Mailbox"
import * as Stream from "effect/Stream"
import * as Ndjson from "../Ndjson.js"
import * as SocketServer from "../SocketServer/Node.js"
import * as Domain from "./Domain.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface ServerImpl {
  readonly run: <R, E, _>(
    handle: (client: Client) => Effect.Effect<_, E, R>
  ) => Effect.Effect<never, SocketServer.SocketServerError | E, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Client {
  readonly queue: Mailbox.ReadonlyMailbox<Domain.Request.WithoutPing>
  readonly request: (_: Domain.Response.WithoutPong) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category tags
 */
export interface Server {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Server = Context.GenericTag<Server, ServerImpl>("@effect/experimental/DevTools/Server")

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = Effect.gen(function*() {
  const server = yield* SocketServer.SocketServer

  const run = <R, E, _>(handle: (client: Client) => Effect.Effect<_, E, R>) =>
    server.run((socket) =>
      Effect.gen(function*() {
        const responses = yield* Mailbox.make<Domain.Response>()
        const requests = yield* Mailbox.make<Domain.Request.WithoutPing>()

        const client: Client = {
          queue: requests,
          request: (res) => responses.offer(res)
        }

        yield* Mailbox.toStream(responses).pipe(
          Stream.pipeThroughChannel(
            Ndjson.duplexSchemaString(Socket.toChannelString(socket), {
              inputSchema: Domain.Response,
              outputSchema: Domain.Request
            })
          ),
          Stream.runForEach((req) =>
            req._tag === "Ping"
              ? responses.offer({ _tag: "Pong" })
              : requests.offer(req)
          ),
          Effect.ensuring(Effect.zipRight(responses.shutdown, requests.shutdown)),
          Effect.fork
        )

        yield* handle(client)
      })
    )

  return Server.of({ run })
})
