import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { DockerContainers, DockerError, type DockerSchema } from "effect/docker"
import { Tar } from "effect/encoding"
import { concat, connection, frame, json, makeStubEngine, withPing } from "./utils/stub.ts"

const bytes = (text: string) => new TextEncoder().encode(text)
const decode = (data: Uint8Array) => new TextDecoder().decode(data)
const use = <A, E, R>(f: (containers: DockerContainers.DockerContainers["Service"]) => Effect.Effect<A, E, R>) =>
  DockerContainers.DockerContainers.use(f)

describe("DockerContainers", () => {
  it.effect("sends each option under the Engine's name", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.50", (request) =>
        request.url.pathname.endsWith("/stop")
          ? { status: 304 }
          : request.url.pathname.endsWith("/resize")
          ? { status: 200 }
          : { status: 204 }))
      yield* use((containers) =>
        Effect.all([
          containers.stop("c", { timeout: "1500 millis", signal: "SIGINT" }),
          containers.restart("c", { timeout: "Infinity" }),
          containers.remove("c", { force: true, volumes: true }),
          containers.kill("c"),
          containers.resize("c", { rows: 24, columns: 80 })
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual(
        stub.requests.slice(1).map((request) => `${request.method} ${request.url.pathname}${request.url.search}`),
        [
          "POST /v1.50/containers/c/stop?signal=SIGINT&t=2",
          "POST /v1.50/containers/c/restart?t=-1",
          "DELETE /v1.50/containers/c?force=true&v=true",
          "POST /v1.50/containers/c/kill",
          "POST /v1.50/containers/c/resize?h=24&w=80"
        ]
      )
    }))

  it.effect("applies the configured proxy and platform, unless the call sets them, and unwraps Redacted env", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ Id: "c", Warnings: [] }, 201)), {
        config: { proxy: { httpProxy: "http://proxy:3128", noProxy: "localhost" }, platform: "linux/arm64" }
      })
      yield* use((containers) =>
        Effect.all([
          containers.create({ Image: "alpine" }),
          containers.create({ Image: "alpine", Env: [Redacted.make("HTTP_PROXY=mine"), "no_proxy"] }, {
            platform: "linux/amd64"
          })
        ])
      ).pipe(stub.provide)
      const [plain, own] = stub.requests.filter((request) => request.method === "POST")
      assert.strictEqual(plain.url.searchParams.get("platform"), "linux/arm64")
      assert.deepStrictEqual(JSON.parse(plain.body!).Env, [
        "HTTP_PROXY=http://proxy:3128",
        "http_proxy=http://proxy:3128",
        "NO_PROXY=localhost",
        "no_proxy=localhost"
      ])
      // a variable the container sets, even without a value, is left alone
      assert.strictEqual(own.url.searchParams.get("platform"), "linux/amd64")
      assert.deepStrictEqual(JSON.parse(own.body!).Env, [
        "HTTP_PROXY=mine",
        "no_proxy",
        "http_proxy=http://proxy:3128",
        "NO_PROXY=localhost"
      ])
    }))

  it.effect("fails fields newer than the negotiated version with OptionNotSupported, before sending", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ Id: "x", Warnings: [] }, 201)))
      const create = (HostConfig: DockerSchema.HostConfig) =>
        use((containers) => containers.create({ Image: "alpine", HostConfig })).pipe(stub.provide)
      const umask = yield* Effect.flip(create({ Umask: 18 }))
      assert.deepStrictEqual(
        umask.reason,
        new DockerError.OptionNotSupported({
          option: "HostConfig.Umask",
          requiredVersion: "1.56",
          negotiatedVersion: "1.44"
        })
      )
      // gates reach into arrays
      const subpath = yield* Effect.flip(
        create({
          Mounts: [{ Type: "bind", Target: "/a" }, { Type: "volume", Target: "/b", VolumeOptions: { Subpath: "x" } }]
        })
      )
      assert(subpath.reason._tag === "OptionNotSupported")
      assert.strictEqual(subpath.reason.option, "HostConfig.Mounts.*.VolumeOptions.Subpath")
      assert.isFalse(stub.requests.some((request) => request.url.pathname.endsWith("/create")))
      yield* create({ Mounts: [{ Type: "volume", Target: "/b", VolumeOptions: { NoCopy: true } }] })
      // and into filters
      const filter = yield* use((containers) => containers.list({ filters: { annotation: "a" } })).pipe(
        stub.provide,
        Effect.flip
      )
      assert.strictEqual(filter.reason._tag, "OptionNotSupported")
    }))

  it.effect("frames logs by the stream content type, otherwise by the container's TTY", () =>
    Effect.gen(function*() {
      const logs = (body: Uint8Array) =>
        Stream.unwrap(DockerContainers.DockerContainers.useSync((containers) => containers.logs("c", { tail: 5 })))
          .pipe(
            Stream.map((frame) => `${frame.stream}:${decode(frame.data)}`),
            Stream.runCollect,
            makeStubEngine(withPing("1.44", () => ({
              headers: { "content-type": "application/vnd.docker.multiplexed-stream" },
              body
            }))).provide
          )
      assert.deepStrictEqual(yield* logs(concat(frame(1, "out"), frame(2, "err"))), ["stdout:out", "stderr:err"])
      const error = yield* Effect.flip(logs(concat(frame(2, "x"), frame(3, "boom\n"))))
      assert(error.reason._tag === "StreamFailed")
      assert.strictEqual(error.reason.message, "boom")
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.url.pathname.endsWith("/json")
          ? json({ Id: "c", Config: { Tty: true } })
          : { body: concat(frame(1, "raw")) }))
      const frames = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.logs("c", { since: 1_000_000 }))
      ).pipe(Stream.runCollect, stub.provide)
      // with a TTY the bytes are raw stdout, header included
      assert.deepStrictEqual(frames.map((frame) => frame.stream), ["stdout"])
      assert.strictEqual(frames[0].data.length, 11)
      const request = stub.requests.find((request) => request.url.pathname.endsWith("/logs"))!
      assert.strictEqual(request.url.search, "?stdout=true&stderr=true&since=1000")
    }))

  it.effect("attaches after registering a next-exit wait, reports its exit code, and fails with the Engine's error", () =>
    Effect.gen(function*() {
      const attached = connection([frame(1, "piped\n"), frame(2, "bye\n")])
      const stub = makeStubEngine(
        withPing("1.44", (request) =>
          request.url.pathname.endsWith("/wait")
            ? json({ StatusCode: 7 })
            : { headers: { "content-type": "application/vnd.docker.multiplexed-stream" }, upgrade: attached }),
        {
          config: { detachKeys: "ctrl-x,x" }
        }
      )
      const [frames, exitCode] = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* use((containers) => containers.attach("c", { stdin: true }))
        yield* Stream.make(bytes("input")).pipe(Stream.run(handle.stdin))
        return yield* Effect.all([Stream.runCollect(handle.frames), handle.exitCode], { concurrency: "unbounded" })
      })).pipe(stub.provide)
      assert.deepStrictEqual(
        [frames.map((frame) => `${frame.stream}:${decode(frame.data)}`), exitCode],
        [["stdout:piped\n", "stderr:bye\n"], 7]
      )
      assert.deepStrictEqual(attached.written, [bytes("input")])
      assert.isTrue(attached.halfClosed)
      assert.deepStrictEqual(stub.requests.slice(1).map((request) => `${request.url.pathname}${request.url.search}`), [
        "/v1.44/containers/c/wait?condition=next-exit",
        "/v1.44/containers/c/attach?stream=true&stdin=true&stdout=true&stderr=true&detachKeys=ctrl-x%2Cx"
      ])
      assert.strictEqual(stub.requests[2].headers.upgrade, "tcp")
      // the Engine's error response is read from the response itself
      const missing = makeStubEngine(withPing("1.44", () => json({ message: "No such container: c" }, 404)))
      const error = yield* Effect.flip(Effect.scoped(use((containers) => containers.attach("c")))).pipe(
        missing.provide
      )
      assert.deepStrictEqual(
        [error.reason, error.operation],
        [new DockerError.NotFound({ message: "No such container: c" }), "docker.Containers.attach"]
      )
    }))

  it.effect("round-trips tar entries through copyTo and copyFrom", () =>
    Effect.gen(function*() {
      const stat = { name: "a.txt", size: 5, mode: 420, mtime: "2026-10-21T00:00:00Z", linkTarget: "" }
      let archive = new Uint8Array()
      const stub = makeStubEngine(withPing("1.44", (request) => {
        if (request.method !== "PUT") {
          return { headers: { "x-docker-container-path-stat": btoa(JSON.stringify(stat)) }, body: archive }
        }
        archive = new Uint8Array(request.bytes!)
        return { status: 200 }
      }))
      yield* use((containers) =>
        Effect.gen(function*() {
          yield* containers.copyTo("c", "/tmp", Stream.make(Tar.file("a.txt", "hello")), { copyUIDGID: true })
          const entries = yield* containers.copyFrom("c", "/tmp/a.txt").pipe(
            Stream.mapEffect((entry) =>
              Stream.mkString(Stream.decodeText(entry.body)).pipe(Effect.map((body) => `${entry.header.path}:${body}`))
            ),
            Stream.runCollect
          )
          assert.deepStrictEqual(entries, ["a.txt:hello"])
        })
      ).pipe(stub.provide)
      const [put, get] = stub.requests.slice(1)
      assert.deepStrictEqual(
        [`${put.method} ${put.url.search}`, put.headers["content-type"], `${get.method} ${get.url.search}`],
        ["PUT ?path=%2Ftmp&copyUIDGID=true", "application/x-tar", "GET ?path=%2Ftmp%2Fa.txt"]
      )
      const error = yield* use((containers) =>
        containers.copyTo("c", "/tmp", Stream.make(Tar.fileStream("a.txt", 10, Stream.make(bytes("short")))))
      ).pipe(stub.provide, Effect.flip)
      assert(error.reason._tag === "StreamFailed")
      assert(Tar.isTarError(error.reason.cause))
      assert.strictEqual(error.reason.cause.kind, "SizeMismatch")
    }))
})
