/**
 * A DNS client that queries name servers and returns the full responses.
 *
 * Queries are sent with a `Transport`: UDP and TCP from the platform packages,
 * such as `NodeDnsClient`, or DNS over HTTPS with `layerTransportHttps`.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import * as Context from "../Context.ts"
import * as Crypto from "../Crypto.ts"
import * as Deferred from "../Deferred.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Base64Url from "../encoding/Base64Url.ts"
import * as Equal from "../Equal.ts"
import * as FetchHttpClient from "../http/FetchHttpClient.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import * as DnsMessage from "../internal/dnsMessage.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Result from "../Result.ts"
import type * as Scope from "../Scope.ts"
import type * as DatagramSocket from "../socket/DatagramSocket.ts"
import * as Socket from "../socket/Socket.ts"
import * as Stream from "../Stream.ts"
import * as Dns from "./Dns.ts"
import * as Host from "./Host.ts"
import * as NetAddress from "./NetAddress.ts"

/**
 * A resource record of a DNS response section.
 *
 * **Details**
 *
 * `owner` is a fully qualified name written like `Dns.Ptr` hosts, keeping the
 * letter case of the response.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ResourceRecord<D extends Dns.DnsRecord | Dns.Unknown = Dns.DnsRecord | Dns.Unknown> {
  readonly owner: string
  readonly ttl: Duration.Duration
  readonly class: number
  readonly data: D
}

/**
 * A DNS response: its header flags, response code, record sections, and
 * EDNS(0) parameters.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Response {
  readonly flags: {
    readonly authoritative: boolean
    readonly truncated: boolean
    readonly recursionDesired: boolean
    readonly recursionAvailable: boolean
    readonly authenticData: boolean
    readonly checkingDisabled: boolean
  }
  readonly rcode: number
  readonly answer: ReadonlyArray<ResourceRecord>
  readonly authority: ReadonlyArray<ResourceRecord>
  readonly additional: ReadonlyArray<ResourceRecord>
  readonly edns: {
    readonly udpPayloadSize: number
    readonly version: number
    readonly dnssecOk: boolean
  } | undefined
}

// =============================================================================
// Service
// =============================================================================

/**
 * Service that sends DNS queries and returns the full responses, along with
 * the resolver configuration used by `layerDns`.
 *
 * @see {@link make} for the default implementation
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class DnsClient extends Context.Service<DnsClient, {
  /**
   * Queries the records of one type, given by name or numeric code, for a
   * name, without search domains. NXDOMAIN responses succeed; other errors
   * fail once every name server has been tried. Invalid types, OPT, and zone
   * transfers fail with `Unsupported`.
   */
  query(
    name: Host.DomainNameInput,
    type: Dns.RecordType | number,
    options?: { readonly recursionDesired?: boolean | undefined }
  ): Effect.Effect<Response, Dns.DnsError>

  /**
   * The domains appended to relative names by address lookups.
   */
  readonly search: ReadonlyArray<Host.DomainName>

  /**
   * The number of dots from which a relative name is tried as given before
   * the search domains.
   */
  readonly ndots: number

  /**
   * Whether address lookups skip AAAA queries.
   */
  readonly noAaaa: boolean

  /**
   * The hosts table consulted by address lookups before DNS.
   */
  readonly hosts: Host.HostsTable
}>()("effect/net/DnsClient") {}

const rcodeReasons: Record<number, Dns.DnsErrorReason> = {
  1: "InvalidResponse",
  2: "ServerFailure",
  4: "Unsupported",
  5: "Refused"
}

const recordTypesByCode = new Map(
  Object.entries(DnsMessage.typeCodes).map(([type, code]) => [code, type as Dns.RecordType])
)

// OPT is a pseudo-record, and zone transfers (IXFR, AXFR) span several messages.
const unsupportedCodes = new Set([41, 251, 252])

const lower = (name: string): string => name.replace(/[A-Z]/g, (letter) => letter.toLowerCase())

const frame = (payload: Uint8Array): Uint8Array => {
  const out = new Uint8Array(payload.length + 2)
  out[0] = payload.length >> 8
  out[1] = payload.length & 0xff
  out.set(payload, 2)
  return out
}

const concat = (head: Uint8Array, chunks: ReadonlyArray<Uint8Array>): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, head.length))
  out.set(head)
  let offset = head.length
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

// =============================================================================
// Transports
// =============================================================================

/**
 * One query that a `Transport` sends to a name server.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Exchange {
  /**
   * Encodes the query with an ID and EDNS(0) options.
   */
  readonly encode: (options: {
    readonly id: number
    readonly udpPayloadSize: number
    readonly padding?: number | undefined
  }) => Uint8Array

  /**
   * Returns whether a message is a response to the query with the ID.
   */
  readonly matches: (message: Uint8Array, id: number) => boolean

  /**
   * Scopes one exchange, applies the client's timeout, and reports other
   * failures as `Temporary`.
   */
  readonly limit: <A, E>(effect: Effect.Effect<A, E, Scope.Scope>) => Effect.Effect<A, Dns.DnsError>

  /**
   * Creates the `Dns.DnsError` of the query.
   */
  readonly fail: (reason: Dns.DnsErrorReason, cause?: unknown) => Dns.DnsError
}

/**
 * Service that sends the queries of a `DnsClient` to name servers.
 *
 * @see {@link makeTransportUdp} for UDP with retries over TCP
 * @see {@link makeTransportTcp} for TCP
 * @see {@link makeTransportHttps} for DNS over HTTPS
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class Transport extends Context.Service<Transport, {
  /**
   * The name servers, in the order the client tries them.
   */
  readonly servers: Arr.NonEmptyReadonlyArray<{
    /**
     * Sends a query to the name server and returns the matching response.
     * Exchanges run with `Exchange.limit` get the client's timeout.
     */
    readonly send: (exchange: Exchange) => Effect.Effect<Uint8Array, Dns.DnsError>
  }>
}>()("effect/net/DnsClient/Transport") {}

/**
 * Options for `makeTransportTcp`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface TransportTcpOptions {
  /**
   * The name servers, with port 53 unless given.
   */
  readonly nameServers: Arr.NonEmptyReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>

  /**
   * Opens a connection to a name server.
   */
  readonly tcp: (server: NetAddress.InetAddress) => Effect.Effect<Socket.Socket>
}

/**
 * Creates a `Transport` that sends every query over TCP, with a new connection
 * per attempt.
 *
 * @see {@link TransportTcpOptions} for the options
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeTransportTcp = (
  options: TransportTcpOptions
): Effect.Effect<Transport["Service"], never, Crypto.Crypto> =>
  Effect.gen(function*() {
    const crypto = yield* Crypto.Crypto
    if (options.nameServers.length === 0) {
      throw new RangeError("DnsClient needs at least one name server")
    }
    const servers = Arr.map(options.nameServers, (server) => Result.getOrThrow(Dns.nameServerFromInput(server)))
    return Transport.of({
      servers: Arr.map(servers, (server) => ({
        send: Effect.fnUntraced(function*({ encode, fail, limit, matches }) {
          const id = yield* crypto.randomIntBetween(0, 0xffff)
          const payload = yield* limit(Effect.gen(function*() {
            const socket = yield* options.tcp(server)
            const pull = yield* Socket.readerBytes(socket)
            const writer = yield* socket.writer
            yield* writer.write(frame(encode({ id, udpPayloadSize: 1232 })))
            let prefix: Uint8Array = new Uint8Array(0)
            while (prefix.length < 2) prefix = concat(prefix, yield* pull)
            const message = new Uint8Array((prefix[0] << 8) | prefix[1])
            let length = Math.min(prefix.length - 2, message.length)
            message.set(prefix.subarray(2, 2 + length))
            while (length < message.length) {
              for (const chunk of yield* pull) {
                const part = chunk.subarray(0, message.length - length)
                message.set(part, length)
                length += part.length
              }
            }
            return message
          }))
          if (!matches(payload, id)) {
            return yield* fail("InvalidResponse", new Error("the TCP response does not match the query"))
          }
          return payload
        })
      }))
    })
  })

/**
 * Options for `makeTransportUdp`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface TransportUdpOptions {
  /**
   * The name servers, with port 53 unless given.
   */
  readonly nameServers: Arr.NonEmptyReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>

  /**
   * Opens a socket that sends to `server` by default and passes errors
   * without a write to fail, such as ICMP reports, to `onError`.
   */
  readonly udp: (
    server: NetAddress.InetAddress,
    onError: (error: DatagramSocket.DatagramSocketError) => void
  ) => Effect.Effect<DatagramSocket.DatagramSocket>

  /**
   * Opens a connection to a name server, for truncated responses.
   */
  readonly tcp: (server: NetAddress.InetAddress) => Effect.Effect<Socket.Socket>

  /**
   * The largest UDP response to accept, advertised with EDNS(0). Defaults to
   * 1232 bytes.
   */
  readonly udpPayloadSize?: number | undefined
}

// Connected sockets report ICMP port unreachable messages as refused.
const socketFailure = (exchange: Exchange, error: DatagramSocket.DatagramSocketError): Dns.DnsError =>
  exchange.fail("kind" in error.reason && error.reason.kind === "ConnectionRefused" ? "Refused" : "Temporary", error)

/**
 * Creates a `Transport` that sends queries over UDP and retries truncated
 * responses over TCP. ICMP reports end an exchange at once, and port
 * unreachable reports fail with `Refused`.
 *
 * @see {@link TransportUdpOptions} for the options and their defaults
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeTransportUdp = (
  options: TransportUdpOptions
): Effect.Effect<Transport["Service"], never, Crypto.Crypto> =>
  Effect.gen(function*() {
    const crypto = yield* Crypto.Crypto
    const udpPayloadSize = options.udpPayloadSize ?? 1232
    if (!Number.isInteger(udpPayloadSize) || udpPayloadSize < 512 || udpPayloadSize > 0xffff) {
      throw new RangeError(`DnsClient udpPayloadSize must be an integer from 512 to 65535, received ${udpPayloadSize}`)
    }
    const tcp = yield* makeTransportTcp(options)
    const servers = Arr.map(options.nameServers, (server) => Result.getOrThrow(Dns.nameServerFromInput(server)))
    return Transport.of({
      servers: Arr.map(servers, (server, index) => ({
        send: Effect.fnUntraced(function*(exchange) {
          const id = yield* crypto.randomIntBetween(0, 0xffff)
          const received = yield* exchange.limit(
            Effect.gen(function*() {
              const reported = yield* Deferred.make<never, Dns.DnsError>()
              const socket = yield* options.udp(server, (error) => {
                Deferred.doneUnsafe(reported, Effect.fail(socketFailure(exchange, error)))
              })
              const reader = yield* socket.reader
              const writer = yield* socket.writer
              yield* writer.write({ payload: exchange.encode({ id, udpPayloadSize }) })
              const receive = Effect.gen(function*() {
                while (true) {
                  for (const datagram of yield* reader.pull) {
                    if (Equal.equals(datagram.address, server) && exchange.matches(datagram.payload, id)) {
                      return datagram.payload
                    }
                  }
                }
              })
              return yield* Effect.raceFirst(receive, Deferred.await(reported))
            }).pipe(Effect.mapError((error) => error instanceof Dns.DnsError ? error : socketFailure(exchange, error)))
          )
          // TC bit
          return (received[2] & 0x02) !== 0 ? yield* tcp.servers[index].send(exchange) : received
        })
      }))
    })
  })

/**
 * Options for `makeTransportHttps`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface TransportHttpsOptions {
  /**
   * The URLs of the name servers. `http:` URLs are accepted only for
   * `localhost` and loopback addresses. Requests sent with `FetchHttpClient`
   * do not follow redirects.
   */
  readonly urls: Arr.NonEmptyReadonlyArray<string | URL>

  /**
   * The HTTP method of the queries. Defaults to `"GET"`.
   */
  readonly method?: "GET" | "POST" | undefined

  /**
   * Customizes the `HttpClient`, such as to add headers. Status codes and
   * retries are handled by the transport and `DnsClient`.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}

const maxMessageSize = 0xffff

/**
 * Creates a `Transport` that sends queries with the `HttpClient` service, as
 * DNS over HTTPS (RFC 8484). The `Age` of cached HTTP responses is subtracted
 * from the TTLs of their records.
 *
 * @see {@link TransportHttpsOptions} for the options and their defaults
 * @see {@link layerTransportHttps} for a layer
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeTransportHttps = (
  options: TransportHttpsOptions
): Effect.Effect<Transport["Service"], never, HttpClient.HttpClient> =>
  Effect.gen(function*() {
    const httpClient = yield* HttpClient.HttpClient
    if (options.urls.length === 0) {
      throw new RangeError("DnsClient needs at least one URL")
    }
    const urls = Arr.map(options.urls, (input) => {
      const url = new URL(input)
      const address = Result.getOrUndefined(NetAddress.ipFromString(url.hostname.replace(/^\[(.*)\]$/, "$1")))
      const loopback = url.hostname === "localhost" || (address !== undefined && NetAddress.isLoopback(address))
      if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
        throw new RangeError(`DnsClient URLs must use HTTPS, or HTTP for loopback hosts, received ${url}`)
      }
      return url
    })
    const client = HttpClient.withScope(options.transformClient?.(httpClient) ?? httpClient)
    const post = options.method === "POST"

    return Transport.of({
      servers: Arr.map(urls, (url) => ({
        send: Effect.fnUntraced(function*({ encode, fail, limit, matches }) {
          const query = encode({ id: 0, udpPayloadSize: 1232, padding: 128 })
          const request = HttpClientRequest.setHeader(
            post
              ? HttpClientRequest.bodyUint8Array(HttpClientRequest.post(url), query, "application/dns-message")
              : HttpClientRequest.setUrlParam(HttpClientRequest.get(url), "dns", Base64Url.encode(query)),
            "accept",
            "application/dns-message"
          )
          // `fetch` follows redirects by default, which could leave HTTPS.
          const requestInit = Option.getOrUndefined(yield* Effect.serviceOption(FetchHttpClient.RequestInit))
          const payload = yield* limit(Effect.gen(function*() {
            const response = yield* client.execute(request).pipe(
              Effect.provideService(FetchHttpClient.RequestInit, { ...requestInit, redirect: "manual" })
            )
            if (response.status < 200 || response.status >= 300) {
              return yield* fail(
                response.status >= 500 ? "ServerFailure" : response.status === 429 ? "Temporary" : "InvalidResponse",
                new Error(`the server responded with status ${response.status}`)
              )
            }
            const contentType = (response.headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase()
            if (contentType !== "application/dns-message") {
              return yield* fail("InvalidResponse", new Error("the response is not a DNS message"))
            }
            const tooLong = () =>
              fail("InvalidResponse", new Error(`the response is longer than ${maxMessageSize} bytes`))
            if (Number(response.headers["content-length"]) > maxMessageSize) return yield* tooLong()
            const chunks: Array<Uint8Array> = []
            let length = 0
            yield* Stream.runForEach(response.stream, (chunk) => {
              length += chunk.length
              if (length > maxMessageSize) return Effect.fail(tooLong())
              chunks.push(chunk)
              return Effect.void
            })
            // Seconds the response spent in HTTP caches (RFC 9111 section 5.1).
            const age = /^\d+$/.test(response.headers["age"] ?? "") ? Number(response.headers["age"]) : 0
            return { message: concat(new Uint8Array(0), chunks), age }
          }))
          if (!matches(payload.message, 0)) {
            return yield* fail("InvalidResponse", new Error("the response does not match the query"))
          }
          return payload.age > 0 ? DnsMessage.subtractTtl(payload.message, payload.age) : payload.message
        })
      }))
    })
  })

/**
 * Layer that provides a `Transport` sending queries over HTTP with the
 * `HttpClient` service, as DNS over HTTPS (RFC 8484).
 *
 * **Example** (Resolving names over HTTPS in a browser)
 *
 * ```ts import.meta.vitest
 * import { Layer } from "effect"
 * import { FetchHttpClient } from "effect/http"
 * import { DnsClient } from "effect/net"
 *
 * const DnsLive = DnsClient.layerDns.pipe(
 *   Layer.provide(DnsClient.layer()),
 *   Layer.provide(DnsClient.layerTransportHttps({ urls: ["https://cloudflare-dns.com/dns-query"] })),
 *   Layer.provide(FetchHttpClient.layer)
 * )
 * ```
 *
 * @see {@link makeTransportHttps} for the behavior and options
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerTransportHttps = (
  options: TransportHttpsOptions
): Layer.Layer<Transport, never, HttpClient.HttpClient> => Layer.effect(Transport, makeTransportHttps(options))

// =============================================================================
// Client
// =============================================================================

/**
 * Options for `make`.
 *
 * **Details**
 *
 * `attempts` is the number of passes over the name servers, and `timeout`
 * applies to each exchange, including a retry over TCP. `attempts` defaults
 * to 2, `timeout` to 5 seconds, and `ndots` to 1.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface MakeOptions {
  readonly timeout?: Duration.Input | undefined
  readonly attempts?: number | undefined
  readonly rotate?: boolean | undefined
  readonly search?: ReadonlyArray<Host.DomainNameInput> | undefined
  readonly ndots?: number | undefined
  readonly noAaaa?: boolean | undefined
  readonly hosts?: Host.HostsTable | undefined
}

/**
 * Creates a `DnsClient` that sends queries with the `Transport` service,
 * moving on to the next name server when one fails. Queries answered with
 * FORMERR or NOTIMP and no EDNS(0) record are retried without EDNS(0).
 *
 * @see {@link MakeOptions} for the options and their defaults
 * @see {@link layer} for a layer
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: MakeOptions = {}): Effect.Effect<DnsClient["Service"], never, Transport> =>
  Effect.gen(function*() {
    const { servers } = yield* Transport
    const timeout = Duration.fromInputUnsafe(options.timeout ?? Duration.seconds(5))
    const attempts = options.attempts ?? 2
    if (!Duration.isFinite(timeout) || !Duration.isPositive(timeout)) {
      throw new RangeError(`DnsClient timeout must be a positive finite duration, received ${timeout}`)
    }
    if (!Number.isSafeInteger(attempts) || attempts < 1) {
      throw new RangeError(`DnsClient attempts must be a positive integer, received ${attempts}`)
    }
    const ndots = options.ndots ?? 1
    if (!Number.isSafeInteger(ndots) || ndots < 0) {
      throw new RangeError(`DnsClient ndots must be a non-negative integer, received ${ndots}`)
    }
    const search = Arr.map(options.search ?? [], (domain) => Host.domainNameFromStringUnsafe(domain))
    let rotation = 0

    const query = Effect.fnUntraced(function*(
      input: Host.DomainNameInput,
      type: Dns.RecordType | number,
      queryOptions?: { readonly recursionDesired?: boolean | undefined }
    ) {
      const code = typeof type === "number" ? type : Dns.isRecordType(type) ? DnsMessage.typeCodes[type] : undefined
      const recordType = typeof type === "number" ? recordTypesByCode.get(type) : type
      const parsed = Host.domainNameFromInput(input)
      if (Result.isFailure(parsed)) {
        return yield* new Dns.DnsError({
          reason: "BadName",
          method: "resolve",
          hostname: input,
          recordType,
          cause: parsed.failure
        })
      }
      const name = parsed.success
      const fail = (reason: Dns.DnsErrorReason, cause?: unknown) =>
        new Dns.DnsError({ reason, method: "resolve", hostname: name, recordType, cause })
      if (code === undefined || !Number.isInteger(code) || code < 1 || code > 0xffff || unsupportedCodes.has(code)) {
        return yield* fail("Unsupported")
      }
      const question = { name: Host.toFullyQualified(name), type: code }
      const recursionDesired = queryOptions?.recursionDesired ?? true

      // Without `edns`, queries leave out the OPT record.
      const exchange = (edns: boolean): Exchange => ({
        encode: ({ id, padding, udpPayloadSize }) =>
          DnsMessage.encodeQuery({
            id,
            name,
            type: question.type,
            recursionDesired,
            udpPayloadSize: edns ? udpPayloadSize : undefined,
            padding
          }),
        matches: (message, id) => {
          // The ID is checked before the questions are decoded.
          if (message.length < 2 || ((message[0] << 8) | message[1]) !== id) return false
          const header = Result.getOrUndefined(DnsMessage.decodeHeader(message))
          if (header === undefined || !header.isResponse || header.opcode !== 0) return false
          // Some servers leave the question out of format error responses.
          if (header.questions.length === 0) return header.rcode === 1
          if (header.questions.length !== 1) return false
          const [{ class: klass, name, type }] = header.questions
          return type === question.type && klass === 1 && lower(name) === question.name
        },
        limit: (effect) =>
          effect.pipe(
            Effect.scoped,
            Effect.mapError((cause) => cause instanceof Dns.DnsError ? cause : fail("Temporary", cause)),
            Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.fail(fail("Timeout")) })
          ),
        fail
      })
      const withEdns = exchange(true)
      const withoutEdns = exchange(false)

      const send = Effect.fnUntraced(function*(server: Transport["Service"]["servers"][number], exchange: Exchange) {
        const decoded = DnsMessage.decodeResponse(yield* server.send(exchange))
        if (Result.isFailure(decoded)) {
          return yield* fail("InvalidResponse", decoded.failure)
        }
        return decoded.success
      })

      const attempt = Effect.fnUntraced(function*(server: Transport["Service"]["servers"][number]) {
        let response = yield* send(server, withEdns)
        // Servers without EDNS(0) answer FORMERR or NOTIMP without an OPT record (RFC 6891).
        if ((response.rcode === 1 || response.rcode === 4) && response.edns === undefined) {
          response = yield* send(server, withoutEdns)
        }
        if (response.rcode !== 0 && response.rcode !== 3) {
          return yield* fail(rcodeReasons[response.rcode] ?? "Unknown", response)
        }
        // A referral from a server without recursion. Unlike Go, an echoed OPT
        // record does not count as additional data.
        if (
          recursionDesired && response.rcode === 0 && !response.flags.authoritative &&
          !response.flags.recursionAvailable && response.answer.length === 0 && response.additional.length === 0
        ) {
          return yield* fail("Refused", new Error("the server does not offer recursion"))
        }
        return response
      })

      const start = options.rotate ? rotation++ % servers.length : 0
      let error: Dns.DnsError | undefined
      for (let round = 0; round < attempts; round++) {
        for (let i = 0; i < servers.length; i++) {
          const result = yield* Effect.result(attempt(servers[(start + i) % servers.length]))
          if (Result.isSuccess(result)) return result.success
          error = result.failure
        }
      }
      return yield* error!
    })

    return DnsClient.of({
      query,
      search,
      ndots,
      noAaaa: options.noAaaa ?? false,
      hosts: options.hosts ?? new Map()
    })
  })

/**
 * Layer that provides a `DnsClient` sending queries with the `Transport`
 * service.
 *
 * @see {@link make} for the behavior and options
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: MakeOptions): Layer.Layer<DnsClient, never, Transport> =>
  Layer.effect(DnsClient, make(options))

// =============================================================================
// System configuration
// =============================================================================

/**
 * The resolver configuration of a `resolv.conf` file.
 *
 * @see {@link parseResolvConf} for reading a `resolv.conf` file
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ResolvConf {
  readonly nameServers: ReadonlyArray<NetAddress.InetAddress>
  readonly search: ReadonlyArray<Host.DomainName> | undefined
  readonly ndots: number | undefined
  readonly timeout: Duration.Duration | undefined
  readonly attempts: number | undefined
  readonly rotate: boolean | undefined
  readonly useTcp: boolean | undefined
  readonly noAaaa: boolean | undefined
}

const clamp = (value: string, min: number, max: number): number | undefined => {
  const n = Number(value)
  return /^\d+$/.test(value) ? Math.min(Math.max(n, min), max) : undefined
}

/**
 * Parses the resolver configuration of a `resolv.conf` file, like glibc.
 * Invalid and unknown entries, and IPv6 name servers with a scope ID, are
 * skipped.
 *
 * **Example** (Parsing a resolv.conf file)
 *
 * ```ts import.meta.vitest
 * import { DnsClient, NetAddress } from "effect/net"
 *
 * const config = DnsClient.parseResolvConf(`
 * nameserver 192.0.2.53
 * search corp.example
 * options ndots:2 rotate
 * `)
 * config.nameServers.map(NetAddress.formatInet) // => ["192.0.2.53:53"]
 * config.search // => ["corp.example"]
 * config.ndots // => 2
 * config.rotate // => true
 * ```
 *
 * @stability experimental
 * @category decoding
 * @since 4.0.0
 */
export const parseResolvConf = (text: string): ResolvConf => {
  const nameServers: Array<NetAddress.InetAddress> = []
  let search: ReadonlyArray<Host.DomainName> | undefined
  let ndots: number | undefined
  let timeout: Duration.Duration | undefined
  let attempts: number | undefined
  let rotate: boolean | undefined
  let useTcp: boolean | undefined
  let noAaaa: boolean | undefined
  for (const line of text.split(/\r?\n/)) {
    const [keyword, ...values] = line.trim().split(/\s+/)
    if (keyword === undefined || keyword.startsWith("#") || keyword.startsWith(";")) continue
    switch (keyword) {
      case "nameserver": {
        const value = values[0]
        // Platform sockets cannot use IPv6 name servers with a scope ID.
        if (value === undefined || value.includes("%") || nameServers.length === 3) break
        const address = NetAddress.inetAddressFromString(value.includes(":") ? `[${value}]:53` : `${value}:53`)
        if (Result.isSuccess(address)) nameServers.push(address.success)
        break
      }
      case "domain":
      case "search":
        search = Arr.filterMap(
          keyword === "domain" ? values.slice(0, 1) : values,
          (value) => Host.domainNameFromString(value)
        )
        break
      case "options":
        for (const option of values) {
          const [name, value = ""] = option.split(":", 2)
          switch (name) {
            case "ndots":
              ndots = clamp(value, 0, 15) ?? ndots
              break
            case "timeout": {
              const seconds = clamp(value, 1, 30)
              if (seconds !== undefined) timeout = Duration.seconds(seconds)
              break
            }
            case "attempts":
              attempts = clamp(value, 1, 5) ?? attempts
              break
            case "rotate":
              rotate = true
              break
            case "use-vc":
            case "usevc":
            case "tcp":
              useTcp = true
              break
            case "no-aaaa":
              noAaaa = true
              break
          }
        }
        break
    }
  }
  return { nameServers, search, ndots, timeout, attempts, rotate, useTcp, noAaaa }
}

// =============================================================================
// Dns
// =============================================================================

const failureOf =
  (method: Dns.DnsError["method"], hostname: string, recordType?: Dns.RecordType) => (error: Dns.DnsError) =>
    new Dns.DnsError({ reason: error.reason, method, hostname, recordType, cause: error.cause })

/**
 * Layer that provides the `Dns` service by querying name servers with
 * `DnsClient`.
 *
 * **Details**
 *
 * `lookup` checks the `hosts` table first and resolves `localhost` names to
 * loopback addresses. Other names are queried as A and AAAA records with the
 * `search` domains and `ndots`, like a stub resolver; failures other than
 * SERVFAIL end the search, like in glibc. Queries follow up to 8
 * CNAME records, querying a target that a response leaves unresolved unless
 * the response is negative or the target is not a host name.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerDns: Layer.Layer<Dns.Dns, never, DnsClient> = Layer.effect(
  Dns.Dns,
  Effect.gen(function*() {
    const client = yield* DnsClient

    const candidates = (host: Host.DomainName): ReadonlyArray<Host.DomainName> => {
      if (Host.isFullyQualified(host)) return [host]
      const searched = Arr.filterMap(
        client.search.filter((domain) => domain !== "."),
        (domain) => Host.domainNameFromString(`${host}.${Host.toRelative(domain)}.`)
      )
      const absoluteHost = Host.toFullyQualified(host)
      return host.split(".").length - 1 >= client.ndots ? [absoluteHost, ...searched] : [...searched, absoluteHost]
    }

    const resolveChain = <T extends Dns.RecordType>(
      name: Host.DomainName,
      type: T,
      // CNAME records followed per lookup, including those of follow-up queries.
      aliases = 8
    ): Effect.Effect<ReadonlyArray<Dns.RecordFor<T>>, Dns.DnsError> =>
      Effect.flatMap(client.query(name, type), (response) => {
        let owner: string = Host.toFullyQualified(name)
        for (let hops = 0; hops <= aliases; hops++) {
          const atOwner = response.answer.filter((record) => record.class === 1 && lower(record.owner) === owner)
          const records = atOwner.flatMap((record) =>
            record.data._tag === type ? [record.data as Dns.RecordFor<T>] : []
          )
          if (records.length > 0) return Effect.succeed(records)
          // Records of the type whose data `Dns` cannot represent.
          if (
            atOwner.some((record) => record.data._tag === "UNKNOWN" && record.data.type === DnsMessage.typeCodes[type])
          ) {
            return Effect.fail(
              new Dns.DnsError({
                reason: "InvalidResponse",
                method: "resolve",
                hostname: name,
                recordType: type,
                cause: new Error(`no ${type} record can be represented`)
              })
            )
          }
          const alias = atOwner.find((record) => record.data._tag === "CNAME")?.data as Dns.Cname | undefined
          if (alias === undefined) {
            // NXDOMAIN, or NODATA with the SOA record of the target's zone (RFC 2308).
            const negative = response.rcode !== 0 || response.authority.some((record) => record.data._tag === "SOA")
            // Query the target if it is a host name.
            const target = hops === 0 || negative || !/^[\w.-]+$/.test(owner)
              ? undefined
              : Result.getOrUndefined(Host.domainNameFromString(owner))
            return target === undefined ? Effect.succeed([]) : resolveChain(target, type, aliases - hops)
          }
          owner = lower(alias.target)
        }
        return Effect.succeed([])
      })

    return Dns.make({
      lookup: Effect.fnUntraced(function*(host, family) {
        const key = Host.toRelative(host)
        const fromHosts = (client.hosts.get(key) ?? []).filter((address) =>
          family === undefined || NetAddress.isFamily(address, family)
        )
        if (fromHosts.length > 0) return fromHosts
        if (key === "localhost" || key.endsWith(".localhost")) {
          return family === "IPv4"
            ? [NetAddress.ipv4Loopback]
            : family === "IPv6"
            ? [NetAddress.ipv6Loopback]
            : NetAddress.loopbackAddresses
        }
        if (family === "IPv6" && client.noAaaa) return []
        const types = family === "IPv4" || client.noAaaa
          ? ["A" as const]
          : family === "IPv6"
          ? ["AAAA" as const]
          : ["A", "AAAA"] as const
        let error: Dns.DnsError | undefined
        for (const name of candidates(host)) {
          const results = yield* Effect.forEach(types, (type) => Effect.result(resolveChain(name, type)), {
            concurrency: "unbounded"
          })
          const addresses = results.flatMap((result) =>
            Result.isSuccess(result) ? result.success.map((record) => record.address) : []
          )
          if (addresses.length > 0) return addresses
          const failures = results.flatMap((result) => Result.isFailure(result) ? [result.failure] : [])
          // Like glibc, only SERVFAIL moves on to the next name.
          const fatal = failures.find((failure) => failure.reason !== "ServerFailure")
          if (fatal !== undefined) return yield* failureOf("lookup", host)(fatal)
          error ??= failures[0]
        }
        if (error !== undefined) return yield* failureOf("lookup", host)(error)
        return []
      }),
      resolve: (name, type) => Effect.mapError(resolveChain(name, type), failureOf("resolve", name, type)),
      reverse: (address) =>
        resolveChain(Dns.reverseName(address), "PTR").pipe(
          Effect.map(Arr.map((record) => record.host)),
          Effect.mapError(failureOf("reverse", NetAddress.formatIp(address)))
        )
    })
  })
)
