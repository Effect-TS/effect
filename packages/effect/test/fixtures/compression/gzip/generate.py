# Generates the inline hex fixtures of
# packages/effect/test/encoding/CompressionConformance/GzipTest.ts with the
# reference zlib of CPython. Run from this directory:
#
#   uv run -q --python 3.13 python -I generate.py
#
# Recorded with CPython 3.13.15 and zlib 1.3.2 (printed below). Other zlib
# versions may emit different bytes for the same data; any output of a
# conforming encoder decodes to the same data.
import gzip
import io
import struct
import sys
import zlib


def deflate(data, level=9, strategy=zlib.Z_DEFAULT_STRATEGY):
    c = zlib.compressobj(level, zlib.DEFLATED, -15, 9, strategy)
    return c.compress(data) + c.flush()


def member(data, body, flags=0, mtime=0, xfl=0, os=255, extra=None, name=None, comment=None):
    header = bytes([31, 139, 8, flags]) + struct.pack("<IBB", mtime, xfl, os)
    if extra is not None:
        header += struct.pack("<H", len(extra)) + extra
    if name is not None:
        header += name + b"\0"
    if comment is not None:
        header += comment + b"\0"
    if flags & 2:
        header += struct.pack("<H", zlib.crc32(header) & 0xFFFF)
    return header + body + struct.pack("<II", zlib.crc32(data), len(data) & 0xFFFFFFFF)


def block_type(body):
    return (body[0] >> 1) & 3


fixtures = {}

data = b"stored block"
body = deflate(data, level=0)
assert block_type(body) == 0
fixtures["stored"] = (data, member(data, body))

data = b"fixed Huffman codes, fixed Huffman codes"
body = deflate(data, strategy=zlib.Z_FIXED)
assert block_type(body) == 1
fixtures["fixed"] = (data, member(data, body))

data = b"Dynamic Huffman codes adapt to the data. " * 4 + b"The quick brown fox jumps over the lazy dog."
body = deflate(data)
assert block_type(body) == 2
fixtures["dynamic"] = (data, member(data, body))

# A full flush ends the first block and adds an empty stored block, so only the
# last of the three blocks has BFINAL set
c = zlib.compressobj(9, zlib.DEFLATED, -15)
body = c.compress(b"first block, ") + c.flush(zlib.Z_FULL_FLUSH) + c.compress(b"last block") + c.flush()
data = b"first block, last block"
fixtures["multiBlock"] = (data, member(data, body))

# Matches of length 258 at distance 1 overlap the bytes they copy
data = b"a" * 1000
fixtures["run"] = (data, member(data, deflate(data)))

fixtures["empty"] = (b"", gzip.compress(b"", mtime=0))

out = io.BytesIO()
with gzip.GzipFile(filename="hello.txt", mode="wb", fileobj=out, mtime=0) as f:
    f.write(b"hello, name")
fixtures["name"] = (b"hello, name", out.getvalue())

# FTEXT | FHCRC | FEXTRA | FNAME | FCOMMENT, with MTIME, XFL and OS set
data = b"hello, header"
fixtures["allFlags"] = (
    data,
    member(
        data,
        deflate(data),
        flags=0x1F,
        mtime=1700000000,
        xfl=2,
        os=3,
        extra=b"AP" + struct.pack("<H", 4) + b"\x01\x02\x03\x04",
        name=b"data.txt",
        comment=b"a comment",
    ),
)

data = b"hello, header CRC"
fixtures["headerCrc"] = (data, member(data, deflate(data), flags=0x02))

fixtures["members"] = (
    b"one two",
    gzip.compress(b"one ", mtime=0) + gzip.compress(b"", mtime=0) + gzip.compress(b"two", mtime=0),
)

print(f"// CPython {sys.version.split()[0]}, zlib {zlib.ZLIB_RUNTIME_VERSION}")
for key, (data, compressed) in fixtures.items():
    assert gzip.decompress(compressed) == data
    print(f'{key}: "{compressed.hex()}",')
