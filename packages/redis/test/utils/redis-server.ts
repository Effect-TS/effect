import { type ChildProcess, execFile, spawn } from "node:child_process"
import { constants } from "node:fs"
import { access, copyFile, mkdtemp, rm, writeFile } from "node:fs/promises"
import { createConnection, createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

export interface Endpoint {
  readonly host: string
  readonly port: number
}

export interface Credentials {
  readonly password?: string
  readonly username?: string
}

export interface RedisFixture extends Endpoint {
  readonly directory: string
  readonly unixSocketPath: string | undefined
  readonly tlsPort: number | undefined
  readonly clusterBusPort: number | undefined
  readonly process: ChildProcess
  readonly stop: () => Promise<void>
  readonly command: (...args: ReadonlyArray<string>) => Promise<Reply>
}

export type Reply = string | number | null | Array<Reply>

/** An independent, deliberately small RESP2 administration client. */
export const command = (
  endpoint: Endpoint,
  args: ReadonlyArray<string>,
  credentials: Credentials = {}
): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const socket = createConnection(endpoint)
    let buffer = Buffer.alloc(0)
    let authenticated = credentials.password === undefined
    const send = (values: ReadonlyArray<string>) => {
      socket.write(Buffer.concat([
        Buffer.from(`*${values.length}\r\n`),
        ...values.flatMap((value) => {
          const data = Buffer.from(value)
          return [Buffer.from(`$${data.length}\r\n`), data, Buffer.from("\r\n")]
        })
      ]))
    }
    const fail = (error: Error) => {
      socket.destroy()
      reject(error)
    }
    socket.setTimeout(5_000, () => fail(new Error(`Redis administration command timed out: ${args[0]}`)))
    socket.on("error", reject)
    socket.on("connect", () => {
      if (authenticated) send(args)
      else {send(
          credentials.username ? ["AUTH", credentials.username, credentials.password!] : ["AUTH", credentials.password!]
        )}
    })
    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(data) ? data : Buffer.from(data)])
      try {
        const parsed = parseReply(buffer)
        if (!parsed) return
        buffer = buffer.subarray(parsed[1])
        if (!authenticated) {
          authenticated = true
          send(args)
        } else {
          socket.end()
          resolve(parsed[0])
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)))
      }
    })
    socket.on("end", () => reject(new Error("Redis administration socket ended before its reply")))
  })

const parseReply = (buffer: Buffer, offset = 0): readonly [Reply, number] | undefined => {
  const end = buffer.indexOf("\r\n", offset)
  if (end === -1) return
  const header = buffer.toString("utf8", offset + 1, end)
  const next = end + 2
  switch (buffer[offset]) {
    case 43:
      return [header, next]
    case 45:
      throw new Error(header)
    case 58:
      return [Number(header), next]
    case 36: {
      const length = Number(header)
      if (length === -1) return [null, next]
      if (buffer.length < next + length + 2) return
      return [buffer.toString("utf8", next, next + length), next + length + 2]
    }
    case 42: {
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

export const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") return reject(new Error("No TCP address"))
      server.close((error) => error ? reject(error) : resolve(address.port))
    })
  })

export const waitUntil = async (
  check: () => Promise<boolean>,
  message: string,
  timeout = 30_000,
  retryError?: () => boolean
): Promise<void> => {
  const deadline = Date.now() + timeout
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      if (await check()) return
    } catch (error) {
      if (retryError && !retryError()) throw error
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`${message}${lastError ? `: ${String(lastError)}` : ""}`)
}

export interface RedisOptions extends Credentials {
  readonly binary?: string
  readonly port?: number
  readonly config?: ReadonlyArray<string>
  readonly sentinel?: boolean
  readonly unixSocket?: boolean
  readonly tls?: boolean
  readonly cluster?: boolean
}

const quote = (value: string): string => JSON.stringify(value)
const runFile = promisify(execFile)
export const redisImage = "redis:7.2.6@sha256:43c5c111b5b63afce26faea67198f8cf7e63b941460bcfe1525b68a6ad1eef92"

const findBinary = async (): Promise<string | undefined> => {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const path = join(directory, "redis-server")
    try {
      await access(path, constants.X_OK)
      return path
    } catch {
      // Continue searching PATH before choosing Docker.
    }
  }
  return undefined
}

export const startRedis = async (options: RedisOptions = {}): Promise<RedisFixture> => {
  for (let attempt = 0;; attempt++) {
    try {
      return await startRedisOnce(options)
    } catch (error) {
      // Closing an ephemeral-port probe cannot reserve the port until Redis
      // binds it, especially while Docker starts. Retry only bind collisions
      // for automatically allocated ports; explicit endpoints must stay fixed.
      if (options.port !== undefined || attempt >= 4 || !/bind: Address already in use/.test(String(error))) throw error
    }
  }
}

const startRedisOnce = async (options: RedisOptions): Promise<RedisFixture> => {
  const binary = options.binary ?? process.env.REDIS_SERVER_BIN ??
    (process.env.REDIS_TEST_IMAGE ? undefined : await findBinary())
  if (!binary && process.platform !== "linux") {
    throw new Error("Redis Docker fixtures require Linux host networking; set REDIS_SERVER_BIN on other platforms")
  }
  const directory = await mkdtemp(join(tmpdir(), "effect-redis-"))
  const port = options.port ?? await freePort()
  const allocated = new Set([port])
  const nextPort = async () => {
    let candidate: number
    do candidate = await freePort()
    while (allocated.has(candidate))
    allocated.add(candidate)
    return candidate
  }
  const endpoint = { host: "127.0.0.1", port }
  const unixSocketPath = options.unixSocket ? join(directory, "redis.sock") : undefined
  const tlsPort = options.tls ? await nextPort() : undefined
  const clusterBusPort = options.cluster ? await nextPort() : undefined
  if (tlsPort) {
    await copyFile(
      fileURLToPath(new URL("../../../platform/node/test/fixtures/tls/cert.pem", import.meta.url)),
      join(directory, "cert.pem")
    )
    await copyFile(
      fileURLToPath(new URL("../../../platform/node/test/fixtures/tls/key.pem", import.meta.url)),
      join(directory, "key.pem")
    )
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
  const containerName = `effect-redis-${process.pid}-${directory.slice(directory.lastIndexOf("/") + 1)}`
  const serverArgs = [path, ...options.sentinel ? ["--sentinel"] : []]
  const child = binary
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
      process.env.REDIS_TEST_IMAGE ?? redisImage,
      "redis-server",
      ...serverArgs
    ], { stdio: ["ignore", "pipe", "pipe"] })
  const spawned = new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve)
    child.once("error", reject)
  })
  let diagnostics = ""
  child.stdout?.on("data", (chunk) => diagnostics = (diagnostics + String(chunk)).slice(-16_384))
  child.stderr?.on("data", (chunk) => diagnostics = (diagnostics + String(chunk)).slice(-16_384))
  let spawnError: Error | undefined
  child.on("error", (error) => spawnError = error)
  let stopped = false
  const removeContainer = async () => {
    if (binary || spawnError) return
    try {
      await runFile("docker", ["rm", "--force", containerName], { timeout: 10_000 })
    } catch (error) {
      if (!String(error).includes("No such container")) throw error
    }
  }
  const terminate = async () => {
    if (child.exitCode !== null || child.signalCode !== null || spawnError) return
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => child.kill("SIGKILL"), 2_000)
      child.once("exit", () => {
        clearTimeout(timer)
        resolve()
      })
      child.kill("SIGTERM")
    })
  }
  const stop = async () => {
    if (stopped) return
    stopped = true
    try {
      // Try to stop the server while its Docker CLI can still report exit.
      await removeContainer().catch(() => {})
    } finally {
      try {
        await terminate()
      } finally {
        try {
          // A slow Docker create may have completed after the first removal.
          // Failure here is reported, but cannot bypass local cleanup.
          await removeContainer()
        } finally {
          await rm(directory, { recursive: true, force: true })
        }
      }
    }
  }

  const fixture = {
    ...endpoint,
    directory,
    unixSocketPath,
    tlsPort,
    clusterBusPort,
    process: child,
    stop,
    command: (...args: ReadonlyArray<string>) => command(endpoint, args, options)
  }
  try {
    await spawned
    await waitUntil(
      async () => {
        if (spawnError) throw spawnError
        if (child.exitCode !== null) throw new Error(`Redis exited: ${diagnostics}`)
        return await fixture.command("PING") === "PONG"
      },
      `Could not start Redis; install Docker or set REDIS_SERVER_BIN to a redis-server executable`,
      binary ? 10_000 : 90_000,
      () => !spawnError && child.exitCode === null
    )
    return fixture
  } catch (error) {
    await stop()
    throw new Error(`${String(error)}\n${diagnostics}`, { cause: error })
  }
}

export interface ClusterNode extends RedisFixture {
  readonly id: string
  readonly initialRole: "primary" | "replica"
}

export interface ClusterFixture {
  readonly nodes: ReadonlyArray<ClusterNode>
  readonly seeds: ReadonlyArray<Endpoint>
  readonly stop: () => Promise<void>
  readonly moveSlot: (slot: number, source: ClusterNode, target: ClusterNode) => Promise<void>
  readonly failover: (replica: ClusterNode) => Promise<void>
}

export const startCluster = async (options: RedisOptions = {}): Promise<ClusterFixture> => {
  const fixtures: Array<RedisFixture> = []
  const stop = async () => {
    await Promise.all(fixtures.map((fixture) => fixture.stop()))
  }
  try {
    for (let i = 0; i < 6; i++) {
      fixtures.push(
        await startRedis({
          ...options,
          cluster: true,
          config: [
            ...options.config ?? [],
            "cluster-enabled yes",
            "cluster-config-file nodes.conf",
            "cluster-node-timeout 1000",
            "cluster-announce-ip 127.0.0.1",
            ...(options.password ? [`masterauth ${quote(options.password)}`] : []),
            ...(options.username ? [`masteruser ${quote(options.username)}`] : [])
          ]
        })
      )
    }
    const nodes: Array<ClusterNode> = await Promise.all(fixtures.map(async (fixture, i) => ({
      ...fixture,
      id: String(await fixture.command("CLUSTER", "MYID")),
      initialRole: i < 3 ? "primary" : "replica"
    })))
    for (let i = 1; i < nodes.length; i++) {
      const node = nodes[i]
      await nodes[0].command("CLUSTER", "MEET", node.host, String(node.port), String(node.clusterBusPort))
    }
    await waitUntil(async () => {
      const result = await Promise.all(nodes.map((node) => node.command("CLUSTER", "INFO")))
      return result.every((info) => String(info).includes("cluster_known_nodes:6"))
    }, "Redis Cluster members did not discover each other")
    for (let i = 0; i < 3; i++) {
      const start = Math.floor(i * 16_384 / 3)
      const end = Math.floor((i + 1) * 16_384 / 3) - 1
      await nodes[i].command("CLUSTER", "ADDSLOTSRANGE", String(start), String(end))
      await nodes[i + 3].command("CLUSTER", "REPLICATE", nodes[i].id)
    }
    await waitUntil(async () => {
      const result = await Promise.all(nodes.map((node) => node.command("CLUSTER", "INFO")))
      return result.every((info) => String(info).includes("cluster_state:ok"))
    }, "Redis Cluster did not become ready")
    await waitUntil(async () => {
      const result = await Promise.all(nodes.slice(3).map((node) => node.command("INFO", "replication")))
      return result.every((info) => String(info).includes("master_link_status:up"))
    }, "Redis Cluster replicas did not synchronize")
    const slotOwners = async (node: ClusterNode): Promise<Array<string>> => {
      const slots = await node.command("CLUSTER", "SLOTS") as Array<Array<Reply>>
      const owners = Array<string>(16_384).fill("")
      for (const [start, end, primary] of slots) {
        const id = (primary as Array<Reply>)[2] as string
        owners.fill(id, start as number, (end as number) + 1)
      }
      return owners
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
          await source.command(
            "MIGRATE",
            target.host,
            String(target.port),
            "",
            "0",
            "5000",
            ...(options.password ? ["AUTH", options.password] : []),
            "KEYS",
            ...keys
          )
        }
        await Promise.all(
          nodes.slice(0, 3).map((node) => node.command("CLUSTER", "SETSLOT", String(slot), "NODE", target.id))
        )
        // Replicas learn ownership through cluster gossip, independently of
        // replication. Wait before a subsequent promotion can claim this slot.
        await waitUntil(async () => {
          const owners = await Promise.all(nodes.map(slotOwners))
          return owners.every((ownership) => ownership[slot] === target.id)
        }, "Redis Cluster slot migration did not converge")
      },
      failover: async (replica) => {
        const previousRole = await replica.command("ROLE") as Array<Reply>
        const primary = nodes.find((node) => node.port === previousRole[2])
        if (previousRole[0] !== "slave" || !primary) throw new Error("Expected a Redis Cluster replica")
        const expectedOwners = (await slotOwners(primary)).map((id) => id === primary.id ? replica.id : id)
        await replica.command("CLUSTER", "FAILOVER")
        await waitUntil(async () => {
          const role = await replica.command("ROLE") as Array<Reply>
          return role[0] === "master"
        }, "Redis Cluster replica was not promoted")
        // ROLE changes before every node has applied the new ownership epoch.
        // A client command during that gap can correctly receive CLUSTERDOWN.
        await waitUntil(async () => {
          const states = await Promise.all(nodes.map(async (node) => ({
            info: String(await node.command("CLUSTER", "INFO")),
            owners: await slotOwners(node)
          })))
          const oldRole = await primary.command("ROLE") as Array<Reply>
          return oldRole[0] === "slave" && oldRole[2] === replica.port &&
            states.every(({ info, owners }) =>
              info.includes("cluster_state:ok") &&
              owners.every((id, slot) => id !== "" && id === expectedOwners[slot])
            )
        }, "Redis Cluster promotion did not converge")
      }
    }
  } catch (error) {
    await stop()
    throw error
  }
}

export interface SentinelFixture {
  readonly serviceName: string
  readonly dataNodes: ReadonlyArray<RedisFixture>
  readonly sentinels: ReadonlyArray<RedisFixture>
  readonly stop: () => Promise<void>
  readonly primary: () => Promise<Endpoint>
  readonly failover: () => Promise<Endpoint>
  readonly killPrimary: () => Promise<Endpoint>
}

export interface SentinelOptions extends RedisOptions {
  readonly sentinelPassword?: string
  readonly sentinelUsername?: string
  readonly serviceName?: string
}

export const startSentinel = async (options: SentinelOptions = {}): Promise<SentinelFixture> => {
  const serviceName = options.serviceName ?? "effect-primary"
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
    await waitUntil(async () => {
      const result = await Promise.all(dataNodes.slice(1).map((node) => node.command("INFO", "replication")))
      return result.every((info) => String(info).includes("master_link_status:up"))
    }, "Sentinel data replicas did not synchronize")
    for (let i = 0; i < 3; i++) {
      sentinels.push(
        await startRedis({
          ...(options.binary ? { binary: options.binary } : {}),
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
    await waitUntil(async () => {
      const result = await Promise.all(sentinels.map((node) => node.command("SENTINEL", "CKQUORUM", serviceName)))
      return result.every((value) => String(value).startsWith("OK"))
    }, "Sentinel quorum did not become ready")
    const primary = async () => {
      const result = await sentinels[0].command("SENTINEL", "GET-MASTER-ADDR-BY-NAME", serviceName) as Array<string>
      return { host: result[0], port: Number(result[1]) }
    }
    const waitForPromotion = async (old: Endpoint): Promise<Endpoint> => {
      let current = old
      await waitUntil(
        async () => {
          current = await primary()
          if (current.port === old.port) return false
          const result = await command(current, ["ROLE"], options) as Array<Reply>
          return result[0] === "master"
        },
        "Sentinel did not promote and announce a new primary",
        45_000
      )
      return current
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
        return waitForPromotion(old)
      },
      killPrimary: async () => {
        const old = await primary()
        const node = dataNodes.find((node) => node.port === old.port)
        if (!node) throw new Error("Sentinel selected an unknown primary")
        await node.stop()
        return waitForPromotion(old)
      }
    }
  } catch (error) {
    await stop()
    throw error
  }
}
