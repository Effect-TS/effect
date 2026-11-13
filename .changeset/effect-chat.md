---
"effect": patch
---

Add unstable `effect/chat` APIs for chat bots, grapheme-safe long and streamed Markdown with refused-file fallback that preserves overflow text, and in-memory adapter conformance testing. `ChatMessage.repliesToSelf` reads the new `replyTo.isSelf`, which `ChatTest.checkMessage` requires of an adapter wherever `replyTo.authorId` is set, and `ChatMarkdownError.remainingFence` names the code fence `remaining` was cut in.
