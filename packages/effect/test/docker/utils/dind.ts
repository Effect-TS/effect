/**
 * A private Engine for the live suites that change the daemon (Swarm,
 * plugins): `docker:dind`, started on the host's Engine and removed with the
 * layer, reached over plain `tcp://` on a loopback port.
 */
import { NodeDocker } from "@effect/platform-node"
import { Effect, Layer, Schedule } from "effect"
import {
  type Docker,
  DockerConfig,
  DockerContainers,
  type DockerEngine,
  type DockerError,
  DockerSystem
} from "effect/docker"
import { ensureImage, layer as hostLayer, scopedContainer } from "./live.ts"

/** The private Engine's image. */
export const dindImage = "docker.io/library/docker:29-dind"

/** The `DockerEngine` and `Docker` layer of a private Engine, which lives as long as the layer. */
export const layer: Layer.Layer<
  DockerEngine.DockerEngine | Docker.Docker,
  DockerConfig.DockerConfigError | DockerError.DockerError
> = Layer.unwrap(Effect.gen(function*() {
  const host = yield* Layer.build(hostLayer)
  const port = yield* Effect.gen(function*() {
    yield* ensureImage(dindImage)
    const id = yield* scopedContainer({
      Image: dindImage,
      // no TLS: the port is published on loopback only. Without an explicit
      // `--tls=false`, dockerd delays its start by 15 seconds as a warning.
      Env: ["DOCKER_TLS_CERTDIR="],
      Cmd: ["--tls=false"],
      ExposedPorts: { "2375/tcp": {} },
      HostConfig: { Privileged: true, PortBindings: { "2375/tcp": [{ HostIp: "127.0.0.1", HostPort: "" }] } }
    })
    const containers = yield* DockerContainers.DockerContainers
    yield* containers.start(id)
    const port = (yield* containers.inspect(id)).NetworkSettings?.Ports?.["2375/tcp"]?.[0]?.HostPort
    if (port === undefined) return yield* Effect.die("the dind port isn't published")
    return Number(port)
  }).pipe(Effect.provideContext(host))
  const engine = NodeDocker.layer.pipe(
    Layer.provide(DockerConfig.layer({
      endpoint: { _tag: "Tcp", host: "127.0.0.1", port },
      // pinned as the host's Engine is, as CI's minimum-version run does
      apiVersion: process.env.DOCKER_API_VERSION
    }))
  )
  // until the Engine answers
  yield* DockerSystem.DockerSystem.use((system) => system.ping).pipe(
    Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 120 }),
    Effect.provide(engine)
  )
  return engine
}))
