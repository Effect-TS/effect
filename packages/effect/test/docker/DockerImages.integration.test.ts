import { assert, it } from "@effect/vitest"
import { Effect, Redacted, Schedule, Stream } from "effect"
import { DockerContainers, DockerEngine, DockerError, DockerImages } from "effect/docker"
import { Tar } from "effect/encoding"
import { ensureImage, image, labels, layer, scopedContainer } from "./utils/live.ts"

const registryImage = "docker.io/library/registry:2"

// `htpasswd -B` for effect / docker-test (bcrypt, cost 5)
const htpasswd = "effect:$2b$05$EhQLAN18hMbRRF/zaRttLuHBsoMjIZiBHyygxoWFnwDapVBOocZeW\n"
const credential = { username: "effect", password: Redacted.make("docker-test") }

const Images = DockerImages.DockerImages

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
  it.effect("pulls, inspects, tags, saves, loads and removes", () =>
    Effect.gen(function*() {
      const images = yield* Images
      const messages = yield* Stream.runCollect(images.pull(image))
      assert.isAbove(messages.length, 0)
      const inspected = yield* images.inspect(image)
      assert.isDefined(inspected.Id)
      assert.isAbove((yield* images.history(image)).length, 0)
      assert.isTrue((yield* images.list()).some((summary) => summary.Id === inspected.Id))
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
      const missing = yield* Effect.flip(
        Stream.runDrain(images.pull("docker.io/library/effect-docker-does-not-exist:nope"))
      )
      // the Engines and Docker Hub disagree on how to say "no such repository"
      assert.oneOf(missing.reason._tag, ["NotFound", "StreamFailed", "Unauthorized", "Forbidden", "ServerError"])
    }), 120_000)

  it.effect("imports a filesystem, and commits a container", () =>
    Effect.gen(function*() {
      const images = yield* Images
      yield* Stream.runDrain(images.import(
        Stream.make(Tar.directory("etc"), Tar.file("etc/hello", "imported\n")).pipe(
          Stream.pipeThroughChannel(Tar.encode()),
          Stream.orDie
        ),
        { repo: "localhost/effect-docker-test", tag: "imported", changes: ["LABEL effect-docker-test=1"] }
      ))
      const imported = yield* images.inspect("localhost/effect-docker-test:imported")
      assert.strictEqual(imported.Config?.Labels?.["effect-docker-test"], "1")
      yield* ensureImage(image)
      const id = yield* scopedContainer({ Image: image, Cmd: ["sh", "-c", "echo committed > /committed"] })
      yield* DockerContainers.DockerContainers.use((containers) =>
        Effect.andThen(containers.start(id), containers.wait(id))
      )
      const { Id } = yield* images.commit(id, {
        repo: "localhost/effect-docker-test",
        tag: "committed",
        changes: ["ENV COMMITTED=1"],
        config: { Labels: labels }
      })
      const committed = yield* images.inspect(Id)
      assert.include(committed.Config?.Env ?? [], "COMMITTED=1")
      yield* Effect.forEach(["imported", "committed"], (tag) =>
        Effect.ignore(images.remove(`localhost/effect-docker-test:${tag}`, { force: true })))
    }), 120_000)

  it.effect("fails options newer than the negotiated version with OptionNotSupported", () =>
    Effect.gen(function*() {
      const negotiated = yield* (yield* DockerEngine.DockerEngine).apiVersion
      const list = Images.use((images) => images.list({ manifests: true }))
      // `manifests` arrived in API 1.47: the 1.44 CI run negotiates below it
      if (Number(negotiated.split(".")[1]) >= 47) {
        yield* list
      } else {
        const error = yield* Effect.flip(list)
        assert.deepStrictEqual(
          error.reason,
          new DockerError.OptionNotSupported({
            option: "manifests",
            requiredVersion: "1.47",
            negotiatedVersion: negotiated
          })
        )
      }
    }))

  it.effect("searches Docker Hub", () =>
    Effect.gen(function*() {
      const results = yield* Images.use((images) => images.search("alpine", { limit: 1 }))
      assert.strictEqual(results.length, 1)
    }))

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
      yield* Effect.ignore(images.remove(target, { force: true }))
    }), 240_000)
})
