import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import { type ChildProcess, execFile, spawn } from "node:child_process"
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises"
import { createConnection, createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

export interface Endpoint {
  readonly host: string
  readonly port: number
}

interface Credentials {
  readonly password?: string
  readonly username?: string
}

export type Reply = string | number | null | Array<Reply>

export interface RedisFixture extends Endpoint {
  readonly unixSocketPath: string | undefined
  readonly tlsPort: number | undefined
  readonly clusterBusPort: number | undefined
  readonly stop: () => Promise<void>
  readonly command: (...args: ReadonlyArray<string>) => Promise<Reply>
}

export interface RedisOptions extends Credentials {
  readonly config?: ReadonlyArray<string>
  readonly sentinel?: boolean
  readonly unixSocket?: boolean
  readonly tls?: boolean
  readonly cluster?: boolean
}

/** Starts a fixture for the current scope and stops it when the scope closes. */
export const acquire = <A extends { readonly stop: () => Promise<void> }>(
  start: () => Promise<A>
): Effect.Effect<A, never, Scope.Scope> =>
  Effect.acquireRelease(Effect.promise(start), (fixture) => Effect.promise(() => fixture.stop()))

/** An independent RESP2 client for administering fixtures. */
const command = (endpoint: Endpoint, args: ReadonlyArray<string>, credentials: Credentials = {}): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const socket = createConnection(endpoint)
    const pending = [
      ...(credentials.password === undefined ? [] : [
        credentials.username === undefined
          ? ["AUTH", credentials.password]
          : ["AUTH", credentials.username, credentials.password]
      ]),
      args
    ]
    let buffer = Buffer.alloc(0)
    const fail = (error: unknown) => {
      socket.destroy()
      reject(error)
    }
    socket.setTimeout(5_000, () => fail(new Error(`Redis administration command timed out: ${args[0]}`)))
    socket.on("error", reject)
    socket.on("end", () => reject(new Error("Redis administration socket ended before its reply")))
    socket.on("connect", () => {
      for (const values of pending) {
        socket.write(
          `*${values.length}\r\n` + values.map((value) => `$${Buffer.byteLength(value)}\r\n${value}\r\n`).join("")
        )
      }
    })
    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(data) ? data : Buffer.from(data)])
      try {
        while (true) {
          const parsed = parseReply(buffer)
          if (!parsed) return
          buffer = buffer.subarray(parsed[1])
          pending.shift()
          if (pending.length === 0) {
            socket.end()
            return resolve(parsed[0])
          }
        }
      } catch (error) {
        fail(error)
      }
    })
  })

const parseReply = (buffer: Buffer, offset = 0): readonly [Reply, number] | undefined => {
  const end = buffer.indexOf("\r\n", offset)
  if (end === -1) return
  const header = buffer.toString("utf8", offset + 1, end)
  const next = end + 2
  switch (String.fromCharCode(buffer[offset])) {
    case "+":
      return [header, next]
    case "-":
      throw new Error(header)
    case ":":
      return [Number(header), next]
    case "$": {
      const length = Number(header)
      if (length === -1) return [null, next]
      if (buffer.length < next + length + 2) return
      return [buffer.toString("utf8", next, next + length), next + length + 2]
    }
    case "*": {
      const length = Number(header)
      if (length === -1) return [null, next]
      const values: Array<Reply> = []
      let cursor = next
      for (let i = 0; i < length; i++) {
        const parsed = parseReply(buffer, cursor)
        if (!parsed) return
        values.push(parsed[0])
        cursor = parsed[1]
      }
      return [values, cursor]
    }
    default:
      throw new Error("Unexpected administration reply")
  }
}

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") return reject(new Error("No TCP address"))
      server.close((error) => error ? reject(error) : resolve(address.port))
    })
  })

/** Polls `check` until it returns true, retrying thrown errors until the timeout. */
export const waitUntil = async (check: () => Promise<boolean>, message: string, timeout = 30_000): Promise<void> => {
  const deadline = Date.now() + timeout
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      if (await check()) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`${message}${lastError ? `: ${String(lastError)}` : ""}`)
}

const quote = (value: string): string => JSON.stringify(value)
const runFile = promisify(execFile)
const redisImage = "redis:7.2.6@sha256:43c5c111b5b63afce26faea67198f8cf7e63b941460bcfe1525b68a6ad1eef92"

/** Starts `REDIS_SERVER_BIN`, falling back to the pinned Docker image with host networking. */
export const startRedis = async (options: RedisOptions = {}): Promise<RedisFixture> => {
  for (let attempt = 0;; attempt++) {
    try {
      return await startRedisOnce(options)
    } catch (error) {
      // A probed free port is not reserved, so another process may bind it first.
      if (attempt >= 4 || !/bind: Address already in use/.test(String(error))) throw error
    }
  }
}

const startRedisOnce = async (options: RedisOptions): Promise<RedisFixture> => {
  const binary = process.env.REDIS_SERVER_BIN
  if (!binary && process.platform !== "linux") {
    throw new Error("Redis Docker fixtures require Linux host networking; set REDIS_SERVER_BIN on other platforms")
  }
  const directory = await mkdtemp(join(tmpdir(), "effect-redis-"))
  const ports = new Set<number>()
  const nextPort = async () => {
    let port: number
    do port = await freePort()
    while (ports.has(port))
    ports.add(port)
    return port
  }
  const port = await nextPort()
  const unixSocketPath = options.unixSocket ? join(directory, "redis.sock") : undefined
  const tlsPort = options.tls ? await nextPort() : undefined
  const clusterBusPort = options.cluster ? await nextPort() : undefined
  if (tlsPort) {
    for (const file of ["cert.pem", "key.pem"]) {
      await copyFile(
        fileURLToPath(new URL(`../../../../platform/node/test/fixtures/tls/${file}`, import.meta.url)),
        join(directory, file)
      )
    }
  }
  const config = [
    "bind 127.0.0.1",
    `port ${port}`,
    "protected-mode no",
    "save \"\"",
    "appendonly no",
    `dir ${quote(directory)}`,
    "loglevel warning",
    ...(clusterBusPort ? [`cluster-port ${clusterBusPort}`, `cluster-announce-bus-port ${clusterBusPort}`] : []),
    ...(unixSocketPath ? [`unixsocket ${quote(unixSocketPath)}`] : []),
    ...(tlsPort ?
      [
        `tls-port ${tlsPort}`,
        `tls-cert-file ${quote(join(directory, "cert.pem"))}`,
        `tls-key-file ${quote(join(directory, "key.pem"))}`,
        "tls-auth-clients no"
      ] :
      []),
    ...(options.password ? [`requirepass ${quote(options.password)}`] : []),
    ...(options.username && options.password
      ? [`user ${quote(options.username)} on ${quote(">" + options.password)} ~* &* +@all`]
      : []),
    ...options.config ?? []
  ].join("\n")
  const path = join(directory, "redis.conf")
  await writeFile(path, config)
  const serverArgs = [path, ...options.sentinel ? ["--sentinel"] : []]
  const containerName = `effect-redis-${process.pid}-${directory.slice(directory.lastIndexOf("/") + 1)}`
  const child: ChildProcess = binary
    ? spawn(binary, serverArgs, { stdio: ["ignore", "pipe", "pipe"] })
    : spawn("docker", [
      "run",
      "--rm",
      "--name",
      containerName,
      "--network",
      "host",
      "--user",
      `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
      "--volume",
      `${directory}:${directory}`,
      "--workdir",
      directory,
      redisImage,
      "redis-server",
      ...serverArgs
    ], { stdio: ["ignore", "pipe", "pipe"] })
  let diagnostics = ""
  child.stdout?.on("data", (chunk) => diagnostics = (diagnostics + String(chunk)).slice(-16_384))
  child.stderr?.on("data", (chunk) => diagnostics = (diagnostics + String(chunk)).slice(-16_384))
  let spawnError: Error | undefined
  child.on("error", (error) => spawnError = error)
  const exited = () => spawnError !== undefined || child.exitCode !== null || child.signalCode !== null

  let stopped = false
  const stop = async () => {
    if (stopped) return
    stopped = true
    if (!binary && !spawnError) {
      await runFile("docker", ["rm", "--force", containerName], { timeout: 10_000 }).catch(() => {})
    }
    if (!exited()) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => child.kill("SIGKILL"), 2_000)
        child.once("exit", () => {
          clearTimeout(timer)
          resolve()
        })
        child.kill("SIGTERM")
      })
    }
    await rm(directory, { recursive: true, force: true })
  }

  const endpoint = { host: "127.0.0.1", port }
  const fixture: RedisFixture = {
    ...endpoint,
    unixSocketPath,
    tlsPort,
    clusterBusPort,
    stop,
    command: (...args) => command(endpoint, args, options)
  }
  try {
    await waitUntil(
      async () => exited() || await fixture.command("PING") === "PONG",
      "Could not start Redis; install Docker or set REDIS_SERVER_BIN to a redis-server executable",
      binary ? 10_000 : 90_000
    )
    if (exited()) throw spawnError ?? new Error("Redis exited during startup")
    return fixture
  } catch (error) {
    await stop()
    throw new Error(`${String(error)}\n${diagnostics}`, { cause: error })
  }
}

export interface ClusterNode extends RedisFixture {
  readonly id: string
}

export interface ClusterFixture {
  /** Primaries are `nodes[0..2]`; `nodes[i + 3]` replicates `nodes[i]`. */
  readonly nodes: ReadonlyArray<ClusterNode>
  readonly seeds: ReadonlyArray<Endpoint>
  readonly stop: () => Promise<void>
  readonly moveSlot: (slot: number, source: ClusterNode, target: ClusterNode) => Promise<void>
}

/** Starts a six-node Cluster: three primaries, each with one replica. */
export const startCluster = async (): Promise<ClusterFixture> => {
  const fixtures: Array<RedisFixture> = []
  const stop = async () => {
    await Promise.all(fixtures.map((fixture) => fixture.stop()))
  }
  const allNodes = (check: (node: ClusterNode) => Promise<boolean>) => async () =>
    (await Promise.all(nodes.map(check))).every(Boolean)
  let nodes: Array<ClusterNode> = []
  try {
    for (let i = 0; i < 6; i++) {
      fixtures.push(
        await startRedis({
          cluster: true,
          config: [
            "cluster-enabled yes",
            "cluster-config-file nodes.conf",
            "cluster-node-timeout 1000",
            "cluster-announce-ip 127.0.0.1"
          ]
        })
      )
    }
    nodes = await Promise.all(fixtures.map(async (fixture) => ({
      ...fixture,
      id: String(await fixture.command("CLUSTER", "MYID"))
    })))
    for (const node of nodes.slice(1)) {
      await nodes[0].command("CLUSTER", "MEET", node.host, String(node.port), String(node.clusterBusPort))
    }
    await waitUntil(
      allNodes(async (node) => String(await node.command("CLUSTER", "INFO")).includes("cluster_known_nodes:6")),
      "Redis Cluster members did not discover each other"
    )
    for (let i = 0; i < 3; i++) {
      const start = Math.floor(i * 16_384 / 3)
      const end = Math.floor((i + 1) * 16_384 / 3) - 1
      await nodes[i].command("CLUSTER", "ADDSLOTSRANGE", String(start), String(end))
      await nodes[i + 3].command("CLUSTER", "REPLICATE", nodes[i].id)
    }
    await waitUntil(
      allNodes(async (node) => String(await node.command("CLUSTER", "INFO")).includes("cluster_state:ok")),
      "Redis Cluster did not become ready"
    )
    await waitUntil(
      async () =>
        (await Promise.all(nodes.slice(3).map((node) => node.command("INFO", "replication"))))
          .every((info) => String(info).includes("master_link_status:up")),
      "Redis Cluster replicas did not synchronize"
    )
  } catch (error) {
    await stop()
    throw error
  }

  return {
    nodes,
    seeds: nodes.slice(0, 3).map(({ host, port }) => ({ host, port })),
    stop,
    moveSlot: async (slot, source, target) => {
      await target.command("CLUSTER", "SETSLOT", String(slot), "IMPORTING", source.id)
      await source.command("CLUSTER", "SETSLOT", String(slot), "MIGRATING", target.id)
      while (true) {
        const keys = await source.command("CLUSTER", "GETKEYSINSLOT", String(slot), "100") as Array<string>
        if (keys.length === 0) break
        await source.command("MIGRATE", target.host, String(target.port), "", "0", "5000", "KEYS", ...keys)
      }
      await Promise.all(
        nodes.slice(0, 3).map((node) => node.command("CLUSTER", "SETSLOT", String(slot), "NODE", target.id))
      )
    }
  }
}

export interface SentinelFixture {
  readonly serviceName: string
  readonly dataNodes: ReadonlyArray<RedisFixture>
  readonly sentinels: ReadonlyArray<RedisFixture>
  readonly stop: () => Promise<void>
  readonly primary: () => Promise<Endpoint>
  /** Triggers `SENTINEL FAILOVER` and resolves with the promoted primary. */
  readonly failover: () => Promise<Endpoint>
}

export interface SentinelOptions extends RedisOptions {
  readonly sentinelPassword?: string
  readonly sentinelUsername?: string
}

/** Starts one primary with two replicas, monitored by three Sentinels. */
export const startSentinel = async (options: SentinelOptions = {}): Promise<SentinelFixture> => {
  const serviceName = "effect-primary"
  const dataNodes: Array<RedisFixture> = []
  const sentinels: Array<RedisFixture> = []
  const stop = async () => {
    await Promise.all([...sentinels, ...dataNodes].map((fixture) => fixture.stop()))
  }
  try {
    dataNodes.push(await startRedis(options))
    for (let i = 0; i < 2; i++) {
      dataNodes.push(
        await startRedis({
          ...options,
          config: [
            ...options.config ?? [],
            `replicaof 127.0.0.1 ${dataNodes[0].port}`,
            ...(options.password ? [`masterauth ${quote(options.password)}`] : []),
            ...(options.username ? [`masteruser ${quote(options.username)}`] : [])
          ]
        })
      )
    }
    await waitUntil(
      async () =>
        (await Promise.all(dataNodes.slice(1).map((node) => node.command("INFO", "replication"))))
          .every((info) => String(info).includes("master_link_status:up")),
      "Sentinel data replicas did not synchronize"
    )
    for (let i = 0; i < 3; i++) {
      sentinels.push(
        await startRedis({
          sentinel: true,
          ...(options.sentinelPassword ? { password: options.sentinelPassword } : {}),
          ...(options.sentinelUsername ? { username: options.sentinelUsername } : {}),
          config: [
            `sentinel monitor ${serviceName} 127.0.0.1 ${dataNodes[0].port} 2`,
            `sentinel down-after-milliseconds ${serviceName} 1000`,
            `sentinel failover-timeout ${serviceName} 5000`,
            `sentinel parallel-syncs ${serviceName} 2`,
            ...(options.password ? [`sentinel auth-pass ${serviceName} ${quote(options.password)}`] : []),
            ...(options.username ? [`sentinel auth-user ${serviceName} ${quote(options.username)}`] : [])
          ]
        })
      )
    }
    await waitUntil(
      async () =>
        (await Promise.all(sentinels.map((node) => node.command("SENTINEL", "CKQUORUM", serviceName))))
          .every((value) => String(value).startsWith("OK")),
      "Sentinel quorum did not become ready"
    )
  } catch (error) {
    await stop()
    throw error
  }

  const primary = async () => {
    const result = await sentinels[0].command("SENTINEL", "GET-MASTER-ADDR-BY-NAME", serviceName) as Array<string>
    return { host: result[0], port: Number(result[1]) }
  }
  return {
    serviceName,
    dataNodes,
    sentinels,
    stop,
    primary,
    failover: async () => {
      const old = await primary()
      await sentinels[0].command("SENTINEL", "FAILOVER", serviceName)
      let current = old
      await waitUntil(
        async () => {
          current = await primary()
          if (current.port === old.port) return false
          const role = await command(current, ["ROLE"], options) as Array<Reply>
          return role[0] === "master"
        },
        "Sentinel did not promote and announce a new primary",
        45_000
      )
      return current
    }
  }
}
