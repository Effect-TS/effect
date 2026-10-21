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

  it.effect("decodes Go's null: a slice as empty, an optional field as absent", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json(null)))
      assert.deepStrictEqual(yield* use((containers) => containers.changes("c")).pipe(stub.provide), [])
      const summary = makeStubEngine(
        withPing("1.44", () => json([{ Id: "x", Names: null, Labels: null, State: "stopping" }]))
      )
      const [container] = yield* use((containers) => containers.list()).pipe(summary.provide)
      assert.deepStrictEqual(container, { Id: "x", State: "stopping" })
    }))

  it.effect("demultiplexes logs, and fails on a systemerr frame after the frames before it", () =>
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
      const truncated = yield* Effect.flip(logs(frame(1, "cut short").subarray(0, 12)))
      assert.strictEqual(truncated.reason._tag, "StreamFailed")
    }))

  it.effect("reads logs without a stream content type by the container's TTY", () =>
    Effect.gen(function*() {
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
      const logs = stub.requests.find((request) => request.url.pathname.endsWith("/logs"))!
      assert.strictEqual(logs.url.search, "?stdout=true&stderr=true&since=1000")
    }))

  it.effect("requests both log streams unless the other one is asked for alone", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => ({
        headers: { "content-type": "application/vnd.docker.raw-stream" },
        body: "x"
      })))
      const table: Array<[{ readonly stdout?: boolean; readonly stderr?: boolean }, string]> = [
        [{}, "stdout=true&stderr=true"],
        [{ stdout: true }, "stdout=true&stderr=false"],
        [{ stderr: false }, "stdout=true&stderr=false"],
        [{ stdout: false }, "stdout=false&stderr=true"]
      ]
      for (const [options, query] of table) {
        yield* Stream.runDrain(
          Stream.unwrap(DockerContainers.DockerContainers.useSync((containers) => containers.logs("c", options)))
        ).pipe(stub.provide)
        assert.strictEqual(stub.requests.at(-1)!.url.search, `?${query}`, JSON.stringify(options))
      }
    }))

  it.effect("reads a path's stat from its header, with or without the archive", () =>
    Effect.gen(function*() {
      const stat = { name: "a.txt", size: 5, mode: 420, mtime: "2026-10-21T00:00:00Z", linkTarget: "" }
      const header = { "x-docker-container-path-stat": btoa(JSON.stringify(stat)) }
      const stub = makeStubEngine(withPing("1.44", () => ({ headers: header, body: bytes("tar bytes") })))
      const [statted, archive] = yield* use((containers) =>
        Effect.all([containers.statPath("c", "/a.txt"), containers.getArchive("c", "/a.txt")])
      ).pipe(stub.provide)
      assert.deepStrictEqual(statted, stat)
      assert.deepStrictEqual(archive.stat, stat)
      assert.strictEqual(decode(concat(...yield* Stream.runCollect(archive.bytes))), "tar bytes")
      assert.deepStrictEqual(stub.requests.slice(1).map((request) => `${request.method} ${request.url.search}`), [
        "HEAD ?path=%2Fa.txt",
        "GET ?path=%2Fa.txt"
      ])
    }))

  it.effect("streams copyTo's entries as a tar body, and fails with StreamFailed when one doesn't match its size", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => ({ status: 200 })))
      yield* use((containers) =>
        containers.copyTo("c", "/tmp", Stream.make(Tar.file("a.txt", "hello")), { copyUIDGID: true })
      ).pipe(stub.provide)
      const put = stub.requests.at(-1)!
      assert.strictEqual(`${put.method} ${put.url.search}`, "PUT ?path=%2Ftmp&copyUIDGID=true")
      assert.strictEqual(put.headers["content-type"], "application/x-tar")
      assert.include(put.body, "hello")
      const error = yield* use((containers) =>
        containers.copyTo("c", "/tmp", Stream.make(Tar.fileStream("a.txt", 10, Stream.make(bytes("short")))))
      ).pipe(stub.provide, Effect.flip)
      assert(error.reason._tag === "StreamFailed")
      assert(Tar.isTarError(error.reason.cause))
      assert.strictEqual(error.reason.cause.kind, "SizeMismatch")
    }))

  it.effect("attaches after registering a next-exit wait, and reports that wait's exit code", () =>
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
      const [stdout, stderr, exitCode] = yield* Effect.scoped(Effect.gen(function*() {
        const handle = yield* use((containers) => containers.attach("c", { stdin: true }))
        yield* Stream.make(bytes("input")).pipe(Stream.run(handle.stdin))
        return yield* Effect.all([
          Stream.mkString(Stream.decodeText(handle.stdout)),
          Stream.mkString(Stream.decodeText(handle.stderr)),
          handle.exitCode
        ], { concurrency: "unbounded" })
      })).pipe(stub.provide)
      assert.deepStrictEqual([stdout, stderr, exitCode], ["piped\n", "bye\n", 7])
      assert.deepStrictEqual(attached.written, [bytes("input")])
      assert.isTrue(attached.halfClosed)
      assert.deepStrictEqual(stub.requests.slice(1).map((request) => `${request.url.pathname}${request.url.search}`), [
        "/v1.44/containers/c/wait?condition=next-exit",
        "/v1.44/containers/c/attach?stream=true&stdin=true&stdout=true&stderr=true&detachKeys=ctrl-x%2Cx"
      ])
      assert.strictEqual(stub.requests[2].headers.upgrade, "tcp")
    }))

  it.effect("fails logs and attach with the Engine's error response, read from the response itself", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ message: "No such container: c" }, 404)))
      const [logs, attach] = yield* Effect.all([
        Effect.flip(
          Stream.runDrain(
            Stream.unwrap(DockerContainers.DockerContainers.useSync((containers) => containers.logs("c")))
          )
        ),
        Effect.flip(Effect.scoped(use((containers) => containers.attach("c"))))
      ]).pipe(stub.provide)
      assert.deepStrictEqual(
        [logs.reason, attach.reason],
        [
          new DockerError.NotFound({
            status: 404,
            message: "No such container: c",
            operation: "docker.Containers.logs"
          }),
          new DockerError.NotFound({
            status: 404,
            message: "No such container: c",
            operation: "docker.Containers.attach"
          })
        ]
      )
    }))
})
