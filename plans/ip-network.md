# IpNetwork / CIDR Module Plan

## Executive Summary

Add a pure `effect/unstable/net/IpNetwork` module representing canonical IPv4 and IPv6 network prefixes on top of the
existing `Net.IpAddress` values. The module should be deep: a small public interface owns prefix validation, host-bit
masking, strict CIDR parsing, canonical formatting, containment, overlap, equality, hashing, and Schema codecs. It
should not become a routing table, address allocator, host iterator, or alternate IP parser.

The central semantic decision is that an `IpNetwork` is a **network prefix**, not an arbitrary host address annotated
with a mask. Every value therefore has exactly one representation:

- IPv4 prefix lengths are integers in `0..32`; IPv6 prefix lengths are integers in `0..128`.
- `address` is the lowest address in the block; every bit after `prefixLength` is zero.
- IP version is retained exactly. An IPv4-mapped IPv6 prefix remains IPv6 and is never silently converted to IPv4.
- Equality and hashing use address family, canonical network address, and prefix length.
- Text encoding is always `${Net.formatIp(address)}/${prefixLength}`.

Use two intentionally different construction paths. `make(address, prefixLength)` and strict text parsing reject
non-zero host bits, matching a network-prefix value and PostgreSQL `cidr`. `fromAddress(address, prefixLength)`
explicitly truncates host bits and returns the containing network. This avoids the ambiguous convention in mature Rust
crates where the stored `addr` may retain host bits and a later `network()` call produces a different address.

The MVP should include immutable IPv4/IPv6 variants, guards, checked and throwing constructors, canonical parsing and
formatting, first/last address and address count, address/network containment, overlap, `Equal`/`Hash`, Schema
declarations and string codecs, and a narrow PostgreSQL `cidr` integration. Subnet iteration, host policies,
aggregation, routing lookup, special-purpose classification, and PostgreSQL `inet` modeling are explicitly deferred.

## Codebase Evidence

### Existing address foundation

- `packages/effect/src/unstable/net/Net.ts:38-67` defines immutable `Ipv4Address`, `Ipv6Address`, and their discriminated
  `IpAddress` union. `IpNetwork` should compose these values rather than introduce another address representation.
- `packages/effect/src/unstable/net/Net.ts:192-234` implements frozen prototypes with structural `Equal` and `Hash`
  behavior. A network value should follow this local style with private type IDs, frozen instances, canonical
  `toString`, and `NodeInspectSymbol` output.
- `packages/effect/src/unstable/net/Net.ts:288-432` provides checked constructors and parsers returning
  `Result.Result<_, AddressError>`, plus explicitly named throwing parsing. `IpNetwork` should use the same flat module
  function and `Result` conventions rather than classes with static methods.
- `packages/effect/src/unstable/net/Net.ts:440-495` exposes fresh octet/segment tuples. These are sufficient for prefix
  masking without exposing or changing `Net`'s private numeric representation.
- `packages/effect/src/unstable/net/Net.ts:519-551` already owns canonical IP text, including RFC 5952 zero compression
  and mapped-IPv4 display. CIDR formatting must delegate the address part to `Net.formatIp`; copying its formatter
  would immediately create a second canonicalization policy.
- `packages/effect/src/unstable/net/Net.ts:619-653` deliberately treats mapped IPv6 and IPv4 as distinct until the
  caller asks for `toCanonical`. Network construction must likewise avoid implicit cross-family conversion because a
  `/120` mapped-IPv6 network has no type-preserving IPv4 prefix equivalent without an explicit policy.
- `packages/effect/test/unstable/net/Net.test.ts:15-140` covers strict parsing, canonical text, numeric equality/hash,
  and mapped addresses. Network tests can reuse these established address expectations rather than retest the full IP
  grammar.
- `packages/effect/typetest/unstable/net/Net.tst.ts:5-28` establishes type-test conventions for checked/unsafe APIs,
  union narrowing, and Schema codec assignability.

### Schema integration

- `packages/effect/src/Schema.ts:12052-12068` has a local `netAddressFromString` helper that maps a pure `Result` parser
  failure into `SchemaIssue.InvalidValue` and canonically encodes the decoded value. Generalize or minimally duplicate
  this helper only if its types cannot accommodate `IpNetwork.NetworkError`; do not make `IpNetwork` depend on
  `Schema`.
- `packages/effect/src/Schema.ts:12070-12116` exports declaration schemas and string transformation codecs for all
  three IP address types. Network schemas should be adjacent and use the same naming pattern:
  `Ipv4Network`, `Ipv4NetworkFromString`, `Ipv6Network`, `Ipv6NetworkFromString`, `IpNetwork`, and
  `IpNetworkFromString`.
- `packages/effect/test/unstable/net/Net.test.ts:250-260` verifies permissive decode plus canonical encode and invalid
  input reporting. The network suite should similarly prove that alternate legal IPv6 address spelling decodes but
  encoding always uses canonical address text, while host bits fail decoding.

### Networking call sites and module seam

- `packages/effect/src/unstable/http/HttpServer.ts:56-74` and
  `packages/effect/src/unstable/socket/SocketServer.ts:15-26` expose concrete `Net.SocketAddress` values. A network is
  neither a bind address nor a peer endpoint, so these interfaces should not accept `IpNetwork`.
- `packages/effect/src/unstable/http/HttpServer.ts:171-189` and `:230-262` format socket and URL authorities. CIDR text
  is invalid in both contexts; keeping `IpNetwork` separate prevents accidental use of prefix notation in endpoint
  APIs.
- Runtime adapters convert native bound addresses at their boundary in
  `packages/platform/node/src/NodeHttpServer.ts:136-137`,
  `packages/platform/node-shared/src/NodeSocketServer.ts:232-233`,
  `packages/platform/deno/src/DenoHttpServer.ts:100-105`,
  `packages/platform/deno/src/internal/denoSocketServer.ts:63-68`, and
  `packages/platform/bun/src/BunHttpServer.ts:126-170`. None needs a CIDR integration.
- `packages/effect/src/unstable/cluster/SocketRunner.ts:26-35` consumes concrete socket addresses only for logging.
  Prefixes have no role there.
- `packages/effect/package.json:29-57` and `:69-100` use the `./*` export pattern for source and distribution subpaths,
  which already supports `effect/unstable/net/Net`; the sibling `effect/unstable/net/IpNetwork` needs no new grouped
  barrel. There is currently no `packages/effect/src/unstable/net/index.ts`.

### Existing CIDR implementation

- `packages/sql/pg/src/PgTypes.ts:651-739` privately duplicates IPv4/IPv6 parsing and canonical formatting for the
  PostgreSQL network codecs. The address parsing can eventually reuse `Net`, but PostgreSQL wire behavior is a
  protocol concern and should not move into `IpNetwork`.
- `packages/sql/pg/src/PgTypes.ts:741-777` computes host-bit validity and rejects it for `cidr`. This is the clearest
  current consumer for a canonical network type.
- `packages/sql/pg/src/PgTypes.ts:779-798` validates family, prefix length, and host bits while decoding, then returns a
  string. An internal `IpNetwork` value can centralize those invariants while preserving the public string result.
- `packages/sql/pg/test/PgTypes.test.ts:351-369` already locks in rejection of IPv4 and IPv6 CIDR host bits and malformed
  wire masks. Any integration must preserve these errors and fixtures.
- PostgreSQL distinguishes `inet`, which may retain nonzero host bits, from `cidr`, which requires the network's lowest
  address ([PostgreSQL network type documentation](https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-INET-VS-CIDR)).
  Therefore only the `cidr` branch maps directly to the proposed invariant; modeling `inet` as `IpNetwork` would lose
  information.
- No other hand-written package code currently performs CIDR operations. Generated OpenAI descriptions mention CIDR
  strings, but generated files are not integration targets.

## Scope Plan

### Goals

- Provide one canonical, immutable value for an IPv4 or IPv6 network prefix.
- Reuse `Net.IpAddress` parsing, formatting, equality, and family identity.
- Make invalid prefix lengths and noncanonical host bits typed failures.
- Make truncation explicit when starting from a host address.
- Support exact, allocation-free-enough predicates for common ACL, allow-list, database, and configuration use cases.
- Provide canonical Schema string codecs suitable for JSON/configuration boundaries.
- Replace PostgreSQL `cidr` invariant logic without changing its external string/wire behavior.

### Non-goals

- DNS, sockets, URL authorities, interfaces, routes, next hops, or effectful networking.
- A PostgreSQL `inet` value; `inet` is an address plus optional mask and permits host bits.
- Mutable address pools, IPAM, trie/radix lookup, longest-prefix matching, route aggregation, or policy evaluation.
- Enumerating every address or every usable host in a block.
- Deciding whether network/broadcast addresses are usable hosts.
- Dynamic IANA classification such as `isGlobal`, `isReserved`, or `isSpecialPurpose`.
- Parsing netmasks such as `255.255.255.0`, abbreviated IPv4 such as `10/8`, wildcard masks, ranges, or comma-separated
  prefix sets.

### Primary use cases

- Parse a trusted or untrusted CIDR configuration value once and use `contains` for many IP checks.
- Express an IPv4 or IPv6 ACL entry without string comparison.
- Compute the canonical network containing a known address via the explicitly truncating `fromAddress` API.
- Compare, hash, serialize, log, and round-trip network prefixes deterministically.
- Validate and canonically encode PostgreSQL `cidr` payloads while retaining the existing string API.

### Module seam

Use a sibling module:

```text
packages/effect/src/unstable/net/IpNetwork.ts
packages/effect/test/unstable/net/IpNetwork.test.ts
packages/effect/typetest/unstable/net/IpNetwork.tst.ts
```

Intended import:

```ts
import * as IpNetwork from "effect/unstable/net/IpNetwork"
import * as Net from "effect/unstable/net/Net"
```

`Net` owns individual IP and socket addresses. `IpNetwork` imports `Net` and owns prefix semantics. `Net` must not
import `IpNetwork`; this keeps the foundational address module independent and avoids a cycle with `Schema`.

Do not add an `unstable/net` grouped barrel only for these two files. The existing package subpath pattern already
supports the direct module path. If a grouped networking namespace is introduced later, generate its marked barrel
rather than editing generated sections manually.

### MVP model and invariants

```ts
interface Ipv4Network extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv4Network"
  readonly address: Net.Ipv4Address
  readonly prefixLength: number
  toString(): string
}

interface Ipv6Network extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv6Network"
  readonly address: Net.Ipv6Address
  readonly prefixLength: number
  toString(): string
}

type IpNetwork = Ipv4Network | Ipv6Network
```

Required invariants:

- Instances are frozen and recognized by private module type IDs, consistent with `Net`.
- `prefixLength` is an integer and is bounded by the address width.
- `address` has no non-zero bits after `prefixLength`.
- `0.0.0.0/0` and `::/0` are valid and distinct.
- `/32` and `/128` are valid one-address networks.
- IPv4 `/31` and IPv6 `/127` are ordinary two-address blocks. The value model assigns no host-usability meaning.
- The last address is the canonical address OR the host mask. For IPv4 it may be a directed-broadcast address in a
  particular deployment; for IPv6 it is simply the numerically greatest address because IPv6 has no broadcast
  addresses (RFC 4291 Section 2, normative: https://www.rfc-editor.org/rfc/rfc4291.html#section-2).
- Same-family, same-prefix values that denote the same set are structurally identical by invariant and equal/hash
  identically. There is no separate retained source address.

### Public interface sketch

Names should remain flat and match current `Net` style. The exact overload syntax can be adjusted during type testing,
but the semantic surface should stay this small:

```ts
export class NetworkError extends Data.TaggedError("IpNetworkError")<{
  readonly input: unknown
  readonly kind: "Ipv4Network" | "Ipv6Network" | "IpNetwork" | "PrefixLength"
  readonly reason: string
}> {}

export interface Ipv4Network extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv4Network"
  readonly address: Net.Ipv4Address
  readonly prefixLength: number
  toString(): string
}

export interface Ipv6Network extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv6Network"
  readonly address: Net.Ipv6Address
  readonly prefixLength: number
  toString(): string
}

export type IpNetwork = Ipv4Network | Ipv6Network

export const isIpv4Network: (u: unknown) => u is Ipv4Network
export const isIpv6Network: (u: unknown) => u is Ipv6Network
export const isIpNetwork: (u: unknown) => u is IpNetwork

export const make: {
  (address: Net.Ipv4Address, prefixLength: number): Result.Result<Ipv4Network, NetworkError>
  (address: Net.Ipv6Address, prefixLength: number): Result.Result<Ipv6Network, NetworkError>
  (address: Net.IpAddress, prefixLength: number): Result.Result<IpNetwork, NetworkError>
}

// Explicitly masks host bits before constructing the canonical value.
export const fromAddress: typeof make

export const ipv4FromString: (input: string) => Result.Result<Ipv4Network, NetworkError>
export const ipv6FromString: (input: string) => Result.Result<Ipv6Network, NetworkError>
export const fromString: (input: string) => Result.Result<IpNetwork, NetworkError>

export const makeUnsafe: /* same overloads, returning values */
export const fromAddressUnsafe: /* same overloads, returning values */
export const fromStringUnsafe: (input: string) => IpNetwork

export const format: (self: IpNetwork) => string
export const firstAddress: (self: IpNetwork) => Net.IpAddress
export const lastAddress: (self: IpNetwork) => Net.IpAddress
export const addressCount: (self: IpNetwork) => bigint

export const contains: {
  (address: Net.IpAddress): (self: IpNetwork) => boolean
  (self: IpNetwork, address: Net.IpAddress): boolean
}

export const containsNetwork: {
  (other: IpNetwork): (self: IpNetwork) => boolean
  (self: IpNetwork, other: IpNetwork): boolean
}

export const overlaps: {
  (other: IpNetwork): (self: IpNetwork) => boolean
  (self: IpNetwork, other: IpNetwork): boolean
}
```

`firstAddress` is an intention-revealing alias for the canonical `address` field and may be omitted if maintainers
prefer the field alone. Keep `lastAddress` rather than `broadcast`: RFC 4291 explicitly says IPv6 has no broadcast, and
calling the greatest IPv6 address a broadcast address is only a crate convention. `addressCount` returns `bigint` so
`::/0` is exact; a `number` API cannot represent most IPv6 network sizes.

Do not add ordering in the MVP. `Equal` and `Hash` are required by Effect collections; an ordering requires a separate
decision about family order and whether shorter or longer prefixes sort first. Do not add `match` unless implementation
call sites demonstrate that guards are insufficient.

### Safe and unsafe policy

- Checked APIs return `Result.Result<_, NetworkError>` and never throw for user input.
- Unsafe APIs mean "throw on failed checked construction", not "skip validation". Implement them as
  `Result.getOrThrow` wrappers so unsafe values cannot violate invariants.
- `make` rejects host bits. It is appropriate for decoded CIDR/network data and catches accidental use of a host
  address.
- `fromAddress` validates the prefix length and masks host bits. Its name and JSDoc must explicitly state that the
  result may contain a different address.
- `fromString` requires exactly one `/`, a non-empty address and prefix, and an ASCII decimal prefix with no sign,
  whitespace, fraction, exponent, or leading zero except the single digit `0`. It delegates the address grammar to
  `Net.ipFromString` and then calls strict `make`.
- Do not accept a missing prefix as `/32` or `/128`; that is a Rust crate convenience, not CIDR prefix notation, and
  `Net.ipFromString` already models bare addresses.
- Do not accept bracketed or scoped IPv6. Those are socket/URI concerns, not bare prefix syntax.

### Schema support

Add the following to `packages/effect/src/Schema.ts` adjacent to the existing Net schemas:

```ts
export const Ipv4Network: declare<IpNetwork_.Ipv4Network>
export const Ipv4NetworkFromString: Codec<IpNetwork_.Ipv4Network, string>
export const Ipv6Network: declare<IpNetwork_.Ipv6Network>
export const Ipv6NetworkFromString: Codec<IpNetwork_.Ipv6Network, string>
export const IpNetwork: declare<IpNetwork_.IpNetwork>
export const IpNetworkFromString: Codec<IpNetwork_.IpNetwork, string>
```

Decode using the corresponding strict parser and translate `NetworkError` to `SchemaIssue.InvalidValue`, preserving
the current Net schema error style. Encode with `IpNetwork.format`. The encoded side is `Schema.String`, not a struct,
because canonical CIDR text is the portable wire/configuration representation. Declaration schemas accept only
already-constructed branded values, not structurally similar objects.

Do not advertise a JSON Schema regex as complete validation. Correct IPv6-plus-prefix validation is parser logic; a
regex would either reject legal RFC 4291 spelling or accept invalid host bits. If Schema JSON generation needs a
description/format annotation later, add it without weakening runtime decoding.

## Standards and Rust Precedent

### Normative standards

The following define protocol syntax or behavior and should be treated as standards, not merely API inspiration:

- **IPv4 CIDR:** RFC 4632 Section 3.1 defines `a.b.c.d/n`, with `n` from 0 through 32, as the number of significant
  most-significant bits and describes a prefix as a power-of-two, bit-aligned block
  (https://www.rfc-editor.org/rfc/rfc4632.html#section-3.1). It explicitly requires `0.0.0.0/0` support as the default
  route in Section 5.1 (https://www.rfc-editor.org/rfc/rfc4632.html#section-5.1). This supports the prefix bounds,
  contiguous mask, and `/0` invariants.
- **IPv6 prefixes:** RFC 4291 Section 2.3 defines `ipv6-address/prefix-length`, where the decimal length selects the
  leftmost contiguous address bits (https://www.rfc-editor.org/rfc/rfc4291.html#section-2.3). Its legal 60-bit prefix
  examples have all trailing bits zero. The same section separately permits combining a node address and its prefix,
  which demonstrates that standards syntax can describe an address-with-prefix as well as a network prefix. The MVP's
  strict host-bit rejection is therefore a value-model choice, clearly documented rather than claimed as a universal
  parser mandate.
- **Canonical IPv6 text:** RFC 5952 Sections 4 and 7 require suppressed leading zeros, maximal compression of the
  longest zero run, first-run tie breaking, lowercase hex, and the same rules for prefixes
  (https://www.rfc-editor.org/rfc/rfc5952.html#section-4,
  https://www.rfc-editor.org/rfc/rfc5952.html#section-7). Delegating to `Net.formatIp` preserves the repository's
  existing implementation of these rules.
- **Small prefixes are valid:** RFC 3021 requires the two addresses in an IPv4 `/31` point-to-point prefix to be
  treated as host addresses in that context (https://www.rfc-editor.org/rfc/rfc3021.html#section-2.1). RFC 6164
  requires router support for IPv6 `/127` on inter-router point-to-point links
  (https://www.rfc-editor.org/rfc/rfc6164.html#section-6). Consequently, the core value must not remove "network" or
  "broadcast" endpoints according to legacy host rules.
- **IANA data is classification, not prefix mechanics:** IANA's IPv4 Special-Purpose Address Space registry is updated
  independently and warns that listed prefixes do not guarantee routability in a particular context
  (https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml). The MVP should not
  bake this mutable registry into generic network operations. If special-purpose lookup is added later, generate data
  from the IANA registry and specify update policy.

### Rust standard library precedent

Rust `std::net` is primary precedent for the underlying value style, but it does **not** provide an IP network/CIDR
type. Its `IpAddr` is an IPv4/IPv6 enum with value equality, hashing, ordering, parsing, and display
(https://doc.rust-lang.org/std/net/enum.IpAddr.html). The source stores IPv4 and IPv6 as fixed octet arrays and exposes
numeric `to_bits`/`from_bits`; it also documents that bit masking operates on the address integer
(https://doc.rust-lang.org/src/core/net/ip_addr.rs.html#559-610). This supports a numeric/byte-oriented implementation
rather than source-string storage.

Rust's source also keeps mapped IPv6 classification distinct until explicit canonicalization
(https://doc.rust-lang.org/src/core/net/ip_addr.rs.html#476-501), matching the proposed no-implicit-family-conversion
rule. The relevant precedent ends there: network constructors and host iteration below are third-party crate
conventions, not `std` guarantees.

### Mature crate conventions, explicitly non-normative

- `ipnet` models `IpNet = V4(Ipv4Net) | V6(Ipv6Net)` and offers `network`, `broadcast`, `contains`, `supernet`, subnet
  iteration, and aggregation (https://docs.rs/ipnet/latest/ipnet/enum.IpNet.html). These names establish useful user
  expectations, but most are beyond the MVP.
- `ipnet` stores the input address and prefix unchanged; `new` validates only prefix length, `network()` masks later,
  and `trunc()` creates a separate canonical value
  (https://docs.rs/ipnet/2.12.1/src/ipnet/ipnet.rs.html#607-696). Its parser likewise retains host bits
  (https://docs.rs/ipnet/2.12.1/src/ipnet/parser.rs.html#260-328). This is a crate convention the Effect design should
  deliberately not copy: it permits two equal-sized values denoting the same block to compare unequal and display
  differently until truncated.
- `ipnetwork` has the same broad convention: `new` accepts any address if the prefix is in range, `network()` masks on
  demand, and tests require parsing non-zero host bits successfully
  (https://docs.rs/ipnetwork/0.21.1/src/ipnetwork/ipv4.rs.html#65-114,
  https://docs.rs/ipnetwork/0.21.1/src/ipnetwork/ipv4.rs.html#192-208,
  https://docs.rs/ipnetwork/0.21.1/src/ipnetwork/ipv4.rs.html#466-470). It also accepts omitted prefixes and dotted
  netmasks. Those compatibility conveniences conflict with the proposed exact CIDR-only seam.
- PostgreSQL's `cidr` behavior is mature product convention rather than an IETF requirement: it requires the address
  to be the lowest address and rejects host bits, while `inet` retains them
  (https://www.postgresql.org/docs/current/datatype-net-types.html#DATATYPE-CIDR). It is directly relevant because the
  repository already exposes that behavior and provides the first integration target.

## Engineering Plan

### File layout

```text
packages/effect/src/unstable/net/IpNetwork.ts
packages/effect/test/unstable/net/IpNetwork.test.ts
packages/effect/typetest/unstable/net/IpNetwork.tst.ts
packages/effect/src/Schema.ts                         # hand-maintained additions
packages/sql/pg/src/PgTypes.ts                       # narrow cidr integration
packages/sql/pg/test/PgTypes.test.ts                  # regression/integration coverage
.changeset/<generated-name>.md                       # consumer-visible Effect API addition
```

Keep the implementation in one source file. Parsing, masking, containment, and formatting all enforce the same few
invariants and are easier to audit together. Extract an internal helper only if reuse by another source module appears
during implementation; do not create a public "mask" utility module.

### Phase 1: canonical value foundation

1. Define `NetworkError`, type IDs, interfaces, union, guards, prototypes, equality, hashing, inspect, and frozen
   construction.
2. Implement one internal family-aware prefix check and one byte-mask routine.
3. Implement strict `make` and truncating `fromAddress`, preserving precise overload return types.
4. Implement `format`, `firstAddress`, `lastAddress`, and `addressCount`.
5. Implement `contains`, `containsNetwork`, and `overlaps` as dual APIs.
6. Add focused runtime and type tests before adding schemas or consumers.

### Phase 2: strict CIDR parsing

1. Split on `/` only after proving there is exactly one slash and both sides are non-empty.
2. Parse the prefix with an ASCII decimal grammar and family-specific bounds; do not rely on permissive `Number` input
   alone.
3. Parse the address with `Net.ipFromString`, then dispatch to strict `make`.
4. Add family-specific parsers for precise Schema/type inference.
5. Add throwing wrappers around checked APIs only; never expose an unchecked internal constructor.

### Phase 3: Schema support

1. Import the module into `Schema.ts` under an alias that does not collide with exported schema names.
2. Reuse/generalize the current `netAddressFromString` transformation helper to accept both address and network error
   types without changing existing diagnostics.
3. Add declaration and canonical string schemas for v4, v6, and union values.
4. Add runtime round trips and Tstyche codec assignability/narrowing assertions.

### Phase 4: PostgreSQL `cidr` integration

1. Preserve `PgTypes.cidr(value: string | null)`, generic encode/decode return types, OIDs, binary framing, and
   `PgTypesCodecError` as public behavior.
2. On CIDR encode, parse through `IpNetwork.fromString`, then write family, prefix, CIDR flag, and octets from the
   canonical network address.
3. On CIDR decode, retain all wire bounds/family/size validation, construct a `Net` address from the bytes, and call
   strict `IpNetwork.make`. Format the resulting network for the existing string result.
4. Leave the `inet` path able to retain host bits. It may reuse `Net` address parsing/formatting independently, but do
   not force that cleanup into this feature.
5. Remove `hasHostBits` only if no `inet` or defensive wire validation still uses it. The smallest correct integration
   is preferable to a broad codec rewrite.
6. Run existing golden and malformed-wire tests unchanged, then add one assertion that noncanonical IPv6 source text
   produces canonical CIDR text if that behavior is observable through the codec.

### Algorithms and edge cases

Use address octets, not JavaScript signed bitwise arithmetic over an entire IPv4 value:

1. Determine width (`32` or `128`) from the `Net` address variant.
2. Reject a prefix that is non-integer, negative, greater than width, `NaN`, or infinite.
3. Compute `wholeBytes = floor(prefixLength / 8)` and `partialBits = prefixLength % 8`.
4. For the partial byte, use `0xff << (8 - partialBits) & 0xff`; bytes after it have mask `0`.
5. Strict construction compares every masked-out bit to zero. Truncating construction ANDs bytes with the mask.
6. Reconstruct addresses through checked `Net.ipv4FromOctets` or `Net.ipv6FromSegments`; a localized
   `Result.getOrThrow` is acceptable only after byte ranges are proven internally and must not be exposed as unsafe
   user construction.

Boundary handling:

- Prefix `0`: mask is all zero; only `0.0.0.0` or `::` passes strict `make`; every same-family address is contained;
  last is all ones; count is `2 ** width` as `bigint`.
- Full-width prefix: no bits are masked; any address passes; first equals last; count is `1n`.
- Non-byte-aligned prefixes: test `/1`, `/7`, `/9`, `/25`, `/31`, `/63`, `/65`, `/120`, and `/127` to catch partial
  byte direction errors.
- `lastAddress`: OR each address octet with the complement of its network mask. Do not add one to an exclusive upper
  bound, which would overflow for `255.255.255.255/32`, `::/0`, or the all-ones IPv6 address.
- `contains(network, address)`: false on family mismatch; otherwise compare each address byte after applying the
  network mask.
- `containsNetwork(parent, child)`: same family, parent prefix no longer than child prefix, and parent contains the
  child's canonical address.
- `overlaps(a, b)`: false on family mismatch; canonical CIDR blocks of one family either are disjoint or one contains
  the other's first address, so compare the shorter prefix's containment without range arithmetic.
- Mapped IPv6: `::ffff:192.0.2.0/120` is valid IPv6 and formats through `Net.formatIp`; it does not overlap
  `192.0.2.0/24` because families differ.
- Parser rejects `1.2.3.4`, `1.2.3.4/`, `/24`, duplicate slashes, signed or padded prefixes, whitespace, bracketed
  IPv6, scopes, out-of-range lengths, and host-bit inputs such as `10.1.2.3/8` or `2001:db8::1/32`.

### Runtime tests

In `IpNetwork.test.ts`, cover:

- Successful strict construction for aligned IPv4/IPv6 prefixes, `/0`, full-width, `/31`, and `/127`.
- Rejection of invalid lengths and host bits at every construction boundary.
- `fromAddress` truncation for byte-aligned and non-byte-aligned prefixes.
- Exact canonical parse/format examples, including uppercase/expanded IPv6 input and mapped IPv6.
- Parser rejection matrix for slash, prefix, address, host-bit, bracket, scope, and whitespace failures.
- Frozen values, guards, inspect/`toString`, numeric equality, and equal-hash law.
- First/last/count boundaries, especially `0.0.0.0/0`, `::/0`, all-ones host routes, `/31`, and `/127`.
- Address containment at first, interior, last, immediately below/above, and cross-family boundaries.
- Network containment and overlap for equal, parent, child, sibling, disjoint, and cross-family cases.
- Schema declaration rejection of lookalike structs and canonical string decode/encode.
- Unsafe wrappers returning valid values and throwing on every invalid category.

Keep standards-derived host semantics limited to set membership. Do not assert that IPv4 network/broadcast endpoints
are universally unusable: RFC 3021 makes both `/31` values hosts in its point-to-point context.

### Type tests

In `IpNetwork.tst.ts`, assert:

- `make(Net.Ipv4Address, n)` returns `Result<Ipv4Network, NetworkError>` and the IPv6 overload preserves IPv6.
- A union address returns a union network.
- `fromAddress` has the same family-preserving overload behavior.
- Checked parsers and unsafe parsers expose their intended result/value types.
- Guards narrow `IpNetwork` and expose a family-specific `address` field.
- Dual forms of containment and overlap infer `boolean` without widening network/address types.
- All six Schema exports are assignable to the expected `Schema.Codec` or declaration type.

### Property tests

Use `fast-check`, already used in core tests such as `packages/effect/test/Array.test.ts`, with bounded run counts:

- Generate four IPv4 octets plus prefix `0..32`; `fromAddress` always yields a strict-constructible value.
- Generate sixteen IPv6 octets (or eight segments) plus prefix `0..128`; apply the same invariant.
- `parse(format(network))` equals `network` and hashes equally.
- `format(parse(format(network)))` is idempotent.
- `firstAddress` and `lastAddress` are contained, count is `1n << BigInt(width - prefix)`, and first is no greater than
  last under unsigned byte comparison.
- Flipping any host bit in a canonical address causes strict `make` to fail but `fromAddress` to return the original
  network.
- For any address, `parent = fromAddress(address, p)` contains `child = fromAddress(address, q)` exactly when `p <= q`.
- `overlaps` is symmetric; `containsNetwork` is reflexive and transitive for generated same-family chains.

### Validation commands

Run from the repository root, using only targeted test commands:

```sh
pnpm lint-fix
pnpm test --run packages/effect/test/unstable/net/IpNetwork.test.ts
pnpm test-types packages/effect/typetest/unstable/net/IpNetwork.tst.ts
pnpm test --run packages/sql/pg/test/PgTypes.test.ts
pnpm check
pnpm jsdocs --check
```

If `pnpm lint-fix` changes files outside the intended set, inspect rather than revert unrelated work. Do not run bare
`pnpm test` or `pnpm doctest`.

### Changeset and migration

- Adding `effect/unstable/net/IpNetwork` and the Schema exports is consumer-visible public API. Add a minor changeset
  for `effect` describing canonical IPv4/IPv6 CIDR values, strict host-bit validation, containment, and Schema codecs.
- If the PostgreSQL integration preserves all accepted/rejected inputs, strings, OIDs, and binary bytes, it is an
  internal refactor and does not independently require a `@effect/sql-pg` changeset. Add one only if observable
  canonicalization or diagnostics change.
- There is no v3 API being renamed or removed, so no migration annotation is needed. Do not edit generated
  `migration/v3-to-v4.md`.
- No compatibility aliases (`Cidr`, `CIDR`, `IpNet`) are needed for a new API. Choose `IpNetwork` once and document CIDR
  as its text notation.

## Risks and Open Decisions

- **Strict parsing versus truncation:** This plan recommends strict `fromString` and `make`, with explicit
  `fromAddress` truncation. RFC 4291 permits node-address-plus-prefix notation, and Rust crates accept it, so some users
  may expect `192.168.1.4/24` to parse. Accepting it would weaken the one-text-per-network contract and diverge from the
  current PostgreSQL `cidr` behavior. Resolve before implementation; do not silently choose mixed behavior between v4
  and v6.
- **Specific parser surface:** Six Schema exports are consistent with existing Net schemas but require precise v4/v6
  parsers or internal refinements. If maintainers prefer fewer runtime exports, keep only union parsing public and build
  specific Schema transformations internally; preserve precise Schema types either way.
- **`firstAddress` redundancy:** The public `address` field already exposes it. Retain the function only if symmetry
  with `lastAddress` improves pipeline usage enough to justify one more name.
- **Error granularity:** A single `NetworkError` with stable `kind`, `input`, and human reason matches `Net.AddressError`
  and is sufficient for Schema. Avoid a large error union until callers need machine-readable distinctions. Error
  reason strings should not be promised as a compatibility surface.
- **Cross-family mapped behavior:** Exact family distinction is recommended. Users wanting mapped-prefix conversion
  need a future explicit API because converting arbitrary IPv6 prefix lengths to IPv4 is only meaningful for selected
  mapped ranges and lengths.
- **PostgreSQL coupling:** Reusing an unstable core module from `@effect/sql-pg` is acceptable only if package policy
  permits that dependency. If not, land core plus Schema first and leave the existing codec as an independent
  conformance consumer/test vector rather than creating a forbidden dependency.
- **Representation cost:** Reconstructing through public octet constructors is simple and respects `Net` opacity but
  creates short arrays. Measure only if profiling identifies CIDR checks as hot; do not expose `Net` internals or add
  unsafe numeric constructors preemptively.
- **Naming of `addressCount`:** `size` is shorter but ambiguous and commonly returns an inexact or variant-specific
  integer in crates. `addressCount(): bigint` states both meaning and exactness.
- **JSDoc canonical claim:** RFC 5952 canonicalizes the address text, while strict zero-host-bit network identity is an
  Effect policy. Documentation must keep those claims separate.

## Follow-ups Explicitly Excluded from MVP

- Address and subnet iterators, including cancellation/laziness policy for enormous IPv6 blocks.
- "Usable host" iteration or counts; IPv4 `/31`, IPv6 `/127`, subnet-router anycast, and deployment context make a
  universal host policy misleading.
- `subnets`, `supernet`, sibling checks, prefix splitting, collapse/aggregate, summarization, and exclusion/difference.
- CIDR sets, radix tries, longest-prefix matching, route tables, route advertisements, and next-hop models.
- Address ranges and conversion between arbitrary ranges and minimal CIDR lists.
- Netmask/wildcard-mask parsing and formatting.
- Abbreviated/classful IPv4 syntax or omission of the prefix length.
- Special-purpose registry lookup, `isGlobal`, routability, and generated IANA registry assets.
- Classification of an entire network as private/link-local/etc.; deciding whether "all", "any", or merely the first
  address must match needs a separate API design.
- Implicit IPv4-mapped IPv6 network canonicalization or conversion.
- PostgreSQL `inet` as a typed value and broader removal of its private address parser/formatter.
- OpenAPI/JSON Schema `format: cidr` conventions, since there is no universally enforced standard format keyword.
- Stable top-level `effect/IpNetwork` promotion or a new `effect/unstable/net` grouped barrel.
- DNS, interface discovery, socket binding, firewall application, cloud-provider ACL adapters, or any other effectful
  runtime integration.
