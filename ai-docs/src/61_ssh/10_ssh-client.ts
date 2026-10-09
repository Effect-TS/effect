/**
 * @title Deploying to several hosts over SSH
 *
 * This example provides the built-in SSH client as a connection factory and opens one connection per host on demand.
 */
import { NodeServices, NodeSocket } from "@effect/platform-node"
import { Config, Context, Effect, FileSystem, Layer, Schema } from "effect"
import { ChildProcess } from "effect/process"
import { Sftp, Ssh, SshChildProcessSpawner, SshClient, SshKey, SshKnownHosts } from "effect/ssh"

export class DeployError extends Schema.TaggedError<DeployError>()("DeployError", {
  cause: Schema.Defect()
}) {}

// `SshClient.layer` provides the `Ssh` service, a connection factory. It does
// not connect: connections are opened later with `ssh.connect`, by the code
// that needs them, and close with that code's scope.
export const SshLive = Layer.unwrap(Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  // `SshKeys` and `SshKnownHosts` capture the `Crypto` service (provided by
  // `NodeServices.layer`) once, so their operations need nothing else.
  const keys = yield* SshKey.SshKeys
  const knownHosts = yield* SshKnownHosts.SshKnownHosts

  // Passphrase-protected keys are not supported directly; load them into an
  // SSH agent and use `SshClient.agent(...)` instead.
  const key = yield* keys.parsePrivateKey(yield* fs.readFileString("/home/deploy/.ssh/id_ed25519"))

  // These settings apply to every connection the factory opens.
  return SshClient.layer({
    // The transport is any `Socket.Socket`; here a TCP connection.
    makeSocket: ({ host, port }) => NodeSocket.makeNet({ host, port }),
    username: "deploy",
    auth: SshClient.publicKey(key),
    // Host keys are checked against an OpenSSH `known_hosts` file; changed or
    // unknown keys are rejected.
    verifyHostKey: knownHosts.verifier,
    // Detect dead connections instead of hanging forever.
    keepAlive: { interval: "30 seconds" }
  })
})).pipe(
  Layer.provide([SshKey.layer, SshKnownHosts.layerFromFile("/home/deploy/.ssh/known_hosts")]),
  Layer.provide(NodeServices.layer)
)

export class Deployer extends Context.Service<Deployer, {
  release(hosts: ReadonlyArray<string>, version: string, artifact: Uint8Array): Effect.Effect<void, DeployError>
}>()("docs/Deployer") {
  static readonly layer = Layer.effect(
    Deployer,
    Effect.gen(function*() {
      // Read the factory once; `connect` has no further requirements.
      const ssh = yield* Ssh.Ssh

      const releaseOn = Effect.fn("Deployer.releaseOn")(
        function*(host: string, version: string, artifact: Uint8Array) {
          // The connection lives until this effect's scope closes.
          const connection = yield* ssh.connect({ host })

          // `Sftp.fileSystem` turns an SFTP session into a regular
          // `FileSystem`, so existing file system code works against the
          // remote host.
          const remoteFs = Sftp.fileSystem(yield* Sftp.make(connection))
          const directory = `/srv/app/releases/${version}`
          yield* remoteFs.makeDirectory(directory, { recursive: true })
          yield* remoteFs.writeFile(`${directory}/app.tar.gz`, artifact)

          // `SshChildProcessSpawner` gives the `ChildProcess` API on the
          // remote host; arguments are quoted for the remote shell.
          const remote = SshChildProcessSpawner.make(connection)
          yield* remote.exitCode(ChildProcess.make("tar", ["-xzf", `${directory}/app.tar.gz`, "-C", directory]))
          yield* remote.exitCode(ChildProcess.make("ln", ["-sfn", directory, "/srv/app/current"]))

          // `connection.run` collects stdout, stderr, and the exit status.
          const restart = yield* connection.run("systemctl --user restart app")
          if (restart.exit._tag !== "ExitStatus" || restart.exit.code !== 0) {
            return yield* new DeployError({ cause: restart.stderr })
          }
        },
        Effect.scoped,
        Effect.mapError((cause) => cause instanceof DeployError ? cause : new DeployError({ cause }))
      )

      // One connection per host, opened concurrently and closed when that
      // host is done.
      const release = (hosts: ReadonlyArray<string>, version: string, artifact: Uint8Array) =>
        Effect.forEach(hosts, (host) => releaseOn(host, version, artifact), { concurrency: 4, discard: true })

      return { release }
    })
  ).pipe(Layer.provide(SshLive))
}

// Port forwarding: tunnel to a database that is only reachable from a bastion
// host (like `ssh -L`). `forwardOutSocket` returns a `Socket.Socket`, so any
// Effect protocol client that accepts a socket can use the tunnel while the
// connection's scope is open.
export const databaseTunnel = Effect.gen(function*() {
  const ssh = yield* Ssh.Ssh
  const bastion = yield* ssh.connect({ host: "bastion.example.com" })
  return bastion.forwardOutSocket({ host: "10.0.0.5", port: 5432 })
})

// Hosts can also be chosen at runtime, for example from configuration.
export const restartAll = Effect.gen(function*() {
  const hosts = (yield* Config.String("DEPLOY_HOSTS")).split(",")
  const ssh = yield* Ssh.Ssh
  yield* Effect.forEach(
    hosts,
    (host) =>
      Effect.scoped(Effect.flatMap(ssh.connect({ host }), (connection) => connection.run("systemctl restart app"))),
    { concurrency: "unbounded", discard: true }
  )
}).pipe(Effect.provide(SshLive))
