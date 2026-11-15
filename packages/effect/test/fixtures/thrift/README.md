# Thrift fixtures

`gold.json` is read by `test/encoding/Thrift.test.ts`. Each case is a value
tree and the bytes the official Apache Thrift Python library (`thrift`
0.25.0 from PyPI, `TCompactProtocol`) writes for it: hand-written cases for
each feature of the compact protocol, then 300 seeded random structs.

The `parquet` section holds compact-protocol structs cut from two files of
[apache/parquet-testing](https://github.com/apache/parquet-testing) (commit
`bcefdfd`): the `FileMetaData` footers of `data_index_bloom_encoding_stats.parquet`
and `alltypes_tiny_pages.parquet`, a page header from each, and the bloom
filter header, offset index and column index of the first. Each comes with the
tree the Python reader reads from it. The row counts, column names and
offsets the test checks are the ones pyarrow reports for those files.

Regenerate with:

```sh
pip install thrift==0.25.0
PARQUET_TESTING=/path/to/parquet-testing python test/fixtures/thrift/generate.py
```
