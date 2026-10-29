import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
import * as Effect from "effect/Effect"
import * as HttpClient from "effect/http/HttpClient"

Effect.gen(function*() {
  const client = yield* HttpClient.HttpClient
  const res = yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
  yield* res.json
}).pipe(
  Effect.provide(NodeHttpClient.layerNodeHttp),
  Effect.runPromise
)
