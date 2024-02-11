---
"@effect/rpc-http": patch
"@effect/rpc": patch
---

add non-streaming handlers and resolvers to rpc

Instead of streaming back responses, responses are sent back as a single json
array.

You can use the HttpResolver.toHttpAppEffect and HttpResolver.makeEffect apis to
opt into the non-streaming transport.

NOTE: You cannot mix both the streaming and non-streaming transports.
