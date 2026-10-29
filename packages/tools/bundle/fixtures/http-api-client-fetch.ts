import * as Effect from "effect/Effect"
import * as HttpApi from "effect/http-api/HttpApi"
import * as HttpApiClient from "effect/http-api/HttpApiClient"
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"
import * as HttpApiGroup from "effect/http-api/HttpApiGroup"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Schema from "effect/Schema"

const Api = HttpApi.make("bundle").add(
  HttpApiGroup.make("users").add(
    HttpApiEndpoint.get("get", "/users/:id", {
      params: { id: Schema.String },
      success: Schema.Struct({ id: Schema.String, name: Schema.String })
    })
  )
)

Effect.gen(function*() {
  const client = yield* HttpApiClient.make(Api, { baseUrl: "http://localhost:3000" })
  yield* client.users.get({ params: { id: "1" } })
}).pipe(
  Effect.provide(FetchHttpClient.layer),
  Effect.runPromise
)
