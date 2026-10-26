import { assert, it } from "@effect/vitest"
import { Effect, Redacted, Schedule, Stream } from "effect"
import { DockerContainers, DockerImages } from "effect/docker"
import { Tar } from "effect/encoding"
import { ensureImage, image, labels, layer, scopedContainer } from "./utils/live.ts"

const registryImage = "docker.io/library/registry:2"

// `htpasswd -B` for effect / docker-test (bcrypt, cost 5)
const htpasswd = "effect:$2b$05$EhQLAN18hMbRRF/zaRttLuHBsoMjIZiBHyygxoWFnwDapVBOocZeW\n"
const credential = { username: "effect", password: Redacted.make("docker-test") }

const Images = DockerImages.DockerImages

const tarOf = (...entries: ReadonlyArray<Tar.Entry>) =>
  Stream.fromIterable(entries).pipe(Stream.pipeThroughChannel(Tar.encode()), Stream.orDie)

// no `RUN`: a step that runs a container makes every build several times slower
const dockerfile = (from: string) => tarOf(Tar.file("Dockerfile", `FROM ${from}\nLABEL built=1\n`))

/** Starts a `registry:2` with htpasswd auth, and returns its `localhost:<port>`. */
const privateRegistry = Effect.gen(function*() {
  yield* ensureImage(registryImage)
  const id = yield* scopedContainer({
    Image: registryImage,
    Env: [
      "REGISTRY_AUTH=htpasswd",
      "REGISTRY_AUTH_HTPASSWD_REALM=effect",
      "REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd"
    ],
    ExposedPorts: { "5000/tcp": {} },
    HostConfig: { PortBindings: { "5000/tcp": [{ HostIp: "127.0.0.1", HostPort: "" }] } }
  })
  const containers = yield* DockerContainers.DockerContainers
  yield* containers.copyTo(id, "/", Stream.make(Tar.directory("auth"), Tar.file("auth/htpasswd", htpasswd)))
  yield* containers.start(id)
  const port = (yield* containers.inspect(id)).NetworkSettings?.Ports?.["5000/tcp"]?.[0]?.HostPort
  assert.isDefined(port)
  const registry = `localhost:${port}`
  // wait until the registry answers
  yield* Effect.tryPromise(() => fetch(`http://${registry}/v2/`)).pipe(
    Effect.retry({ schedule: Schedule.spaced("200 millis"), times: 50 })
  )
  return registry
})

it.layer(layer, { timeout: "300 seconds", excludeTestServices: true })("Images (live)", (it) => {
  it.effect("pulls with progress, and fails for a missing repository", () =>
    Effect.gen(function*() {
      const images = yield* Images
      const messages = yield* Stream.runCollect(images.pull(image))
      assert.isAbove(messages.length, 0)
      assert.isDefined((yield* images.inspect(image)).Id)
      const missing = yield* Effect.flip(
        Stream.runDrain(images.pull("docker.io/library/effect-docker-does-not-exist:nope"))
      )
      // the Engines and Docker Hub disagree on how to say "no such repository"
      assert.oneOf(missing.reason._tag, ["NotFound", "StreamFailed", "Unauthorized", "Forbidden", "ServerError"])
    }), 120_000)

  it.effect("tags, saves, loads and removes", () =>
    Effect.gen(function*() {
      const images = yield* Images
      yield* ensureImage(image)
      const inspected = yield* images.inspect(image)
      yield* images.tag(image, "localhost/effect-docker-test:tagged")
      assert.strictEqual((yield* images.inspect("localhost/effect-docker-test:tagged")).Id, inspected.Id)
      const archive = yield* Stream.runCollect(images.save("localhost/effect-docker-test:tagged"))
      const entries = yield* Stream.fromIterable(archive).pipe(
        Stream.pipeThroughChannel(Tar.decode()),
        Stream.mapEffect((entry) => Effect.as(Stream.runDrain(entry.body), entry.header.path)),
        Stream.runCollect
      )
      assert.include(entries, "manifest.json")
      assert.isAbove((yield* images.remove("localhost/effect-docker-test:tagged")).length, 0)
      yield* Stream.runDrain(images.load(Stream.fromIterable(archive)))
      assert.strictEqual((yield* images.inspect("localhost/effect-docker-test:tagged")).Id, inspected.Id)
      yield* images.remove("localhost/effect-docker-test:tagged")
    }), 120_000)

  it.effect("builds with the classic builder and with BuildKit", () =>
    Effect.gen(function*() {
      const images = yield* Images
      yield* ensureImage(image)
      const classic = yield* images.build(dockerfile(image), { builder: "classic", labels })
      assert.match(classic.id, /^sha256:/)
      const logs = yield* Stream.runCollect(
        images.buildStream(dockerfile(image), { builder: "classic", labels, noCache: true })
      )
      assert.isTrue(logs.some((progress) => progress._tag === "Log" && progress.data.includes("LABEL built=1")))
      const buildKit = yield* images.build(dockerfile(image), { builder: "buildkit", labels, noCache: true })
      assert.match(buildKit.id, /^sha256:/)
      for (const builder of ["classic", "buildkit"] as const) {
        const failed = yield* Effect.flip(
          images.build(tarOf(Tar.file("Dockerfile", `FROM ${image}\nCOPY missing /\n`)), { builder, labels })
        )
        assert(failed.reason._tag === "StreamFailed", failed.message)
      }
      const built = yield* images.list({ all: true, filters: { label: "effect-docker-test=1" } })
      yield* Effect.forEach(built, (summary) => Effect.ignore(images.remove(summary.Id, { force: true })))
    }), 120_000)

  it.effect("round-trips a private registry: push and pull with credentials", () =>
    Effect.gen(function*() {
      const images = yield* Images
      yield* ensureImage(image)
      const registry = yield* privateRegistry
      const target = `${registry}/effect/alpine:1`
      yield* images.tag(image, target)
      // anonymous pushes are refused
      const anonymous = yield* Effect.flip(images.push(target))
      assert.oneOf(anonymous.reason._tag, ["StreamFailed", "Unauthorized"])
      const pushed = yield* images.push(target, { auth: credential })
      assert.match(pushed.Digest ?? "sha256:", /^sha256:/)
      const distribution = yield* images.distribution(target, { auth: credential })
      assert.isDefined(distribution.Descriptor)
      yield* images.remove(target)
      const anonymousPull = yield* Effect.flip(Stream.runDrain(images.pull(target)))
      assert.oneOf(anonymousPull.reason._tag, ["StreamFailed", "Unauthorized", "ServerError", "NotFound"])
      yield* Stream.runDrain(images.pull(target, { auth: credential }))
      // the classic builder pulls a private base image with the build's credentials
      const classic = yield* images.build(dockerfile(target), {
        builder: "classic",
        labels,
        pull: true,
        auth: { [registry]: credential }
      })
      assert.match(classic.id, /^sha256:/)
      // BuildKit can't authenticate without a session, but uses the pulled image
      const prePulled = yield* images.build(dockerfile(target), { builder: "buildkit", labels })
      assert.match(prePulled.id, /^sha256:/)
      yield* Effect.forEach([classic.id, prePulled.id, target], (name) =>
        Effect.ignore(images.remove(name, { force: true })))
    }), 240_000)
})
