---
"effect": minor
---

Stop remote EventLog replication when decoding or handling an entry fails, leaving the failed batch and its cursor uncommitted for redelivery after a fix or schema upgrade. Provide `OnRemoteReplayError` to the EventLog layer to report the failure to your app; restart replication after resolving it, and use transactional or idempotent handlers because arbitrary side effects cannot be rolled back. `makeReplayFromRemote` now fails with `RemoteReplayError` instead of logging and skipping failures.
