import { assert, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerContainers } from "effect/docker"
import { Tar } from "effect/encoding"
import { ensureImage, image, layer, scopedContainer } from "./utils/live.ts"

const text = <E, R>(stream: Stream.Stream<Uint8Array, E, R>) => Stream.mkString(Stream.decodeText(stream))
const decode = (data: Uint8Array) => new TextDecoder().decode(data)

it.layer(layer, { timeout: "120 seconds", excludeTestServices: true })("Containers (live)", (it) => {
  it.effect("runs the container lifecycle", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const id = yield* scopedContainer({ Image: image, Cmd: ["sleep", "60"] })
      const created = yield* DockerContainers.DockerContainers.use((containers) => containers.inspect(id))
      assert.strictEqual(created.State?.Status, "created")
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id))
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id)) // 304 is success
      const listed = yield* DockerContainers.DockerContainers.use((containers) =>
        containers.list({ filters: { label: `effect-docker-test=1`, id } })
      )
      assert.deepStrictEqual(listed.map((container) => container.State), ["running"])
      yield* DockerContainers.DockerContainers.use((containers) => containers.pause(id))
      assert.strictEqual(
        (yield* DockerContainers.DockerContainers.use((containers) => containers.inspect(id))).State?.Status,
        "paused"
      )
      yield* DockerContainers.DockerContainers.use((containers) => containers.unpause(id))
      const top = yield* DockerContainers.DockerContainers.use((containers) => containers.top(id))
      assert.isTrue((top.Processes ?? []).some((process) => process.join(" ").includes("sleep")))
      yield* DockerContainers.DockerContainers.use((containers) =>
        containers.rename(id, `effect-docker-test-${id.slice(0, 12)}`)
      )
      yield* DockerContainers.DockerContainers.use((containers) => containers.stop(id, { timeout: "1 second" }))
      const { StatusCode } = yield* DockerContainers.DockerContainers.use((containers) => containers.wait(id))
      assert.notStrictEqual(StatusCode, 0)
      yield* DockerContainers.DockerContainers.use((containers) => containers.remove(id))
      const error = yield* Effect.flip(DockerContainers.DockerContainers.use((containers) => containers.inspect(id)))
      assert.strictEqual(error.reason._tag, "NotFound")
    }), 60_000)

  it.effect("reads logs without and with a TTY", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const plain = yield* scopedContainer({ Image: image, Cmd: ["sh", "-c", "echo out; echo err >&2"] })
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(plain))
      yield* DockerContainers.DockerContainers.use((containers) => containers.wait(plain))
      const frames = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.logs(plain))
      ).pipe(
        Stream.runCollect
      )
      assert.deepStrictEqual(
        frames.map((frame) => `${frame.stream}:${decode(frame.data).trim()}`).sort(),
        ["stderr:err", "stdout:out"]
      )
      const tty = yield* scopedContainer({ Image: image, Cmd: ["sh", "-c", "echo out; echo err >&2"], Tty: true })
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(tty))
      yield* DockerContainers.DockerContainers.use((containers) => containers.wait(tty))
      const ttyFrames = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.logs(tty))
      ).pipe(
        Stream.runCollect
      )
      assert.isTrue(ttyFrames.every((frame) => frame.stream === "stdout"))
      assert.include(ttyFrames.map((frame) => decode(frame.data)).join(""), "err")
    }), 60_000)

  it.effect("attaches before start without missing the exit", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const id = yield* scopedContainer({
        Image: image,
        Cmd: ["sh", "-c", "cat; echo bye; exit 7"],
        OpenStdin: true,
        StdinOnce: true
      })
      const attached = yield* DockerContainers.DockerContainers.use((containers) =>
        containers.attach(id, { stdin: true })
      )
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id))
      yield* Stream.make(new TextEncoder().encode("piped\n")).pipe(Stream.run(attached.stdin))
      assert.strictEqual(yield* text(attached.stdout), "piped\nbye\n")
      assert.strictEqual(yield* attached.exitCode, 7)
    }), 60_000)

  it.effect("copies archives in and out", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const id = yield* scopedContainer({ Image: image, Cmd: ["sleep", "60"] })
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id))
      yield* DockerContainers.DockerContainers.use((containers) =>
        containers.copyTo(
          id,
          "/tmp",
          Stream.make(Tar.directory("d"), Tar.file("d/a.txt", "hello archive", { mode: 0o600 }))
        )
      )
      const stat = yield* DockerContainers.DockerContainers.use((containers) => containers.statPath(id, "/tmp/d/a.txt"))
      assert.strictEqual(stat.size, 13)
      const entries = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.copyFrom(id, "/tmp/d"))
      ).pipe(
        Stream.mapEffect((entry) => Effect.map(text(entry.body), (body) => [entry.header.path, body] as const)),
        Stream.runCollect
      )
      assert.deepStrictEqual(entries, [["d/", ""], ["d/a.txt", "hello archive"]])
      const { stat: dirStat, bytes } = yield* DockerContainers.DockerContainers.use((containers) =>
        containers.getArchive(id, "/tmp/d")
      )
      assert.strictEqual(dirStat.name, "d")
      assert.isAbove((yield* Stream.runCollect(bytes)).length, 0)
      const exported = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.export(id))
      ).pipe(
        Stream.take(1),
        Stream.runCollect
      )
      assert.strictEqual(exported.length, 1)
      const missing = yield* Effect.flip(
        DockerContainers.DockerContainers.use((containers) => containers.statPath(id, "/does/not/exist"))
      )
      assert.strictEqual(missing.reason._tag, "NotFound")
    }), 60_000)
})
