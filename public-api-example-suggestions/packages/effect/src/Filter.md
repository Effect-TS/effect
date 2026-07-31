# Example Suggestions: `effect/Filter`

- **Package:** `effect`
- **Source:** `packages/effect/src/Filter.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 15 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                 | Line | Kind               | Priority        |
| ----------------------------------- | ---: | ------------------ | --------------- |
| `effect/Filter.mapFail`             |  169 | `root-declaration` | **recommended** |
| `effect/Filter.try`                 |  197 | `root-declaration` | **recommended** |
| `effect/Filter.fromPredicateOption` |  243 | `root-declaration` | **recommended** |
| `effect/Filter.has`                 |  326 | `root-declaration` | **recommended** |
| `effect/Filter.instanceOf`          |  353 | `root-declaration` | **recommended** |
| `effect/Filter.boolean`             |  394 | `root-declaration` | **recommended** |
| `effect/Filter.bigint`              |  420 | `root-declaration` | **recommended** |
| `effect/Filter.date`                |  455 | `root-declaration` | **recommended** |
| `effect/Filter.reason`              |  504 | `root-declaration` | **recommended** |
| `effect/Filter.or`                  |  563 | `root-declaration` | **recommended** |
| `effect/Filter.zipWith`             |  597 | `root-declaration` | **recommended** |
| `effect/Filter.composePassthrough`  |  777 | `root-declaration` | **recommended** |
| `effect/Filter.toOption`            |  812 | `root-declaration` | **recommended** |
| `effect/Filter.toResult`            |  835 | `root-declaration` | **recommended** |
| `effect/Filter.symbol`              |  428 | `root-declaration` | **recommended** |
| `effect/Filter.toPredicate`         |  262 | `root-declaration` | **optional**    |
| `effect/Filter.equalsStrict`        |  305 | `root-declaration` | **optional**    |
| `effect/Filter.tagged`              |  481 | `root-declaration` | **optional**    |
| `effect/Filter.equals`              |  553 | `root-declaration` | **optional**    |

## Recommended

### `effect/Filter.mapFail`

- **Source:** `packages/effect/src/Filter.ts:169`
- **Kind / category:** `root-declaration` / `mapping`
- **Priority:** **recommended**
- **Current description:** Transforms the failure value produced by a `Filter`, leaving successful results unchanged.
- **Signature hint:** `declare function mapFail<Fail, Fail2>(f: (fail: Fail) => Fail2): <Input, Pass>(self: Filter<Input, Pass, Fail>) => Filter<Input, Pass, Fail2> declare function mapFail<Input, Pass, Fail, Fail2>(self: Filter<Input, Pass, Fail>, f: (fail: Fail) => Fail2): Filter<Input, Pass, Fail2>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.mapFail`.
- **Suggested snippet:** Create or obtain the filter with `Filter.mapFail`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.try`

- **Source:** `packages/effect/src/Filter.ts:197`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a Filter that tries to apply a function and returns `fail` on error.
- **Signature hint:** `declare const _try: { <Input, Output>(f: (input: Input) => Output): Filter<Input, Output>; } export { _try as try }`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.try`.
- **Suggested snippet:** Create or obtain the filter with `Filter.try`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.fromPredicateOption`

- **Source:** `packages/effect/src/Filter.ts:243`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Filter` from a function that returns an `Option`; `Some(value)` passes with `value`, and `None` fails with the original input.
- **Signature hint:** `declare function fromPredicateOption<A, B>(predicate: (a: A) => Option.Option<B>): Filter<A, B>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.fromPredicateOption`.
- **Suggested snippet:** Create or obtain the filter with `Filter.fromPredicateOption`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.has`

- **Source:** `packages/effect/src/Filter.ts:326`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Filter` that passes inputs whose `has(key)` method returns `true` for the specified key.
- **Signature hint:** `declare function has<K>(key: K): <Input extends { readonly has: (key: K) => boolean; }>(input: Input) => Result.Result<Input, Input>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.has`.
- **Suggested snippet:** Create or obtain the filter with `Filter.has`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.instanceOf`

- **Source:** `packages/effect/src/Filter.ts:353`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a filter that only passes instances of the given constructor.
- **Signature hint:** `declare function instanceOf<K extends new (...args: any) => any>(constructor: K): <Input>(u: Input) => Result.Result<InstanceType<K>, Exclude<Input, InstanceType<K>>>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.instanceOf`.
- **Suggested snippet:** Create or obtain the filter with `Filter.instanceOf`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.boolean`

- **Source:** `packages/effect/src/Filter.ts:394`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** A predefined filter that only passes through boolean values.
- **Signature hint:** `declare function boolean(input: unknown): Result.Result<boolean, unknown>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.boolean`.
- **Suggested snippet:** Create or obtain the filter with `Filter.boolean`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.bigint`

- **Source:** `packages/effect/src/Filter.ts:420`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** A predefined filter that only passes through `bigint` primitive values.
- **Signature hint:** `declare function bigint(input: unknown): Result.Result<bigint, unknown>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.bigint`.
- **Suggested snippet:** Create or obtain the filter with `Filter.bigint`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.date`

- **Source:** `packages/effect/src/Filter.ts:455`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** A predefined filter that only passes through Date objects.
- **Signature hint:** `declare function date(input: unknown): Result.Result<Date, unknown>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.date`.
- **Suggested snippet:** Create or obtain the filter with `Filter.date`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.reason`

- **Source:** `packages/effect/src/Filter.ts:504`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a filter that extracts a reason from a tagged error.
- **Signature hint:** `declare function reason<Input>(): <const Tag extends Tags<Input>, const ReasonTag extends ReasonTags<ExtractTag<Input, Tag>>>(tag: Tag, reasonTag: ReasonTag) => Filter<Input, ExtractReason<ExtractTag<Input, Tag>, ReasonTag>, Input> declare function reason<Input, const Tag extends Tags<Input>, const ReasonTag extends ReasonTags<ExtractTag<Input, Tag>>>(tag: Tag, reasonTag: ReasonTag): Filter<Input, ExtractReason<ExtractTag<Input, Tag>, ReasonTag>, Input>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.reason`.
- **Suggested snippet:** Create or obtain the filter with `Filter.reason`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.or`

- **Source:** `packages/effect/src/Filter.ts:563`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Combines two filters with logical OR semantics.
- **Signature hint:** `declare function or<Input2, Pass2, Fail2>(that: Filter<Input2, Pass2, Fail2>): <Input1, Pass2, Fail2>(self: Filter<Input1, Pass2>) => Filter<Input1 & Input2, Pass2 | Pass2, Fail2> declare function or<Input1, Pass1, Fail1, Input2, Pass2, Fail2>(self: Filter<Input1, Pass1, Fail1>, that: Filter<Input2, Pass2, Fail2>): Filter<Input1 & Input2, Pass1 | Pass2, Fail2>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.or`.
- **Suggested snippet:** Create or obtain the filter with `Filter.or`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.zipWith`

- **Source:** `packages/effect/src/Filter.ts:597`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Combines two filters and applies a function to their results.
- **Signature hint:** `declare function zipWith<PassL, InputR, PassR, FailR, A>(right: Filter<InputR, PassR, FailR>, f: (left: PassL, right: PassR) => A): <InputL, FailL>(left: Filter<InputL, PassL, FailL>) => Filter<InputL & InputR, A, FailL | FailR> declare function zipWith<InputL, PassL, FailL, InputR, PassR, FailR, A>(left: Filter<InputL, PassL, FailL>, right: Filter<InputR, PassR, FailR>, f: (left: PassL, right: PassR) => A): Filter<InputL & InputR, A, FailL | FailR>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.zipWith`.
- **Suggested snippet:** Create or obtain the filter with `Filter.zipWith`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.composePassthrough`

- **Source:** `packages/effect/src/Filter.ts:777`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Composes two filters sequentially, passing the successful output of the first filter to the second.
- **Signature hint:** `declare function composePassthrough<InputL, PassL, PassR, FailR>(right: Filter<PassL, PassR, FailR>): <FailL>(left: Filter<InputL, PassL, FailL>) => Filter<InputL, PassR, InputL> declare function composePassthrough<InputL, PassL, FailL, PassR, FailR>(left: Filter<InputL, PassL, FailL>, right: Filter<PassL, PassR, FailR>): Filter<InputL, PassR, InputL>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.composePassthrough`.
- **Suggested snippet:** Create or obtain the filter with `Filter.composePassthrough`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.toOption`

- **Source:** `packages/effect/src/Filter.ts:812`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts a `Filter` into a function that returns `Some` for passed values and `None` for filtered-out values.
- **Signature hint:** `declare function toOption<A, Pass, Fail>(self: Filter<A, Pass, Fail>): (input: A) => Option.Option<Pass>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.toOption`.
- **Suggested snippet:** Call `Filter.toOption` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.toResult`

- **Source:** `packages/effect/src/Filter.ts:835`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts a `Filter` into a function that returns the underlying `Result.Result` for each input.
- **Signature hint:** `declare function toResult<A, Pass, Fail>(self: Filter<A, Pass, Fail>): (input: A) => Result.Result<Pass, Fail>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.toResult`.
- **Suggested snippet:** Call `Filter.toResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Filter.symbol`

- **Source:** `packages/effect/src/Filter.ts:428`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** A predefined filter that only passes through Symbol values.
- **Signature hint:** `declare function symbol(input: unknown): Result.Result<symbol, unknown>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.symbol`.
- **Suggested snippet:** Create or obtain the filter with `Filter.symbol`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Filter.toPredicate`

- **Source:** `packages/effect/src/Filter.ts:262`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts a Filter into a predicate function.
- **Signature hint:** `declare function toPredicate<A, Pass, Fail>(self: Filter<A, Pass, Fail>): Predicate.Predicate<A>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.toPredicate`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Filter.toPredicate`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Filter.equalsStrict`

- **Source:** `packages/effect/src/Filter.ts:305`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Filter` that passes only values strictly equal to the specified value using JavaScript `===` comparison.
- **Signature hint:** `declare function equalsStrict<const A, Input = unknown>(value: A): Filter<Input, A, EqualsWith<Input, A, A, Exclude<Input, A>>>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.equalsStrict`.
- **Suggested snippet:** Create or obtain the filter with `Filter.equalsStrict`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Filter.tagged`

- **Source:** `packages/effect/src/Filter.ts:481`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a filter that checks if an input is tagged with a specific tag.
- **Signature hint:** `declare function tagged<Input>(): <const Tag extends Tags<Input>>(tag: Tag) => Filter<Input, ExtractTag<Input, Tag>, ExcludeTag<Input, Tag>> declare function tagged<Input, const Tag extends Tags<Input>>(tag: Tag): Filter<Input, ExtractTag<Input, Tag>, ExcludeTag<Input, Tag>>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.tagged`.
- **Suggested snippet:** Create or obtain the filter with `Filter.tagged`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Filter.equals`

- **Source:** `packages/effect/src/Filter.ts:553`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a filter that only passes values equal to the specified value using structural equality.
- **Signature hint:** `declare function equals<const A, Input = unknown>(value: A): Filter<Input, A, EqualsWith<Input, A, A, Exclude<Input, A>>>`
- **Import guidance:** Start from `import { Filter } from "effect"` and use `Filter.equals`.
- **Suggested snippet:** Create or obtain the filter with `Filter.equals`, run it on one passing and one failing input, and assert the resulting `Result.succeed` and `Result.fail` values. Treat any `Option` or `Result` accepted by a callback as filter control flow, not as the constructor's output.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
