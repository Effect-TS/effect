import * as Effect from "@effect/io/Effect"
import * as Client from "@effect/rpc/Client"
import * as Resolver from "@effect/rpc/Resolver"
import * as RpcSchema from "@effect/rpc/Schema"
import * as Server from "@effect/rpc/Server"
import * as Schema from "@effect/schema/Schema"

export const schema = RpcSchema.make({
  getIds: {
    output: Schema.array(Schema.string),
  },
  getUser: {
    input: Schema.string,
    output: Schema.any,
  },
})

const router = Server.router(schema, {
  getIds: Effect.succeed(["1", "2", "3"]),
  getUser: (id) => Effect.succeed({ id, name: "Tim" }),
})

const client = Client.make(schema, Resolver.make(Server.handler(router)))

Effect.flatMap(client.getIds, (ids) => Effect.allPar(ids.map(client.getUser)))
