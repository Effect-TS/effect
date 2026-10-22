import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerSwarmConfigs } from "effect/docker"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

const Configs = DockerSwarmConfigs.DockerSwarmConfigs

// padded standard base64 `+/8=`, base64url `-_8`
const bytes = Uint8Array.of(0xfb, 0xff)

describe("DockerSwarmConfigs", () => {
  it.effect("sends and reads Data as padded standard base64", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/create")
          ? json({ ID: "c1" }, 201)
          : request.url.pathname.endsWith("/configs")
          ? json([{ ID: "c1", Spec: { Name: "conf", Data: "+/8=" } }])
          : request.method === "GET"
          ? json({ ID: "c1", Version: { Index: 2 }, Spec: { Name: "conf", Data: "+/8=" } })
          : request.method === "DELETE"
          ? { status: 204 }
          : {}))
      const [created, list, config] = yield* Configs.use((configs) =>
        Effect.all([
          configs.create({ Name: "conf", Data: bytes }),
          configs.list({ filters: { name: "conf" } }),
          configs.inspect("conf"),
          configs.update("conf", { Name: "conf", Data: bytes, Labels: { rev: "2" } }, { version: 2 }),
          configs.remove("conf")
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(created, { ID: "c1" })
      assert.deepStrictEqual(list[0].Spec?.Data, bytes)
      assert.deepStrictEqual(config.Spec?.Data, bytes)
      const requests = stub.requests.slice(1)
      assert.deepStrictEqual(JSON.parse(requests[0].body!), { Name: "conf", Data: "+/8=" })
      assert.deepStrictEqual(JSON.parse(requests[3].body!), { Name: "conf", Data: "+/8=", Labels: { rev: "2" } })
      assert.strictEqual(
        `${requests[3].method} ${requests[3].url.pathname}${requests[3].url.search}`,
        "POST /v1.44/configs/conf/update?version=2"
      )
    }))
})
