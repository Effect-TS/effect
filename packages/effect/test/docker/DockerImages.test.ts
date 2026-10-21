import { assert, describe, it } from "@effect/vitest"
import { Effect, Equal, Redacted, Result, Schema, Stream } from "effect"
import { type Docker, DockerContainers, DockerError, DockerImages, DockerSystem } from "effect/docker"
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
  describe("ImageReference", () => {
    const digest = `sha256:${"ab".repeat(32)}`

    it("parses and normalizes references as distribution/reference does", () => {
      const cases: ReadonlyArray<readonly [string, string]> = [
        ["alpine", "docker.io/library/alpine"],
        ["alpine:3.22", "docker.io/library/alpine:3.22"],
        ["user/app", "docker.io/user/app"],
        ["index.docker.io/user/app:1", "docker.io/user/app:1"],
        ["ghcr.io/org/app:1", "ghcr.io/org/app:1"],
        ["localhost/app", "localhost/app"],
        ["localhost:5000/app:2", "localhost:5000/app:2"],
        ["Registry/app", "Registry/app"],
        ["[::1]:5000/app", "[::1]:5000/app"],
        ["a-b/c__d.e/f---g", "docker.io/a-b/c__d.e/f---g"],
        [`app@${digest}`, `docker.io/library/app@${digest}`],
        [`host:1/a/b:t@${digest}`, `host:1/a/b:t@${digest}`]
      ]
      for (const [input, expected] of cases) {
        const parsed = DockerImages.parseReference(input)
        assert(Result.isSuccess(parsed), input)
        assert.strictEqual(DockerImages.formatReference(parsed.success), expected, input)
        // the full form parses to an equal reference
        assert.isTrue(Equal.equals(parsed.success, Result.getOrThrow(DockerImages.parseReference(expected))), input)
      }
    })

    it("rejects what isn't a reference", () => {
      const cases: ReadonlyArray<string> = [
        "",
        "Alpine",
        "user/App",
        "app:",
        "app:-tag",
        `app:${"t".repeat(129)}`,
        "app@sha256:abc",
        "a//b",
        "a_-b",
        "-app",
        "ab".repeat(32),
        `example.com/${"a".repeat(244)}`
      ]
      for (const input of cases) {
        const parsed = DockerImages.parseReference(input)
        assert(Result.isFailure(parsed), input)
        assert(parsed.failure.reason._tag === "InvalidReference", input)
        assert.strictEqual(parsed.failure.reason.reference, input)
      }
    })

    it("decodes from a string with ImageReferenceFromString, and encodes in full", () => {
      const reference = Schema.decodeSync(DockerImages.ImageReferenceFromString)("alpine:3.22")
      assert.deepStrictEqual(
        reference,
        new DockerImages.ImageReference({ registry: "docker.io", repository: "library/alpine", tag: "3.22" })
      )
      assert.strictEqual(
        Schema.encodeSync(DockerImages.ImageReferenceFromString)(reference),
        "docker.io/library/alpine:3.22"
      )
      assert.throws(() => new DockerImages.ImageReference({ registry: "docker.io", repository: "Upper" }))
    })
  })

  it.effect("fails registry operations on an invalid reference before sending anything", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44"))
      const errors = yield* Images.use((images) =>
        Effect.all([
          Effect.flip(Stream.runDrain(images.pull("Alpine"))),
          Effect.flip(images.push("app:")),
          Effect.flip(images.tag("alpine", "a//b")),
          Effect.flip(images.distribution("-app"))
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(errors.map((error) => error.reason._tag), [
        "InvalidReference",
        "InvalidReference",
        "InvalidReference",
        "InvalidReference"
      ])
      assert.strictEqual(stub.requests.length, 0)
    }))

  it.effect("sends each option under the Engine's name", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(
        withPing("1.52", (request) =>
          request.url.pathname.endsWith("/tag")
            ? { status: 201 }
            : request.url.pathname.endsWith("/create")
            ? ndjson({ status: "Downloaded" })
            : json([])),
        { config: { platform: "linux/arm64" } }
      )
      yield* Images.use((images) =>
        Effect.all([
          images.list({ sharedSize: true }),
          images.tag("alpine", "localhost:5000/team/app:1"),
          images.remove("alpine", { noPrune: true, platforms: [{ os: "linux", architecture: "arm64" }] }),
          Stream.runDrain(images.pull("alpine")),
          Stream.runDrain(images.pull(`ghcr.io/org/app@sha256:${"ab".repeat(32)}`, { platform: "linux/amd64" }))
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(
        stub.requests.slice(1).map((request) => `${request.method} ${request.url.pathname}${request.url.search}`),
        [
          "GET /v1.52/images/json?shared-size=true",
          "POST /v1.52/images/alpine/tag?repo=localhost%3A5000%2Fteam%2Fapp&tag=1",
          `DELETE /v1.52/images/alpine?noprune=true&platforms=${
            encodeURIComponent(JSON.stringify({ architecture: "arm64", os: "linux" }))
          }`,
          "POST /v1.52/images/create?fromImage=docker.io%2Flibrary%2Falpine&tag=latest&platform=linux%2Farm64",
          `POST /v1.52/images/create?fromImage=ghcr.io%2Forg%2Fapp&tag=sha256%3A${
            "ab".repeat(32)
          }&platform=linux%2Famd64`
        ]
      )
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

  it.effect("returns the pushed manifest", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () =>
        ndjson(
          { status: "The push refers to repository [localhost:5000/app]" },
          { status: "1: digest: sha256:d size: 527", aux: { Tag: "1", Digest: "sha256:d", Size: 527 } }
        )))
      const result = yield* Images.use((images) => images.push("localhost:5000/app:1")).pipe(stub.provide)
      assert.deepStrictEqual(result, { Tag: "1", Digest: "sha256:d", Size: 527 })
      assert.strictEqual(
        decodeURIComponent(stub.requests.at(-1)!.url.pathname),
        "/v1.44/images/localhost:5000/app/push"
      )
      assert.strictEqual(stub.requests.at(-1)!.url.search, "?tag=1")
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

  it.effect("fails options and operations newer than the negotiated version with OptionNotSupported", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.48", () => json([])))
      const [list, attestations, save] = yield* Images.use((images) =>
        Effect.all([
          Effect.flip(images.list({ identity: true })),
          Effect.flip(images.attestations("alpine")),
          Stream.runDrain(images.save("alpine", { platform: [{ os: "linux" }, { os: "windows" }] })).pipe(Effect.flip)
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual([list.reason, attestations.reason, save.reason], [
        new DockerError.OptionNotSupported({ option: "identity", requiredVersion: "1.54", negotiatedVersion: "1.48" }),
        new DockerError.OptionNotSupported({
          option: "docker.Images.attestations",
          requiredVersion: "1.55",
          negotiatedVersion: "1.48"
        }),
        new DockerError.OptionNotSupported({ option: "platform.1", requiredVersion: "1.52", negotiatedVersion: "1.48" })
      ])
      assert.strictEqual(stub.requests.length, 1)
    }))

  it.effect("reads a build's progress and image ID, from either builder or a quiet build", () =>
    Effect.gen(function*() {
      const build = (messages: ReadonlyArray<unknown>, options?: DockerImages.BuildOptions) => {
        const stub = makeStubEngine(withPing("1.44", () => ndjson(...messages)))
        return Effect.all([
          Stream.runCollect(Stream.unwrap(Images.useSync((images) => images.buildStream(context, options)))),
          Images.use((images) => images.build(context, options))
        ]).pipe(stub.provide)
      }
      const [classic, { id }] = yield* build([
        { stream: "Step 1/2 : FROM alpine\n" },
        { status: "Pulling fs layer", id: "l", progressDetail: {} },
        { stream: " ---> abc\n" },
        { aux: { ID: "sha256:built" } },
        { stream: "Successfully built abc\n" }
      ])
      assert.deepStrictEqual(classic.map((progress) => progress._tag), ["Log", "Pull", "Log", "Log"])
      assert.strictEqual(id, "sha256:built")
      // BuildKit's trace isn't decoded: only its image ID counts
      const [buildKit, fromBuildKit] = yield* build([
        { id: "moby.buildkit.trace", aux: "CgsKBXN0ZXAxEgJpZA==" },
        { id: "moby.image.id", aux: { ID: "sha256:buildkit" } }
      ])
      assert.deepStrictEqual([buildKit, fromBuildKit.id], [[], "sha256:buildkit"])
      // a quiet build's only output is the image ID
      const hex = "0123456789abcdef".repeat(4)
      const [, quiet] = yield* build([{ stream: `sha256:${hex}\n` }], { quiet: true })
      assert.strictEqual(quiet.id, `sha256:${hex}`)
      const failed = yield* Effect.flip(build([{ stream: "Step 1/1\n" }, { errorDetail: { message: "boom" } }]))
      assert(failed.reason._tag === "StreamFailed")
      assert.strictEqual(failed.reason.message, "boom")
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
