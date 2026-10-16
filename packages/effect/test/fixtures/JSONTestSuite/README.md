# JSONTestSuite fixtures

Parser conformance inputs used by `test/encoding/JsonTestSuite.test.ts`.

- Source: https://github.com/nst/JSONTestSuite, commit
  `1ef36fa01286573e846ac449e8683f8833c5b26a`, directory `test_parsing`.
- License: MIT, copied unchanged to `LICENSE`.
- Every file is copied unchanged except `n_structure_100000_opening_arrays.json`
  (`"["` repeated 100000 times) and `n_structure_open_array_object.json`
  (`"[{\"\":"` repeated 50000 times, then `"\n"`), which the test generates.

Import procedure:

```sh
git clone https://github.com/nst/JSONTestSuite.git /tmp/JSONTestSuite
git -C /tmp/JSONTestSuite checkout 1ef36fa01286573e846ac449e8683f8833c5b26a
git -C /tmp/JSONTestSuite ls-files test_parsing \
  | grep -v -e n_structure_100000_opening_arrays.json -e n_structure_open_array_object.json \
  | (cd /tmp/JSONTestSuite && xargs -I{} cp {} "$OLDPWD/{}")
cp /tmp/JSONTestSuite/LICENSE LICENSE
```

Run from this directory. Afterwards
`cd test_parsing && LC_ALL=C ls | xargs shasum -a 256 | shasum -a 256` prints
`e117b482c89e279700b697cb3cf83074125767a0c733ac0fcddfcdf1c98f013f`.
