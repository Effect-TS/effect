---
"@effect/platform-cloudflare": patch
---

Give Cloudflare cluster entity handlers `CloudflareCluster.DurableObjectSqlClient`, an `SqlClient` on their own Durable Object's SQLite storage that leaves any app-wide `SqlClient` in place. Register the handlers with `Entity.toLayer` and read the client with `CloudflareCluster.DurableObjectSqlClient.orDie`, which dies when no client is provided. `withTransaction` commits several rows atomically, mailbox writes wait for an open user transaction, and tables starting with `cluster_` are reserved for the mailbox.
