import * as Connection from "#tds/tdsConnection"
import { responseKey } from "#tds/tdsNtlm"
import * as Packet from "#tds/tdsPacket"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Fiber } from "effect"
import { Buffer } from "node:buffer"
import { createHmac } from "node:crypto"
import * as Dgram from "node:dgram"
import * as Net from "node:net"

const done = (status = 0) => {
  const b = Buffer.alloc(13)
  b[0] = 0xfd
  b.writeUInt16LE(status, 1)
  return b
}
const login = Buffer.concat([Buffer.from("ad0a0001740000040010000000", "hex"), done()])
const result = Buffer.concat([Buffer.from("81010000000000000038017800d12a000000", "hex"), done()])
const send = (socket: Net.Socket, data: Buffer) => socket.write(Packet.encode(Packet.RESPONSE, data))

const server = (handle: (socket: Net.Socket, type: number, data: Buffer) => void) =>
  Effect.acquireRelease(
    Effect.callback<Net.Server, Error>((resume) => {
      const sockets = new Set<Net.Socket>()
      const server = Net.createServer((socket) => {
        sockets.add(socket)
        socket.on("close", () => sockets.delete(socket))
        socket.on("error", () => {})
        const packets = new Packet.PacketParser()
        const messages = new Packet.MessageParser()
        socket.on("data", (chunk: Buffer) =>
          packets.push(chunk, (packet) => {
            const data = messages.push(packet)
            if (!data) return
            if (packet.type === Packet.PRELOGIN) send(socket, Packet.prelogin(false))
            else handle(socket, packet.type, data)
          }))
      })
      server.on("error", (error) => resume(Effect.fail(error)))
      server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
      Object.assign(server, {
        closeSockets: () => {
          for (const socket of sockets) socket.destroy()
        }
      })
      return Effect.sync(() => server.close())
    }),
    (server) =>
      Effect.promise(() =>
        new Promise<void>((resolve) => {
          ;(server as Net.Server & { closeSockets: () => void }).closeSockets()
          server.close(() => resolve())
        })
      )
  )

const settings = (server: Net.Server): Connection.Config => ({
  server: "127.0.0.1",
  port: (server.address() as Net.AddressInfo).port,
  encrypt: false,
  connectTimeoutMs: 1000,
  cancelTimeoutMs: 100,
  initializeSession: false
})
const delay = (ms: number) => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))

describe("native TDS connection lifecycle", () => {
  it.effect("performs an NTLMv2 exchange in LOGIN7 and SSPI packets", () =>
    Effect.scoped(Effect.gen(function*() {
      const nonce = Buffer.from("0123456789abcdef", "hex")
      const challenge = Buffer.alloc(52)
      challenge.write("NTLMSSP\0", "ascii")
      challenge.writeUInt32LE(2, 8)
      challenge.writeUInt32LE(0xa2888205, 20)
      nonce.copy(challenge, 24)
      challenge.writeUInt16LE(4, 40)
      challenge.writeUInt16LE(4, 42)
      challenge.writeUInt32LE(48, 44)
      let verified = false
      const peer = yield* server((socket, type, data) => {
        if (type === Packet.LOGIN7) {
          expect(data[25] & 0x80).toBe(0x80)
          expect(data.readUInt16LE(42)).toBe(0)
          expect(data.toString("ascii", data.readUInt16LE(78), data.readUInt16LE(78) + 8)).toBe("NTLMSSP\0")
          send(socket, Buffer.concat([Buffer.from([0xed, challenge.length, 0]), challenge]))
        } else if (type === 0x11) {
          const ntOffset = data.readUInt32LE(24)
          const ntLength = data.readUInt16LE(20)
          const proof = createHmac("md5", responseKey("User", "Domain", "Password"))
            .update(Buffer.concat([nonce, data.subarray(ntOffset + 16, ntOffset + ntLength)])).digest()
          expect(data.subarray(ntOffset, ntOffset + 16)).toEqual(proof)
          verified = true
          send(socket, login)
        } else send(socket, result)
      })
      const session = yield* Connection.make({
        ...settings(peer),
        authType: "ntlm",
        username: "User",
        domain: "Domain",
        password: "Password"
      })
      expect(verified).toBe(true)
      expect((yield* session.query("SELECT 42")).rows).toEqual([{ x: 42 }])
    })))

  it.effect("retries transient login errors within the configured budget", () =>
    Effect.scoped(Effect.gen(function*() {
      let attempts = 0
      const peer = yield* server((socket, type) => {
        if (type === Packet.LOGIN7 && ++attempts === 1) {
          const error = Buffer.alloc(17)
          error[0] = 0xaa
          error.writeUInt16LE(14, 1)
          error.writeUInt32LE(40613, 3)
          error[7] = 1
          error[8] = 16
          send(socket, Buffer.concat([error, done(2)]))
        } else send(socket, type === Packet.LOGIN7 ? login : result)
      })
      const session = yield* Connection.make({
        ...settings(peer),
        connectionRetryIntervalMs: 10,
        maxRetriesOnTransientErrors: 1
      })
      expect(attempts).toBe(2)
      expect((yield* session.query("SELECT 42")).rows).toEqual([{ x: 42 }])
    })))

  it.effect("times out requests through ATTENTION and then permits reuse", () =>
    Effect.scoped(Effect.gen(function*() {
      let queries = 0
      const peer = yield* server((socket, type) => {
        if (type === Packet.LOGIN7) send(socket, login)
        else if (type === Packet.ATTENTION) send(socket, done(0x20))
        else if (++queries > 1) send(socket, result)
      })
      const session = yield* Connection.make({ ...settings(peer), requestTimeoutMs: 20 })
      expect((yield* Effect.result(session.query("WAITFOR")))._tag).toBe("Failure")
      expect(session.closed).toBe(false)
      expect((yield* session.query("SELECT 42")).rows).toEqual([{ x: 42 }])
    })))

  it.effect("resolves named instances using a validated SQL Browser response", () =>
    Effect.scoped(Effect.gen(function*() {
      const browser = yield* Effect.acquireRelease(
        Effect.callback<Dgram.Socket, Error>((resume) => {
          const socket = Dgram.createSocket("udp4")
          socket.on("error", (error) => resume(Effect.fail(error)))
          socket.on("message", (message, remote) => {
            expect(message).toEqual(Buffer.concat([Buffer.from([4]), Buffer.from("NATIVE\0")]))
            const body = Buffer.from("ServerName;local;InstanceName;NATIVE;tcp;14339;;")
            const header = Buffer.alloc(3)
            header[0] = 5
            header.writeUInt16LE(body.length, 1)
            socket.send(Buffer.concat([header, body]), remote.port, remote.address)
          })
          socket.bind(0, "127.0.0.1", () => resume(Effect.succeed(socket)))
          return Effect.sync(() => socket.close())
        }),
        (socket) => Effect.sync(() => socket.close())
      )
      expect(yield* Connection.instancePort("127.0.0.1", "NATIVE", 1000, browser.address().port)).toBe(14339)
    })))

  it.effect("accepts fragmented login and query responses", () =>
    Effect.scoped(Effect.gen(function*() {
      const peer = yield* server((socket, type) => {
        const wire = Packet.encode(Packet.RESPONSE, type === Packet.LOGIN7 ? login : result)
        for (let i = 0; i < wire.length; i++) socket.write(wire.subarray(i, i + 1))
      })
      const session = yield* Connection.make(settings(peer))
      expect((yield* session.query("SELECT 42")).rows).toEqual([{ x: 42 }])
    })))

  it.effect("destroys malformed sessions and refuses reuse", () =>
    Effect.scoped(Effect.gen(function*() {
      const peer = yield* server((socket, type) => send(socket, type === Packet.LOGIN7 ? login : Buffer.from([0xd1])))
      const session = yield* Connection.make(settings(peer))
      expect((yield* Effect.result(session.query("SELECT 42")))._tag).toBe("Failure")
      expect(session.closed).toBe(true)
      expect((yield* Effect.result(session.query("SELECT 43")))._tag).toBe("Failure")
    })))

  it.effect("waits for the attention acknowledgement before admitting another request", () =>
    Effect.scoped(Effect.gen(function*() {
      let queries = 0
      let acknowledged = false
      const peer = yield* server((socket, type) => {
        if (type === Packet.LOGIN7) send(socket, login)
        else if (type === Packet.ATTENTION) {
          setTimeout(() => {
            acknowledged = true
            send(socket, done(0x20))
          }, 30)
        } else if (++queries > 1) {
          expect(acknowledged).toBe(true)
          send(socket, result)
        }
      })
      const session = yield* Connection.make(settings(peer))
      const first = yield* Effect.forkChild(session.query("WAITFOR"))
      yield* delay(20)
      const second = yield* Effect.forkChild(session.query("SELECT"))
      yield* Fiber.interrupt(first)
      expect((yield* Fiber.join(second)).rows).toEqual([{ x: 42 }])
    })))

  it.effect("closes the socket when the server never acknowledges cancellation", () =>
    Effect.scoped(Effect.gen(function*() {
      const peer = yield* server((socket, type) => {
        if (type === Packet.LOGIN7) send(socket, login)
      })
      const session = yield* Connection.make({ ...settings(peer), cancelTimeoutMs: 20 })
      const fiber = yield* Effect.forkChild(session.query("WAITFOR"))
      yield* delay(20)
      yield* Fiber.interrupt(fiber)
      expect(session.closed).toBe(true)
    })))

  it.effect("bounds incomplete startup and validates configuration before connecting", () =>
    Effect.scoped(Effect.gen(function*() {
      const peer = yield* server(() => {})
      expect((yield* Effect.result(Connection.make({ ...settings(peer), connectTimeoutMs: 20 })))._tag).toBe("Failure")
      expect((yield* Effect.result(Connection.make({ ...settings(peer), username: "x".repeat(129) })))._tag).toBe(
        "Failure"
      )
      expect((yield* Effect.result(Connection.make({ ...settings(peer), packetSize: 0 })))._tag).toBe("Failure")
    })))

  it.effect("follows a validated login routing response", () =>
    Effect.scoped(Effect.gen(function*() {
      const target = yield* server((socket, type) => send(socket, type === Packet.LOGIN7 ? login : result))
      const targetPort = (target.address() as Net.AddressInfo).port
      const source = yield* server((socket) => {
        const host = Buffer.from("127.0.0.1", "utf16le")
        const route = Buffer.alloc(5 + host.length)
        route.writeUInt16LE(targetPort, 1)
        route.writeUInt16LE(host.length / 2, 3)
        host.copy(route, 5)
        const env = Buffer.alloc(3 + 1 + 2 + route.length + 2)
        env[0] = 0xe3
        env.writeUInt16LE(env.length - 3, 1)
        env[3] = 20
        env.writeUInt16LE(route.length, 4)
        route.copy(env, 6)
        send(socket, Buffer.concat([env, done()]))
      })
      const session = yield* Connection.make(settings(source))
      expect((yield* session.query("SELECT 42")).rows).toEqual([{ x: 42 }])
    })))
})
