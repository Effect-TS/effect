import { HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

const ServerLive = NodeHttpServer.layer(() => createServer(), { port: 3000 })

const HttpLive = HttpServer.serve(HttpServerResponse.text("Hello World"))
  .pipe(Layer.provide(ServerLive))

NodeRuntime.runMain(Layer.launch(HttpLive))
