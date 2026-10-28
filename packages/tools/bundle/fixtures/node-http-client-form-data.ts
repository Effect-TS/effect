import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient"
import * as Effect from "effect/Effect"
import * as HttpBody from "effect/http/HttpBody"
import * as HttpClient from "effect/http/HttpClient"

const formData = new FormData()
formData.append("file", new Blob(["file contents"], { type: "text/plain" }), "notes.txt")

HttpClient.post("http://localhost/upload", { body: HttpBody.formData(formData) }).pipe(
  Effect.provide(NodeHttpClient.layerNodeHttp),
  Effect.runPromise
)
