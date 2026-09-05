---
"effect": patch
---

`Schema.Struct` now accepts inherited declared fields during decoding, encoding, and construction. Declared fields use JavaScript property presence (`key in input`), except for the special `__proto__` field, while dynamic `Schema.Record` index signatures continue to select own properties. Parsed outputs copy accepted inherited fields to own properties. Consumers that require own-only input fields should validate property ownership before parsing.
