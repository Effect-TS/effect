# FlatBuffers fixtures

`gold.json` is read by `test/encoding/FlatBuffers.test.ts`. Each case is a
sequence of builder calls and the bytes the official FlatBuffers Python
builder (`flatbuffers` 25.12.19 from PyPI) produces for them: hand-written
cases for each feature, then 300 seeded random cases.

Regenerate with:

```sh
pip install flatbuffers==25.12.19
python test/fixtures/flatbuffers/generate.py
```
