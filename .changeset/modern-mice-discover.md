---
"effect": patch
---

Add server support for MCP protocol version 2026-07-28 through `McpProtocol.v2026_07_28`, including stateless per-request negotiation, subscriptions, and keyed multi-round-trip input. Tool handlers can access request facts through `McpRequestContext`, and tool output schemas and structured results support every JSON value while older protocol adapters preserve their object-shaped wire format.

MCP servers also coalesce registration list-change notifications deterministically so delayed setup events do not leak into later subscriptions.
