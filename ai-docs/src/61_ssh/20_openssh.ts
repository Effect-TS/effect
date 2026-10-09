/**
 * @title Using the system OpenSSH client
 *
 * This example opens connections through the backend-independent `Ssh` factory and runs them with the host's `ssh` executable.
 */
import { NodeServices } from "@effect/platform-node"
import { Context, Effect, FileSystem, Layer, Schema } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { OpenSsh, Sftp, Ssh, SshChildProcessSpawner } from "effect/ssh"

export class BackupError extends Schema.TaggedError<BackupError>()("BackupError", {
  cause: Schema.Defect()
}) {}

// This service only depends on `Ssh`, so it works with both backends:
// `OpenSsh.layer` (the system `ssh` executable) and `SshClient.layer` (the
// built-in client).
export class Backups extends Context.Service<Backups, {
  snapshot(database: string): Effect.Effect<Uint8Array, BackupError>
}>()("docs/Backups") {
  static readonly layer = Layer.effect(
    Backups,
    Effect.gen(function*() {
      // Read the connection factory once.
      const ssh = yield* Ssh.Ssh

      const snapshot = Effect.fn("Backups.snapshot")(
        function*(database: string) {
          // Each snapshot opens its own connection, closed when it finishes.
          // With OpenSSH, `host` may be a `Host` alias from ~/.ssh/config.
          const connection = yield* ssh.connect({ host: "db-backup" })

          // Run `ChildProcess` commands on the server. Arguments are quoted for
          // the remote shell, and `kill` works even though the OpenSSH backend
          // cannot send signals over the connection.
          const remote = SshChildProcessSpawner.make(connection)

          // An SFTP session exposed as a regular `FileSystem`.
          const remoteFs = Sftp.fileSystem(yield* Sftp.make(connection))

          const path = `/var/backups/${database}.sql.gz`
          // Pass values as positional arguments instead of interpolating them
          // into the script, so they are never parsed by the remote shell.
          yield* remote.exitCode(
            ChildProcess.make("sh", ["-c", `pg_dump "$1" | gzip > "$2"`, "sh", database, path])
          )
          const data = yield* remoteFs.readFile(path)
          yield* remoteFs.remove(path)
          return data
        },
        Effect.scoped,
        Effect.mapError((cause) => new BackupError({ cause }))
      )

      return { snapshot }
    })
  )
}

// `OpenSsh.layer` provides the `Ssh` factory through the system `ssh`, so
// authentication, host keys, ProxyJump, certificates, and hardware keys come
// from the user's OpenSSH configuration. Each `connect` opens one multiplexed
// connection (`ControlMaster`) shared by every operation on it.
//
// It needs a `ChildProcessSpawner` to run `ssh` and a `FileSystem` for the
// control socket, both provided by `NodeServices.layer`.
export const OpenSshLive = OpenSsh.layer({
  options: { ServerAliveInterval: 30 }
}).pipe(Layer.provide(NodeServices.layer))

export const BackupsLive = Backups.layer.pipe(Layer.provide(OpenSshLive))

export const program = Effect.gen(function*() {
  const backups = yield* Backups
  const data = yield* backups.snapshot("orders")

  // Write the snapshot locally with the local `FileSystem`.
  const fs = yield* FileSystem.FileSystem
  yield* fs.writeFile("orders.sql.gz", data)

  // The local spawner is unaffected: only `Backups` talks to the server.
  const local = yield* ChildProcessSpawner.ChildProcessSpawner
  yield* local.exitCode(ChildProcess.make("gzip", ["-t", "orders.sql.gz"]))
}).pipe(Effect.provide(Layer.mergeAll(BackupsLive, NodeServices.layer)))
