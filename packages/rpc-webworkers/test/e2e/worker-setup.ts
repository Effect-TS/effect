import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Router from "@effect/rpc-webworkers/Router"
import * as Server from "@effect/rpc-webworkers/Server"
import { Name, schemaWithSetup } from "./schema"

const router = Router.make(schemaWithSetup, {
  __setup: (name) => Effect.succeed(Layer.succeed(Name, { name })),
  getName: Effect.map(Name, (_) => _.name),
})

Effect.runPromise(Server.make(router))
