---
"effect": patch
---

Stop a runner that lost a shard lock from storing replies for that shard. Reply writes and message claims now check ownership against lock storage first. A rejected write abandons the request, so its new owner decides the stored result.

`RunnerStorage` gains an `owned` method, so custom `RunnerStorage` implementations must add it. `Message.IncomingRequest.respond` and `Message.IncomingRequestLocal.respond` can now fail with `EntityNotAssignedToRunner`.

On MySQL and Vitess, `SqlRunnerStorage` now keeps its advisory lock session pinned after releasing all shard locks, so the lock holder id it compares against stays current behind vtgate.
