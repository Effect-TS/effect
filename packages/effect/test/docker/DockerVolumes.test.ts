import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerVolumes } from "effect/docker"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

describe("DockerVolumes", () => {
  it.effect("encodes each request and decodes each response, Go's null and the Engine's statuses included", () =>
    Effect.gen(function*() {
      const volume = { Name: "v", Driver: "local", Mountpoint: "/m", Scope: "local", Labels: null, Options: null }
      const stub = makeStubEngine(withPing("1.50", (request) => {
        const path = request.url.pathname
        if (path.endsWith("/volumes/create")) return json(volume, 201)
        if (path.endsWith("/volumes/prune")) return json({ VolumesDeleted: null, SpaceReclaimed: 0 })
        if (path.endsWith("/volumes")) return json({ Volumes: null, Warnings: null })
        if (request.method === "PUT") return { status: 200 }
        if (request.method === "DELETE") return { status: 204 }
        return json(volume)
      }))
      const [list, created, inspected, , , pruned] = yield* DockerVolumes.DockerVolumes.use((volumes) =>
        Effect.all([
          volumes.list({ filters: { dangling: "true", label: ["a", "b"] } }),
          volumes.create({ Name: "v" }),
          volumes.inspect("v"),
          volumes.update("v", { Spec: {} }, { version: 3 }),
          volumes.remove("v", { force: true }),
          volumes.prune()
        ])
      ).pipe(stub.provide)
      // Go's null: an absent optional slice, an empty map
      assert.deepStrictEqual(list, {})
      assert.deepStrictEqual(created, { ...volume, Labels: {}, Options: {} })
      assert.deepStrictEqual(inspected, created)
      assert.deepStrictEqual(pruned, { SpaceReclaimed: 0 })
      assert.deepStrictEqual(
        stub.requests.slice(1).map((request) => `${request.method} ${request.url.pathname}${request.url.search}`),
        [
          `GET /v1.50/volumes?filters=${encodeURIComponent(JSON.stringify({ dangling: ["true"], label: ["a", "b"] }))}`,
          "POST /v1.50/volumes/create",
          "GET /v1.50/volumes/v",
          "PUT /v1.50/volumes/v?version=3",
          "DELETE /v1.50/volumes/v?force=true",
          "POST /v1.50/volumes/prune"
        ]
      )
      assert.strictEqual(stub.requests[2].body, JSON.stringify({ Name: "v" }))
    }))
})
