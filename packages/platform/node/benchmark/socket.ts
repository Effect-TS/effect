/**
 * Socket throughput benchmarks for `effect/unstable/socket/Socket`.
 *
 * Measures round-trip echo throughput (messages/sec and MB/sec) of the Effect
 * Socket implementations against the raw transports they wrap, so Socket
 * regressions become visible:
 *
 * - `net`         raw `node:net` client against a raw `node:net` echo server
 * - `socket-tcp`  Effect socket (`NodeSocket.makeNet`) against the same server
 * - `ws`          raw `ws` WebSocket client against a raw `ws` echo server
 * - `socket-ws`   Effect socket (`Socket.makeWebSocket`, `ws` constructor)
 *                 against the same server
 *
 * Works on both the push-based (`runRaw`) and pull-based (`reader`/`writer`)
 * Socket revisions: the read API is detected from the acquired socket. To
 * compare revisions, run the script once per revision and diff the tables.
 *
 * Usage:
 *
 * ```
 * pnpm --filter @effect/platform-node exec node benchmark/socket.ts
 * pnpm --filter @effect/platform-node exec node benchmark/socket.ts --rounds 7 --label pr-7487
 * ```
 */
import { execSync } from "node:child_process"
import * as Net from "node:net"
import * as os from "node:os"

import { NodeSocket } from "@effect/platform-node"
import * as Effect from "effect/Effect"
import * as Latch from "effect/Latch"
import type * as Scope from "effect/Scope"
import * as Socket from "effect/unstable/socket/Socket"

interface EchoServer {
  readonly port: number
  readonly close: () => Promise<void>
}

function listenTcpEcho(): Promise<EchoServer> {
  return new Promise((resolve) => {
    const server = Net.createServer((conn) => {
      conn.setNoDelay(true)
      let queue: Array<Buffer> = []
      const flush = () => {
        while (queue.length > 0) {
          const chunk = queue[0]
          if (!conn.write(chunk)) break
          queue.shift()
        }
      }
      conn.on("data", (chunk) => {
        queue.push(chunk)
        flush()
      })
      conn.on("drain", () => {
        flush()
      })
      // clients may destroy as soon as their last byte arrives
      conn.on("error", () => undefined)
    })
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as Net.AddressInfo).port
      resolve({ port, close: () => new Promise((done) => server.close(() => done())) })
    })
  })
}

// Imported through NodeSocket's re-export so the benchmark adds no new dependency.
const { NodeWS } = NodeSocket

function listenWsEcho(): Promise<EchoServer> {
  return new Promise((resolve) => {
    const server = new NodeWS.WebSocketServer({
      host: "127.0.0.1",
      port: 0,
      perMessageDeflate: false
    }, () => {
      const address = server.address() as Net.AddressInfo
      server.on("connection", (socket) => {
        socket.on("message", (data) => {
          socket.send(data)
        })
      })
      resolve({
        port: address.port,
        close: () => new Promise((done) => server.close(() => done()))
      })
    })
  })
}

type FrameData = string | Uint8Array | ArrayBuffer

async function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${what} timed out after 180s`)), 180_000)
      })
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

// TCP passes count bytes; frames coalesce, so byte totals are exact.
async function netPass(port: number, size: number, count: number): Promise<number> {
  const message = Buffer.alloc(size, 0x61)
  const totalBytes = size * count
  return new Promise<number>((resolvePass, rejectPass) => {
    let sentCount = 0
    let receivedBytes = 0
    let started = false
    let t0 = 0

    const client = Net.connect({ host: "127.0.0.1", port, noDelay: true })
    const fail = (cause: Error) => {
      if (!started || receivedBytes < totalBytes) rejectPass(cause)
    }

    client.once("error", fail)

    const pump = () => {
      while (sentCount < count && client.write(message)) {
        sentCount++
      }
    }

    client.once("connect", () => {
      started = true
      t0 = performance.now()
      pump()
    })

    client.on("drain", () => {
      if (started) pump()
    })

    client.on("data", (chunk: Buffer) => {
      receivedBytes += chunk.byteLength
      if (receivedBytes >= totalBytes) {
        const elapsed = performance.now() - t0
        client.destroy()
        resolvePass(elapsed)
      }
    })
  })
}

function wsPass(port: number, size: number, count: number): Promise<number> {
  const message = Buffer.alloc(size, 0x61)
  return new Promise<number>((resolvePass, rejectPass) => {
    let receivedFrames = 0
    let completed = false

    const client = new NodeWS.WebSocket(`ws://127.0.0.1:${port}`, {
      perMessageDeflate: false
    } as NodeWS.ClientOptions)
    client.once("error", rejectPass)
    client.once("open", () => {
      const t0 = performance.now()
      client.on("message", () => {
        receivedFrames++
        if (receivedFrames === count && !completed) {
          completed = true
          client.terminate()
          resolvePass(performance.now() - t0)
        }
      })
      for (let i = 0; i < count; i++) {
        client.send(message)
      }
    })
    client.once("close", () => {
      if (!completed) rejectPass(new Error("closed before completion"))
    })
  })
}

const isPushApi = (socket: Socket.Socket): boolean => "runRaw" in socket

const effectTcpPass = (options: {
  readonly port: number
  readonly size: number
  readonly count: number
}): Effect.Effect<number> =>
  Effect.scoped(Effect.gen(function*() {
    const { port, size, count } = options
    const socket = yield* NodeSocket.makeNet({ host: "127.0.0.1", port, noDelay: true } as never)
    const latch = Latch.makeUnsafe(false)
    const totalBytes = size * count

    let received = 0
    let consume: Effect.Effect<void, unknown, never>
    if (isPushApi(socket)) {
      const runRaw = (socket as any).runRaw as (
        handler: (data: FrameData) => void
      ) => Effect.Effect<void, unknown, never>
      consume = runRaw((data) => {
        received += data.byteLength
        if (received >= totalBytes) latch.openUnsafe()
      })
    } else {
      // Pull-based revision; `readerBytes` does not exist on the push revision.
      const readerBytes = (Socket as any).readerBytes as (
        self: Socket.Socket
      ) => Effect.Effect<any, unknown, Scope.Scope>
      consume = Effect.gen(function*() {
        const pull = yield* readerBytes(socket)
        while (!latch.isOpen()) {
          for (const frame of (yield* pull) as ReadonlyArray<Uint8Array>) {
            received += frame.byteLength
            if (received >= totalBytes) {
              latch.openUnsafe()
              break
            }
          }
        }
      }) as Effect.Effect<void, unknown, never>
    }

    yield* Effect.forkChild(consume)
    yield* Effect.yieldNow

    const t0 = performance.now()
    const message = Buffer.alloc(size, 0x61)
    if (isPushApi(socket)) {
      const write = yield* (socket as any).writer as Effect.Effect<
        (chunk: Uint8Array) => Effect.Effect<void, unknown>,
        never,
        Scope.Scope
      >
      for (let i = 0; i < count; i++) {
        yield* write(message)
      }
    } else {
      const writer = yield* socket.writer as any
      for (let i = 0; i < count; i++) {
        yield* writer.write(message)
      }
    }
    yield* latch.await
    return performance.now() - t0
  }))

const effectWsPass = (options: {
  readonly url: string
  readonly size: number
  readonly count: number
}): Effect.Effect<number> =>
  Effect.scoped(Effect.gen(function*() {
    const { url, size, count } = options
    const makeWebSocket = (Socket as any).makeWebSocket as (
      url: string
    ) => Effect.Effect<any, unknown, Socket.WebSocketConstructor>
    const socket = yield* makeWebSocket(url)
    const push = isPushApi(socket)
    const latch = Latch.makeUnsafe(false)
    let receivedFrames = 0
    let receivedBytes = 0

    let consume: Effect.Effect<void, unknown, never>
    if (push) {
      const runRaw = (socket as any).runRaw as (
        handler: (data: FrameData) => void
      ) => Effect.Effect<void, unknown, never>
      consume = runRaw(() => {
        receivedFrames++
        if (receivedFrames === count) latch.openUnsafe()
      })
    } else {
      const readerBytes = (Socket as any).readerBytes as (
        self: Socket.Socket
      ) => Effect.Effect<any, unknown, Scope.Scope>
      consume = Effect.gen(function*() {
        const pull = yield* readerBytes(socket)
        while (!latch.isOpen()) {
          for (const frame of (yield* pull) as ReadonlyArray<Uint8Array>) {
            receivedBytes += frame.byteLength
            receivedFrames++
            if (receivedFrames === count) {
              latch.openUnsafe()
              break
            }
          }
        }
      }) as Effect.Effect<void, unknown, never>
    }

    yield* Effect.forkChild(consume)
    yield* Effect.yieldNow

    const t0 = performance.now()
    const message = Buffer.alloc(size, 0x61)
    if (push) {
      const write = yield* (socket as any).writer as Effect.Effect<
        (chunk: Uint8Array) => Effect.Effect<void, unknown>,
        never,
        Scope.Scope
      >
      for (let i = 0; i < count; i++) {
        yield* write(message)
      }
    } else {
      const writer = yield* socket.writer as any
      for (let i = 0; i < count; i++) {
        yield* writer.write(message)
      }
    }
    yield* latch.await
    void receivedBytes
    return performance.now() - t0
  })).pipe(
    Effect.provide(NodeSocket.layerWebSocketConstructorWS)
  )

interface Arm {
  readonly name: string
  readonly baselineOf?: string
  readonly pass: (tcpPort: number, wsPort: number, size: number, count: number) => Promise<number>
}

const arms: ReadonlyArray<Arm> = [
  { name: "net", pass: (tcpPort, _wsPort, size, count) => netPass(tcpPort, size, count) },
  {
    name: "socket-tcp",
    baselineOf: "net",
    pass: (tcpPort, _wsPort, size, count) =>
      withTimeout(Effect.runPromise(effectTcpPass({ port: tcpPort, size, count })), "socket-tcp")
  },
  { name: "ws", pass: (_tcpPort, wsPort, size, count) => withTimeout(wsPass(wsPort, size, count), "ws") },
  {
    name: "socket-ws",
    baselineOf: "ws",
    pass: (_tcpPort, wsPort, size, count) =>
      withTimeout(
        Effect.runPromise(effectWsPass({ url: `ws://127.0.0.1:${wsPort}`, size, count })),
        "socket-ws"
      )
  }
]

interface Config {
  readonly name: string
  readonly size: number
  readonly count: number
}

const configs: ReadonlyArray<Config> = [
  { name: "64B x 20000", size: 64, count: 20_000 },
  { name: "4KiB x 5000", size: 4096, count: 5_000 }
]

const median = (values: ReadonlyArray<number>): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

const fmtInt = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

let label: string
const labelIndex = process.argv.indexOf("--label")
if (labelIndex !== -1 && process.argv[labelIndex + 1] !== undefined) {
  label = process.argv[labelIndex + 1]
} else if (process.env.SOCKET_BENCH_LABEL !== undefined) {
  label = process.env.SOCKET_BENCH_LABEL
} else {
  label = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim()
}

const roundsIndex = process.argv.indexOf("--rounds")
const rounds = roundsIndex !== -1 ? Number(process.argv[roundsIndex + 1]) || 5 : 5

console.log(`# label=${label} node=${process.version} platform=${process.platform}`)
console.log(`# cpu=${os.cpus()[0]?.model ?? "unknown"} rounds=${rounds}`)

for (const config of configs) {
  const tcpEcho = await listenTcpEcho()
  const wsEcho = await listenWsEcho()

  for (const arm of arms) {
    await arm.pass(tcpEcho.port, wsEcho.port, config.size, Math.max(config.count >> 2, 100))
  }

  const samples = new Map<string, Array<number>>(arms.map((arm) => [arm.name, []]))
  for (let round = 0; round < rounds; round++) {
    for (const arm of arms) {
      const elapsed = await arm.pass(tcpEcho.port, wsEcho.port, config.size, config.count)
      samples.get(arm.name)!.push(elapsed)
    }
  }

  console.log(`\n## ${config.name} (${fmtInt(config.count)} messages)`)
  console.log("arm           median ms     msg/s     MB/s   vs baseline")
  for (const arm of arms) {
    const values = samples.get(arm.name)!
    const med = median(values)
    const msgsPerSec = config.count / (med / 1000)
    const mbPerSec = (config.count * config.size) / 1e6 / (med / 1000)
    let comparison = ""
    if (arm.baselineOf !== undefined) {
      const baseMed = median(samples.get(arm.baselineOf)!)
      comparison = `${(msgsPerSec / (config.count / (baseMed / 1000))).toFixed(2)}x of ${arm.baselineOf}`
    }
    console.log(
      `${arm.name.padEnd(13)} ${med.toFixed(1).padStart(9)} ${fmtInt(msgsPerSec).padStart(10)} ${
        mbPerSec.toFixed(1).padStart(8)
      }   ${comparison}`
    )
  }

  await tcpEcho.close()
  await wsEcho.close()
}
