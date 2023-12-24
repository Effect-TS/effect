# @effect/schema

## 0.56.1

### Patch Changes

- [#684](https://github.com/Effect-TS/schema/pull/684) [`6b9585b`](https://github.com/Effect-TS/schema/commit/6b9585b8aba659c5e86f2f8ebc01b1bf8d26143b) Thanks [@patroza](https://github.com/patroza)! - improve: Actually use Arbitrary interface in to/from/unsafe signature

- [#679](https://github.com/Effect-TS/schema/pull/679) [`0f8a8f1`](https://github.com/Effect-TS/schema/commit/0f8a8f14e21a72b503ee3304a30aa4b6c2d6e1ff) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add annotations argument to `attachPropertySignature`

## 0.56.0

### Minor Changes

- [#673](https://github.com/Effect-TS/schema/pull/673) [`0508ac5`](https://github.com/Effect-TS/schema/commit/0508ac5a3be5ca8927e088c80f93aa1122e62286) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.55.0

### Minor Changes

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: should throw on declarations without annotations

- [#669](https://github.com/Effect-TS/schema/pull/669) [`294dfad`](https://github.com/Effect-TS/schema/commit/294dfad1076f10da53096925e02821a69fbad60e) Thanks [@gcanti](https://github.com/gcanti)! - Schema: refactor `parseJson` to replace `ParseJson` and `fromJson`

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: refactor `S.optional` API.

  Upgrade Guide:

  - `S.optional(schema, { exact: true })` replaces the old `S.optional(schema)`
  - `S.optional(schema, { exact: true, default: () => A })` replaces the old `S.optional(schema).withDefault(() => A)`
  - `S.optional(schema, { exact: true, as: "Option" })` replaces the old `S.optional(schema).toOption()`

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: replace `propertySignature` constructor with `propertySignatureAnnotations` combinator

- [#669](https://github.com/Effect-TS/schema/pull/669) [`294dfad`](https://github.com/Effect-TS/schema/commit/294dfad1076f10da53096925e02821a69fbad60e) Thanks [@gcanti](https://github.com/gcanti)! - Schema: simplify `split` parameters to only accept `separator`

- [#669](https://github.com/Effect-TS/schema/pull/669) [`294dfad`](https://github.com/Effect-TS/schema/commit/294dfad1076f10da53096925e02821a69fbad60e) Thanks [@gcanti](https://github.com/gcanti)! - Schema: remove useless combinators

  - `lowercase`
  - `uppercase`
  - `trim`
  - `numberFromString`
  - `symbolFromString`
  - `bigintFromString`
  - `bigintFromNumber`
  - `secret`
  - `durationFromHrTime`
  - `durationFromMillis`
  - `durationFromNanos`
  - `uint8ArrayFromNumbers`
  - `base64`
  - `base64url`
  - `hex`
  - `dateFromString`
  - `bigDecimalFromNumber`
  - `bigDecimalFromString`
  - `not`

### Patch Changes

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: fix declarations (`type` field)

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add `nullish`

- [#649](https://github.com/Effect-TS/schema/pull/649) [`d80b933`](https://github.com/Effect-TS/schema/commit/d80b933d2e6b1e36f10f01323f2532826c8722c7) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add `orUndefined`

## 0.54.1

### Patch Changes

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - AST: make Annotations readonly

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - AST: make getAnnotation dual

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - Schema: remove Mutable helper in favour of Types.Mutable

- [#665](https://github.com/Effect-TS/schema/pull/665) [`a238f20`](https://github.com/Effect-TS/schema/commit/a238f207be74f481313f0cffdebc3a985da3b312) Thanks [@gcanti](https://github.com/gcanti)! - AST: preserve identifier annotations when calling `from`

## 0.54.0

### Minor Changes

- [#662](https://github.com/Effect-TS/schema/pull/662) [`7f448dd`](https://github.com/Effect-TS/schema/commit/7f448dd437d64452a2818fdfae610a69f8ce2099) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.53.3

### Patch Changes

- [#654](https://github.com/Effect-TS/schema/pull/654) [`a5950d1`](https://github.com/Effect-TS/schema/commit/a5950d14e5868aa88e1c263d14e305185debbc30) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added S.Secret

## 0.53.2

### Patch Changes

- [#656](https://github.com/Effect-TS/schema/pull/656) [`5da1d36`](https://github.com/Effect-TS/schema/commit/5da1d36241889bdb333c001aaa512573541328be) Thanks [@gcanti](https://github.com/gcanti)! - Schema: fix `DocAnnotations` definition

## 0.53.1

### Patch Changes

- [#655](https://github.com/Effect-TS/schema/pull/655) [`54f61d6`](https://github.com/Effect-TS/schema/commit/54f61d60cf495d486d30f9f04f518b49d89d89df) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for never error types in TaggedRequest.Any

- [#604](https://github.com/Effect-TS/schema/pull/604) [`88f61cc`](https://github.com/Effect-TS/schema/commit/88f61ccfaa615a189bf8851c1bddd3b779b20883) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added filters for Duration

- [#605](https://github.com/Effect-TS/schema/pull/605) [`c728880`](https://github.com/Effect-TS/schema/commit/c728880a9d8a996bc5ea5624a7241f7f3f3b90dc) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added toString for schema classes

## 0.53.0

### Minor Changes

- [#635](https://github.com/Effect-TS/schema/pull/635) [`30802d5`](https://github.com/Effect-TS/schema/commit/30802d5280ad6cab154c98c00076d37451b1fbdd) Thanks [@gcanti](https://github.com/gcanti)! - JSONSchema: rename `JsonSchema7Top` to `JsonSchema7Root`

- [#650](https://github.com/Effect-TS/schema/pull/650) [`05c2275`](https://github.com/Effect-TS/schema/commit/05c22753171e67e42956b8f63b744ef855afde40) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#640](https://github.com/Effect-TS/schema/pull/640) [`8dcf12c`](https://github.com/Effect-TS/schema/commit/8dcf12cec004fb04495a6726474d10ecd065a2e0) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: rename `ParseErrors` to `ParseIssue`

- [#636](https://github.com/Effect-TS/schema/pull/636) [`deddf6e`](https://github.com/Effect-TS/schema/commit/deddf6e2a88acea89e7eb96b8ff0720ed2bc7077) Thanks [@gcanti](https://github.com/gcanti)! - Schema: rename lazy to suspend (to align with Effect.suspend)

### Patch Changes

- [#645](https://github.com/Effect-TS/schema/pull/645) [`ece6128`](https://github.com/Effect-TS/schema/commit/ece6128e79d23311491a1eb4e6cf18523e8f7c09) Thanks [@gcanti](https://github.com/gcanti)! - ensure that JSON Schema annotations can be exclusively applied to refinements

## 0.52.0

### Minor Changes

- [#632](https://github.com/Effect-TS/schema/pull/632) [`ad220dd`](https://github.com/Effect-TS/schema/commit/ad220dd29e94e1a3ae047680a5de87fb77966ec4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add Serializable module

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberId schema

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add Exit schema

- [#609](https://github.com/Effect-TS/schema/pull/609) [`8ca0220`](https://github.com/Effect-TS/schema/commit/8ca0220568b9d86dabebbb4f7df352aedea704ee) Thanks [@tim-smart](https://github.com/tim-smart)! - add Cause schema

## 0.51.5

### Patch Changes

- [#629](https://github.com/Effect-TS/schema/pull/629) [`f690ebe`](https://github.com/Effect-TS/schema/commit/f690ebe28549181d80c985048784f9190e17bdaf) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add filter overloading returning Option<ParseError>

  For more complex scenarios, you can return an `Option<ParseError>` type instead of a boolean. In this context, `None` indicates success, and `Some(error)` rejects the input with a specific error

## 0.51.4

### Patch Changes

- [#623](https://github.com/Effect-TS/schema/pull/623) [`3a56b06`](https://github.com/Effect-TS/schema/commit/3a56b069eac9ecbbff3c0448590f7137afc11fbc) Thanks [@sukovanej](https://github.com/sukovanej)! - Export `JsonSchema7` types.

- [#626](https://github.com/Effect-TS/schema/pull/626) [`67c154e`](https://github.com/Effect-TS/schema/commit/67c154e92bd2a7a0d70faa14442fae6e6a7216ad) Thanks [@gcanti](https://github.com/gcanti)! - S.rename: handle field transformations, closes #625

## 0.51.3

### Patch Changes

- [#621](https://github.com/Effect-TS/schema/pull/621) [`c97aad8`](https://github.com/Effect-TS/schema/commit/c97aad8f83e434bcd7fd7b738a917f8a937772b0) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add `fromJson` combinator

## 0.51.2

### Patch Changes

- [#618](https://github.com/Effect-TS/schema/pull/618) [`95a0354`](https://github.com/Effect-TS/schema/commit/95a03549ead66f3fb0fea76e68445c14718ca3e7) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: remove runtime dependency from Schema module

- [#617](https://github.com/Effect-TS/schema/pull/617) [`0cd3262`](https://github.com/Effect-TS/schema/commit/0cd326237cff52e2b0973850b1e167b2782fefa2) Thanks [@matheuspuel](https://github.com/matheuspuel)! - add Schema.transformLiteral and Schema.transformLiterals

- [#618](https://github.com/Effect-TS/schema/pull/618) [`95a0354`](https://github.com/Effect-TS/schema/commit/95a03549ead66f3fb0fea76e68445c14718ca3e7) Thanks [@gcanti](https://github.com/gcanti)! - Pretty: remove runtime dependency from Schema module

## 0.51.1

### Patch Changes

- [#615](https://github.com/Effect-TS/schema/pull/615) [`f851621`](https://github.com/Effect-TS/schema/commit/f851621eb3c89e813aa0527832ec552b97defddf) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.51.0

### Minor Changes

- [#613](https://github.com/Effect-TS/schema/pull/613) [`2af3914`](https://github.com/Effect-TS/schema/commit/2af39143de6d4a1d83d092ef7311ecd2d3194d85) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#612](https://github.com/Effect-TS/schema/pull/612) [`7596197`](https://github.com/Effect-TS/schema/commit/7596197345c709f3fbab3e4e92b70747018b9c61) Thanks [@patroza](https://github.com/patroza)! - doc: fix S.split README sample

## 0.50.0

### Minor Changes

- [#593](https://github.com/Effect-TS/schema/pull/593) [`cbc2e3f`](https://github.com/Effect-TS/schema/commit/cbc2e3f8d3657d545fbe41d791049f5e6dfb57c6) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: merge failure APIs into `fail`

- [#607](https://github.com/Effect-TS/schema/pull/607) [`e85aefb`](https://github.com/Effect-TS/schema/commit/e85aefb7cb0f5ea7532fc2a0abb13595d3330140) Thanks [@gcanti](https://github.com/gcanti)! - Bug Fix: align index signature behaviour to TypeScript

- [#589](https://github.com/Effect-TS/schema/pull/589) [`3b99569`](https://github.com/Effect-TS/schema/commit/3b99569c8bd3f6fa748ae0d81f7992e8899f8ef6) Thanks [@gcanti](https://github.com/gcanti)! - - remove `ValidDate` (which is just an alias of `Date`)

  - add `DateFromString` (decodes from string, output: possibly invalid Date)

- [#593](https://github.com/Effect-TS/schema/pull/593) [`cbc2e3f`](https://github.com/Effect-TS/schema/commit/cbc2e3f8d3657d545fbe41d791049f5e6dfb57c6) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: rename `success` to `succeed` (standard naming)

### Patch Changes

- [#597](https://github.com/Effect-TS/schema/pull/597) [`caeed29`](https://github.com/Effect-TS/schema/commit/caeed29b9c3cef804009046347777d6041d5a47e) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added BigDecimal

- [#585](https://github.com/Effect-TS/schema/pull/585) [`5b27f03`](https://github.com/Effect-TS/schema/commit/5b27f03d490d6da2583562189e82d8ed70460a27) Thanks [@gcanti](https://github.com/gcanti)! - improve JSON Schema output:

  - rename `dependencies` to `$defs`
  - remove `"type"` from const schemas
  - use `"oneOf"` for enums and add `"title"`s
  - add support for `record(pattern, number)`
  - add `"$id"` and `"$comment"` properties
  - literals should be converted to `enum` instead of `anyOf`, closes #579

- [#603](https://github.com/Effect-TS/schema/pull/603) [`8e21d7e`](https://github.com/Effect-TS/schema/commit/8e21d7ec6acf7a16c17dd57e52c5720391c6a954) Thanks [@gcanti](https://github.com/gcanti)! - TreeFormatter: enhance `formatActual` for data types with a custom `toString` implementation, closes #600

## 0.49.4

### Patch Changes

- [#595](https://github.com/Effect-TS/schema/pull/595) [`931b557`](https://github.com/Effect-TS/schema/commit/931b5577e3ce4cd08f35f37b084c974e3b75d2c4) Thanks [@tim-smart](https://github.com/tim-smart)! - add \_tag to TaggedRequest.Base

## 0.49.3

### Patch Changes

- [#592](https://github.com/Effect-TS/schema/pull/592) [`c2b0e6b`](https://github.com/Effect-TS/schema/commit/c2b0e6b07898bf265bb1a38aa3ab359c576ede95) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added ParseResult.try

- [#582](https://github.com/Effect-TS/schema/pull/582) [`bc6595c`](https://github.com/Effect-TS/schema/commit/bc6595c1a271d9ff2e1bf3439d99565c97424e59) Thanks [@fubhy](https://github.com/fubhy)! - Added support for `Duration`

- [#590](https://github.com/Effect-TS/schema/pull/590) [`0d0f0be`](https://github.com/Effect-TS/schema/commit/0d0f0be5891b78b21542fe2ab18b11bbecdd5e0b) Thanks [@gcanti](https://github.com/gcanti)! - Parser: should use the original ast to generate a more informative error message when an incorrect data type is provided

## 0.49.2

### Patch Changes

- [#587](https://github.com/Effect-TS/schema/pull/587) [`64fe91f`](https://github.com/Effect-TS/schema/commit/64fe91f54050a4aadab26df7c5a875dd8de0588a) Thanks [@gcanti](https://github.com/gcanti)! - DateFromSelf: its arbitrary should also generate "Invalid Date"s

## 0.49.1

### Patch Changes

- [#580](https://github.com/Effect-TS/schema/pull/580) [`4491e75`](https://github.com/Effect-TS/schema/commit/4491e75e07db07944e8fda9fa08d3ef0ca1a56d1) Thanks [@tim-smart](https://github.com/tim-smart)! - fix missing class .struct schema

## 0.49.0

### Minor Changes

- [#577](https://github.com/Effect-TS/schema/pull/577) [`9653cf4`](https://github.com/Effect-TS/schema/commit/9653cf4bc5e25a3b98ddb52c15ca72811ed89156) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#574](https://github.com/Effect-TS/schema/pull/574) [`2ed5f8e`](https://github.com/Effect-TS/schema/commit/2ed5f8ef1584f23962de646a317e536309db744b) Thanks [@tim-smart](https://github.com/tim-smart)! - add TaggedRequest class

## 0.48.4

### Patch Changes

- [#572](https://github.com/Effect-TS/schema/pull/572) [`b135781`](https://github.com/Effect-TS/schema/commit/b135781bf0d1991048f01c92ef2cda60f3aefdf2) Thanks [@gcanti](https://github.com/gcanti)! - Effect.catchTag can be used to catch ParseError

## 0.48.3

### Patch Changes

- [#570](https://github.com/Effect-TS/schema/pull/570) [`20c1a67`](https://github.com/Effect-TS/schema/commit/20c1a679c840381ef86531f31f2b344fab4016e4) Thanks [@gcanti](https://github.com/gcanti)! - make ParseError Inspectable

## 0.48.2

### Patch Changes

- [#568](https://github.com/Effect-TS/schema/pull/568) [`573419e`](https://github.com/Effect-TS/schema/commit/573419e5b1bda634ee0c27ed785bbce4557e6094) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema.TaggedError

- [#568](https://github.com/Effect-TS/schema/pull/568) [`573419e`](https://github.com/Effect-TS/schema/commit/573419e5b1bda634ee0c27ed785bbce4557e6094) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema.TaggedClass

## 0.48.1

### Patch Changes

- [#566](https://github.com/Effect-TS/schema/pull/566) [`1c1d5a5`](https://github.com/Effect-TS/schema/commit/1c1d5a523b37118507fd234170aad693e3b416ce) Thanks [@matheuspuel](https://github.com/matheuspuel)! - add dual api to Schema.rename

- [#566](https://github.com/Effect-TS/schema/pull/566) [`1c1d5a5`](https://github.com/Effect-TS/schema/commit/1c1d5a523b37118507fd234170aad693e3b416ce) Thanks [@matheuspuel](https://github.com/matheuspuel)! - forbid excess properties on Schema.rename

- [#564](https://github.com/Effect-TS/schema/pull/564) [`8440e1e`](https://github.com/Effect-TS/schema/commit/8440e1eb9b973b2820be9e36a62ebcc85efe190e) Thanks [@fubhy](https://github.com/fubhy)! - Use `sideEffects: []` to circumvent bundler issues

## 0.48.0

### Minor Changes

- [#561](https://github.com/Effect-TS/schema/pull/561) [`ec63224`](https://github.com/Effect-TS/schema/commit/ec6322430fbbe51696bf764893074a8af29efbd9) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.47.7

### Patch Changes

- [#557](https://github.com/Effect-TS/schema/pull/557) [`e399df1`](https://github.com/Effect-TS/schema/commit/e399df1d7685bacd8061a2eeda5ff1cffb094ee4) Thanks [@gcanti](https://github.com/gcanti)! - Equivalence: ignore excess properties, closes #556

## 0.47.6

### Patch Changes

- [#552](https://github.com/Effect-TS/schema/pull/552) [`fc1638e`](https://github.com/Effect-TS/schema/commit/fc1638e68a23fe7865a4f63a79b0ff72093246e2) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add rename API

## 0.47.5

### Patch Changes

- [#553](https://github.com/Effect-TS/schema/pull/553) [`522161a`](https://github.com/Effect-TS/schema/commit/522161a8bf5368f7f3afc09a47bd2e0839aaf60d) Thanks [@gcanti](https://github.com/gcanti)! - Fix bug in property signature transformations when used for renaming (old key/value pair was not removed)

## 0.47.4

### Patch Changes

- [#550](https://github.com/Effect-TS/schema/pull/550) [`5167e2d`](https://github.com/Effect-TS/schema/commit/5167e2dbf99282097d93bb0e9be0d3fa9cdcd214) Thanks [@gcanti](https://github.com/gcanti)! - attachPropertySignature: add support for symbols as values

## 0.47.3

### Patch Changes

- [#546](https://github.com/Effect-TS/schema/pull/546) [`b6e8e12`](https://github.com/Effect-TS/schema/commit/b6e8e1232f90f8d01519eb90c43eaa5c6422503a) Thanks [@rjdellecese](https://github.com/rjdellecese)! - added S.uppercased, S.uppercase, and S.Uppercase

## 0.47.2

### Patch Changes

- [#542](https://github.com/Effect-TS/schema/pull/542) [`23c2ecc`](https://github.com/Effect-TS/schema/commit/23c2ecc8f585190aa0d5df0a7aef6a796d8fa634) Thanks [@gcanti](https://github.com/gcanti)! - Chore: use Chunk.getEquivalence

## 0.47.1

### Patch Changes

- [#540](https://github.com/Effect-TS/schema/pull/540) [`85526bf`](https://github.com/Effect-TS/schema/commit/85526bf6e6a1e833d4ae43716c6c27a7c38fb874) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.47.0

### Minor Changes

- [#538](https://github.com/Effect-TS/schema/pull/538) [`c8a8b79`](https://github.com/Effect-TS/schema/commit/c8a8b79d4866f5471ad4e549bbed8837fe369c11) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.46.4

### Patch Changes

- [#532](https://github.com/Effect-TS/schema/pull/532) [`1e115af`](https://github.com/Effect-TS/schema/commit/1e115afab16c79841f683f73b51357805d8bf39e) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: add BigIntConstraints support

- [#533](https://github.com/Effect-TS/schema/pull/533) [`6973032`](https://github.com/Effect-TS/schema/commit/697303291d6777d230c9105aa775f033534968b4) Thanks [@gcanti](https://github.com/gcanti)! - expose Equivalence compiler

- [#530](https://github.com/Effect-TS/schema/pull/530) [`23b1e1c`](https://github.com/Effect-TS/schema/commit/23b1e1cded1aa95224555fadcae8de9ab7bc1fdb) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: merge ArrayConstraints

## 0.46.3

### Patch Changes

- [#527](https://github.com/Effect-TS/schema/pull/527) [`02cb140`](https://github.com/Effect-TS/schema/commit/02cb1406d258b679a3e99cb9c977237431dbdf22) Thanks [@gcanti](https://github.com/gcanti)! - add default annotation

## 0.46.2

### Patch Changes

- [#523](https://github.com/Effect-TS/schema/pull/523) [`dca107a`](https://github.com/Effect-TS/schema/commit/dca107a48dae48824b4f3f2888d4beecc56127aa) Thanks [@jessekelly881](https://github.com/jessekelly881)! - Replaced TreeFormatter with ArrayFormatter for BrandErrors when using Schema.brand

## 0.46.1

### Patch Changes

- [#519](https://github.com/Effect-TS/schema/pull/519) [`9fe7693`](https://github.com/Effect-TS/schema/commit/9fe7693e253d8dac3ace625a5fa7aeb79cb578b4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.46.0

### Minor Changes

- [#515](https://github.com/Effect-TS/schema/pull/515) [`c9bf451`](https://github.com/Effect-TS/schema/commit/c9bf4513236f9ef3985d96219c0c3d2b9037d636) Thanks [@sukovanej](https://github.com/sukovanej)! - Update effect and fast-check.

## 0.45.8

### Patch Changes

- [#514](https://github.com/Effect-TS/schema/pull/514) [`3acbc38`](https://github.com/Effect-TS/schema/commit/3acbc381dbf9bc6636a611efed073ff79878427c) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: handle array constraints

- [#514](https://github.com/Effect-TS/schema/pull/514) [`3acbc38`](https://github.com/Effect-TS/schema/commit/3acbc381dbf9bc6636a611efed073ff79878427c) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: fix recursive generation (memory issues)

## 0.45.7

### Patch Changes

- [#512](https://github.com/Effect-TS/schema/pull/512) [`c1beed7`](https://github.com/Effect-TS/schema/commit/c1beed71328876f942665800888f98e738693380) Thanks [@gcanti](https://github.com/gcanti)! - Schema: `split` should support subtypes of `string`

## 0.45.6

### Patch Changes

- [#508](https://github.com/Effect-TS/schema/pull/508) [`618b1b5`](https://github.com/Effect-TS/schema/commit/618b1b5cb9f41cbe6410d5deaf266f6be4b2d552) Thanks [@matheuspuel](https://github.com/matheuspuel)! - fix encode discriminated union with transformation

## 0.45.5

### Patch Changes

- [#503](https://github.com/Effect-TS/schema/pull/503) [`b9a8748`](https://github.com/Effect-TS/schema/commit/b9a874834905938c07ff5ee4efc090733242f89a) Thanks [@gcanti](https://github.com/gcanti)! - expose JSON Schema compiler

## 0.45.4

### Patch Changes

- [#493](https://github.com/Effect-TS/schema/pull/493) [`b8410b7`](https://github.com/Effect-TS/schema/commit/b8410b7fefa0644e42554aa9f2144ac7718a95e4) Thanks [@gcanti](https://github.com/gcanti)! - expose JSON Schema compiler

## 0.45.3

### Patch Changes

- [#500](https://github.com/Effect-TS/schema/pull/500) [`e9ff876`](https://github.com/Effect-TS/schema/commit/e9ff876930e4daa1aebb58ab6aaef1a45feaedca) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: remove NaN while generating numeric template literals

## 0.45.2

### Patch Changes

- [#498](https://github.com/Effect-TS/schema/pull/498) [`4b522a3`](https://github.com/Effect-TS/schema/commit/4b522a3d6d724aa5dbb6e4d9166f249900dfe3fb) Thanks [@gcanti](https://github.com/gcanti)! - fix regexp for numeric template literals

## 0.45.1

### Patch Changes

- [#496](https://github.com/Effect-TS/schema/pull/496) [`ff360c6`](https://github.com/Effect-TS/schema/commit/ff360c6a5c68d4c9541f4d6678e24671245eaa87) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: fix issue with generating optional tuple elements

## 0.45.0

### Minor Changes

- [#491](https://github.com/Effect-TS/schema/pull/491) [`135072e`](https://github.com/Effect-TS/schema/commit/135072e16f64f4ac6752f5496a2c40468dcc7cdb) Thanks [@gcanti](https://github.com/gcanti)! - Make transformations strict by default (and allow relaxing constraints with `strict: false` option)

- [#495](https://github.com/Effect-TS/schema/pull/495) [`c02334c`](https://github.com/Effect-TS/schema/commit/c02334c9bf4d40a2fa594433a11fd730662fbb4d) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#475](https://github.com/Effect-TS/schema/pull/475) [`46dcfeb`](https://github.com/Effect-TS/schema/commit/46dcfeba229ccb7a17555691856d066b22ea1d8d) Thanks [@tim-smart](https://github.com/tim-smart)! - memoize the Parser per AST

## 0.44.0

### Minor Changes

- [#488](https://github.com/Effect-TS/schema/pull/488) [`e00491c`](https://github.com/Effect-TS/schema/commit/e00491cd0ddb32ed0be78341664cab7cd846570b) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.43.2

### Patch Changes

- [#485](https://github.com/Effect-TS/schema/pull/485) [`0a20788`](https://github.com/Effect-TS/schema/commit/0a2078800f05b335b30c88d9cf06d988c826bdef) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: use Math.fround when creating number constraints, closes #484

## 0.43.1

### Patch Changes

- [#483](https://github.com/Effect-TS/schema/pull/483) [`c80c94f`](https://github.com/Effect-TS/schema/commit/c80c94f397668d20fa52ad929a0f25394039213d) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add jsonSchema annotation helper

- [#481](https://github.com/Effect-TS/schema/pull/481) [`56f5ac0`](https://github.com/Effect-TS/schema/commit/56f5ac0653851ef667cd24d7eca5f7246eb56273) Thanks [@gcanti](https://github.com/gcanti)! - AST/Schema: add mutable combinator

## 0.43.0

### Minor Changes

- [#476](https://github.com/Effect-TS/schema/pull/476) [`1fb1002`](https://github.com/Effect-TS/schema/commit/1fb1002fe3c76865401183cb093654c7e72c0193) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.42.0

### Minor Changes

- [#472](https://github.com/Effect-TS/schema/pull/472) [`e3d79fe`](https://github.com/Effect-TS/schema/commit/e3d79fe2cd237e55bc89046be07794447655e4e8) Thanks [@gcanti](https://github.com/gcanti)! - update effect

## 0.41.1

### Patch Changes

- [#470](https://github.com/Effect-TS/schema/pull/470) [`a5bf46b`](https://github.com/Effect-TS/schema/commit/a5bf46b85255f01b33e9320e7e0db53b478f38ac) Thanks [@gcanti](https://github.com/gcanti)! - ParseResult: add orElse

## 0.41.0

### Minor Changes

- [#468](https://github.com/Effect-TS/schema/pull/468) [`da7a851`](https://github.com/Effect-TS/schema/commit/da7a85122032ff58024b8f2f0738756a255bdcfa) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.40.2

### Patch Changes

- [#465](https://github.com/Effect-TS/schema/pull/465) [`8452aef`](https://github.com/Effect-TS/schema/commit/8452aef39a20fa8f6a984606e0b65351e07a2d69) Thanks [@gcanti](https://github.com/gcanti)! - Add support for ParseOptions and AST to transform

## 0.40.1

### Patch Changes

- [#459](https://github.com/Effect-TS/schema/pull/459) [`f2d0fc5`](https://github.com/Effect-TS/schema/commit/f2d0fc5b21b8ebdbab21722cdbf5655806ea5bf9) Thanks [@gcanti](https://github.com/gcanti)! - add ArrayFormatter

- [#461](https://github.com/Effect-TS/schema/pull/461) [`2d3a234`](https://github.com/Effect-TS/schema/commit/2d3a234737251e17e7cccf871579a5040aa7ceb9) Thanks [@gcanti](https://github.com/gcanti)! - move fast-check to peer dependencies, closes #458

## 0.40.0

### Minor Changes

- [#457](https://github.com/Effect-TS/schema/pull/457) [`693b81f`](https://github.com/Effect-TS/schema/commit/693b81f69e1c3a2191582165499587cbd50291b2) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#457](https://github.com/Effect-TS/schema/pull/457) [`693b81f`](https://github.com/Effect-TS/schema/commit/693b81f69e1c3a2191582165499587cbd50291b2) Thanks [@tim-smart](https://github.com/tim-smart)! - use preconstruct for builds

## 0.39.2

### Patch Changes

- [#454](https://github.com/Effect-TS/schema/pull/454) [`f8a9c57`](https://github.com/Effect-TS/schema/commit/f8a9c577c82ddf12c83717c34c5984e1d3f81924) Thanks [@fubhy](https://github.com/fubhy)! - Fix effect peer dependency version range

## 0.39.1

### Patch Changes

- [#452](https://github.com/Effect-TS/schema/pull/452) [`ca65e43`](https://github.com/Effect-TS/schema/commit/ca65e43a750322a2134b96823efbbb534eea49b5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.39.0

### Minor Changes

- [#449](https://github.com/Effect-TS/schema/pull/449) [`5950b14`](https://github.com/Effect-TS/schema/commit/5950b14a31518798133a1b702c4bc57afa803485) Thanks [@tim-smart](https://github.com/tim-smart)! - update to use unified "effect" package

## 0.38.0

### Minor Changes

- [#439](https://github.com/Effect-TS/schema/pull/439) [`2197496`](https://github.com/Effect-TS/schema/commit/21974960d957abad178c858b855bf9bd34c18d30) Thanks [@gcanti](https://github.com/gcanti)! - Schema: remove \*Result APIs

  - decodeResult (use decode instead)
  - encodeResult (use encode instead)
  - parseResult (use parse instead)
  - validateResult (use validate instead)

### Patch Changes

- [#447](https://github.com/Effect-TS/schema/pull/447) [`0252143`](https://github.com/Effect-TS/schema/commit/0252143fd081de940bc3fad7d6e1420ba016b3f0) Thanks [@gcanti](https://github.com/gcanti)! - int filter: use Number.isSafeInteger instead of Number.isInteger

## 0.37.2

### Patch Changes

- [#445](https://github.com/Effect-TS/schema/pull/445) [`e90d43b`](https://github.com/Effect-TS/schema/commit/e90d43badcfa577492766dfcfd3ab3910dacd41f) Thanks [@gcanti](https://github.com/gcanti)! - remove internal tag from MissingSelfGeneric utility type

## 0.37.1

### Patch Changes

- [#443](https://github.com/Effect-TS/schema/pull/443) [`3269600`](https://github.com/Effect-TS/schema/commit/32696007e208894d148950d36da12db3f3691214) Thanks [@fubhy](https://github.com/fubhy)! - update `/io`

## 0.37.0

### Minor Changes

- [#441](https://github.com/Effect-TS/schema/pull/441) [`63f1149`](https://github.com/Effect-TS/schema/commit/63f1149926a239411e781398ea2458b514b873b5) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data & /io

## 0.36.5

### Patch Changes

- [#436](https://github.com/Effect-TS/schema/pull/436) [`3a660d3`](https://github.com/Effect-TS/schema/commit/3a660d3c1fecd3f4acd0dbb99e2aed2d6e266189) Thanks [@gcanti](https://github.com/gcanti)! - add pretty to FilterAnnotations

## 0.36.4

### Patch Changes

- [#434](https://github.com/Effect-TS/schema/pull/434) [`994a37e`](https://github.com/Effect-TS/schema/commit/994a37e61fc12bffe36145e01b7708e18e213f36) Thanks [@gcanti](https://github.com/gcanti)! - Exclude property signatures from index signatures validations, fix #433

## 0.36.3

### Patch Changes

- [#430](https://github.com/Effect-TS/schema/pull/430) [`de5d649`](https://github.com/Effect-TS/schema/commit/de5d6493095460fa413e70a83a87aaabadabcf57) Thanks [@fubhy](https://github.com/fubhy)! - Enforce explicit `Schema.Class` type parameters

## 0.36.2

### Patch Changes

- [#428](https://github.com/Effect-TS/schema/pull/428) [`73a8424`](https://github.com/Effect-TS/schema/commit/73a842493079893898495fdb92ef3592a33176a7) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Class transform helper types

## 0.36.1

### Patch Changes

- [#425](https://github.com/Effect-TS/schema/pull/425) [`d952db8`](https://github.com/Effect-TS/schema/commit/d952db8a635f1ffeeb24b37518c44475a49af591) Thanks [@gcanti](https://github.com/gcanti)! - Class: add support for Arbitrary, closes #424

## 0.36.0

### Minor Changes

- [#420](https://github.com/Effect-TS/schema/pull/420) [`3a46cbc`](https://github.com/Effect-TS/schema/commit/3a46cbc3af2592e39619f193dd6972aa3a5ce04f) Thanks [@tim-smart](https://github.com/tim-smart)! - have Schema.Class constructors implement Schema directly

- [#422](https://github.com/Effect-TS/schema/pull/422) [`295561b`](https://github.com/Effect-TS/schema/commit/295561b46256444498202959852abdef8d6f4c0c) Thanks [@gcanti](https://github.com/gcanti)! - move ToAsserts utility type to Schema namespace

## 0.35.1

### Patch Changes

- [#418](https://github.com/Effect-TS/schema/pull/418) [`9cd24ac`](https://github.com/Effect-TS/schema/commit/9cd24acbde6c366ebecb48aff3c78eb74d0d48b9) Thanks [@gcanti](https://github.com/gcanti)! - update dependencies

- [#416](https://github.com/Effect-TS/schema/pull/416) [`f932832`](https://github.com/Effect-TS/schema/commit/f932832984af0b059f4dd7493f62510e2a551ed2) Thanks [@fubhy](https://github.com/fubhy)! - Use `Predicate.isUint8Array` and update `/data`

## 0.35.0

### Minor Changes

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - backport AST changes from POC:

  - change decode in Declaration- change decode in Refinement (to filter)
  - remove isReversed from Refinement
  - add transformation to Transform (and remove decode, encode, propertySignatureTransformations)
  - refactor PropertySignature

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - refactor annotations: keys must be symbols

- [#411](https://github.com/Effect-TS/schema/pull/411) [`2f6c4d1`](https://github.com/Effect-TS/schema/commit/2f6c4d116eb5c935710cf6dadbc5d500010c95d4) Thanks [@gcanti](https://github.com/gcanti)! - rename `symbol` to `symbolFromSelf` and add `symbol` which decodes/encodes from/to `string`

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - remove Spread in favour of /data/Types#Simplify

- [#413](https://github.com/Effect-TS/schema/pull/413) [`20ef377`](https://github.com/Effect-TS/schema/commit/20ef377fc0fc6adb92896c926fb5cc77430e0e1e) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - fix fromBrand definition (self is a Schema<I, A> now instead of Schema<A>)

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - rename `bigint` to `bigintFromSelf` and `BigintFromString` to `bigint`

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - change transformation display in error messages (from A -> B to A <-> B)

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - move From, To to Schema namespace (conforming to the ecosystem standard)

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - rename `transformResult` to `transformOrFail` and change signature (add additional ast parameter to transformations)

### Patch Changes

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - record: add support for branded keys

- [#407](https://github.com/Effect-TS/schema/pull/407) [`9a1b8de`](https://github.com/Effect-TS/schema/commit/9a1b8de5b8ff8f93c8a564bfdfc0f4c327d6a6aa) Thanks [@fubhy](https://github.com/fubhy)! - Add support for `base64`, `base64url` and `hex` encoding

- [#412](https://github.com/Effect-TS/schema/pull/412) [`3768461`](https://github.com/Effect-TS/schema/commit/37684611899d2bee1110d30c8d3136d74f6c5dcf) Thanks [@gcanti](https://github.com/gcanti)! - relax transform / transformOrFail / compose constraints

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - TreeFormatter: should not collapse union members

- [#401](https://github.com/Effect-TS/schema/pull/401) [`8b1ae6b`](https://github.com/Effect-TS/schema/commit/8b1ae6b4e4305eb983bc621c054f1523474066f7) Thanks [@gcanti](https://github.com/gcanti)! - add description annotations to: string, number, boolean, symbol, bigint, object

- [#405](https://github.com/Effect-TS/schema/pull/405) [`0e24b7d`](https://github.com/Effect-TS/schema/commit/0e24b7dea40e625d466d4922ed94433a09867dfb) Thanks [@fubhy](https://github.com/fubhy)! - Add support for `Uint8Array`

## 0.34.0

### Minor Changes

- [#403](https://github.com/Effect-TS/schema/pull/403) [`da52c2b`](https://github.com/Effect-TS/schema/commit/da52c2b9ca0945ca49ce57bd227f773aab1fc3c9) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data & /io

### Patch Changes

- [#397](https://github.com/Effect-TS/schema/pull/397) [`376fc3d`](https://github.com/Effect-TS/schema/commit/376fc3d89061c9db6aca2841f96dfd3f48bc4a50) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added S.Lowercase

- [#382](https://github.com/Effect-TS/schema/pull/382) [`d79309b`](https://github.com/Effect-TS/schema/commit/d79309b00f0028089858a8db8c98b6ecdf9c624c) Thanks [@fubhy](https://github.com/fubhy)! - Added `bigintFromNumber` transform

## 0.33.2

### Patch Changes

- [#392](https://github.com/Effect-TS/schema/pull/392) [`4c1ed27`](https://github.com/Effect-TS/schema/commit/4c1ed27026e3be65bb441d7d8a6a989db420e28d) Thanks [@gcanti](https://github.com/gcanti)! - pattern filter: set default Arbitrary

- [#388](https://github.com/Effect-TS/schema/pull/388) [`27a78bb`](https://github.com/Effect-TS/schema/commit/27a78bb7fbb08e6c2ad9cd29b21c59f41d2dfe28) Thanks [@gcanti](https://github.com/gcanti)! - compose: allow forcing decoding / encoding

- [#388](https://github.com/Effect-TS/schema/pull/388) [`27a78bb`](https://github.com/Effect-TS/schema/commit/27a78bb7fbb08e6c2ad9cd29b21c59f41d2dfe28) Thanks [@gcanti](https://github.com/gcanti)! - add parseJson combinator

- [#388](https://github.com/Effect-TS/schema/pull/388) [`27a78bb`](https://github.com/Effect-TS/schema/commit/27a78bb7fbb08e6c2ad9cd29b21c59f41d2dfe28) Thanks [@gcanti](https://github.com/gcanti)! - add ParseJson codec

## 0.33.1

### Patch Changes

- [#372](https://github.com/Effect-TS/schema/pull/372) [`9c30196`](https://github.com/Effect-TS/schema/commit/9c3019669b63245dd19b84939326f62e652277d2) Thanks [@fubhy](https://github.com/fubhy)! - Added `Class` to `Schema` module

## 0.33.0

### Minor Changes

- [#376](https://github.com/Effect-TS/schema/pull/376) [`64c2567`](https://github.com/Effect-TS/schema/commit/64c256769a69bce03fdb00b9fa4f7abdab794261) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

### Patch Changes

- [#375](https://github.com/Effect-TS/schema/pull/375) [`bd61bcf`](https://github.com/Effect-TS/schema/commit/bd61bcf94a82b65a2a5285ac57a31e7b3342ba33) Thanks [@tim-smart](https://github.com/tim-smart)! - update build tools

- [#373](https://github.com/Effect-TS/schema/pull/373) [`e74455e`](https://github.com/Effect-TS/schema/commit/e74455e82aa0219f236a884b84117d69bac6de57) Thanks [@tim-smart](https://github.com/tim-smart)! - use peer deps for /data and /io

## 0.32.0

### Minor Changes

- [#370](https://github.com/Effect-TS/schema/pull/370) [`70e4fff`](https://github.com/Effect-TS/schema/commit/70e4fff4fdc20ffe03b7c73416fdf286a218fe9c) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data and /io

## 0.31.0

### Minor Changes

- [#366](https://github.com/Effect-TS/schema/pull/366) [`77fffed`](https://github.com/Effect-TS/schema/commit/77fffedf4ffc69ed8e463e06510108351df164b3) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data and /io

## 0.30.4

### Patch Changes

- [#350](https://github.com/Effect-TS/schema/pull/350) [`00f6898`](https://github.com/Effect-TS/schema/commit/00f68980d57ecd5b8bb6568cc7e743530f79191d) Thanks [@vecerek](https://github.com/vecerek)! - Add schema for BigintFromString

- [#359](https://github.com/Effect-TS/schema/pull/359) [`cb00668`](https://github.com/Effect-TS/schema/commit/cb006688e45330eee4dc4321fa2437c1ab9d2f3f) Thanks [@vecerek](https://github.com/vecerek)! - Adds combinator that splits a string into an array of strings

- [#361](https://github.com/Effect-TS/schema/pull/361) [`60affeb`](https://github.com/Effect-TS/schema/commit/60affeb3a304439ca6fb4e5556afe7a6560f8b65) Thanks [@vecerek](https://github.com/vecerek)! - Adds `compose`: a combinator that composes Schema<A, B> with Schema<B, C> into Schema<A, C>.

## 0.30.3

### Patch Changes

- [#357](https://github.com/Effect-TS/schema/pull/357) [`00c2a47`](https://github.com/Effect-TS/schema/commit/00c2a47aae82a975755a90cb14ce27727efcfb21) Thanks [@sukovanej](https://github.com/sukovanej)! - Update /data.

- [#357](https://github.com/Effect-TS/schema/pull/357) [`00c2a47`](https://github.com/Effect-TS/schema/commit/00c2a47aae82a975755a90cb14ce27727efcfb21) Thanks [@sukovanej](https://github.com/sukovanej)! - Add `_id` to `Schema`. Add `isSchema` guard.

## 0.30.2

### Patch Changes

- [#355](https://github.com/Effect-TS/schema/pull/355) [`d6930c1`](https://github.com/Effect-TS/schema/commit/d6930c1a2194afe4700389a65f0d741cc8eed9f1) Thanks [@IMax153](https://github.com/IMax153)! - upgrade to `@effect/data@0.16.1` and `@effect/io@0.35.2`

## 0.30.1

### Patch Changes

- [#346](https://github.com/Effect-TS/schema/pull/346) [`68c58bf`](https://github.com/Effect-TS/schema/commit/68c58bf4de406e4df934eaea17bcff7cf1fffaea) Thanks [@gcanti](https://github.com/gcanti)! - instanceOf: fix annotations

## 0.30.0

### Minor Changes

- [#343](https://github.com/Effect-TS/schema/pull/343) [`6d3c7d9`](https://github.com/Effect-TS/schema/commit/6d3c7d9903e5dab27270736fbb119a44da1e78f0) Thanks [@gcanti](https://github.com/gcanti)! - remove json schema and related types

## 0.29.1

### Patch Changes

- [#341](https://github.com/Effect-TS/schema/pull/341) [`a73a943`](https://github.com/Effect-TS/schema/commit/a73a943e3612ddfc08e591048a83c52c34862b2e) Thanks [@gcanti](https://github.com/gcanti)! - fix trimmed definition, closes #340

## 0.29.0

### Minor Changes

- [#338](https://github.com/Effect-TS/schema/pull/338) [`b2560df`](https://github.com/Effect-TS/schema/commit/b2560dfa3b8bcb0c225aa09e95a43dd1783d1f50) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.28.0

### Minor Changes

- [#334](https://github.com/Effect-TS/schema/pull/334) [`5a6d733`](https://github.com/Effect-TS/schema/commit/5a6d733d51999a86dd03789275ab1dc920034ca3) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

## 0.27.0

### Minor Changes

- [#332](https://github.com/Effect-TS/schema/pull/332) [`9f0fa5d`](https://github.com/Effect-TS/schema/commit/9f0fa5df2853cae0de7151d3702320a69b10ac3d) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.26.1

### Patch Changes

- [#329](https://github.com/Effect-TS/schema/pull/329) [`d5da8bf`](https://github.com/Effect-TS/schema/commit/d5da8bf413dde42ed826ab561976f6c460687e95) Thanks [@gcanti](https://github.com/gcanti)! - make getWeight smarter

## 0.26.0

### Minor Changes

- [#324](https://github.com/Effect-TS/schema/pull/324) [`c6749d1`](https://github.com/Effect-TS/schema/commit/c6749d170ca00a8c6849b9c207a4a0d86ca66fce) Thanks [@gcanti](https://github.com/gcanti)! - add pipe method to Schema (and upgrade deps)

## 0.25.0

### Minor Changes

- [#322](https://github.com/Effect-TS/schema/pull/322) [`5f5bcb5`](https://github.com/Effect-TS/schema/commit/5f5bcb5ba62eda9b4454a1f5ffb74d90581459de) Thanks [@tim-smart](https://github.com/tim-smart)! - rename \*Effect parser methods

## 0.24.0

### Minor Changes

- [#318](https://github.com/Effect-TS/schema/pull/318) [`0c6cc97`](https://github.com/Effect-TS/schema/commit/0c6cc978616e7942fa1f2fafcdb8412c96f80b97) Thanks [@vecerek](https://github.com/vecerek)! - Add schema for [ULID](https://github.com/ulid/spec)

- [#321](https://github.com/Effect-TS/schema/pull/321) [`7f0e5bd`](https://github.com/Effect-TS/schema/commit/7f0e5bdaa9e2a92847cea98db77f39ecb1ee5afe) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest versions

### Patch Changes

- [#320](https://github.com/Effect-TS/schema/pull/320) [`8f09893`](https://github.com/Effect-TS/schema/commit/8f09893fcbfee209081a6e78246b08be8b3891f0) Thanks [@gcanti](https://github.com/gcanti)! - UUID: add title annotation

## 0.23.0

### Minor Changes

- [#316](https://github.com/Effect-TS/schema/pull/316) [`7c9e0ae`](https://github.com/Effect-TS/schema/commit/7c9e0ae48d01ff687e93992ecfbc86fed2e803cd) Thanks [@gcanti](https://github.com/gcanti)! - update effect/io

## 0.22.0

### Minor Changes

- [#314](https://github.com/Effect-TS/schema/pull/314) [`81f2529`](https://github.com/Effect-TS/schema/commit/81f2529e71da2b8dcd00c903ff72fbabbe346fca) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest deps

## 0.21.1

### Patch Changes

- [#312](https://github.com/Effect-TS/schema/pull/312) [`217a3ba`](https://github.com/Effect-TS/schema/commit/217a3ba9807dcdc71b5ab5a7b8bf6bac76c9a7be) Thanks [@gcanti](https://github.com/gcanti)! - struct should allow a "constructor" field name

## 0.21.0

### Minor Changes

- [#310](https://github.com/Effect-TS/schema/pull/310) [`10f8457`](https://github.com/Effect-TS/schema/commit/10f845702fb5017ec1635214c0f995c2da4f3188) Thanks [@sukovanej](https://github.com/sukovanej)! - Update /data and /io.

## 0.20.3

### Patch Changes

- [#307](https://github.com/Effect-TS/schema/pull/307) [`a325816`](https://github.com/Effect-TS/schema/commit/a32581607fc3941825a8d09fb4a70a04ea37e97d) Thanks [@gcanti](https://github.com/gcanti)! - extend should support transformations as both operands

## 0.20.2

### Patch Changes

- [#303](https://github.com/Effect-TS/schema/pull/303) [`0f70b22`](https://github.com/Effect-TS/schema/commit/0f70b22f9d0e6643a2c87a994f18ed4dd7775eda) Thanks [@sukovanej](https://github.com/sukovanej)! - Update @effect/data and fast-check.

## 0.20.1

### Patch Changes

- [#297](https://github.com/Effect-TS/schema/pull/297) [`8bfddc3`](https://github.com/Effect-TS/schema/commit/8bfddc3c45a1a2bf2d1470c40569f165a2ed9ff4) Thanks [@gcanti](https://github.com/gcanti)! - numberFromString should use `Number` instead of `parseFloat`

## 0.20.0

### Minor Changes

- [#292](https://github.com/Effect-TS/schema/pull/292) [`bd33211`](https://github.com/Effect-TS/schema/commit/bd33211772d8c10cd557045a8161a8fa571948f7) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest /io

## 0.19.3

### Patch Changes

- [#285](https://github.com/Effect-TS/schema/pull/285) [`39d3c55`](https://github.com/Effect-TS/schema/commit/39d3c55e77463169ce3ea6071f656c03c0fff393) Thanks [@gcanti](https://github.com/gcanti)! - AST: memoize createLazy

- [#285](https://github.com/Effect-TS/schema/pull/285) [`39d3c55`](https://github.com/Effect-TS/schema/commit/39d3c55e77463169ce3ea6071f656c03c0fff393) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: fix maximum call stack size exceeded when producing nested arrays and records that are too deep

## 0.19.2

### Patch Changes

- [#282](https://github.com/Effect-TS/schema/pull/282) [`9b9c3ee`](https://github.com/Effect-TS/schema/commit/9b9c3ee9d27c20a5bcb422f6d8ec3f46b648409a) Thanks [@gcanti](https://github.com/gcanti)! - handle excess properties for records

## 0.19.1

### Patch Changes

- [#280](https://github.com/Effect-TS/schema/pull/280) [`ec375dd`](https://github.com/Effect-TS/schema/commit/ec375dd23c061fedca370f73096cae9fba4b0cc1) Thanks [@gcanti](https://github.com/gcanti)! - Json should exclude NaN, +Infinity, -Infinity

## 0.19.0

### Minor Changes

- [#277](https://github.com/Effect-TS/schema/pull/277) [`1ac3d06`](https://github.com/Effect-TS/schema/commit/1ac3d06c90dc952b0beff9a722cfaace5162bb21) Thanks [@gcanti](https://github.com/gcanti)! - remove undefined from optionFromNullable

## 0.18.0

### Minor Changes

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - remove Schema.reverse API

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - remove getPropertySignatures API

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - rename AST.getTo -> to, AST.getFrom -> from

- [#274](https://github.com/Effect-TS/schema/pull/274) [`eae1614`](https://github.com/Effect-TS/schema/commit/eae16146096c42dabce8b06e28c9173f71924238) Thanks [@gcanti](https://github.com/gcanti)! - remove AST.reverse API

## 0.17.5

### Patch Changes

- [#272](https://github.com/Effect-TS/schema/pull/272) [`d91a7a7`](https://github.com/Effect-TS/schema/commit/d91a7a72eb4ca28633d2b9cfc3afdd07afadd98b) Thanks [@gcanti](https://github.com/gcanti)! - pick / omit: add support for structs with property signature transformations

## 0.17.4

### Patch Changes

- [#267](https://github.com/Effect-TS/schema/pull/267) [`8369823`](https://github.com/Effect-TS/schema/commit/83698237ee5098cfa4c04757b29cd9c8c71966c2) Thanks [@gcanti](https://github.com/gcanti)! - make extend dual

## 0.17.3

### Patch Changes

- [#264](https://github.com/Effect-TS/schema/pull/264) [`4488c09`](https://github.com/Effect-TS/schema/commit/4488c0933c3286aa99a4e18aa071fab18a582ad1) Thanks [@gcanti](https://github.com/gcanti)! - add arbitrary to AnnotationOptions

## 0.17.2

### Patch Changes

- [#258](https://github.com/Effect-TS/schema/pull/258) [`1b65e53`](https://github.com/Effect-TS/schema/commit/1b65e5348c7a93b2294e3429b4eddc78d054052e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Try publishing again

## 0.17.1

### Patch Changes

- [#256](https://github.com/Effect-TS/schema/pull/256) [`162e099`](https://github.com/Effect-TS/schema/commit/162e099b33d6092eca2a14f8a1c1c73a72621361) Thanks [@gcanti](https://github.com/gcanti)! - leverage annotations (e.g. maxLength, int, between) to improve fast-check performance

## 0.17.0

### Minor Changes

- [#254](https://github.com/Effect-TS/schema/pull/254) [`32e987a`](https://github.com/Effect-TS/schema/commit/32e987a8a82c0770def55835b3253e8e62017241) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update effect/io, make parsing fields of records and tuples parallel

## 0.16.0

### Minor Changes

- [#249](https://github.com/Effect-TS/schema/pull/249) [`ccee34e`](https://github.com/Effect-TS/schema/commit/ccee34ef87e9f0879ec674feaac1854ecb327614) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest effect/io

## 0.15.0

### Minor Changes

- [#247](https://github.com/Effect-TS/schema/pull/247) [`28c7484`](https://github.com/Effect-TS/schema/commit/28c7484c53976657b84e72a1a4573d85920ba38d) Thanks [@gcanti](https://github.com/gcanti)! - update to latest @effect/io

- [#247](https://github.com/Effect-TS/schema/pull/247) [`28c7484`](https://github.com/Effect-TS/schema/commit/28c7484c53976657b84e72a1a4573d85920ba38d) Thanks [@gcanti](https://github.com/gcanti)! - refactor optional APIs (Default values and Optional fields as `Option`s)

## 0.14.1

### Patch Changes

- [#245](https://github.com/Effect-TS/schema/pull/245) [`6a7d7be`](https://github.com/Effect-TS/schema/commit/6a7d7be5a94139846e32d26667a24c662a306f84) Thanks [@gcanti](https://github.com/gcanti)! - add `never` handling to struct API

## 0.14.0

### Minor Changes

- [#238](https://github.com/Effect-TS/schema/pull/238) [`f4ce344`](https://github.com/Effect-TS/schema/commit/f4ce34472bb8a4371826c1bd4c310c50e7b1cd4e) Thanks [@sukovanej](https://github.com/sukovanej)! - update @effect/io dependency

- [#239](https://github.com/Effect-TS/schema/pull/239) [`58be561`](https://github.com/Effect-TS/schema/commit/58be5617395c7c77ff8bdbb2058524c4439ebdbd) Thanks [@gcanti](https://github.com/gcanti)! - refactor optional

- [#239](https://github.com/Effect-TS/schema/pull/239) [`58be561`](https://github.com/Effect-TS/schema/commit/58be5617395c7c77ff8bdbb2058524c4439ebdbd) Thanks [@gcanti](https://github.com/gcanti)! - rename date to DateFromSelf

- [#240](https://github.com/Effect-TS/schema/pull/240) [`87cb2f4`](https://github.com/Effect-TS/schema/commit/87cb2f4793824e478175b020775346d3d8342713) Thanks [@gcanti](https://github.com/gcanti)! - rename date to Date

- [#243](https://github.com/Effect-TS/schema/pull/243) [`87382ae`](https://github.com/Effect-TS/schema/commit/87382ae472f2b2f437dd8abf80caa04421e223ba) Thanks [@gcanti](https://github.com/gcanti)! - narrow down IndexSignature type

- [#239](https://github.com/Effect-TS/schema/pull/239) [`58be561`](https://github.com/Effect-TS/schema/commit/58be5617395c7c77ff8bdbb2058524c4439ebdbd) Thanks [@gcanti](https://github.com/gcanti)! - rename DateFromString to date

### Patch Changes

- [#243](https://github.com/Effect-TS/schema/pull/243) [`87382ae`](https://github.com/Effect-TS/schema/commit/87382ae472f2b2f437dd8abf80caa04421e223ba) Thanks [@gcanti](https://github.com/gcanti)! - Arbitrary: should throw on effectful refinements

- [#231](https://github.com/Effect-TS/schema/pull/231) [`2c2d749`](https://github.com/Effect-TS/schema/commit/2c2d7497c61e7a0f8704947d22a27e43059fe8da) Thanks [@tim-smart](https://github.com/tim-smart)! - add isValidDate filter

- [#217](https://github.com/Effect-TS/schema/pull/217) [`7911525`](https://github.com/Effect-TS/schema/commit/7911525f756e64c1c75fa7820489af1a9dbe0e4d) Thanks [@jessekelly881](https://github.com/jessekelly881)! - data/Boolean: added S.not transform

- [#243](https://github.com/Effect-TS/schema/pull/243) [`87382ae`](https://github.com/Effect-TS/schema/commit/87382ae472f2b2f437dd8abf80caa04421e223ba) Thanks [@gcanti](https://github.com/gcanti)! - createRecord: should throw on unsupported literals

- [#237](https://github.com/Effect-TS/schema/pull/237) [`2a911ef`](https://github.com/Effect-TS/schema/commit/2a911ef56abf5193a3f7f8b8c9d3f1d6fd9c920c) Thanks [@gcanti](https://github.com/gcanti)! - export ValidDateFromSelf and rename validDate filter

## 0.13.1

### Patch Changes

- [#234](https://github.com/Effect-TS/schema/pull/234) [`9ed0ee2`](https://github.com/Effect-TS/schema/commit/9ed0ee25d0287ca72a2584278bab67643d332009) Thanks [@gcanti](https://github.com/gcanti)! - attachPropertySignature as PropertySignatureTransformation

## 0.13.0

### Minor Changes

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - update to latest effect/io

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - rename OptionalSchema to PropertySignature

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - simplify keyof and getPropertySignatures implementations

- [#232](https://github.com/Effect-TS/schema/pull/232) [`49ebaba`](https://github.com/Effect-TS/schema/commit/49ebabae7a8b2194f021670d65a227f9ef39e139) Thanks [@gcanti](https://github.com/gcanti)! - remove optionsFromOptionals API

## 0.12.1

### Patch Changes

- [#229](https://github.com/Effect-TS/schema/pull/229) [`3ab5df0`](https://github.com/Effect-TS/schema/commit/3ab5df06f8d8b85e94f8f597569c27f8abc6cc00) Thanks [@gcanti](https://github.com/gcanti)! - add missing Forbidden handling

## 0.12.0

### Minor Changes

- [#227](https://github.com/Effect-TS/schema/pull/227) [`8ae866d`](https://github.com/Effect-TS/schema/commit/8ae866d3e767b9654901dc9564136159adacbd4d) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest deps

## 0.11.1

### Patch Changes

- [#224](https://github.com/Effect-TS/schema/pull/224) [`6bf7243`](https://github.com/Effect-TS/schema/commit/6bf72435faa12a74c630a2e20792d18b36c471d1) Thanks [@gcanti](https://github.com/gcanti)! - move missing keys checks to improve perfs

## 0.11.0

### Minor Changes

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - rename isEnum to isEnums

- [#215](https://github.com/Effect-TS/schema/pull/215) [`b47e8ab`](https://github.com/Effect-TS/schema/commit/b47e8ab2e66e90963787e51f6af1d47b46a93ade) Thanks [@tsteckenborn](https://github.com/tsteckenborn)! - aligns usage of dateFromString with numberFromString

- [#221](https://github.com/Effect-TS/schema/pull/221) [`0e3eabd`](https://github.com/Effect-TS/schema/commit/0e3eabd427ba05ef03eaab0c0a7c3d3b5ff83ece) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to effect/io 0.18.0

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - refactor Refinement AST

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - remove hasTransformation optimisations

- [#223](https://github.com/Effect-TS/schema/pull/223) [`6cc1a56`](https://github.com/Effect-TS/schema/commit/6cc1a56e5b4c0e08d6e13f57742f67758ffe0180) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest /data and /io

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - keyof cannot handle refinements nor transformations

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - fix transformation signatures

### Patch Changes

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - cannot build an Arbitrary for transformations

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - fix AST.getTo implementation for Transform

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - export NumberFromString schema

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - export Trim schema

- [#218](https://github.com/Effect-TS/schema/pull/218) [`c6c96a4`](https://github.com/Effect-TS/schema/commit/c6c96a4bada0ac54a028fd5319fdcf345b4362ec) Thanks [@OlaoluwaM](https://github.com/OlaoluwaM)! - Added missing assertion functions for some AST nodes

- [#219](https://github.com/Effect-TS/schema/pull/219) [`10c505a`](https://github.com/Effect-TS/schema/commit/10c505a9a261266db9e7684e5a172ae8eeab2f5d) Thanks [@gcanti](https://github.com/gcanti)! - export DateFromString schema

## 0.10.0

### Minor Changes

- [#211](https://github.com/Effect-TS/schema/pull/211) [`45c322b`](https://github.com/Effect-TS/schema/commit/45c322b455dd06a7eb55a5d03533fbac3575d57f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update effect/data and effect/io

## 0.9.1

### Patch Changes

- [#209](https://github.com/Effect-TS/schema/pull/209) [`5affbf6`](https://github.com/Effect-TS/schema/commit/5affbf63671a3d16702fd67d1db36b65d031c17b) Thanks [@gcanti](https://github.com/gcanti)! - fix Spread definition

## 0.9.0

### Minor Changes

- [#206](https://github.com/Effect-TS/schema/pull/206) [`39da1cb`](https://github.com/Effect-TS/schema/commit/39da1cb794d7218674c14542d2c3b3a8f386d03b) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update effect/data and effect/io

## 0.8.3

### Patch Changes

- [#204](https://github.com/Effect-TS/schema/pull/204) [`c40237c`](https://github.com/Effect-TS/schema/commit/c40237cde61597272b376dcb3e784d72867c9c60) Thanks [@gcanti](https://github.com/gcanti)! - remove Spread from filter return type

## 0.8.2

### Patch Changes

- [#201](https://github.com/Effect-TS/schema/pull/201) [`5aa2d78`](https://github.com/Effect-TS/schema/commit/5aa2d78a527cbc488b7f330d1ad7afd3fb177127) Thanks [@gcanti](https://github.com/gcanti)! - cannot compute property signatures for refinements

- [#202](https://github.com/Effect-TS/schema/pull/202) [`6f51084`](https://github.com/Effect-TS/schema/commit/6f5108459534ba4c33ae54a79e4b2a1e06ad9af0) Thanks [@gcanti](https://github.com/gcanti)! - Schema: add support for never to From / To utility types

## 0.8.1

### Patch Changes

- [#199](https://github.com/Effect-TS/schema/pull/199) [`143a6a4`](https://github.com/Effect-TS/schema/commit/143a6a49f011bd5d46d15b9431c7f4e8daeacc79) Thanks [@gcanti](https://github.com/gcanti)! - improve filter signature

## 0.8.0

### Minor Changes

- [#197](https://github.com/Effect-TS/schema/pull/197) [`4f1b043`](https://github.com/Effect-TS/schema/commit/4f1b04325e9821b43920aeb858f8614573b88eb7) Thanks [@gcanti](https://github.com/gcanti)! - update to latest deps

- [#196](https://github.com/Effect-TS/schema/pull/196) [`96e5bf5`](https://github.com/Effect-TS/schema/commit/96e5bf519c91da759290aeaf21d7de1b951afe5c) Thanks [@gcanti](https://github.com/gcanti)! - tuples should always fail on excess indexes

- [#196](https://github.com/Effect-TS/schema/pull/196) [`96e5bf5`](https://github.com/Effect-TS/schema/commit/96e5bf519c91da759290aeaf21d7de1b951afe5c) Thanks [@gcanti](https://github.com/gcanti)! - refactor ParseOptions, closes #163

### Patch Changes

- [#173](https://github.com/Effect-TS/schema/pull/173) [`4090099`](https://github.com/Effect-TS/schema/commit/4090099799b4cea4ad633d83323e32d95c8be86a) Thanks [@jessekelly881](https://github.com/jessekelly881)! - Schema: added S.required

## 0.7.1

### Patch Changes

- [#190](https://github.com/Effect-TS/schema/pull/190) [`c52da9a`](https://github.com/Effect-TS/schema/commit/c52da9a6b2d249e2c823bbe8f4f7aaa51bd975a3) Thanks [@gcanti](https://github.com/gcanti)! - struct({}) should go in last position in a union

## 0.7.0

### Minor Changes

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - getPropertySignatures: cannot compute property signatures for transformations

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest @effect/data @effect/io

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - `partial` cannot handle refinement or transformations

## 0.6.0

### Minor Changes

- [#180](https://github.com/Effect-TS/schema/pull/180) [`25cbf46`](https://github.com/Effect-TS/schema/commit/25cbf46d62f97981534ec5c384618bc6b7af43b2) Thanks [@gcanti](https://github.com/gcanti)! - Allow symbols in Brand

### Patch Changes

- [#184](https://github.com/Effect-TS/schema/pull/184) [`b0b6423`](https://github.com/Effect-TS/schema/commit/b0b6423ae9368de246a6c0982cad8c4bbcbab2da) Thanks [@gcanti](https://github.com/gcanti)! - make optionsFromOptionals composable

- [#182](https://github.com/Effect-TS/schema/pull/182) [`f7899b7`](https://github.com/Effect-TS/schema/commit/f7899b7cbe930c133e1f764b4722df46998dfc07) Thanks [@gcanti](https://github.com/gcanti)! - optionsFromOptionals: ensure non overlapping property signatures

- [#181](https://github.com/Effect-TS/schema/pull/181) [`0062b25`](https://github.com/Effect-TS/schema/commit/0062b251cd20e4a29d75aca2287b0206c6e302a7) Thanks [@gcanti](https://github.com/gcanti)! - fix optionsFromOptionals implementation

## 0.5.0

### Minor Changes

- [#178](https://github.com/Effect-TS/schema/pull/178) [`f60341f`](https://github.com/Effect-TS/schema/commit/f60341f1c626145455c3ccd89c34b42905853bb5) Thanks [@gcanti](https://github.com/gcanti)! - merge transformEither and transformEffect into transformResult

## 0.4.0

### Minor Changes

- [#174](https://github.com/Effect-TS/schema/pull/174) [`c3a1230`](https://github.com/Effect-TS/schema/commit/c3a1230d9bd42b5779f8986e48571735b666b7a9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Only run effects when allowed

### Patch Changes

- [#172](https://github.com/Effect-TS/schema/pull/172) [`6277f5a`](https://github.com/Effect-TS/schema/commit/6277f5ac91422a3fe9584b80a184ebecc92ad610) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Optimize ParseResult conditional functions

- [#176](https://github.com/Effect-TS/schema/pull/176) [`dbb0a59`](https://github.com/Effect-TS/schema/commit/dbb0a5976bbf16e89006d435bed44cd671168215) Thanks [@gcanti](https://github.com/gcanti)! - Optimize internal validations

## 0.3.1

### Patch Changes

- [#169](https://github.com/Effect-TS/schema/pull/169) [`6b0a45f`](https://github.com/Effect-TS/schema/commit/6b0a45f5fb33bbc9db7175573544903ab65d2e07) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add back missing commits from wrong rebase.

## 0.3.0

### Minor Changes

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - AST: remove isReversed from Transform

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - make ParseError tagged

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - ParseResult: add optional message to Type error

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - remove useless options argument from is

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Integrate Effect into Parser

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - simplify dateFromString

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Schema: add reverse API

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - rename decodeFromInput to decode and decode to parse

### Patch Changes

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add parse, parseOption, parseEither

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - fix trim, clamp, clampBigint definition

## 0.2.1

### Patch Changes

- [#155](https://github.com/Effect-TS/schema/pull/155) [`0b86081`](https://github.com/Effect-TS/schema/commit/0b860818820d9b22ca17946175379c2334ec6a5a) Thanks [@gcanti](https://github.com/gcanti)! - fix attachPropertySignature bug ref #153

## 0.2.0

### Minor Changes

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename encodeOrThrow -> encode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: rename typeAlis to Declaration

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename `transformOrFail` to `transformEither`

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename encode -> encodeEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: change Refinement definition form predicate to decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - move /formatter/Tree up and rename to TreeFormatter

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /annotation/Hook module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - refactor instanceOf as Declaration

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename decodeOrThrow -> decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: refactor typeAlias adding decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename getOption -> decodeOption

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /data folder

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /annotation/AST module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /index module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename decode -> decodeEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - formatErrors/ should collapse trees that have a branching factor of 1

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - simplify Arbitrary implementation

### Patch Changes

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - add validate, validateOption, validateEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - add encodeOption

## 0.1.0

### Minor Changes

- [#145](https://github.com/Effect-TS/schema/pull/145) [`cc05ffe`](https://github.com/Effect-TS/schema/commit/cc05ffea0f9844b58e7d3bf2e05fed6f827679e7) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data to 0.4.1

### Patch Changes

- [#142](https://github.com/Effect-TS/schema/pull/142) [`bc30196`](https://github.com/Effect-TS/schema/commit/bc3019642d1c0620d82de9462d8dbd134a58c59f) Thanks [@gcanti](https://github.com/gcanti)! - add /data/Option/parseOptionals

## 0.0.5

### Patch Changes

- [#131](https://github.com/Effect-TS/schema/pull/131) [`d07b0f1`](https://github.com/Effect-TS/schema/commit/d07b0f1945d2153610e4ca2572113758af950de3) Thanks [@gcanti](https://github.com/gcanti)! - Pretty: use formatActual as default formatter

- [#134](https://github.com/Effect-TS/schema/pull/134) [`c935ff2`](https://github.com/Effect-TS/schema/commit/c935ff20d415c0baae92e113f64ac0cbb77f7d11) Thanks [@gcanti](https://github.com/gcanti)! - add BrandSchema, getOption

## 0.0.4

### Patch Changes

- [#115](https://github.com/Effect-TS/schema/pull/115) [`1555a81`](https://github.com/Effect-TS/schema/commit/1555a81fb814f612f7ad973add6e29c68f5635dc) Thanks [@gcanti](https://github.com/gcanti)! - Optimize decoding of unions using a heuristic based on literals

## 0.0.3

### Patch Changes

- [#127](https://github.com/Effect-TS/schema/pull/127) [`fd87ac6`](https://github.com/Effect-TS/schema/commit/fd87ac600e98b60da8de6d5792727e2ec8acb6dc) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix release for github

## 0.0.2

### Patch Changes

- [#125](https://github.com/Effect-TS/schema/pull/125) [`41841a3`](https://github.com/Effect-TS/schema/commit/41841a379a97a80e298312d23a1985cc31336834) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - update release

## 0.0.1

### Patch Changes

- [#119](https://github.com/Effect-TS/schema/pull/119) [`62ed1b0`](https://github.com/Effect-TS/schema/commit/62ed1b0b5e7a3e91c62a40f258dbe185a8354b20) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Move to the @effect org

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - refactor custom types

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - move parseNumber to /data/Number

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest effect/data

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - /data/Option rename fromNullable to parseNullable

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - move parseDate to /data/Date

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - refactor instanceOf (to a constructor)

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - Added clamp transform to Number and Bigint
