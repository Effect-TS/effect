---
"effect": patch
---

MCP tool results no longer send `null` or arrays as `structuredContent`.

The toolkit handler decided whether a result was structured with
`typeof result.encodedResult === "object"`, which is also true for `null` and
for arrays. A tool whose success schema encoded to either shape put a
non-object into `structuredContent`, where MCP allows only a JSON object. Older
clients that validate `CallToolResult` rejected the whole reply; on current
protocol revisions the server itself failed the call with
`non-object structured tool content is not supported`. Such results now travel
as text content only, matching the fact that no `outputSchema` is advertised
for them.
