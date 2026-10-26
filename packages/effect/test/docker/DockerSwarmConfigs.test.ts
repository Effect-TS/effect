import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerApi, DockerSwarmConfigs } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup } from "effect/http-api"
import { fakeEngine } from "./utils/fake.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("configs").add(DockerApi.SwarmConfigs.endpoints.create, DockerApi.SwarmConfigs.endpoints.inspect)
    .middleware(DockerApi.SwarmErrors)
)

const configs = new Map<string, DockerApi.ConfigSpec>()

const Handlers = HttpApiBuilder.group(Served, "configs", (handlers) =>
  handlers
    .handle("create", ({ payload }) =>
      Effect.sync(() => {
        configs.set("c1", payload)
        return { ID: "c1" }
      }))
    .handle("inspect", ({ params }) => Effect.sync(() => ({ ID: params.id, Spec: configs.get(params.id)! }))))

describe("DockerSwarmConfigs", () => {
  it.effect("round-trips DockerApi: Data as bytes", () =>
    Effect.gen(function*() {
      const service = yield* DockerSwarmConfigs.DockerSwarmConfigs
      // padded standard base64 `+/8=`, base64url `-_8`
      const data = Uint8Array.of(0xfb, 0xff)
      const { ID } = yield* service.create({ Name: "conf", Data: data })
      assert.deepStrictEqual(configs.get(ID)!.Data, data)
      assert.deepStrictEqual((yield* service.inspect(ID)).Spec?.Data, data)
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
