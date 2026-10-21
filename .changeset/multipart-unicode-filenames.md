---
"@effect/platform": patch
"@effect/platform-browser": patch
"@effect/platform-bun": patch
"@effect/platform-node-shared": patch
---

Fix multipart parsing of raw UTF-8 filenames containing characters above U+00FF, such as the narrow no-break space in macOS screenshot names, by updating `multipasta` to 0.2.9. Previously these parts were parsed as a field with an empty name.
