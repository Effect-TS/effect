import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Stream } from "effect"
import { DockerContainers, DockerExec, DockerNetworks, DockerVolumes } from "effect/docker"
import { Tar } from "effect/encoding"
import { ensureImage, image, labels, layer, scopedContainer } from "./utils/live.ts"

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

  it.effect("interrupts a followed log stream", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const id = yield* scopedContainer({
        Image: image,
        Cmd: ["sh", "-c", "while true; do echo tick; sleep 0.2; done"]
      })
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id))
      const firstTwo = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.logs(id, { follow: true }))
      ).pipe(Stream.take(2), Stream.runCollect)
      assert.strictEqual(firstTwo.length, 2)
      const fiber = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.logs(id, { follow: true }))
      ).pipe(Stream.runDrain, Effect.forkChild)
      yield* Effect.sleep("300 millis")
      yield* Fiber.interrupt(fiber)
      const stats = yield* Stream.unwrap(
        DockerContainers.DockerContainers.useSync((containers) => containers.statsStream(id))
      )
        .pipe(Stream.take(2), Stream.runCollect)
      assert.strictEqual(stats.length, 2)
      const once = yield* DockerContainers.DockerContainers.use((containers) => containers.stats(id, { oneShot: true }))
      assert.isDefined(once.read)
    }), 60_000)

  it.effect("runs execs with stdin half-close", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const id = yield* scopedContainer({ Image: image, Cmd: ["sleep", "60"] })
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id))
      const result = yield* DockerExec.DockerExec.use((exec) =>
        exec.run(id, ["sh", "-c", "cat; echo after-eof; echo err-line >&2; exit 3"], {
          stdin: "hello\n"
        })
      )
      assert.strictEqual(result.exitCode, 3)
      assert.strictEqual(decode(result.stdout), "hello\nafter-eof\n")
      assert.strictEqual(decode(result.stderr), "err-line\n")
      const tty = yield* DockerExec.DockerExec.use((exec) => exec.run(id, ["sh", "-c", "echo tty >&2"], { tty: true }))
      assert.strictEqual(decode(tty.stdout), "tty\r\n")
      // a command that doesn't read its stdin still reports its exit code
      const ignoring = yield* DockerExec.DockerExec.use((exec) =>
        exec.run(id, ["sh", "-c", "exit 4"], { stdin: new Uint8Array(4 * 1024 * 1024) })
      )
      assert.strictEqual(ignoring.exitCode, 4)
      // stdin that wasn't requested fails
      const { Id } = yield* DockerExec.DockerExec.use((exec) => exec.create(id, { Cmd: ["true"], AttachStdout: true }))
      const exec = yield* DockerExec.DockerExec.use((exec) => exec.start(Id))
      const error = yield* Stream.make(new Uint8Array([1])).pipe(Stream.run(exec.stdin), Effect.flip)
      assert.strictEqual(error.reason._tag, "StdinNotAttached")
      assert.strictEqual(yield* exec.exitCode, 0)
      assert.isFalse((yield* DockerExec.DockerExec.use((exec) => exec.inspect(Id))).Running)
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

  it.effect("publishes ports", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const id = yield* scopedContainer({
        Image: image,
        Cmd: ["sleep", "30"],
        ExposedPorts: { "80/tcp": {} },
        HostConfig: { PortBindings: { "80/tcp": [{ HostPort: "" }] } }
      })
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id))
      const inspected = yield* DockerContainers.DockerContainers.use((containers) => containers.inspect(id))
      const bindings = inspected.NetworkSettings?.Ports?.["80/tcp"] ?? []
      assert.isTrue(bindings.some((binding) => binding.HostIp === "0.0.0.0" && Number(binding.HostPort) > 0))
    }), 60_000)

  it.effect("prunes stopped containers by label", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const { Id } = yield* DockerContainers.DockerContainers.use((containers) =>
        containers.create({ Image: image, Cmd: ["true"], Labels: { ...labels, prune: "1" } })
      )
      const result = yield* DockerContainers.DockerContainers.use((containers) =>
        containers.prune({ filters: { label: "prune=1" } })
      )
      assert.include(result.ContainersDeleted ?? [], Id)
    }), 60_000)

  it.effect("connects a container with a volume to a network", () =>
    Effect.gen(function*() {
      yield* ensureImage(image)
      const networks = yield* DockerNetworks.DockerNetworks
      const volumes = yield* DockerVolumes.DockerVolumes
      const network = yield* Effect.acquireRelease(
        networks.create({ Name: `effect-docker-test-${Date.now()}`, Labels: labels }),
        ({ Id }) => Effect.ignore(networks.remove(Id))
      )
      const volume = yield* Effect.acquireRelease(
        volumes.create({ Labels: labels }),
        ({ Name }) => Effect.ignore(volumes.remove(Name, { force: true }))
      )
      const id = yield* scopedContainer({
        Image: image,
        Cmd: ["sleep", "30"],
        HostConfig: { Mounts: [{ Type: "volume", Source: volume.Name, Target: "/data" }] }
      })
      yield* DockerContainers.DockerContainers.use((containers) => containers.start(id))
      yield* networks.connect(network.Id, { Container: id, EndpointConfig: { Aliases: ["app"] } })
      const inspected = yield* networks.inspect(network.Id)
      assert.include(Object.keys(inspected.Containers ?? {}), id)
      assert.strictEqual((yield* volumes.inspect(volume.Name)).Name, volume.Name)
      const listed = yield* volumes.list({ filters: { label: "effect-docker-test=1", name: volume.Name } })
      assert.deepStrictEqual(listed.Volumes?.map((listed) => listed.Name), [volume.Name])
      yield* networks.disconnect(network.Id, { Container: id })
    }), 60_000)
})
