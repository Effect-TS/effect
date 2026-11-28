# Generates the Snappy interoperability fixtures used by
# packages/effect/test/encoding/CompressionConformance/SnappyTest.ts.
#
# Reference implementation: cramjam 2.11.0 (Rust snap crate, raw format).
# Run from this directory:
#
#   uv run -q --with cramjam==2.11.0 python -I generate.py
#
# The uncompressed data is rebuilt by the test with the same generators (in
# CompressionConformance.ts), so only the compressed bytes are committed.
import pathlib

import cramjam

HERE = pathlib.Path(__file__).parent


# Must match `text` in CompressionConformance.ts
def text(lines):
    return b"".join(f"line {i:04d}: the quick brown fox jumps over the lazy dog\n".encode() for i in range(lines))


# xorshift32, must match `xorshift` in CompressionConformance.ts
def random(n, seed):
    x = seed
    out = bytearray(n)
    for i in range(n):
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= x >> 17
        x ^= (x << 5) & 0xFFFFFFFF
        out[i] = x & 0xFF
    return bytes(out)


# Repetitive text, random bytes, a run (overlapping copies) and long matches
# far back
def mixed():
    t = text(200)
    r = random(2048, 1)
    return t + r + b"a" * 5000 + t + r


def snappy(data):
    return bytes(cramjam.snappy.compress_raw(data))


(HERE / "mixed.snappy").write_bytes(snappy(mixed()))
print("empty", snappy(b"").hex())
print("random", snappy(random(100, 2)).hex())
