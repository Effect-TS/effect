import { MssqlClient, MssqlConnection, MssqlProtocol } from "@effect/sql-mssql"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as Result from "effect/Result"
import { Buffer } from "node:buffer"
import { readFileSync } from "node:fs"
import * as Net from "node:net"
import * as Tls from "node:tls"

const { PacketType } = MssqlProtocol
const encode = (type: number, data: Uint8Array) => {
  const packet = MssqlProtocol.encodePacket(type, data)
  if (Result.isFailure(packet)) throw packet.failure
  return packet.success
}
const done = Buffer.from("fd000000000000000000000000", "hex")
const loginAck = Buffer.from("ad0a0001740000040010000000", "hex")
// The proxy wraps the TLS server's handshake records in TDS packets, then
// forwards encrypted application traffic unchanged.
const peer = (ack: Buffer, echo = true) =>
  Effect.acquireRelease(
    Effect.tryPromise(async () => {
      const sockets = new Set<Net.Socket>()
      const states = new Map<number, { secure: boolean; applicationData: boolean }>()
      const tlsServer = Tls.createServer({
        key: readFileSync(new URL("./fixtures/tls/key.pem", import.meta.url)),
        cert: readFileSync(new URL("./fixtures/tls/cert.pem", import.meta.url)),
        maxVersion: "TLSv1.2",
        requestCert: false
      }, (socket) => {
        sockets.add(socket)
        socket.on("close", () => sockets.delete(socket))
        const state = states.get(socket.remotePort!)!
        state.secure = true
        const packets = MssqlProtocol.makePacketParser()
        const messages = MssqlProtocol.makeMessageParser()
        socket.on("error", () => {})
        socket.on("data", (chunk: Buffer) =>
          packets.push(chunk, (packet) => {
            state.applicationData = true
            const message = messages.push(packet)
            if (!message) return
            const data = Buffer.from(message.buffer, message.byteOffset, message.byteLength)
            if (packet.type === PacketType.Login7) {
              const feature = data.readUInt32LE(data.readUInt16LE(56))
              expect(data[feature]).toBe(2)
              expect(data[feature + 5]).toBe(echo ? 3 : 2)
              const length = data.readUInt32LE(feature + 6)
              expect(data.toString("utf16le", feature + 10, feature + 10 + length)).toBe("test-token")
              socket.write(encode(PacketType.Response, Buffer.concat([loginAck, ack, done])))
            } else socket.write(encode(PacketType.Response, done))
          }))
      })
      tlsServer.on("connection", (socket) => {
        sockets.add(socket)
        socket.on("close", () => sockets.delete(socket))
      })
      await new Promise<void>((resolve, reject) => {
        tlsServer.once("error", reject)
        tlsServer.listen(0, "127.0.0.1", resolve)
      })
      const server = Net.createServer((socket) => {
        sockets.add(socket)
        const state = { secure: false, applicationData: false }
        const backend = Net.createConnection({ host: "127.0.0.1", port: (tlsServer.address() as Net.AddressInfo).port })
        sockets.add(backend)
        backend.on("connect", () => states.set(backend.localPort!, state))
        backend.on("error", () => socket.destroy())
        socket.on("error", () => backend.destroy())
        socket.on("close", () => {
          sockets.delete(socket)
          backend.destroy()
        })
        backend.on("close", () => {
          sockets.delete(backend)
          socket.destroy()
        })
        backend.on("data", (data: Buffer) =>
          socket.write(state.applicationData ? data : encode(PacketType.Prelogin, data)))
        const packets = MssqlProtocol.makePacketParser()
        let prelogin = true
        let incoming = Buffer.alloc(0)
        socket.on("data", (data: Buffer) => {
          incoming = Buffer.concat([incoming, data])
          // A resumed client's final wrapped handshake and first raw TLS
          // application record may share a TCP read, before secure fires here.
          while (incoming.length >= 5) {
            const wrapped = incoming[0] === PacketType.Prelogin
            const length = wrapped ? incoming.readUInt16BE(2) : 5 + incoming.readUInt16BE(3)
            if (incoming.length < length) {
              return
            }
            const record = incoming.subarray(0, length)
            incoming = incoming.subarray(length)
            if (!wrapped) {
              expect(record[0]).toBe(23)
              backend.write(record)
              continue
            }
            packets.push(record, (packet) => {
              if (prelogin) {
                prelogin = false
                const options = MssqlProtocol.decodePrelogin(packet.data)
                expect(Result.isSuccess(options) && options.success.fedAuthRequired).toBe(true)
                socket.write(
                  encode(PacketType.Response, MssqlProtocol.encodePrelogin({ encrypt: true, fedAuth: echo }))
                )
              } else backend.write(packet.data)
            })
          }
        })
      })
      try {
        await new Promise<void>((resolve, reject) => {
          server.once("error", reject)
          server.listen(0, "127.0.0.1", resolve)
        })
      } catch (error) {
        tlsServer.close()
        throw error
      }
      return { server, tlsServer, sockets }
    }),
    ({ server, tlsServer, sockets }) =>
      Effect.promise(async () => {
        for (const socket of sockets) {
          socket.destroy()
        }
        await Promise.all(
          [server, tlsServer].map((server) =>
            new Promise<void>((resolve) => server.close(() => resolve()))
          )
        )
      })
  ).pipe(Effect.map(({ server }) => server))
const settings = (server: Net.Server): MssqlConnection.Config => ({
  server: "127.0.0.1",
  port: (server.address() as Net.AddressInfo).port,
  encrypt: true,
  trustServer: true,
  authType: "azure-active-directory-access-token",
  accessToken: Effect.succeed(Redacted.make("test-token")),
  connectTimeout: 2000
})

describe("MssqlConnection Security Token authentication", () => {
  it.effect("obtains a token for each new pooled connection through the public adapter", () =>
    Effect.scoped(Effect.gen(function*() {
      const server = yield* peer(Buffer.from([0xae, 2, 0, 0, 0, 0, 255]))
      let refreshed = 0
      for (let i = 0; i < 2; i++) {
        yield* Effect.scoped(MssqlClient.make({
          ...settings(server),
          password: undefined,
          minConnections: 1,
          maxConnections: 1,
          accessToken: Effect.sync(() => {
            refreshed++
            return Redacted.make("test-token")
          })
        }))
      }
      expect(refreshed).toBe(2)
    })).pipe(Effect.provide(Reactivity.layer)))
  for (const echo of [false, true]) {
    it.effect(`exchanges a token over TLS and echoes FEDAUTHREQUIRED=${echo}`, () =>
      Effect.scoped(Effect.gen(function*() {
        const server = yield* peer(Buffer.from([0xae, 2, 0, 0, 0, 0, 255]), echo)
        const session = yield* MssqlConnection.make(settings(server))
        expect((yield* session.query("SELECT 1")).rows).toEqual([])
      })))
  }
  for (
    const [name, ack] of [
      ["missing", Buffer.alloc(0)],
      ["unsolicited nonce", Buffer.from([0xae, 2, 1, 0, 0, 0, 0, 255])],
      ["duplicate", Buffer.from([0xae, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 255])]
    ] as const
  ) {
    it.effect(`rejects ${name} FedAuth acknowledgement`, () =>
      Effect.scoped(Effect.gen(function*() {
        const server = yield* peer(ack)
        const error = yield* Effect.flip(MssqlConnection.make(settings(server)))
        expect(error.reason.cause).toBeInstanceOf(MssqlProtocol.ParseError)
      })))
  }
  it.effect("refuses to send tokens over plaintext or with NTLM", () =>
    Effect.scoped(Effect.gen(function*() {
      const accessToken = Effect.succeed(Redacted.make("secret"))
      const plaintext = yield* Effect.flip(MssqlConnection.make({ server: "localhost", accessToken, encrypt: false }))
      expect(plaintext.reason._tag).toBe("AuthenticationError")
      expect(plaintext.message).toContain("TLS")
      const ntlm = yield* Effect.flip(
        MssqlConnection.make({ server: "localhost", accessToken, authType: "ntlm", domain: "D" })
      )
      expect(ntlm.message).toContain("NTLM")
    })))
})
