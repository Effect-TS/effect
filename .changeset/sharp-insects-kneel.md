---
"effect": patch
---

Optimized `Base64.decode` by not capturing the padding characters in the underlying array buffer.

Previously, the implementation first captured the padding characters in the underlying array buffer and
then returned a new subarray view of the buffer with the padding characters removed.

By not capturing the padding characters, we avoid the creation of another typed array instance for the
subarray view.
