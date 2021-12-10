# Collections methods

## Standard methods and constants
| Method name          | Chunk | Array | NonEmptyArray |
| -------------------- | ----- | ----- | ------------- |
| append               | ✅    | ✅    | ✅            |
| buckets              | ✅    | N/A   | N/A           |
| chain                | ✅    | ✅    |               |
| collectX             | ✅    | ✅    |               |
| collectXWithIndex    |       | ✅    |               |
| collectWhile         | ✅    | ✅    |               |
| concat               | ✅    | ✅    |               |
| corresponds          | ✅    |       |               |
| compact              | ✅    |       |               |
| dedupe               | ✅    |       |               |
| drop                 | ✅    | ✅    |               |
| dropRight            |       | ✅    |               |
| dropWhile            | ✅    | ✅    |               |
| empty                | ✅    | ✅    |               |
| equals               | ✅    |       |               |
| exists               | ✅    |       |               |
| fill                 | ✅    |       |               |
| filter               | ✅    | ✅    |               |
| filterWithIndex      |       | ✅    |               |
| find                 | ✅    | ✅    |               |
| findIndex            |       | ✅    |               |
| findLast             |       | ✅    |               |
| findLastIndex        |       | ✅    |               |
| flatten              | ✅    | ✅    |               |
| forAll               | ✅    |       |               |
| forAny               | ✅    |       |               |
| forEach              | ✅    |       |               |
| from                 | ✅    | ✅    |               |
| get                  | ✅    | ✅    |               |
| grouped              | ✅    |       |               |
| head                 | ✅    | ✅    | ✅            |
| indexWhere           | ✅    |       |               |
| indexWhereFrom       | ✅    |       |               |
| isEmpty              | ✅    | ✅    |               |
| isNonEmpty           |       | ✅    |               |
| join                 | ✅    |       |               |
| last                 | ✅    | ✅    | ✅            |
| make                 | ✅    |       |               |
| makeBy               |       | ✅    |               |
| map                  | ✅    | ✅    |               |
| mapWithIndex         |       | ✅    |               |
| mapAccum             | ✅    |       |               |
| materialize          | ✅    |       |               |
| partitionMap         | ✅    |       |               |
| prepend              | ✅    | ✅    | ✅            |
| range                | ✅    | ✅    |               |
| reduce               | ✅    | ✅    |               |
| reduceIndex          |       | ✅    |               |
| reduceRight          | ✅    | ✅    |               |
| reduceRightWithIndex |       | ✅    |               |
| reduceWhile          | ✅    |       |               |
| reverse              | ✅    | ✅    | ✅            |
| reverseBuckets       | ✅    | N/A   |               |
| separate             | ✅    |       |               |
| single               | ✅    | ✅    |               |
| size                 | ✅    |       |               |
| split                | ✅    | ✅    |               |
| splitAt              | ✅    | ✅    |               |
| splitWhere           | ✅    |       |               |
| tail                 | ✅    | ✅    | ✅            |
| tap                  |       | ✅    |               |
| take                 | ✅    | ✅    |               |
| takeWhile            | ✅    | ✅    |               |
| toArrayLike          | ✅    |       |               |
| toArray              | ✅    |       |               |
| unfold               | ✅    | ✅    |               |
| unit                 | ✅    |       |               |
| unsafeGet            | ✅    |       |               |
| unsafeHead           | ✅    |       |               |
| unsafeLast           | ✅    |       |               |
| unsafeTail           | ✅    |       |               |
| unzip                | ✅    | ✅    |               |
| zip                  | ✅    | ✅    |               |
| zipAll               | ✅    |       |               |
| zipAllWith           | ✅    |       |               |
| zipWith              | ✅    | ✅    |               |
| zipWithIndex         | ✅    |       |               |
| zipWithIndexOffset   | ✅    |       |               |

## Effect-specific methods and constants
| Method name        | Chunk | Array | NonEmptyArray |
| ------------------ | ----- | ----- | ------------- |
| collectEffect      | ✅    |       |               |
| collectWhileEffect | ✅    |       |               |
| dropWhileEffect    | ✅    |       |               |
| filterEffect       | ✅    |       |               |
| findEffect         | ✅    |       |               |
| mapAccumEffect     | ✅    |       |               |
| mapEffect          | ✅    | ✅    |               |
| mapEffectPar       | ✅    | ✅    |               |
| mapEffectParN      | ✅    | ✅    |               |
| mapEffectUnit      | ✅    |       |               |
| mapEffectUnitPar   | ✅    |       |               |
| mapEffectUnitParN  | ✅    |       |               |
| mapSync            |       | ✅    |               |
| reduceEffect       | ✅    |       |               |
| reduceRightEffect  | ✅    |       |               |
| reduceWhileEffect  | ✅    |       |               |
| takeWhileEffect    | ✅    |       |               |
| unfoldEffect       | ✅    |       |               |

## Classic and other combinators
| Method name        | Chunk | Array | NonEmptyArray |
| ------------------ | ----- | ----- | ------------- |
| ap                 |       | ✅    |               |
| chop               |       | ✅    |               |
| compact            |       | ✅    |               |
| comprehension      |       | ✅    |               |
| deleteAt           |       | ✅    |               |
| duplicate          |       | ✅    |               |
| elem               | ✅    | ✅    | ✅            |
| difference         | ✅    | ✅    | ✅            |
| extend             |       | ✅    |               |
| findFirstMap       |       | ✅    |               |
| findLastMap        |       | ✅    |               |
| foldLeft           |       | ✅    |               |
| foldMap            | ✅    | ✅    | ✅            |
| foldMapWithIndex   | ✅    | ✅    | ✅            |
| foldRight          |       | ✅    |               |
| groupBy            |       | ✅    | ✅            |
| init               |       | ✅    | ✅            |
| insertAt           |       | ✅    | ✅            |
| intersection       | ✅    | ✅    | ✅            |
| isOutOfBound       |       | ✅    |               |
| join               |       | ✅    |               |
| lefts              |       | ✅    |               |
| modifyAt           |       | ✅    | ✅            |
| partition          | ✅    | ✅    |               | Use Separated or Tuple?
| partitionWithIndex | ✅    | ✅    |               | Use Separated or Tuple?
| replicate          |       | ✅    |               |
| rights             |       | ✅    | ✅            |
| rotate             |       | ✅    | ✅            |
| scanLeft           |       | ✅    | ✅            |
| scanRight          |       | ✅    | ✅            |
| spanIndex          |       | ✅    |               |
| spanLeft           |       | ✅    |               |
| separate           |       | ✅    | ✅            |
| sort               | ✅    | ✅    | ✅            |
| sortBy             | ✅    | ✅    | ✅            |
| spanRight          |       | ✅    |               |
| takeUntil          |       | ✅    | ✅            |
| toMutable          |       | ✅    |               |
| union              | ✅    | ✅    | ✅            |
| uniq               | ✅    | ✅    | ✅            |
| unsafeDeleteAt     |       | ✅    | ✅            |
| updateAt           |       | ✅    | ✅            |
| unsafeInsertAt     |       | ✅    |               |
| unsafeUpdate       |       | ✅    |               |
| unsafeUpdateAt     |       | ✅    |               |
