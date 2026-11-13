---
"@effect/chat-discord": patch
---

Add `@effect/chat-discord`, an unstable Discord adapter for `effect/chat` built on dfx, with gateway dispatch, threads, reactions, post-then-edit streaming, and buttons, selects and modals through `DiscordChat.interaction` and `layerGatewayInteractions`. `layerDispatchHook` delivers gateway events before dfx stores their sequence, for a host that resumes from a `ShardStateStore` of its own, and `withPostOptions({ failIfNotExists: false })` lets a reply to a deleted message go out without its reference.
