---
"effect": patch
---

Add `effect/crypto/Password` for storing passwords as PHC strings. The `Password` service hashes with Argon2id or PBKDF2 from `Kdf`, verifies against the algorithm and salt recorded in the stored hash, and reports when a stored hash needs rehashing under the configured algorithm. `Password.decode` and `Password.encode` convert between PHC strings and `PasswordHash` values.
