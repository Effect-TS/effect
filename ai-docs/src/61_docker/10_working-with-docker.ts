/**
 * @title Working with Docker
 *
 * Define a service that runs commands in a sandbox container, with the image pulled and the container cleaned up by its layer.
 */
import { NodeDocker } from "@effect/platform-node"
import { Context, Effect, Layer, Schedule, Schema, Stream } from "effect"
import { DockerContainers, DockerExec, DockerImages } from "effect/docker"

export class SandboxError extends Schema.TaggedError<SandboxError>()("SandboxError", {
  cause: Schema.Defect()
}) {}

export class Sandbox extends Context.Service<Sandbox, {
  run(
    command: ReadonlyArray<string>
  ): Effect.Effect<{ readonly exitCode: number; readonly stdout: string }, SandboxError>
}>()("app/Sandbox") {
  static readonly layer = Layer.effect(
    Sandbox,
    Effect.gen(function*() {
      // Each area of the Engine API is its own service.
      const containers = yield* DockerContainers.DockerContainers
      const exec = yield* DockerExec.DockerExec
      const images = yield* DockerImages.DockerImages

      // A pull is a stream of the Engine's progress messages. Draining it waits
      // for the pull to finish; it fails with a `StreamFailed` reason when the
      // Engine reports an error in the middle of the stream.
      yield* images.pull("alpine:3.22").pipe(Stream.runDrain)

      // The container lives as long as the layer: `acquireRelease` removes it
      // when the layer's scope closes, also when the program is interrupted.
      const id = yield* Effect.acquireRelease(
        Effect.gen(function*() {
          const { Id } = yield* containers.create({
            Image: "alpine:3.22",
            Cmd: ["sleep", "infinity"],
            Labels: { app: "sandbox" }
          })
          yield* containers.start(Id)
          return Id
        }),
        (id) => Effect.ignore(containers.remove(id, { force: true }))
      )

      const run = Effect.fn("Sandbox.run")(
        function*(command: ReadonlyArray<string>) {
          // `run` creates an exec, starts it and collects its output.
          const result = yield* exec.run(id, command)
          return { exitCode: result.exitCode, stdout: new TextDecoder().decode(result.stdout) }
        },
        // Every operation fails with `DockerError`. Its `isRetryable` is true
        // for failures a retry can fix, such as a refused connection; nothing
        // in `effect/docker` retries on its own.
        Effect.retry({
          while: (error) => error.isRetryable,
          schedule: Schedule.exponential("100 millis"),
          times: 3
        }),
        Effect.mapError((cause) => new SandboxError({ cause }))
      )

      return Sandbox.of({ run })
    })
  ).pipe(
    // `NodeDocker.layerFromEnv` provides every Docker service, configured as
    // a bare `docker` invocation is: `DOCKER_HOST`, the current context and
    // `~/.docker/config.json`. Building it never contacts the Engine.
    Layer.provide(NodeDocker.layerFromEnv())
  )
}

export const program = Effect.gen(function*() {
  const sandbox = yield* Sandbox
  const { exitCode, stdout } = yield* sandbox.run(["uname", "-a"])
  yield* Effect.logInfo(`exit ${exitCode}: ${stdout.trim()}`)
}).pipe(Effect.provide(Sandbox.layer))
