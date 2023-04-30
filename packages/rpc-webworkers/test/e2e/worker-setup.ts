import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as Router from "@effect/rpc-webworkers/Router"
import * as Server from "@effect/rpc-webworkers/Server"
import { Name, schemaWithSetup } from "./schema"

const router = Router.make(schemaWithSetup, {
  __setup: (port) =>
    Layer.scoped(
      Name,
      Effect.gen(function* (_) {
        yield* _(
          Effect.addFinalizer(() =>
            Effect.sync(() => port.postMessage("closed")),
          ),
        )
        return { name: "Tim" }
      }),
    ),

  getName: Effect.map(Name, (_) => _.name),
})

Effect.runPromise(Server.make(router))
