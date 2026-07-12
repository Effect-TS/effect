# MCP Server Version Negotiation

## Status

Planned.

## Summary

Update `packages/effect/src/unstable/ai/McpServer.ts` and its supporting MCP schemas so an MCP server:

1. Supports the latest stable MCP protocol revision, `2025-11-25`.
2. Can declare an ordered, non-empty set of supported protocol versions.
3. Negotiates one protocol version during initialization as required by MCP.
4. Associates the negotiated version with the session and enforces it for subsequent Streamable HTTP requests.
5. Observes the initialization lifecycle through `notifications/initialized` before treating a client as ready for normal server-initiated traffic.

The work is intentionally divided into independently reviewable units. Every unit includes its own tests and can be completed before starting the next dependent unit.

## Specification Sources

This plan targets the latest stable specification available when it was written:

- [MCP versioning](https://modelcontextprotocol.io/docs/learn/versioning)
- [MCP 2025-11-25 specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [Lifecycle and version negotiation](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [2025-11-25 schema](https://modelcontextprotocol.io/specification/2025-11-25/schema)
- [2025-11-25 changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- [Authoritative TypeScript schema](https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-11-25/schema.ts)

If the latest stable MCP revision changes before implementation begins, first update this document's target revision and repeat the schema audit in Task 1. Do not target the MCP `draft` revision.

## Normative Requirements

The implementation must preserve these protocol rules:

1. Initialization is the first client-server protocol interaction.
2. The client sends one `protocolVersion` string, normally its latest supported version. It does not send a list of versions.
3. If the server supports the requested version, it must return that exact version.
4. Otherwise, the server must return another version it supports and should prefer its latest supported version.
5. The client decides whether it supports the alternative. If it does not, it disconnects.
6. One negotiated version applies to the session.
7. After a successful initialize response, the client sends `notifications/initialized` before normal operation.
8. Before receiving `notifications/initialized`, the server should not send requests other than ping or notifications other than logging.
9. Streamable HTTP clients must include `MCP-Protocol-Version` on subsequent requests.
10. An invalid or unsupported `MCP-Protocol-Version` must produce HTTP 400.
11. If a session identifies the negotiated version, an absent protocol-version header can be resolved from that session. The `2025-03-26` compatibility assumption is only needed when the server has no other way to identify the version.
12. If the server issued `MCP-Session-Id`, clients must send it on subsequent HTTP requests. A missing required ID should produce HTTP 400; an unknown or expired supplied ID should produce HTTP 404.

## Current State

The implementation currently:

- Defines private global versions in `McpServer.ts`, with `2025-06-18` as latest.
- Always supports the same hard-coded set: `2025-06-18`, `2025-03-26`, `2024-11-05`, and `2024-10-07`.
- Correctly echoes a requested version in that set and otherwise proposes its hard-coded latest version.
- Rewrites the client's initialize payload with the selected version before storing it.
- Stores initialize payloads in `Map<string, InitializePayload>` rather than storing explicit session state.
- Emits `MCP-Protocol-Version` response headers but does not validate request headers.
- Treats the session as initialized immediately after handling `initialize`.
- Ignores `notifications/initialized`.
- Has an `initializedClients` set used for outgoing notifications, but never adds clients to it.
- Uses transient RPC client IDs for outgoing notification readiness, which does not model stable HTTP sessions.
- Supplies an invalid `McpServerClient` during the initial request by asserting that an absent initialize payload exists.
- Returns HTTP 404 plus an Effect defect for both missing and unknown sessions.

Existing tests cover only unsupported-version fallback through one response header and a non-initialize request without a session ID.

## Task 1 Audit Results

The audit compared the implemented server surface with the official schemas for `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`, and `2024-10-07`. The version list must represent protocols the complete server can actually serve, not merely dates it can return from `initialize`.

### Supported Version Decision

The planned supported-version union is:

```ts
export const supportedProtocolVersions = [
  "2025-11-25",
  "2025-06-18"
] as const
```

Both entries are conditional on completing the schema, lifecycle, capability, and transport work in this plan. Until that work lands, the current implementation does not fully conform to either revision.

`2025-11-25` and `2025-06-18` can share the implemented common subset after the corrections below because the relevant `2025-11-25` additions are optional and capability-gated. Version-aware encoding must prevent `2025-11-25`-only fields or methods from being emitted in a `2025-06-18` session.

Remove these revisions from the supported set:

| Revision | Decision | Reason |
| --- | --- | --- |
| `2025-03-26` | Remove | It permits JSON-RPC batching, predates elicitation, resource links, structured tool output, and completion context, and therefore requires a materially different accepted method/schema surface. |
| `2024-11-05` | Remove | It requires the legacy HTTP+SSE transport and predates several content and tool fields emitted by the common implementation. |
| `2024-10-07` | Remove | Its tool result is `{ toolResult: unknown }`, fundamentally different from the modern `content`/`isError` result, and its method set also differs. |

The removal is deliberate scope control. Supporting these revisions later requires separate compatibility work with version-specific schemas, method groups, encoders, capability tables, and transports.

### Cross-Cutting Compatibility Findings

The current implementation selects a version string but does not select a version-specific protocol surface. All sessions use the same RPC groups, handlers, capability generation, and schemas. This is insufficient whenever revisions differ in method availability or wire representation.

The current `layerHttp` delegates to a generic POST-only RPC route. It does not yet satisfy Streamable HTTP requirements shared by the two planned revisions:

- No GET route returning SSE or HTTP 405.
- No `Accept` validation for the required media types.
- No explicit empty HTTP 202 response for accepted notifications and responses.
- No SSE delivery path for server requests and notifications.
- No `Origin` validation.
- Request-scoped transport client IDs cannot identify stable MCP sessions.

Tasks 8 through 10 must close these gaps, or `layerHttp` must explicitly remain outside the conformance claim. Stdio can use the same two protocol schemas once the schema and lifecycle corrections are complete.

### Required `2025-11-25` Schema Corrections

The following differences affect types already accepted, emitted, or exposed by `McpServer`. They are required before advertising `2025-11-25`.

#### Shared Metadata and Errors

- Make request `_meta` open to arbitrary JSON-compatible keys while retaining typed `progressToken`.
- Add shared request metadata to completion, sampling, and elicitation requests.
- Add result metadata to completion, sampling, and roots results.
- Preserve arbitrary result extension keys where client results are decoded.
- Require integer MCP error codes at the schema boundary.
- Verify that JSON-RPC parse and invalid-request errors can omit `id`; address this in RPC serialization only if wire tests show the generic layer cannot emit the official envelope.

#### Initialization and Capabilities

- Add `Implementation.icons`, `description`, and `websiteUrl`.
- Add the official `Icon` model.
- Decode `ClientCapabilities.sampling.context` and `sampling.tools`.
- Decode `ClientCapabilities.elicitation.form` and `elicitation.url`; preserve empty elicitation capability objects as legacy form support.
- Keep task capabilities unimplemented and unadvertised.
- Keep the existing `extensions` field documented as a non-standard open capability extension; official revisions use `experimental` for their standardized experimental capability container.
- Decide whether logging is truly deliverable before advertising `logging: {}`. A registered `logging/setLevel` handler alone does not prove server-to-client logging support.

#### Notifications

- Make `notifications/progress.progress` required.
- Keep task and URL-elicitation notifications absent while those capabilities are unimplemented.

#### Tools

- Make `tools/call.arguments` optional on the wire and normalize omission to `{}` before invoking existing handlers.
- Restrict `CallToolResult.structuredContent` to a JSON object; arrays and `null` are invalid.
- Ensure generated tool `inputSchema` has root `type: "object"`.
- Add optional `Tool.icons`, `outputSchema`, and metadata fields used by the official surface.
- Keep task execution metadata absent unless task support is implemented.
- Verify that errors from a found tool's argument validation are returned as tool execution errors with `isError: true`, not protocol errors.

#### Resources, Prompts, and Content

- Add optional icons to resources, resource templates, prompts, and resource links.
- Add prompt `_meta`.
- Add content `_meta` to text, image, audio, and embedded-resource blocks.
- Add resource-content `_meta` and annotation `lastModified`.
- Verify that `Schema.Uint8Array` encodes resource blobs, images, and audio as base64 strings accepted by the official schema.

#### Completion

- Add request and result metadata.
- Enforce a maximum of 100 completion values.
- Require integer totals in emitted and decoded completion results.

#### Sampling

- Fix `CreateMessageResult` to include required `role`, `content`, and `model`.
- Allow sampling content to be one block or an array.
- Make request `metadata` optional and object-valued.
- Add sampling message `_meta`.
- Keep sampling tool-use blocks, request `tools`, and `toolChoice` unimplemented unless the implementation also checks `ClientCapabilities.sampling.tools`.
- Do not use non-`none` `includeContext` unless the client advertises `ClientCapabilities.sampling.context`.

#### Elicitation

- Keep the public helper form-only for this work; omitted `mode` is compatible form mode.
- Add request metadata.
- Constrain `requestedSchema` to the official flat object of supported primitive schemas rather than arbitrary JSON Schema.
- Restrict accepted form content to the official string, number, boolean, and string-array record.
- Keep URL mode, URL completion notifications, and error `-32042` unimplemented and unadvertised.

### Optional `2025-11-25` Features Deferred

The following features are optional and do not block support when their capabilities are absent:

- Tasks and task-augmented requests.
- Sampling tool use.
- URL-mode elicitation.
- Resource subscriptions; continue advertising `subscribe: false`.
- Tool task-execution metadata.
- Stream resumability and redelivery.

Optional metadata fields such as icons may be omitted from server-produced values, but schemas for already exposed client inputs and results should decode them so typed client state is not silently incomplete.

### Version-Specific Behavior Required for `2025-06-18`

The common implementation must not emit `2025-11-25`-only protocol features in a `2025-06-18` session. The initial version table needs to capture at least:

- No tasks or task-augmented requests.
- No sampling tool use or tool-use sampling blocks.
- No URL-mode elicitation or completion notification.
- No `2025-11-25`-only implementation and icon metadata unless confirmed as tolerated extension data and intentionally supported.

The exact field-level table must be derived from the official tagged `2025-06-18` schema while implementing Task 5. The encoder should operate on the negotiated session version rather than relying on clients to ignore newer fields.

### Conformance Fixtures Required by Task 5

Add focused fixtures for:

- Official `2025-11-25` initialize request metadata, client capability subfields, implementation description, website, and icons.
- An argumentless `tools/call` request.
- Structured tool results accepting objects and rejecting arrays and `null`.
- Progress notifications rejecting a missing `progress` value.
- Completion metadata and the 100-value boundary.
- A minimal sampling request without `metadata`.
- A sampling result containing `role`, `content`, `model`, and array content.
- Form elicitation accepting the official primitive subset and rejecting nested object schemas.
- Image, audio, and resource blob base64 round trips.
- A compatibility fixture for each of `2025-11-25` and `2025-06-18` validating emitted values against the official tagged schema.

### Audit Completion Decision

Task 1 is complete when these findings are accepted. Task 2 should define only the two planned constants above. Task 5 owns the schema corrections and version-specific compatibility fixtures; Tasks 6 through 10 own lifecycle and transport conformance.

## Goals

- Make supported protocol versions explicit server configuration.
- Default to a verified set headed by `2025-11-25`.
- Keep the initialize wire field scalar and specification-compatible.
- Make negotiation deterministic and independently testable.
- Preserve both the client's requested version and the selected session version.
- Represent lifecycle state explicitly.
- Enforce the selected version at the Streamable HTTP boundary.
- Use expected protocol/transport errors rather than defects for invalid client input.
- Correct outgoing notification readiness after `notifications/initialized`.
- Document and test public API behavior.

## Non-Goals

- Changing the initialize request to send or accept an array of protocol versions.
- Implementing an iterative negotiation exchange. MCP defines one client offer and one server response.
- Implementing every optional feature introduced in `2025-11-25`, such as tasks, solely to advertise the revision.
- Adding HTTP+SSE backward compatibility for the deprecated `2024-11-05` transport unless the schema/transport audit proves it is already promised by the current API.
- Adding Streamable HTTP resumability, redelivery, or DELETE session termination unless required to complete version negotiation safely.
- Refactoring unrelated tool, prompt, resource, or RPC behavior.
- Correcting unrelated public layer output types as part of this change.

## Design Decisions

### Supported Versions Are Server Configuration

Add an optional ordered, non-empty `supportedProtocolVersions` property to all server constructors. The first element is the server's preferred fallback version. Configuration order is authoritative; versions are not sorted lexicographically at runtime.

Conceptual API:

```ts
export const supportedProtocolVersions = [
  "2025-11-25",
  "2025-06-18"
] as const

export type ProtocolVersion = typeof supportedProtocolVersions[number]

export const latestProtocolVersion = supportedProtocolVersions[0]

export interface ServerOptions {
  readonly name: string
  readonly version: string
  readonly supportedProtocolVersions?: readonly [
    ProtocolVersion,
    ...Array<ProtocolVersion>
  ]
  readonly extensions?: Record<`${string}/${string}`, unknown>
}
```

The exact exported names should be checked against nearby Effect naming conventions during Task 2. `ProtocolVersion` is the closed union of revisions this implementation knows how to serve, so server configuration cannot claim an arbitrary revision. `Schema.String` remains the initialize wire schema because future protocol versions must still be decodable as client offers even when unknown to this implementation; negotiation can then propose a known `ProtocolVersion`.

### Defaults Include Only Verified Revisions

The default list may include only revisions for which the implemented MCP subset is wire-compatible. Task 1 decides whether each current legacy entry remains in the default list. A version must not remain merely because it was previously present.

### Negotiation Is Pure Selection

Given a `string` client `requested` value and ordered `ProtocolVersion` server `supported` versions:

```text
if requested is supported:
  selected = requested
else:
  selected = supported[0]
```

No error is returned merely because the offered version is unsupported. The normative lifecycle rules require the server to propose another supported version. The example `InvalidParams` response in the lifecycle error-handling section is not used for ordinary fallback.

### Session State Owns the Negotiated Version

Do not mutate the initialize payload. Store the original payload and negotiated version separately. Session state distinguishes negotiation from readiness:

```ts
type Session =
  | {
      readonly _tag: "Negotiated"
      readonly initializePayload: InitializePayload
      readonly protocolVersion: string
    }
  | {
      readonly _tag: "Operational"
      readonly initializePayload: InitializePayload
      readonly protocolVersion: string
    }
```

If transport delivery requires additional state, add it beside these fields without weakening the lifecycle distinction.

### HTTP Validation Uses Session State

For requests after initialize:

1. Resolve the stable MCP session.
2. Reject a missing required session ID with HTTP 400.
3. Reject an unknown supplied session ID with HTTP 404.
4. If `MCP-Protocol-Version` is present, require it to be a configured supported version and equal the session's negotiated version.
5. Return HTTP 400 for invalid, unsupported, or session-mismatched values.
6. If the header is absent, use the session's negotiated version because the server has another way to identify it.

The initial initialize POST negotiates through its JSON payload and does not require the header.

### Initialization Context Is Separate

`McpServerClient` represents an initialized session and must not be fabricated for an initial `initialize` call. Restructure RPC middleware or request grouping so initialize can execute without `initializePayload!`, while operational handlers continue receiving `McpServerClient`.

### Notification Readiness Uses Stable Session Identity

`notifications/initialized` transitions a session to `Operational`. Outgoing non-logging notifications are sent only to operational sessions. HTTP readiness must not be keyed solely by the transient numeric RPC client ID.

## Work Plan

### Task 1: Audit `2025-11-25` Schema Compatibility

**Objective:** Determine the exact schema and capability changes required before the server can truthfully advertise `2025-11-25`.

**Files:**

- `packages/effect/src/unstable/ai/McpSchema.ts`
- Official MCP `2025-11-25` TypeScript and JSON schemas

**Work:**

1. Compare every MCP schema currently used by `McpServer.ts` with the official `2025-11-25` schema.
2. Prioritize initialize payload/result, implementation metadata, client/server capabilities, tools, resources, prompts, completion, logging, elicitation, sampling, notifications, and error envelopes.
3. Record whether each difference is required for decoding, encoding, or only an unimplemented optional capability.
4. Verify the compatibility of each legacy version currently listed by the server.
5. Decide the exact default supported-version tuple. Remove any revision whose implemented transport or wire behavior is incompatible.
6. Convert the audit results into a checklist in the implementing pull request or append them to this specification if they materially change scope.

**Acceptance criteria:**

- Every default version has an explicit compatibility justification.
- All required `2025-11-25` schema changes are identified.
- Optional features not implemented by this server are identified and excluded from advertised capabilities.
- No source behavior changes are included in this task unless needed to add focused schema conformance tests.

**Verification:**

- Decode official initialize request and result examples with local schemas.
- Run any added targeted schema tests.

**Depends on:** Nothing.

### Task 2: Add Protocol Version Domain API

**Objective:** Establish one public source of truth for the latest and default supported revisions.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`, or `McpSchema.ts` if the audit shows the domain belongs there
- `packages/effect/typetest/` if exported tuple inference needs coverage

**Work:**

1. Add `2025-11-25` as the latest stable protocol version.
2. Export the latest-version constant and readonly default supported-version tuple using repository naming conventions.
3. Derive `ProtocolVersion` from the readonly tuple so it is the union of revisions the library can serve.
4. Keep incoming initialize payloads typed as `string`, preserving the boundary between an arbitrary client offer and a server-supported version.
5. Add compliant public JSDoc for each export.
6. Remove the private duplicated latest/supported constants once all internal references use the new definitions.

**Acceptance criteria:**

- Consumers can reference the latest and default supported versions.
- The latest value is `2025-11-25`.
- The default tuple is readonly and ordered by server preference.
- `ProtocolVersion` is inferred as the union of tuple members rather than `string`.
- Server configuration rejects arbitrary version strings at compile time.
- Unknown future strings remain valid in decoded initialize requests.

**Verification:**

- Targeted pure/type tests for exported values and inference.
- `pnpm lint` for JSDoc and formatting.

**Depends on:** Task 1.

### Task 3: Add Pure Version Negotiation

**Objective:** Isolate and test the specification's selection rules before changing server configuration.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`
- `packages/effect/test/unstable/ai/McpServer.test.ts`

**Work:**

1. Extract a small pure internal negotiation function accepting a `string` request and returning `ProtocolVersion`.
2. Return the requested version when it is present in the ordered supported set.
3. Return the first supported version otherwise.
4. Replace the current inline global-array negotiation with the helper.
5. Stop mutating the initialize payload solely to record the selected version; temporarily preserve equivalent downstream behavior until typed session state lands in Task 6.

**Acceptance criteria:**

- A supported request is echoed exactly.
- An unsupported request selects the first server-supported version.
- Selection does not depend on date parsing or lexical sorting.
- The existing fallback behavior remains functional with the new latest default.

**Verification:**

- Pure tests for latest, older supported, unknown future, malformed-looking, and custom-order values.
- Targeted `McpServer.test.ts` run.

**Depends on:** Task 2.

### Task 4: Configure Multiple Versions Per Server

**Objective:** Let each MCP server instance declare its supported revisions.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`
- `packages/effect/test/unstable/ai/McpServer.test.ts`
- `packages/effect/typetest/` for public option typing

**Work:**

1. Introduce one shared internal/public server options type.
2. Add optional `supportedProtocolVersions` to `run`, `layer`, `layerStdio`, and `layerHttp`.
3. Require a non-empty readonly tuple when supplied.
4. Snapshot the supplied tuple at server construction so external mutation cannot change active behavior.
5. Validate duplicate entries at construction if the type cannot prevent them; fail with a specific configuration error rather than silently normalizing.
6. Pass the effective tuple into `layerHandlers` and the pure negotiation function.
7. Use the verified default tuple when the option is omitted.

**Acceptance criteria:**

- Different server instances can negotiate different version sets in one process.
- The first configured entry is the fallback.
- Empty arrays are rejected by types, and untyped boundary input cannot create a server with no versions.
- Configuration entries are restricted to the library's `ProtocolVersion` union.
- All server constructors expose identical negotiation semantics.
- Existing callers that omit the option continue to work.

**Verification:**

- Type test for non-empty tuple acceptance and empty tuple rejection.
- Integration tests for custom exact match, custom fallback order, and isolated server instances.
- Targeted MCP server tests and type tests.

**Depends on:** Task 3.

### Task 5: Implement Required `2025-11-25` Schema Updates

**Objective:** Make the implemented MCP surface wire-compatible with the revision the server now advertises.

**Files:**

- `packages/effect/src/unstable/ai/McpSchema.ts`
- Relevant MCP schema tests or `McpServer.test.ts`

**Work:**

1. Implement only the required schema changes identified in Task 1.
2. Preserve open capability objects and extension points required by MCP.
3. Add new optional metadata fields where decoding or encoding requires them.
4. Do not advertise optional `2025-11-25` capabilities without corresponding handlers.
5. Keep revision-specific schemas or boundary transforms localized if representations differ across supported revisions.
6. Add version-aware encoding/decoding only where the audit demonstrates a real incompatibility.

**Acceptance criteria:**

- Official `2025-11-25` examples for the implemented surface decode.
- Values emitted by the server validate against the official schema for the negotiated revision.
- Older retained revisions continue to pass their compatibility fixtures.
- No unsupported optional capability is added to initialize results.

**Verification:**

- Targeted schema round-trip tests.
- Targeted MCP server tests.
- `pnpm check` because source schema types change.

**Depends on:** Tasks 1 and 4.

### Task 6: Introduce Typed Session Lifecycle State

**Objective:** Separate the client offer, negotiated version, and operational readiness.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`
- `packages/effect/src/unstable/ai/McpSchema.ts` if `McpServerClient` needs a clarified contract
- `packages/effect/test/unstable/ai/McpServer.test.ts`

**Work:**

1. Replace `Map<string, InitializePayload>` with a typed session record.
2. Preserve the original initialize payload unchanged.
3. Store the negotiated version as a separate required field.
4. Represent at least `Negotiated` and `Operational` states as a discriminated union.
5. Create the negotiated state only for a successfully handled initialize request.
6. Make `notifications/initialized` transition the matching session to operational.
7. Define duplicate initialize and duplicate initialized-notification behavior explicitly. Prefer rejecting reinitialize within an existing session and making a duplicate initialized notification idempotent.
8. Update `clientCapabilities`, filtering, and `McpServerClient` provisioning to read from session state.
9. Remove the `initializePayload!` non-null assertion.
10. Ensure the initialize handler does not require an already initialized `McpServerClient` service.

**Acceptance criteria:**

- The requested and negotiated versions are both available and cannot be confused.
- Initial initialize handling never constructs an invalid `McpServerClient`.
- The initialized notification changes lifecycle state.
- Operational handlers receive a valid initialize payload and negotiated version.
- Illegal partial session states are not representable.

**Verification:**

- Tests for original-offer preservation, negotiated state, initialized transition, duplicate notification, and reinitialize policy.
- Targeted MCP server tests and `pnpm check`.

**Depends on:** Tasks 4 and 5.

### Task 7: Enforce Pre-Operational Lifecycle Rules

**Objective:** Prevent normal traffic from bypassing initialization while preserving MCP's allowed initialization-phase traffic.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`
- `packages/effect/test/unstable/ai/McpServer.test.ts`

**Work:**

1. Reject normal requests received before initialize.
2. Permit ping where the lifecycle specification allows it.
3. Decide and document whether client requests after the initialize response but before `notifications/initialized` are rejected or accepted with no server-initiated traffic. Prefer rejection for normal operations because it produces a deterministic state boundary, but confirm interoperability with official SDK behavior before finalizing.
4. Prevent server-initiated requests and non-logging notifications before the session becomes operational.
5. Return typed MCP errors or deliberate HTTP responses for expected invalid ordering; do not use defects.

**Acceptance criteria:**

- Initialize is the first state-creating request.
- Ping behavior matches the specification.
- Normal operations cannot occur without a negotiated session.
- No list-change notification is sent to a merely negotiated session.
- Invalid ordering does not produce a server defect.

**Verification:**

- Lifecycle matrix tests covering no session, negotiated session, and operational session.
- Targeted MCP server tests.

**Depends on:** Task 6.

### Task 8: Validate Streamable HTTP Session Identity

**Objective:** Distinguish missing, unknown, and valid HTTP sessions according to the transport specification.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`
- `packages/effect/test/unstable/ai/McpServer.test.ts`

**Work:**

1. Keep initialize exempt from session-ID requirements.
2. Return HTTP 400 when a subsequent request omits a session ID that the server issued.
3. Return HTTP 404 when a supplied session ID is unknown or expired.
4. Replace `Effect.die` for these expected inputs with typed validation or direct HTTP rejection.
5. Ensure a stable MCP session ID, not a request-scoped RPC client ID, selects HTTP session state.
6. Fix the test client so it retains its session ID when ordinary responses omit that header.
7. Verify multiple sequential requests continue using one session.

**Acceptance criteria:**

- Missing and unknown IDs produce different required status codes.
- Invalid client input does not create defects or noisy internal failures.
- Three or more sequential HTTP requests use the same session successfully.
- Session data does not leak between clients.

**Verification:**

- Raw HTTP integration tests for initialize, missing ID, unknown ID, valid ID, and multiple sessions.
- Targeted MCP server tests.

**Depends on:** Task 6.

### Task 9: Enforce `MCP-Protocol-Version` for HTTP

**Objective:** Ensure every subsequent HTTP request is interpreted using the session's negotiated revision.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`
- `packages/effect/test/unstable/ai/McpServer.test.ts`

**Work:**

1. Read `MCP-Protocol-Version` at the HTTP boundary after resolving the session.
2. Accept a present value only when it is configured as supported and equals the session's negotiated version.
3. Return HTTP 400 for malformed, unsupported, or session-mismatched values.
4. When the header is absent and a valid session exists, use the negotiated version stored in the session.
5. Apply the `2025-03-26` compatibility assumption only where there is genuinely no other version signal and doing so is relevant to an accepted transport flow.
6. Continue returning the selected version in the initialize result.
7. Decide whether to retain response `MCP-Protocol-Version` headers. Keep them if harmless, but do not use them as a substitute for request validation.
8. Centralize header names and validation to avoid different behavior between requests and notifications.

**Acceptance criteria:**

- The initialize POST succeeds without a protocol-version header.
- A subsequent request with the negotiated value succeeds.
- A subsequent request without the header succeeds when session state identifies the version.
- Unsupported and malformed values return HTTP 400.
- A globally supported value that differs from the session version returns HTTP 400.
- Version validation occurs before invoking application handlers.

**Verification:**

- Raw HTTP tests asserting status, headers, and whether handlers ran.
- Tests for exact, absent, unknown, and mismatched header values.
- Targeted MCP server tests.

**Depends on:** Tasks 8 and 6.

### Task 10: Correct Initialized Notification Delivery

**Objective:** Send server notifications only to clients that completed initialization, using stable session identity.

**Files:**

- `packages/effect/src/unstable/ai/McpServer.ts`
- Potentially `packages/effect/src/unstable/rpc/RpcServer.ts` only if the transport lacks the minimum stable-session routing hook
- `packages/effect/test/unstable/ai/McpServer.test.ts`

**Work:**

1. Replace or remove `initializedClients: Set<number>`.
2. Derive notification eligibility from operational session state.
3. Associate active transport delivery channels with stable MCP sessions.
4. Ensure one server message is delivered on only one active HTTP stream for a session.
5. Do not broadcast notifications to all transport client IDs.
6. Remove stale delivery-channel associations without deleting valid session negotiation state accidentally.
7. If the existing HTTP RPC layer cannot expose a compliant GET/SSE channel, isolate the missing transport feature and document it rather than pretending queued notifications were delivered.
8. Keep generic RPC changes minimal and MCP-agnostic if a transport hook is required.

**Acceptance criteria:**

- A negotiated-only client receives no list-change notifications.
- An operational stdio/custom-transport client receives eligible notifications.
- HTTP notification behavior is either conforming through one session stream or explicitly unsupported without dead state that claims otherwise.
- Disconnected delivery channels are cleaned up.
- Notifications are not duplicated across simultaneous streams.

**Verification:**

- Integration tests around registration-triggered list-change notifications before and after initialized.
- Multi-client isolation test.
- HTTP stream test if HTTP server-initiated delivery is supported by the resulting design.
- Targeted MCP and any affected RPC tests.

**Depends on:** Tasks 7 and 9.

### Task 11: Add Complete Negotiation Conformance Coverage

**Objective:** Consolidate the behavior into a readable regression suite based on the protocol lifecycle.

**Files:**

- `packages/effect/test/unstable/ai/McpServer.test.ts`
- `packages/effect/typetest/` as needed

**Work:**

1. Organize tests into negotiation, lifecycle, HTTP session, HTTP version header, and notifications groups.
2. Add a table-driven negotiation matrix covering every default supported version.
3. Add custom configuration cases.
4. Assert the initialize JSON-RPC result body, not only response headers.
5. Assert `MCP-Session-Id`, HTTP statuses, notification HTTP 202 responses, and error bodies where applicable.
6. Exercise multiple requests and multiple sessions.
7. Remove tests superseded by stronger assertions without weakening coverage.

**Acceptance criteria:**

- Every normative requirement listed in this document maps to at least one test or an explicit documented transport limitation.
- Tests fail if latest-version fallback, exact echo, session binding, lifecycle transition, or HTTP header enforcement regresses.
- Tests use `it.effect` and `assert` utilities according to repository conventions.

**Verification:**

```sh
pnpm test packages/effect/test/unstable/ai/McpServer.test.ts
pnpm test-types <mcp-type-test-file>
```

**Depends on:** Tasks 2 through 10.

### Task 12: Document and Release the API Change

**Objective:** Make the new behavior discoverable and prepare it for release.

**Files:**

- Public JSDoc in `packages/effect/src/unstable/ai/McpServer.ts`
- Public JSDoc in `McpSchema.ts` if exports were added there
- `.changeset/<generated-name>.md`

**Work:**

1. Document the default versions and `supportedProtocolVersions` ordering.
2. Explain that clients still send one version string.
3. Document exact-match and preferred-fallback behavior.
4. Document HTTP header enforcement and lifecycle expectations.
5. Add a changeset covering the exported API, latest stable support, and runtime HTTP behavior.
6. Run code generation only if modules were added or removed. Do not hand-edit generated barrels.

**Acceptance criteria:**

- Public options have complete compliant JSDoc.
- The changeset accurately describes user-visible behavior.
- Examples use `2025-11-25` or exported constants rather than stale literals.
- No generated file is manually edited.

**Verification:**

```sh
pnpm lint
```

**Depends on:** Task 11.

### Task 13: Final Validation

**Objective:** Verify the complete change using repository-required checks.

**Work:**

1. Run formatting and lint fixes.
2. Run the targeted MCP runtime tests.
3. Run targeted MCP type tests.
4. Run the repository type checker.
5. Inspect the final diff for unrelated changes, unsafe assertions, generated-file edits, and stale protocol literals.
6. Confirm every acceptance criterion in this document is complete or explicitly recorded as blocked.

**Verification:**

```sh
pnpm lint-fix
pnpm test packages/effect/test/unstable/ai/McpServer.test.ts
pnpm test-types <mcp-type-test-file>
pnpm check
```

**Acceptance criteria:**

- All commands pass.
- No new `any`, non-null assertion, or defect-based expected failure is introduced.
- The implementation defaults to verified `2025-11-25` support.
- Custom ordered version sets negotiate correctly.
- HTTP sessions enforce one negotiated version.
- Final changes remain limited to MCP negotiation, lifecycle, required schemas, tests, documentation, and any minimal transport support proven necessary by tests.

**Depends on:** Task 12.

## Test Matrix

| Area | Scenario | Expected result |
| --- | --- | --- |
| Default negotiation | Client requests `2025-11-25` | Response echoes `2025-11-25` |
| Default negotiation | Client requests retained older revision | Response echoes requested revision |
| Default negotiation | Client requests unknown future revision | Response selects first default revision |
| Custom negotiation | Client requests configured revision | Response echoes requested revision |
| Custom negotiation | Client requests unconfigured revision | Response selects first configured revision |
| Isolation | Two servers configure different sets | Each uses only its own configuration |
| Initialization | First request is initialize | Session enters negotiated state |
| Initialization | Original offer differs from fallback | Original offer and selected version are both retained |
| Lifecycle | Client sends initialized notification | Session enters operational state |
| Lifecycle | Normal request has no session | Rejected without a defect |
| Lifecycle | Notification queued before operational | Not delivered |
| Lifecycle | Notification queued after operational | Delivered when transport supports it |
| HTTP session | Initialize has no session header | Accepted and server issues session ID |
| HTTP session | Subsequent request omits required session ID | HTTP 400 |
| HTTP session | Subsequent request supplies unknown ID | HTTP 404 |
| HTTP session | Multiple requests use valid ID | All resolve the same session |
| HTTP version | Initialize omits version header | Accepted; body performs negotiation |
| HTTP version | Subsequent header equals negotiated value | Accepted |
| HTTP version | Subsequent header is absent with valid session | Session version is used |
| HTTP version | Header is unsupported or malformed | HTTP 400 |
| HTTP version | Header is supported but differs from session | HTTP 400 |
| Schema | Official `2025-11-25` implemented examples | Decode and encode successfully |
| Compatibility | Fixture for every retained older revision | Remains compatible |

## Risks and Mitigations

### Advertising a Version Without Implementing Its Wire Schema

Mitigation: Task 1 gates the default list, and Task 5 implements required schema differences before lifecycle work relies on the new default.

### Treating a Version List as Client-Server Intersection Negotiation

Mitigation: Keep the wire request scalar and isolate the exact-match-or-first-supported algorithm in a pure function.

### Breaking Existing Servers by Requiring New Configuration

Mitigation: Make `supportedProtocolVersions` optional and retain a verified default tuple.

### HTTP Client Compatibility When Enforcing Headers

Mitigation: Resolve an omitted header from valid session state, as allowed by the specification, while rejecting present invalid or mismatched values.

### Conflating HTTP Requests With MCP Sessions

Mitigation: Key lifecycle state by stable MCP session ID and treat numeric RPC client IDs only as transport delivery handles.

### Expanding Into a Full Streamable HTTP Rewrite

Mitigation: Restrict generic RPC changes to the smallest routing hook demonstrated necessary by Task 10 tests. Record unsupported SSE behavior separately rather than implementing resumability or redelivery opportunistically.

### Legacy Revision Transport Differences

Mitigation: Remove a legacy revision from the default advertised set if the current server transport cannot actually honor it. Keeping a string in the list is not compatibility.

## Completion Definition

This project is complete when:

1. `2025-11-25` is the verified latest default version.
2. Every server constructor accepts an ordered non-empty supported-version set.
3. Exact supported offers are echoed and unsupported offers receive the configured preferred version.
4. The selected version is stored separately from the original initialize payload.
5. Session state transitions through negotiated and operational phases.
6. Streamable HTTP resolves and validates the negotiated version on subsequent requests.
7. Missing, unknown, unsupported, and mismatched HTTP state produce deliberate specification-aligned responses rather than defects.
8. Outgoing notification readiness follows `notifications/initialized` and stable session identity.
9. The implemented surface conforms to official `2025-11-25` schemas without advertising unimplemented optional capabilities.
10. Runtime tests, type tests, lint, and type checking pass.
11. Public JSDoc and a changeset describe the behavior.
