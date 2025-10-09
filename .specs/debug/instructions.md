# Debug Service Instructions

## Implementation Status (2025-10-07)

**Current State**: Prototype with working CDP implementation and demos

**What's Working**:
- ✅ Basic CDP connection (Chrome, Node.js, Deno, Cloudflare Workers local dev)
- ✅ Command execution with typed responses
- ✅ Event subscription with streams
- ✅ Session lifecycle management
- ✅ Error handling with tagged errors
- ✅ Working demo: `pnpm test:debug-log-steps` (step-through debugger in 0.777s)
- ✅ Tests passing for basic CDP features
- ✅ CI builds passing

**What's Missing** (blocks publication):
- ❌ Memory debugging (HeapProfiler domain) - 0% implemented
- ❌ Heap snapshot streaming
- ❌ Allocation tracking and sampling profiler
- ❌ GC monitoring and control
- ❌ Safe stepping API (blackboxing helpers)
- ❌ Comprehensive README with usage examples
- ❌ API documentation (docgen)
- ❌ Version still 0.0.0

**Working Demos**:
- `packages-native/debug-demos/src/memory-leak-demo.ts` - Node.js leak detection
- `packages-native/debug-demos/src/workers-ai-proxy-leak.ts` - Workers AI proxy leaks
- `packages-native/debug/test-fixtures/debug-step-through.ts` - **Step-through debugger using actual @effect-native/debug service**

**Key Discovery**: Node.js v24.8.0 has V8 inspector bug when using `Debugger.stepInto` through ESM async boundaries. Solution: Use `Debugger.stepOver` or implement blackboxing to skip third-party code.

## Overview and User Story

We need a new `@effect-native/debug` package that provides an Effect Service named `Debug`. The service must offer a protocol-agnostic abstraction for connecting to JavaScript runtimes through debugger protocols (Chrome DevTools Protocol, Firefox Remote Debug Protocol, WebKit Web Inspector, Servo/Ladybird RDP variants, etc.). As an ultra extreme programming team, our first customer value slice is the ability to attach to a running Chromium-based browser instance using CDP so that we can inspect runtime metadata and issue simple commands. We must, however, design the abstraction so that actor-based stacks like Firefox RDP and its Servo/Ladybird derivatives can plug in without redesigning the public API.

**User Story**: As a developer using the Effect Native toolkit, I want a `Debug` service that lets me attach to any supported JavaScript runtime via its debugger protocol so that I can drive the runtime from Effect programs (e.g., evaluate code, inspect targets, automate debugging tasks, profile memory allocations, detect memory leaks) without writing protocol-specific plumbing.

## Core Requirements (EARS)

- [Ubiquitous] When an Effect program requests a debugger connection, the system shall expose a `Debug` service interface that is independent of any specific debugger protocol.
- [Event-Driven] When given a Chrome DevTools Protocol WebSocket endpoint, the system shall establish a CDP session and expose a minimal command API for sending typed requests and receiving structured responses.
- [State-Driven] While a debug session is active, the system shall maintain connection state (targets, session id, capabilities) in Effect-safe data structures so that multiple commands can be issued sequentially.
- [Mode-Driven] When interacting with actor-based protocols (Firefox RDP, Servo, Ladybird), the system shall support request/response sequencing semantics (actor ids, watcher lifecycle) so protocol implementations can honour in-order replies and streamed events.
- [Optional] When alternative protocols (Firefox RDP, WebKit Inspector, etc.) become available, the system shall allow additional implementations to be registered without modifying existing consumer code.
- [Memory-Aware] When memory profiling is requested, the system shall provide access to heap snapshots, allocation tracking, and garbage collection monitoring through protocol-specific HeapProfiler/Memory domains.
- [Stream-Based] When capturing heap snapshots (which can be large), the system shall stream snapshot chunks as Effect Streams rather than buffering entire snapshots in memory.
- [Safe-Stepping] When stepping through user code, the system shall provide mechanisms to blackbox third-party code and avoid stepping into runtime internals that may trigger V8 inspector crashes or performance degradation.
- [Selective-Debug] When debugging specific files, the system shall support script filtering (blackbox patterns, URL matching) so that stepping operations (stepInto, stepOver, stepOut) remain within user-controlled code boundaries.

## Technical Specifications

- Define a new `Debug` Effect Service interface with capability-based operations (`connect`, `disconnect`, `sendCommand`, `subscribe` for events) returning typed Effects.
- Represent messages with protocol-agnostic envelopes (`command`, `params`, `session`, `target`, `transport`) so that backends can translate to CDP method strings or RDP actor packets.
- Provide a CDP implementation that can attach to a Chromium instance exposed via `--remote-debugging-port` or Chrome DevTools remote interface (WebSocket URL) and drive commands such as `Browser.getVersion`.
- Document an RDP-oriented adapter shape that captures length-prefixed framing and watcher/actor lifecycle so future work can reuse the same service surface when integrating Firefox/Servo/Ladybird research.
- Use Effect-managed transports (`WebSocket`, length-prefixed TCP streams) with scoped resources that implement automatic cleanup on disconnect or failure.
- Place public interfaces in `packages/debug/src/Debug.ts` (following `.patterns/module-organization.md`), keep protocol-specific wiring under `packages/debug/src/internal`.
- Follow `.patterns/effect-library-development.md` for `Effect.gen` structure and `return yield*` semantics.
- Avoid type assertions; rely on schema-based validation where possible.
- Implement blackboxing support via `Debugger.setBlackboxPatterns` (regex patterns for script URLs) and `Debugger.setBlackboxedRanges` (line ranges per script) to prevent stepping into third-party code during stepInto operations.
- Provide safe-stepping helpers that check frame URL/location before issuing step commands, automatically using `stepOut` or `resume` when execution lands in non-target code to avoid V8 inspector crashes.
- Support step limits (MAX_STEPS configuration) to prevent infinite stepping loops and ensure debugging sessions terminate gracefully.

## Acceptance Criteria (mirrors EARS requirements)

- [AC-U1] A consumer can access the `Debug` service via Effect Layer injection without referencing protocol-specific classes.
- [AC-E1] Given a valid CDP WebSocket endpoint, calling `Debug.connect` followed by `Debug.sendCommand("Browser.getVersion")` returns the parsed browser version payload from a local Chrome instance.
- [AC-S1] While issuing multiple commands over the same session, connection state is retained and commands execute sequentially without crashing.
- [AC-M1] Protocol implementations can surface actor/watcher metadata (e.g., Firefox RDP descriptors) through the same `Debug` interface without API changes, demonstrated by an adapter design and unit guards.
- [AC-O1] Protocol implementations are injected via Layers so additional protocols can be added with new Layers and the core service does not need modifications.
- [AC-M2] Given a CDP-compatible runtime, calling memory profiling commands (`takeHeapSnapshot`, `getHeapUsage`) returns structured memory data that can be saved or analyzed programmatically.
- [AC-S2] Heap snapshot data streams incrementally via Effect Streams without buffering the entire snapshot in memory, allowing analysis of large heaps (>1GB) without OOM errors.
- [AC-M3] Allocation tracking and sampling heap profiler commands work across CDP runtimes (Chrome, Node.js, Deno, Cloudflare Workers local dev) with consistent API surface.
- [AC-SS1] Given a target script URL, calling `setBlackboxPatterns` with node_modules and node internals patterns prevents stepInto from descending into third-party code, keeping execution visible only in user code.
- [AC-SS2] When stepping through user code and execution lands in a blackboxed or non-target script, the system automatically issues `stepOut` or `resume` to return to user code without manual intervention.
- [AC-SS3] Stepping sessions terminate after MAX_STEPS or when target script completes, preventing infinite stepping loops and ensuring clean exit with session cleanup.

## Out of Scope

- Full protocol coverage for CDP (only minimal command support required for prototype).
- Implementations for Firefox, WebKit, or React Native at this stage (design must allow them later).
- Browser automation features beyond sending raw commands (no high-level DOM automation yet).
- GUI or CLI tooling that drives the service (focus on programmatic API).

## Success Metrics

- [SM-U1] 100% of example usage imports the protocol-agnostic `Debug` service (validates AC-U1).
- [SM-E1] Demo program successfully prints Chrome version info via `Debug.sendCommand` on the target machine (validates AC-E1).
- [SM-S1] Integration test runs at least two sequential CDP commands over one session without reconnection (validates AC-S1).
- [SM-M1] Design documentation includes transport notes for actor-based protocols and is exercised by at least one unit-level guard or schema that references watcher/actor metadata (validates AC-M1).
- [SM-O1] Additional protocol implementation can be added by providing a new Layer without touching existing consumer tests (validates AC-O1).

## Implementation Roadmap

### Phase 1: Core CDP (DONE)
- ✅ Connection and session management
- ✅ Command execution with typed responses
- ✅ Event subscription with streams
- ✅ Basic tests and demos

### Phase 2: Memory Debugging (NOT STARTED)
- ❌ HeapProfiler domain wrapper
- ❌ Snapshot streaming (Handle `HeapProfiler.addHeapSnapshotChunk` events)
- ❌ Allocation tracking (start/stop with timeline)
- ❌ Sampling profiler (configurable intervals)
- ❌ GC control (`collectGarbage`, `getHeapUsage`)
- ❌ Schemas: HeapUsage, SamplingHeapProfile, AllocationTimeline

### Phase 3: Safe Stepping (NOT STARTED)
- ❌ Blackboxing support (`setBlackboxPatterns`, `setBlackboxedRanges`)
- ❌ Safe stepping helpers (`safeStepInto`, `stepThroughWithLimits`)
- ❌ Predefined pattern sets (node, browser, workers, frameworks)
- ❌ Auto-blackbox third-party (during scriptParsed events)
- ❌ Step limits and timeout guards

### Phase 4: Documentation & Publication (NOT STARTED)
- ❌ Comprehensive README with usage examples
- ❌ API documentation (docgen output)
- ❌ Examples directory
- ❌ CHANGELOG.md
- ❌ Set version to 0.1.0+

### Phase 5: Additional Protocols (FUTURE)
- Actor-based adapters for Firefox, Servo, and Ladybird
- WebKit Inspector implementation
- React Native Hermes integration

### Phase 6: Advanced Features (FUTURE)
- Snapshot comparison utilities (automated leak detection)
- Higher-level abstractions (`detectMemoryLeaks`, `safeStepInto`)
- Connection pooling and multiplexing
- Cloudflare Workers production observability integration

## Future Considerations

- Extend schema-based validation for specific protocol domains (Debugger, Runtime, Page, HeapProfiler, etc.).
- Provide higher-level abstractions (e.g., `evaluate`, breakpoint management, `detectMemoryLeaks`, `safeStepInto`) built atop raw command interface.
- Explore persistent connection pooling and multiplexing for multiple runtimes.
- Investigate bridging into React Native Hermes targets once protocol research completes.
- Integrate with tools like @memlab/api for advanced leak detection workflows.
- Add heap snapshot parsing and querying capabilities (retainer paths, dominator trees, object filtering).

## Testing Requirements

- Use `@effect/vitest` with `it.effect` to cover service behaviors (`.patterns/testing-patterns.md`).
- Provide a CDP integration test that spins up or attaches to a local Chrome instance with remote debugging enabled, using TestClock only if timing-sensitive operations are introduced.
- Ensure tests fail loudly if Chrome CDP is unavailable (per Hard-Fail policy) and document the steps for enabling Chrome's remote debugging port.
- Validate minimal request/response schema using Effect Schema or runtime guards to catch protocol mismatches, including actor id sequencing rules for future RDP implementations.
- Memory profiling tests must validate heap snapshot streaming (complete snapshots can be captured and saved), heap usage accuracy (compare with in-process APIs where available), and GC triggering (heap size reduces after forced collection).
- Test memory profiling across multiple runtimes (Node.js, Chrome, Deno, Cloudflare Workers local dev) to ensure cross-platform compatibility.
- Snapshot streaming tests must handle large heaps (>100MB test data) without buffering entire snapshot in memory.
- Safe stepping tests must verify that blackboxing patterns prevent stepInto from descending into node_modules and runtime internals, and that step limits enforce clean session termination.
- Test on multiple Node.js versions (v20.x, v22.x, v24.x) as V8 inspector behavior varies across versions (known stepInto crash in v24.8.0 with ESM async code).

## Current Test Coverage

**Unit Tests**: ✅ Basic CDP connection, command execution, event subscription  
**Integration Tests**: ✅ Chrome inspector, Node.js inspector, event flow  
**Demo Tests**: ✅ `test:debug-log-steps` - step-through debugger (verified working)  
**Missing Tests**: ❌ Memory profiling, blackboxing, safe stepping, cross-runtime

**Test Command**: `pnpm test` (passes for existing features)  
**Demo Command**: `cd packages-native/debug && pnpm test:debug-log-steps` (working)
