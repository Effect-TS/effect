# Servo DevTools Research

## Summary
- Servo re-implements Firefox’s Remote Debugging Protocol (RDP) so Firefox DevTools can attach to Servo runtimes without bespoke tooling.
- The devtools server is actor-based, mirroring Gecko’s organisation of root, device, process, thread, inspector, and console actors.
- Servo serialises packets with the same length-prefixed JSON framing as Firefox, and proxies DOM/style operations from the script thread to DevTools actors.

## Architecture
- The `devtools` crate describes itself as “an actor-based remote devtools server … based on reverse-engineering of Firefox chrome devtool logs,” and wires up Firefox-equivalent actors (`device`, `preference`, `process`, `root`, `watcher`, etc.) inside an `ActorRegistry` (`components/devtools/lib.rs:4-73`).
- `start_server` listens on a TCP port, notifies the host embedder, and spins worker threads to accept connections while tracking actor state across browsing contexts and workers (`components/devtools/lib.rs:88-181`).
- Each actor module (e.g., `actors/inspector`, `actors/thread`, `actors/stylesheets`) mirrors Gecko actor responsibilities, enabling the Firefox toolbox to issue familiar RDP method calls.
- Script-thread routines (like querying DOM nodes or evaluating JS) forward requests via `devtools_traits` and publish structured replies (NodeInfo, layout data, etc.) to actors (`components/script/devtools.rs:20-183`).

## Protocol Mechanics
- Servo’s `JsonPacketStream` writes packets as `len:payload` and parses incoming messages identically to the RDP stream transport, citing the upstream documentation (`components/devtools/protocol.rs:4-72`).
- Reply semantics are enforced: actors must answer each request exactly once, otherwise `ActorError::UnrecognizedPacketType` is raised, keeping the client/server state machine aligned (`components/devtools/protocol.rs:74-167`).
- Higher-level helpers like `ClientRequest` protect the reply contract while still allowing intermediate notifications, matching Firefox’s expectation that a request can emit events before its final response.

## Surface Area Exposed to DevTools
- Inspector endpoints traverse Servo’s DOM (`handle_get_root_node`, `handle_get_children`) and normalise data (e.g., whitespace filtering, inline detection) so the Firefox inspector can render Servo’s tree (`components/script/devtools.rs:99-181`).
- Console and evaluation operations coerce SpiderMonkey values into DevTools-friendly envelopes (booleans, numbers, strings, actor references) to satisfy the web console panel (`components/script/devtools.rs:46-96`).
- The devtools delegate pattern lets embedders (Servo’s shell, winit, etc.) enumerate tabs and resources, filling the same descriptors Firefox expects during the Watcher handshake.

## Implications
- Maintaining Firefox DevTools compatibility requires Servo to track RDP evolution (e.g., watcher upgrades, new actor traits). The codebase directly references upstream documentation in comments to stay aligned.
- Future investments (e.g., network panel parity or timeline data) should extend existing actor modules to emit the resource events (`resources-available-array`) Firefox already subscribes to.

## References
- `components/devtools/lib.rs:4-181`
- `components/devtools/protocol.rs:4-167`
- `components/script/devtools.rs:20-181`
