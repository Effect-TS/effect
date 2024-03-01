---
"effect": minor
---

`Cache<Key, Error, Value>` has been changed to `Cache<Key, Value, Error = never>`.
`ScopedCache<Key, Error, Value>` has been changed to `ScopedCache<Key, Value, Error = never>`.
`Lookup<Key, Environment, Error, Value>` has been changed to `Lookup<Key, Value, Error = never, Environment = never>`
