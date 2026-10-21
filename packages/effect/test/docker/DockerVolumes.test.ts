import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerError, DockerVolumes } from "effect/docker"
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

  it.effect("fails with the Engine's reason, or InvalidResponse for a body or status the endpoint doesn't declare", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.50", (request) =>
        request.url.pathname.endsWith("/missing")
          ? json({ message: "no such volume" }, 404)
          : request.url.pathname.endsWith("/broken")
          ? json({ Name: 5 })
          : json({}, 202)))
      const fail = (name: string) =>
        DockerVolumes.DockerVolumes.use((volumes) => volumes.inspect(name)).pipe(stub.provide, Effect.flip)
      assert.deepStrictEqual(
        (yield* fail("missing")).reason,
        new DockerError.NotFound({
          status: 404,
          message: "no such volume",
          operation: "docker.Volumes.inspect"
        })
      )
      const broken = yield* fail("broken")
      assert(broken.reason._tag === "InvalidResponse")
      assert.strictEqual(broken.reason.operation, "docker.Volumes.inspect")
      const unexpected = yield* fail("other")
      assert(unexpected.reason._tag === "InvalidResponse")
      assert.include(unexpected.message, "unexpected status 202")
    }))

  it.effect("reads an error body that isn't the Engine's JSON as text, and classifies any status", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.50", (request) =>
        request.url.pathname.endsWith("/proxied")
          ? { status: 403, headers: { "content-type": "text/html" }, body: "<h1>Forbidden</h1>\n" }
          : json({ message: "bad gateway" }, 502)))
      const reason = (name: string) =>
        DockerVolumes.DockerVolumes.use((volumes) => volumes.inspect(name)).pipe(
          stub.provide,
          Effect.flip,
          Effect.map((error) => error.reason)
        )
      assert.deepStrictEqual(
        yield* reason("proxied"),
        new DockerError.Forbidden({ status: 403, message: "<h1>Forbidden</h1>", operation: "docker.Volumes.inspect" })
      )
      // a status `DockerApi` doesn't declare
      assert.deepStrictEqual(
        yield* reason("other"),
        new DockerError.UnexpectedStatus({ status: 502, message: "bad gateway", operation: "docker.Volumes.inspect" })
      )
    }))
})
