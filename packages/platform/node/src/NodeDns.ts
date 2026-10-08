/**
 * The `NodeDns` module provides the Node.js `Dns` service for Effect programs.
 *
 * Address lookups use the operating system resolver through `dns.lookup`, so
 * they also read the hosts file. Record queries and reverse lookups use
 * `dns.Resolver` and can be cancelled by interruption. Interrupting an address
 * lookup does not stop the underlying `getaddrinfo` call, which keeps a libuv
 * thread pool worker busy until it returns. Node.js decodes each byte of TXT
 * and CAA character strings as one Latin-1 character; this service decodes
 * those bytes as UTF-8.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"

/**
 * Options for the Node.js `Dns` service.
 *
 * **Details**
 *
 * `nameServers` replaces the system name servers for record queries and
 * reverse lookups; IP addresses without a port use port 53, and an empty list
 * keeps the system name servers. `timeout` is the time allowed for each attempt
 * and `tries` the number of attempts per name server. Address lookups always
 * use the operating system resolver.
 *
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID, such as link-local addresses, are not
 * supported because the resolver drops the scope; record queries and reverse
 * lookups fail with `Unsupported`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options extends NodeDns.Options {}

const decoder = new TextDecoder()

const utf8FromLatin1 = (value: string): string =>
  // oxlint-disable-next-line no-control-regex
  /[^\x00-\x7f]/.test(value) ? decoder.decode(Uint8Array.from(value, (character) => character.charCodeAt(0))) : value

// Node.js decodes each byte of TXT and CAA character strings as one Latin-1
// character; decoding the bytes as UTF-8 matches other runtimes.
const utf8Strings = (record: Dns.DnsRecord): Dns.DnsRecord =>
  record._tag === "TXT"
    ? Dns.makeRecordUnsafe("TXT", { chunks: Arr.map(record.chunks, utf8FromLatin1) })
    : record._tag === "CAA"
    ? Dns.makeRecordUnsafe("CAA", { critical: record.critical, tag: record.tag, value: utf8FromLatin1(record.value) })
    : record

/**
 * Creates a Node.js `Dns` service.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: Options): Dns.Dns["Service"] => {
  const resolver = NodeDns.makeResolver(options)
  return Dns.make({
    lookup: NodeDns.lookup,
    resolve: (name, type) => Effect.map(resolver.resolve(name, type), Arr.map(utf8Strings)),
    reverse: resolver.reverse
  })
}

/**
 * Layer that provides the Node.js `Dns` service using the system resolver
 * configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.sync(Dns.Dns, () => make())

/**
 * Creates a layer that provides the Node.js `Dns` service with options read
 * from configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<Options>): Layer.Layer<Dns.Dns, Config.ConfigError> =>
  Layer.effect(Dns.Dns, Effect.map(Config.unwrap(options), make))
