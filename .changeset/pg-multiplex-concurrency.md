---
"@effect/sql-pg": patch
---

Add `multiplexConcurrency`, which sets how many statements may share one
connection when `multiplex` is on.

They are pipelined into one write, so a higher number means fewer round trips,
and it also means a slow statement holds up more of the statements queued
behind it. The default suits a server that is a cheap round trip away; one
reached across a virtual or real network is worth a deeper pipeline, where
settings of 16 to 32 have measured considerably faster.
