---
"effect": patch
"@effect/platform-node": patch
---

Add `effect/docker`, a client for Docker Engine API 1.52 (Docker Engine 29.0 and later) as Effect services: containers, exec, images, networks, volumes, Swarm and plugins. It speaks only API 1.52, and fails with `UnsupportedApiVersion` against an Engine that doesn't serve it. `NodeDocker` in `@effect/platform-node` provides them on Node.js, configured as the Docker CLI is.
