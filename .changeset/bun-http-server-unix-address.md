---
"@effect/platform-bun": patch
---

Report a `UnixAddress` with the configured socket path from `BunHttpServer.make({ unix: path })` instead of a `TcpAddress` with undefined hostname and port. Unix server addresses now format correctly through `HttpServer.formatAddress`; TCP address reporting is unchanged.
