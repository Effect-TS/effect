import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import { ConnectionError, SqlError, UnknownError } from "effect/unstable/sql/SqlError"
import { Buffer } from "node:buffer"
import * as Dgram from "node:dgram"
import * as Net from "node:net"
import { Duplex } from "node:stream"
import * as Tls from "node:tls"
import * as Ntlm from "./tdsNtlm.ts"
import * as Packet from "./tdsPacket.ts"
import * as Request from "./tdsRequest.ts"
import { Reader, type Token, TokenParser } from "./tdsToken.ts"

export interface Config extends Packet.LoginOptions {
  readonly port?: number | undefined
  readonly encrypt?: boolean | undefined
  readonly trustServer?: boolean | undefined
  readonly connectTimeoutMs?: number | undefined
  readonly cancelTimeoutMs?: number | undefined
  readonly maxTokenSize?: number | undefined
  readonly instanceName?: string | undefined
  readonly multiSubnetFailover?: boolean | undefined
  readonly authType?: "default" | "ntlm" | undefined
  readonly domain?: string | undefined
  readonly connectionRetryIntervalMs?: number | undefined
  readonly maxRetriesOnTransientErrors?: number | undefined
  readonly requestTimeoutMs?: number | undefined
  readonly initializeSession?: boolean | undefined
}

export interface Result {
  readonly rows: ReadonlyArray<any>
  readonly output: Record<string, unknown>
  readonly rowCount: number
  readonly returnStatus: number
}

type Resume = (result: Effect.Effect<Result, SqlError>) => void

class RoutingChange extends Error {
  readonly server: string
  readonly port: number
  constructor(server: string, port: number) {
    super("SQL Server requested routing")
    this.server = server
    this.port = port
  }
}

interface Pending {
  readonly resume: Resume
  readonly rows: Array<any>
  readonly output: Record<string, unknown>
  readonly values: boolean
  rowCount: number
  returnStatus: number
  error: SqlError | undefined
  done: boolean
  attention: boolean
  cancelRequested: boolean
  requestTimer?: ReturnType<typeof setTimeout> | undefined
  cancelResume?: (() => void) | undefined
  cancelTimer?: ReturnType<typeof setTimeout> | undefined
}

const failure = (cause: unknown, connection = false): SqlError =>
  new SqlError({
    reason: connection ?
      new ConnectionError({ cause, message: "TDS connection failed", operation: "connect" }) :
      new UnknownError({
        cause,
        message: cause instanceof Error ? cause.message : "TDS request failed",
        operation: "execute"
      })
  })

export class Session {
  private socket: Net.Socket
  private tls: Tls.TLSSocket | undefined
  private bridge: Duplex | undefined
  private readonly packets = new Packet.PacketParser()
  private readonly messages = new Packet.MessageParser()
  private readonly tokens: TokenParser
  private state: "prelogin" | "handshake" | "login" | "ready" | "closed" = "prelogin"
  private pending: Pending | undefined
  private loginAck = false
  private loginDone = false
  private fedAuthAck = false
  private loginError: SqlError | undefined
  private route: RoutingChange | undefined
  private readonly loginPayload: Buffer
  private ntlmChallenge: Buffer | undefined
  private ntlmSent = false
  private readonly connectTimer: ReturnType<typeof setTimeout>
  private transaction = Buffer.alloc(8)
  private collation = Buffer.from([0x09, 0x04, 0xd0, 0x00, 0x34])
  private packetSize: number
  private readonly closedListeners = new Set<() => void>()
  private readonly semaphore = Semaphore.makeUnsafe(1)
  private readonly writes: Array<Buffer> = []
  private writing = false

  readonly config: Config
  private readonly connected: (result: Effect.Effect<Session, SqlError>) => void
  constructor(config: Config, connected: (result: Effect.Effect<Session, SqlError>) => void) {
    this.config = config
    this.connected = connected
    this.packetSize = config.packetSize ?? 4096
    if (config.accessToken !== undefined && (config.encrypt === false || config.authType === "ntlm")) {
      throw new Packet.ProtocolError("Federated authentication requires TLS and cannot be combined with NTLM")
    }
    if (config.authType === "ntlm" && !config.domain) throw new Packet.ProtocolError("NTLM requires a domain")
    this.loginPayload = Packet.login(config.authType === "ntlm" ? { ...config, sspi: Ntlm.negotiate() } : config)
    if (!Number.isInteger(this.packetSize) || this.packetSize < 512 || this.packetSize > 32767) {
      throw new Packet.ProtocolError("Invalid packet size")
    }
    for (const timeout of [config.connectTimeoutMs, config.cancelTimeoutMs]) {
      if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0 || timeout > 2147483647)) {
        throw new Packet.ProtocolError("Invalid timeout")
      }
    }
    if (
      config.requestTimeoutMs !== undefined &&
      (!Number.isFinite(config.requestTimeoutMs) || config.requestTimeoutMs < 0 || config.requestTimeoutMs > 2147483647)
    ) {
      throw new Packet.ProtocolError("Invalid request timeout")
    }
    this.tokens = new TokenParser(config.maxTokenSize)
    this.socket = Net.createConnection({
      host: config.server,
      port: config.port ?? 1433,
      autoSelectFamily: true,
      ...(config.multiSubnetFailover ? { autoSelectFamilyAttemptTimeout: 100 } : {})
    })
    this.socket.setNoDelay(true)
    this.connectTimer = setTimeout(
      () => this.fail(new Error("TDS connection timeout")),
      config.connectTimeoutMs ?? 15000
    )
    this.socket.on("error", (error) => this.fail(error))
    this.socket.on("close", () => this.fail(new Error("TDS connection closed")))
    this.socket.on("data", (chunk: Buffer) => {
      try {
        if (this.bridge && this.state !== "handshake") this.bridge.push(chunk)
        else this.packets.push(chunk, (packet) => this.onPacket(packet))
      } catch (error) {
        this.fail(error)
      }
    })
    this.socket.once(
      "connect",
      () =>
        this.socket.write(
          Packet.encode(Packet.PRELOGIN, Packet.prelogin(config.encrypt ?? true, config.accessToken !== undefined))
        )
    )
  }

  get closed(): boolean {
    return this.state === "closed"
  }

  onClose(listener: () => void): () => void {
    if (this.closed) listener()
    else this.closedListeners.add(listener)
    return () => this.closedListeners.delete(listener)
  }

  close(): void {
    this.fail(new Error("TDS session released"))
  }

  query(
    query: string,
    parameters: ReadonlyArray<Request.Parameter> = [],
    values = false
  ): Effect.Effect<Result, SqlError> {
    return this.request(() => Request.sql(query, parameters, this.transaction, this.collation), Packet.RPC, values)
  }

  batch(query: string, timeoutMs?: number): Effect.Effect<Result, SqlError> {
    return this.request(
      () => Buffer.concat([Packet.allHeaders(this.transaction), Buffer.from(query, "utf16le")]),
      Packet.SQL_BATCH,
      false,
      timeoutMs
    )
  }

  call(procedure: string, parameters: ReadonlyArray<Request.Parameter>): Effect.Effect<Result, SqlError> {
    return this.request(() => Request.rpc(procedure, parameters, this.transaction, this.collation), Packet.RPC, false)
  }

  private request(
    payload: () => Buffer,
    type: number,
    values: boolean,
    timeoutMs = this.config.requestTimeoutMs ?? 15000
  ): Effect.Effect<Result, SqlError> {
    return this.semaphore.withPermit(Effect.callback<Result, SqlError>((resume) => {
      if (this.state !== "ready") {
        resume(Effect.fail(failure(new Error("TDS session is not ready"), true)))
        return
      }
      let data: Buffer
      try {
        data = Packet.encode(type, payload(), this.packetSize)
      } catch (error) {
        resume(Effect.fail(failure(error)))
        return
      }
      const pending: Pending = {
        resume,
        rows: [],
        output: {},
        values,
        rowCount: 0,
        returnStatus: 0,
        error: undefined,
        done: false,
        attention: false,
        cancelRequested: false
      }
      this.pending = pending
      this.tokens.columns = undefined
      if (timeoutMs > 0) {
        pending.requestTimer = setTimeout(() => {
          pending.error = failure(Object.assign(new Error("TDS request timeout"), { code: "ETIMEOUT" }))
          this.cancel(pending)
        }, timeoutMs)
      }
      this.write(data)
      return Effect.callback<void>((cancelResume) => {
        if (this.pending !== pending) {
          cancelResume(Effect.void)
          return
        }
        pending.cancelResume = () => cancelResume(Effect.void)
        this.cancel(pending)
      })
    }))
  }

  private cancel(pending: Pending): void {
    if (pending.cancelRequested || this.pending !== pending) return
    pending.cancelRequested = true
    clearTimeout(pending.requestTimer)
    pending.cancelTimer = setTimeout(
      () => this.fail(new Error("TDS cancellation timeout")),
      this.config.cancelTimeoutMs ?? 5000
    )
    this.write(Packet.encode(Packet.ATTENTION, Buffer.alloc(0), this.packetSize))
  }

  private write(data: Buffer): void {
    if (this.closed) return
    this.writes.push(data)
    if (this.writing) return
    this.writing = true
    const drain = (): void => {
      const data = this.writes.shift()
      if (data === undefined || this.closed) {
        this.writing = false
        return
      }
      let offset = 0
      const next = (): void => {
        if (this.closed) return
        // Some Node-compatible runtimes do not implement setMaxSendFragment.
        // Await each TLS write so _writev cannot combine packets into a record
        // larger than SQL Server's negotiated receive size. Queue whole messages
        // so cancellation cannot insert ATTENTION inside an unfinished request.
        const end = this.tls ? Math.min(offset + this.packetSize, data.length) : data.length
        const chunk = data.subarray(offset, end)
        offset = end
        try {
          ;(this.tls ?? this.socket).write(chunk, (error) => {
            if (error) this.fail(error)
            else if (offset < data.length) next()
            else drain()
          })
        } catch (error) {
          this.fail(error)
        }
      }
      next()
    }
    drain()
  }

  private fail(cause: unknown): void {
    if (this.closed) return
    const connecting = this.state !== "ready"
    this.state = "closed"
    this.writes.length = 0
    this.loginPayload.fill(0)
    clearTimeout(this.connectTimer)
    this.tls?.destroy()
    this.bridge?.destroy()
    this.socket.destroy()
    if (connecting) this.connected(Effect.fail(cause instanceof SqlError ? cause : failure(cause, true)))
    const pending = this.pending
    this.pending = undefined
    if (pending) {
      clearTimeout(pending.requestTimer)
      clearTimeout(pending.cancelTimer)
      pending.resume(Effect.fail(cause instanceof SqlError ? cause : failure(cause, true)))
      pending.cancelResume?.()
    }
    for (const listener of this.closedListeners) listener()
    this.closedListeners.clear()
  }

  private onPacket(packet: Packet.Packet): void {
    if (this.state === "handshake") {
      if (packet.type !== Packet.RESPONSE && packet.type !== Packet.PRELOGIN) {
        throw new Packet.ProtocolError("Unexpected TLS packet type")
      }
      this.bridge!.push(packet.data)
      return
    }
    if (packet.type !== Packet.RESPONSE) throw new Packet.ProtocolError("Expected TDS response packet")
    if (this.state === "prelogin") {
      const message = this.messages.push(packet)
      if (!message) return
      const { encryption, fedAuthRequired } = Packet.preloginOptions(message)
      if (this.config.accessToken !== undefined) {
        const featureOffset = this.loginPayload.readUInt32LE(this.loginPayload.readUInt16LE(56))
        this.loginPayload[featureOffset + 5] = 2 | (fedAuthRequired ? 1 : 0)
      }
      if (encryption === 1 || encryption === 3) this.startTls()
      else if (this.config.encrypt !== false) throw new Packet.ProtocolError("Server refused required encryption")
      else if (encryption === 2) this.sendLogin()
      else throw new Packet.ProtocolError("Server requested unsupported login-only encryption")
      return
    }
    if (this.state !== "login" && this.state !== "ready") return
    this.tokens.push(packet.data, (token) => this.onToken(token))
    if (!(packet.status & 1)) return
    this.tokens.end()
    if (this.state === "login") {
      if (this.route) {
        this.fail(this.route)
        return
      }
      if (this.ntlmChallenge) {
        const response = Ntlm.authenticate(this.ntlmChallenge, {
          username: this.config.username ?? "",
          password: this.config.password ?? "",
          domain: this.config.domain!
        })
        this.ntlmChallenge = undefined
        this.ntlmSent = true
        this.write(Packet.encode(0x11, response, this.packetSize))
        response.fill(0)
        return
      }
      if (this.loginError) {
        this.fail(this.loginError)
        return
      }
      if (!this.loginAck || !this.loginDone) throw new Packet.ProtocolError("Incomplete LOGIN7 response")
      if (this.config.accessToken !== undefined && !this.fedAuthAck) {
        throw new Packet.ProtocolError("Missing federated authentication acknowledgement")
      }
      this.state = "ready"
      clearTimeout(this.connectTimer)
      this.connected(Effect.succeed(this))
      return
    }
    const pending = this.pending
    if (!pending) throw new Packet.ProtocolError("Unsolicited TDS response")
    if (!pending.done && !pending.attention) throw new Packet.ProtocolError("Response ended without final DONE")
    if (pending.cancelRequested && !pending.attention) return // normal completion raced with ATTENTION
    this.pending = undefined
    clearTimeout(pending.requestTimer)
    clearTimeout(pending.cancelTimer)
    pending.resume(
      pending.error ? Effect.fail(pending.error) : Effect.succeed({
        rows: pending.rows,
        output: pending.output,
        rowCount: pending.rowCount,
        returnStatus: pending.returnStatus
      })
    )
    pending.cancelResume?.()
  }

  private startTls(): void {
    this.state = "handshake"
    let buffered: Buffer = Buffer.alloc(0)
    let applicationData = false
    this.bridge = new Duplex({
      read() {},
      write: (chunk: Buffer, _encoding, callback) => {
        if (applicationData && buffered.length === 0) {
          this.socket.write(chunk, callback)
          return
        }
        // secureConnect can precede the final outgoing handshake records on
        // resumed sessions in Node-compatible runtimes. Frame complete TLS
        // records, retaining the TDS wrapper until application traffic begins.
        buffered = buffered.length === 0 ? chunk : Buffer.concat([buffered, chunk])
        const output: Array<Buffer> = []
        const handshake: Array<Buffer> = []
        const flushHandshake = () => {
          if (handshake.length === 0) return
          output.push(Packet.encode(Packet.PRELOGIN, Buffer.concat(handshake), this.packetSize))
          handshake.length = 0
        }
        while (buffered.length >= 5) {
          const length = 5 + buffered.readUInt16BE(3)
          if (buffered.length < length) break
          const record = buffered.subarray(0, length)
          buffered = buffered.subarray(length)
          if (this.state !== "handshake" && record[0] === 23) applicationData = true
          if (applicationData) {
            flushHandshake()
            output.push(record)
          } else handshake.push(record)
        }
        flushHandshake()
        if (output.length === 0) callback()
        else this.socket.write(Buffer.concat(output), callback)
      }
    })
    this.bridge.on("error", (error) => this.fail(error))
    const tls = this.tls = Tls.connect({
      socket: this.bridge,
      servername: Net.isIP(this.config.server) ? undefined : this.config.server,
      rejectUnauthorized: !(this.config.trustServer ?? false),
      checkServerIdentity: (_hostname, cert) => Tls.checkServerIdentity(this.config.server, cert)
    })
    tls.setMaxSendFragment(Math.min(this.packetSize, 16384))
    tls.on("error", (error) => this.fail(error))
    const packets = new Packet.PacketParser()
    tls.on("data", (chunk: Buffer) => {
      try {
        packets.push(chunk, (packet) => this.onPacket(packet))
      } catch (error) {
        this.fail(error)
      }
    })
    tls.once("secureConnect", () => this.sendLogin())
  }

  private sendLogin(): void {
    this.state = "login"
    this.write(Packet.encode(Packet.LOGIN7, this.loginPayload, this.packetSize))
    this.loginPayload.fill(0)
  }

  private onToken(token: Token): void {
    const pending = this.pending
    switch (token._tag) {
      case "FeatureAck": {
        if (this.state !== "login") throw new Packet.ProtocolError("Unexpected feature acknowledgement")
        const fedAuth = token.features.get(2)
        if (fedAuth !== undefined) {
          if (this.config.accessToken === undefined || this.fedAuthAck || fedAuth.length !== 0) {
            throw new Packet.ProtocolError("Invalid federated authentication acknowledgement")
          }
          this.fedAuthAck = true
        }
        break
      }
      case "LoginAck":
        if (token.version !== 0x74000004) throw new Packet.ProtocolError("Server did not negotiate TDS 7.4")
        this.loginAck = true
        break
      case "Error": {
        const error = Object.assign(new Error(token.error.message), token.error, { code: "EREQUEST" })
        if (this.state === "login") this.loginError = failure(error, true)
        else if (pending) pending.error ??= failure(error)
        if (token.error.class >= 20) this.fail(error)
        break
      }
      case "Done":
        if (this.state === "login") this.loginDone = !(token.status & 1)
        else if (pending) {
          pending.done = !(token.status & 1) && token.kind !== 0xff
          pending.attention ||= !!(token.status & 0x20)
          if (token.status & 0x10) pending.rowCount += Number(token.rowCount)
          if ((token.status & 0x102) && !pending.error) {
            pending.error = failure(new Error("SQL Server reported a failed statement"))
          }
        }
        break
      case "Row":
        if (!pending) throw new Packet.ProtocolError("Row without active request")
        if (pending.cancelRequested) break
        if (pending.values) pending.rows.push(token.values)
        else {
          const row: Record<string, unknown> = {}
          const columns = this.tokens.columns!
          for (let i = 0; i < columns.length; i++) {
            const name = columns[i].name
            if (name !== "__proto__") {
              row[name] = token.values[i]
              continue
            }
            Object.defineProperty(row, name, {
              value: token.values[i],
              writable: true,
              configurable: true,
              enumerable: true
            })
          }
          pending.rows.push(row)
        }
        break
      case "ReturnValue":
        if (pending) {
          Object.defineProperty(pending.output, token.name, {
            value: token.value,
            enumerable: true,
            configurable: true,
            writable: true
          })
        }
        break
      case "ReturnStatus":
        if (pending) pending.returnStatus = token.value
        break
      case "EnvChange":
        this.environment(token.data)
        break
      case "Sspi":
        if (this.config.authType !== "ntlm" || this.state !== "login" || this.ntlmSent || this.ntlmChallenge) {
          throw new Packet.ProtocolError("Unexpected SSPI challenge")
        }
        this.ntlmChallenge = token.data
        break
    }
  }

  private environment(data: Buffer): void {
    const r = new Reader(data, true)
    const type = r.u8()
    if (type === 4) {
      const size = Number(r.bString())
      if (!Number.isInteger(size) || size < 512 || size > 32767) {
        throw new Packet.ProtocolError("Invalid negotiated packet size")
      }
      this.packetSize = size
      this.tls?.setMaxSendFragment(Math.min(size, 16384))
    } else if (type === 7) {
      const collation = r.take(r.u8())
      if (collation.length !== 5) throw new Packet.ProtocolError("Invalid negotiated collation")
      this.collation = Buffer.from(collation)
    } else if (type === 8) {
      const transaction = r.take(r.u8())
      if (transaction.length !== 8) throw new Packet.ProtocolError("Invalid transaction descriptor")
      this.transaction = Buffer.from(transaction)
    } else if (type === 9 || type === 10 || type === 17) {
      this.transaction = Buffer.alloc(8)
    } else if (type === 20) {
      if (this.state !== "login" || this.route) throw new Packet.ProtocolError("Unexpected SQL Server routing")
      const route = new Reader(r.take(r.u16()), true)
      if (route.u8() !== 0) throw new Packet.ProtocolError("Unsupported routing protocol")
      const port = route.u16()
      const server = route.usString()
      if (port === 0 || !server || server.includes("\0") || route.offset !== route.data.length) {
        throw new Packet.ProtocolError("Invalid routing target")
      }
      this.route = new RoutingChange(server, port)
    }
  }
}

const connect = (config: Config): Effect.Effect<Session, SqlError> =>
  Effect.callback<Session, SqlError>((resume) => {
    let session: Session
    try {
      session = new Session(config, resume)
    } catch (cause) {
      resume(Effect.fail(failure(cause, true)))
      return
    }
    return Effect.sync(() => session.close())
  })

export const instancePort = (
  server: string,
  instance: string,
  timeout: number,
  browserPort = 1434
): Effect.Effect<number, SqlError> =>
  Effect.callback((resume) => {
    if (!/^[\x20-\x7e]{1,128}$/.test(instance) || instance.includes(";")) {
      resume(Effect.fail(failure(new Error("Invalid instance name"), true)))
      return
    }
    const socket = Dgram.createSocket(Net.isIPv6(server) ? "udp6" : "udp4")
    let finished = false
    const complete = (result: Effect.Effect<number, SqlError>) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      socket.close()
      resume(result)
    }
    const timer = setTimeout(
      () => complete(Effect.fail(failure(new Error("SQL Browser lookup timed out"), true))),
      timeout
    )
    socket.on("error", (cause) => complete(Effect.fail(failure(cause, true))))
    socket.on("message", (message) => {
      try {
        if (message.length < 3 || message[0] !== 5 || message.readUInt16LE(1) !== message.length - 3) {
          throw new Packet.ProtocolError("Invalid SQL Browser response")
        }
        const records = message.toString("ascii", 3).split(";;")
        for (const record of records) {
          const parts = record.split(";")
          const fields = new Map<string, string>()
          for (let i = 0; i + 1 < parts.length; i += 2) fields.set(parts[i].toLowerCase(), parts[i + 1])
          if (fields.get("instancename")?.toLowerCase() !== instance.toLowerCase()) continue
          const port = Number(fields.get("tcp"))
          if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Packet.ProtocolError("Invalid instance TCP port")
          }
          complete(Effect.succeed(port))
          return
        }
        throw new Packet.ProtocolError("Instance not present in SQL Browser response")
      } catch (cause) {
        complete(Effect.fail(failure(cause, true)))
      }
    })
    socket.connect(browserPort, server, () => {
      if (finished) return
      socket.send(Buffer.concat([Buffer.from([4]), Buffer.from(instance, "ascii"), Buffer.from([0])]), (cause) => {
        if (cause) complete(Effect.fail(failure(cause, true)))
      })
    })
    return Effect.sync(() => {
      if (!finished) {
        finished = true
        clearTimeout(timer)
        socket.close()
      }
    })
  })

export const make = (config: Config): Effect.Effect<Session, SqlError, Scope.Scope> =>
  Effect.gen(function*() {
    const deadline = Date.now() + (config.connectTimeoutMs ?? 15000)
    const session = yield* Effect.acquireRelease(
      Effect.suspend(() => {
        const deadline = Date.now() + (config.connectTimeoutMs ?? 15000)
        const maxRetries = config.maxRetriesOnTransientErrors ?? 3
        const retryInterval = config.connectionRetryIntervalMs ?? 500
        if (!Number.isInteger(maxRetries) || maxRetries < 0 || !Number.isFinite(retryInterval) || retryInterval <= 0) {
          return Effect.fail(failure(new Packet.ProtocolError("Invalid connection retry options"), true))
        }
        const attempt = (config: Config, redirects: number, retries = 0): Effect.Effect<Session, SqlError> =>
          Effect.suspend(() => {
            const remaining = deadline - Date.now()
            if (remaining <= 0) return Effect.fail(failure(new Error("TDS connection timeout"), true))
            return connect({ ...config, connectTimeoutMs: remaining }).pipe(Effect.catch((error) => {
              const cause = error.reason.cause
              if (cause instanceof RoutingChange && redirects < 5) {
                return attempt({ ...config, server: cause.server, port: cause.port }, redirects + 1, retries)
              }
              const number = typeof cause === "object" && cause !== null && "number" in cause ? cause.number : undefined
              if (
                typeof number === "number" && [4060, 10928, 10929, 40197, 40501, 40613].includes(number) &&
                retries < maxRetries
              ) {
                return Effect.flatMap(
                  Effect.callback<void>((resume) => {
                    const timer = setTimeout(
                      () => resume(Effect.void),
                      Math.min(retryInterval, Math.max(1, deadline - Date.now()))
                    )
                    return Effect.sync(() => clearTimeout(timer))
                  }),
                  () => attempt(config, redirects, retries + 1)
                )
              }
              return Effect.fail(error)
            }))
          })
        return config.instanceName && config.port === undefined ?
          Effect.flatMap(
            instancePort(config.server, config.instanceName, config.connectTimeoutMs ?? 15000),
            (port) => attempt({ ...config, port }, 0)
          ) :
          attempt(config, 0)
      }),
      (session) => Effect.sync(() => session.close())
    )
    if (config.initializeSession !== false) yield* session.batch(initialSql, Math.max(1, deadline - Date.now()))
    return session
  })

const initialSql = `SET ANSI_NULLS ON
SET ANSI_NULL_DFLT_ON ON
SET ANSI_PADDING ON
SET ANSI_WARNINGS ON
SET ARITHABORT ON
SET CONCAT_NULL_YIELDS_NULL ON
SET IMPLICIT_TRANSACTIONS OFF
SET NUMERIC_ROUNDABORT OFF
SET QUOTED_IDENTIFIER ON
SET TEXTSIZE 2147483647
SET TRANSACTION ISOLATION LEVEL READ COMMITTED
SET XACT_ABORT OFF
SET LANGUAGE us_english
SET DATEFORMAT mdy
SET DATEFIRST 7`
