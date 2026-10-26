import { assert, describe, it } from "@effect/vitest"
import { Effect, Equal, Redacted, Result, Stream } from "effect"
import { type Docker, DockerContainers, type DockerError, DockerImages, DockerSystem } from "effect/docker"
import { Tar } from "effect/encoding"
import { inspect } from "node:util"
import { helpers, json, makeStubEngine, ndjson, recordSpans, withPing } from "./utils/stub.ts"

const Images = DockerImages.DockerImages

const context = Stream.make(Tar.file("Dockerfile", "FROM alpine\n")).pipe(
  Stream.pipeThroughChannel(Tar.encode()),
  Stream.orDie
)

/** The JSON of a padded base64url header, checking the alphabet the Engine needs. */
const decodeHeader = (value: string) => {
  // the Engine silently ignores standard base64 and goes anonymous
  assert.notMatch(value, /[+/]/)
  assert.strictEqual(value.length % 4, 0)
  return JSON.parse(Buffer.from(value, "base64url").toString())
}

describe("DockerImages", () => {
  it.effect("parses references as distribution/reference does, and rejects others before sending anything", () =>
    Effect.gen(function*() {
      const digest = `sha256:${"ab".repeat(32)}`
      const cases: ReadonlyArray<readonly [string, string]> = [
        ["alpine", "docker.io/library/alpine"],
        ["user/app", "docker.io/user/app"],
        ["index.docker.io/user/app:1", "docker.io/user/app:1"],
        ["localhost:5000/app:2", "localhost:5000/app:2"],
        ["[::1]:5000/app", "[::1]:5000/app"],
        [`host:1/a/b:t@${digest}`, `host:1/a/b:t@${digest}`]
      ]
      for (const [input, expected] of cases) {
        const parsed = DockerImages.parseReference(input)
        assert(Result.isSuccess(parsed), input)
        assert.strictEqual(DockerImages.formatReference(parsed.success), expected, input)
        // the full form parses to an equal reference
        assert.isTrue(Equal.equals(parsed.success, Result.getOrThrow(DockerImages.parseReference(expected))), input)
      }
      for (const input of ["", "Alpine", "app:-tag", "app@sha256:abc", "a//b"]) {
        const parsed = DockerImages.parseReference(input)
        assert(Result.isFailure(parsed), input)
        assert(parsed.failure.reason._tag === "InvalidReference", input)
        assert.strictEqual(parsed.failure.reason.reference, input)
      }
      const stub = makeStubEngine(withPing("1.44"))
      const errors = yield* Images.use((images) =>
        Effect.all([
          Effect.flip(Stream.runDrain(images.pull("Alpine"))),
          Effect.flip(images.push("app:")),
          Effect.flip(images.tag("alpine", "a//b"))
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(errors.map((error) => error.reason._tag), [
        "InvalidReference",
        "InvalidReference",
        "InvalidReference"
      ])
      assert.strictEqual(stub.requests.length, 0)
    }))

  it.effect("always sends X-Registry-Auth, as padded base64url JSON: the resolved credential, the call's, or {}", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(
        withPing("1.44", (request) =>
          request.url.pathname.endsWith("/push")
            ? ndjson({ aux: { Tag: "1", Digest: "sha256:d", Size: 1 } })
            : request.url.pathname.startsWith("/v1.44/distribution")
            ? json({ Descriptor: {}, Platforms: [] })
            : request.url.pathname.endsWith("/images/search")
            ? json([])
            : ndjson({ status: "Downloaded" })),
        {
          config: {
            auths: {
              "docker.io": { username: "hub", password: Redacted.make("x") },
              // its standard base64 has `+` and `/`, which base64url replaces
              "https://ghcr.io": { username: "gh", password: Redacted.make("p?>~ü") }
            }
          }
        }
      )
      yield* Images.use((images) =>
        Effect.all([
          Stream.runDrain(images.pull("ghcr.io/org/app:1")),
          images.push("localhost:5000/app:1"),
          images.distribution("alpine"),
          Stream.runDrain(images.pull("localhost:5000/app:1", { auth: { identityToken: Redacted.make("token") } })),
          images.search("ghcr.io/org/app"),
          images.search("org/app", { limit: 1 })
        ])
      ).pipe(stub.provide)
      const [pull, push, distribution, own, searchGhcr, searchHub] = stub.requests.slice(1).map((request) =>
        decodeHeader(request.headers["x-registry-auth"])
      )
      assert.deepStrictEqual(pull, { username: "gh", password: "p?>~ü", serveraddress: "ghcr.io" })
      assert.deepStrictEqual(searchGhcr, pull)
      assert.deepStrictEqual(searchHub, {
        username: "hub",
        password: "x",
        serveraddress: "https://index.docker.io/v1/"
      })
      assert.deepStrictEqual(push, {})
      assert.deepStrictEqual(distribution, {
        username: "hub",
        password: "x",
        serveraddress: "https://index.docker.io/v1/"
      })
      assert.deepStrictEqual(own, { identitytoken: "token", serveraddress: "localhost:5000" })
    }))

  it.effect("streams pull progress and fails on an in-band error", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () =>
        ndjson(
          { status: "Pulling from library/app", id: "1" },
          { status: "Downloading", progressDetail: { current: 1, total: 2 }, id: "abc" },
          { errorDetail: { message: "manifest unknown" }, error: "manifest unknown" }
        )))
      const seen: Array<string> = []
      const error = yield* Stream.unwrap(Images.useSync((images) => images.pull("ghcr.io/org/app:1"))).pipe(
        Stream.runForEach((message) => Effect.sync(() => seen.push(message.status ?? ""))),
        stub.provide,
        Effect.flip
      )
      assert.deepStrictEqual(seen, ["Pulling from library/app", "Downloading"])
      assert(error.reason._tag === "StreamFailed")
      assert.strictEqual(error.reason.message, "manifest unknown")
    }))

  it.effect("sends the build context as given, or its URL, with the options under the Engine's names", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => ndjson({ aux: { ID: "sha256:built" } })), {
        config: { proxy: { httpProxy: "http://proxy:3128" }, platform: "linux/arm64", builder: "classic" }
      })
      const bytes = new Uint8Array([0x1f, 0x8b, 1, 2, 3])
      yield* Images.use((images) =>
        Effect.all([
          images.build(Stream.make(bytes), {
            dockerfile: "sub/Dockerfile",
            tags: ["a:1", "b:2"],
            labels: { app: "demo" },
            cacheFrom: ["a:0"],
            noCache: true
          }),
          images.build(context, { buildArgs: { HTTP_PROXY: "mine" }, builder: "buildkit", platform: "linux/amd64" }),
          images.build("https://github.com/org/repo.git#main:app", { dockerfile: "Dockerfile.dev" })
        ])
      ).pipe(stub.provide)
      const [first, second, remote] = stub.requests.filter((request) => request.url.pathname.endsWith("/build"))
      assert.deepStrictEqual(first.bytes, bytes)
      assert.strictEqual(first.headers["content-type"], "application/x-tar")
      assert.deepStrictEqual(Array.from(first.url.searchParams), [
        ["dockerfile", "sub/Dockerfile"],
        ["t", "a:1"],
        ["t", "b:2"],
        ["version", "1"],
        ["forcerm", "true"],
        ["platform", "linux/arm64"],
        ["buildargs", JSON.stringify({ HTTP_PROXY: "http://proxy:3128", http_proxy: "http://proxy:3128" })],
        ["labels", JSON.stringify({ app: "demo" })],
        ["cachefrom", JSON.stringify(["a:0"])],
        ["nocache", "true"]
      ])
      assert.deepStrictEqual(
        {
          version: second.url.searchParams.get("version"),
          platform: second.url.searchParams.get("platform"),
          buildargs: JSON.parse(second.url.searchParams.get("buildargs")!)
        },
        {
          version: "2",
          platform: "linux/amd64",
          buildargs: { HTTP_PROXY: "mine", http_proxy: "http://proxy:3128" }
        }
      )
      // a URL is fetched by the Engine: nothing is uploaded
      assert.isUndefined(remote.bytes)
      assert.deepStrictEqual(
        { remote: remote.url.searchParams.get("remote"), dockerfile: remote.url.searchParams.get("dockerfile") },
        { remote: "https://github.com/org/repo.git#main:app", dockerfile: "Dockerfile.dev" }
      )
    }))

  it.effect("sends only the credentials a build asks for in X-Registry-Config", () =>
    Effect.gen(function*() {
      const spawner = helpers({
        test: () => ({ stdout: JSON.stringify({ ServerURL: "ghcr.io", Username: "helper", Secret: "s" }) })
      })
      const stub = makeStubEngine(withPing("1.44", () => ndjson({ aux: { ID: "sha256:built" } })), {
        spawner,
        config: { auths: { "docker.io": { username: "hub", password: Redacted.make("x") } }, credsStore: "test" }
      })
      yield* Images.use((images) =>
        Effect.all([
          images.build(context),
          images.build(context, {
            auth: { "docker.io": { username: "given", password: Redacted.make("g") } },
            // the same registry spelled another way: the given credential wins
            registries: ["ghcr.io", "index.docker.io"]
          })
        ])
      ).pipe(stub.provide)
      const [none, asked] = stub.requests.filter((request) => request.url.pathname.endsWith("/build"))
      assert.isUndefined(none.headers["x-registry-config"])
      assert.deepStrictEqual(decodeHeader(asked.headers["x-registry-config"]), {
        "https://index.docker.io/v1/": {
          username: "given",
          password: "g",
          serveraddress: "https://index.docker.io/v1/"
        },
        "ghcr.io": { username: "helper", password: "s", serveraddress: "ghcr.io" }
      })
      // only the registries asked for ran their helper
      assert.deepStrictEqual(spawner.runs, [
        "docker-credential-test get: ghcr.io",
        "docker-credential-test get: https://index.docker.io/v1/"
      ])
    }))

  it.effect("keeps secrets out of spans and errors", () =>
    Effect.gen(function*() {
      const secret = "secret-value"
      const { attributes, tracer } = recordSpans()
      const failing = makeStubEngine(withPing("1.44", () => ({ fail: true })))
      const operations: ReadonlyArray<Effect.Effect<unknown, DockerError.DockerError, Docker.Docker>> = [
        Images.use((images) =>
          Stream.runDrain(
            images.pull("ghcr.io/org/app:1", { auth: { username: "u", password: Redacted.make(secret) } })
          )
        ),
        Images.use((images) =>
          Stream.runDrain(images.import(`https://example.com/rootfs.tar?X-Amz-Signature=${secret}`))
        ),
        Images.use((images) => images.commit("c", { changes: [`ENV TOKEN=${secret}`] })),
        Images.use((images) => images.build(context, { buildArgs: { NPM_TOKEN: secret } })),
        Images.use((images) => images.build(`https://oauth2:${secret}@gitlab.com/org/repo.git`)),
        DockerSystem.DockerSystem.use((system) => system.auth({ username: "u", password: Redacted.make(secret) })),
        DockerContainers.DockerContainers.use((containers) =>
          containers.create({ Image: "alpine", Env: [`TOKEN=${secret}`] })
        )
      ]
      const errors = yield* Effect.forEach(
        operations,
        (effect) => effect.pipe(failing.provide, Effect.withTracer(tracer), Effect.flip)
      )
      for (const error of errors) {
        assert.strictEqual(error.reason._tag, "ConnectionFailed")
        for (const text of [JSON.stringify(error), inspect(error, { depth: 20 }), String(error)]) {
          assert.notInclude(text, secret)
        }
      }
      assert.notInclude(attributes().join("\n"), secret)
    }))
})
