---
"effect": patch
---

Fix OTLP integer attributes outside the signed 64-bit range causing collectors to reject the export. They are now sent as `doubleValue` for numbers and `stringValue` for bigints, and large in-range numbers keep their exact value in JSON.
