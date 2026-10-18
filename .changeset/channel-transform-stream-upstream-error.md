---
"effect": patch
---

Fix `Channel.fromTransformStream` so an upstream failure is reported when a read is pending, instead of the error raised by aborting the transform stream.
