import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { execFile } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { promisify } from "node:util"

const run = promisify(execFile)

/** Uses Docker by default, or an isolated native server when POSTGRES_SERVER_BIN is set. */
export const startPostgres = async () => {
  const binary = process.env.POSTGRES_SERVER_BIN
  if (binary === undefined) return new PostgreSqlContainer("postgres:alpine").start()

  const directory = await mkdtemp(join(tmpdir(), "effect-postgres-"))
  const data = join(directory, "data")
  const password = "effect-test"
  const passwordFile = join(directory, "password")
  const pgctl = join(dirname(binary), "pg_ctl")
  let started = false
  const stop = async () => {
    try {
      if (started) await run(pgctl, ["-D", data, "-m", "immediate", "-w", "stop"], { timeout: 15_000 })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }
  try {
    const port = await new Promise<number>((resolve, reject) => {
      const server = createServer()
      server.once("error", reject)
      server.listen(0, "127.0.0.1", () => {
        const address = server.address()
        if (address === null || typeof address === "string") {
          server.close(() => reject(new Error("Could not allocate a PostgreSQL port")))
          return
        }
        server.close((error) => error ? reject(error) : resolve(address.port))
      })
    })
    await writeFile(passwordFile, password, { mode: 0o600 })
    await run(join(dirname(binary), "initdb"), [
      "-D",
      data,
      "--username=effect",
      `--pwfile=${passwordFile}`,
      "--auth-local=trust",
      "--auth-host=scram-sha-256",
      "--encoding=UTF8",
      "--no-locale"
    ], { timeout: 15_000 })
    started = true
    await run(pgctl, [
      "-D",
      data,
      "-l",
      join(directory, "postgres.log"),
      "-w",
      "-t",
      "15",
      "start",
      "-o",
      `-h 127.0.0.1 -p ${port} -k ${directory} -c fsync=off -c max_connections=100`
    ], { timeout: 20_000 })
    return {
      getConnectionUri: () => `postgres://effect:${password}@127.0.0.1:${port}/postgres`,
      getHost: () => "127.0.0.1",
      getMappedPort: (_port: number) => port,
      getUsername: () => "effect",
      getPassword: () => password,
      getDatabase: () => "postgres",
      stop
    }
  } catch (error) {
    await stop().catch(() => {})
    throw error
  }
}
