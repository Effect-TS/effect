---
"effect": minor
---

Encode integral `SchemaBinary` numbers as varints.

A `Number` now takes a sign-magnitude varint when its value is integral and IEEE 754 binary64 otherwise, with the enclosing length telling the two apart. When the schema proves the value is an integer (`Schema.Int`, `Schema.Natural`, any `isInt` check) the layout drops the f64 form and writes a bare varint. This shrinks the benchmark payloads by 19% to 43% and is a wire change: a payload written by an earlier build of this unreleased module does not read back.
