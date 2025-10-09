# Firefox DevTools Research

## Summary
- Firefox DevTools use Mozilla's Remote Debugging Protocol (RDP), an actor/message system distinct from Chrome's CDP but similarly JSON-based.
- Communication rides on a length-prefixed stream transport that ferries JSON (and optional bulk) packets over reliable sockets.
- Modern DevTools sessions revolve around the Watcher actor, which multiplexes targets (frames, workers, processes) and resource streams to the toolbox frontend.
- Firefox also exposes additional remote stacks (Marionette, WebDriver BiDi, Remote Agent) for automation, but the built-in devtools UI continues to speak RDP.

## Architecture
- RDP is organised around server-side *actors*; every packet contains either a `to` field (client ➝ server) or `from` field (server ➝ client), and actors are responsible for replying to requests to keep conversations in sync ([protocol actors](https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html#actors)).
- The backend exposes a root actor that discovers descriptor actors (tabs, workers, processes) before delegating to dedicated target actors such as `WindowGlobalTargetActor` and `WorkerTargetActor` ([watcher overview](https://firefox-source-docs.mozilla.org/devtools/backend/watcher-architecture.html#connecting-to-backend)).
- Watcher actors coordinate target lifecycles and resource delivery: clients call `watchTarget()`/`watchResources()` and then consume `target-available-form` and `resources-available-array` events as contexts appear ([watcher actor](https://firefox-source-docs.mozilla.org/devtools/backend/watcher-architecture.html#the-watcher-actor)).
- Actor implementations live in `devtools/server/actors/*` (e.g., inspector, console, thread) while the frontend toolbox runs in the Firefox chrome process (`devtools/client/*`), connected via the protocol.

## Protocol Mechanics
- Packets are length-prefixed JSON strings: the transport writes `len:payload`, where `len` is the UTF-8 byte length of the JSON body ([JSON packets](https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html#json-packets)).
- Bulk data packets extend the same framing with a `bulk actor type length:data` header for streaming large binary blobs like profiles or network payloads ([stream transport](https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html#stream-transport)).
- Because actors process one outstanding request at a time, failing to respond produces `unrecognizedPacketType` errors and desynchronises the session; this contract is mirrored in third-party implementations such as Servo and Ladybird.

## Tooling & Ecosystem
- Firefox ships multiple remote interfaces: Marionette (WebDriver Classical), WebDriver BiDi, and the Remote Agent that surfaces a CDP-compatible endpoint for tooling like Puppeteer ([remote protocols](https://firefox-source-docs.mozilla.org/remote/index.html)).
- The native Firefox DevTools UI, however, relies on RDP-specific traits (custom highlighters, watcher infrastructure, actor registries) that are not yet covered by CDP; alternative runtimes must mimic these actors to integrate seamlessly.

## Implications
- Building compatible tooling requires modelling the same actor graph (root ➝ descriptor ➝ target ➝ resource actors) and adhering to the strict request/response sequencing outlined in the RDP docs.
- When integrating third-party runtimes, start by implementing the root, device, preference, tab/process descriptors, and Watcher actor so Firefox DevTools can enumerate and inspect targets without falling back to legacy flows.

## References
- [Remote Debugging Protocol – actor model & packet framing](https://firefox-source-docs.mozilla.org/devtools/backend/protocol.html)
- [Watcher architecture – target/resource coordination](https://firefox-source-docs.mozilla.org/devtools/backend/watcher-architecture.html)
- [Firefox remote protocol families](https://firefox-source-docs.mozilla.org/remote/index.html)
