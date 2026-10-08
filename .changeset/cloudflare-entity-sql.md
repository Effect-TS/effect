---
"@effect/platform-cloudflare": patch
---

Give Cloudflare cluster entity handlers `CloudflareCluster.DurableObjectSqlClient`, an `SqlClient` on their own Durable Object's SQLite storage that leaves any app-wide `SqlClient` in place. Register handlers that use it with `CloudflareCluster.toLayer`, which removes the service from the layer requirements and requires `CloudflareCluster.CloudflareSharding`, provided only by `CloudflareCluster.layer`. `withTransaction` commits several rows atomically, mailbox writes wait for an open user transaction, and tables starting with `cluster_` are reserved for the mailbox.
