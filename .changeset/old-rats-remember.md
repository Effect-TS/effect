---
"@effect/schema": minor
---

## `AST` module

- rename `isTransform` to `isTransformation`

## `ParseResult` module

- rename `Tuple` to `TupleType`

## `TreeFormatter` module

- rename `formatIssue` to `formatIssueSync` (This change was made to maintain consistency in API naming across all decoding and encoding APIs.)
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

## `ArrayFormatter` module

- rename `formatIssue` to `formatIssueSync`
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

## `Schema` module

- consolidate `transform` and `transformOrFail` parameters into an `options` object, #2434
- consolidate `Class.transformOrFail` and `Class.transformOrFailFrom` parameters into an `options` object
- consolidate `declare` parameters into an `options` object
- consolidate `optionalToRequired` parameters into an `options` object
- consolidate `optionalToOptional` parameters into an `options` object
- Removed `negateBigDecimal` function (This cleanup was prompted by the realization that numerous functions can be derived from transformations such as negation, Math.abs, increment, etc. However, including all of them in the library is not feasible. Therefore, `negateBigDecimal` was removed)

### Renaming

- rename `uniqueSymbolFromSelf` to `UniqueSymbolFromSelf`
- rename `undefined` to `Undefined`
- rename `void` to `Void`
- rename `null` to `Null`
- rename `never` to `Never`
- rename `unknown` to `Unknown`
- rename `any` to `Any`
- rename `string` to `String`
- rename `number` to `Number`
- rename `boolean` to `Boolean`
- rename `/bigint/ig` to `BigInt`
- rename `symbolFromSelf` to `SymbolFromSelf`
- rename `object` to `Object`
- rename `union` to `Union`
- rename `nullable` to `NullOr`
- rename `orUndefined` to `UndefinedOr`
- rename `nullish` to `NullishOr`
- rename `tuple` to `Tuple`
- rename `array` to `Array`
- rename `nonEmptyArray` to `NonEmptyArray`
- rename `struct` to `Struct`
- rename `record` to `Record`
- rename `symbol` to `Symbol`
- rename `optionFromSelf` to `OptionFromSelf`
- rename `option` to `Option`
- rename `optionFromNullable` to `OptionFromNullOr`
- rename `optionFromNullish` to `OptionFromNullishOr`
- rename `optionFromOrUndefined` to `OptionFromUndefinedOr`
- rename `eitherFromSelf` to `EitherFromSelf`
  - rename `right`, `left` arguments to `Right`, `Left`
- rename `either` to `Either`
  - rename `right`, `left` arguments to `Right`, `Left`
- rename `eitherFromUnion` to `EitherFromUnion`
  - rename `right`, `left` arguments to `Right`, `Left`
- rename `readonlyMapFromSelf` to `ReadonlyMapFromSelf`
  - rename `key`, `value` arguments to `Key`, `Value`
- rename `mapFromSelf` to `MapFromSelf`
  - rename `key`, `value` arguments to `Key`, `Value`
- rename `readonlyMap` to `ReadonlyMap`
  - rename `key`, `value` arguments to `Key`, `Value`
- rename `map` to `Map`
  - rename `key`, `value` arguments to `Key`, `Value`
- rename `readonlySetFromSelf` to `ReadonlySetFromSelf`
- rename `setFromSelf` to `SetFromSelf`
- rename `readonlySet` to `ReadonlySet`
- rename `set` to `Set`
- rename `chunkFromSelf` to `ChunkFromSelf`
- rename `chunk` to `Chunk`
- rename `dataFromSelf` to `DataFromSelf`
- rename `data` to `Data`
- rename `causeFromSelf` to `CauseFromSelf`
  - rename `error`, `defect` arguments to `Error`, `Defect`
- rename `causeDefectUnknown` to `CauseDefectUnknown`
- rename `cause` to `Cause`
  - rename `error`, `defect` arguments to `Error`, `Defect`
- rename `exitFromSelf` to `ExitFromSelf`
  - rename `failure`, `success`, `defect` arguments to `Failure`, `Success`, `Defect`
- rename `exit` to `Exit`
  - rename `failure`, `success`, `defect` arguments to `Failure`, `Success`, `Defect`
- rename `hashSetFromSelf` to `HashSetFromSelf`
- rename `hashSet` to `HashSet`
- rename `hashMapFromSelf` to `HashMapFromSelf`
  - rename `key`, `value` arguments to `Key`, `Value`
- rename `hashMap` to `HashMap`
  - rename `key`, `value` arguments to `Key`, `Value`
- rename `listFromSelf` to `ListFromSelf`
- rename `list` to `List`
- rename `sortedSetFromSelf` to `SortedSetFromSelf`
- rename `sortedSet` to `SortedSet`
