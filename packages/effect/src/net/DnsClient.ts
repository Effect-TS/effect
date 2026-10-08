/**
 * A DNS client that speaks the DNS protocol itself, returning full responses
 * with their sections, TTLs, and header flags.
 *
 * `make` sends each query over UDP from a new socket, so every attempt gets a
 * fresh source port and a random query ID, and retries over TCP when the
 * response is truncated. Name servers are tried in order, with a timeout per
 * attempt, until one answers.
 *
 * Record data reuses the `Dns` record values. Records that `Dns` cannot
 * represent, such as unknown record types or names that are not valid
 * `Host.DomainName` values, are kept as `RawRecord` values.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import * as Context from "../Context.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as DnsMessage from "../internal/dnsMessage.ts"
import * as Layer from "../Layer.ts"
import * as Result from "../Result.ts"
import type * as DatagramSocket from "../socket/DatagramSocket.ts"
import * as Socket from "../socket/Socket.ts"
import * as Dns from "./Dns.ts"
import * as Host from "./Host.ts"
import * as NetAddress from "./NetAddress.ts"

/**
 * The undecoded data of a record that is not a `Dns.DnsRecord`.
 *
 * **Details**
 *
 * Records of types that `Dns` does not support are kept as raw data, and so
 * are records of supported types whose data cannot be represented, such as a
 * PTR record whose name is not a valid `Host.DomainName`. `type` is the
 * numeric record type and `data` holds the record's RDATA bytes.
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
 * **Details**
 *
 * `owner` is the fully qualified owner name in DNS presentation format, with
 * the letter case sent by the server: dots and backslashes inside a label are
 * escaped as `\.` and `\\`, and other bytes outside printable ASCII as `\DDD`.
 * `ttl` is the time to live, where values of 2^31 seconds or more count as zero
 * (RFC 2181). `class` is the numeric record class, `1` for the internet class.
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
 * A DNS response: its header flags, response code, and record sections.
 *
 * **Details**
 *
 * - `rcode` is the numeric response code, including the extended bits of an
 *   EDNS(0) response: `0` for no error and `3` for a name that does not exist.
 * - `edns` holds the EDNS(0) parameters of the server's OPT record, which is not
 *   included in `additional`; it is `undefined` when the server sent none.
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
 * **Details**
 *
 * Names are normalized domain names without a trailing dot, and addresses are
 * kept in the order they were listed.
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
 * Service that sends DNS queries and returns the full responses.
 *
 * **Details**
 *
 * Besides `query`, the service carries the stub resolver configuration that
 * `layerDns` applies to address lookups: the `search` domains, the `ndots`
 * threshold, and the `hosts` table.
 *
 * @see {@link make} for the default implementation
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class DnsClient extends Context.Service<DnsClient, {
  /**
   * Queries the records of one type for a name and returns the response.
   *
   * **Details**
   *
   * Responses with no error and responses for names that do not exist
   * (NXDOMAIN) both succeed; read `rcode` to tell them apart. Other response
   * codes, timeouts, and transport errors fail with a `Dns.DnsError` once
   * every name server has been tried. Names are queried as given, without
   * search domains. Recursion is requested unless `recursionDesired` is
   * `false`.
   */
  query(
    name: Host.DomainName,
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

const randomId = (): number => globalThis.crypto.getRandomValues(new Uint16Array(1))[0]

const absolute = (name: Host.DomainName): string => name.endsWith(".") ? name : `${name}.`

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

/**
 * Options for `make`.
 *
 * **Details**
 *
 * - `udp(server)` opens a socket for one UDP attempt. The socket must send to
 *   `server` by default, as a `peer` or connected socket, and should bind an
 *   ephemeral port so the operating system picks a random source port.
 * - `tcp(server)` opens a connection for a query whose UDP response was
 *   truncated.
 * - Name servers given as IP addresses use port 53. They are tried in order,
 *   starting with the next one for each query when `rotate` is set, for
 *   `attempts` rounds (default 2). Each UDP or TCP exchange is limited to
 *   `timeout` (default 5 seconds).
 * - Queries advertise a UDP payload size of `udpPayloadSize` bytes (default
 *   1232) with EDNS(0).
 * - `search` (default none), `ndots` (default 1), and `hosts` (default empty)
 *   configure the address lookups of `layerDns`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface MakeOptions {
  readonly nameServers: Arr.NonEmptyReadonlyArray<NetAddress.IpAddress | NetAddress.InetAddress>
  readonly udp: (server: NetAddress.InetAddress) => Effect.Effect<DatagramSocket.DatagramSocket>
  readonly tcp: (server: NetAddress.InetAddress) => Effect.Effect<Socket.Socket>
  readonly timeout?: Duration.Input | undefined
  readonly attempts?: number | undefined
  readonly rotate?: boolean | undefined
  readonly udpPayloadSize?: number | undefined
  readonly search?: ReadonlyArray<Host.DomainName> | undefined
  readonly ndots?: number | undefined
  readonly hosts?: Effect.Effect<Hosts> | undefined
}

/**
 * Creates a `DnsClient` that sends queries to name servers with the given
 * socket constructors.
 *
 * **Details**
 *
 * - Each attempt opens a new socket and uses a new random query ID; the socket
 *   is closed when the attempt ends or is interrupted.
 * - A response is accepted only if it comes from the name server and matches
 *   the query's ID, name (in any letter case), type, and class; other packets
 *   are ignored. A truncated response is retried over TCP.
 * - Server failures, refusals, malformed responses, timeouts, and transport
 *   errors move on to the next name server.
 *
 * **Gotchas**
 *
 * Invalid options cause a defect when the service is created: `attempts` must
 * be a positive integer, `timeout` a positive finite duration,
 * `udpPayloadSize` an integer from 512 to 65535, and `ndots` a non-negative
 * integer.
 *
 * @see {@link MakeOptions} for the options and their defaults
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (options: MakeOptions): Effect.Effect<DnsClient["Service"]> =>
  Effect.sync(() => {
    const timeout = Duration.fromInputUnsafe(options.timeout ?? Duration.seconds(5))
    const attempts = options.attempts ?? 2
    const udpPayloadSize = options.udpPayloadSize ?? 1232
    if (!Duration.isFinite(timeout) || !Duration.isPositive(timeout)) {
      throw new RangeError(`DnsClient timeout must be a positive finite duration, received ${timeout}`)
    }
    if (!Number.isSafeInteger(attempts) || attempts < 1) {
      throw new RangeError(`DnsClient attempts must be a positive integer, received ${attempts}`)
    }
    if (!Number.isInteger(udpPayloadSize) || udpPayloadSize < 512 || udpPayloadSize > 0xffff) {
      throw new RangeError(`DnsClient udpPayloadSize must be an integer from 512 to 65535, received ${udpPayloadSize}`)
    }
    const ndots = options.ndots ?? 1
    if (!Number.isSafeInteger(ndots) || ndots < 0) {
      throw new RangeError(`DnsClient ndots must be a non-negative integer, received ${ndots}`)
    }
    if (options.nameServers.length === 0) {
      throw new RangeError("DnsClient needs at least one name server")
    }
    const servers = options.nameServers.map((server) =>
      NetAddress.isIpAddress(server) ? NetAddress.inetAddressUnsafe(server, 53) : server
    )
    let rotation = 0

    const query = Effect.fnUntraced(function*(
      name: Host.DomainName,
      type: Dns.RecordType,
      queryOptions?: { readonly recursionDesired?: boolean | undefined }
    ) {
      const fail = (reason: Dns.DnsErrorReason, cause?: unknown) =>
        new Dns.DnsError({ reason, method: "resolve", hostname: name, recordType: type, cause })
      const question = { name: absolute(name), type: DnsMessage.typeCodes[type] }

      const matches = (header: DnsMessage.Header, id: number): boolean => {
        if (header.id !== id || !header.isResponse || header.opcode !== 0) return false
        // Some servers leave the question out of format error responses.
        if (header.questions.length === 0) return header.rcode === 1
        if (header.questions.length !== 1) return false
        const [{ class: klass, name, type }] = header.questions
        return type === question.type && klass === 1 && name.toLowerCase() === question.name
      }

      const udp = (server: NetAddress.InetAddress, payload: Uint8Array, id: number) =>
        Effect.gen(function*() {
          const socket = yield* options.udp(server)
          const reader = yield* socket.reader
          const writer = yield* socket.writer
          yield* writer.write({ payload })
          while (true) {
            for (const datagram of yield* reader.pull) {
              if (!Equal.equals(datagram.address, server)) continue
              const header = Result.getOrUndefined(DnsMessage.decodeHeader(datagram.payload))
              if (header !== undefined && matches(header, id)) return { header, payload: datagram.payload }
            }
          }
        }).pipe(
          Effect.scoped,
          Effect.mapError((cause) => fail("Refused", cause)),
          Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.fail(fail("Timeout")) })
        )

      const tcp = (server: NetAddress.InetAddress, payload: Uint8Array) =>
        Effect.gen(function*() {
          const socket = yield* options.tcp(server)
          const pull = yield* Socket.readerBytes(socket)
          const writer = yield* socket.writer
          yield* writer.write(tcpFrame(payload))
          let buffer: Uint8Array = new Uint8Array(0)
          while (buffer.length < 2 || buffer.length < 2 + ((buffer[0] << 8) | buffer[1])) {
            buffer = concat(buffer, yield* pull)
          }
          return buffer.subarray(2, 2 + ((buffer[0] << 8) | buffer[1]))
        }).pipe(
          Effect.scoped,
          Effect.mapError((cause) => fail("Refused", cause)),
          Effect.timeoutOrElse({ duration: timeout, orElse: () => Effect.fail(fail("Timeout")) })
        )

      const encode = (id: number) =>
        DnsMessage.encodeQuery({
          id,
          name,
          type: question.type,
          recursionDesired: queryOptions?.recursionDesired ?? true,
          udpPayloadSize
        })

      const exchange = Effect.fnUntraced(function*(server: NetAddress.InetAddress) {
        const udpId = randomId()
        const received = yield* udp(server, encode(udpId), udpId)
        let payload = received.payload
        if (received.header.flags.truncated) {
          const tcpId = randomId()
          payload = yield* tcp(server, encode(tcpId))
          const header = Result.getOrUndefined(DnsMessage.decodeHeader(payload))
          if (header === undefined || !matches(header, tcpId)) {
            return yield* fail("InvalidResponse", new Error("the TCP response does not match the query"))
          }
        }
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
      for (let attempt = 0; attempt < attempts; attempt++) {
        for (let i = 0; i < servers.length; i++) {
          const result = yield* Effect.result(exchange(servers[(start + i) % servers.length]))
          if (Result.isSuccess(result)) return result.success
          error = result.failure
        }
      }
      return yield* error!
    })

    return DnsClient.of({
      query,
      search: options.search ?? [],
      ndots,
      hosts: options.hosts ?? Effect.succeed(new Map())
    })
  })

// =============================================================================
// System configuration
// =============================================================================

const clamp = (value: string, min: number, max: number): number | undefined => {
  const n = Number(value)
  return /^\d+$/.test(value) ? Math.min(Math.max(n, min), max) : undefined
}

/**
 * Parses the stub resolver configuration of a `resolv.conf` file.
 *
 * **Details**
 *
 * - `nameserver` lines give up to three name servers on port 53. Numeric IPv6
 *   zones such as `fe80::1%2` are kept; named zones are skipped.
 * - `search` sets the search domains and `domain` sets a single search
 *   domain; the last of these lines wins. Invalid domain names are skipped.
 * - `options` reads `ndots:n` (at most 15), `timeout:n` in seconds (1 to
 *   30), `attempts:n` (1 to 5), and `rotate`, like glibc.
 *
 * Lines starting with `#` or `;`, unknown keywords, and unknown options are
 * ignored, and values that are not given are `undefined`.
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
 * Parses a hosts file into the addresses of each host name.
 *
 * **Details**
 *
 * Each line holds an IP address followed by a canonical name and aliases;
 * text after `#` is a comment. Lines with an invalid address, including IPv6
 * addresses with a zone, and names that are not valid domain names are
 * skipped. Names are normalized like `Host.domainNameFromString`, without a
 * trailing dot.
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

// Returns the names to query for a host: fully qualified names as given,
// names with at least `ndots` dots first as given and then with each search
// domain, and other names with the search domains first.
const candidates = (client: DnsClient["Service"], host: Host.DomainName): ReadonlyArray<Host.DomainName> => {
  if (Host.isFullyQualified(host)) return [host]
  const searched = Arr.filterMap(
    client.search.filter((domain) => domain !== "."),
    (domain) => Host.domainNameFromString(`${host}.${relative(domain)}.`)
  )
  const absoluteHost = `${host}.` as Host.DomainName
  return host.split(".").length - 1 >= client.ndots ? [absoluteHost, ...searched] : [...searched, absoluteHost]
}

// Queries the records of a type, following CNAME records in the answer and
// querying the target of an alias whose records the answer does not include.
const resolveChain = <T extends Dns.RecordType>(
  client: DnsClient["Service"],
  name: Host.DomainName,
  type: T,
  aliases = maxAliases
): Effect.Effect<ReadonlyArray<Dns.RecordFor<T>>, Dns.DnsError> =>
  Effect.flatMap(client.query(name, type), (response) => {
    let owner = absolute(name)
    let target: Host.DomainName | undefined
    for (let hops = 0; hops <= aliases; hops++) {
      const atOwner = response.answer.filter((record) => record.owner.toLowerCase() === owner)
      const records = atOwner.flatMap((record) => record.data._tag === type ? [record.data as Dns.RecordFor<T>] : [])
      if (records.length > 0) return Effect.succeed(records)
      const alias = atOwner.find((record) => record.data._tag === "CNAME")?.data as Dns.Cname | undefined
      if (alias === undefined) {
        return target === undefined || response.rcode !== 0
          ? Effect.succeed([])
          : resolveChain(client, target, type, aliases - hops)
      }
      target = alias.target
      owner = absolute(target)
    }
    return Effect.succeed([])
  })

const withMethod = (method: "lookup" | "reverse", hostname: string) => (error: Dns.DnsError) =>
  new Dns.DnsError({ reason: error.reason, method, hostname, cause: error.cause })

/**
 * Layer that provides the `Dns` service by querying name servers with
 * `DnsClient`.
 *
 * **Details**
 *
 * - `lookup` returns the addresses of the host from the client's `hosts`
 *   table when it lists any of the requested family. Otherwise it queries A
 *   and AAAA records, with IPv4 addresses first, of each name built from the
 *   host and the `search` domains until one has addresses. Relative names
 *   with at least `ndots` dots are tried as given before the search domains,
 *   others after them; fully qualified names are tried only as given. A
 *   failed query moves on to the next name, and is reported if no name has
 *   addresses.
 * - `resolve` queries the name as given and `reverse` queries the PTR records
 *   of `Dns.reverseName(address)`.
 * - Queries follow CNAME records, up to 8 per operation, querying the target
 *   of an alias when the response does not include its records.
 * - Records that `Dns` cannot represent are skipped, and names that do not
 *   exist or have no records fail with `NotFound`.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerDns: Layer.Layer<Dns.Dns, never, DnsClient> = Layer.effect(
  Dns.Dns,
  Effect.map(Effect.service(DnsClient), (client) =>
    Dns.make({
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
        for (const name of candidates(client, host)) {
          const results = yield* Effect.forEach(types, (type) => Effect.result(resolveChain(client, name, type)), {
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
      resolve: (name, type) => resolveChain(client, name, type),
      reverse: (address) =>
        resolveChain(client, Dns.reverseName(address), "PTR").pipe(
          Effect.map(Arr.map((record) => record.host)),
          Effect.mapError(withMethod("reverse", NetAddress.formatIp(address)))
        )
    }))
)
