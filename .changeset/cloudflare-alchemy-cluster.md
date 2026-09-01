---
"effect": patch
---

Add Alchemy v2 deployment for the Cloudflare cluster to
`@effect/platform-cloudflare`.

`AlchemyCloudflareCluster.make` runs inside an Effect-native
`Cloudflare.Worker` init program: it registers the four cluster Durable
Object classes on the hosting Worker (Alchemy owns bindings, class exports,
and SQLite migrations), builds the cluster layer together with the user's
handler layer into the isolate-lifetime scope, and returns a handle with
`provide`, `wake`, the four native namespace bindings, and the built
`context`. The user never declares or re-exports Durable Object classes, and
Cron Triggers stay user-declared via
`Cloudflare.Workers.cron(expr, cluster.wake(name))`.

The new `CloudflareDurableObjectPrograms` module exposes the class-independent
programs behind the bundled Durable Object classes (entity, workflow, durable
queue, singleton) so a framework that creates its own native classes can run
the same behavior. The Wrangler path is unchanged and never imports `alchemy`;
the `alchemy` peer dependency (`>=2.0.0-beta <3`) is optional.
