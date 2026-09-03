---
"effect": patch
---

Emit CR-terminated lines immediately in `Stream.splitLines` and `Channel.splitLines`, without waiting for another upstream chunk. This preserves completed lines when the source subsequently fails and avoids an unnecessary pull when consumers stop after a complete line. CRLF pairs split across chunks still produce a single line terminator.
