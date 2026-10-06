---
"effect": patch
---

Encode RPC request defects in a distinct `RequestDefect` envelope containing the request id and a defect encoded and decoded through the shared `codecFor(Schema.Defect())` contract. This preserves the original defect after an unknown request tag or payload decoding failure and keeps the client usable, including when SchemaBinary payload fingerprint validation is enabled.

This is a breaking wire-protocol change. SchemaBinary always validates the envelope fingerprint, so old and new peers are incompatible even for ordinary requests, regardless of `fingerprintPayloads`. Older JSON/NDJSON clients do not recognize `RequestDefect`, and older JSON-RPC clients interpret its error as a typed failure rather than a defect. Clients and servers must upgrade together; no protocol version negotiation or fingerprint bypass is provided.

Release approval and the final version bump require a maintainer decision on coordinated upgrades versus protocol versioning/negotiation before publishing.
