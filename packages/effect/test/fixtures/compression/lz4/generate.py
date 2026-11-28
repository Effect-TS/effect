# Generates the LZ4 interoperability fixtures and hand-crafted frame headers
# used by packages/effect/test/encoding/CompressionConformance/Lz4Test.ts.
#
# Reference implementation: python-lz4 4.4.4 (bundles liblz4 1.9.4; the block
# and frame formats are unchanged in 1.10.0). xxhash 3.5.0 computes the header
# and block checksums of the hand-crafted frames. Run from this directory:
#
#   uv run -q --with lz4==4.4.4 --with xxhash==3.5.0 python -I generate.py
#
# The uncompressed data is rebuilt by the test with the same generators (in
# CompressionConformance.ts), so only the compressed bytes are committed.
import pathlib
import struct

import lz4.block
import lz4.frame
import xxhash

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


# Repetitive text, random bytes, a run (overlapping matches) and long matches
# far back
def mixed():
    t = text(200)
    r = random(2048, 1)
    return t + r + b"a" * 5000 + t + r


# Larger than one 64 KB block, so linked blocks match into earlier blocks
big = mixed() * 3

(HERE / "block.lz4").write_bytes(lz4.block.compress(mixed(), store_size=False))
(HERE / "frame-linked.lz4").write_bytes(
    lz4.frame.compress(
        big,
        block_size=lz4.frame.BLOCKSIZE_MAX64KB,
        block_linked=True,
        content_checksum=True,
        store_size=True,
    )
)
(HERE / "frame-independent.lz4").write_bytes(
    lz4.frame.compress(
        big,
        block_size=lz4.frame.BLOCKSIZE_MAX64KB,
        block_linked=False,
        block_checksum=True,
        store_size=False,
    )
)
# Incompressible, so stored as an uncompressed block
print("uncompressed", lz4.frame.compress(random(64, 2), store_size=False, content_checksum=True).hex())
print("emptyFrame", lz4.frame.compress(b"", store_size=False).hex())


def header(flg, bd, extra=b""):
    descriptor = bytes([flg, bd]) + extra
    hc = (xxhash.xxh32_intdigest(descriptor) >> 8) & 0xFF
    return (struct.pack("<I", 0x184D2204) + descriptor + bytes([hc])).hex()


for name, flg, bd, extra in [
    ("independent", 0x60, 0x40, b""),
    ("linked", 0x40, 0x40, b""),
    ("blockChecksum", 0x70, 0x40, b""),
    ("contentChecksum", 0x64, 0x40, b""),
    ("contentSize5", 0x68, 0x40, struct.pack("<Q", 5)),
    ("contentSize2e40", 0x68, 0x40, struct.pack("<Q", 2**40)),
    ("dictId", 0x61, 0x40, struct.pack("<I", 0x12345678)),
    ("blockMax256KB", 0x60, 0x50, b""),
    ("blockMax1MB", 0x60, 0x60, b""),
    ("blockMax4MB", 0x60, 0x70, b""),
    ("version0", 0x20, 0x40, b""),
    ("version2", 0xA0, 0x40, b""),
    ("flgReserved", 0x62, 0x40, b""),
    ("bdReservedHigh", 0x60, 0xC0, b""),
    ("bdReservedLow", 0x60, 0x41, b""),
    ("blockMaxId3", 0x60, 0x30, b""),
]:
    print(name, header(flg, bd, extra))

for name, data in [("hello", b"hello"), ("empty", b"")]:
    print("xxh32", name, struct.pack("<I", xxhash.xxh32_intdigest(data)).hex())
