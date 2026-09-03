---
"effect": patch
---

Fix `Layer.mock` discarding supplied inherited methods. Ordinary class methods can now read and update the mock's public instance state while own properties retain their existing shallow-snapshot behavior. Methods are not rebound to the original instance. This does not add support for private fields or native internal slots.
