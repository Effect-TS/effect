import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { DockerError, DockerServices } from "effect/docker"
import { concat, frame, json, makeStubEngine, withPing } from "./utils/stub.ts"

const Services = DockerServices.DockerServices

const digest = `sha256:${"ab".repeat(32)}`

/** The JSON of a padded base64url header. */
const decodeHeader = (value: string) => JSON.parse(Buffer.from(value, "base64url").toString())

const describeRequest = (request: { readonly method: string; readonly url: URL }) =>
  `${request.method} ${request.url.pathname}${decodeURIComponent(request.url.search)}`

describe("DockerServices", () => {
  it.effect("sends each request as the Engine reads it, and reads a null Warnings as none", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/create")
          ? json({ ID: "s1", Warnings: null }, 201)
          : request.url.pathname.endsWith("/update")
          ? json({ Warnings: null })
          : request.method === "GET" && request.url.pathname.endsWith("/services")
          ? json([])
          : request.method === "GET"
          ? json({ ID: "s1", Version: { Index: 9 }, Spec: { Name: "web", Labels: { rev: "2" } } })
          : {}))
      const spec = {
        Name: "web",
        TaskTemplate: { ContainerSpec: { Image: "alpine", Env: [Redacted.make("TOKEN=t")] } }
      }
      const [, , created, updated] = yield* Services.use((services) =>
        Effect.all([
          services.list({ filters: { mode: "replicated" }, status: true }),
          services.inspect("web", { insertDefaults: true }),
          services.create(spec),
          services.update("web", spec, { version: 9, registryAuthFrom: "previous-spec" }),
          services.rollback("web"),
          services.remove("web")
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(created, { ID: "s1", Warnings: [] })
      assert.deepStrictEqual(updated, { Warnings: [] })
      const requests = stub.requests.slice(1)
      assert.deepStrictEqual(requests.map(describeRequest), [
        `GET /v1.44/services?filters={"mode":["replicated"]}&status=true`,
        "GET /v1.44/services/web?insertDefaults=true",
        "POST /v1.44/services/create",
        "POST /v1.44/services/web/update?version=9&registryAuthFrom=previous-spec",
        "GET /v1.44/services/web",
        "POST /v1.44/services/web/update?version=9&rollback=previous",
        "DELETE /v1.44/services/web"
      ])
      // the spec as given, Env unwrapped: no tag, no credential
      assert.deepStrictEqual(JSON.parse(requests[2].body!), {
        Name: "web",
        TaskTemplate: { ContainerSpec: { Image: "alpine", Env: ["TOKEN=t"] } }
      })
      assert.isUndefined(requests[2].headers["x-registry-auth"])
      // a rollback sends the current spec, which the Engine checks
      assert.deepStrictEqual(JSON.parse(requests[5].body!), { Name: "web", Labels: { rev: "2" } })
    }))

  it.effect("sends a credential for the image's Registry only when asked, and checks the image first", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ ID: "s1" }, 201)), {
        config: { auths: { "ghcr.io": { username: "gh", password: Redacted.make("p") } } }
      })
      const spec = (Image: string) => ({ TaskTemplate: { ContainerSpec: { Image } } })
      const invalid = yield* Services.use((services) =>
        Effect.gen(function*() {
          yield* services.create(spec("ghcr.io/org/app:1"))
          yield* services.create(spec("ghcr.io/org/app:1"), { registryAuth: true })
          yield* services.create(spec("ghcr.io/org/app:1"), { auth: { identityToken: Redacted.make("t") } })
          return yield* Effect.flip(services.create(spec("Not A Reference"), { registryAuth: true }))
        })
      ).pipe(stub.provide)
      const [none, resolved, given] = stub.requests.slice(1).map((request) => request.headers["x-registry-auth"])
      assert.isUndefined(none)
      assert.deepStrictEqual(decodeHeader(resolved), { username: "gh", password: "p", serveraddress: "ghcr.io" })
      assert.deepStrictEqual(decodeHeader(given), { identitytoken: "t", serveraddress: "ghcr.io" })
      assert.strictEqual(invalid.reason._tag, "InvalidReference")
      assert.strictEqual(stub.requests.length, 4)
    }))

  it.effect("resolveImage pins the tag, digest and platforms, and warns when the Registry can't be asked", () =>
    Effect.gen(function*() {
      let registryUp = true
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.includes("/distribution/")
          ? registryUp
            ? json({
              Descriptor: { mediaType: "application/vnd.oci.image.index.v1+json", digest, size: 1 },
              Platforms: [
                { os: "linux", architecture: "amd64" },
                { os: "linux", architecture: "arm", variant: "v7" },
                { os: "linux", architecture: "arm", variant: "v6" },
                { os: "unknown", architecture: "unknown" }
              ]
            })
            : json({ message: "manifest unknown" }, 404)
          : json({ ID: "s1", Warnings: ["from the Engine"] }, 201)))
      const spec = {
        TaskTemplate: { ContainerSpec: { Image: "alpine" }, Placement: { Constraints: ["node.role==worker"] } }
      }
      const [pinned, unpinned] = yield* Services.use((services) =>
        Effect.all([
          services.create(spec, { resolveImage: true }),
          Effect.suspend(() => {
            registryUp = false
            return services.create(spec, { resolveImage: true })
          })
        ])
      ).pipe(stub.provide)
      const creates = stub.requests.filter((request) => request.url.pathname.endsWith("/create"))
      assert.deepStrictEqual(JSON.parse(creates[0].body!).TaskTemplate, {
        ContainerSpec: { Image: `docker.io/library/alpine:latest@${digest}` },
        Placement: {
          Constraints: ["node.role==worker"],
          // `arm` images run on `armv7l` nodes only without an architecture
          Platforms: [{ Architecture: "amd64", OS: "linux" }, { Architecture: "", OS: "linux" }]
        }
      })
      assert.deepStrictEqual(pinned.Warnings, ["from the Engine"])
      assert.deepStrictEqual(JSON.parse(creates[1].body!).TaskTemplate, {
        ContainerSpec: { Image: "docker.io/library/alpine:latest" },
        Placement: { Constraints: ["node.role==worker"] }
      })
      assert.strictEqual(unpinned.Warnings?.length, 2)
      assert.include(unpinned.Warnings?.[0], "could not be resolved on its Registry")
      assert.include(unpinned.Warnings?.[0], "manifest unknown")
    }))

  it.effect("fails spec fields newer than the negotiated version with OptionNotSupported", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.45", () => json({ ID: "s1" }, 201)))
      const error = yield* Effect.flip(
        Services.use((services) =>
          services.create({ TaskTemplate: { ContainerSpec: { Image: "alpine", OomScoreAdj: 100 } } })
        )
      ).pipe(stub.provide)
      assert.deepStrictEqual(
        error.reason,
        new DockerError.OptionNotSupported({
          option: "TaskTemplate.ContainerSpec.OomScoreAdj",
          requiredVersion: "1.46",
          negotiatedVersion: "1.45"
        })
      )
    }))

  it.effect("frames logs by their Content-Type", () =>
    Effect.gen(function*() {
      const multiplexed = concat(frame(1, "task=t1 out\n"), frame(2, "task=t1 err\n"))
      let reply: { headers: Record<string, string>; body: Uint8Array | string } = {
        headers: { "content-type": "application/vnd.docker.multiplexed-stream" },
        body: multiplexed
      }
      const stub = makeStubEngine(withPing("1.44", () => reply))
      const logs = (options?: DockerServices.LogsOptions) =>
        Stream.unwrap(Services.useSync((services) => services.logs("web", options))).pipe(
          Stream.map((frame) => `${frame.stream}: ${new TextDecoder().decode(frame.data)}`),
          Stream.runCollect,
          stub.provide
        )
      assert.deepStrictEqual(yield* logs({ details: true, tail: 2 }), [
        "stdout: task=t1 out\n",
        "stderr: task=t1 err\n"
      ])
      assert.strictEqual(
        describeRequest(stub.requests.at(-1)!),
        "GET /v1.44/services/web/logs?details=true&stdout=true&stderr=true&tail=2"
      )
      reply = { headers: { "content-type": "application/vnd.docker.raw-stream" }, body: "tty\r\n" }
      assert.deepStrictEqual(yield* logs({ stderr: true }), ["stdout: tty\r\n"])
      assert.include(describeRequest(stub.requests.at(-1)!), "stdout=false&stderr=true")
      reply = { headers: {}, body: "?" }
      const error = yield* Effect.flip(logs())
      assert.strictEqual(error.reason._tag, "InvalidResponse")
    }))

  it("parseLogLine reads the timestamp, the unescaped attributes and the message", () => {
    const table: Array<[string, boolean, DockerServices.LogLine]> = [
      ["a=1,b=2 hello world", false, { timestamp: undefined, details: { a: "1", b: "2" }, message: "hello world" }],
      [
        "FOO=bar+baz,alpha=a+b%2Cc%3Dd,zeta=1 hi",
        false,
        { timestamp: undefined, details: { FOO: "bar baz", alpha: "a b,c=d", zeta: "1" }, message: "hi" }
      ],
      [
        "2026-10-22T09:38:19.855171168Z a=1 hi",
        true,
        { timestamp: "2026-10-22T09:38:19.855171168Z", details: { a: "1" }, message: "hi" }
      ],
      // no attributes: the line starts with a space
      [" ttyline", false, { timestamp: undefined, details: {}, message: "ttyline" }],
      ["bad=%zz only", false, { timestamp: undefined, details: { bad: "%zz" }, message: "only" }]
    ]
    for (const [line, timestamps, expected] of table) {
      assert.deepStrictEqual(DockerServices.parseLogLine(line, { timestamps }), expected)
    }
  })
})
