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
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Base64Url from "../encoding/Base64Url.ts"
import * as Equal from "../Equal.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import * as DnsMessage from "../internal/dnsMessage.ts"
import * as Layer from "../Layer.ts"
import * as Result from "../Result.ts"
import type * as Scope from "../Scope.ts"
import type * as DatagramSocket from "../socket/DatagramSocket.ts"
import * as Socket from "../socket/Socket.ts"
import * as Dns from "./Dns.ts"
import * as Host from "./Host.ts"
import * as NetAddress from "./NetAddress.ts"

/**
 * A record that cannot be represented as a `Dns.DnsRecord`, with its numeric
 * type and undecoded data.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface RawRecord {
  readonly _tag: "Raw"
  readonly type: number
  readonly data: Uint8Array
}

/**
 * A resource record of a DNS response section.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface ResourceRecord<D extends Dns.DnsRecord | RawRecord = Dns.DnsRecord | RawRecord> {
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

/**
 * The addresses of host names, as read from a hosts file.
 *
 * @see {@link parseHosts} for reading a hosts file
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type Hosts = ReadonlyMap<Host.DomainName, Arr.NonEmptyReadonlyArray<NetAddress.IpAddress>>

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
   * Queries the records of one type for a name, without search domains.
   * NXDOMAIN responses succeed; other errors fail once every name server has
   * been tried.
   */
  query(
    name: Host.DomainNameInput,
    type: Dns.RecordType,
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
   * Reads the hosts table consulted by address lookups before DNS.
   */
  readonly hosts: Effect.Effect<Hosts>
}>()("effect/net/DnsClient") {}

const rcodeReasons: Record<number, Dns.DnsErrorReason> = {
  1: "InvalidResponse",
  2: "ServerFailure",
  4: "Unsupported",
  5: "Refused"
}

const absolute = (name: Host.DomainName): string => name.endsWith(".") ? name : `${name}.`

const asciiLowerCase = (name: string): string => name.replace(/[A-Z]/g, (letter) => letter.toLowerCase())

const tcpFrame = (payload: Uint8Array): Uint8Array => {
  const frame = new Uint8Array(payload.length + 2)
  frame[0] = payload.length >> 8
  frame[1] = payload.length & 0xff
  frame.set(payload, 2)
  return frame
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
 * **Details**
 *
 * - `encode` encodes the query with an ID and EDNS(0) options.
 * - `matches` returns whether a message is a response to the query.
 * - `limit` scopes one exchange and applies the client's timeout.
 * - `fail` creates the `Dns.DnsError` of the query.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Exchange {
  readonly encode: (options: {
    readonly id: number
    readonly udpPayloadSize: number
    readonly padding?: number | undefined
  }) => Uint8Array
  readonly matches: (message: Uint8Array, id: number) => boolean
  readonly limit: <A, E>(effect: Effect.Effect<A, E, Scope.Scope>) => Effect.Effect<A, Dns.DnsError>
  readonly fail: (reason: Dns.DnsErrorReason, cause?: unknown) => Dns.DnsError
}

/**
 * Service that sends the queries of a `DnsClient` to name servers, in the
 * order of `servers`.
 *
 * @see {@link makeTransportUdp} for UDP with retries over TCP
 * @see {@link makeTransportTcp} for TCP
 * @see {@link makeTransportHttps} for DNS over HTTPS
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class Transport extends Context.Service<Transport, {
  readonly servers: Arr.NonEmptyReadonlyArray<{
    readonly send: (exchange: Exchange) => Effect.Effect<Uint8Array, Dns.DnsError>
  }>
}>()("effect/net/DnsClient/Transport") {}

const nameServerAddresses = (
  nameServers: Arr.NonEmptyReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>
): Arr.NonEmptyReadonlyArray<NetAddress.InetAddress> => {
  if (nameServers.length === 0) {
    throw new RangeError("DnsClient needs at least one name server")
  }
  return Arr.map(nameServers, (server) => Result.getOrThrow(Dns.nameServerFromInput(server)))
}

/**
 * Options for `makeTransportTcp`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface TransportTcpOptions {
  readonly nameServers: Arr.NonEmptyReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>
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
    return Transport.of({
      servers: Arr.map(nameServerAddresses(options.nameServers), (server) => ({
        send: Effect.fnUntraced(function*({ encode, fail, limit, matches }) {
          const id = yield* crypto.randomIntBetween(0, 0xffff)
          const payload = yield* limit(Effect.gen(function*() {
            const socket = yield* options.tcp(server)
            const pull = yield* Socket.readerBytes(socket)
            const writer = yield* socket.writer
            yield* writer.write(tcpFrame(encode({ id, udpPayloadSize: 1232 })))
            let buffer: Uint8Array = new Uint8Array(0)
            while (buffer.length < 2 || buffer.length < 2 + ((buffer[0] << 8) | buffer[1])) {
              buffer = concat(buffer, yield* pull)
            }
            return buffer.subarray(2, 2 + ((buffer[0] << 8) | buffer[1]))
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
 * **Details**
 *
 * `udp(server)` must return a socket that sends to `server` by default.
 * `udpPayloadSize` defaults to 1232 bytes.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface TransportUdpOptions {
  readonly nameServers: Arr.NonEmptyReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>
  readonly udp: (server: NetAddress.InetAddress) => Effect.Effect<DatagramSocket.DatagramSocket>
  readonly tcp: (server: NetAddress.InetAddress) => Effect.Effect<Socket.Socket>
  readonly udpPayloadSize?: number | undefined
}

/**
 * Creates a `Transport` that sends queries over UDP and retries truncated
 * responses over TCP.
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
    return Transport.of({
      servers: Arr.map(nameServerAddresses(options.nameServers), (server, index) => ({
        send: Effect.fnUntraced(function*(exchange) {
          const id = yield* crypto.randomIntBetween(0, 0xffff)
          const received = yield* exchange.limit(Effect.gen(function*() {
            const socket = yield* options.udp(server)
            const reader = yield* socket.reader
            const writer = yield* socket.writer
            yield* writer.write({ payload: exchange.encode({ id, udpPayloadSize }) })
            while (true) {
              for (const datagram of yield* reader.pull) {
                if (Equal.equals(datagram.address, server) && exchange.matches(datagram.payload, id)) {
                  return datagram.payload
                }
              }
            }
          }))
          // TC bit
          return (received[2] & 0x02) !== 0 ? yield* tcp.servers[index].send(exchange) : received
        })
      }))
    })
  })

/**
 * Options for `makeTransportHttps`. `method` defaults to `"GET"`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface TransportHttpsOptions {
  readonly urls: Arr.NonEmptyReadonlyArray<string | URL>
  readonly method?: "GET" | "POST" | undefined
}

const dnsMessage = "application/dns-message"

/**
 * Creates a `Transport` that sends queries with the `HttpClient` service, as
 * DNS over HTTPS (RFC 8484).
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
  Effect.map(Effect.service(HttpClient.HttpClient), (httpClient) => {
    if (options.urls.length === 0) {
      throw new RangeError("DnsClient needs at least one URL")
    }
    const urls = Arr.map(options.urls, (input) => {
      const url = new URL(input)
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new RangeError(`DnsClient URLs must use HTTP or HTTPS, received ${url}`)
      }
      return url
    })
    const client = HttpClient.withScope(httpClient)
    const post = options.method === "POST"

    return Transport.of({
      servers: Arr.map(urls, (url) => ({
        send: Effect.fnUntraced(function*({ encode, fail, limit, matches }) {
          const query = encode({ id: 0, udpPayloadSize: 1232, padding: 128 })
          const request = HttpClientRequest.setHeader(
            post
              ? HttpClientRequest.bodyUint8Array(HttpClientRequest.post(url), query, dnsMessage)
              : HttpClientRequest.setUrlParam(HttpClientRequest.get(url), "dns", Base64Url.encode(query)),
            "accept",
            dnsMessage
          )
          const { payload, status } = yield* limit(Effect.gen(function*() {
            const response = yield* client.execute(request)
            const ok = response.status >= 200 && response.status < 300 &&
              response.headers["content-type"]?.split(";")[0].trim().toLowerCase() === dnsMessage
            return {
              status: response.status,
              payload: ok ? new Uint8Array(yield* response.arrayBuffer) : undefined
            }
          }))
          if (payload === undefined) {
            return yield* fail(
              status >= 500 ? "ServerFailure" : "InvalidResponse",
              new Error(`the server responded with status ${status} and no DNS message`)
            )
          }
          if (!matches(payload, 0)) {
            return yield* fail("InvalidResponse", new Error("the response does not match the query"))
          }
          return payload
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
 * `attempts` defaults to 2, `timeout` to 5 seconds, and `ndots` to 1.
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
  readonly hosts?: Effect.Effect<Hosts> | undefined
}

/**
 * Creates a `DnsClient` that sends queries with the `Transport` service,
 * moving on to the next name server when one fails.
 *
 * @see {@link MakeOptions} for the options and their defaults
 * @see {@link layer} for a layer
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: MakeOptions = {}): Effect.Effect<DnsClient["Service"], never, Transport> =>
  Effect.map(Effect.service(Transport), (transport) => {
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
    const { servers } = transport
    let rotation = 0

    const query = Effect.fnUntraced(function*(
      input: Host.DomainNameInput,
      type: Dns.RecordType,
      queryOptions?: { readonly recursionDesired?: boolean | undefined }
    ) {
      const name = yield* Effect.mapError(
        Effect.fromResult(Host.domainNameFromString(input)),
        (cause) => new Dns.DnsError({ reason: "BadName", method: "resolve", hostname: input, recordType: type, cause })
      )
      const fail = (reason: Dns.DnsErrorReason, cause?: unknown) =>
        new Dns.DnsError({ reason, method: "resolve", hostname: name, recordType: type, cause })
      const question = { name: absolute(name), type: DnsMessage.typeCodes[type] }
      const recursionDesired = queryOptions?.recursionDesired ?? true

      const exchange: Exchange = {
        encode: ({ id, padding, udpPayloadSize }) =>
          DnsMessage.encodeQuery({ id, name, type: question.type, recursionDesired, udpPayloadSize, padding }),
        matches: (message, id) => {
          const header = Result.getOrUndefined(DnsMessage.decodeHeader(message))
          if (header === undefined || header.id !== id || !header.isResponse || header.opcode !== 0) return false
          // Some servers leave the question out of format error responses.
          if (header.questions.length === 0) return header.rcode === 1
          if (header.questions.length !== 1) return false
          const [{ class: klass, name, type }] = header.questions
          return type === question.type && klass === 1 && asciiLowerCase(name) === question.name
        },
        limit: (effect) =>
          effect.pipe(
            Effect.scoped,
            Effect.mapError((cause) => fail("Refused", cause)),
            Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.fail(fail("Timeout")) })
          ),
        fail
      }

      const attempt = Effect.fnUntraced(function*(server: Transport["Service"]["servers"][number]) {
        const payload = yield* server.send(exchange)
        const response = yield* Effect.mapError(
          Effect.fromResult(DnsMessage.decodeResponse(payload)),
          (cause) => fail("InvalidResponse", cause)
        )
        if (response.rcode !== 0 && response.rcode !== 3) {
          return yield* fail(rcodeReasons[response.rcode] ?? "Unknown", response)
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
      hosts: options.hosts ?? Effect.succeed(new Map())
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

const clamp = (value: string, min: number, max: number): number | undefined => {
  const n = Number(value)
  return /^\d+$/.test(value) ? Math.min(Math.max(n, min), max) : undefined
}

/**
 * Parses the resolver configuration of a `resolv.conf` file, like glibc.
 * Invalid and unknown entries are skipped.
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
export const parseResolvConf = (text: string): {
  readonly nameServers: ReadonlyArray<NetAddress.InetAddress>
  readonly search: ReadonlyArray<Host.DomainName> | undefined
  readonly ndots: number | undefined
  readonly timeout: Duration.Duration | undefined
  readonly attempts: number | undefined
  readonly rotate: boolean | undefined
} => {
  const nameServers: Array<NetAddress.InetAddress> = []
  let search: ReadonlyArray<Host.DomainName> | undefined
  let ndots: number | undefined
  let timeout: Duration.Duration | undefined
  let attempts: number | undefined
  let rotate: boolean | undefined
  for (const line of text.split(/\r?\n/)) {
    const [keyword, ...values] = line.trim().split(/\s+/)
    if (keyword === undefined || keyword.startsWith("#") || keyword.startsWith(";")) continue
    switch (keyword) {
      case "nameserver": {
        const value = values[0]
        if (value === undefined || nameServers.length === 3) break
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
          }
        }
        break
    }
  }
  return { nameServers, search, ndots, timeout, attempts, rotate }
}

const relative = (name: string): string => name.length > 1 && name.endsWith(".") ? name.slice(0, -1) : name

/**
 * Parses a hosts file into the addresses of each host name. Invalid entries
 * are skipped.
 *
 * **Example** (Parsing a hosts file)
 *
 * ```ts import.meta.vitest
 * import { DnsClient, Host, NetAddress } from "effect/net"
 *
 * const hosts = DnsClient.parseHosts(`
 * 127.0.0.1 localhost
 * ::1       localhost ip6-localhost # loopback
 * `)
 * hosts.get(Host.domainNameFromStringUnsafe("localhost"))?.map(NetAddress.formatIp) // => ["127.0.0.1", "::1"]
 * ```
 *
 * @stability experimental
 * @category decoding
 * @since 4.0.0
 */
export const parseHosts = (text: string): Hosts => {
  const hosts = new Map<Host.DomainName, Array<NetAddress.IpAddress>>()
  for (const line of text.split(/\r?\n/)) {
    const comment = line.indexOf("#")
    const [first, ...names] = (comment === -1 ? line : line.slice(0, comment)).trim().split(/\s+/)
    const address = NetAddress.ipFromString(first)
    if (Result.isFailure(address)) continue
    for (const name of names) {
      const domain = Host.domainNameFromString(name)
      if (Result.isFailure(domain)) continue
      const key = relative(domain.success) as Host.DomainName
      const addresses = hosts.get(key)
      if (addresses === undefined) hosts.set(key, [address.success])
      else if (!addresses.some((existing) => Equal.equals(existing, address.success))) addresses.push(address.success)
    }
  }
  return hosts as unknown as Hosts
}

// =============================================================================
// Dns
// =============================================================================

// CNAME records followed per lookup, including those of follow-up queries.
const maxAliases = 8

const withMethod = (method: "lookup" | "reverse", hostname: string) => (error: Dns.DnsError) =>
  new Dns.DnsError({ reason: error.reason, method, hostname, cause: error.cause })

/**
 * Layer that provides the `Dns` service by querying name servers with
 * `DnsClient`.
 *
 * **Details**
 *
 * `lookup` checks the `hosts` table first, then queries A and AAAA records
 * with the `search` domains and `ndots`, like a stub resolver. Queries follow
 * up to 8 CNAME records.
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
        (domain) => Host.domainNameFromString(`${host}.${relative(domain)}.`)
      )
      const absoluteHost = `${host}.` as Host.DomainName
      return host.split(".").length - 1 >= client.ndots ? [absoluteHost, ...searched] : [...searched, absoluteHost]
    }

    const resolveChain = <T extends Dns.RecordType>(
      name: Host.DomainName,
      type: T,
      aliases = maxAliases
    ): Effect.Effect<ReadonlyArray<Dns.RecordFor<T>>, Dns.DnsError> =>
      Effect.flatMap(client.query(name, type), (response) => {
        let owner = absolute(name)
        let target: Host.DomainName | undefined
        for (let hops = 0; hops <= aliases; hops++) {
          const atOwner = response.answer.filter((record) => asciiLowerCase(record.owner) === owner)
          const records = atOwner.flatMap((record) =>
            record.data._tag === type ? [record.data as Dns.RecordFor<T>] : []
          )
          if (records.length > 0) return Effect.succeed(records)
          const raw = atOwner.find((record) =>
            record.data._tag === "Raw" && record.data.type === DnsMessage.typeCodes[type]
          )
          if (raw !== undefined) {
            return Effect.fail(
              new Dns.DnsError({
                reason: "InvalidResponse",
                method: "resolve",
                hostname: name,
                recordType: type,
                cause: raw
              })
            )
          }
          const alias = atOwner.find((record) => record.data._tag === "CNAME")?.data as Dns.Cname | undefined
          if (alias === undefined) {
            return target === undefined || response.rcode !== 0
              ? Effect.succeed([])
              : resolveChain(target, type, aliases - hops)
          }
          target = alias.target
          owner = absolute(target)
        }
        return Effect.succeed([])
      })

    return Dns.make({
      lookup: Effect.fnUntraced(function*(host, family) {
        const listed = (yield* client.hosts).get(relative(host) as Host.DomainName) ?? []
        const fromHosts = listed.filter((address) => family === undefined || NetAddress.isFamily(address, family))
        if (fromHosts.length > 0) return fromHosts
        const types = family === "IPv4"
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
          error ??= results.find(Result.isFailure)?.failure
        }
        if (error !== undefined) return yield* withMethod("lookup", host)(error)
        return []
      }),
      resolve: (name, type) => resolveChain(name, type),
      reverse: (address) =>
        resolveChain(Dns.reverseName(address), "PTR").pipe(
          Effect.map(Arr.map((record) => record.host)),
          Effect.mapError(withMethod("reverse", NetAddress.formatIp(address)))
        )
    })
  })
)
