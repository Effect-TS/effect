---
"effect": patch
---

Fix cluster entity recovery when a replayed request defects while replacement handlers are starting. Unfinished requests are now replayed once the replacement handlers are ready, requests still waiting for their first dispatch are no longer executed twice, and an entity that is shutting down no longer replays application requests. Messages waiting for replacement handlers are released when the entity closes, and a superseded rebuild can no longer publish stale handlers or a stale `SqlRunnerStorage` lock connection.
