# Example Suggestions: `effect/Schema`

- **Package:** `effect`
- **Source:** `packages/effect/src/Schema.ts`
- **Uncovered API records:** 558
- **Priorities:** 0 required, 25 recommended, 533 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                          |  Line | Kind                    | Priority        |
| ------------------------------------------------------------ | ----: | ----------------------- | --------------- |
| `effect/Schema.declareConstructor (value)`                   |   483 | `root-declaration`      | **recommended** |
| `effect/Schema.toStandardJSONSchemaV1`                       |  1346 | `root-declaration`      | **recommended** |
| `effect/Schema.decodeUnknownEffect`                          |  1481 | `root-declaration`      | **recommended** |
| `effect/Schema.decodeEffect`                                 |  1512 | `root-declaration`      | **recommended** |
| `effect/Schema.decodeUnknownExit`                            |  1588 | `root-declaration`      | **recommended** |
| `effect/Schema.encodeEffect`                                 |  1973 | `root-declaration`      | **recommended** |
| `effect/Schema.encodeUnknownExit`                            |  2010 | `root-declaration`      | **recommended** |
| `effect/Schema.encodeExit`                                   |  2047 | `root-declaration`      | **recommended** |
| `effect/Schema.make`                                         |  2330 | `root-declaration`      | **recommended** |
| `effect/Schema.isSchema`                                     |  2338 | `root-declaration`      | **recommended** |
| `effect/Schema.requiredKey`                                  |  2418 | `root-declaration`      | **recommended** |
| `effect/Schema.required`                                     |  2487 | `root-declaration`      | **recommended** |
| `effect/Schema.mutableKey (value)`                           |  2529 | `root-declaration`      | **recommended** |
| `effect/Schema.readonlyKey`                                  |  2550 | `root-declaration`      | **recommended** |
| `effect/Schema.toType (value)`                               |  2592 | `root-declaration`      | **recommended** |
| `effect/Schema.toEncoded (value)`                            |  2634 | `root-declaration`      | **recommended** |
| `effect/Schema.Never (value)`                                |  3007 | `root-declaration`      | **recommended** |
| `effect/Schema.Any (value)`                                  |  3024 | `root-declaration`      | **recommended** |
| `effect/Schema.Unknown (value)`                              |  3046 | `root-declaration`      | **recommended** |
| `effect/Schema.Boolean (value)`                              |  3142 | `root-declaration`      | **recommended** |
| `effect/Schema.ArrayEnsure (value)`                          |  4688 | `root-declaration`      | **recommended** |
| `effect/Schema.UniqueArray (value)`                          |  4719 | `root-declaration`      | **recommended** |
| `effect/Schema.NullOr (value)`                               |  4962 | `root-declaration`      | **recommended** |
| `effect/Schema.UndefinedOr (value)`                          |  4985 | `root-declaration`      | **recommended** |
| `effect/Schema.NullishOr (value)`                            |  5008 | `root-declaration`      | **recommended** |
| `effect/Schema.MakeOptions`                                  |   118 | `root-declaration`      | **optional**    |
| `effect/Schema.declareConstructor (type)`                    |   414 | `root-declaration`      | **optional**    |
| `effect/Schema.declare`                                      |   513 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeExit`                                   |  1631 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeUnknownOption`                          |  1662 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeOption`                                 |  1692 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeUnknownResult`                          |  1726 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeResult`                                 |  1761 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeUnknownPromise`                         |  1794 | `root-declaration`      | **optional**    |
| `effect/Schema.decodePromise`                                |  1831 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeSync`                                   |  1906 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeUnknownOption`                          |  2078 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeOption`                                 |  2109 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeUnknownResult`                          |  2142 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeResult`                                 |  2177 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeUnknownPromise`                         |  2209 | `root-declaration`      | **optional**    |
| `effect/Schema.encodePromise`                                |  2246 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeUnknownSync`                            |  2277 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeSync`                                   |  2308 | `root-declaration`      | **optional**    |
| `effect/Schema.toType (type)`                                |  2558 | `root-declaration`      | **optional**    |
| `effect/Schema.toEncoded (type)`                             |  2600 | `root-declaration`      | **optional**    |
| `effect/Schema.flip`                                         |  2644 | `root-declaration`      | **optional**    |
| `effect/Schema.Null (value)`                                 |  3063 | `root-declaration`      | **optional**    |
| `effect/Schema.Undefined (value)`                            |  3080 | `root-declaration`      | **optional**    |
| `effect/Schema.String (value)`                               |  3096 | `root-declaration`      | **optional**    |
| `effect/Schema.Number (value)`                               |  3120 | `root-declaration`      | **optional**    |
| `effect/Schema.BigInt (value)`                               |  3182 | `root-declaration`      | **optional**    |
| `effect/Schema.Void (value)`                                 |  3211 | `root-declaration`      | **optional**    |
| `effect/Schema.ObjectKeyword (value)`                        |  3228 | `root-declaration`      | **optional**    |
| `effect/Schema.encodeKeys`                                   |  3582 | `root-declaration`      | **optional**    |
| `effect/Schema.ArrayEnsure (type)`                           |  4658 | `root-declaration`      | **optional**    |
| `effect/Schema.mutable`                                      |  4729 | `root-declaration`      | **optional**    |
| `effect/Schema.refine (type)`                                |  5097 | `root-declaration`      | **optional**    |
| `effect/Schema.refine (value)`                               |  5134 | `root-declaration`      | **optional**    |
| `effect/Schema.brand (type)`                                 |  5150 | `root-declaration`      | **optional**    |
| `effect/Schema.brand (value)`                                |  5192 | `root-declaration`      | **optional**    |
| `effect/Schema.fromBrand`                                    |  5204 | `root-declaration`      | **optional**    |
| `effect/Schema.middlewareDecoding`                           |  5218 | `root-declaration`      | **optional**    |
| `effect/Schema.middlewareEncoding`                           |  5285 | `root-declaration`      | **optional**    |
| `effect/Schema.catchDecodingWithContext`                     |  5395 | `root-declaration`      | **optional**    |
| `effect/Schema.catchEncoding`                                |  5414 | `root-declaration`      | **optional**    |
| `effect/Schema.catchEncodingWithContext`                     |  5440 | `root-declaration`      | **optional**    |
| `effect/Schema.decodeTo`                                     |  5453 | `root-declaration`      | **optional**    |
| `effect/Schema.compose`                                      |  5482 | `root-declaration`      | **optional**    |
| `effect/Schema.withConstructorDefault`                       |  5721 | `root-declaration`      | **optional**    |
| `effect/Schema.withDecodingDefaultKey`                       |  5790 | `root-declaration`      | **optional**    |
| `effect/Schema.DecodingDefaultOptions`                       |  5808 | `root-declaration`      | **optional**    |
| `effect/Schema.withDecodingDefaultTypeKey (type)`            |  5864 | `root-declaration`      | **optional**    |
| `effect/Schema.withDecodingDefaultTypeKey (value)`           |  5892 | `root-declaration`      | **optional**    |
| `effect/Schema.withDecodingDefault`                          |  5910 | `root-declaration`      | **optional**    |
| `effect/Schema.withDecodingDefaultType (type)`               |  5971 | `root-declaration`      | **optional**    |
| `effect/Schema.withDecodingDefaultType (value)`              |  6004 | `root-declaration`      | **optional**    |
| `effect/Schema.tag`                                          |  6022 | `root-declaration`      | **optional**    |
| `effect/Schema.toTaggedUnion`                                |  6196 | `root-declaration`      | **optional**    |
| `effect/Schema.link`                                         |  6469 | `root-declaration`      | **optional**    |
| `effect/Schema.makeFilterGroup`                              |  6608 | `root-declaration`      | **optional**    |
| `effect/Schema.isTrimmed`                                    |  6646 | `root-declaration`      | **optional**    |
| `effect/Schema.isTrimmedReviver`                             |  6680 | `root-declaration`      | **optional**    |
| `effect/Schema.isPattern`                                    |  6703 | `root-declaration`      | **optional**    |
| `effect/Schema.isPatternReviver`                             |  6740 | `root-declaration`      | **optional**    |
| `effect/Schema.isStringFinite`                               |  6767 | `root-declaration`      | **optional**    |
| `effect/Schema.isStringFiniteReviver`                        |  6786 | `root-declaration`      | **optional**    |
| `effect/Schema.isStringBigInt`                               |  6809 | `root-declaration`      | **optional**    |
| `effect/Schema.isStringBigIntReviver`                        |  6828 | `root-declaration`      | **optional**    |
| `effect/Schema.isStringSymbol`                               |  6846 | `root-declaration`      | **optional**    |
| `effect/Schema.isStringSymbolReviver`                        |  6865 | `root-declaration`      | **optional**    |
| `effect/Schema.isUUID`                                       |  6915 | `root-declaration`      | **optional**    |
| `effect/Schema.isUUIDReviver`                                |  6944 | `root-declaration`      | **optional**    |
| `effect/Schema.isGUID`                                       |  6978 | `root-declaration`      | **optional**    |
| `effect/Schema.isGUIDReviver`                                |  7006 | `root-declaration`      | **optional**    |
| `effect/Schema.isULID`                                       |  7031 | `root-declaration`      | **optional**    |
| `effect/Schema.isULIDReviver`                                |  7059 | `root-declaration`      | **optional**    |
| `effect/Schema.isBase64`                                     |  7083 | `root-declaration`      | **optional**    |
| `effect/Schema.isBase64Reviver`                              |  7112 | `root-declaration`      | **optional**    |
| `effect/Schema.isBase64Url`                                  |  7137 | `root-declaration`      | **optional**    |
| `effect/Schema.isBase64UrlReviver`                           |  7166 | `root-declaration`      | **optional**    |
| `effect/Schema.isStartsWith`                                 |  7183 | `root-declaration`      | **optional**    |
| `effect/Schema.isStartsWithReviver`                          |  7218 | `root-declaration`      | **optional**    |
| `effect/Schema.isEndsWith`                                   |  7237 | `root-declaration`      | **optional**    |
| `effect/Schema.isEndsWithReviver`                            |  7272 | `root-declaration`      | **optional**    |
| `effect/Schema.isIncludes`                                   |  7292 | `root-declaration`      | **optional**    |
| `effect/Schema.isIncludesReviver`                            |  7327 | `root-declaration`      | **optional**    |
| `effect/Schema.isUppercased`                                 |  7349 | `root-declaration`      | **optional**    |
| `effect/Schema.isUppercasedReviver`                          |  7383 | `root-declaration`      | **optional**    |
| `effect/Schema.isLowercased`                                 |  7403 | `root-declaration`      | **optional**    |
| `effect/Schema.isLowercasedReviver`                          |  7437 | `root-declaration`      | **optional**    |
| `effect/Schema.isCapitalized`                                |  7457 | `root-declaration`      | **optional**    |
| `effect/Schema.isCapitalizedReviver`                         |  7491 | `root-declaration`      | **optional**    |
| `effect/Schema.isUncapitalized`                              |  7511 | `root-declaration`      | **optional**    |
| `effect/Schema.isUncapitalizedReviver`                       |  7545 | `root-declaration`      | **optional**    |
| `effect/Schema.Finite (type)`                                |  7557 | `root-declaration`      | **optional**    |
| `effect/Schema.Finite (value)`                               |  7567 | `root-declaration`      | **optional**    |
| `effect/Schema.isFinite`                                     |  7587 | `root-declaration`      | **optional**    |
| `effect/Schema.isFiniteReviver`                              |  7601 | `root-declaration`      | **optional**    |
| `effect/Schema.makeIsGreaterThan`                            |  7614 | `root-declaration`      | **optional**    |
| `effect/Schema.makeIsGreaterThanOrEqualTo`                   |  7649 | `root-declaration`      | **optional**    |
| `effect/Schema.makeIsLessThan`                               |  7683 | `root-declaration`      | **optional**    |
| `effect/Schema.makeIsLessThanOrEqualTo`                      |  7718 | `root-declaration`      | **optional**    |
| `effect/Schema.makeIsBetween`                                |  7752 | `root-declaration`      | **optional**    |
| `effect/Schema.makeIsMultipleOf`                             |  7808 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThan`                                |  7852 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanReviver`                         |  7876 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanOrEqualTo`                       |  7902 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanOrEqualToReviver`                |  7926 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThan`                                   |  7952 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanReviver`                            |  7976 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanOrEqualTo`                          |  8002 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanOrEqualToReviver`                   |  8026 | `root-declaration`      | **optional**    |
| `effect/Schema.isBetween`                                    |  8055 | `root-declaration`      | **optional**    |
| `effect/Schema.isBetweenReviver`                             |  8096 | `root-declaration`      | **optional**    |
| `effect/Schema.isMultipleOf`                                 |  8129 | `root-declaration`      | **optional**    |
| `effect/Schema.isMultipleOfReviver`                          |  8155 | `root-declaration`      | **optional**    |
| `effect/Schema.isInt`                                        |  8181 | `root-declaration`      | **optional**    |
| `effect/Schema.isIntReviver`                                 |  8214 | `root-declaration`      | **optional**    |
| `effect/Schema.Int (type)`                                   |  8226 | `root-declaration`      | **optional**    |
| `effect/Schema.Int (value)`                                  |  8236 | `root-declaration`      | **optional**    |
| `effect/Schema.Natural (type)`                               |  8244 | `root-declaration`      | **optional**    |
| `effect/Schema.Natural (value)`                              |  8260 | `root-declaration`      | **optional**    |
| `effect/Schema.isInt32`                                      |  8281 | `root-declaration`      | **optional**    |
| `effect/Schema.isUint32`                                     |  8313 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanDate`                            |  8351 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanOrEqualToDate`                   |  8386 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanDate`                               |  8415 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanOrEqualToDate`                      |  8450 | `root-declaration`      | **optional**    |
| `effect/Schema.isBetweenDate`                                |  8485 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanBigInt`                          |  8525 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanOrEqualToBigInt`                 |  8555 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanBigInt`                             |  8584 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanOrEqualToBigInt`                    |  8614 | `root-declaration`      | **optional**    |
| `effect/Schema.isBetweenBigInt`                              |  8644 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanBigDecimal`                      |  8676 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanOrEqualToBigDecimal`             |  8688 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanBigDecimal`                         |  8699 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanOrEqualToBigDecimal`                |  8711 | `root-declaration`      | **optional**    |
| `effect/Schema.isBetweenBigDecimal`                          |  8727 | `root-declaration`      | **optional**    |
| `effect/Schema.isMinLengthReviver`                           |  8798 | `root-declaration`      | **optional**    |
| `effect/Schema.isNonEmpty`                                   |  8825 | `root-declaration`      | **optional**    |
| `effect/Schema.isMaxLength`                                  |  8849 | `root-declaration`      | **optional**    |
| `effect/Schema.isMaxLengthReviver`                           |  8884 | `root-declaration`      | **optional**    |
| `effect/Schema.isLengthBetween`                              |  8912 | `root-declaration`      | **optional**    |
| `effect/Schema.isLengthBetweenReviver`                       |  8955 | `root-declaration`      | **optional**    |
| `effect/Schema.isMinSize`                                    |  8984 | `root-declaration`      | **optional**    |
| `effect/Schema.isMinSizeReviver`                             |  9019 | `root-declaration`      | **optional**    |
| `effect/Schema.isMaxSize`                                    |  9047 | `root-declaration`      | **optional**    |
| `effect/Schema.isMaxSizeReviver`                             |  9082 | `root-declaration`      | **optional**    |
| `effect/Schema.isSizeBetween`                                |  9110 | `root-declaration`      | **optional**    |
| `effect/Schema.isSizeBetweenReviver`                         |  9150 | `root-declaration`      | **optional**    |
| `effect/Schema.isMinProperties`                              |  9179 | `root-declaration`      | **optional**    |
| `effect/Schema.isMinPropertiesReviver`                       |  9214 | `root-declaration`      | **optional**    |
| `effect/Schema.isMaxProperties`                              |  9241 | `root-declaration`      | **optional**    |
| `effect/Schema.isMaxPropertiesReviver`                       |  9276 | `root-declaration`      | **optional**    |
| `effect/Schema.isPropertiesLengthBetween`                    |  9304 | `root-declaration`      | **optional**    |
| `effect/Schema.isPropertiesLengthBetweenReviver`             |  9344 | `root-declaration`      | **optional**    |
| `effect/Schema.isPropertyNames`                              |  9369 | `root-declaration`      | **optional**    |
| `effect/Schema.isPropertyNamesReviver`                       |  9415 | `root-declaration`      | **optional**    |
| `effect/Schema.isUnique`                                     |  9437 | `root-declaration`      | **optional**    |
| `effect/Schema.isUniqueReviver`                              |  9470 | `root-declaration`      | **optional**    |
| `effect/Schema.NonEmptyString (type)`                        |  9486 | `root-declaration`      | **optional**    |
| `effect/Schema.NonEmptyString (value)`                       |  9497 | `root-declaration`      | **optional**    |
| `effect/Schema.Char (type)`                                  |  9505 | `root-declaration`      | **optional**    |
| `effect/Schema.Char (value)`                                 |  9528 | `root-declaration`      | **optional**    |
| `effect/Schema.Option (type)`                                |  9536 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionIso`                                    |  9559 | `root-declaration`      | **optional**    |
| `effect/Schema.Option (value)`                               |  9569 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionReviver`                                |  9645 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromNullOr (type)`                      |  9660 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromNullOr (value)`                     |  9675 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromUndefinedOr (type)`                 |  9688 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromUndefinedOr (value)`                |  9704 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromNullishOr (type)`                   |  9717 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromNullishOr (value)`                  |  9734 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromOptionalKey (type)`                 |  9752 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromOptionalKey (value)`                |  9767 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromOptional (type)`                    |  9780 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromOptional (value)`                   |  9797 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromOptionalNullOr (type)`              |  9810 | `root-declaration`      | **optional**    |
| `effect/Schema.OptionFromOptionalNullOr (value)`             |  9830 | `root-declaration`      | **optional**    |
| `effect/Schema.Result (type)`                                |  9857 | `root-declaration`      | **optional**    |
| `effect/Schema.ResultIso`                                    |  9881 | `root-declaration`      | **optional**    |
| `effect/Schema.Result (value)`                               |  9891 | `root-declaration`      | **optional**    |
| `effect/Schema.ResultReviver`                                |  9981 | `root-declaration`      | **optional**    |
| `effect/Schema.Redacted (type)`                              |  9996 | `root-declaration`      | **optional**    |
| `effect/Schema.Redacted (value)`                             | 10062 | `root-declaration`      | **optional**    |
| `effect/Schema.RedactedReviver`                              | 10154 | `root-declaration`      | **optional**    |
| `effect/Schema.RedactedFromValue (type)`                     | 10169 | `root-declaration`      | **optional**    |
| `effect/Schema.redact`                                       | 10182 | `root-declaration`      | **optional**    |
| `effect/Schema.RedactedFromValue (value)`                    | 10195 | `root-declaration`      | **optional**    |
| `effect/Schema.CauseReason (type)`                           | 10224 | `root-declaration`      | **optional**    |
| `effect/Schema.CauseReasonIso`                               | 10248 | `root-declaration`      | **optional**    |
| `effect/Schema.CauseReason (value)`                          | 10279 | `root-declaration`      | **optional**    |
| `effect/Schema.CauseReasonReviver`                           | 10361 | `root-declaration`      | **optional**    |
| `effect/Schema.Cause (type)`                                 | 10419 | `root-declaration`      | **optional**    |
| `effect/Schema.CauseIso`                                     | 10447 | `root-declaration`      | **optional**    |
| `effect/Schema.Cause (value)`                                | 10470 | `root-declaration`      | **optional**    |
| `effect/Schema.CauseReviver`                                 | 10525 | `root-declaration`      | **optional**    |
| `effect/Schema.Error (type)`                                 | 10562 | `root-declaration`      | **optional**    |
| `effect/Schema.ErrorOptions`                                 | 10572 | `root-declaration`      | **optional**    |
| `effect/Schema.Error (value)`                                | 10647 | `root-declaration`      | **optional**    |
| `effect/Schema.ErrorReviver`                                 | 10683 | `root-declaration`      | **optional**    |
| `effect/Schema.Defect (type)`                                | 10698 | `root-declaration`      | **optional**    |
| `effect/Schema.Defect (value)`                               | 10745 | `root-declaration`      | **optional**    |
| `effect/Schema.Exit (type)`                                  | 10762 | `root-declaration`      | **optional**    |
| `effect/Schema.ExitIso`                                      | 10787 | `root-declaration`      | **optional**    |
| `effect/Schema.Exit (value)`                                 | 10807 | `root-declaration`      | **optional**    |
| `effect/Schema.ExitReviver`                                  | 10927 | `root-declaration`      | **optional**    |
| `effect/Schema.$ReadonlyMap`                                 | 10942 | `root-declaration`      | **optional**    |
| `effect/Schema.ReadonlyMapIso`                               | 10962 | `root-declaration`      | **optional**    |
| `effect/Schema.ReadonlyMap`                                  | 11063 | `root-declaration`      | **optional**    |
| `effect/Schema.ReadonlyMapReviver`                           | 11134 | `root-declaration`      | **optional**    |
| `effect/Schema.HashMap (type)`                               | 11149 | `root-declaration`      | **optional**    |
| `effect/Schema.HashMapIso`                                   | 11169 | `root-declaration`      | **optional**    |
| `effect/Schema.HashMap (value)`                              | 11179 | `root-declaration`      | **optional**    |
| `effect/Schema.HashMapReviver`                               | 11248 | `root-declaration`      | **optional**    |
| `effect/Schema.$ReadonlySet`                                 | 11263 | `root-declaration`      | **optional**    |
| `effect/Schema.ReadonlySetIso`                               | 11282 | `root-declaration`      | **optional**    |
| `effect/Schema.ReadonlySet`                                  | 11290 | `root-declaration`      | **optional**    |
| `effect/Schema.ReadonlySetReviver`                           | 11359 | `root-declaration`      | **optional**    |
| `effect/Schema.HashSet (type)`                               | 11374 | `root-declaration`      | **optional**    |
| `effect/Schema.HashSetIso`                                   | 11393 | `root-declaration`      | **optional**    |
| `effect/Schema.HashSet (value)`                              | 11401 | `root-declaration`      | **optional**    |
| `effect/Schema.HashSetReviver`                               | 11470 | `root-declaration`      | **optional**    |
| `effect/Schema.Chunk (type)`                                 | 11485 | `root-declaration`      | **optional**    |
| `effect/Schema.ChunkIso`                                     | 11511 | `root-declaration`      | **optional**    |
| `effect/Schema.Chunk (value)`                                | 11519 | `root-declaration`      | **optional**    |
| `effect/Schema.ChunkReviver`                                 | 11588 | `root-declaration`      | **optional**    |
| `effect/Schema.RegExp (type)`                                | 11603 | `root-declaration`      | **optional**    |
| `effect/Schema.RegExp (value)`                               | 11617 | `root-declaration`      | **optional**    |
| `effect/Schema.RegExpReviver`                                | 11686 | `root-declaration`      | **optional**    |
| `effect/Schema.URL (type)`                                   | 11697 | `root-declaration`      | **optional**    |
| `effect/Schema.URL (value)`                                  | 11715 | `root-declaration`      | **optional**    |
| `effect/Schema.URLReviver`                                   | 11749 | `root-declaration`      | **optional**    |
| `effect/Schema.URLFromString (type)`                         | 11760 | `root-declaration`      | **optional**    |
| `effect/Schema.URLFromString (value)`                        | 11778 | `root-declaration`      | **optional**    |
| `effect/Schema.Date`                                         | 11786 | `root-declaration`      | **optional**    |
| `effect/Schema.DateReviver`                                  | 11880 | `root-declaration`      | **optional**    |
| `effect/Schema.DateFromString (type)`                        | 11891 | `root-declaration`      | **optional**    |
| `effect/Schema.DateFromString (value)`                       | 11920 | `root-declaration`      | **optional**    |
| `effect/Schema.DateFromMillis (type)`                        | 11928 | `root-declaration`      | **optional**    |
| `effect/Schema.DateFromMillis (value)`                       | 11960 | `root-declaration`      | **optional**    |
| `effect/Schema.Duration`                                     | 11970 | `root-declaration`      | **optional**    |
| `effect/Schema.DurationReviver`                              | 12066 | `root-declaration`      | **optional**    |
| `effect/Schema.DurationFromString (type)`                    | 12079 | `root-declaration`      | **optional**    |
| `effect/Schema.DurationFromString (value)`                   | 12098 | `root-declaration`      | **optional**    |
| `effect/Schema.DurationFromNanos (type)`                     | 12108 | `root-declaration`      | **optional**    |
| `effect/Schema.DurationFromNanos (value)`                    | 12129 | `root-declaration`      | **optional**    |
| `effect/Schema.DurationFromMillis (type)`                    | 12139 | `root-declaration`      | **optional**    |
| `effect/Schema.DurationFromMillis (value)`                   | 12162 | `root-declaration`      | **optional**    |
| `effect/Schema.BigDecimal (type)`                            | 12172 | `root-declaration`      | **optional**    |
| `effect/Schema.BigDecimal (value)`                           | 12272 | `root-declaration`      | **optional**    |
| `effect/Schema.BigDecimalReviver`                            | 12324 | `root-declaration`      | **optional**    |
| `effect/Schema.BigDecimalFromString (type)`                  | 12335 | `root-declaration`      | **optional**    |
| `effect/Schema.BigDecimalFromString (value)`                 | 12366 | `root-declaration`      | **optional**    |
| `effect/Schema.File (type)`                                  | 12434 | `root-declaration`      | **optional**    |
| `effect/Schema.File (value)`                                 | 12449 | `root-declaration`      | **optional**    |
| `effect/Schema.FileReviver`                                  | 12515 | `root-declaration`      | **optional**    |
| `effect/Schema.FormData (type)`                              | 12526 | `root-declaration`      | **optional**    |
| `effect/Schema.FormData (value)`                             | 12541 | `root-declaration`      | **optional**    |
| `effect/Schema.FormDataReviver`                              | 12597 | `root-declaration`      | **optional**    |
| `effect/Schema.fromFormData`                                 | 12608 | `root-declaration`      | **optional**    |
| `effect/Schema.URLSearchParams (type)`                       | 12704 | `root-declaration`      | **optional**    |
| `effect/Schema.URLSearchParams (value)`                      | 12718 | `root-declaration`      | **optional**    |
| `effect/Schema.URLSearchParamsReviver`                       | 12750 | `root-declaration`      | **optional**    |
| `effect/Schema.fromURLSearchParams`                          | 12761 | `root-declaration`      | **optional**    |
| `effect/Schema.NumberFromString (type)`                      | 12852 | `root-declaration`      | **optional**    |
| `effect/Schema.NumberFromString (value)`                     | 12873 | `root-declaration`      | **optional**    |
| `effect/Schema.FiniteFromString (type)`                      | 12883 | `root-declaration`      | **optional**    |
| `effect/Schema.FiniteFromString (value)`                     | 12902 | `root-declaration`      | **optional**    |
| `effect/Schema.BigIntFromString (type)`                      | 12912 | `root-declaration`      | **optional**    |
| `effect/Schema.BigIntFromString (value)`                     | 12944 | `root-declaration`      | **optional**    |
| `effect/Schema.Trimmed (type)`                               | 12954 | `root-declaration`      | **optional**    |
| `effect/Schema.Trimmed (value)`                              | 12964 | `root-declaration`      | **optional**    |
| `effect/Schema.Trim (type)`                                  | 12972 | `root-declaration`      | **optional**    |
| `effect/Schema.Trim (value)`                                 | 12990 | `root-declaration`      | **optional**    |
| `effect/Schema.StringFromBase64 (type)`                      | 13000 | `root-declaration`      | **optional**    |
| `effect/Schema.StringFromBase64 (value)`                     | 13018 | `root-declaration`      | **optional**    |
| `effect/Schema.StringFromBase64Url (type)`                   | 13030 | `root-declaration`      | **optional**    |
| `effect/Schema.StringFromBase64Url (value)`                  | 13048 | `root-declaration`      | **optional**    |
| `effect/Schema.StringFromHex (type)`                         | 13060 | `root-declaration`      | **optional**    |
| `effect/Schema.StringFromHex (value)`                        | 13078 | `root-declaration`      | **optional**    |
| `effect/Schema.StringFromUriComponent`                       | 13090 | `root-declaration`      | **optional**    |
| `effect/Schema.PropertyKey`                                  | 13139 | `root-declaration`      | **optional**    |
| `effect/Schema.StandardSchemaV1FailureResult`                | 13152 | `root-declaration`      | **optional**    |
| `effect/Schema.BooleanFromBit (type)`                        | 13165 | `root-declaration`      | **optional**    |
| `effect/Schema.BooleanFromBit (value)`                       | 13188 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8Array (type)`                            | 13204 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8Array (value)`                           | 13226 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8ArrayReviver`                            | 13256 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8ArrayFromBase64 (type)`                  | 13267 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8ArrayFromBase64 (value)`                 | 13286 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8ArrayFromBase64Url (type)`               | 13296 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8ArrayFromBase64Url (value)`              | 13315 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8ArrayFromHex (type)`                     | 13330 | `root-declaration`      | **optional**    |
| `effect/Schema.Uint8ArrayFromHex (value)`                    | 13349 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtc (type)`                           | 13364 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtc (value)`                          | 13389 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtcReviver`                           | 13431 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtcFromDate (type)`                   | 13442 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtcFromDate (value)`                  | 13470 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtcFromString (type)`                 | 13483 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtcFromString (value)`                | 13508 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtcFromMillis (type)`                 | 13523 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeUtcFromMillis (value)`                | 13545 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneOffset (type)`                        | 13558 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneOffset (value)`                       | 13574 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneOffsetReviver`                        | 13611 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneNamed (type)`                         | 13622 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneNamed (value)`                        | 13640 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneNamedReviver`                         | 13681 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneNamedFromString (type)`               | 13692 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneNamedFromString (value)`              | 13710 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZone (type)`                              | 13720 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZone (value)`                             | 13741 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneReviver`                              | 13785 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneFromString (type)`                    | 13796 | `root-declaration`      | **optional**    |
| `effect/Schema.TimeZoneFromString (value)`                   | 13814 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeZoned (type)`                         | 13824 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeZoned (value)`                        | 13847 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeZonedReviver`                         | 13895 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeZonedFromString (type)`               | 13906 | `root-declaration`      | **optional**    |
| `effect/Schema.DateTimeZonedFromString (value)`              | 13924 | `root-declaration`      | **optional**    |
| `effect/Schema.LazyArbitrary`                                | 14503 | `root-declaration`      | **optional**    |
| `effect/Schema.toArbitraryLazy`                              | 14519 | `root-declaration`      | **optional**    |
| `effect/Schema.overrideToFormatter`                          | 14589 | `root-declaration`      | **optional**    |
| `effect/Schema.toFormatter`                                  | 14608 | `root-declaration`      | **optional**    |
| `effect/Schema.overrideToEquivalence`                        | 14762 | `root-declaration`      | **optional**    |
| `effect/Schema.toRepresentation`                             | 14804 | `root-declaration`      | **optional**    |
| `effect/Schema.ToJsonSchemaOptions`                          | 14818 | `root-declaration`      | **optional**    |
| `effect/Schema.toJsonSchemaDocument`                         | 14902 | `root-declaration`      | **optional**    |
| `effect/Schema.toCodecJson (type)`                           | 14920 | `root-declaration`      | **optional**    |
| `effect/Schema.toCodecJson (value)`                          | 14957 | `root-declaration`      | **optional**    |
| `effect/Schema.toCodecIso`                                   | 15079 | `root-declaration`      | **optional**    |
| `effect/Schema.StringTree`                                   | 15116 | `root-declaration`      | **optional**    |
| `effect/Schema.toCodecStringTree (type)`                     | 15124 | `root-declaration`      | **optional**    |
| `effect/Schema.toCodecStringTree (value)`                    | 15159 | `root-declaration`      | **optional**    |
| `effect/Schema.toCodecArrayFromSingle (type)`                | 15169 | `root-declaration`      | **optional**    |
| `effect/Schema.toCodecArrayFromSingle (value)`               | 15208 | `root-declaration`      | **optional**    |
| `effect/Schema.toEncoderXml`                                 | 15237 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanDateReviver`                     | 15497 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanOrEqualToDateReviver`            | 15517 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanDateReviver`                        | 15537 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanOrEqualToDateReviver`               | 15557 | `root-declaration`      | **optional**    |
| `effect/Schema.isBetweenDateReviver`                         | 15577 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanBigIntReviver`                   | 15605 | `root-declaration`      | **optional**    |
| `effect/Schema.isGreaterThanOrEqualToBigIntReviver`          | 15625 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanBigIntReviver`                      | 15645 | `root-declaration`      | **optional**    |
| `effect/Schema.isLessThanOrEqualToBigIntReviver`             | 15665 | `root-declaration`      | **optional**    |
| `effect/Schema.isBetweenBigIntReviver`                       | 15685 | `root-declaration`      | **optional**    |
| `effect/Schema.toIso`                                        | 15712 | `root-declaration`      | **optional**    |
| `effect/Schema.toIsoSource`                                  | 15723 | `root-declaration`      | **optional**    |
| `effect/Schema.toIsoFocus`                                   | 15733 | `root-declaration`      | **optional**    |
| `effect/Schema.overrideToCodecIso (type)`                    | 15743 | `root-declaration`      | **optional**    |
| `effect/Schema.overrideToCodecIso (value)`                   | 15782 | `root-declaration`      | **optional**    |
| `effect/Schema.toDifferJsonPatch`                            | 15811 | `root-declaration`      | **optional**    |
| `effect/Schema.Tree (type)`                                  | 15834 | `root-declaration`      | **optional**    |
| `effect/Schema.TreeRecord`                                   | 15843 | `root-declaration`      | **optional**    |
| `effect/Schema.Tree (value)`                                 | 15855 | `root-declaration`      | **optional**    |
| `effect/Schema.JsonReviver`                                  | 15933 | `root-declaration`      | **optional**    |
| `effect/Schema.MutableJson (value)`                          | 15979 | `root-declaration`      | **optional**    |
| `effect/Schema.MutableJsonReviver`                           | 15998 | `root-declaration`      | **optional**    |
| `effect/Schema.resolveAnnotations`                           | 16016 | `root-declaration`      | **optional**    |
| `effect/Schema.resolveAnnotationsKey`                        | 16030 | `root-declaration`      | **optional**    |
| `effect/Schema.Optionality`                                  |    81 | `root-declaration`      | **optional**    |
| `effect/Schema.Mutability`                                   |    91 | `root-declaration`      | **optional**    |
| `effect/Schema.ConstructorDefault`                           |   102 | `root-declaration`      | **optional**    |
| `effect/Schema.MakeOptions.parseOptions`                     |   122 | `member`                | **optional**    |
| `effect/Schema.MakeOptions.disableChecks`                    |   126 | `member`                | **optional**    |
| `effect/Schema.BottomWithoutNew`                             |   148 | `root-declaration`      | **optional**    |
| `effect/Schema.BottomWithoutNew.make`                        |   213 | `member`                | **optional**    |
| `effect/Schema.BottomWithoutNew.makeOption`                  |   237 | `member`                | **optional**    |
| `effect/Schema.BottomWithoutNew.makeEffect`                  |   250 | `member`                | **optional**    |
| `effect/Schema.Bottom`                                       |   273 | `root-declaration`      | **optional**    |
| `effect/Schema.BottomLazyWithoutNew`                         |   335 | `root-declaration`      | **optional**    |
| `effect/Schema.BottomLazy`                                   |   384 | `root-declaration`      | **optional**    |
| `effect/Schema.Top`                                          |   735 | `root-declaration`      | **optional**    |
| `effect/Schema.Constraint`                                   |   777 | `root-declaration`      | **optional**    |
| `effect/Schema.ConstraintCodec`                              |   814 | `root-declaration`      | **optional**    |
| `effect/Schema.ConstraintDecoder`                            |   838 | `root-declaration`      | **optional**    |
| `effect/Schema.ConstraintEncoder`                            |   857 | `root-declaration`      | **optional**    |
| `effect/Schema.ConstraintRebuildable`                        |   872 | `root-declaration`      | **optional**    |
| `effect/Schema.Schema`                                       |   881 | `namespace`             | **optional**    |
| `effect/Schema.Codec`                                        |   941 | `namespace`             | **optional**    |
| `effect/Schema.Decoder`                                      |  1054 | `root-declaration`      | **optional**    |
| `effect/Schema.Encoder`                                      |  1077 | `root-declaration`      | **optional**    |
| `effect/Schema.Optic`                                        |  1131 | `root-declaration`      | **optional**    |
| `effect/Schema.optionalKey`                                  |  2348 | `root-declaration`      | **optional**    |
| `effect/Schema.optional`                                     |  2426 | `root-declaration`      | **optional**    |
| `effect/Schema.mutableKey (type)`                            |  2495 | `root-declaration`      | **optional**    |
| `effect/Schema.Literal`                                      |  2709 | `root-declaration`      | **optional**    |
| `effect/Schema.TemplateLiteral (type) (type)`                |  2753 | `namespace`             | **optional**    |
| `effect/Schema.TemplateLiteral.SchemaPart`                   |  2765 | `namespace-declaration` | **optional**    |
| `effect/Schema.TemplateLiteral.LiteralPart`                  |  2775 | `namespace-declaration` | **optional**    |
| `effect/Schema.TemplateLiteral.Part`                         |  2784 | `namespace-declaration` | **optional**    |
| `effect/Schema.TemplateLiteral.Parts`                        |  2792 | `namespace-declaration` | **optional**    |
| `effect/Schema.TemplateLiteral.Encoded`                      |  2808 | `namespace-declaration` | **optional**    |
| `effect/Schema.TemplateLiteral (type) (type)`                |  2818 | `root-declaration`      | **optional**    |
| `effect/Schema.TemplateLiteralParser (type) (type)`          |  2874 | `namespace`             | **optional**    |
| `effect/Schema.TemplateLiteralParser.Type`                   |  2886 | `namespace-declaration` | **optional**    |
| `effect/Schema.TemplateLiteralParser (type) (type)`          |  2901 | `root-declaration`      | **optional**    |
| `effect/Schema.Enum`                                         |  2956 | `root-declaration`      | **optional**    |
| `effect/Schema.Never (type)`                                 |  2999 | `root-declaration`      | **optional**    |
| `effect/Schema.Any (type)`                                   |  3015 | `root-declaration`      | **optional**    |
| `effect/Schema.Unknown (type)`                               |  3032 | `root-declaration`      | **optional**    |
| `effect/Schema.Null (type)`                                  |  3054 | `root-declaration`      | **optional**    |
| `effect/Schema.Undefined (type)`                             |  3071 | `root-declaration`      | **optional**    |
| `effect/Schema.String (type)`                                |  3088 | `root-declaration`      | **optional**    |
| `effect/Schema.Number (type)`                                |  3104 | `root-declaration`      | **optional**    |
| `effect/Schema.Boolean (type)`                               |  3128 | `root-declaration`      | **optional**    |
| `effect/Schema.BigInt (type)`                                |  3167 | `root-declaration`      | **optional**    |
| `effect/Schema.Void (type)`                                  |  3190 | `root-declaration`      | **optional**    |
| `effect/Schema.ObjectKeyword (type)`                         |  3219 | `root-declaration`      | **optional**    |
| `effect/Schema.UniqueSymbol`                                 |  3236 | `root-declaration`      | **optional**    |
| `effect/Schema.Struct (type) (type)`                         |  3278 | `namespace`             | **optional**    |
| `effect/Schema.Struct.Fields`                                |  3285 | `namespace-declaration` | **optional**    |
| `effect/Schema.Struct.Type`                                  |  3349 | `namespace-declaration` | **optional**    |
| `effect/Schema.Struct.Iso`                                   |  3363 | `namespace-declaration` | **optional**    |
| `effect/Schema.Struct.Encoded`                               |  3377 | `namespace-declaration` | **optional**    |
| `effect/Schema.Struct.DecodingServices`                      |  3386 | `namespace-declaration` | **optional**    |
| `effect/Schema.Struct.EncodingServices`                      |  3395 | `namespace-declaration` | **optional**    |
| `effect/Schema.Struct.MakeIn`                                |  3420 | `namespace-declaration` | **optional**    |
| `effect/Schema.Struct (type) (type)`                         |  3429 | `root-declaration`      | **optional**    |
| `effect/Schema.Struct.mapFields`                             |  3476 | `member`                | **optional**    |
| `effect/Schema.Record`                                       |  3739 | `namespace`             | **optional**    |
| `effect/Schema.Record.Key`                                   |  3751 | `namespace-declaration` | **optional**    |
| `effect/Schema.Record.Type`                                  |  3769 | `namespace-declaration` | **optional**    |
| `effect/Schema.Record.Iso`                                   |  3783 | `namespace-declaration` | **optional**    |
| `effect/Schema.Record.Encoded`                               |  3802 | `namespace-declaration` | **optional**    |
| `effect/Schema.Record.DecodingServices`                      |  3816 | `namespace-declaration` | **optional**    |
| `effect/Schema.Record.EncodingServices`                      |  3827 | `namespace-declaration` | **optional**    |
| `effect/Schema.Record.MakeIn`                                |  3843 | `namespace-declaration` | **optional**    |
| `effect/Schema.$Record`                                      |  3857 | `root-declaration`      | **optional**    |
| `effect/Schema.StructWithRest (type) (type)`                 |  3928 | `namespace`             | **optional**    |
| `effect/Schema.StructWithRest.Objects`                       |  3936 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest.Records`                       |  3945 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest.Type`                          |  3966 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest.Iso`                           |  3975 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest.Encoded`                       |  3984 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest.MakeIn`                        |  3994 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest.DecodingServices`              |  4011 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest.EncodingServices`              |  4024 | `namespace-declaration` | **optional**    |
| `effect/Schema.StructWithRest (type) (type)`                 |  4097 | `root-declaration`      | **optional**    |
| `effect/Schema.Tuple (type) (type)`                          |  4167 | `namespace`             | **optional**    |
| `effect/Schema.Tuple.Elements`                               |  4175 | `namespace-declaration` | **optional**    |
| `effect/Schema.Tuple.Type`                                   |  4198 | `namespace-declaration` | **optional**    |
| `effect/Schema.Tuple.Iso`                                    |  4217 | `namespace-declaration` | **optional**    |
| `effect/Schema.Tuple.Encoded`                                |  4240 | `namespace-declaration` | **optional**    |
| `effect/Schema.Tuple.DecodingServices`                       |  4249 | `namespace-declaration` | **optional**    |
| `effect/Schema.Tuple.EncodingServices`                       |  4258 | `namespace-declaration` | **optional**    |
| `effect/Schema.Tuple.MakeIn`                                 |  4283 | `namespace-declaration` | **optional**    |
| `effect/Schema.Tuple (type) (type)`                          |  4292 | `root-declaration`      | **optional**    |
| `effect/Schema.Tuple.mapElements`                            |  4322 | `member`                | **optional**    |
| `effect/Schema.TupleWithRest (type) (type)`                  |  4378 | `namespace`             | **optional**    |
| `effect/Schema.TupleWithRest.TupleType`                      |  4386 | `namespace-declaration` | **optional**    |
| `effect/Schema.TupleWithRest.Rest`                           |  4405 | `namespace-declaration` | **optional**    |
| `effect/Schema.TupleWithRest.Type`                           |  4419 | `namespace-declaration` | **optional**    |
| `effect/Schema.TupleWithRest.Iso`                            |  4439 | `namespace-declaration` | **optional**    |
| `effect/Schema.TupleWithRest.Encoded`                        |  4459 | `namespace-declaration` | **optional**    |
| `effect/Schema.TupleWithRest.MakeIn`                         |  4479 | `namespace-declaration` | **optional**    |
| `effect/Schema.TupleWithRest (type) (type)`                  |  4494 | `root-declaration`      | **optional**    |
| `effect/Schema.$Array`                                       |  4555 | `root-declaration`      | **optional**    |
| `effect/Schema.NonEmptyArray`                                |  4610 | `root-declaration`      | **optional**    |
| `effect/Schema.UniqueArray (type)`                           |  4704 | `root-declaration`      | **optional**    |
| `effect/Schema.Union`                                        |  4789 | `root-declaration`      | **optional**    |
| `effect/Schema.Union.mapMembers`                             |  4819 | `member`                | **optional**    |
| `effect/Schema.Literals`                                     |  4886 | `root-declaration`      | **optional**    |
| `effect/Schema.Literals.mapMembers`                          |  4894 | `member`                | **optional**    |
| `effect/Schema.NullOr (type)`                                |  4947 | `root-declaration`      | **optional**    |
| `effect/Schema.UndefinedOr (type)`                           |  4970 | `root-declaration`      | **optional**    |
| `effect/Schema.NullishOr (type)`                             |  4993 | `root-declaration`      | **optional**    |
| `effect/Schema.suspend`                                      |  5016 | `root-declaration`      | **optional**    |
| `effect/Schema.WithoutConstructorDefault`                    |  5711 | `root-declaration`      | **optional**    |
| `effect/Schema.TaggedStruct`                                 |  6091 | `root-declaration`      | **optional**    |
| `effect/Schema.TaggedUnion`                                  |  6298 | `root-declaration`      | **optional**    |
| `effect/Schema.Opaque`                                       |  6375 | `root-declaration`      | **optional**    |
| `effect/Schema.instanceOf`                                   |  6433 | `root-declaration`      | **optional**    |
| `effect/Schema.FilterIssue`                                  |  6567 | `root-declaration`      | **optional**    |
| `effect/Schema.FilterOutput`                                 |  6595 | `root-declaration`      | **optional**    |
| `effect/Schema.ErrorOptions.includeStack`                    | 10578 | `member`                | **optional**    |
| `effect/Schema.ErrorOptions.excludeCause`                    | 10585 | `member`                | **optional**    |
| `effect/Schema.fromJsonString`                               | 12381 | `root-declaration`      | **optional**    |
| `effect/Schema.Class`                                        | 13938 | `root-declaration`      | **optional**    |
| `effect/Schema.Class.mapFields`                              | 13982 | `member`                | **optional**    |
| `effect/Schema.Class.extend`                                 | 14010 | `member`                | **optional**    |
| `effect/Schema.ToJsonSchemaOptions.additionalProperties`     | 14830 | `member`                | **optional**    |
| `effect/Schema.ToJsonSchemaOptions.generateDescriptions`     | 14835 | `member`                | **optional**    |
| `effect/Schema.Json`                                         | 15879 | `root-declaration`      | **optional**    |
| `effect/Schema.JsonArray`                                    | 15887 | `root-declaration`      | **optional**    |
| `effect/Schema.JsonObject`                                   | 15895 | `root-declaration`      | **optional**    |
| `effect/Schema.MutableJson (type)`                           | 15952 | `root-declaration`      | **optional**    |
| `effect/Schema.MutableJsonArray`                             | 15960 | `root-declaration`      | **optional**    |
| `effect/Schema.MutableJsonObject`                            | 15968 | `root-declaration`      | **optional**    |
| `effect/Schema.Annotations`                                  | 16046 | `namespace`             | **optional**    |
| `effect/Schema.Annotations.Augment`                          | 16100 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Augment.expected`                 | 16112 | `member`                | **optional**    |
| `effect/Schema.Annotations.Documentation`                    | 16130 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Key`                              | 16143 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Key.messageMissingKey`            | 16147 | `member`                | **optional**    |
| `effect/Schema.Annotations.Bottom`                           | 16159 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Bottom.message`                   | 16171 | `member`                | **optional**    |
| `effect/Schema.Annotations.Bottom.messageUnexpectedKey`      | 16175 | `member`                | **optional**    |
| `effect/Schema.Annotations.Bottom.identifier`                | 16190 | `member`                | **optional**    |
| `effect/Schema.Annotations.Bottom.brands`                    | 16195 | `member`                | **optional**    |
| `effect/Schema.Annotations.TypeParameters`                   | 16207 | `namespace`             | **optional**    |
| `effect/Schema.Annotations.TypeParameters.Type`              | 16215 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.TypeParameters.Encoded`           | 16224 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Declaration`                      | 16239 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Declaration."~sentinels"`         | 16268 | `member`                | **optional**    |
| `effect/Schema.Annotations.Filter`                           | 16279 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Filter.message`                   | 16293 | `member`                | **optional**    |
| `effect/Schema.Annotations.Filter.identifier`                | 16304 | `member`                | **optional**    |
| `effect/Schema.Annotations.Filter.arbitrary`                 | 16314 | `member`                | **optional**    |
| `effect/Schema.Annotations.Filter."~structural"`             | 16328 | `member`                | **optional**    |
| `effect/Schema.Annotations.ToArbitrary`                      | 16338 | `namespace`             | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Filter`               | 16353 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Candidate`            | 16373 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.OrderedConstraint`    | 16393 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.GenerationConstraint` | 16422 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Recursion`            | 16445 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Context`              | 16463 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.TypeParameter`        | 16481 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Derivation`           | 16498 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Output`               | 16515 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Declaration`          | 16530 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.WithReport`           | 16543 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Report`               | 16560 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.Warning`              | 16570 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToArbitrary.OpaqueFilterWarning`  | 16583 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToFormatter`                      | 16596 | `namespace`             | **optional**    |
| `effect/Schema.Annotations.ToFormatter.Declaration`          | 16607 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.ToEquivalence`                    | 16621 | `namespace`             | **optional**    |
| `effect/Schema.Annotations.ToEquivalence.Declaration`        | 16632 | `namespace-declaration` | **optional**    |
| `effect/Schema.Annotations.Issue`                            | 16650 | `namespace-declaration` | **optional**    |
| `effect/Schema.Symbol (type)`                                |  3150 | `root-declaration`      | **optional**    |
| `effect/Schema.Symbol (value)`                               |  3159 | `root-declaration`      | **optional**    |

## Recommended

### `effect/Schema.declareConstructor (value)`

- **Source:** `packages/effect/src/Schema.ts:483`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a schema for a **parametric** type (a generic container such as `Array<A>`, `Option<A>`, etc.) by accepting a list of type-parameter schemas and a decoder factory.
- **Signature hint:** `declare function declareConstructor<T, E = T, Iso = T>(): <const TypeParameters extends ReadonlyArray<Constraint>>(typeParameters: TypeParameters, run: (typeParameters: { readonly [K in keyof TypeParameters]: Codec<TypeParameters[K]['Type'], TypeParameters[K]['Encoded']>; }) => (u: unknown, self: SchemaAST.Declaration, options: SchemaAST.ParseOptions) => Effect.Effect<T, SchemaIssue.Issue>, annotations?: Annotations.Declaration<T, TypeParameters>) => declareConstructor<T, E, TypeParameters, Iso>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.declareConstructor`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.declareConstructor`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.toStandardJSONSchemaV1`

- **Source:** `packages/effect/src/Schema.ts:1346`
- **Kind / category:** `root-declaration` / `Standard Schema`
- **Priority:** **recommended**
- **Current description:** Converts a schema to an experimental Standard JSON Schema V1 representation.
- **Signature hint:** `declare function toStandardJSONSchemaV1<S extends Constraint>(self: S): StandardJSONSchemaV1<S['Encoded'], S['Type']> & S`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toStandardJSONSchemaV1`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toStandardJSONSchemaV1`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.decodeUnknownEffect`

- **Source:** `packages/effect/src/Schema.ts:1481`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes an `unknown` input against a schema, returning an `Effect` that succeeds with the decoded value or fails with a `SchemaError`.
- **Signature hint:** `declare function decodeUnknownEffect<S extends Constraint>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Effect.Effect<S['Type'], SchemaError, S['DecodingServices']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeUnknownEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Schema.decodeUnknownEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.decodeEffect`

- **Source:** `packages/effect/src/Schema.ts:1512`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes a typed input (the schema's `Encoded` type) against a schema, returning an `Effect` that succeeds with the decoded value or fails with a `SchemaError`.
- **Signature hint:** `declare function decodeEffect<S extends Constraint>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Effect.Effect<S['Type'], SchemaError, S['DecodingServices']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Schema.decodeEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.decodeUnknownExit`

- **Source:** `packages/effect/src/Schema.ts:1588`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Decodes an `unknown` input against a schema synchronously, returning an `Exit` that is either a `Success` with the decoded value or a `Failure`.
- **Signature hint:** `declare function decodeUnknownExit<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Exit_.Exit<S['Type'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeUnknownExit`.
- **Suggested snippet:** Call `Schema.decodeUnknownExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.encodeEffect`

- **Source:** `packages/effect/src/Schema.ts:1973`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Encodes a typed input (the schema's `Type`) against a schema, returning an `Effect` that succeeds with the encoded value or fails with a `SchemaError`.
- **Signature hint:** `declare function encodeEffect<S extends Constraint>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Effect.Effect<S['Encoded'], SchemaError, S['EncodingServices']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Schema.encodeEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.encodeUnknownExit`

- **Source:** `packages/effect/src/Schema.ts:2010`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Encodes an `unknown` input against a schema synchronously, returning an `Exit` that is either a `Success` with the encoded value or a `Failure`.
- **Signature hint:** `declare function encodeUnknownExit<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Exit_.Exit<S['Encoded'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeUnknownExit`.
- **Suggested snippet:** Call `Schema.encodeUnknownExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.encodeExit`

- **Source:** `packages/effect/src/Schema.ts:2047`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **recommended**
- **Current description:** Encodes a typed input (the schema's `Type`) against a schema synchronously, returning an `Exit` that is either a `Success` with the encoded value or a `Failure`.
- **Signature hint:** `declare function encodeExit<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Exit_.Exit<S['Encoded'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeExit`.
- **Suggested snippet:** Call `Schema.encodeExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.make`

- **Source:** `packages/effect/src/Schema.ts:2330`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a schema from an AST (Abstract Syntax Tree) node.
- **Signature hint:** `declare function make<S extends Constraint>(ast: S['ast'], options?: object): S`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.make`.
- **Suggested snippet:** Construct one representative value with `Schema.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.isSchema`

- **Source:** `packages/effect/src/Schema.ts:2338`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a value is a `Schema`.
- **Signature hint:** `declare function isSchema(u: unknown): u is Top`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isSchema`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Schema.isSchema` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.requiredKey`

- **Source:** `packages/effect/src/Schema.ts:2418`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Reverses `optionalKey` and returns the inner required schema.
- **Signature hint:** `declare function requiredKey<S extends Constraint>(self: optionalKey<S>): S`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.requiredKey`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Reverses `optionalKey` and returns the inner required schema. Call `Schema.requiredKey` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.required`

- **Source:** `packages/effect/src/Schema.ts:2487`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Reverses `optional` and returns the inner schema.
- **Signature hint:** `declare function required<S extends Constraint>(self: optional<S>): S`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.required`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Reverses `optional` and returns the inner schema. Call `Schema.required` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.mutableKey (value)`

- **Source:** `packages/effect/src/Schema.ts:2529`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Makes a struct field mutable (removes the `readonly` modifier on the property). Use `readonlyKey` to reverse.
- **Signature hint:** `declare function mutableKey<S extends Constraint>(self: S): mutableKey<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.mutableKey`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.mutableKey`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.readonlyKey`

- **Source:** `packages/effect/src/Schema.ts:2550`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Reverses `mutableKey` and returns the inner readonly schema.
- **Signature hint:** `declare function readonlyKey<S extends Constraint>(self: mutableKey<S>): S`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.readonlyKey`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Reverses `mutableKey` and returns the inner readonly schema. Call `Schema.readonlyKey` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.toType (value)`

- **Source:** `packages/effect/src/Schema.ts:2592`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Extracts the type-side schema: sets `Encoded` to equal the decoded `Type`, discarding the encoding transformation path.
- **Signature hint:** `declare function toType<S extends Constraint>(self: S): toType<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toType`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.toType`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.toEncoded (value)`

- **Source:** `packages/effect/src/Schema.ts:2634`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **recommended**
- **Current description:** Extracts the encoded-side schema: sets `Type` to equal the `Encoded`, discarding the decoding transformation path.
- **Signature hint:** `declare function toEncoded<S extends Constraint>(self: S): toEncoded<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toEncoded`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.toEncoded`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.Never (value)`

- **Source:** `packages/effect/src/Schema.ts:3007`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for the `never` type. Always fails validation — no value satisfies it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Never`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Never`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.Any (value)`

- **Source:** `packages/effect/src/Schema.ts:3024`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for the `any` type. Accepts any value without validation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Any`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Any`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.Unknown (value)`

- **Source:** `packages/effect/src/Schema.ts:3046`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for the `unknown` type. Accepts any value without validation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Unknown`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Unknown`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.Boolean (value)`

- **Source:** `packages/effect/src/Schema.ts:3142`
- **Kind / category:** `root-declaration` / `boolean`
- **Priority:** **recommended**
- **Current description:** Schema for `boolean` values. Validates that the input is `typeof` `"boolean"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Boolean`.
- **Suggested snippet:** Use `Schema.Boolean` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.ArrayEnsure (value)`

- **Source:** `packages/effect/src/Schema.ts:4688`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a schema that accepts either a value decoded by `schema` or an array decoded by `Schema.Array(schema)`, then returns an array.
- **Signature hint:** `declare function ArrayEnsure<S extends Constraint>(schema: S): ArrayEnsure<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ArrayEnsure`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.ArrayEnsure`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.UniqueArray (value)`

- **Source:** `packages/effect/src/Schema.ts:4719`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Returns a new array schema that ensures all elements are unique.
- **Signature hint:** `declare function UniqueArray<S extends Constraint>(item: S): UniqueArray<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.UniqueArray`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.UniqueArray`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.NullOr (value)`

- **Source:** `packages/effect/src/Schema.ts:4962`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a union schema of `S | null`.
- **Signature hint:** `declare function NullOr<S extends Constraint>(self: S): NullOr<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.NullOr`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.NullOr`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.UndefinedOr (value)`

- **Source:** `packages/effect/src/Schema.ts:4985`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a union schema of `S | undefined`.
- **Signature hint:** `declare function UndefinedOr<S extends Constraint>(self: S): UndefinedOr<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.UndefinedOr`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.UndefinedOr`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Schema.NullishOr (value)`

- **Source:** `packages/effect/src/Schema.ts:5008`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a union schema of `S | null | undefined`.
- **Signature hint:** `declare function NullishOr<S extends Constraint>(self: S): NullishOr<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.NullishOr`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.NullishOr`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Schema.MakeOptions`

- **Source:** `packages/effect/src/Schema.ts:118`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for `makeEffect`, `make`, and Class constructors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.MakeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.declareConstructor (type)`

- **Source:** `packages/effect/src/Schema.ts:414`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `declareConstructor`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.declareConstructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.declare`

- **Source:** `packages/effect/src/Schema.ts:513`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `declare`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.declare`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeExit`

- **Source:** `packages/effect/src/Schema.ts:1631`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes a typed input (the schema's `Encoded` type) against a schema synchronously, returning an `Exit` that is either a `Success` with the decoded value or a `Failure`.
- **Signature hint:** `declare function decodeExit<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Exit_.Exit<S['Type'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeExit`.
- **Suggested snippet:** Call `Schema.decodeExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeUnknownOption`

- **Source:** `packages/effect/src/Schema.ts:1662`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes an `unknown` input against a schema, returning an `Option` that is `Some` with the decoded value on success or `None` for schema mismatches.
- **Signature hint:** `declare function decodeUnknownOption<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Option_.Option<S['Type']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeUnknownOption`.
- **Suggested snippet:** Call `Schema.decodeUnknownOption` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeOption`

- **Source:** `packages/effect/src/Schema.ts:1692`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes a typed input (the schema's `Encoded` type) against a schema, returning an `Option` that is `Some` with the decoded value on success or `None` for schema mismatches.
- **Signature hint:** `declare function decodeOption<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Option_.Option<S['Type']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeOption`.
- **Suggested snippet:** Call `Schema.decodeOption` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeUnknownResult`

- **Source:** `packages/effect/src/Schema.ts:1726`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes an `unknown` input against a schema, returning a `Result` that succeeds with the decoded value or fails with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function decodeUnknownResult<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Result_.Result<S['Type'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeUnknownResult`.
- **Suggested snippet:** Call `Schema.decodeUnknownResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeResult`

- **Source:** `packages/effect/src/Schema.ts:1761`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes a typed input (the schema's `Encoded` type) against a schema, returning a `Result` that succeeds with the decoded value or fails with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function decodeResult<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Result_.Result<S['Type'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeResult`.
- **Suggested snippet:** Call `Schema.decodeResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeUnknownPromise`

- **Source:** `packages/effect/src/Schema.ts:1794`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes an `unknown` input against a schema, returning a `Promise` that resolves with the decoded value or rejects with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function decodeUnknownPromise<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Promise<S['Type']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeUnknownPromise`.
- **Suggested snippet:** Convert one representative external input with `Schema.decodeUnknownPromise` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodePromise`

- **Source:** `packages/effect/src/Schema.ts:1831`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes a typed input (the schema's `Encoded` type) against a schema, returning a `Promise` that resolves with the decoded value or rejects with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function decodePromise<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => Promise<S['Type']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodePromise`.
- **Suggested snippet:** Convert one representative external input with `Schema.decodePromise` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeSync`

- **Source:** `packages/effect/src/Schema.ts:1906`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Decodes a typed input (the schema's `Encoded` type) against a schema synchronously, returning the decoded value or throwing a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function decodeSync<S extends ConstraintDecoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Encoded'], options?: SchemaAST.ParseOptions) => S['Type']`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.decodeSync`.
- **Suggested snippet:** Convert one representative external input with `Schema.decodeSync` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeUnknownOption`

- **Source:** `packages/effect/src/Schema.ts:2078`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes an `unknown` input against a schema, returning an `Option` that is `Some` with the encoded value on success or `None` for schema mismatches.
- **Signature hint:** `declare function encodeUnknownOption<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Option_.Option<S['Encoded']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeUnknownOption`.
- **Suggested snippet:** Call `Schema.encodeUnknownOption` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeOption`

- **Source:** `packages/effect/src/Schema.ts:2109`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes a typed input (the schema's `Type`) against a schema, returning an `Option` that is `Some` with the encoded value on success or `None` for schema mismatches.
- **Signature hint:** `declare function encodeOption<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Option_.Option<S['Encoded']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeOption`.
- **Suggested snippet:** Call `Schema.encodeOption` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeUnknownResult`

- **Source:** `packages/effect/src/Schema.ts:2142`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes an `unknown` input against a schema, returning a `Result` that succeeds with the encoded value or fails with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function encodeUnknownResult<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Result_.Result<S['Encoded'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeUnknownResult`.
- **Suggested snippet:** Call `Schema.encodeUnknownResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeResult`

- **Source:** `packages/effect/src/Schema.ts:2177`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes a typed input (the schema's `Type`) against a schema, returning a `Result` that succeeds with the encoded value or fails with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function encodeResult<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Result_.Result<S['Encoded'], SchemaError>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeResult`.
- **Suggested snippet:** Call `Schema.encodeResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeUnknownPromise`

- **Source:** `packages/effect/src/Schema.ts:2209`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes an `unknown` input against a schema, returning a `Promise` that resolves with the encoded value or rejects with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function encodeUnknownPromise<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => Promise<S['Encoded']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeUnknownPromise`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.encodeUnknownPromise`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodePromise`

- **Source:** `packages/effect/src/Schema.ts:2246`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes a typed input (the schema's `Type`) against a schema, returning a `Promise` that resolves with the encoded value or rejects with a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function encodePromise<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => Promise<S['Encoded']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodePromise`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.encodePromise`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeUnknownSync`

- **Source:** `packages/effect/src/Schema.ts:2277`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes an `unknown` input against a schema synchronously, throwing a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function encodeUnknownSync<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: unknown, options?: SchemaAST.ParseOptions) => S['Encoded']`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeUnknownSync`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.encodeUnknownSync`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeSync`

- **Source:** `packages/effect/src/Schema.ts:2308`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Encodes a typed input (the schema's `Type`) against a schema synchronously, throwing a `SchemaError` for schema mismatches.
- **Signature hint:** `declare function encodeSync<S extends ConstraintEncoder<unknown>>(schema: S, options?: SchemaAST.ParseOptions): (input: S['Type'], options?: SchemaAST.ParseOptions) => S['Encoded']`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.encodeSync`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.encodeSync`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toType (type)`

- **Source:** `packages/effect/src/Schema.ts:2558`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `toType`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.toType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toEncoded (type)`

- **Source:** `packages/effect/src/Schema.ts:2600`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `toEncoded`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.toEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.flip`

- **Source:** `packages/effect/src/Schema.ts:2644`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `flip`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.flip`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Null (value)`

- **Source:** `packages/effect/src/Schema.ts:3063`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for the `null` literal. Validates that the input is strictly `null`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Null`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Null`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Undefined (value)`

- **Source:** `packages/effect/src/Schema.ts:3080`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for the `undefined` literal. Validates that the input is strictly `undefined`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Undefined`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Undefined`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.String (value)`

- **Source:** `packages/effect/src/Schema.ts:3096`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for `string` values. Validates that the input is `typeof` `"string"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.String`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.String`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Number (value)`

- **Source:** `packages/effect/src/Schema.ts:3120`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for `number` values, including `NaN`, `Infinity`, and `-Infinity`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Number`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Number`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigInt (value)`

- **Source:** `packages/effect/src/Schema.ts:3182`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for `bigint` values. Validates that the input is `typeof` `"bigint"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.BigInt`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.BigInt`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Void (value)`

- **Source:** `packages/effect/src/Schema.ts:3211`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a TypeScript `void` return value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Void`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Void`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ObjectKeyword (value)`

- **Source:** `packages/effect/src/Schema.ts:3228`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for the `object` type. Validates that the input is a non-null object or function (i.e. `typeof value === "object" && value !== null || typeof value === "function"`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ObjectKeyword`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.ObjectKeyword`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.encodeKeys`

- **Source:** `packages/effect/src/Schema.ts:3582`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `encodeKeys`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.encodeKeys`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ArrayEnsure (type)`

- **Source:** `packages/effect/src/Schema.ts:4658`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `ArrayEnsure`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ArrayEnsure`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.mutable`

- **Source:** `packages/effect/src/Schema.ts:4729`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `mutable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.mutable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.refine (type)`

- **Source:** `packages/effect/src/Schema.ts:5097`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `refine`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.refine`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.refine (value)`

- **Source:** `packages/effect/src/Schema.ts:5134`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **optional**
- **Current description:** Narrows the TypeScript type of a schema's output via a type guard predicate, attaching the guard as a runtime filter check.
- **Signature hint:** `declare function refine<S extends Constraint, T extends S['Type']>(refinement: (value: S['Type']) => value is T, annotations?: Annotations.Filter): (schema: S) => refine<T, S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.refine`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.refine`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.brand (type)`

- **Source:** `packages/effect/src/Schema.ts:5150`
- **Kind / category:** `root-declaration` / `branding`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `brand`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.brand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.brand (value)`

- **Source:** `packages/effect/src/Schema.ts:5192`
- **Kind / category:** `root-declaration` / `branding`
- **Priority:** **optional**
- **Current description:** Adds a nominal brand to a schema, intersecting the output type with `Brand.Brand<B>` to prevent accidental mixing of structurally identical types.
- **Signature hint:** `declare function brand<B extends string>(identifier: B): <S extends ConstraintRebuildable>(schema: S) => brand<S['Rebuild'], B>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.brand`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.brand`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.fromBrand`

- **Source:** `packages/effect/src/Schema.ts:5204`
- **Kind / category:** `root-declaration` / `branding`
- **Priority:** **optional**
- **Current description:** Creates a branded schema from a `Brand.Constructor`, applying the constructor's checks and brand tag to the underlying schema.
- **Signature hint:** `declare function fromBrand<A extends Brand.Brand<any>>(identifier: string, ctor: Brand.Constructor<A>): <S extends Top & { readonly 'Type': Brand.Brand.Unbranded<A>; }>(self: S) => brand<S['Rebuild'], Brand.Brand.Keys<A>>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.fromBrand`.
- **Suggested snippet:** Convert one representative external input with `Schema.fromBrand` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.middlewareDecoding`

- **Source:** `packages/effect/src/Schema.ts:5218`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `middlewareDecoding`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.middlewareDecoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.middlewareEncoding`

- **Source:** `packages/effect/src/Schema.ts:5285`
- **Kind / category:** `root-declaration` / `encoding`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `middlewareEncoding`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.middlewareEncoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.catchDecodingWithContext`

- **Source:** `packages/effect/src/Schema.ts:5395`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Recovers from a decoding error with a handler that may require Effect services.
- **Signature hint:** `declare function catchDecodingWithContext<S extends Constraint, R = never>(f: (issue: SchemaIssue.Issue) => Effect.Effect<Option_.Option<S['Type']>, SchemaIssue.Issue, R>): (self: S) => middlewareDecoding<S, S['DecodingServices'] | R>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.catchDecodingWithContext`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Recovers from a decoding error with a handler that may require Effect services. Call `Schema.catchDecodingWithContext` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.catchEncoding`

- **Source:** `packages/effect/src/Schema.ts:5414`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Recovers from an encoding error by providing a fallback value.
- **Signature hint:** `declare function catchEncoding<S extends Constraint>(f: (issue: SchemaIssue.Issue) => Effect.Effect<Option_.Option<S['Encoded']>, SchemaIssue.Issue>): (self: S) => middlewareEncoding<S, S['EncodingServices']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.catchEncoding`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Recovers from an encoding error by providing a fallback value. Call `Schema.catchEncoding` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.catchEncodingWithContext`

- **Source:** `packages/effect/src/Schema.ts:5440`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Recovers from an encoding error with a handler that may require Effect services.
- **Signature hint:** `declare function catchEncodingWithContext<S extends Constraint, R = never>(f: (issue: SchemaIssue.Issue) => Effect.Effect<Option_.Option<S['Encoded']>, SchemaIssue.Issue, R>): (self: S) => middlewareEncoding<S, S['EncodingServices'] | R>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.catchEncodingWithContext`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Recovers from an encoding error with a handler that may require Effect services. Call `Schema.catchEncodingWithContext` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.decodeTo`

- **Source:** `packages/effect/src/Schema.ts:5453`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `decodeTo`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.decodeTo`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.compose`

- **Source:** `packages/effect/src/Schema.ts:5482`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `decodeTo` without a custom transformation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.compose`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.withConstructorDefault`

- **Source:** `packages/effect/src/Schema.ts:5721`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `withConstructorDefault`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.withConstructorDefault`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.withDecodingDefaultKey`

- **Source:** `packages/effect/src/Schema.ts:5790`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `withDecodingDefaultKey`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.withDecodingDefaultKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DecodingDefaultOptions`

- **Source:** `packages/effect/src/Schema.ts:5808`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for `withDecodingDefaultKey` and `withDecodingDefault`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DecodingDefaultOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.withDecodingDefaultTypeKey (type)`

- **Source:** `packages/effect/src/Schema.ts:5864`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `withDecodingDefaultTypeKey`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.withDecodingDefaultTypeKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.withDecodingDefaultTypeKey (value)`

- **Source:** `packages/effect/src/Schema.ts:5892`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Makes a struct key optional on the `Encoded` side (`optionalKey`, so the key may be absent but **not** `undefined`) and provides a default `Type` value when the key is missing during decoding.
- **Signature hint:** `declare function withDecodingDefaultTypeKey<S extends Constraint, R = never>(defaultValue: Effect.Effect<S['Type'], SchemaError, R>, options?: DecodingDefaultOptions): (self: S) => withDecodingDefaultTypeKey<S, R>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.withDecodingDefaultTypeKey`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.withDecodingDefaultTypeKey`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.withDecodingDefault`

- **Source:** `packages/effect/src/Schema.ts:5910`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `withDecodingDefault`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.withDecodingDefault`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.withDecodingDefaultType (type)`

- **Source:** `packages/effect/src/Schema.ts:5971`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `withDecodingDefaultType`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.withDecodingDefaultType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.withDecodingDefaultType (value)`

- **Source:** `packages/effect/src/Schema.ts:6004`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **optional**
- **Current description:** Wraps the `Encoded` side with `optional` (key absent **or** `undefined`) and provides a default `Type` value when the field is missing or `undefined` during decoding.
- **Signature hint:** `declare function withDecodingDefaultType<S extends Constraint, R = never>(defaultValue: Effect.Effect<S['Type'], SchemaError, R>, options?: DecodingDefaultOptions): (self: S) => withDecodingDefaultType<S, R>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.withDecodingDefaultType`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.withDecodingDefaultType`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.tag`

- **Source:** `packages/effect/src/Schema.ts:6022`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `tag`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.tag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toTaggedUnion`

- **Source:** `packages/effect/src/Schema.ts:6196`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `toTaggedUnion`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.toTaggedUnion`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.link`

- **Source:** `packages/effect/src/Schema.ts:6469`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Constructs an `SchemaAST.Link` that describes how a value of type `T` encodes to and decodes from a `To` schema. Used when building low-level AST transformations that bridge two schema types.
- **Signature hint:** `declare function link<T>(): <To extends Constraint>(encodeTo: To, transformation: { readonly decode: SchemaGetter.Getter<T, NoInfer<To['Type']>>; readonly encode: SchemaGetter.Getter<NoInfer<To['Type']>, T>; }) => SchemaAST.Link`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.link`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs an `SchemaAST.Link` that describes how a value of type `T` encodes to and decodes from a `To` schema. Used when building low-level AST transformations that bridge two schema types. Call `Schema.link` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.makeFilterGroup`

- **Source:** `packages/effect/src/Schema.ts:6608`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Groups multiple checks into a single `SchemaAST.FilterGroup`, applying optional shared annotations to the group as a whole.
- **Signature hint:** `declare function makeFilterGroup<T>(checks: readonly [SchemaAST.Check<T>, ...Array<SchemaAST.Check<T>>], annotations?: Annotations.Filter | undefined): SchemaAST.FilterGroup<T>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.makeFilterGroup`.
- **Suggested snippet:** Construct one representative value with `Schema.makeFilterGroup`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isTrimmed`

- **Source:** `packages/effect/src/Schema.ts:6646`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string has no leading or trailing whitespace.
- **Signature hint:** `declare function isTrimmed(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isTrimmed`.
- **Suggested snippet:** Attach the check returned by `Schema.isTrimmed` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isTrimmedReviver`

- **Source:** `packages/effect/src/Schema.ts:6680`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isTrimmed` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isTrimmedReviver`.
- **Suggested snippet:** Use `Schema.isTrimmedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isPattern`

- **Source:** `packages/effect/src/Schema.ts:6703`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string matches the specified regular expression pattern.
- **Signature hint:** `declare function isPattern(regExp: globalThis.RegExp, annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isPattern`.
- **Suggested snippet:** Attach the check returned by `Schema.isPattern` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isPatternReviver`

- **Source:** `packages/effect/src/Schema.ts:6740`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isPattern` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isPatternReviver`.
- **Suggested snippet:** Use `Schema.isPatternReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStringFinite`

- **Source:** `packages/effect/src/Schema.ts:6767`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string represents a finite number.
- **Signature hint:** `declare function isStringFinite(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStringFinite`.
- **Suggested snippet:** Attach the check returned by `Schema.isStringFinite` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStringFiniteReviver`

- **Source:** `packages/effect/src/Schema.ts:6786`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isStringFinite` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStringFiniteReviver`.
- **Suggested snippet:** Use `Schema.isStringFiniteReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStringBigInt`

- **Source:** `packages/effect/src/Schema.ts:6809`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string is a signed base-10 integer literal for Effect's BigInt string encoding.
- **Signature hint:** `declare function isStringBigInt(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStringBigInt`.
- **Suggested snippet:** Attach the check returned by `Schema.isStringBigInt` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStringBigIntReviver`

- **Source:** `packages/effect/src/Schema.ts:6828`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isStringBigInt` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStringBigIntReviver`.
- **Suggested snippet:** Use `Schema.isStringBigIntReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStringSymbol`

- **Source:** `packages/effect/src/Schema.ts:6846`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string has the `Symbol(description)` format used by Effect's symbol string encoding.
- **Signature hint:** `declare function isStringSymbol(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStringSymbol`.
- **Suggested snippet:** Attach the check returned by `Schema.isStringSymbol` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStringSymbolReviver`

- **Source:** `packages/effect/src/Schema.ts:6865`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isStringSymbol` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStringSymbolReviver`.
- **Suggested snippet:** Use `Schema.isStringSymbolReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUUID`

- **Source:** `packages/effect/src/Schema.ts:6915`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string is a strict Universally Unique Identifier (UUID).
- **Signature hint:** `declare function isUUID(version?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUUID`.
- **Suggested snippet:** Attach the check returned by `Schema.isUUID` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUUIDReviver`

- **Source:** `packages/effect/src/Schema.ts:6944`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isUUID` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUUIDReviver`.
- **Suggested snippet:** Use `Schema.isUUIDReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGUID`

- **Source:** `packages/effect/src/Schema.ts:6978`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string has the GUID / UUID textual shape.
- **Signature hint:** `declare function isGUID(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGUID`.
- **Suggested snippet:** Attach the check returned by `Schema.isGUID` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGUIDReviver`

- **Source:** `packages/effect/src/Schema.ts:7006`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isGUID` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGUIDReviver`.
- **Suggested snippet:** Use `Schema.isGUIDReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isULID`

- **Source:** `packages/effect/src/Schema.ts:7031`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string is a valid ULID (Universally Unique Lexicographically Sortable Identifier).
- **Signature hint:** `declare function isULID(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isULID`.
- **Suggested snippet:** Attach the check returned by `Schema.isULID` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isULIDReviver`

- **Source:** `packages/effect/src/Schema.ts:7059`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isULID` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isULIDReviver`.
- **Suggested snippet:** Use `Schema.isULIDReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBase64`

- **Source:** `packages/effect/src/Schema.ts:7083`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string is valid Base64 encoded data.
- **Signature hint:** `declare function isBase64(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBase64`.
- **Suggested snippet:** Attach the check returned by `Schema.isBase64` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBase64Reviver`

- **Source:** `packages/effect/src/Schema.ts:7112`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isBase64` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBase64Reviver`.
- **Suggested snippet:** Use `Schema.isBase64Reviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBase64Url`

- **Source:** `packages/effect/src/Schema.ts:7137`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string is valid Base64URL encoded data (Base64 with URL-safe characters).
- **Signature hint:** `declare function isBase64Url(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBase64Url`.
- **Suggested snippet:** Attach the check returned by `Schema.isBase64Url` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBase64UrlReviver`

- **Source:** `packages/effect/src/Schema.ts:7166`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isBase64Url` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBase64UrlReviver`.
- **Suggested snippet:** Use `Schema.isBase64UrlReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStartsWith`

- **Source:** `packages/effect/src/Schema.ts:7183`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates at runtime that a string starts with the specified literal prefix.
- **Signature hint:** `declare function isStartsWith(startsWith: string, annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStartsWith`.
- **Suggested snippet:** Attach the check returned by `Schema.isStartsWith` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isStartsWithReviver`

- **Source:** `packages/effect/src/Schema.ts:7218`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isStartsWith` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isStartsWithReviver`.
- **Suggested snippet:** Use `Schema.isStartsWithReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isEndsWith`

- **Source:** `packages/effect/src/Schema.ts:7237`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates at runtime that a string ends with the specified literal suffix.
- **Signature hint:** `declare function isEndsWith(endsWith: string, annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isEndsWith`.
- **Suggested snippet:** Attach the check returned by `Schema.isEndsWith` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isEndsWithReviver`

- **Source:** `packages/effect/src/Schema.ts:7272`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isEndsWith` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isEndsWithReviver`.
- **Suggested snippet:** Use `Schema.isEndsWithReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isIncludes`

- **Source:** `packages/effect/src/Schema.ts:7292`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates at runtime that a string contains the specified literal substring.
- **Signature hint:** `declare function isIncludes(includes: string, annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isIncludes`.
- **Suggested snippet:** Attach the check returned by `Schema.isIncludes` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isIncludesReviver`

- **Source:** `packages/effect/src/Schema.ts:7327`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isIncludes` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isIncludesReviver`.
- **Suggested snippet:** Use `Schema.isIncludesReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUppercased`

- **Source:** `packages/effect/src/Schema.ts:7349`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string is unchanged by JavaScript's `toUpperCase()`.
- **Signature hint:** `declare function isUppercased(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUppercased`.
- **Suggested snippet:** Attach the check returned by `Schema.isUppercased` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUppercasedReviver`

- **Source:** `packages/effect/src/Schema.ts:7383`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isUppercased` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUppercasedReviver`.
- **Suggested snippet:** Use `Schema.isUppercasedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLowercased`

- **Source:** `packages/effect/src/Schema.ts:7403`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that a string is unchanged by JavaScript's `toLowerCase()`.
- **Signature hint:** `declare function isLowercased(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLowercased`.
- **Suggested snippet:** Attach the check returned by `Schema.isLowercased` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLowercasedReviver`

- **Source:** `packages/effect/src/Schema.ts:7437`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLowercased` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLowercasedReviver`.
- **Suggested snippet:** Use `Schema.isLowercasedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isCapitalized`

- **Source:** `packages/effect/src/Schema.ts:7457`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that the first character of a string is unchanged by `toUpperCase()`.
- **Signature hint:** `declare function isCapitalized(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isCapitalized`.
- **Suggested snippet:** Attach the check returned by `Schema.isCapitalized` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isCapitalizedReviver`

- **Source:** `packages/effect/src/Schema.ts:7491`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isCapitalized` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isCapitalizedReviver`.
- **Suggested snippet:** Use `Schema.isCapitalizedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUncapitalized`

- **Source:** `packages/effect/src/Schema.ts:7511`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Validates that the first character of a string is unchanged by `toLowerCase()`.
- **Signature hint:** `declare function isUncapitalized(annotations?: Annotations.Filter): SchemaAST.Filter<string>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUncapitalized`.
- **Suggested snippet:** Attach the check returned by `Schema.isUncapitalized` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUncapitalizedReviver`

- **Source:** `packages/effect/src/Schema.ts:7545`
- **Kind / category:** `root-declaration` / `String checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isUncapitalized` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUncapitalizedReviver`.
- **Suggested snippet:** Use `Schema.isUncapitalizedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Finite (type)`

- **Source:** `packages/effect/src/Schema.ts:7557`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Finite`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Finite`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Finite (value)`

- **Source:** `packages/effect/src/Schema.ts:7567`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Schema for finite numbers, rejecting `NaN`, `Infinity`, and `-Infinity`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Finite`.
- **Suggested snippet:** Use `Schema.Finite` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isFinite`

- **Source:** `packages/effect/src/Schema.ts:7587`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is finite (not `Infinity`, `-Infinity`, or `NaN`).
- **Signature hint:** `declare function isFinite(annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isFinite`.
- **Suggested snippet:** Attach the check returned by `Schema.isFinite` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isFiniteReviver`

- **Source:** `packages/effect/src/Schema.ts:7601`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isFinite` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isFiniteReviver`.
- **Suggested snippet:** Use `Schema.isFiniteReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.makeIsGreaterThan`

- **Source:** `packages/effect/src/Schema.ts:7614`
- **Kind / category:** `root-declaration` / `Order checks`
- **Priority:** **optional**
- **Current description:** Creates a greater-than (`>`) check for any ordered type from an `Order.Order` instance.
- **Signature hint:** `declare function makeIsGreaterThan<T>(options: { readonly order: Order.Order<T>; readonly annotate?: ((exclusiveMinimum: T) => Annotations.Filter) | undefined; readonly formatter?: Formatter<T> | undefined; }): (exclusiveMinimum: T, annotations?: Annotations.Filter) => SchemaAST.Filter<T>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.makeIsGreaterThan`.
- **Suggested snippet:** Construct one representative value with `Schema.makeIsGreaterThan`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.makeIsGreaterThanOrEqualTo`

- **Source:** `packages/effect/src/Schema.ts:7649`
- **Kind / category:** `root-declaration` / `Order checks`
- **Priority:** **optional**
- **Current description:** Creates a greater-than-or-equal-to (`>=`) check for any ordered type from an `Order.Order` instance.
- **Signature hint:** `declare function makeIsGreaterThanOrEqualTo<T>(options: { readonly order: Order.Order<T>; readonly annotate?: ((exclusiveMinimum: T) => Annotations.Filter) | undefined; readonly formatter?: Formatter<T> | undefined; }): (minimum: T, annotations?: Annotations.Filter) => SchemaAST.Filter<T>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.makeIsGreaterThanOrEqualTo`.
- **Suggested snippet:** Construct one representative value with `Schema.makeIsGreaterThanOrEqualTo`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.makeIsLessThan`

- **Source:** `packages/effect/src/Schema.ts:7683`
- **Kind / category:** `root-declaration` / `Order checks`
- **Priority:** **optional**
- **Current description:** Creates a less-than (`<`) check for any ordered type from an `Order.Order` instance.
- **Signature hint:** `declare function makeIsLessThan<T>(options: { readonly order: Order.Order<T>; readonly annotate?: ((exclusiveMaximum: T) => Annotations.Filter) | undefined; readonly formatter?: Formatter<T> | undefined; }): (exclusiveMaximum: T, annotations?: Annotations.Filter) => SchemaAST.Filter<T>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.makeIsLessThan`.
- **Suggested snippet:** Construct one representative value with `Schema.makeIsLessThan`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.makeIsLessThanOrEqualTo`

- **Source:** `packages/effect/src/Schema.ts:7718`
- **Kind / category:** `root-declaration` / `Order checks`
- **Priority:** **optional**
- **Current description:** Creates a less-than-or-equal-to (`<=`) check for any ordered type from an `Order.Order` instance.
- **Signature hint:** `declare function makeIsLessThanOrEqualTo<T>(options: { readonly order: Order.Order<T>; readonly annotate?: ((exclusiveMaximum: T) => Annotations.Filter) | undefined; readonly formatter?: Formatter<T> | undefined; }): (maximum: T, annotations?: Annotations.Filter) => SchemaAST.Filter<T>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.makeIsLessThanOrEqualTo`.
- **Suggested snippet:** Construct one representative value with `Schema.makeIsLessThanOrEqualTo`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.makeIsBetween`

- **Source:** `packages/effect/src/Schema.ts:7752`
- **Kind / category:** `root-declaration` / `Order checks`
- **Priority:** **optional**
- **Current description:** Creates an inclusive or exclusive range check for any ordered type from an `Order.Order` instance.
- **Signature hint:** `declare function makeIsBetween<T>(deriveOptions: { readonly order: Order.Order<T>; readonly annotate?: ((options: { readonly minimum: T; readonly maximum: T; readonly exclusiveMinimum?: boolean | undefined; readonly exclusiveMaximum?: boolean | undefined; }) => Annotations.Filter) | undefined; readonly formatter?: Formatter<T> | undefined; }): (options: { readonly minimum: T; readonly maximum: T; readonly exclusiveMinimum?: boolean | undefined; readonly exclusiveMaximum?: boolean | undefined; }, annotations?: Annotations.Filter) => SchemaAST.Filter<T>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.makeIsBetween`.
- **Suggested snippet:** Construct one representative value with `Schema.makeIsBetween`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.makeIsMultipleOf`

- **Source:** `packages/effect/src/Schema.ts:7808`
- **Kind / category:** `root-declaration` / `Numeric checks`
- **Priority:** **optional**
- **Current description:** Creates a divisibility check for any numeric type from a remainder function and a zero value.
- **Signature hint:** `declare function makeIsMultipleOf<T>(options: { readonly remainder: (input: T, divisor: T) => T; readonly zero: NoInfer<T>; readonly annotate?: ((divisor: T) => Annotations.Filter) | undefined; readonly formatter?: Formatter<T> | undefined; }): (divisor: T, annotations?: Annotations.Filter) => SchemaAST.Filter<T>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.makeIsMultipleOf`.
- **Suggested snippet:** Construct one representative value with `Schema.makeIsMultipleOf`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThan`

- **Source:** `packages/effect/src/Schema.ts:7852`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is greater than the specified value (exclusive).
- **Signature hint:** `declare function isGreaterThan(exclusiveMinimum: number, annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThan`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThan` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanReviver`

- **Source:** `packages/effect/src/Schema.ts:7876`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isGreaterThan` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanReviver`.
- **Suggested snippet:** Use `Schema.isGreaterThanReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanOrEqualTo`

- **Source:** `packages/effect/src/Schema.ts:7902`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is greater than or equal to the specified value (inclusive).
- **Signature hint:** `declare function isGreaterThanOrEqualTo(minimum: number, annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanOrEqualTo`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThanOrEqualTo` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanOrEqualToReviver`

- **Source:** `packages/effect/src/Schema.ts:7926`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isGreaterThanOrEqualTo` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanOrEqualToReviver`.
- **Suggested snippet:** Use `Schema.isGreaterThanOrEqualToReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThan`

- **Source:** `packages/effect/src/Schema.ts:7952`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is less than the specified value (exclusive).
- **Signature hint:** `declare function isLessThan(exclusiveMaximum: number, annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThan`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThan` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanReviver`

- **Source:** `packages/effect/src/Schema.ts:7976`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLessThan` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanReviver`.
- **Suggested snippet:** Use `Schema.isLessThanReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanOrEqualTo`

- **Source:** `packages/effect/src/Schema.ts:8002`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is less than or equal to the specified value (inclusive).
- **Signature hint:** `declare function isLessThanOrEqualTo(maximum: number, annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanOrEqualTo`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThanOrEqualTo` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanOrEqualToReviver`

- **Source:** `packages/effect/src/Schema.ts:8026`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLessThanOrEqualTo` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanOrEqualToReviver`.
- **Suggested snippet:** Use `Schema.isLessThanOrEqualToReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBetween`

- **Source:** `packages/effect/src/Schema.ts:8055`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is within a specified range. The range boundaries can be inclusive or exclusive based on the provided options.
- **Signature hint:** `declare function isBetween(options: { readonly minimum: number; readonly maximum: number; readonly exclusiveMinimum?: boolean | undefined; readonly exclusiveMaximum?: boolean | undefined; }, annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBetween`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `Schema.isBetween`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBetweenReviver`

- **Source:** `packages/effect/src/Schema.ts:8096`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isBetween` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBetweenReviver`.
- **Suggested snippet:** Use `Schema.isBetweenReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMultipleOf`

- **Source:** `packages/effect/src/Schema.ts:8129`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is a multiple of the specified divisor.
- **Signature hint:** `declare function isMultipleOf(divisor: number, annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMultipleOf`.
- **Suggested snippet:** Attach the check returned by `Schema.isMultipleOf` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMultipleOfReviver`

- **Source:** `packages/effect/src/Schema.ts:8155`
- **Kind / category:** `root-declaration` / `Number checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isMultipleOf` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMultipleOfReviver`.
- **Suggested snippet:** Use `Schema.isMultipleOfReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isInt`

- **Source:** `packages/effect/src/Schema.ts:8181`
- **Kind / category:** `root-declaration` / `Integer checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is a safe integer (within the safe integer range that can be exactly represented in JavaScript).
- **Signature hint:** `declare function isInt(annotations?: Annotations.Filter): SchemaAST.Filter<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isInt`.
- **Suggested snippet:** Attach the check returned by `Schema.isInt` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isIntReviver`

- **Source:** `packages/effect/src/Schema.ts:8214`
- **Kind / category:** `root-declaration` / `Integer checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isInt` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isIntReviver`.
- **Suggested snippet:** Use `Schema.isIntReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Int (type)`

- **Source:** `packages/effect/src/Schema.ts:8226`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Int`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Int`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Int (value)`

- **Source:** `packages/effect/src/Schema.ts:8236`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Schema for integers, rejecting `NaN`, `Infinity`, and `-Infinity`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Int`.
- **Suggested snippet:** Use `Schema.Int` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Natural (type)`

- **Source:** `packages/effect/src/Schema.ts:8244`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Natural`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Natural`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Natural (value)`

- **Source:** `packages/effect/src/Schema.ts:8260`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Schema for non-negative safe integers, including zero.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Natural`.
- **Suggested snippet:** Use `Schema.Natural` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isInt32`

- **Source:** `packages/effect/src/Schema.ts:8281`
- **Kind / category:** `root-declaration` / `Integer checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is a 32-bit signed integer (range: -2,147,483,648 to 2,147,483,647).
- **Signature hint:** `declare function isInt32(annotations?: Annotations.Filter): SchemaAST.FilterGroup<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isInt32`.
- **Suggested snippet:** Attach the check returned by `Schema.isInt32` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUint32`

- **Source:** `packages/effect/src/Schema.ts:8313`
- **Kind / category:** `root-declaration` / `Integer checks`
- **Priority:** **optional**
- **Current description:** Validates that a number is a 32-bit unsigned integer (range: 0 to 4,294,967,295).
- **Signature hint:** `declare function isUint32(annotations?: Annotations.Filter): SchemaAST.FilterGroup<number>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUint32`.
- **Suggested snippet:** Attach the check returned by `Schema.isUint32` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanDate`

- **Source:** `packages/effect/src/Schema.ts:8351`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Validates that a Date is greater than the specified value (exclusive).
- **Signature hint:** `declare function isGreaterThanDate(exclusiveMinimum: globalThis.Date, annotations?: Annotations.Filter): SchemaAST.Filter<globalThis.Date>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanDate`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThanDate` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanOrEqualToDate`

- **Source:** `packages/effect/src/Schema.ts:8386`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Validates that a Date is greater than or equal to the specified date (inclusive).
- **Signature hint:** `declare function isGreaterThanOrEqualToDate(minimum: globalThis.Date, annotations?: Annotations.Filter): SchemaAST.Filter<globalThis.Date>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanOrEqualToDate`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThanOrEqualToDate` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanDate`

- **Source:** `packages/effect/src/Schema.ts:8415`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Validates that a Date is less than the specified value (exclusive).
- **Signature hint:** `declare function isLessThanDate(exclusiveMaximum: globalThis.Date, annotations?: Annotations.Filter): SchemaAST.Filter<globalThis.Date>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanDate`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThanDate` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanOrEqualToDate`

- **Source:** `packages/effect/src/Schema.ts:8450`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Validates that a Date is less than or equal to the specified date (inclusive).
- **Signature hint:** `declare function isLessThanOrEqualToDate(maximum: globalThis.Date, annotations?: Annotations.Filter): SchemaAST.Filter<globalThis.Date>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanOrEqualToDate`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThanOrEqualToDate` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBetweenDate`

- **Source:** `packages/effect/src/Schema.ts:8485`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Validates that a Date is within a specified range. The range boundaries can be inclusive or exclusive based on the provided options.
- **Signature hint:** `declare function isBetweenDate(options: { readonly minimum: globalThis.Date; readonly maximum: globalThis.Date; readonly exclusiveMinimum?: boolean | undefined; readonly exclusiveMaximum?: boolean | undefined; }, annotations?: Annotations.Filter): SchemaAST.Filter<globalThis.Date>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBetweenDate`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `Schema.isBetweenDate`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanBigInt`

- **Source:** `packages/effect/src/Schema.ts:8525`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigInt is greater than the specified value (exclusive).
- **Signature hint:** `declare function isGreaterThanBigInt(exclusiveMinimum: bigint, annotations?: Annotations.Filter): SchemaAST.Filter<bigint>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanBigInt`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThanBigInt` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanOrEqualToBigInt`

- **Source:** `packages/effect/src/Schema.ts:8555`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigInt is greater than or equal to the specified value (inclusive).
- **Signature hint:** `declare function isGreaterThanOrEqualToBigInt(minimum: bigint, annotations?: Annotations.Filter): SchemaAST.Filter<bigint>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanOrEqualToBigInt`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThanOrEqualToBigInt` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanBigInt`

- **Source:** `packages/effect/src/Schema.ts:8584`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigInt is less than the specified value (exclusive).
- **Signature hint:** `declare function isLessThanBigInt(exclusiveMaximum: bigint, annotations?: Annotations.Filter): SchemaAST.Filter<bigint>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanBigInt`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThanBigInt` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanOrEqualToBigInt`

- **Source:** `packages/effect/src/Schema.ts:8614`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigInt is less than or equal to the specified value (inclusive).
- **Signature hint:** `declare function isLessThanOrEqualToBigInt(maximum: bigint, annotations?: Annotations.Filter): SchemaAST.Filter<bigint>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanOrEqualToBigInt`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThanOrEqualToBigInt` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBetweenBigInt`

- **Source:** `packages/effect/src/Schema.ts:8644`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigInt is within a specified range. The range boundaries can be inclusive or exclusive based on the provided options.
- **Signature hint:** `declare function isBetweenBigInt(options: { readonly minimum: bigint; readonly maximum: bigint; readonly exclusiveMinimum?: boolean | undefined; readonly exclusiveMaximum?: boolean | undefined; }, annotations?: Annotations.Filter): SchemaAST.Filter<bigint>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBetweenBigInt`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `Schema.isBetweenBigInt`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanBigDecimal`

- **Source:** `packages/effect/src/Schema.ts:8676`
- **Kind / category:** `root-declaration` / `BigDecimal checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigDecimal is greater than the specified value (exclusive).
- **Signature hint:** `declare function isGreaterThanBigDecimal(exclusiveMinimum: BigDecimal_.BigDecimal, annotations?: Annotations.Filter): SchemaAST.Filter<BigDecimal_.BigDecimal>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanBigDecimal`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThanBigDecimal` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanOrEqualToBigDecimal`

- **Source:** `packages/effect/src/Schema.ts:8688`
- **Kind / category:** `root-declaration` / `BigDecimal checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigDecimal is greater than or equal to the specified value (inclusive).
- **Signature hint:** `declare function isGreaterThanOrEqualToBigDecimal(minimum: BigDecimal_.BigDecimal, annotations?: Annotations.Filter): SchemaAST.Filter<BigDecimal_.BigDecimal>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanOrEqualToBigDecimal`.
- **Suggested snippet:** Attach the check returned by `Schema.isGreaterThanOrEqualToBigDecimal` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanBigDecimal`

- **Source:** `packages/effect/src/Schema.ts:8699`
- **Kind / category:** `root-declaration` / `BigDecimal checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigDecimal is less than the specified value (exclusive).
- **Signature hint:** `declare function isLessThanBigDecimal(exclusiveMaximum: BigDecimal_.BigDecimal, annotations?: Annotations.Filter): SchemaAST.Filter<BigDecimal_.BigDecimal>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanBigDecimal`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThanBigDecimal` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanOrEqualToBigDecimal`

- **Source:** `packages/effect/src/Schema.ts:8711`
- **Kind / category:** `root-declaration` / `BigDecimal checks`
- **Priority:** **optional**
- **Current description:** Validates that a BigDecimal is less than or equal to the specified value (inclusive).
- **Signature hint:** `declare function isLessThanOrEqualToBigDecimal(maximum: BigDecimal_.BigDecimal, annotations?: Annotations.Filter): SchemaAST.Filter<BigDecimal_.BigDecimal>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanOrEqualToBigDecimal`.
- **Suggested snippet:** Attach the check returned by `Schema.isLessThanOrEqualToBigDecimal` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBetweenBigDecimal`

- **Source:** `packages/effect/src/Schema.ts:8727`
- **Kind / category:** `root-declaration` / `BigDecimal checks`
- **Priority:** **optional**
- **Current description:** Validates that a `BigDecimal` is within a specified range.
- **Signature hint:** `declare function isBetweenBigDecimal(options: { readonly minimum: BigDecimal_.BigDecimal; readonly maximum: BigDecimal_.BigDecimal; readonly exclusiveMinimum?: boolean | undefined; readonly exclusiveMaximum?: boolean | undefined; }, annotations?: Annotations.Filter): SchemaAST.Filter<BigDecimal_.BigDecimal>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBetweenBigDecimal`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `Schema.isBetweenBigDecimal`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMinLengthReviver`

- **Source:** `packages/effect/src/Schema.ts:8798`
- **Kind / category:** `root-declaration` / `Length checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isMinLength` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMinLengthReviver`.
- **Suggested snippet:** Use `Schema.isMinLengthReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isNonEmpty`

- **Source:** `packages/effect/src/Schema.ts:8825`
- **Kind / category:** `root-declaration` / `Length checks`
- **Priority:** **optional**
- **Current description:** Validates that a value has at least one element. Works with strings and arrays. This is equivalent to `isMinLength(1)`.
- **Signature hint:** `declare function isNonEmpty(annotations?: Annotations.Filter): SchemaAST.Filter<{ readonly length: number; }>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isNonEmpty`.
- **Suggested snippet:** Attach the check returned by `Schema.isNonEmpty` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMaxLength`

- **Source:** `packages/effect/src/Schema.ts:8849`
- **Kind / category:** `root-declaration` / `Length checks`
- **Priority:** **optional**
- **Current description:** Validates that a value has at most the specified length. Works with strings and arrays.
- **Signature hint:** `declare function isMaxLength(maxLength: number, annotations?: Annotations.Filter): SchemaAST.Filter<{ readonly length: number; }>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMaxLength`.
- **Suggested snippet:** Attach the check returned by `Schema.isMaxLength` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMaxLengthReviver`

- **Source:** `packages/effect/src/Schema.ts:8884`
- **Kind / category:** `root-declaration` / `Length checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isMaxLength` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMaxLengthReviver`.
- **Suggested snippet:** Use `Schema.isMaxLengthReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLengthBetween`

- **Source:** `packages/effect/src/Schema.ts:8912`
- **Kind / category:** `root-declaration` / `Length checks`
- **Priority:** **optional**
- **Current description:** Validates that a value's length is within the specified range. Works with strings and arrays.
- **Signature hint:** `declare function isLengthBetween(minimum: number, maximum: number, annotations?: Annotations.Filter): SchemaAST.Filter<{ readonly length: number; }>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLengthBetween`.
- **Suggested snippet:** Attach the check returned by `Schema.isLengthBetween` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLengthBetweenReviver`

- **Source:** `packages/effect/src/Schema.ts:8955`
- **Kind / category:** `root-declaration` / `Length checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLengthBetween` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLengthBetweenReviver`.
- **Suggested snippet:** Use `Schema.isLengthBetweenReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMinSize`

- **Source:** `packages/effect/src/Schema.ts:8984`
- **Kind / category:** `root-declaration` / `Size checks`
- **Priority:** **optional**
- **Current description:** Validates that a value has at least the specified size. Works with values that have a `size` property, such as `Set` or `Map`.
- **Signature hint:** `declare function isMinSize(minSize: number, annotations?: Annotations.Filter): SchemaAST.Filter<{ readonly size: number; }>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMinSize`.
- **Suggested snippet:** Attach the check returned by `Schema.isMinSize` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMinSizeReviver`

- **Source:** `packages/effect/src/Schema.ts:9019`
- **Kind / category:** `root-declaration` / `Size checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isMinSize` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMinSizeReviver`.
- **Suggested snippet:** Use `Schema.isMinSizeReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMaxSize`

- **Source:** `packages/effect/src/Schema.ts:9047`
- **Kind / category:** `root-declaration` / `Size checks`
- **Priority:** **optional**
- **Current description:** Validates that a value has at most the specified size. Works with values that have a `size` property, such as `Set` or `Map`.
- **Signature hint:** `declare function isMaxSize(maxSize: number, annotations?: Annotations.Filter): SchemaAST.Filter<{ readonly size: number; }>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMaxSize`.
- **Suggested snippet:** Attach the check returned by `Schema.isMaxSize` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMaxSizeReviver`

- **Source:** `packages/effect/src/Schema.ts:9082`
- **Kind / category:** `root-declaration` / `Size checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isMaxSize` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMaxSizeReviver`.
- **Suggested snippet:** Use `Schema.isMaxSizeReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isSizeBetween`

- **Source:** `packages/effect/src/Schema.ts:9110`
- **Kind / category:** `root-declaration` / `Size checks`
- **Priority:** **optional**
- **Current description:** Validates that a value's size is within the specified range. Works with values that have a `size` property, such as `Set` or `Map`.
- **Signature hint:** `declare function isSizeBetween(minimum: number, maximum: number, annotations?: Annotations.Filter): SchemaAST.Filter<{ readonly size: number; }>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isSizeBetween`.
- **Suggested snippet:** Attach the check returned by `Schema.isSizeBetween` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isSizeBetweenReviver`

- **Source:** `packages/effect/src/Schema.ts:9150`
- **Kind / category:** `root-declaration` / `Size checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isSizeBetween` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isSizeBetweenReviver`.
- **Suggested snippet:** Use `Schema.isSizeBetweenReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMinProperties`

- **Source:** `packages/effect/src/Schema.ts:9179`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Validates that an object contains at least the specified number of properties. This includes both string and symbol keys when counting properties.
- **Signature hint:** `declare function isMinProperties(minProperties: number, annotations?: Annotations.Filter): SchemaAST.Filter<object>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMinProperties`.
- **Suggested snippet:** Attach the check returned by `Schema.isMinProperties` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMinPropertiesReviver`

- **Source:** `packages/effect/src/Schema.ts:9214`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isMinProperties` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMinPropertiesReviver`.
- **Suggested snippet:** Use `Schema.isMinPropertiesReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMaxProperties`

- **Source:** `packages/effect/src/Schema.ts:9241`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Validates that an object contains at most the specified number of properties. This includes both string and symbol keys when counting properties.
- **Signature hint:** `declare function isMaxProperties(maxProperties: number, annotations?: Annotations.Filter): SchemaAST.Filter<object>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMaxProperties`.
- **Suggested snippet:** Attach the check returned by `Schema.isMaxProperties` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isMaxPropertiesReviver`

- **Source:** `packages/effect/src/Schema.ts:9276`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isMaxProperties` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isMaxPropertiesReviver`.
- **Suggested snippet:** Use `Schema.isMaxPropertiesReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isPropertiesLengthBetween`

- **Source:** `packages/effect/src/Schema.ts:9304`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Validates that an object contains between `minimum` and `maximum` properties (inclusive). This includes both string and symbol keys when counting properties.
- **Signature hint:** `declare function isPropertiesLengthBetween(minimum: number, maximum: number, annotations?: Annotations.Filter): SchemaAST.Filter<object>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isPropertiesLengthBetween`.
- **Suggested snippet:** Attach the check returned by `Schema.isPropertiesLengthBetween` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isPropertiesLengthBetweenReviver`

- **Source:** `packages/effect/src/Schema.ts:9344`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isPropertiesLengthBetween` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isPropertiesLengthBetweenReviver`.
- **Suggested snippet:** Use `Schema.isPropertiesLengthBetweenReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isPropertyNames`

- **Source:** `packages/effect/src/Schema.ts:9369`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Validates that every own property key of an object satisfies the encoded side of the provided key schema.
- **Signature hint:** `declare function isPropertyNames(keySchema: Constraint, annotations?: Annotations.Filter): SchemaAST.Filter<object>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isPropertyNames`.
- **Suggested snippet:** Attach the check returned by `Schema.isPropertyNames` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isPropertyNamesReviver`

- **Source:** `packages/effect/src/Schema.ts:9415`
- **Kind / category:** `root-declaration` / `Object checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isPropertyNames` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isPropertyNamesReviver`.
- **Suggested snippet:** Use `Schema.isPropertyNamesReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUnique`

- **Source:** `packages/effect/src/Schema.ts:9437`
- **Kind / category:** `root-declaration` / `Array checks`
- **Priority:** **optional**
- **Current description:** Validates that all items in an array are unique according to Effect equality.
- **Signature hint:** `declare function isUnique<T>(annotations?: Annotations.Filter): SchemaAST.Filter<readonly T[]>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUnique`.
- **Suggested snippet:** Attach the check returned by `Schema.isUnique` to the smallest compatible Schema, decode one valid and one invalid value, and assert the success plus one stable issue detail. Do not call the check constructor as though it directly validates a value.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isUniqueReviver`

- **Source:** `packages/effect/src/Schema.ts:9470`
- **Kind / category:** `root-declaration` / `Array checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isUnique` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isUniqueReviver`.
- **Suggested snippet:** Use `Schema.isUniqueReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.NonEmptyString (type)`

- **Source:** `packages/effect/src/Schema.ts:9486`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `NonEmptyString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.NonEmptyString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.NonEmptyString (value)`

- **Source:** `packages/effect/src/Schema.ts:9497`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Schema for non-empty strings. Validates that a string has at least one character.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.NonEmptyString`.
- **Suggested snippet:** Use `Schema.NonEmptyString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Char (type)`

- **Source:** `packages/effect/src/Schema.ts:9505`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Char`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Char`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Char (value)`

- **Source:** `packages/effect/src/Schema.ts:9528`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Schema for strings whose JavaScript `length` is exactly `1`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Char`.
- **Suggested snippet:** Use `Schema.Char` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Option (type)`

- **Source:** `packages/effect/src/Schema.ts:9536`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Option`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Option`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionIso`

- **Source:** `packages/effect/src/Schema.ts:9559`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Iso representation used for `Option` schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.OptionIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Option (value)`

- **Source:** `packages/effect/src/Schema.ts:9569`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Schema for `Option<A>` values.
- **Signature hint:** `declare function Option<A extends Constraint>(value: A): Option<A>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Option`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Option`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionReviver`

- **Source:** `packages/effect/src/Schema.ts:9645`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Option` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.OptionReviver`.
- **Suggested snippet:** Use `Schema.OptionReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromNullOr (type)`

- **Source:** `packages/effect/src/Schema.ts:9660`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `OptionFromNullOr`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.OptionFromNullOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromNullOr (value)`

- **Source:** `packages/effect/src/Schema.ts:9675`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Decodes a nullable, required value `T` to a required `Option<T>` value.
- **Signature hint:** `declare function OptionFromNullOr<S extends Constraint>(schema: S): OptionFromNullOr<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.OptionFromNullOr`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.OptionFromNullOr`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromUndefinedOr (type)`

- **Source:** `packages/effect/src/Schema.ts:9688`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `OptionFromUndefinedOr`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.OptionFromUndefinedOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromUndefinedOr (value)`

- **Source:** `packages/effect/src/Schema.ts:9704`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Decodes a required value that may be `undefined` to a required `Option<T>` value.
- **Signature hint:** `declare function OptionFromUndefinedOr<S extends Constraint>(schema: S): OptionFromUndefinedOr<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.OptionFromUndefinedOr`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.OptionFromUndefinedOr`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromNullishOr (type)`

- **Source:** `packages/effect/src/Schema.ts:9717`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `OptionFromNullishOr`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.OptionFromNullishOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromNullishOr (value)`

- **Source:** `packages/effect/src/Schema.ts:9734`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Decodes a nullish value `T` to a required `Option<T>` value.
- **Signature hint:** `declare function OptionFromNullishOr<S extends Constraint>(schema: S, options?: { onNoneEncoding: null | undefined; }): OptionFromNullishOr<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.OptionFromNullishOr`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.OptionFromNullishOr`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromOptionalKey (type)`

- **Source:** `packages/effect/src/Schema.ts:9752`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `OptionFromOptionalKey`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.OptionFromOptionalKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromOptionalKey (value)`

- **Source:** `packages/effect/src/Schema.ts:9767`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Decodes an optional value `A` to a required `Option<A>` value.
- **Signature hint:** `declare function OptionFromOptionalKey<S extends Constraint>(schema: S): OptionFromOptionalKey<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.OptionFromOptionalKey`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.OptionFromOptionalKey`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromOptional (type)`

- **Source:** `packages/effect/src/Schema.ts:9780`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `OptionFromOptional`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.OptionFromOptional`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromOptional (value)`

- **Source:** `packages/effect/src/Schema.ts:9797`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Decodes an optional or `undefined` value `A` to a required `Option<A>` value.
- **Signature hint:** `declare function OptionFromOptional<S extends Constraint>(schema: S): OptionFromOptional<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.OptionFromOptional`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.OptionFromOptional`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromOptionalNullOr (type)`

- **Source:** `packages/effect/src/Schema.ts:9810`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `OptionFromOptionalNullOr`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.OptionFromOptionalNullOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.OptionFromOptionalNullOr (value)`

- **Source:** `packages/effect/src/Schema.ts:9830`
- **Kind / category:** `root-declaration` / `Option`
- **Priority:** **optional**
- **Current description:** Decodes an optional or `null` or `undefined` value `A` to a required `Option<A>` value.
- **Signature hint:** `declare function OptionFromOptionalNullOr<S extends Constraint>(schema: S, options?: { readonly onNoneEncoding: 'omit' | null | undefined; }): OptionFromOptionalNullOr<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.OptionFromOptionalNullOr`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.OptionFromOptionalNullOr`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Result (type)`

- **Source:** `packages/effect/src/Schema.ts:9857`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Result`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Result`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ResultIso`

- **Source:** `packages/effect/src/Schema.ts:9881`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Iso representation used for `Result` schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ResultIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Result (value)`

- **Source:** `packages/effect/src/Schema.ts:9891`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for `Result<A, E>` values.
- **Signature hint:** `declare function Result<A extends Constraint, E extends Constraint>(success: A, failure: E): Result<A, E>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Result`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Result`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ResultReviver`

- **Source:** `packages/effect/src/Schema.ts:9981`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Result` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ResultReviver`.
- **Suggested snippet:** Use `Schema.ResultReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Redacted (type)`

- **Source:** `packages/effect/src/Schema.ts:9996`
- **Kind / category:** `root-declaration` / `Redacted`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Redacted`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Redacted`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Redacted (value)`

- **Source:** `packages/effect/src/Schema.ts:10062`
- **Kind / category:** `root-declaration` / `Redacted`
- **Priority:** **optional**
- **Current description:** Schema for values that hide sensitive information from error output and inspection.
- **Signature hint:** `declare function Redacted<S extends Constraint>(value: S, options?: { readonly label?: string | undefined; readonly disallowJsonEncode?: boolean | undefined; }): Redacted<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Redacted`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Redacted`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.RedactedReviver`

- **Source:** `packages/effect/src/Schema.ts:10154`
- **Kind / category:** `root-declaration` / `Redacted`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Redacted` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.RedactedReviver`.
- **Suggested snippet:** Use `Schema.RedactedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.RedactedFromValue (type)`

- **Source:** `packages/effect/src/Schema.ts:10169`
- **Kind / category:** `root-declaration` / `Redacted`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `RedactedFromValue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.RedactedFromValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.redact`

- **Source:** `packages/effect/src/Schema.ts:10182`
- **Kind / category:** `root-declaration` / `Redacted`
- **Priority:** **optional**
- **Current description:** Middleware that wraps decoded errors in `Redacted`, preventing sensitive schema details from leaking in error messages.
- **Signature hint:** `declare function redact<S extends Constraint>(schema: S): middlewareDecoding<S, S['DecodingServices']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.redact`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Middleware that wraps decoded errors in `Redacted`, preventing sensitive schema details from leaking in error messages. Call `Schema.redact` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.RedactedFromValue (value)`

- **Source:** `packages/effect/src/Schema.ts:10195`
- **Kind / category:** `root-declaration` / `Redacted`
- **Priority:** **optional**
- **Current description:** Decodes a value and wraps it in `Redacted<A>`. Unlike `Redacted` which expects the input to already be a `Redacted` instance, this schema decodes the raw value and wraps it.
- **Signature hint:** `declare function RedactedFromValue<S extends Constraint>(value: S, options?: { readonly label?: string | undefined; readonly disallowEncode?: boolean | undefined; }): RedactedFromValue<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.RedactedFromValue`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.RedactedFromValue`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.CauseReason (type)`

- **Source:** `packages/effect/src/Schema.ts:10224`
- **Kind / category:** `root-declaration` / `CauseReason`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `CauseReason`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.CauseReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.CauseReasonIso`

- **Source:** `packages/effect/src/Schema.ts:10248`
- **Kind / category:** `root-declaration` / `CauseReason`
- **Priority:** **optional**
- **Current description:** Iso representation used for `CauseReason` schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.CauseReasonIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.CauseReason (value)`

- **Source:** `packages/effect/src/Schema.ts:10279`
- **Kind / category:** `root-declaration` / `CauseReason`
- **Priority:** **optional**
- **Current description:** Creates a schema for `Cause.Reason` values using separate schemas for typed failures and unexpected defects.
- **Signature hint:** `declare function CauseReason<E extends Constraint, D extends Constraint>(error: E, defect: D): CauseReason<E, D>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.CauseReason`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.CauseReason`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.CauseReasonReviver`

- **Source:** `packages/effect/src/Schema.ts:10361`
- **Kind / category:** `root-declaration` / `CauseReason`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `CauseReason` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.CauseReasonReviver`.
- **Suggested snippet:** Use `Schema.CauseReasonReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Cause (type)`

- **Source:** `packages/effect/src/Schema.ts:10419`
- **Kind / category:** `root-declaration` / `Cause`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Cause`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Cause`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.CauseIso`

- **Source:** `packages/effect/src/Schema.ts:10447`
- **Kind / category:** `root-declaration` / `Cause`
- **Priority:** **optional**
- **Current description:** Iso representation used for `Cause` schemas: an ordered array of `CauseReasonIso` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.CauseIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Cause (value)`

- **Source:** `packages/effect/src/Schema.ts:10470`
- **Kind / category:** `root-declaration` / `Cause`
- **Priority:** **optional**
- **Current description:** Creates a schema for `Cause` values using separate schemas for typed failures and unexpected defects.
- **Signature hint:** `declare function Cause<E extends Constraint, D extends Constraint>(error: E, defect: D): Cause<E, D>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Cause`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Cause`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.CauseReviver`

- **Source:** `packages/effect/src/Schema.ts:10525`
- **Kind / category:** `root-declaration` / `Cause`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Cause` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.CauseReviver`.
- **Suggested snippet:** Use `Schema.CauseReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Error (type)`

- **Source:** `packages/effect/src/Schema.ts:10562`
- **Kind / category:** `root-declaration` / `Error`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Error`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ErrorOptions`

- **Source:** `packages/effect/src/Schema.ts:10572`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for `Error` and `Defect`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ErrorOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Error (value)`

- **Source:** `packages/effect/src/Schema.ts:10647`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Schema for JavaScript `Error` objects.
- **Signature hint:** `declare function Error(options?: ErrorOptions): Error`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Error`.
- **Suggested snippet:** Create or capture `Schema.Error` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ErrorReviver`

- **Source:** `packages/effect/src/Schema.ts:10683`
- **Kind / category:** `root-declaration` / `Error`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Error` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ErrorReviver`.
- **Suggested snippet:** Use `Schema.ErrorReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Defect (type)`

- **Source:** `packages/effect/src/Schema.ts:10698`
- **Kind / category:** `root-declaration` / `Defect`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Defect`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Defect`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Defect (value)`

- **Source:** `packages/effect/src/Schema.ts:10745`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Schema for unexpected defect values represented as `unknown` with a JSON encoded form.
- **Signature hint:** `declare function Defect(options?: ErrorOptions): Defect`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Defect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Schema for unexpected defect values represented as `unknown` with a JSON encoded form. Call `Schema.Defect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Exit (type)`

- **Source:** `packages/effect/src/Schema.ts:10762`
- **Kind / category:** `root-declaration` / `Exit`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Exit`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Exit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ExitIso`

- **Source:** `packages/effect/src/Schema.ts:10787`
- **Kind / category:** `root-declaration` / `Exit`
- **Priority:** **optional**
- **Current description:** Iso representation used for `Exit` schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ExitIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Exit (value)`

- **Source:** `packages/effect/src/Schema.ts:10807`
- **Kind / category:** `root-declaration` / `Exit`
- **Priority:** **optional**
- **Current description:** Creates a schema for `Exit` values using schemas for the success value, typed failure, and unexpected defect channels.
- **Signature hint:** `declare function Exit<A extends Constraint, E extends Constraint, D extends Constraint>(value: A, error: E, defect: D): Exit<A, E, D>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Exit`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Exit`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ExitReviver`

- **Source:** `packages/effect/src/Schema.ts:10927`
- **Kind / category:** `root-declaration` / `Exit`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Exit` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ExitReviver`.
- **Suggested snippet:** Use `Schema.ExitReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.$ReadonlyMap`

- **Source:** `packages/effect/src/Schema.ts:10942`
- **Kind / category:** `root-declaration` / `ReadonlyMap`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `ReadonlyMap`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.$ReadonlyMap`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ReadonlyMapIso`

- **Source:** `packages/effect/src/Schema.ts:10962`
- **Kind / category:** `root-declaration` / `ReadonlyMap`
- **Priority:** **optional**
- **Current description:** Iso representation used for `ReadonlyMap` schemas: an array of readonly `[key, value]` tuples using each entry schema's `Iso` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ReadonlyMapIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ReadonlyMap`

- **Source:** `packages/effect/src/Schema.ts:11063`
- **Kind / category:** `root-declaration` / `ReadonlyMap`
- **Priority:** **optional**
- **Current description:** Schema for readonly maps whose keys and values conform to the provided schemas.
- **Signature hint:** `declare function ReadonlyMap<Key extends Constraint, Value extends Constraint>(key: Key, value: Value): $ReadonlyMap<Key, Value>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ReadonlyMap`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.ReadonlyMap`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ReadonlyMapReviver`

- **Source:** `packages/effect/src/Schema.ts:11134`
- **Kind / category:** `root-declaration` / `ReadonlyMap`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `ReadonlyMap` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ReadonlyMapReviver`.
- **Suggested snippet:** Use `Schema.ReadonlyMapReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashMap (type)`

- **Source:** `packages/effect/src/Schema.ts:11149`
- **Kind / category:** `root-declaration` / `HashMap`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `HashMap`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.HashMap`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashMapIso`

- **Source:** `packages/effect/src/Schema.ts:11169`
- **Kind / category:** `root-declaration` / `HashMap`
- **Priority:** **optional**
- **Current description:** Iso representation used for `HashMap` schemas: an array of readonly `[key, value]` tuples using each entry schema's `Iso` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.HashMapIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashMap (value)`

- **Source:** `packages/effect/src/Schema.ts:11179`
- **Kind / category:** `root-declaration` / `HashMap`
- **Priority:** **optional**
- **Current description:** Schema for hash maps whose keys and values conform to the provided schemas.
- **Signature hint:** `declare function HashMap<Key extends Constraint, Value extends Constraint>(key: Key, value: Value): HashMap<Key, Value>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.HashMap`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.HashMap`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashMapReviver`

- **Source:** `packages/effect/src/Schema.ts:11248`
- **Kind / category:** `root-declaration` / `HashMap`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `HashMap` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.HashMapReviver`.
- **Suggested snippet:** Use `Schema.HashMapReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.$ReadonlySet`

- **Source:** `packages/effect/src/Schema.ts:11263`
- **Kind / category:** `root-declaration` / `ReadonlySet`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `ReadonlySet`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.$ReadonlySet`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ReadonlySetIso`

- **Source:** `packages/effect/src/Schema.ts:11282`
- **Kind / category:** `root-declaration` / `ReadonlySet`
- **Priority:** **optional**
- **Current description:** Iso representation used for `ReadonlySet` schemas: an array of element values using the element schema's `Iso` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ReadonlySetIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ReadonlySet`

- **Source:** `packages/effect/src/Schema.ts:11290`
- **Kind / category:** `root-declaration` / `ReadonlySet`
- **Priority:** **optional**
- **Current description:** Schema for readonly sets whose values conform to the provided element schema.
- **Signature hint:** `declare function ReadonlySet<Value extends Constraint>(value: Value): $ReadonlySet<Value>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ReadonlySet`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.ReadonlySet`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ReadonlySetReviver`

- **Source:** `packages/effect/src/Schema.ts:11359`
- **Kind / category:** `root-declaration` / `ReadonlySet`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `ReadonlySet` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ReadonlySetReviver`.
- **Suggested snippet:** Use `Schema.ReadonlySetReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashSet (type)`

- **Source:** `packages/effect/src/Schema.ts:11374`
- **Kind / category:** `root-declaration` / `HashSet`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `HashSet`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.HashSet`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashSetIso`

- **Source:** `packages/effect/src/Schema.ts:11393`
- **Kind / category:** `root-declaration` / `HashSet`
- **Priority:** **optional**
- **Current description:** Iso representation used for `HashSet` schemas: an array of element values using the element schema's `Iso` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.HashSetIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashSet (value)`

- **Source:** `packages/effect/src/Schema.ts:11401`
- **Kind / category:** `root-declaration` / `HashSet`
- **Priority:** **optional**
- **Current description:** Schema for hash sets whose values conform to the provided element schema.
- **Signature hint:** `declare function HashSet<Value extends Constraint>(value: Value): HashSet<Value>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.HashSet`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.HashSet`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.HashSetReviver`

- **Source:** `packages/effect/src/Schema.ts:11470`
- **Kind / category:** `root-declaration` / `HashSet`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `HashSet` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.HashSetReviver`.
- **Suggested snippet:** Use `Schema.HashSetReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Chunk (type)`

- **Source:** `packages/effect/src/Schema.ts:11485`
- **Kind / category:** `root-declaration` / `Chunk`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Chunk`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Chunk`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ChunkIso`

- **Source:** `packages/effect/src/Schema.ts:11511`
- **Kind / category:** `root-declaration` / `Chunk`
- **Priority:** **optional**
- **Current description:** Iso representation used for `Chunk` schemas: an array of element values using the element schema's `Iso` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ChunkIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Chunk (value)`

- **Source:** `packages/effect/src/Schema.ts:11519`
- **Kind / category:** `root-declaration` / `Chunk`
- **Priority:** **optional**
- **Current description:** Schema for chunks whose values conform to the provided element schema.
- **Signature hint:** `declare function Chunk<Value extends Constraint>(value: Value): Chunk<Value>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Chunk`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Chunk`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ChunkReviver`

- **Source:** `packages/effect/src/Schema.ts:11588`
- **Kind / category:** `root-declaration` / `Chunk`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Chunk` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.ChunkReviver`.
- **Suggested snippet:** Use `Schema.ChunkReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.RegExp (type)`

- **Source:** `packages/effect/src/Schema.ts:11603`
- **Kind / category:** `root-declaration` / `RegExp`
- **Priority:** **optional**
- **Current description:** Type-level representation of `RegExp`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.RegExp`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.RegExp (value)`

- **Source:** `packages/effect/src/Schema.ts:11617`
- **Kind / category:** `root-declaration` / `RegExp`
- **Priority:** **optional**
- **Current description:** Schema for JavaScript `RegExp` objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.RegExp`.
- **Suggested snippet:** Use `Schema.RegExp` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.RegExpReviver`

- **Source:** `packages/effect/src/Schema.ts:11686`
- **Kind / category:** `root-declaration` / `RegExp`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `RegExp` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.RegExpReviver`.
- **Suggested snippet:** Use `Schema.RegExpReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URL (type)`

- **Source:** `packages/effect/src/Schema.ts:11697`
- **Kind / category:** `root-declaration` / `URL`
- **Priority:** **optional**
- **Current description:** Type-level representation of `URL`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.URL`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URL (value)`

- **Source:** `packages/effect/src/Schema.ts:11715`
- **Kind / category:** `root-declaration` / `URL`
- **Priority:** **optional**
- **Current description:** Schema for JavaScript `URL` objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.URL`.
- **Suggested snippet:** Use `Schema.URL` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URLReviver`

- **Source:** `packages/effect/src/Schema.ts:11749`
- **Kind / category:** `root-declaration` / `URL`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `URL` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.URLReviver`.
- **Suggested snippet:** Use `Schema.URLReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URLFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:11760`
- **Kind / category:** `root-declaration` / `URL`
- **Priority:** **optional**
- **Current description:** Type-level representation of `URLFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.URLFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URLFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:11778`
- **Kind / category:** `root-declaration` / `URL`
- **Priority:** **optional**
- **Current description:** Schema that decodes a `string` into a `URL`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.URLFromString`.
- **Suggested snippet:** Use `Schema.URLFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Date`

- **Source:** `packages/effect/src/Schema.ts:11786`
- **Kind / category:** `root-declaration` / `Date`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Date`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Date`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateReviver`

- **Source:** `packages/effect/src/Schema.ts:11880`
- **Kind / category:** `root-declaration` / `Date`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Date` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateReviver`.
- **Suggested snippet:** Use `Schema.DateReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:11891`
- **Kind / category:** `root-declaration` / `Date`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:11920`
- **Kind / category:** `root-declaration` / `Date`
- **Priority:** **optional**
- **Current description:** Schema that decodes a string into a JavaScript `Date`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateFromString`.
- **Suggested snippet:** Use `Schema.DateFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateFromMillis (type)`

- **Source:** `packages/effect/src/Schema.ts:11928`
- **Kind / category:** `root-declaration` / `Date`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateFromMillis`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateFromMillis`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateFromMillis (value)`

- **Source:** `packages/effect/src/Schema.ts:11960`
- **Kind / category:** `root-declaration` / `Date`
- **Priority:** **optional**
- **Current description:** Schema that decodes epoch milliseconds into a JavaScript `Date`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateFromMillis`.
- **Suggested snippet:** Use `Schema.DateFromMillis` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Duration`

- **Source:** `packages/effect/src/Schema.ts:11970`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Duration`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Duration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DurationReviver`

- **Source:** `packages/effect/src/Schema.ts:12066`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Duration` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DurationReviver`.
- **Suggested snippet:** Use `Schema.DurationReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DurationFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:12079`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DurationFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DurationFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DurationFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:12098`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Schema that parses a string into a `Duration`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DurationFromString`.
- **Suggested snippet:** Use `Schema.DurationFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DurationFromNanos (type)`

- **Source:** `packages/effect/src/Schema.ts:12108`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DurationFromNanos`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DurationFromNanos`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DurationFromNanos (value)`

- **Source:** `packages/effect/src/Schema.ts:12129`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Schema that decodes a `bigint` into a `Duration`, treating the bigint as nanoseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DurationFromNanos`.
- **Suggested snippet:** Use `Schema.DurationFromNanos` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DurationFromMillis (type)`

- **Source:** `packages/effect/src/Schema.ts:12139`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DurationFromMillis`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DurationFromMillis`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DurationFromMillis (value)`

- **Source:** `packages/effect/src/Schema.ts:12162`
- **Kind / category:** `root-declaration` / `Duration`
- **Priority:** **optional**
- **Current description:** Schema that decodes a number into a `Duration`, treating the number as milliseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DurationFromMillis`.
- **Suggested snippet:** Use `Schema.DurationFromMillis` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigDecimal (type)`

- **Source:** `packages/effect/src/Schema.ts:12172`
- **Kind / category:** `root-declaration` / `BigDecimal`
- **Priority:** **optional**
- **Current description:** Type-level representation of `BigDecimal`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BigDecimal`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigDecimal (value)`

- **Source:** `packages/effect/src/Schema.ts:12272`
- **Kind / category:** `root-declaration` / `BigDecimal`
- **Priority:** **optional**
- **Current description:** Schema for `BigDecimal` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.BigDecimal`.
- **Suggested snippet:** Use `Schema.BigDecimal` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigDecimalReviver`

- **Source:** `packages/effect/src/Schema.ts:12324`
- **Kind / category:** `root-declaration` / `BigDecimal`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `BigDecimal` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.BigDecimalReviver`.
- **Suggested snippet:** Use `Schema.BigDecimalReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigDecimalFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:12335`
- **Kind / category:** `root-declaration` / `BigDecimal`
- **Priority:** **optional**
- **Current description:** Type-level representation of `BigDecimalFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BigDecimalFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigDecimalFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:12366`
- **Kind / category:** `root-declaration` / `BigDecimal`
- **Priority:** **optional**
- **Current description:** Schema that parses a string into a `BigDecimal`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.BigDecimalFromString`.
- **Suggested snippet:** Use `Schema.BigDecimalFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.File (type)`

- **Source:** `packages/effect/src/Schema.ts:12434`
- **Kind / category:** `root-declaration` / `file`
- **Priority:** **optional**
- **Current description:** Type-level representation of `File`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.File`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.File (value)`

- **Source:** `packages/effect/src/Schema.ts:12449`
- **Kind / category:** `root-declaration` / `file`
- **Priority:** **optional**
- **Current description:** Schema for JavaScript `File` objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.File`.
- **Suggested snippet:** Use `Schema.File` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FileReviver`

- **Source:** `packages/effect/src/Schema.ts:12515`
- **Kind / category:** `root-declaration` / `file`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `File` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.FileReviver`.
- **Suggested snippet:** Use `Schema.FileReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FormData (type)`

- **Source:** `packages/effect/src/Schema.ts:12526`
- **Kind / category:** `root-declaration` / `FormData`
- **Priority:** **optional**
- **Current description:** Type-level representation of `FormData`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.FormData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FormData (value)`

- **Source:** `packages/effect/src/Schema.ts:12541`
- **Kind / category:** `root-declaration` / `FormData`
- **Priority:** **optional**
- **Current description:** Schema for JavaScript `FormData` objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.FormData`.
- **Suggested snippet:** Use `Schema.FormData` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FormDataReviver`

- **Source:** `packages/effect/src/Schema.ts:12597`
- **Kind / category:** `root-declaration` / `FormData`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `FormData` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.FormDataReviver`.
- **Suggested snippet:** Use `Schema.FormDataReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.fromFormData`

- **Source:** `packages/effect/src/Schema.ts:12608`
- **Kind / category:** `root-declaration` / `FormData`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `fromFormData`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.fromFormData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URLSearchParams (type)`

- **Source:** `packages/effect/src/Schema.ts:12704`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **optional**
- **Current description:** Type-level representation of `URLSearchParams`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.URLSearchParams`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URLSearchParams (value)`

- **Source:** `packages/effect/src/Schema.ts:12718`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **optional**
- **Current description:** Schema for JavaScript `URLSearchParams` objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.URLSearchParams`.
- **Suggested snippet:** Use `Schema.URLSearchParams` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.URLSearchParamsReviver`

- **Source:** `packages/effect/src/Schema.ts:12750`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `URLSearchParams` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.URLSearchParamsReviver`.
- **Suggested snippet:** Use `Schema.URLSearchParamsReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.fromURLSearchParams`

- **Source:** `packages/effect/src/Schema.ts:12761`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `fromURLSearchParams`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.fromURLSearchParams`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.NumberFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:12852`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Type-level representation of `NumberFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.NumberFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.NumberFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:12873`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Schema that parses a string into a `number` using JavaScript number coercion.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.NumberFromString`.
- **Suggested snippet:** Use `Schema.NumberFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FiniteFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:12883`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Type-level representation of `FiniteFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.FiniteFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FiniteFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:12902`
- **Kind / category:** `root-declaration` / `Number`
- **Priority:** **optional**
- **Current description:** Schema that parses a string into a finite number.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.FiniteFromString`.
- **Suggested snippet:** Use `Schema.FiniteFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigIntFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:12912`
- **Kind / category:** `root-declaration` / `BigInt`
- **Priority:** **optional**
- **Current description:** Type-level representation of `BigIntFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BigIntFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigIntFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:12944`
- **Kind / category:** `root-declaration` / `BigInt`
- **Priority:** **optional**
- **Current description:** Schema that parses a string into a `bigint`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.BigIntFromString`.
- **Suggested snippet:** Use `Schema.BigIntFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Trimmed (type)`

- **Source:** `packages/effect/src/Schema.ts:12954`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Trimmed`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Trimmed`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Trimmed (value)`

- **Source:** `packages/effect/src/Schema.ts:12964`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Schema for strings that contains no leading or trailing whitespaces.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Trimmed`.
- **Suggested snippet:** Use `Schema.Trimmed` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Trim (type)`

- **Source:** `packages/effect/src/Schema.ts:12972`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Trim`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Trim`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Trim (value)`

- **Source:** `packages/effect/src/Schema.ts:12990`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Schema that trims whitespace from a string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Trim`.
- **Suggested snippet:** Use `Schema.Trim` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringFromBase64 (type)`

- **Source:** `packages/effect/src/Schema.ts:13000`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `StringFromBase64`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StringFromBase64`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringFromBase64 (value)`

- **Source:** `packages/effect/src/Schema.ts:13018`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Decodes a base64 (RFC4648) encoded string into a UTF-8 string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.StringFromBase64`.
- **Suggested snippet:** Use `Schema.StringFromBase64` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringFromBase64Url (type)`

- **Source:** `packages/effect/src/Schema.ts:13030`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `StringFromBase64Url`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StringFromBase64Url`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringFromBase64Url (value)`

- **Source:** `packages/effect/src/Schema.ts:13048`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Decodes a base64 (URL) encoded string into a UTF-8 string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.StringFromBase64Url`.
- **Suggested snippet:** Use `Schema.StringFromBase64Url` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringFromHex (type)`

- **Source:** `packages/effect/src/Schema.ts:13060`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `StringFromHex`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StringFromHex`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringFromHex (value)`

- **Source:** `packages/effect/src/Schema.ts:13078`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Decodes a hex encoded string into a UTF-8 string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.StringFromHex`.
- **Suggested snippet:** Use `Schema.StringFromHex` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringFromUriComponent`

- **Source:** `packages/effect/src/Schema.ts:13090`
- **Kind / category:** `root-declaration` / `string`
- **Priority:** **optional**
- **Current description:** Type-level representation of `StringFromUriComponent`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StringFromUriComponent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.PropertyKey`

- **Source:** `packages/effect/src/Schema.ts:13139`
- **Kind / category:** `root-declaration` / `PropertyKey`
- **Priority:** **optional**
- **Current description:** Schema for property keys accepted by Effect schemas: finite `number`, `symbol`, or `string`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.PropertyKey`.
- **Suggested snippet:** Use `Schema.PropertyKey` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StandardSchemaV1FailureResult`

- **Source:** `packages/effect/src/Schema.ts:13152`
- **Kind / category:** `root-declaration` / `Standard Schema`
- **Priority:** **optional**
- **Current description:** Schema for a Standard Schema v1 failure result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.StandardSchemaV1FailureResult`.
- **Suggested snippet:** Use `Schema.StandardSchemaV1FailureResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BooleanFromBit (type)`

- **Source:** `packages/effect/src/Schema.ts:13165`
- **Kind / category:** `root-declaration` / `boolean`
- **Priority:** **optional**
- **Current description:** Type-level representation of `BooleanFromBit`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BooleanFromBit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BooleanFromBit (value)`

- **Source:** `packages/effect/src/Schema.ts:13188`
- **Kind / category:** `root-declaration` / `boolean`
- **Priority:** **optional**
- **Current description:** Schema for a boolean parsed from 0 or 1.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.BooleanFromBit`.
- **Suggested snippet:** Use `Schema.BooleanFromBit` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8Array (type)`

- **Source:** `packages/effect/src/Schema.ts:13204`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Uint8Array`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Uint8Array`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8Array (value)`

- **Source:** `packages/effect/src/Schema.ts:13226`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Schema for JavaScript `Uint8Array` objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Uint8Array`.
- **Suggested snippet:** Use `Schema.Uint8Array` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8ArrayReviver`

- **Source:** `packages/effect/src/Schema.ts:13256`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Uint8Array` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Uint8ArrayReviver`.
- **Suggested snippet:** Use `Schema.Uint8ArrayReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8ArrayFromBase64 (type)`

- **Source:** `packages/effect/src/Schema.ts:13267`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Uint8ArrayFromBase64`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Uint8ArrayFromBase64`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8ArrayFromBase64 (value)`

- **Source:** `packages/effect/src/Schema.ts:13286`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Schema that decodes a base64 encoded string into a `Uint8Array`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Uint8ArrayFromBase64`.
- **Suggested snippet:** Use `Schema.Uint8ArrayFromBase64` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8ArrayFromBase64Url (type)`

- **Source:** `packages/effect/src/Schema.ts:13296`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Uint8ArrayFromBase64Url`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Uint8ArrayFromBase64Url`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8ArrayFromBase64Url (value)`

- **Source:** `packages/effect/src/Schema.ts:13315`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Schema that decodes a base64 (URL) encoded string into a `Uint8Array`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Uint8ArrayFromBase64Url`.
- **Suggested snippet:** Use `Schema.Uint8ArrayFromBase64Url` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8ArrayFromHex (type)`

- **Source:** `packages/effect/src/Schema.ts:13330`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Uint8ArrayFromHex`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Uint8ArrayFromHex`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Uint8ArrayFromHex (value)`

- **Source:** `packages/effect/src/Schema.ts:13349`
- **Kind / category:** `root-declaration` / `Uint8Array`
- **Priority:** **optional**
- **Current description:** Schema that decodes a hex encoded string into a `Uint8Array`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Uint8ArrayFromHex`.
- **Suggested snippet:** Use `Schema.Uint8ArrayFromHex` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtc (type)`

- **Source:** `packages/effect/src/Schema.ts:13364`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateTimeUtc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateTimeUtc`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtc (value)`

- **Source:** `packages/effect/src/Schema.ts:13389`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema for `DateTime.Utc` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeUtc`.
- **Suggested snippet:** Use `Schema.DateTimeUtc` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtcReviver`

- **Source:** `packages/effect/src/Schema.ts:13431`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `DateTimeUtc` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeUtcReviver`.
- **Suggested snippet:** Use `Schema.DateTimeUtcReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtcFromDate (type)`

- **Source:** `packages/effect/src/Schema.ts:13442`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateTimeUtcFromDate`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateTimeUtcFromDate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtcFromDate (value)`

- **Source:** `packages/effect/src/Schema.ts:13470`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema that decodes a `Date` into a `DateTime.Utc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeUtcFromDate`.
- **Suggested snippet:** Use `Schema.DateTimeUtcFromDate` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtcFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:13483`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateTimeUtcFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateTimeUtcFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtcFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:13508`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema that decodes a date-time string into a `DateTime.Utc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeUtcFromString`.
- **Suggested snippet:** Use `Schema.DateTimeUtcFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtcFromMillis (type)`

- **Source:** `packages/effect/src/Schema.ts:13523`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateTimeUtcFromMillis`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateTimeUtcFromMillis`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeUtcFromMillis (value)`

- **Source:** `packages/effect/src/Schema.ts:13545`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema that decodes a number into a `DateTime.Utc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeUtcFromMillis`.
- **Suggested snippet:** Use `Schema.DateTimeUtcFromMillis` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneOffset (type)`

- **Source:** `packages/effect/src/Schema.ts:13558`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `TimeZoneOffset`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TimeZoneOffset`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneOffset (value)`

- **Source:** `packages/effect/src/Schema.ts:13574`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema for `DateTime.TimeZone.Offset` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZoneOffset`.
- **Suggested snippet:** Use `Schema.TimeZoneOffset` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneOffsetReviver`

- **Source:** `packages/effect/src/Schema.ts:13611`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `TimeZoneOffset` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZoneOffsetReviver`.
- **Suggested snippet:** Use `Schema.TimeZoneOffsetReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneNamed (type)`

- **Source:** `packages/effect/src/Schema.ts:13622`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `TimeZoneNamed`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TimeZoneNamed`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneNamed (value)`

- **Source:** `packages/effect/src/Schema.ts:13640`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema for `DateTime.TimeZone.Named` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZoneNamed`.
- **Suggested snippet:** Use `Schema.TimeZoneNamed` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneNamedReviver`

- **Source:** `packages/effect/src/Schema.ts:13681`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `TimeZoneNamed` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZoneNamedReviver`.
- **Suggested snippet:** Use `Schema.TimeZoneNamedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneNamedFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:13692`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `TimeZoneNamedFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TimeZoneNamedFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneNamedFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:13710`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema that parses an IANA time zone identifier string into a `DateTime.TimeZone.Named`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZoneNamedFromString`.
- **Suggested snippet:** Use `Schema.TimeZoneNamedFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZone (type)`

- **Source:** `packages/effect/src/Schema.ts:13720`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `TimeZone`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TimeZone`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZone (value)`

- **Source:** `packages/effect/src/Schema.ts:13741`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema for `DateTime.TimeZone` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZone`.
- **Suggested snippet:** Use `Schema.TimeZone` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneReviver`

- **Source:** `packages/effect/src/Schema.ts:13785`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `TimeZone` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZoneReviver`.
- **Suggested snippet:** Use `Schema.TimeZoneReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:13796`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `TimeZoneFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TimeZoneFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TimeZoneFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:13814`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema that parses a time zone string into a `DateTime.TimeZone`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.TimeZoneFromString`.
- **Suggested snippet:** Use `Schema.TimeZoneFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeZoned (type)`

- **Source:** `packages/effect/src/Schema.ts:13824`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateTimeZoned`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateTimeZoned`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeZoned (value)`

- **Source:** `packages/effect/src/Schema.ts:13847`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema for `DateTime.Zoned` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeZoned`.
- **Suggested snippet:** Use `Schema.DateTimeZoned` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeZonedReviver`

- **Source:** `packages/effect/src/Schema.ts:13895`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `DateTimeZoned` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeZonedReviver`.
- **Suggested snippet:** Use `Schema.DateTimeZonedReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeZonedFromString (type)`

- **Source:** `packages/effect/src/Schema.ts:13906`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Type-level representation of `DateTimeZonedFromString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.DateTimeZonedFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.DateTimeZonedFromString (value)`

- **Source:** `packages/effect/src/Schema.ts:13924`
- **Kind / category:** `root-declaration` / `DateTime`
- **Priority:** **optional**
- **Current description:** Schema that parses a zoned DateTime string into a `DateTime.Zoned`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.DateTimeZonedFromString`.
- **Suggested snippet:** Use `Schema.DateTimeZonedFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.LazyArbitrary`

- **Source:** `packages/effect/src/Schema.ts:14503`
- **Kind / category:** `root-declaration` / `Arbitrary`
- **Priority:** **optional**
- **Current description:** A thunk that, given the `fast-check` module, returns an `Arbitrary<T>`. Use this type when you need to defer instantiation of the arbitrary, for example to support recursive schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.LazyArbitrary`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toArbitraryLazy`

- **Source:** `packages/effect/src/Schema.ts:14519`
- **Kind / category:** `root-declaration` / `Arbitrary`
- **Priority:** **optional**
- **Current description:** Derives a `LazyArbitrary` from a schema. The result is memoized so repeated calls with the same schema are cheap.
- **Signature hint:** `declare function toArbitraryLazy<S extends Constraint>(schema: S): LazyArbitrary<S['Type']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toArbitraryLazy`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toArbitraryLazy`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.overrideToFormatter`

- **Source:** `packages/effect/src/Schema.ts:14589`
- **Kind / category:** `root-declaration` / `Formatter`
- **Priority:** **optional**
- **Current description:** Attaches a custom formatter used by `toFormatter`.
- **Signature hint:** `declare function overrideToFormatter<S extends Top>(toFormatter: () => Formatter<S['Type']>): (self: S) => S['Rebuild']`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.overrideToFormatter`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Attaches a custom formatter used by `toFormatter`. Call `Schema.overrideToFormatter` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toFormatter`

- **Source:** `packages/effect/src/Schema.ts:14608`
- **Kind / category:** `root-declaration` / `Formatter`
- **Priority:** **optional**
- **Current description:** Derives a string formatter function from a schema. The formatter converts a value to its human-readable string representation, recursing into structs, arrays, and unions.
- **Signature hint:** `declare function toFormatter<S extends Constraint>(schema: S, options?: { readonly onBefore?: ((ast: SchemaAST.AST, recur: (ast: SchemaAST.AST) => Formatter<any>) => Formatter<any> | undefined) | undefined; }): Formatter<S['Type']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toFormatter`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toFormatter`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.overrideToEquivalence`

- **Source:** `packages/effect/src/Schema.ts:14762`
- **Kind / category:** `root-declaration` / `instances`
- **Priority:** **optional**
- **Current description:** Overrides the equivalence derivation for a schema by supplying a custom `Equivalence`.
- **Signature hint:** `declare function overrideToEquivalence<S extends Top>(toEquivalence: () => Equivalence.Equivalence<S['Type']>): (self: S) => S['Rebuild']`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.overrideToEquivalence`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Overrides the equivalence derivation for a schema by supplying a custom `Equivalence`. Call `Schema.overrideToEquivalence` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toRepresentation`

- **Source:** `packages/effect/src/Schema.ts:14804`
- **Kind / category:** `root-declaration` / `Representation`
- **Priority:** **optional**
- **Current description:** Derives an intermediate `SchemaRepresentation.Document` from the encoded side of a schema.
- **Signature hint:** `declare function toRepresentation(schema: Constraint): SchemaRepresentation.Document`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toRepresentation`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toRepresentation`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ToJsonSchemaOptions`

- **Source:** `packages/effect/src/Schema.ts:14818`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for `toJsonSchemaDocument`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ToJsonSchemaOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toJsonSchemaDocument`

- **Source:** `packages/effect/src/Schema.ts:14902`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Returns a JSON Schema document using draft 2020-12.
- **Signature hint:** `declare function toJsonSchemaDocument(schema: Constraint, options?: ToJsonSchemaOptions): JsonSchema.Document<'draft-2020-12'>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toJsonSchemaDocument`.
- **Suggested snippet:** Create a small public Schema, call `Schema.toJsonSchemaDocument`, and assert a stable JSON Schema projection such as `type`, `required`, or one property schema rather than the entire metadata-rich document.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toCodecJson (type)`

- **Source:** `packages/effect/src/Schema.ts:14920`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `toCodecJson`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.toCodecJson`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toCodecJson (value)`

- **Source:** `packages/effect/src/Schema.ts:14957`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Derives a canonical JSON codec from a schema. The encoded form is `Json`, and decoding produces the schema's `Type`.
- **Signature hint:** `declare function toCodecJson<S extends Constraint>(schema: S): toCodecJson<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toCodecJson`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.toCodecJson`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toCodecIso`

- **Source:** `packages/effect/src/Schema.ts:15079`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Derives an isomorphism codec from a schema. The encoded form is the schema's `Iso` type — the intermediate representation used for round-tripping.
- **Signature hint:** `declare function toCodecIso<S extends Constraint>(schema: S): Codec<S['Type'], S['Iso']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toCodecIso`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toCodecIso`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StringTree`

- **Source:** `packages/effect/src/Schema.ts:15116`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** A `Tree` of `string | undefined` nodes. Leaf values are either a string representation or `undefined` for opaque/declaration types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StringTree`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toCodecStringTree (type)`

- **Source:** `packages/effect/src/Schema.ts:15124`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `toCodecStringTree`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.toCodecStringTree`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toCodecStringTree (value)`

- **Source:** `packages/effect/src/Schema.ts:15159`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Converts a schema to the StringTree canonical codec, where every leaf value becomes a string while preserving the original structure.
- **Signature hint:** `declare function toCodecStringTree<S extends Constraint>(schema: S): toCodecStringTree<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toCodecStringTree`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.toCodecStringTree`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toCodecArrayFromSingle (type)`

- **Source:** `packages/effect/src/Schema.ts:15169`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `toCodecArrayFromSingle`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.toCodecArrayFromSingle`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toCodecArrayFromSingle (value)`

- **Source:** `packages/effect/src/Schema.ts:15208`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Allows array schemas to decode from either an array input or a single value input.
- **Signature hint:** `declare function toCodecArrayFromSingle<S extends Constraint>(schema: S): toCodecArrayFromSingle<S>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toCodecArrayFromSingle`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.toCodecArrayFromSingle`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toEncoderXml`

- **Source:** `packages/effect/src/Schema.ts:15237`
- **Kind / category:** `root-declaration` / `Canonical Codecs`
- **Priority:** **optional**
- **Current description:** Derives an XML encoder from a codec.
- **Signature hint:** `declare function toEncoderXml<T, RE>(codec: ConstraintCodec<T, unknown, unknown, RE>, options?: XmlEncoderOptions): (t: T) => Effect.Effect<string, SchemaError, RE>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toEncoderXml`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Schema.toEncoderXml`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanDateReviver`

- **Source:** `packages/effect/src/Schema.ts:15497`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isGreaterThanDate` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanDateReviver`.
- **Suggested snippet:** Use `Schema.isGreaterThanDateReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanOrEqualToDateReviver`

- **Source:** `packages/effect/src/Schema.ts:15517`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isGreaterThanOrEqualToDate` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanOrEqualToDateReviver`.
- **Suggested snippet:** Use `Schema.isGreaterThanOrEqualToDateReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanDateReviver`

- **Source:** `packages/effect/src/Schema.ts:15537`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLessThanDate` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanDateReviver`.
- **Suggested snippet:** Use `Schema.isLessThanDateReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanOrEqualToDateReviver`

- **Source:** `packages/effect/src/Schema.ts:15557`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLessThanOrEqualToDate` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanOrEqualToDateReviver`.
- **Suggested snippet:** Use `Schema.isLessThanOrEqualToDateReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBetweenDateReviver`

- **Source:** `packages/effect/src/Schema.ts:15577`
- **Kind / category:** `root-declaration` / `Date checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isBetweenDate` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBetweenDateReviver`.
- **Suggested snippet:** Use `Schema.isBetweenDateReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanBigIntReviver`

- **Source:** `packages/effect/src/Schema.ts:15605`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isGreaterThanBigInt` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanBigIntReviver`.
- **Suggested snippet:** Use `Schema.isGreaterThanBigIntReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isGreaterThanOrEqualToBigIntReviver`

- **Source:** `packages/effect/src/Schema.ts:15625`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isGreaterThanOrEqualToBigInt` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isGreaterThanOrEqualToBigIntReviver`.
- **Suggested snippet:** Use `Schema.isGreaterThanOrEqualToBigIntReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanBigIntReviver`

- **Source:** `packages/effect/src/Schema.ts:15645`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLessThanBigInt` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanBigIntReviver`.
- **Suggested snippet:** Use `Schema.isLessThanBigIntReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isLessThanOrEqualToBigIntReviver`

- **Source:** `packages/effect/src/Schema.ts:15665`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isLessThanOrEqualToBigInt` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isLessThanOrEqualToBigIntReviver`.
- **Suggested snippet:** Use `Schema.isLessThanOrEqualToBigIntReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.isBetweenBigIntReviver`

- **Source:** `packages/effect/src/Schema.ts:15685`
- **Kind / category:** `root-declaration` / `BigInt checks`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `isBetweenBigInt` checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.isBetweenBigIntReviver`.
- **Suggested snippet:** Use `Schema.isBetweenBigIntReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toIso`

- **Source:** `packages/effect/src/Schema.ts:15712`
- **Kind / category:** `root-declaration` / `Optic`
- **Priority:** **optional**
- **Current description:** Derives an `Iso` optic from a schema that isomorphically converts between the schema's `Type` and its `Iso` (intermediate / serialized form).
- **Signature hint:** `declare function toIso<S extends Constraint>(schema: S): Optic_.Iso<S['Type'], S['Iso']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toIso`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toIso`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toIsoSource`

- **Source:** `packages/effect/src/Schema.ts:15723`
- **Kind / category:** `root-declaration` / `Optic`
- **Priority:** **optional**
- **Current description:** Returns an identity `Iso` over the schema's source (`Type`) side.
- **Signature hint:** `declare function toIsoSource<S extends Constraint>(_: S): Optic_.Iso<S['Type'], S['Type']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toIsoSource`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toIsoSource`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toIsoFocus`

- **Source:** `packages/effect/src/Schema.ts:15733`
- **Kind / category:** `root-declaration` / `Optic`
- **Priority:** **optional**
- **Current description:** Returns an identity `Iso` over the schema's focus (`Iso`) side.
- **Signature hint:** `declare function toIsoFocus<S extends Constraint>(_: S): Optic_.Iso<S['Iso'], S['Iso']>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toIsoFocus`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toIsoFocus`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.overrideToCodecIso (type)`

- **Source:** `packages/effect/src/Schema.ts:15743`
- **Kind / category:** `root-declaration` / `Optic`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `overrideToCodecIso`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.overrideToCodecIso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.overrideToCodecIso (value)`

- **Source:** `packages/effect/src/Schema.ts:15782`
- **Kind / category:** `root-declaration` / `Optic`
- **Priority:** **optional**
- **Current description:** Overrides a schema's derived ISO codec with an explicit target codec.
- **Signature hint:** `declare function overrideToCodecIso<S extends Constraint, Iso>(to: ConstraintCodec<Iso>, transformation: { readonly decode: SchemaGetter.Getter<S['Type'], Iso>; readonly encode: SchemaGetter.Getter<Iso, S['Type']>; }): (schema: S) => overrideToCodecIso<S, Iso>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.overrideToCodecIso`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.overrideToCodecIso`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.toDifferJsonPatch`

- **Source:** `packages/effect/src/Schema.ts:15811`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Derives a JSON Patch differ from a codec. Serializes values to JSON (via `toCodecJson`), computes RFC 6902 JSON Patch operations between old and new values, and can apply patches back to the typed value.
- **Signature hint:** `declare function toDifferJsonPatch<T>(schema: ConstraintCodec<T, unknown>): Differ<T, JsonPatch.JsonPatch>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.toDifferJsonPatch`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Schema.toDifferJsonPatch`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tree (type)`

- **Source:** `packages/effect/src/Schema.ts:15834`
- **Kind / category:** `root-declaration` / `Tree`
- **Priority:** **optional**
- **Current description:** Recursive tree type whose leaves are `Node` values and whose branches are readonly arrays or string-keyed records of child trees.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tree`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TreeRecord`

- **Source:** `packages/effect/src/Schema.ts:15843`
- **Kind / category:** `root-declaration` / `Tree`
- **Priority:** **optional**
- **Current description:** A record node in a `Tree`: an object mapping string keys to child `Tree` nodes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TreeRecord`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tree (value)`

- **Source:** `packages/effect/src/Schema.ts:15855`
- **Kind / category:** `root-declaration` / `Tree`
- **Priority:** **optional**
- **Current description:** Creates a recursive schema for a `Tree` of values described by `node`. The resulting schema accepts a single node value, an array of trees, or an object whose values are trees.
- **Signature hint:** `declare function Tree<S extends Constraint>(node: S): Union<readonly [S, $Array<suspend<Codec<Tree<S['Type']>, Tree<S['Encoded']>, S['DecodingServices'], S['EncodingServices']>>>, $Record<String, suspend<Codec<Tree<S['Type']>, Tree<S['Encoded']>, S['DecodingServices'], S['EncodingServices']>>>]>`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Tree`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a recursive schema for a `Tree` of values described by `node`. The resulting schema accepts a single node value, an array of trees, or an object whose values are trees. Call `Schema.Tree` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.JsonReviver`

- **Source:** `packages/effect/src/Schema.ts:15933`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `Json` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.JsonReviver`.
- **Suggested snippet:** Use `Schema.JsonReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.MutableJson (value)`

- **Source:** `packages/effect/src/Schema.ts:15979`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema that accepts any mutable JSON-compatible value. See `Json` for the immutable variant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.MutableJson`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.MutableJson`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.MutableJsonReviver`

- **Source:** `packages/effect/src/Schema.ts:15998`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Reviver for persisted `MutableJson` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.MutableJsonReviver`.
- **Suggested snippet:** Use `Schema.MutableJsonReviver` only in a focused Schema representation round trip: persist a schema carrying the corresponding declaration or check, restore it with this reviver, and assert one decoded value. Leave it example-free if that setup duplicates the family anchor.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.resolveAnnotations`

- **Source:** `packages/effect/src/Schema.ts:16016`
- **Kind / category:** `root-declaration` / `Schema Resolvers`
- **Priority:** **optional**
- **Current description:** Resolves the typed annotations from a schema. The term "resolve" (rather than "get") reflects the lookup strategy: if the schema has checks, the annotations are taken from the last check; otherwise they are taken from the base schema instance.
- **Signature hint:** `declare function resolveAnnotations<S extends Constraint>(schema: S): Annotations.Bottom<S['Type'], S['~type.parameters']> | undefined`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.resolveAnnotations`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Resolves the typed annotations from a schema. The term "resolve" (rather than "get") reflects the lookup strategy: if the schema has checks, the annotations are taken from the last check; otherwise they are taken from the base schema instance. Call `Schema.resolveAnnotations` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.resolveAnnotationsKey`

- **Source:** `packages/effect/src/Schema.ts:16030`
- **Kind / category:** `root-declaration` / `Schema Resolvers`
- **Priority:** **optional**
- **Current description:** Resolves the context (key-level) annotations from a schema. Context annotations are those attached via `annotateKey` and live on the AST's `context` rather than on the schema node itself.
- **Signature hint:** `declare function resolveAnnotationsKey<S extends Constraint>(schema: S): Annotations.Key<S['Type']> | undefined`
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.resolveAnnotationsKey`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Resolves the context (key-level) annotations from a schema. Context annotations are those attached via `annotateKey` and live on the AST's `context` rather than on the schema node itself. Call `Schema.resolveAnnotationsKey` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Optionality`

- **Source:** `packages/effect/src/Schema.ts:81`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Whether a schema field is required or optional within a struct.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Optionality`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Mutability`

- **Source:** `packages/effect/src/Schema.ts:91`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Whether a schema field is readonly or mutable within a struct.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Mutability`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ConstructorDefault`

- **Source:** `packages/effect/src/Schema.ts:102`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Whether a schema field has a constructor default value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ConstructorDefault`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.MakeOptions.parseOptions`

- **Source:** `packages/effect/src/Schema.ts:122`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The parse options to use for the schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.MakeOptions.parseOptions` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.MakeOptions.disableChecks`

- **Source:** `packages/effect/src/Schema.ts:126`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to disable validation for the schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.MakeOptions.disableChecks` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BottomWithoutNew`

- **Source:** `packages/effect/src/Schema.ts:148`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The fully-parameterized schema interface without a construct signature. Exposes all 14 type parameters controlling type inference, mutability, optionality, services, and transformation behavior.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BottomWithoutNew`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BottomWithoutNew.make`

- **Source:** `packages/effect/src/Schema.ts:213`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Constructs a value from the make input representation synchronously.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.BottomWithoutNew.make` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BottomWithoutNew.makeOption`

- **Source:** `packages/effect/src/Schema.ts:237`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Constructs a value from the make input representation, returning `Option.none` when validation fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.BottomWithoutNew.makeOption` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BottomWithoutNew.makeEffect`

- **Source:** `packages/effect/src/Schema.ts:250`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Constructs a value from the make input representation, returning validation failures in the `Effect` error channel.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.BottomWithoutNew.makeEffect` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Bottom`

- **Source:** `packages/effect/src/Schema.ts:273`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Fully-parameterized base interface for schemas that can be extended directly by TypeScript classes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Bottom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BottomLazyWithoutNew`

- **Source:** `packages/effect/src/Schema.ts:335`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Lazy `BottomWithoutNew` variant for schema implementations that compute their public views on demand.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BottomLazyWithoutNew`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BottomLazy`

- **Source:** `packages/effect/src/Schema.ts:384`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Lazy `Bottom` variant for schemas that can be extended directly by TypeScript classes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BottomLazy`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Top`

- **Source:** `packages/effect/src/Schema.ts:735`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The existential "any schema" type — all type parameters are erased to `unknown`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Top`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Constraint`

- **Source:** `packages/effect/src/Schema.ts:777`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lightweight structural constraint for APIs that accept schema values but only read their data and type-level views.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Constraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ConstraintCodec`

- **Source:** `packages/effect/src/Schema.ts:814`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lightweight structural constraint for APIs that need codec type views but do not need the full schema protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ConstraintCodec`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ConstraintDecoder`

- **Source:** `packages/effect/src/Schema.ts:838`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lightweight structural constraint for APIs that need decoder type views but do not need the full schema protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ConstraintDecoder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ConstraintEncoder`

- **Source:** `packages/effect/src/Schema.ts:857`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lightweight structural constraint for APIs that need encoder type views but do not need the full schema protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ConstraintEncoder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ConstraintRebuildable`

- **Source:** `packages/effect/src/Schema.ts:872`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lightweight structural constraint for APIs that need schema views and the rebuilt schema type, but do not call the full schema protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ConstraintRebuildable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Schema`

- **Source:** `packages/effect/src/Schema.ts:881`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace of type-level helpers for `Schema`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Schema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Codec`

- **Source:** `packages/effect/src/Schema.ts:941`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace of type-level helpers for `Codec`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Codec`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Decoder`

- **Source:** `packages/effect/src/Schema.ts:1054`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A schema that tracks the decoded type `T` and the Effect services required during decoding (`RD`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Decoder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Encoder`

- **Source:** `packages/effect/src/Schema.ts:1077`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A schema that tracks the encoded type `E` and the Effect services required during encoding (`RE`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Encoder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Optic`

- **Source:** `packages/effect/src/Schema.ts:1131`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A schema that additionally supports optic (lens/prism) operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Optic`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.optionalKey`

- **Source:** `packages/effect/src/Schema.ts:2348`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `optionalKey`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.optionalKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.optional`

- **Source:** `packages/effect/src/Schema.ts:2426`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `optional`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.optional`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.mutableKey (type)`

- **Source:** `packages/effect/src/Schema.ts:2495`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `mutableKey`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.mutableKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Literal`

- **Source:** `packages/effect/src/Schema.ts:2709`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Literal`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Literal`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteral (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:2753`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `TemplateLiteral` helper types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteral (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteral.SchemaPart`

- **Source:** `packages/effect/src/Schema.ts:2765`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Constraint for schema parts that can appear inside a `TemplateLiteral`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteral.SchemaPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteral.LiteralPart`

- **Source:** `packages/effect/src/Schema.ts:2775`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Literal value that can be used directly as a part of a `TemplateLiteral`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteral.LiteralPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteral.Part`

- **Source:** `packages/effect/src/Schema.ts:2784`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A single part of a `TemplateLiteral`, either an interpolated schema part or a literal `string`, `number`, or `bigint`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteral.Part`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteral.Parts`

- **Source:** `packages/effect/src/Schema.ts:2792`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Ordered list of parts used to construct a `TemplateLiteral` schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteral.Parts`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteral.Encoded`

- **Source:** `packages/effect/src/Schema.ts:2808`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the encoded string literal type produced by concatenating the encoded forms of all template literal parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteral.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteral (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:2818`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `TemplateLiteral`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteral (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteralParser (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:2874`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `TemplateLiteralParser` helper types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteralParser (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteralParser.Type`

- **Source:** `packages/effect/src/Schema.ts:2886`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the decoded tuple type produced by `TemplateLiteralParser`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteralParser.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TemplateLiteralParser (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:2901`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `TemplateLiteralParser`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TemplateLiteralParser (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Enum`

- **Source:** `packages/effect/src/Schema.ts:2956`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Enum`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Enum`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Never (type)`

- **Source:** `packages/effect/src/Schema.ts:2999`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Never`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Never`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Any (type)`

- **Source:** `packages/effect/src/Schema.ts:3015`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Any`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Unknown (type)`

- **Source:** `packages/effect/src/Schema.ts:3032`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Unknown`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Unknown`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Null (type)`

- **Source:** `packages/effect/src/Schema.ts:3054`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Null`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Null`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Undefined (type)`

- **Source:** `packages/effect/src/Schema.ts:3071`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Undefined`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Undefined`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.String (type)`

- **Source:** `packages/effect/src/Schema.ts:3088`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `String`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.String`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Number (type)`

- **Source:** `packages/effect/src/Schema.ts:3104`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Number`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Number`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Boolean (type)`

- **Source:** `packages/effect/src/Schema.ts:3128`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Boolean`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Boolean`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.BigInt (type)`

- **Source:** `packages/effect/src/Schema.ts:3167`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `BigInt`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.BigInt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Void (type)`

- **Source:** `packages/effect/src/Schema.ts:3190`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Void`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Void`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ObjectKeyword (type)`

- **Source:** `packages/effect/src/Schema.ts:3219`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `ObjectKeyword`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.ObjectKeyword`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.UniqueSymbol`

- **Source:** `packages/effect/src/Schema.ts:3236`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `UniqueSymbol`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.UniqueSymbol`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:3278`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for struct field type utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.Fields`

- **Source:** `packages/effect/src/Schema.ts:3285`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Constraint for a struct field map: an object whose values are schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct.Fields`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.Type`

- **Source:** `packages/effect/src/Schema.ts:3349`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the decoded object type for a struct field map.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.Iso`

- **Source:** `packages/effect/src/Schema.ts:3363`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the iso object type for a struct field map from each field schema's `Iso` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct.Iso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.Encoded`

- **Source:** `packages/effect/src/Schema.ts:3377`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the encoded object type for a struct field map.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.DecodingServices`

- **Source:** `packages/effect/src/Schema.ts:3386`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of all decoding service requirements needed by the schemas in a struct field map.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct.DecodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.EncodingServices`

- **Source:** `packages/effect/src/Schema.ts:3395`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of all encoding service requirements needed by the schemas in a struct field map.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct.EncodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.MakeIn`

- **Source:** `packages/effect/src/Schema.ts:3420`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the input object type accepted when constructing a struct value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct.MakeIn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:3429`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Struct`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Struct (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Struct.mapFields`

- **Source:** `packages/effect/src/Schema.ts:3476`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a new struct with the fields modified by the provided function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Struct.mapFields` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record`

- **Source:** `packages/effect/src/Schema.ts:3739`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `Record` type utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record.Key`

- **Source:** `packages/effect/src/Schema.ts:3751`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Constraint for schemas that can be used as record keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record.Key`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record.Type`

- **Source:** `packages/effect/src/Schema.ts:3769`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the decoded object type for a record schema from its key and value schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record.Iso`

- **Source:** `packages/effect/src/Schema.ts:3783`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the iso object type for a record schema from the key schema's `Iso` keys and the value schema's `Iso` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record.Iso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record.Encoded`

- **Source:** `packages/effect/src/Schema.ts:3802`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the encoded object type for a record schema from the key and value schemas' encoded types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record.DecodingServices`

- **Source:** `packages/effect/src/Schema.ts:3816`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of the decoding service requirements of a record's key schema and value schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record.DecodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record.EncodingServices`

- **Source:** `packages/effect/src/Schema.ts:3827`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of the encoding service requirements of a record's key schema and value schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record.EncodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Record.MakeIn`

- **Source:** `packages/effect/src/Schema.ts:3843`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the input object type accepted when constructing a record value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Record.MakeIn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.$Record`

- **Source:** `packages/effect/src/Schema.ts:3857`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Record`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.$Record`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:3928`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `StructWithRest` type utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.Objects`

- **Source:** `packages/effect/src/Schema.ts:3936`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Constraint for object-like schemas that can be used as the fixed portion of a `StructWithRest` schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.Objects`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.Records`

- **Source:** `packages/effect/src/Schema.ts:3945`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Readonly list of record schemas that provide the additional index signatures for a `StructWithRest` schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.Records`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.Type`

- **Source:** `packages/effect/src/Schema.ts:3966`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the decoded type for `StructWithRest` by intersecting the base object schema's decoded `Type` with the decoded types of all rest record schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.Iso`

- **Source:** `packages/effect/src/Schema.ts:3975`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the iso type for `StructWithRest` by intersecting the base object schema's `Iso` type with the `Iso` types of all rest record schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.Iso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.Encoded`

- **Source:** `packages/effect/src/Schema.ts:3984`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the encoded type for `StructWithRest` by intersecting the base object schema's encoded type with the encoded types of all rest record schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.MakeIn`

- **Source:** `packages/effect/src/Schema.ts:3994`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the input type accepted when constructing a `StructWithRest` value by intersecting the base object's make input with the make inputs of all rest record schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.MakeIn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.DecodingServices`

- **Source:** `packages/effect/src/Schema.ts:4011`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of the decoding service requirements of the base object schema and all rest record schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.DecodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest.EncodingServices`

- **Source:** `packages/effect/src/Schema.ts:4024`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of the encoding service requirements of the base object schema and all rest record schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest.EncodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.StructWithRest (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:4097`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `StructWithRest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.StructWithRest (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:4167`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `Tuple` type utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.Elements`

- **Source:** `packages/effect/src/Schema.ts:4175`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Constraint for the readonly array of element schemas used to define a fixed-length `Tuple` schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple.Elements`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.Type`

- **Source:** `packages/effect/src/Schema.ts:4198`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the decoded tuple type for a tuple element schema array.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.Iso`

- **Source:** `packages/effect/src/Schema.ts:4217`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the iso tuple type for a tuple element schema array from each element schema's `Iso` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple.Iso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.Encoded`

- **Source:** `packages/effect/src/Schema.ts:4240`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the encoded tuple type for a tuple element schema array.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.DecodingServices`

- **Source:** `packages/effect/src/Schema.ts:4249`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of all decoding service requirements needed by the tuple element schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple.DecodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.EncodingServices`

- **Source:** `packages/effect/src/Schema.ts:4258`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Union of all encoding service requirements needed by the tuple element schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple.EncodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.MakeIn`

- **Source:** `packages/effect/src/Schema.ts:4283`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the input tuple type accepted when constructing a tuple value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple.MakeIn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:4292`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Tuple`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Tuple (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Tuple.mapElements`

- **Source:** `packages/effect/src/Schema.ts:4322`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a new tuple with the elements modified by the provided function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Tuple.mapElements` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:4378`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `TupleWithRest` type utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest.TupleType`

- **Source:** `packages/effect/src/Schema.ts:4386`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Constraint for tuple-like schemas that can be used as the fixed leading portion of a `TupleWithRest` schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest.TupleType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest.Rest`

- **Source:** `packages/effect/src/Schema.ts:4405`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Non-empty list of schemas used for the rest portion of a `TupleWithRest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest.Rest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest.Type`

- **Source:** `packages/effect/src/Schema.ts:4419`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the decoded tuple type for a `TupleWithRest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest.Iso`

- **Source:** `packages/effect/src/Schema.ts:4439`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the iso tuple type for a `TupleWithRest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest.Iso`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest.Encoded`

- **Source:** `packages/effect/src/Schema.ts:4459`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the encoded tuple type for `TupleWithRest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest.MakeIn`

- **Source:** `packages/effect/src/Schema.ts:4479`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the constructor input tuple type for `TupleWithRest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest.MakeIn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TupleWithRest (type) (type)`

- **Source:** `packages/effect/src/Schema.ts:4494`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `TupleWithRest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TupleWithRest (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.$Array`

- **Source:** `packages/effect/src/Schema.ts:4555`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Array`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.$Array`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.NonEmptyArray`

- **Source:** `packages/effect/src/Schema.ts:4610`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `NonEmptyArray`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.NonEmptyArray`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.UniqueArray (type)`

- **Source:** `packages/effect/src/Schema.ts:4704`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `UniqueArray`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.UniqueArray`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Union`

- **Source:** `packages/effect/src/Schema.ts:4789`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Union`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Union`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Union.mapMembers`

- **Source:** `packages/effect/src/Schema.ts:4819`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a new union with the members modified by the provided function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Union.mapMembers` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Literals`

- **Source:** `packages/effect/src/Schema.ts:4886`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Literals`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Literals`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Literals.mapMembers`

- **Source:** `packages/effect/src/Schema.ts:4894`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Map over the members of the union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Literals.mapMembers` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.NullOr (type)`

- **Source:** `packages/effect/src/Schema.ts:4947`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `NullOr`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.NullOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.UndefinedOr (type)`

- **Source:** `packages/effect/src/Schema.ts:4970`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `UndefinedOr`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.UndefinedOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.NullishOr (type)`

- **Source:** `packages/effect/src/Schema.ts:4993`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `NullishOr`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.NullishOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.suspend`

- **Source:** `packages/effect/src/Schema.ts:5016`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `suspend`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.suspend`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.WithoutConstructorDefault`

- **Source:** `packages/effect/src/Schema.ts:5711`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Constraint used to ensure a schema field does not already have a constructor default.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.WithoutConstructorDefault`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TaggedStruct`

- **Source:** `packages/effect/src/Schema.ts:6091`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `TaggedStruct`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TaggedStruct`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.TaggedUnion`

- **Source:** `packages/effect/src/Schema.ts:6298`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `TaggedUnion`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.TaggedUnion`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Opaque`

- **Source:** `packages/effect/src/Schema.ts:6375`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Opaque`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Opaque`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.instanceOf`

- **Source:** `packages/effect/src/Schema.ts:6433`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `instanceOf`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.instanceOf`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FilterIssue`

- **Source:** `packages/effect/src/Schema.ts:6567`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A single failure reported by a filter predicate. Used as the element type of the array arm of `FilterOutput`, and also accepted on its own.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.FilterIssue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.FilterOutput`

- **Source:** `packages/effect/src/Schema.ts:6595`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The value a filter predicate (see `makeFilter`) may return.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.FilterOutput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ErrorOptions.includeStack`

- **Source:** `packages/effect/src/Schema.ts:10578`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Includes string stack traces in encoded `Error` values when set to `true`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.ErrorOptions.includeStack` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ErrorOptions.excludeCause`

- **Source:** `packages/effect/src/Schema.ts:10585`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Excludes `Error.cause` values from encoded `Error` values when set to `true`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.ErrorOptions.excludeCause` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.fromJsonString`

- **Source:** `packages/effect/src/Schema.ts:12381`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `fromJsonString`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.fromJsonString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Class`

- **Source:** `packages/effect/src/Schema.ts:13938`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation returned by `Class`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Class`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Class.mapFields`

- **Source:** `packages/effect/src/Schema.ts:13982`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a new struct with the fields modified by the provided function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Class.mapFields` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Class.extend`

- **Source:** `packages/effect/src/Schema.ts:14010`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a function that creates a schema-backed subclass with this class's fields plus additional fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Class.extend` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ToJsonSchemaOptions.additionalProperties`

- **Source:** `packages/effect/src/Schema.ts:14830`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Controls how additional properties are handled while resolving the JSON schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.ToJsonSchemaOptions.additionalProperties` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.ToJsonSchemaOptions.generateDescriptions`

- **Source:** `packages/effect/src/Schema.ts:14835`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Controls whether to generate descriptions for checks (if the user has not provided them) based on the `expected` annotation of the check.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.ToJsonSchemaOptions.generateDescriptions` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Json`

- **Source:** `packages/effect/src/Schema.ts:15879`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Recursive TypeScript type for any valid immutable JSON value: `null`, `number`, `boolean`, `string`, a readonly array of `Json` values, or a readonly record of `string → Json`. For the corresponding schema, see the `Json` const.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Json`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.JsonArray`

- **Source:** `packages/effect/src/Schema.ts:15887`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A readonly array of `Json` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.JsonArray`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.JsonObject`

- **Source:** `packages/effect/src/Schema.ts:15895`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A readonly record whose values are `Json` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.JsonObject`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.MutableJson (type)`

- **Source:** `packages/effect/src/Schema.ts:15952`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Recursive TypeScript type for mutable JSON values: `null`, `number`, `boolean`, `string`, mutable arrays, or mutable string-keyed records.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.MutableJson`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.MutableJsonArray`

- **Source:** `packages/effect/src/Schema.ts:15960`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A mutable array of `MutableJson` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.MutableJsonArray`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.MutableJsonObject`

- **Source:** `packages/effect/src/Schema.ts:15968`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A mutable record whose values are `MutableJson` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.MutableJsonObject`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations`

- **Source:** `packages/effect/src/Schema.ts:16046`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** The `Annotations` namespace groups all annotation interfaces used to attach metadata to schemas. Annotations control documentation, validation messages, JSON Schema generation, equivalence, arbitrary generation, and more.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Augment`

- **Source:** `packages/effect/src/Schema.ts:16100`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Annotations shared by all schema nodes. These map to common JSON Schema / OpenAPI fields: `title`, `description`, `format`, etc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.Augment`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Augment.expected`

- **Source:** `packages/effect/src/Schema.ts:16112`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Human-readable description of what a value is expected to satisfy.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Augment.expected` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Documentation`

- **Source:** `packages/effect/src/Schema.ts:16130`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extends `Augment` with type-parametric `default` and `examples` fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.Documentation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Key`

- **Source:** `packages/effect/src/Schema.ts:16143`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Annotations for struct property schemas. Extends `Documentation` with an optional `messageMissingKey` to override the error message when the property key is absent during decoding.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.Key`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Key.messageMissingKey`

- **Source:** `packages/effect/src/Schema.ts:16147`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to use when a key is missing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Key.messageMissingKey` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Bottom`

- **Source:** `packages/effect/src/Schema.ts:16159`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base annotations shared by all composite schema nodes. Extends `Documentation` with error messages, branding, parse options, and arbitrary generation hooks. `Declaration` and other annotation interfaces build on top of this.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.Bottom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Bottom.message`

- **Source:** `packages/effect/src/Schema.ts:16171`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Complete message to use when this schema node reports an issue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Bottom.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Bottom.messageUnexpectedKey`

- **Source:** `packages/effect/src/Schema.ts:16175`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to use when a key is unexpected.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Bottom.messageUnexpectedKey` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Bottom.identifier`

- **Source:** `packages/effect/src/Schema.ts:16190`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Stable identifier for this schema node.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Bottom.identifier` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Bottom.brands`

- **Source:** `packages/effect/src/Schema.ts:16195`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Accumulated brands when multiple brands are added with `Schema.brand`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Bottom.brands` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.TypeParameters`

- **Source:** `packages/effect/src/Schema.ts:16207`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helpers for projecting declaration type-parameter schemas into decoded or encoded codec arrays used by annotation hooks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.TypeParameters`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.TypeParameters.Type`

- **Source:** `packages/effect/src/Schema.ts:16215`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Maps declaration type-parameter schemas to codecs for their decoded `Type` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.TypeParameters.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.TypeParameters.Encoded`

- **Source:** `packages/effect/src/Schema.ts:16224`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Maps declaration type-parameter schemas to codecs for their `Encoded` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.TypeParameters.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Declaration`

- **Source:** `packages/effect/src/Schema.ts:16239`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Full annotation set for `Declaration` schema nodes — used when defining custom, opaque schema types via `Schema.declare`. Extends `Bottom` with optional codec, arbitrary, equivalence, and formatter hooks so that derived capabilities (JSON encoding, property testing, etc.) can be provided for the custom type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.Declaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Declaration."~sentinels"`

- **Source:** `packages/effect/src/Schema.ts:16268`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Used to collect sentinels from a Declaration SchemaAST.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Declaration."~sentinels"` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Filter`

- **Source:** `packages/effect/src/Schema.ts:16279`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Annotations for filter schema nodes (created via `Schema.filter`). Extends `Augment` with an optional error message, identifier, and metadata. Filters are intentionally non-parametric to keep them covariant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.Filter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Filter.message`

- **Source:** `packages/effect/src/Schema.ts:16293`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Complete message to use when this filter or refinement fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Filter.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Filter.identifier`

- **Source:** `packages/effect/src/Schema.ts:16304`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Stable identifier for the schema after this filter is attached.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Filter.identifier` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Filter.arbitrary`

- **Source:** `packages/effect/src/Schema.ts:16314`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional hints used by arbitrary derivation for this filter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Filter.arbitrary` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Filter."~structural"`

- **Source:** `packages/effect/src/Schema.ts:16328`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Marks the filter as _structural_, meaning it applies to the shape or structure of the container (e.g., array length, object keys) rather than the contents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Schema.Annotations.Filter."~structural"` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary`

- **Source:** `packages/effect/src/Schema.ts:16338`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Types used by arbitrary-derivation annotations to configure `toArbitrary` hooks, filter hints, candidate sources, diagnostics, and merged generation constraints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Filter`

- **Source:** `packages/effect/src/Schema.ts:16353`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Arbitrary-generation hints attached to a filter or filter group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Filter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Candidate`

- **Source:** `packages/effect/src/Schema.ts:16373`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Additional arbitrary source used before final filter checks run.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Candidate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.OrderedConstraint`

- **Source:** `packages/effect/src/Schema.ts:16393`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Ordered constraint accumulated from range checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.OrderedConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.GenerationConstraint`

- **Source:** `packages/effect/src/Schema.ts:16422`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Node-local arbitrary-generation constraint accumulated from schema checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.GenerationConstraint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Recursion`

- **Source:** `packages/effect/src/Schema.ts:16445`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Recursion budget passed to arbitrary-derivation hooks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Recursion`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Context`

- **Source:** `packages/effect/src/Schema.ts:16463`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context passed to arbitrary-derivation hooks and candidate factories.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Context`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.TypeParameter`

- **Source:** `packages/effect/src/Schema.ts:16481`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Arbitrary generators derived for a declaration type parameter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.TypeParameter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Derivation`

- **Source:** `packages/effect/src/Schema.ts:16498`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Arbitrary derivation returned by declaration hooks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Derivation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Output`

- **Source:** `packages/effect/src/Schema.ts:16515`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Output accepted from declaration arbitrary hooks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Output`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Declaration`

- **Source:** `packages/effect/src/Schema.ts:16530`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Hook signature for declaration schema arbitrary annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Declaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.WithReport`

- **Source:** `packages/effect/src/Schema.ts:16543`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Wraps a derived value together with arbitrary-derivation diagnostics.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.WithReport`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Report`

- **Source:** `packages/effect/src/Schema.ts:16560`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Diagnostics collected while deriving an arbitrary.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Report`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.Warning`

- **Source:** `packages/effect/src/Schema.ts:16570`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Non-fatal arbitrary-derivation warning.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.Warning`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToArbitrary.OpaqueFilterWarning`

- **Source:** `packages/effect/src/Schema.ts:16583`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Warning emitted when a filter is handled only by the final `.filter`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToArbitrary.OpaqueFilterWarning`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToFormatter`

- **Source:** `packages/effect/src/Schema.ts:16596`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Types used by formatter annotations to customize formatter derivation for declaration schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToFormatter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToFormatter.Declaration`

- **Source:** `packages/effect/src/Schema.ts:16607`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Hook signature for declaration schema formatter annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToFormatter.Declaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToEquivalence`

- **Source:** `packages/effect/src/Schema.ts:16621`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Types used by equivalence annotations to customize equivalence derivation for declaration schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToEquivalence`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.ToEquivalence.Declaration`

- **Source:** `packages/effect/src/Schema.ts:16632`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Hook signature for declaration schema equivalence annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.ToEquivalence.Declaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Annotations.Issue`

- **Source:** `packages/effect/src/Schema.ts:16650`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Annotations that can be attached to schema issues.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Annotations.Issue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Symbol (type)`

- **Source:** `packages/effect/src/Schema.ts:3150`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level representation of `Symbol`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Schema.Symbol`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Schema.Symbol (value)`

- **Source:** `packages/effect/src/Schema.ts:3159`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for `symbol` values. Validates that the input is `typeof` `"symbol"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Schema } from "effect"` and use `Schema.Symbol`.
- **Suggested snippet:** Define the smallest domain Schema involving `Schema.Symbol`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
