# Hostname, Host, and Authority Values

## Executive summary

Add pure, immutable `Hostname`, `Host`, and `Authority` values beside the existing IP and socket-address values in
`effect/unstable/net/Net`.

The semantic choice is deliberate:

- `Hostname` is an **IDNA-aware Internet host-domain name**: the RFC 1123 host-name subset of DNS names, extended with
  valid IDNA labels and stored canonically as lowercase ASCII A-labels. It is not an arbitrary DNS owner name, an RFC
  3986 `reg-name`, or a WHATWG opaque host.
- `Host` is `Hostname | IpAddress`. It represents the host portion of a network target before any name lookup. IPv6 is
  stored as a bare `Ipv6Address`; brackets are syntax supplied by an authority formatter, not part of the value.
- `Authority` is a `Host` plus an optional checked numeric port. It is the host-and-port subset needed by HTTP, URI,
  cluster, and configuration code. It deliberately excludes user information and does not include the leading `//`.
- `InetAddress` remains a resolved numeric IP address plus a required port. A hostname-bearing `Authority` is never a
  `SocketAddress`, and parsing must never perform DNS or OS name resolution.

This fills the unresolved side of the model established by `Net`: values can safely carry `localhost`,
`example.com`, IDNs, IPv4, and IPv6 through configuration and formatting, while platform adapters remain responsible
for resolution and socket operations. The first integration should replace ad hoc cluster URL authority formatting and
validate `RunnerAddress` without changing its encoded `{ host: string, port: number }` shape. Bun HTTP listeners must
continue to require a numeric address until an explicit resolution seam can produce the concrete address that Bun's
server interface cannot reliably report itself.

## Codebase evidence

### Existing `Net` model

`packages/effect/src/unstable/net/Net.ts` already establishes the right lower layer:

- `IpAddress = Ipv4Address | Ipv6Address` is numeric and platform-neutral.
- `InetAddress` is documented as resolved and contains only `IpAddress`, port, and IPv6 socket metadata.
- `SocketAddress = InetAddress | UnixPathAddress` is concrete; no variant contains a hostname.
- `inetAddressFromIpString` explicitly rejects hostnames and bracketed IPv6.
- `inetAddressFromString` parses only `IPv4:port` and `[IPv6]:port`.
- `formatUrlHost` already distinguishes bare IP formatting from URL-authority formatting by bracketing IPv6.

The prior `plans/net-addresses.md` explicitly deferred `Hostname`, unresolved `SocketTarget`, IDNA, and DNS, and states
that a hostname-bearing target is not a concrete socket address. This proposal completes that deferred pure-value
layer without weakening the distinction.

### URL and HTTP behavior

`packages/effect/src/unstable/http/Url.ts` intentionally wraps the platform `URL` object. `setHost` and `setHostname`
accept unchecked strings and inherit WHATWG parsing, IDNA, legacy IPv4, and mutation behavior. This is appropriate for
editing a `URL`, but it is not a reusable network hostname contract.

`packages/effect/src/unstable/http/HttpServer.ts` formats only concrete server addresses. Its
`formatAddress(Net.SocketAddress)` correctly delegates numeric socket formatting to `Net.formatInet`; it should not be
changed to accept unresolved authorities.

PostgreSQL connection URL parsing in `packages/sql/pg/src/PgConnection.ts` illustrates why extracting a URL's host and
dialing it are separate operations: it uses `new URL`, strips IPv6 brackets from `url.hostname`, decodes the host, then
later passes a string to the platform socket. A general `Host` parser can eventually validate this boundary, but the
PostgreSQL URL grammar and query-parameter precedence remain protocol-specific.

### Cluster authority formatting and persistence

`packages/effect/src/unstable/cluster/RunnerAddress.ts` currently stores unchecked `Schema.String` plus `Schema.Int`.
Equality is exact string equality, and hashing, `PrimaryKey`, display, and storage all interpolate `host:port`.
`RunnerAddress.make` disables Schema checks. Consequences include case-sensitive aliases for the same hostname,
unchecked ports, and ambiguous IPv6 text.

`packages/effect/src/unstable/cluster/HttpRunner.ts` contains a private `formatAuthorityHost` that brackets any string
containing `:` and then interpolates HTTP and WebSocket URLs. A typed `Authority` should own this syntax and remove the
heuristic.

`packages/effect/src/unstable/cluster/RunnerStorage.ts` persists `${host}:${port}` keys. Tests and cluster integration
harnesses repeat that representation. This is shipped storage identity, so it must not silently change in the first
integration. Canonicalizing an existing host can also change identity even if the punctuation stays the same; migration
must therefore be explicit.

`ShardingConfig` defaults to `localhost:34431`, loads host and listen-host as strings, and forwards them to Node, Deno,
and Bun adapters. Node and Deno client sockets accept unresolved names and delegate lookup to native connection APIs.

### Bun hostname handling

`packages/platform/bun/src/BunHttpServer.ts` currently parses the requested `hostname` with `Net.ipFromString` and
fails before `Bun.serve` for `localhost`. Its test explicitly verifies that unresolved hostnames are rejected. This is
intentional: Bun exposes a configured hostname but does not provide a trustworthy resolved bound address from which to
construct the concrete `HttpServer.address`. Bun's public option type mentions `localhost`, but that does not solve the
reporting/model mismatch ([Bun hostname reference](https://bun.com/reference/bun/Serve/HostnamePortServeOptions/hostname)).

Adding `Hostname` must not make Bun fabricate a resolved `InetAddress`. Bun should either continue requiring an
`IpAddress` or receive an IP selected by a future resolver before calling `Bun.serve`.

### Platform and DNS seams

There is no shared DNS service in the repository. Node's `NodeSocket.makeNet` forwards native `NetConnectOpts`, and
Deno's `makeTcp` forwards `Deno.connect` options, so their native APIs currently perform any hostname lookup. Bun socket
clients re-export the Node implementation. Cluster socket adapters pass `RunnerAddress.host` directly to these native
options.

This native behavior is closer to OS name service than pure DNS. Node documents that `dns.lookup()` uses operating
system facilities such as `getaddrinfo` and can honor `/etc/hosts`, while `dns.resolve*()` sends DNS queries and bypasses
those facilities ([Node DNS documentation](https://nodejs.org/api/dns.html#dns)). A future shared seam must state which
behavior it models; it should not be accidentally named `Dns` if it promises OS host resolution.

### Schema conventions

`packages/effect/src/Schema.ts` exposes declaration schemas for constructed `Net` values and `...FromString`
transformations for textual encodings. `InetAddressFromString` delegates to the same checked parser and canonical
formatter as direct code. The new values should follow this pattern so direct parsing and Schema decoding have exactly
the same normalization and failure behavior.

## Scope plan

### Goals

- Provide one platform-neutral representation for validated unresolved host names, numeric hosts, and host/port
  authorities.
- Canonicalize case, IDNA, IP text, brackets, and port syntax once.
- Preserve the hard boundary between pure target parsing and effectful name resolution.
- Make values immutable and support Effect equality, hashing, inspection, and Schema.
- Supply context-specific formatting so callers cannot accidentally emit unbracketed IPv6 authorities.
- Enable cluster and HTTP integrations without forcing a DNS service into the foundational change.

### Non-goals

- Arbitrary DNS names or wire labels. Underscore service labels, wildcard names, binary labels, the root name, zone-file
  escapes, and record-specific owner names are outside `Hostname`.
- RFC 3986's full `reg-name` grammar. Percent-encoding and URI sub-delimiters are not accepted as hostnames.
- WHATWG opaque hosts, empty hosts, legacy IPv4 numbers, shortened IPv4, hexadecimal/octal IPv4, URL credentials, or
  scheme-specific URL parsing.
- DNS queries, search-list expansion, Happy Eyeballs, reverse lookup, service lookup, caching, TTLs, or connection
  attempts in the pure module.
- Proving that a syntactically valid hostname is registered, exists, has A/AAAA records, or identifies a service.
- Public-suffix, registrable-domain, cookie-domain, origin, or certificate-name semantics.
- IPv6 zone identifiers in `Host` or URI authorities. Existing bare `Ipv6Address` excludes them; scoped socket metadata
  remains on `InetAddressV6`.
- Replacing `URL` as the HTTP URL representation.

### Primary use cases

- Parse configuration such as `localhost`, `api.example.com`, an IDN, `192.0.2.1`, or `2001:db8::1` into a value whose
  equality and wire formatting are stable.
- Parse and format `example.com:443`, `192.0.2.1:8080`, `[2001:db8::1]:8080`, and host-only authorities.
- Build HTTP and WebSocket URLs without private IPv6-bracketing helpers.
- Represent cluster runner targets as unresolved `Host` plus port while keeping server-bound addresses concrete.
- Feed canonical ASCII hostname text or bare numeric IP text into Node, Deno, Bun, TLS, and database native APIs.
- Form the input to a later OS name-resolution service and receive `IpAddress` values before constructing
  `InetAddress` values.

### Module seam

Keep the MVP in `packages/effect/src/unstable/net/Net.ts`, alongside the values it composes. This avoids a second module
that imports and re-exports most of `Net`, and follows the existing flat function style. Extract internal hostname/IDNA
code only if implementation size justifies it; do not create a public `Dns` module as part of this work.

### MVP models and invariants

```ts
interface Hostname extends Equal.Equal, Hash.Hash {
  readonly _tag: "Hostname"
  /** Canonical lowercase ASCII: NR-LDH and A-labels separated by dots. */
  readonly ascii: string
  toString(): string
}

type Host = Hostname | IpAddress

interface Authority extends Equal.Equal, Hash.Hash {
  readonly _tag: "Authority"
  readonly host: Host
  readonly port: number | undefined
  toString(): string
}
```

The exact storage may remain behind type identifiers as existing IP storage does. Public invariants:

- `Hostname.ascii` is non-empty lowercase ASCII.
- Every label is 1 through 63 octets in A-label form; the complete DNS wire form is at most 255 octets including length
  octets and the root terminator. The normal dotted form is therefore at most 253 ASCII characters without a final dot.
- ASCII labels contain only letters, digits, and interior hyphens. A label cannot start or end with `-`. `xn--` labels
  must be valid, symmetric IDNA A-labels, not merely strings with that prefix.
- RFC 1123's update is honored: the first character of a label may be a digit.
- A trailing dot is accepted as an explicit absolute-name marker and preserved as part of the canonical representation.
  `example.com` and `example.com.` remain distinct because native resolver search behavior can differ. Empty labels
  elsewhere and the root-only `.` are rejected.
- Unicode input is converted label-by-label to canonical lowercase A-labels under the chosen IDNA profile. Equality and
  hashing operate on that ASCII form, so equivalent U-label/A-label and ASCII-case spellings compare equal.
- Four decimal numeric components are parsed as IPv4 before hostname parsing. Invalid dotted-quad candidates do not
  silently become hostnames. Bracketed input is accepted only by host/authority parsers for IPv6, not by `Hostname`.
- `Host` has no separate wrapper allocation; guards distinguish `Hostname`, `Ipv4Address`, and `Ipv6Address`.
- `Authority.port` is absent or an integer in `0..65535`. Port zero is valid for listen configuration; connect APIs may
  require `1..65535`. Parsing rejects signs, whitespace, empty ports, service names, and values outside the range.
- Authority formatting is canonical ASCII, with IPv6 brackets and no colon when the port is absent.

### Proposed interface

Use the existing flat naming convention and `Result` failures:

```ts
hostnameFromString(input: string): Result<Hostname, HostError>
hostnameFromStringUnsafe(input: string): Hostname
isHostname(input: unknown): input is Hostname
formatHostname(hostname: Hostname): string

hostFromString(input: string): Result<Host, HostError>
hostFromStringUnsafe(input: string): Host
isHost(input: unknown): input is Host
formatHost(host: Host): string              // bare native/API form; IPv6 has no brackets
formatAuthorityHost(host: Host): string     // IPv6 is bracketed

authority(host: Host, port?: number): Result<Authority, HostError>
authorityUnsafe(host: Host, port?: number): Authority
authorityFromString(input: string): Result<Authority, HostError>
authorityFromStringUnsafe(input: string): Authority
isAuthority(input: unknown): input is Authority
formatAuthority(authority: Authority): string
```

`hostFromString` accepts bare IPv4, bare IPv6, bracketed IPv6, or a hostname. `authorityFromString` requires brackets
around IPv6 whenever authority syntax is used, whether or not a port follows; this follows URI-host syntax and avoids
an ambiguous final colon. `formatHost` exists for native socket options; URL and HTTP callers must use
`formatAuthorityHost` or `formatAuthority`.

Do not add implicit conversions from `string` to these models. Do not name `Authority` `SocketAddress`: it can lack a
port and can contain an unresolved hostname. A later required-port `InetTarget` or `SocketTarget` can compose `Host`
without changing these values.

### Safe and unsafe policy

- Every string boundary uses a checked parser returning `Result`.
- Numeric port construction is checked.
- Unsafe constructors are explicit `...Unsafe` wrappers around checked constructors and are for trusted constants and
  tests, matching current `Net` practice.
- Do not expose an unchecked `Hostname` constructor or a public brand cast. Invalid values would corrupt equality,
  hashing, URL output, Schema encoding, and security policy.
- Do not use `new URL()` as the unchecked constructor. Its parser accepts WHATWG legacy IPv4 and compatibility mappings
  outside this model.
- Error data should include `input`, `kind: "Hostname" | "Host" | "Authority" | "Port"`, and a stable reason category
  plus readable detail. A dedicated `HostError` avoids widening every existing `AddressError.kind` consumer; if nearby
  conventions strongly favor one `NetError`, perform that API change deliberately and cover it with type tests.

### Schema

Add declaration and string transformation schemas in `packages/effect/src/Schema.ts`:

```ts
Schema.Hostname
Schema.HostnameFromString
Schema.Host
Schema.HostFromString
Schema.Authority
Schema.AuthorityFromString
```

`...FromString` schemas decode through the public checked parser and encode with the canonical formatter. Annotate the
encoded schemas with useful titles/descriptions, but do not claim JSON Schema `format: "hostname"` unless its validator
semantics exactly match the IDNA profile and trailing-dot policy. Add declaration schemas for already-constructed
values so structural data cannot masquerade as a value.

For consumers such as `RunnerAddress`, using `Schema.HostFromString` as a class field gives runtime type `Net.Host` while
retaining a string in the encoded form. Confirm this with runtime and type tests before migration.

## Standards and Rust precedent

### DNS names versus hostnames

RFC 1034 defines DNS names as sequences of labels and permits general DNS data; each label is at most 63 octets and the
wire name is at most 255 octets. Its preferred host-style syntax is letters, digits, and hyphens, originally requiring a
leading letter ([RFC 1034 sections 3.1 and 3.5](https://www.rfc-editor.org/rfc/rfc1034.html#section-3.1)). RFC 1035 repeats
the 63/255-octet limits and makes clear that raw DNS labels are more general than the preferred host syntax
([RFC 1035 sections 2.3.1 and 2.3.4](https://www.rfc-editor.org/rfc/rfc1035.html#section-2.3.1)). RFC 1123 relaxes the first
character to letter or digit and requires applications to distinguish dotted-decimal addresses before DNS lookup
([RFC 1123 section 2.1](https://www.rfc-editor.org/rfc/rfc1123.html#section-2.1)).

Therefore `_sip._tcp.example.com` can be meaningful DNS owner-name syntax but is not a `Hostname`. A future DNS module
needs a broader `Name` type; it must not reuse this value for all record names.

### URI syntax

RFC 3986 defines `authority = [ userinfo "@" ] host [ ":" port ]` and
`host = IP-literal / IPv4address / reg-name`. `reg-name` permits unreserved characters, percent-encoding, and
sub-delimiters, making it broader and differently encoded than a DNS hostname. IPv6 literals are bracketed in URI host
syntax, and host parsing applies first-match-wins for IPv4
([RFC 3986 sections 3.2 and 3.2.2](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.2)).

The proposed `Authority` intentionally adopts only the common host-plus-optional-port structure. It rejects userinfo,
percent-encoded `reg-name`, empty ports, and `IPvFuture`. This is a network/HTTP value, not a complete generic URI
authority parser.

### IDNA policy

RFC 5890 distinguishes ordinary LDH labels, A-labels, U-labels, fake A-labels, and arbitrary DNS labels. A-labels are
ASCII `xn--` encodings that must round trip to valid U-labels; U-labels are NFC, and equivalence is defined through
case-insensitive A-label comparison
([RFC 5890 sections 2.3.1 and 2.3.2](https://www.rfc-editor.org/rfc/rfc5890.html#section-2.3.1)). RFC 5891 separates
registration from lookup, requires NFC and contextual/Bidi validation, and emits A-labels for DNS lookup
([RFC 5891 sections 3 through 5](https://www.rfc-editor.org/rfc/rfc5891.html#section-3)). RFC 5895 is informational and
warns that mapping user input is application- and locale-dependent; its suggested lowercase/width/NFC mapping is not a
universal protocol algorithm ([RFC 5895 sections 1 through 3](https://www.rfc-editor.org/rfc/rfc5895.html#section-1)).

For a cross-runtime JavaScript library, implement **UTS #46 non-transitional processing with strict DNS checks**, the
profile used by the WHATWG URL standard for a valid domain string, while documenting that this compatibility processing
is not identical to pure IDNA2008. Use `CheckHyphens`, `CheckBidi`, `CheckJoiners`, `UseSTD3ASCIIRules`, and DNS-length
verification; reject any reported error. This provides interoperable user-input mapping and valid A-label output while
retaining host-style syntax. The WHATWG standard explicitly distinguishes domain, IP, opaque, and empty hosts and
documents its UTS #46 profile ([WHATWG URL hosts and IDNA](https://url.spec.whatwg.org/#hosts-(domains-and-ip-addresses))).

Do not delegate the model to the whole WHATWG host parser: it deliberately supports legacy IPv4 forms such as `0` and
`0xffffffff`, opaque hosts for non-special schemes, percent-decoding, and web-compatibility recovery. Only its strict
domain-to-ASCII operation is relevant.

### Rust conventions

- Rust `std::net::SocketAddr` contains only an IP address and `u16` port. Hostname resolution is instead exposed through
  `ToSocketAddrs`, preserving the resolved/unresolved distinction
  ([Rust `SocketAddr`](https://doc.rust-lang.org/std/net/enum.SocketAddr.html)). Effect's `InetAddress` should retain the
  same concrete meaning.
- The mature Rust `url` crate models `Host` as `Domain | Ipv4 | Ipv6`, emits bracketed IPv6 in URL contexts, and uses
  IDNA for special-URL domains ([Rust `url::Host`](https://docs.rs/url/latest/url/enum.Host.html)). Its semantics follow
  WHATWG and are precedent for the sum type and context-specific formatting, not for adopting legacy IPv4 parsing.
- Rust's `http::uri::Authority` exposes host plus optional `u16` port, brackets IPv6, and uses case-insensitive equality
  ([Rust `http::uri::Authority`](https://docs.rs/http/latest/http/uri/struct.Authority.html)). Effect should use
  structural canonical values rather than retaining unchecked source text.
- The Rust `idna` crate implements WHATWG/UTS #46 processing and exposes a strict domain-to-ASCII operation
  ([Rust `idna` crate](https://docs.rs/idna/latest/idna/)). This is useful precedent for making the compatibility profile
  explicit rather than calling all Punycode processing “IDNA2008”.
- DNS libraries such as Hickory model a broader DNS `Name` separately from URL or socket hosts. Follow that separation;
  do not make `Hostname` carry SRV underscore labels or arbitrary record-owner syntax
  ([Hickory domain names](https://docs.rs/hickory-proto/latest/hickory_proto/rr/domain/index.html)).

## Engineering plan

### Files

Foundational phase:

- `packages/effect/src/unstable/net/Net.ts`
- `packages/effect/test/unstable/net/Net.test.ts`
- `packages/effect/typetest/unstable/net/Net.tst.ts`
- `packages/effect/src/Schema.ts`
- `.changeset/<generated-name>.md`

First integrations, preferably a separate commit or PR slice:

- `packages/effect/src/unstable/cluster/RunnerAddress.ts`
- `packages/effect/src/unstable/cluster/HttpRunner.ts`
- `packages/effect/src/unstable/cluster/ShardingConfig.ts`
- `packages/effect/src/unstable/cluster/RunnerStorage.ts` only if a key migration is deliberately selected
- cluster tests and platform Node/Deno/Bun cluster adapters affected by the typed host field

Do not hand-edit generated barrel sections. If exports require generated barrel changes, run `pnpm codegen` and include
only generated results attributable to the new source API.

### Phase 1: pure hostname and host values

1. Select and record the exact UTS #46 implementation and Unicode-version policy before writing parsers.
2. Add type IDs, immutable prototypes, guards, equality, hash, inspection, checked/unsafe parsers, and formatters.
3. Parse IP first with existing strict `Net` parsers. Add explicit tests proving WHATWG legacy numeric forms are rejected.
4. Store canonical lowercase ASCII A-label text. Keep Unicode rendering out of `toString()` and default logs to reduce
   spoofing risk; add a clearly named `hostnameToUnicode` only if a concrete UI consumer needs it.
5. Preserve a final root dot and test relative versus absolute equality.

### Phase 2: authority

1. Add the immutable host-plus-optional-port value and checked port construction.
2. Implement a small delimiter parser rather than splitting on the last colon blindly.
3. Require `[IPv6]` in authority text, reject brackets around IPv4/hostname, userinfo, paths, queries, fragments,
   whitespace, empty ports, and repeated or unmatched brackets.
4. Delegate host and IP normalization to the phase 1 parsers and formatters.
5. Add conversions only where lossless: `InetAddress -> Authority` is valid; `Authority -> InetAddress` succeeds only
   when a port exists and the host is numeric. It must not resolve a hostname.

### Phase 3: Schema

1. Add declaration schemas and canonical string transformations.
2. Ensure parse failures become Schema issues with useful messages while retaining the original `HostError` as cause
   where conventions permit.
3. Test decode/encode, canonicalization, arbitrary-value rejection, and displayed public types.
4. Verify JSON Schema annotations do not overstate compatibility with RFC 1123, IDNA, or WHATWG.

### Parsing and IDNA strategy

Do not implement Punycode, contextual rules, or Bidi tables by hand. Do not depend on `URL` constructor tricks such as
`new URL("http://" + input)`: they couple validation to URL delimiters, legacy IPv4, runtime web-compatibility recovery,
and host percent-decoding.

Prefer a small, maintained UTS #46 implementation that:

- works in every Effect target without Node built-ins;
- exposes non-transitional processing and strict error reporting;
- validates hyphens, joiners, Bidi, A-label symmetry, STD3 ASCII, and DNS lengths;
- documents its Unicode data version and update process;
- does not pull browser-only or large unrelated dependencies into core.

The lockfile currently contains transitive `tr46` and `punycode`, but that is not permission to import them from core.
Run the repository dependency-maintenance process, assess bundle impact, and add a direct dependency only after API,
license, maintenance, and size review. If no dependency meets core constraints, split delivery: ship the ASCII LDH
hostname MVP with Unicode input explicitly rejected, then add IDNA in a separately reviewed phase. Never silently call
ASCII-only behavior “IDNA-aware”.

Conformance fixtures should come from the selected implementation's upstream suite and relevant Web Platform Tests,
with checked-in cases limited to behavior this API promises. Include deviation tests for `faß.de`, joiners, Bidi,
fullwidth forms, ideographic dots, invalid/fake `xn--` labels, U-label/A-label symmetry, and Unicode-version-sensitive
code points. Record whether alternate dot separators are mapped before labels are split.

### Phase 4: cluster integration

1. Change `RunnerAddress.host` to runtime `Net.Host` using a string transformation schema, and validate ports to
   `0..65535` or the narrower cluster connect range if cluster semantics require it. Preserve encoded JSON as
   `{ host: string, port: number }`.
2. Change `RunnerAddress.make` to checked construction, or provide `fromHost` plus an explicitly unsafe trusted helper.
   Do not keep `disableChecks: true` on untrusted string input.
3. Replace `HttpRunner.formatAuthorityHost` and URL interpolation with `Net.Authority` formatting, then use `URL` for
   path composition so path slashes and escaping are not conflated with authority syntax.
4. Pass `Net.formatHost(address.host)` to Node/Deno native socket and listen options. Never pass bracketed IPv6 to an API
   that expects a bare hostname.
5. Keep Bun HTTP's listener input numeric. If `RunnerAddress.host` is a `Hostname`, fail with a precise error explaining
   that the listen target must be resolved/configured separately; advertising a hostname and binding an IP should be
   separate config concerns.
6. Preserve existing runner storage keys during the first integration. If canonical host identity changes are desired,
   version the key encoding and support a deliberate data migration rather than dual-reading indefinitely without a
   retirement plan.

### Phase 5: URL and other integrations

- Add typed overloads or helpers to `Url` only after the foundational values settle. `URL.hostname` follows WHATWG and
  can remain string-based; converting from `Net.Host` is lossless through `formatAuthorityHost`/URL setters, while
  converting arbitrary `URL.hostname` to `Net.Host` remains checked.
- Migrate PostgreSQL URL extraction only if its accepted connection grammar agrees with this hostname policy. Preserve
  Unix socket query-host behavior and protocol-specific percent-decoding.
- Audit TLS SNI: only `Hostname` should be eligible; IP literals are not DNS SNI names. Do not infer SNI from a generic
  formatted authority.
- Audit proxy `Host`/`:authority` handling separately. HTTP request authority can have protocol-specific validation and
  default-port behavior; do not erase explicit ports merely because a scheme has a default.

### Future resolution seam

After at least two concrete consumers require explicit resolution, design a separate effectful service, tentatively
`HostResolver` rather than `Dns`:

```ts
interface HostResolver {
  readonly resolve: (
    host: Net.Host,
    options?: { readonly family?: 4 | 6 | undefined }
  ) => Effect.Effect<NonEmptyReadonlyArray<Net.IpAddress>, ResolveError>
}
```

Numeric hosts return themselves without lookup. Hostnames use platform policy and return all addresses in documented
order. A higher-level operation combines each result with a required port to produce `InetAddress` values. Specify
cancellation, errors, ordering, duplicate handling, IPv4-mapped behavior, and search-list/trailing-dot policy before
implementation.

Provide separate adapters if both semantics are needed:

- OS host resolution (`getaddrinfo`-like): honors hosts files, NSS, and runtime policy; appropriate for socket dialing.
- DNS protocol resolution: queries A/AAAA and exposes DNS-specific behavior; appropriate for DNS applications.

Do not expose only a first address. RFC 1123 requires applications to cope with multihomed hosts and try alternatives.
Connection racing belongs above the resolver.

### Tests

Add table-driven runtime tests for:

- ASCII case canonicalization, digit-leading labels, hyphens, one/many labels, `localhost`, final dot, 63-octet labels,
  and 255-octet wire-name boundaries.
- Empty/root names, empty interior labels, leading/trailing hyphens, underscores, spaces, delimiters, overlong labels and
  names, malformed A-labels, and dotted-quad ambiguity.
- Unicode/A-label pairs, normalization, mapping policy, fake A-label rejection, Bidi and joiner cases, and IDNA length
  expansion.
- Strict IPv4 and IPv6 host parsing, bracket rules, and rejection of WHATWG legacy IPv4 forms.
- Authorities with absent, zero, ordinary, and 65535 ports; invalid numbers; bracket failures; userinfo/path/query/hash;
  parse-format-parse idempotence.
- Equal values having equal hashes, canonical formatting idempotence, frozen values, guard rejection, and Node inspect.
- Schema direct/decode equivalence and string round trips.
- Cluster HTTP/WebSocket URL formation for hostname, IPv4, and IPv6; encoded `RunnerAddress` shape; persisted key
  compatibility; Bun unresolved-listener rejection.

Add type tests for parser result types, union narrowing, Schema encoded/type values, dual signatures if any, and the
absence of an implicit `Authority -> InetAddress` conversion.

Property-style coverage should generate valid ASCII label sequences, IP values, and ports and assert canonical
round trips. IDNA property generation should rely on upstream conformance data rather than arbitrary Unicode strings.

### Validation

Use the narrowest repository commands for each slice:

- `pnpm lint-fix`
- `pnpm test --run packages/effect/test/unstable/net/Net.test.ts`
- targeted cluster and affected platform tests with `pnpm test --run <file>`
- `pnpm test-types Net.tst.ts` and any changed cluster type-test file
- `pnpm check` for source/API changes
- `pnpm jsdocs --check` if public API documentation is added or changed
- `pnpm codegen` only when generated barrels need refresh

For dependency and IDNA changes, also run the repository's bundle analysis on representative core imports. Never run
bare `pnpm test` or `pnpm doctest`.

### Changeset and migration

The foundational public API and any consumer-visible canonicalization require a changeset. Call out:

- the new unstable values and exact hostname semantics;
- canonical lowercase A-label encoding;
- rejection of arbitrary URI `reg-name`, DNS owner names, and legacy IPv4;
- `Authority` being unresolved and distinct from `InetAddress`;
- any `RunnerAddress.host` TypeScript type change despite preserved encoded shape;
- any equality, hash, primary-key, log, URL, or error changes.

Treat runner key changes as a separate migration. Inventory SQL/local encoded storage and deployed key formats, select a
versioned representation, write migration/compatibility tests, and document retirement. Do not add speculative
backward-compatibility branches to the pure values.

## Risks and open decisions

- **IDNA implementation and bundle cost:** Core currently has no direct IDNA dependency. Decide whether a reviewed UTS
  #46 dependency is acceptable or whether ASCII-only must ship first.
- **Unicode version drift:** UTS #46 tables evolve. Pinning gives reproducibility; upgrading can change acceptance and
  identity. Dependency upgrades require behavior-diff fixtures and release notes.
- **Mapping policy:** Non-transitional UTS #46 is proposed for interoperability, but it differs from strict IDNA2008.
  Confirm this compatibility choice with maintainers and document exact flags.
- **Trailing dot:** Preserving it protects absolute-versus-search semantics but causes `example.com` and `example.com.`
  to differ in equality and cluster identity. Confirm this is desirable for all first consumers.
- **Numeric final labels:** The parser must define the dotted-decimal ambiguity boundary precisely. Proposed behavior is
  strict IPv4 first and rejection of invalid four-part numeric candidates, without adopting WHATWG's broad “ends in a
  number” algorithm.
- **Single-label names:** `localhost` and intranet/search-list names are current use cases, so the MVP permits them. They
  are syntactically valid but environment-relative and not globally DNS-qualified.
- **Port zero:** Needed for listen configuration but invalid for ordinary remote dialing. Keep it in general `Authority`
  and enforce connect semantics at the operation boundary unless maintainers prefer separate listen/target models.
- **Authority naming:** RFC 3986 authority includes optional userinfo; this value intentionally follows HTTP's commonly
  used host/port authority subset. JSDoc must state the restriction prominently.
- **IPv6 scoped targets:** Existing numeric host values cannot carry a named zone. Add an explicit future scoped target
  model if native client demand appears; do not smuggle `%zone` through `Hostname`.
- **Cluster identity:** Canonicalization merges case and IDNA spellings that are currently distinct and can alter primary
  keys. Preserve encoded storage first, then make identity migration a conscious release decision.
- **Bun advertising versus binding:** A runner may want to advertise a hostname but bind a wildcard/numeric local
  address. `runnerAddress` and `runnerListenAddress` already suggest this split; enforce it rather than resolving an
  advertised name implicitly.
- **Error taxonomy:** Decide dedicated `HostError` versus extending `AddressError` after checking downstream pattern
  matches. Prefer the smaller compatibility surface.

## Follow-ups

- Design `HostResolver` from concrete Node/Deno/Bun consumers, with OS and DNS-protocol semantics kept explicit.
- Add a required-port `InetTarget`/`SocketTarget` if client APIs need one shared dial target; keep Unix paths as a
  separate variant.
- Add connection planning/Happy Eyeballs above resolution, not inside `Hostname` or `Authority`.
- Design a broader DNS `Name`/`Label` family for SRV, MX, CNAME, PTR, zone, and wire-protocol work; do not relax
  `Hostname` to accommodate it.
- Evaluate typed TLS server-name and HTTP `Host`/`:authority` values, including certificate matching and default ports.
- Evaluate PostgreSQL, Redis, proxy, and Kubernetes configuration adoption independently because each has
  protocol-specific host syntax.
- Consider Unicode display helpers only with an explicit security/rendering policy for confusables and mixed scripts.
- Revisit IPv6 zone identifiers when a native unresolved client API needs them, using RFC 6874/9844-era URI guidance
  appropriate at implementation time rather than treating them as ordinary hostnames.
