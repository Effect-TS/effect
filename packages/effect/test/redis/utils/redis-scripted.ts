import { createServer, type Socket } from "node:net"
import type { Endpoint } from "./redis-server.ts"

export interface Barrier<A> {
  readonly promise: Promise<A>
  readonly resolve: (value: A) => void
  readonly reject: (reason: unknown) => void
}

export const barrier = <A = void>(): Barrier<A> => {
  let resolve!: (value: A) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<A>((success, failure) => {
    resolve = success
    reject = failure
  })
  return { promise, resolve, reject }
}

export interface Request {
  readonly args: ReadonlyArray<Buffer>
  readonly connection: Connection
}

export interface Connection {
  readonly socket: Socket
  readonly number: number
  readonly send: (wire: string | Uint8Array) => void
  readonly disconnect: () => void
  /** Resolves once the socket has closed. */
  readonly closed: Promise<void>
}

export interface ScriptedRedis extends Endpoint {
  readonly connections: ReadonlyArray<Connection>
  readonly nextRequest: () => Promise<Request>
  readonly stop: () => Promise<void>
}

/** Decodes only client array-of-bulk commands, independently of the production codec. */
const request = (buffer: Buffer): readonly [ReadonlyArray<Buffer>, number] | undefined => {
  const headerEnd = buffer.indexOf("\r\n")
  if (headerEnd < 0) return
  if (buffer[0] !== 42) throw new Error("Expected a command array")
  const count = Number(buffer.toString("ascii", 1, headerEnd))
  if (!Number.isInteger(count) || count < 0 || count > 100_000) throw new Error("Invalid command array length")
  let cursor = headerEnd + 2
  const args: Array<Buffer> = []
  for (let i = 0; i < count; i++) {
    const end = buffer.indexOf("\r\n", cursor)
    if (end < 0) return
    if (buffer[cursor] !== 36) throw new Error("Expected a bulk argument")
    const length = Number(buffer.toString("ascii", cursor + 1, end))
    if (!Number.isInteger(length) || length < 0 || length > 64 * 1024 * 1024) throw new Error("Invalid argument length")
    cursor = end + 2
    if (buffer.length < cursor + length + 2) return
    if (buffer[cursor + length] !== 13 || buffer[cursor + length + 1] !== 10) {
      throw new Error("Missing argument terminator")
    }
    args.push(Buffer.from(buffer.subarray(cursor, cursor + length)))
    cursor += length + 2
  }
  return [args, cursor]
}

export const startScriptedRedis = async (
  handle?: (request: Request) => void | Promise<void>
): Promise<ScriptedRedis> => {
  const connections: Array<Connection> = []
  const queued: Array<Request> = []
  const waiting: Array<Barrier<Request>> = []
  let stopped = false
  let failure: unknown
  const fail = (error: unknown) => {
    failure = error
    for (const waiter of waiting.splice(0)) waiter.reject(error)
  }
  const server = createServer((socket) => {
    const connection: Connection = {
      socket,
      number: connections.length,
      send: (wire) => socket.write(wire),
      disconnect: () => socket.destroy(),
      closed: new Promise((resolve) => socket.once("close", () => resolve()))
    }
    connections.push(connection)
    let buffer = Buffer.alloc(0)
    socket.on("error", () => {})
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)])
      try {
        while (true) {
          const parsed = request(buffer)
          if (!parsed) break
          buffer = buffer.subarray(parsed[1])
          const value = { args: parsed[0], connection }
          if (handle) Promise.resolve(handle(value)).catch(fail)
          else {
            const waiter = waiting.shift()
            if (waiter) waiter.resolve(value)
            else queued.push(value)
          }
        }
      } catch (error) {
        fail(error)
        socket.destroy()
      }
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("No scripted Redis TCP address")
  return {
    host: "127.0.0.1",
    port: address.port,
    connections,
    nextRequest: () => {
      if (failure) return Promise.reject(failure)
      if (stopped) return Promise.reject(new Error("Scripted Redis has stopped"))
      const value = queued.shift()
      if (value) return Promise.resolve(value)
      const waiter = barrier<Request>()
      waiting.push(waiter)
      return waiter.promise
    },
    stop: async () => {
      if (stopped) return
      stopped = true
      fail(new Error("Scripted Redis has stopped"))
      for (const connection of connections) connection.disconnect()
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
  }
}

export const bulk = (value: string | Uint8Array): Buffer => {
  const data = Buffer.from(value)
  return Buffer.concat([Buffer.from(`$${data.length}\r\n`), data, Buffer.from("\r\n")])
}

export const array = (...values: ReadonlyArray<string | Uint8Array>): Buffer =>
  Buffer.concat([Buffer.from(`*${values.length}\r\n`), ...values.map(bulk)])
