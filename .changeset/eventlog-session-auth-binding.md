---
"effect": patch
---

Verify the session authentication signature before an EventLog server binds a signing key to an identity, and reject a verified key that differs from the identity's existing binding. A request with an invalid signature no longer creates a binding.

`EventLogServerUnencrypted.EventLogServerAuthorization.authorizeIdentity` and the `authorizeIdentity` option of `EventLogServer.layerRpcHandlers` now also receive the presented signing public key. Use the new `EventLogSessionAuth.deriveSigningPublicKey` to record an identity's signing key at provisioning time and reject any other key.
