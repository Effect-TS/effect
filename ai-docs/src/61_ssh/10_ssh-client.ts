/**
 * @title Running commands and transferring files over SSH
 *
 * This example connects with a private key and `known_hosts`, runs commands, uploads files over SFTP, and tunnels a port.
 */
import { NodeFileSystem, NodeSocket } from "@effect/platform-node"
import { Config, Context, Effect, FileSystem, Layer, Schema } from "effect"
import { ChildProcess } from "effect/process"
import { Sftp, Ssh, SshChildProcessSpawner, SshClient, SshKey, SshKnownHosts } from "effect/ssh"

export class DeployError extends Schema.TaggedError<DeployError>()("DeployError", {
  cause: Schema.Defect()
}) {}

// The SSH connection is provided as a layer. The transport is any
// `Socket.Socket`; here it is a TCP connection from `@effect/platform-node`.
export const SshLive = Layer.unwrap(Effect.gen(function*() {
  const host = yield* Config.String("DEPLOY_HOST")
  const fs = yield* FileSystem.FileSystem

  // Private keys are parsed with WebCrypto. Passphrase-protected keys are not
  // supported directly; load them into an SSH agent and use
  // `SshClient.agent(...)` instead.
  const key = yield* SshKey.parsePrivateKey(yield* fs.readFileString("/home/deploy/.ssh/id_ed25519"))

  // `verifyHostKey` is required. `SshKnownHosts.fromFile` checks the server's
  // key against an OpenSSH `known_hosts` file and rejects changed keys.
  const verifyHostKey = yield* SshKnownHosts.fromFile("/home/deploy/.ssh/known_hosts")

  return SshClient.layer({
    host,
    username: "deploy",
    auth: SshClient.publicKey(key),
    verifyHostKey,
    // Detect dead connections instead of hanging forever.
    keepAlive: { interval: "30 seconds" }
  }).pipe(Layer.provide(NodeSocket.layerNet({ host, port: 22 })))
})).pipe(Layer.provide(NodeFileSystem.layer))

export class Deployer extends Context.Service<Deployer, {
  release(version: string, artifact: Uint8Array): Effect.Effect<string, DeployError>
}>()("docs/Deployer") {
  static readonly layer = Layer.effect(
    Deployer,
    Effect.gen(function*() {
      // `SshClient.layer` provides both `SshClient` and the backend-independent
      // `Ssh` service. SFTP and the remote spawner only need `Ssh`.
      const client = yield* SshClient.SshClient
      const ssh = yield* Ssh.Ssh

      // `Sftp.fileSystem` turns an SFTP session into a regular `FileSystem`,
      // so existing file system code works against the remote host.
      const remoteFs = Sftp.fileSystem(yield* Sftp.make(ssh))

      // `SshChildProcessSpawner` runs `ChildProcess` commands remotely.
      // Arguments are quoted for the remote shell.
      const remote = SshChildProcessSpawner.make(ssh)

      const release = Effect.fn("Deployer.release")(function*(version: string, artifact: Uint8Array) {
        const directory = `/srv/app/releases/${version}`
        yield* remoteFs.makeDirectory(directory, { recursive: true })
        yield* remoteFs.writeFile(`${directory}/app.tar.gz`, artifact)

        // Commands can also run through `client.run`, which collects stdout,
        // stderr, and the exit status.
        const unpack = yield* client.run(`tar -xzf app.tar.gz -C ${directory}`)
        if (unpack.exit._tag !== "ExitStatus" || unpack.exit.code !== 0) {
          return yield* new DeployError({ cause: unpack.stderr })
        }

        // Use the spawner when you want the `ChildProcess` API (pipes, cwd,
        // env, streaming output).
        yield* remote.string(ChildProcess.make("ln", ["-sfn", directory, "/srv/app/current"]))
        return yield* remote.string(ChildProcess.make("systemctl", ["--user", "restart", "app"], { cwd: directory }))
      }, Effect.mapError((cause) => cause instanceof DeployError ? cause : new DeployError({ cause })))

      return { release }
    })
  ).pipe(Layer.provide(SshLive))
}

// Port forwarding: open a channel to a database that is only reachable from
// the server (like `ssh -L`). `forwardOutSocket` returns a `Socket.Socket`, so
// any Effect protocol client that accepts a socket can use the tunnel.
export const databaseTunnel = Effect.gen(function*() {
  const client = yield* SshClient.SshClient
  return client.forwardOutSocket({ host: "10.0.0.5", port: 5432 })
})

// The remote spawner can also be provided as a layer, so code written against
// `ChildProcessSpawner` runs on the server without changes.
export const RemoteSpawnerLive = SshChildProcessSpawner.layer.pipe(Layer.provide(SshLive))
