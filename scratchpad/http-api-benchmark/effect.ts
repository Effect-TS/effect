import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { createServer } from "node:http"
import {
  HOST,
  installServerMetrics,
  isDocumentId,
  isWritePayload,
  parseServerEnvironment,
  readDocument,
  writeDocument
} from "./shared.ts"

const { port, root } = parseServerEnvironment()
installServerMetrics()

const badRequest = (error: string) => HttpServerResponse.jsonUnsafe({ error }, { status: 400 })

const Routes = HttpRouter.use(Effect.fnUntraced(function*(router) {
  yield* router.add(
    "GET",
    "/documents/:id",
    (_request, { id }) => {
      if (!isDocumentId(id)) {
        return Effect.succeed(badRequest("invalid document id"))
      }
      return Effect.map(
        Effect.tryPromise(() => readDocument(root, id)).pipe(Effect.orDie),
        HttpServerResponse.jsonUnsafe
      )
    }
  )

  yield* router.add(
    "PUT",
    "/documents/:id",
    (request, { id }) => {
      if (!isDocumentId(id)) {
        return Effect.succeed(badRequest("invalid document id"))
      }
      return Effect.flatMap(Effect.catch(request.json, () => Effect.succeed(undefined)), (payload) => {
        if (!isWritePayload(payload)) {
          return Effect.succeed(
            badRequest(payload === undefined ? "invalid JSON payload" : "invalid document payload")
          )
        }
        return Effect.map(
          Effect.tryPromise(() => writeDocument(root, id, payload.content)).pipe(Effect.orDie),
          HttpServerResponse.jsonUnsafe
        )
      })
    }
  )
}))

HttpRouter.serve(Routes, {
  disableListenLog: true,
  disableLogger: true
}).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { host: HOST, port })),
  Layer.launch,
  Effect.withTracerEnabled(false),
  NodeRuntime.runMain
)
