---
"effect": patch
---

`Ndjson` byte decoders split lines on raw bytes and decode each line as strict UTF-8. They accept `\n`, `\r\n` and a bare `\r`, skip a leading BOM, and take a `maxLineBytes` option. `NdjsonError` now has a `reason` (`"InvalidJson"`, `"InvalidUtf8"` or `"LineTooLarge"`) and an `unterminated` flag. Byte and string decoders emit the lines before the first bad line, then fail.
