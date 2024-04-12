---
"@effect/schema": minor
---

AST

- rename `isTransform` to `isTransformation`

Schema

- consolidate `transform` and `transformOrFail` parameters into an `options` object, #2434
- consolidate `Class.transformOrFail` and `Class.transformOrFailFrom` parameters into an `options` object
- consolidate `declare` parameters into an `options` object
- consolidate `optionalToRequired` parameters into an `options` object
- consolidate `optionalToOptional` parameters into an `options` object
- Removed `negateBigDecimal` function (This cleanup was prompted by the realization that numerous functions can be derived from transformations such as negation, Math.abs, increment, etc. However, including all of them in the library is not feasible. Therefore, `negateBigDecimal` was removed)

ParseResult

- rename `Tuple` to `TupleType`

TreeFormatter

- rename `formatIssue` to `formatIssueSync` (This change was made to maintain consistency in API naming across all decoding and encoding APIs.)
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

ArrayFormatter

- rename `formatIssue` to `formatIssueSync`
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

Renaming

- rename `literal` to `Literal`
- rename `uniqueSymbolFromSelf` to `UniqueSymbolFromSelf`
- rename `enums` to `Enums`
- rename `templateLiteral` to `TemplateLiteral`
- rename `declare` to `Declare`
- rename `instanceOf` to `InstanceOf`
- rename `undefined` to `Undefined`
- rename `void` to `Void`
- rename `null` to `Null`
- rename `never` to `Never`
- rename `unknown` to `Unknown`
- rename `any` to `Any`
- rename `string` to `String`
- rename `number` to `Number`
- rename `boolean` to `Boolean`
- rename `bigintFromSelf` to `BigIntFromSelf`
- rename `symbolFromSelf` to `SymbolFromSelf`
- rename `object` to `Object`
- rename `union` to `Union`
- rename `nullable` to `NullOr`
- rename `orUndefined` to `UndefinedOr`
- rename `nullish` to `NullishOr`
- rename `keyof` to `KeyOf`
- rename `tuple` to `Tuple`
- rename `array` to `Array`
- rename `nonEmptyArray` to `NonEmptyArray`
- rename `struct` to `Struct`
- rename `record` to `Record`
- rename `suspend` to `Suspend`
- rename `symbol` to `Symbol`
- rename `bigint` to `BigInt`
- rename `Bigint` to `BigInt`
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
- rename `getNumberIndexedAccess` to `NumberIndexedAccess`
- rename `head` to `Head`
- rename `headOrElse` to `HeadOrElse`
- rename `pluck` to `Pluck`
- rename `pick` to `Pick`
- rename `omit` to `Omit`
- rename `encodedSchema` to `EncodedSchema`
- rename `typeSchema` to `TypeSchema`
- rename `pickLiteral` to `PickLiteral`
- rename `fromBrand` to `FromBrand`
- rename `partial` to `Partial`
- rename `required` to `Required`
- rename `mutable` to `Mutable`
- rename `split` to `Split`
- rename `transformLiteral` to `TransformLiteral`
- rename `transformLiterals` to `TransformLiterals`
