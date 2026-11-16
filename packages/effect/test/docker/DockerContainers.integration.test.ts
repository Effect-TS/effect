import { assert, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { DockerContainers } from "effect/docker"
import { ensureImage, image, layer, scopedContainer } from "./utils/live.ts"

const text = <E, R>(stream: Stream.Stream<Uint8Array, E, R>) => Stream.mkString(Stream.decodeText(stream))
const decode = (data: Uint8Array) => new TextDecoder().decode(data)

it.layer(layer, { timeout: "120 seconds", excludeTestServices: true })("Containers (live)", (it) => {
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
})
