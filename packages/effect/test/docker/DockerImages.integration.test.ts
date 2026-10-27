import { assert, it } from "@effect/vitest"
import { Effect, Redacted, Schedule, Stream } from "effect"
import { DockerContainers, DockerImages } from "effect/docker"
import { Tar } from "effect/encoding"
import { ensureImage, image, layer, scopedContainer, scopedImages } from "./utils/live.ts"

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
  it.effect("builds with the classic builder and with BuildKit", () =>
    Effect.gen(function*() {
      const images = yield* Images
      const { labels } = yield* scopedImages
      yield* ensureImage(image)
      for (const builder of ["classic", "buildkit"] as const) {
        const built = yield* images.build(dockerfile(image), { builder, labels })
        assert.strictEqual((yield* images.inspect(built.id)).Config?.Labels?.built, "1")
      }
    }), 120_000)

  it.effect("round-trips a private registry: push and pull with credentials", () =>
    Effect.gen(function*() {
      const images = yield* Images
      const { reference } = yield* scopedImages
      yield* ensureImage(image)
      const registry = yield* privateRegistry
      const target = reference(`${registry}/effect/alpine:1`)
      yield* images.tag(image, target)
      // anonymous pushes are refused
      const anonymous = yield* Effect.flip(images.push(target))
      assert.oneOf(anonymous.reason._tag, ["StreamFailed", "Unauthorized"])
      const source = yield* images.inspect(target)
      yield* images.push(target, { auth: credential })
      yield* images.remove(target)
      yield* Stream.runDrain(images.pull(target, { auth: credential }))
      // the same layers: with the containerd image store the Id is a manifest digest, and a push sends only the
      // local platform's manifest of a multi-platform image
      const pulled = yield* images.inspect(target)
      assert.isNotEmpty(source.RootFS?.Layers)
      assert.deepStrictEqual(pulled.RootFS?.Layers, source.RootFS?.Layers)
    }), 240_000)
})
