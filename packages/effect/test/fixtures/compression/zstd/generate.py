# Generates the Zstandard interoperability fixtures with the reference
# implementation (libzstd 1.5.7, bundled with python-zstandard 0.25.0):
#
#   cd packages/effect/test/fixtures/compression/zstd
#   uv run -q --with zstandard==0.25.0 python -I generate.py
#
# The inputs come from small deterministic generators that the conformance
# test (test/encoding/CompressionConformance/ZstdTest.ts) reimplements, so
# only the compressed bytes are committed.
import os

import zstandard

WORDS = [
    b"the", b"quick", b"brown", b"fox", b"jumps", b"over", b"lazy", b"dog",
    b"zstd", b"frame", b"block", b"literal", b"sequence", b"offset", b"match", b"window",
]


def lcg(seed):
    state = seed
    while True:
        state = (state * 1103515245 + 12345) & 0x7FFFFFFF
        yield state >> 16


def text(size, seed):
    # Words from a 16-word vocabulary, a newline after every 12th word
    out = bytearray()
    rand = lcg(seed)
    count = 0
    while len(out) < size:
        out += WORDS[next(rand) & 15]
        count += 1
        out += b"\n" if count % 12 == 0 else b" "
    return bytes(out[:size])


def random_bytes(size, seed):
    rand = lcg(seed)
    return bytes(next(rand) & 0xFF for _ in range(size))


def letters(size, alphabet, seed):
    rand = lcg(seed)
    return bytes(alphabet[next(rand) % len(alphabet)] for _ in range(size))


def edited(chunk, copies, every, seed):
    # Copies of one chunk with a random letter written into every `every`
    # bytes: long matches, repeat offsets and similar literals in each block
    out = bytearray()
    rand = lcg(seed)
    for _ in range(copies):
        copy = bytearray(chunk)
        for start in range(0, len(copy), every):
            letter = 0x61 + next(rand) % 26
            copy[(start + next(rand)) % len(copy)] = letter
        out += copy
    return bytes(out)


def compress(data, level, checksum=True, content_size=True):
    return zstandard.ZstdCompressor(
        level=level, write_checksum=checksum, write_content_size=content_size
    ).compress(data)


def streamed(data, level):
    # Streaming compression without a content size, flushed in two parts
    compressor = zstandard.ZstdCompressor(level=level, write_content_size=False, write_checksum=False)
    obj = compressor.compressobj()
    half = len(data) // 2
    return obj.compress(data[:half]) + obj.flush(zstandard.COMPRESSOBJ_FLUSH_BLOCK) + obj.compress(data[half:]) + obj.flush()


def long_window(data):
    # Streamed, so the encoder keeps the 2^27 window and writes a
    # Window_Descriptor instead of a content size
    params = zstandard.ZstdCompressionParameters.from_level(
        19, window_log=27, enable_ldm=True, write_checksum=True, write_content_size=False
    )
    obj = zstandard.ZstdCompressor(compression_params=params).compressobj()
    return obj.compress(data) + obj.flush()


TEXT = text(20000, 1)
# What each fixture exercises was checked by instrumenting the decoder
FIXTURES = {
    # FSE-compressed Huffman weights and sequence tables, 2-byte content size
    "text-level1.zst": compress(TEXT, 1),
    "text-level3.zst": compress(TEXT, 3),
    # Also repeat offsets 2 and 3, with and without literals
    "text-level19.zst": compress(TEXT, 19),
    "text-level22.zst": compress(TEXT, 22),
    # No content size or checksum, a Window_Descriptor, several blocks
    "text-streamed.zst": streamed(TEXT, 3),
    # Raw blocks
    "random.zst": compress(random_bytes(3000, 2), 3),
    # RLE blocks, predefined sequence tables, 4-byte content size, > 128 KiB
    "runs.zst": compress(b"a" * 300000 + b"b" * 1000, 3),
    # RLE_Mode sequence tables, raw literals, offsets above 64 KiB
    "edits-level3.zst": compress(edited(text(4096, 3), 34, 512, 9), 3),
    # Treeless literals, Repeat_Mode tables, every repeat offset case
    "edits-level19.zst": compress(edited(text(4096, 3), 34, 128, 9), 19),
    # Two frames whose Huffman literals need 4 and 5-byte section headers
    "letters.zst": compress(letters(2000, bytes(range(0x40, 0x60)), 6), 3)
    + compress(letters(17000, bytes(range(0x40, 0x60)), 7), 3),
    # Long-distance matching in a 2^27 window: the second copy of the random
    # bytes is a match about 1 MiB back
    "long-window.zst": long_window(random_bytes(4096, 4) + b"\0" * (1 << 20) + random_bytes(4096, 4)),
}

# Small fixtures inlined in the test as hex
INLINE = {
    "empty": compress(b"", 3),
    "hello": compress(b"hello hello hello hello", 3),
    "hello (no checksum)": compress(b"hello hello hello hello", 3, checksum=False),
    # Content_Checksum of the hand-crafted frames: the last 4 bytes of a frame
    # with a checksum
    "checksum of 'hello xxx'": compress(b"hello xxx", 3)[-4:],
    # A frame, a skippable frame and a frame without content size
    "concatenated": compress(b"hello ", 3, checksum=False)
    + (0x184D2A5E).to_bytes(4, "little")
    + (3).to_bytes(4, "little")
    + b"xyz"
    + compress(b"world", 3, content_size=False),
}

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for name, data in FIXTURES.items():
        with open(os.path.join(here, name), "wb") as f:
            f.write(data)
        print(name, len(data))
    for name, data in INLINE.items():
        print(name, data.hex())
