# Parquet fixtures

`generate.py` writes these files with pyarrow 26.0.1 (parquet-cpp, `created_by`
`parquet-cpp-arrow version 26.0.1`) and `gold.json`, which records for every
file its row groups (row count, codec and encodings of each column chunk) and
its leaf columns (path, physical type, levels, converted and logical type, and
the stored value of every row). The gold values are computed from the source
data, not read back from the files; each file is also read back with pyarrow
and compared to its source table. Small pages (64 or 128 bytes) give most
column chunks several pages.

| File                   | Covers                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plain.parquet`        | Data page v1, PLAIN, 2 row groups: bool, required int32, int64, float, double, string, binary, fixed_size_binary(4), int8, uint16, date32, timestamp[ms, UTC], time64[us], decimal128(9, 2)                                                                                                            |
| `int96.parquet`        | A nullable INT96 timestamp column. `use_deprecated_int96_timestamps` applies to every timestamp in a file, so it has its own file                                                                                                                                                                      |
| `dictionary.parquet`   | Data page v2, dictionary encoding for int32, int64, double, string and fixed_size_binary(4)                                                                                                                                                                                                            |
| `encodings.parquet`    | Data page v1: DELTA_BINARY_PACKED (int32, int64, with wrapping deltas between min and max and two blocks per page), DELTA_LENGTH_BYTE_ARRAY, DELTA_BYTE_ARRAY (string with shared prefixes, fixed_size_binary(3)), BYTE_STREAM_SPLIT (float, double, int32, int64, fixed_size_binary(3)), RLE booleans |
| `encodings_v2.parquet` | The same table and encodings with data page v2                                                                                                                                                                                                                                                         |
| `nested.parquet`       | Data page v1, 2 row groups: list<int32> with null, empty and null-element lists, list<list<string>>, nullable struct<a: int32 not null, b: list<int64>>, map<string, int32>, required struct<x: double>, list<struct<s: string, t: bool>>                                                              |
| `nested_v2.parquet`    | The same table with data page v2                                                                                                                                                                                                                                                                       |
| `gzip.parquet`         | GZIP, data page v2, dictionary: int64, string, list<int32>                                                                                                                                                                                                                                             |
| `empty.parquet`        | An int32 and a string column, zero rows                                                                                                                                                                                                                                                                |

All files are uncompressed except `gzip.parquet`. pyarrow accepted every
requested encoding combination.

Regenerate from `packages/effect`; the output is byte for byte the same:

```sh
uv run --no-project --with pyarrow==26.0.1 python test/fixtures/parquet/generate.py
```
