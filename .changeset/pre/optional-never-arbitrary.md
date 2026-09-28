---
"effect": patch
---

Treat `Never` as an uninhabited branch during `Arbitrary.schema` derivation. Schemas with another finite generation path, including optional properties, unions, and empty collections, no longer fail derivation.
