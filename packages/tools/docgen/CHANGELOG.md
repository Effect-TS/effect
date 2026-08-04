# @effect/docgen

## 4.0.0-beta.103

### Patch Changes

- [#6828](https://github.com/Effect-TS/effect/pull/6828) [`48f22a7`](https://github.com/Effect-TS/effect/commit/48f22a7d16ae57ee2175d450dafbdeb69e187d2a) Thanks @tim-smart! - Use layered storage for Context, making `Context.add` O(1) and eliminating per-request service map clones in the HTTP servers. Docgen now omits `@internal` option properties from generated signatures.

- [#6701](https://github.com/Effect-TS/effect/pull/6701) [`9867b9f`](https://github.com/Effect-TS/effect/commit/9867b9fc69f9cc6c443594fc7eccc7be0c674d9c) Thanks @fubhy! - Removed explicit ./index entrypoints

- Updated dependencies [[`e56cd8f`](https://github.com/Effect-TS/effect/commit/e56cd8f90c3559baccf8fcf2852ea911235d5944), [`f77c120`](https://github.com/Effect-TS/effect/commit/f77c120d8e04779ddeb8bce8e9cde932f268e4b6), [`b2f95a9`](https://github.com/Effect-TS/effect/commit/b2f95a9c2f2581deb89dc3bae9e89cf819e82923), [`04fd44a`](https://github.com/Effect-TS/effect/commit/04fd44a42abfa8dc2642300dcf49ee48c8ef4539), [`b74333d`](https://github.com/Effect-TS/effect/commit/b74333d83e15b9d042e4698ad23040de60454afe), [`1c40b28`](https://github.com/Effect-TS/effect/commit/1c40b2809503d6aa1358777196fc66317906e657), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`b3901d2`](https://github.com/Effect-TS/effect/commit/b3901d29c543fd5bd05ceec669a17896c8e19006), [`4a0984a`](https://github.com/Effect-TS/effect/commit/4a0984af62738fedf4bd3e87adb4d4d641ce9147), [`fffd88b`](https://github.com/Effect-TS/effect/commit/fffd88b3135abdf928ca7c4b0e00e610985091c7), [`f3f6c1e`](https://github.com/Effect-TS/effect/commit/f3f6c1e02cb543423fcffef5dc2db03fac503588), [`ef07642`](https://github.com/Effect-TS/effect/commit/ef07642dfe671d5258b65d1c1480c4d05c495f15), [`f1bc827`](https://github.com/Effect-TS/effect/commit/f1bc8274a608813d7b09d28dcca04adbf62f8c92), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`081f4d8`](https://github.com/Effect-TS/effect/commit/081f4d8cd06a2ac222d2810b46e61efcee26939e), [`5287b24`](https://github.com/Effect-TS/effect/commit/5287b24f5f8fa094ba20e117bfb1a80fba6d2cf5), [`13d31cf`](https://github.com/Effect-TS/effect/commit/13d31cfc2dde46210e94391b5b6767ae9aeaf2c9), [`acee269`](https://github.com/Effect-TS/effect/commit/acee26944bc89ee554d7b9fadab7443f9edc28a9), [`31170c1`](https://github.com/Effect-TS/effect/commit/31170c19b236c37abb5476c821bc6f5bfa2735ab), [`205ebc7`](https://github.com/Effect-TS/effect/commit/205ebc776062012581e98fced7ced19adfc44ee7), [`ed0ebf8`](https://github.com/Effect-TS/effect/commit/ed0ebf8e5c864d46fed1f232e99c0e680f10a58f), [`a3fd084`](https://github.com/Effect-TS/effect/commit/a3fd08482157bd78b089f77c7b173d54ef68b5cd), [`ee29ddf`](https://github.com/Effect-TS/effect/commit/ee29ddf862c3723ad466abc93ab6f6fe723b2319), [`6086309`](https://github.com/Effect-TS/effect/commit/60863090af8e5af0bfa1435f08dc5390f9993e30), [`4a57af2`](https://github.com/Effect-TS/effect/commit/4a57af24011db1d66e947289d2f7ffc2074696d2), [`660875b`](https://github.com/Effect-TS/effect/commit/660875b4325e6eebb3f04513998301cd2a0847ec), [`8e7c706`](https://github.com/Effect-TS/effect/commit/8e7c706b0aca855489b53d987404566d3e9cb5e7), [`5f63adb`](https://github.com/Effect-TS/effect/commit/5f63adbe75fc9d50d23706a52b3e483ad2a1a01c), [`053bc42`](https://github.com/Effect-TS/effect/commit/053bc42e2a964755611a216e78ed214322efee37), [`c0a1534`](https://github.com/Effect-TS/effect/commit/c0a153494484ecf9f0d0f20895a7a648b4be363b), [`f1e3a37`](https://github.com/Effect-TS/effect/commit/f1e3a378c144f974a6122b299f421b75595af20f), [`cedb01a`](https://github.com/Effect-TS/effect/commit/cedb01a025492a1faf9e59eb23eb96bc3b5e2fff), [`1747440`](https://github.com/Effect-TS/effect/commit/1747440de9a51a56ed3660da748cc01b256adce7), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`b4f1ee2`](https://github.com/Effect-TS/effect/commit/b4f1ee238d96aa78c5f040158cb78671d75b381e), [`a4757f1`](https://github.com/Effect-TS/effect/commit/a4757f1c47067d8d016a6c4a2c541bb8ae520f9b), [`cd122b9`](https://github.com/Effect-TS/effect/commit/cd122b90300d995a237993a2edb7a049785ab6a4), [`5de588b`](https://github.com/Effect-TS/effect/commit/5de588b2472fb0f4eb919766eb8472583a044772), [`3895b9c`](https://github.com/Effect-TS/effect/commit/3895b9cf179262cd277a9c6daafe9050dcf8265e), [`89ce5f3`](https://github.com/Effect-TS/effect/commit/89ce5f3e16e23a193daa475dc72ea8133ae1dacd), [`985de09`](https://github.com/Effect-TS/effect/commit/985de097d75906db2aed784841f81e23cc978b43), [`9800e3a`](https://github.com/Effect-TS/effect/commit/9800e3acc8f36530f671bc8b91558cb112f449a7), [`4dc35f6`](https://github.com/Effect-TS/effect/commit/4dc35f64641746366f867ea3dbfedb9cd4685ada), [`e8eb62b`](https://github.com/Effect-TS/effect/commit/e8eb62b3d0ef27e9761cdc2eb93bdec52d6ee204), [`ecd9993`](https://github.com/Effect-TS/effect/commit/ecd99936112cb69efdb02de3a2fd57f47baefdf3), [`5ab9c08`](https://github.com/Effect-TS/effect/commit/5ab9c08463ce049c45f3502676954a7b72c6b024), [`f5cf965`](https://github.com/Effect-TS/effect/commit/f5cf96548afd51f4b3cf1aea11b04d7f8549ce90), [`a94cbed`](https://github.com/Effect-TS/effect/commit/a94cbed84e9e49bea4bff925599c0f19c4e3deab), [`9160ad7`](https://github.com/Effect-TS/effect/commit/9160ad7d146d4376dd12f7510c025e5b2f638a70), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`52494be`](https://github.com/Effect-TS/effect/commit/52494be9e8eb3bb542d06a3dfefc6bca4e168984), [`5441c8e`](https://github.com/Effect-TS/effect/commit/5441c8e656a6418c0d27feb2df67565a3e1155f4), [`c9b56ab`](https://github.com/Effect-TS/effect/commit/c9b56ab507f224426ee8388dc450da447ec4715f), [`8ef7257`](https://github.com/Effect-TS/effect/commit/8ef72577d1f43212cab87951d659e54e3c8d7d91), [`1519406`](https://github.com/Effect-TS/effect/commit/1519406fed6e8b017ae178dc20bcaa2cf318b570), [`9716990`](https://github.com/Effect-TS/effect/commit/97169902eec3c99baa7f0b2c7b45a0a5eae75819), [`733f75b`](https://github.com/Effect-TS/effect/commit/733f75b7125e3016a975fdd251c0179ae5393786), [`48155c8`](https://github.com/Effect-TS/effect/commit/48155c8ccfc12dcca8a00fa358d50b20c30874e4), [`951d06b`](https://github.com/Effect-TS/effect/commit/951d06b83d459d3e8fa9024e727a5db1662d3322), [`d767b65`](https://github.com/Effect-TS/effect/commit/d767b65a7687e38be23f0b0ee3d52ab5f2360cbe), [`5d52d9d`](https://github.com/Effect-TS/effect/commit/5d52d9d148aaa7f736ed8c310fc8bfa9dc81badf), [`f4151e1`](https://github.com/Effect-TS/effect/commit/f4151e1937c26de14f1d64566f8126173f1b5014), [`e02fbb6`](https://github.com/Effect-TS/effect/commit/e02fbb66f5a0f13dba6c33ef63528a37a17a0676), [`724ce09`](https://github.com/Effect-TS/effect/commit/724ce09650a458d4565e5c7331ea92ca04f08e68), [`dbe91f6`](https://github.com/Effect-TS/effect/commit/dbe91f6961ef9f7e8da910ee5758d9c0d385fca8), [`4c008d2`](https://github.com/Effect-TS/effect/commit/4c008d28b370d817f7ae4579db09836fe084c8d2), [`b650832`](https://github.com/Effect-TS/effect/commit/b6508328708a842f3163467b72486bd228f1a289), [`b46c92f`](https://github.com/Effect-TS/effect/commit/b46c92f3b314f4ffd612b831efa55dd856c587a3), [`5335797`](https://github.com/Effect-TS/effect/commit/5335797003076d9c6fd170da98d779696d555596), [`4b3460d`](https://github.com/Effect-TS/effect/commit/4b3460daa434ec465a95a50704fe1103a9275999), [`6301fd7`](https://github.com/Effect-TS/effect/commit/6301fd710b4325718de2c42997dac28a9e9aa250), [`aebc5c6`](https://github.com/Effect-TS/effect/commit/aebc5c61664b89a840465ec65b79ce635a5ceee8), [`52b2d7b`](https://github.com/Effect-TS/effect/commit/52b2d7b5bd3c7cce3bd5b69c6ab3941004da70f3), [`eec5744`](https://github.com/Effect-TS/effect/commit/eec57445dfa0ef3c5977195ad69415b7e7d42bb6), [`24e0e93`](https://github.com/Effect-TS/effect/commit/24e0e93dc307dc2c2ae86caacb7289e1dab3c103), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`1a7ce81`](https://github.com/Effect-TS/effect/commit/1a7ce8150e3977586c44d8ccb9a8384389bb4d49), [`48f22a7`](https://github.com/Effect-TS/effect/commit/48f22a7d16ae57ee2175d450dafbdeb69e187d2a), [`c96b7f6`](https://github.com/Effect-TS/effect/commit/c96b7f6359662053c3e09344f61dddc7a6caf4ac), [`6d2a942`](https://github.com/Effect-TS/effect/commit/6d2a942ed7cd33b8fd79d549edba33bc9e2a7e3e), [`cc27b19`](https://github.com/Effect-TS/effect/commit/cc27b194b9d13fa3a66ab037e853fca9d41700ff), [`8f9499f`](https://github.com/Effect-TS/effect/commit/8f9499f562729f5f7b08d8bcc4db86b4aeff8a21), [`3eeea73`](https://github.com/Effect-TS/effect/commit/3eeea73cfc3e9b126975c2ddbdb7f7c8c92026e2), [`0a532e5`](https://github.com/Effect-TS/effect/commit/0a532e503f165fdea485a5343fc2f420917e8376), [`f398149`](https://github.com/Effect-TS/effect/commit/f398149c134fd9b67b6cdc52eae3f3248d5c7bbe), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`ace903e`](https://github.com/Effect-TS/effect/commit/ace903e09c2549ceebdec380797beb027cd29f3d), [`e8eb62b`](https://github.com/Effect-TS/effect/commit/e8eb62b3d0ef27e9761cdc2eb93bdec52d6ee204), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`48f22a7`](https://github.com/Effect-TS/effect/commit/48f22a7d16ae57ee2175d450dafbdeb69e187d2a), [`d48506d`](https://github.com/Effect-TS/effect/commit/d48506d97525040aa714305e928126df799795b4), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`d48506d`](https://github.com/Effect-TS/effect/commit/d48506d97525040aa714305e928126df799795b4), [`d48506d`](https://github.com/Effect-TS/effect/commit/d48506d97525040aa714305e928126df799795b4), [`52262be`](https://github.com/Effect-TS/effect/commit/52262be2edce0e350c6ac10f8f725678606399c5), [`1284aa1`](https://github.com/Effect-TS/effect/commit/1284aa183451955ad7921bbe01fd0e095695d444), [`9867b9f`](https://github.com/Effect-TS/effect/commit/9867b9fc69f9cc6c443594fc7eccc7be0c674d9c), [`d0f1a22`](https://github.com/Effect-TS/effect/commit/d0f1a2295155c350b04efb46852cb40032805273), [`979ce39`](https://github.com/Effect-TS/effect/commit/979ce3985d7d62ce2bf240681ca19feda3027452), [`b6d3e67`](https://github.com/Effect-TS/effect/commit/b6d3e67c7cc143cd8470cdf704324e79d23954a9), [`adf6c6c`](https://github.com/Effect-TS/effect/commit/adf6c6cd388af8a3c0c546492e71555368556f6a), [`7314d60`](https://github.com/Effect-TS/effect/commit/7314d605284717aaafe7fc34b88c3c93397e865c), [`aeba0c8`](https://github.com/Effect-TS/effect/commit/aeba0c8c9ffc5f125d961ae21e4ac15491e51046), [`1acbd8b`](https://github.com/Effect-TS/effect/commit/1acbd8b44c68ebb23735e9810476b870dbe58aea), [`7bde6cc`](https://github.com/Effect-TS/effect/commit/7bde6ccb2b144fe953ff30a7ef5e1ecc97697146), [`a959a8b`](https://github.com/Effect-TS/effect/commit/a959a8bf21cdb976369f494dc949fa00a050d3e0)]:
  - effect@4.0.0-beta.103
  - @effect/platform-node@4.0.0-beta.103

## 4.0.0-beta.102

### Major Changes

- [#6556](https://github.com/Effect-TS/effect/pull/6556) [`19eeda6`](https://github.com/Effect-TS/effect/commit/19eeda68bac6d65bd24b9a9ca30565f35dbae565) Thanks @fubhy! - Migrate `@effect/docgen` into the Effect monorepo and update it to Effect 4 while retaining existing behavior.

### Patch Changes

- [#6567](https://github.com/Effect-TS/effect/pull/6567) [`5101e92`](https://github.com/Effect-TS/effect/commit/5101e92c9c149c153423f43dd7a94f6194653c06) Thanks @gcanti! - Add `Record.assignProperty` and safely handle dynamic record keys such as `__proto__` and inherited property names.

- Updated dependencies [[`b6392e1`](https://github.com/Effect-TS/effect/commit/b6392e119704553edec1b4fd2869ac0dbec621ef), [`7ed9450`](https://github.com/Effect-TS/effect/commit/7ed945044eb56aa9aeaf62d4746a011c96c58628), [`45762bd`](https://github.com/Effect-TS/effect/commit/45762bd78df9ecd87c98b8d3738cdeeac7d81128), [`a6e8391`](https://github.com/Effect-TS/effect/commit/a6e8391cd31acd898fae18b3f8e7ca4c6f14f065), [`4ac7e8b`](https://github.com/Effect-TS/effect/commit/4ac7e8b136c61a26c3e438c013dfd7349b38e999), [`4cd40f5`](https://github.com/Effect-TS/effect/commit/4cd40f5692477783bef84fed3c5ef1c0cf5602e6), [`6956bc0`](https://github.com/Effect-TS/effect/commit/6956bc0e6cb27f53fbec39d9b18545940f9f598f), [`0e50ec7`](https://github.com/Effect-TS/effect/commit/0e50ec7dbb94390666f292cf9120719bf30a7246), [`9fcdade`](https://github.com/Effect-TS/effect/commit/9fcdade4a8af772b9ccd8b8a24fe8cee0e5d8470), [`57367d5`](https://github.com/Effect-TS/effect/commit/57367d54de55047ff0c5fce9685475e236bf354c), [`35c445f`](https://github.com/Effect-TS/effect/commit/35c445ff18029d192900ea0914c993f58d5cf1a5), [`c917bb9`](https://github.com/Effect-TS/effect/commit/c917bb94a4c1c4e0a24372a8ebb8a5ca232e36b5), [`bc1f358`](https://github.com/Effect-TS/effect/commit/bc1f3583e63344cb2c398d9040d9c975488ed123), [`0e0c9d7`](https://github.com/Effect-TS/effect/commit/0e0c9d7922ff463c1093d9e0576fae12cb0698d5), [`73d40aa`](https://github.com/Effect-TS/effect/commit/73d40aacd8fcae1b48c23f5b0a5c542127401d1d), [`4f1e318`](https://github.com/Effect-TS/effect/commit/4f1e3183f7123591c46224e9c587df7594562a5f), [`9d8d85c`](https://github.com/Effect-TS/effect/commit/9d8d85c1bb7da51970845b8ea830e386e777514a), [`6079fda`](https://github.com/Effect-TS/effect/commit/6079fda7b02f2f01ad91c15ab8c307336f3ba252), [`5101e92`](https://github.com/Effect-TS/effect/commit/5101e92c9c149c153423f43dd7a94f6194653c06), [`d0b3265`](https://github.com/Effect-TS/effect/commit/d0b3265c3262670761471ab3518cf933b1b3b20a), [`7a03c89`](https://github.com/Effect-TS/effect/commit/7a03c893ce6492bf94c0ebfb00b63bf25dcbf83e), [`cea1d9c`](https://github.com/Effect-TS/effect/commit/cea1d9c92601e69ebda040af8a1d860d604d885c), [`078e1f5`](https://github.com/Effect-TS/effect/commit/078e1f5636e31b76a86722a636afc37a8cc25580), [`97bafea`](https://github.com/Effect-TS/effect/commit/97bafeab460833b9781527b437d1cb9cbee63260), [`fab0ab8`](https://github.com/Effect-TS/effect/commit/fab0ab8f7ab15ae596faa4ccf75615a494d11b0b), [`c323d8b`](https://github.com/Effect-TS/effect/commit/c323d8b30dbbe85f9df25b67288b93d5332de333), [`6966353`](https://github.com/Effect-TS/effect/commit/69663534d626003eb10a5e55ab1f13e0379fead1), [`0444004`](https://github.com/Effect-TS/effect/commit/04440041989c1785fe4db286379f2be2c15baa85), [`028bbb3`](https://github.com/Effect-TS/effect/commit/028bbb391e161185da10d974ab33381f769940d7), [`ff5d6e2`](https://github.com/Effect-TS/effect/commit/ff5d6e278a1fdff714315dc1a17075012f05c1f0), [`1bfce93`](https://github.com/Effect-TS/effect/commit/1bfce93e6d2bf0794c11733daf51c2390e7de375), [`7ce815c`](https://github.com/Effect-TS/effect/commit/7ce815cd5af6af991dfc13b890fd22345fc77c20), [`7271a7f`](https://github.com/Effect-TS/effect/commit/7271a7faf1080aa75f2f53ca6a0b5ec9334c1d38), [`475fe5c`](https://github.com/Effect-TS/effect/commit/475fe5c12c2d6504c475797c0634f90da01e1797)]:
  - effect@4.0.0-beta.102
  - @effect/platform-node@4.0.0-beta.102

## 0.5.2

### Patch Changes

- 3b595aa: Remove duplicate logger

## 0.5.1

### Patch Changes

- 0b3b34e: Typecheck examples deeply nested within namespaces

## 0.5.0

### Minor Changes

- 8a0eb55: Support custom code fences when rendering examples

## 0.4.7

### Patch Changes

- e3ae139: Typecheck namespace examples

## 0.4.6

### Patch Changes

- fcd5649: Support examples enclosed in Extended Markdown [code blocks](https://www.markdownguide.org/extended-syntax/#fenced-code-blocks)
- 95f136e: Support deeply nested namespaces.

  Previously, the docgen would fail with a `[Markdown] Unsupported namespace nesting: 4` error. With this change all namespace headers at depth level 3 and above would be rendered using H4 elements.

## 0.4.5

### Patch Changes

- 8959440: Fixes the type checking and execution of examples on Windows

## 0.4.4

### Patch Changes

- 00ce7a0: upgrade ts-morph to 23.0.0
- 5b888e5: srcDir and outDir fields in docgen.json are currently ignored. With this patch, they are taken into account

## 0.4.3

### Patch Changes

- 7add2b9: update dependencies

## 0.4.2

### Patch Changes

- 619a0e3: use @effect/markdown-toc instead of github dependency

## 0.4.1

### Patch Changes

- b9bfab0: add reporting of `tsc` and `tsx` errors, closes #66

## 0.4.0

### Minor Changes

- 5fbec18: update effect

### Patch Changes

- 08e8347: use ConfigProvider to load configuration for docgen

## 0.3.8

### Patch Changes

- 8abf24f: Core: do not swallow examples errors

## 0.3.7

### Patch Changes

- 2573662: update effect

## 0.3.6

### Patch Changes

- d58b355: chore: add defaults to `schema.json`

## 0.3.5

### Patch Changes

- bcaf971: fix glob pattern on windows

## 0.3.4

### Patch Changes

- 4e72aee: Re-added schema.json

## 0.3.3

### Patch Changes

- 3ee6dd1: Improve error output when spawning child process fails
- 73a1d93: build with tsup

## 0.3.2

### Patch Changes

- 16fc976: Updated dependencies

## 0.3.1

### Patch Changes

- b799243: add `--no-examples` option

## 0.3.0

### Minor Changes

- e08edb1: Modernized and switched to a `tsc` and `tsx` based setup with support for `NodeNext` module resolution.

## 0.2.1

### Patch Changes

- 2677b9d: updated effect
- 743ce06: change theme default

## 0.2.0

### Minor Changes

- ecd00a5: update effect and add effect/platform-node dependency

## 0.1.8

### Patch Changes

- 5411c71: Support for parsing "export \* as namespace"

## 0.1.7

### Patch Changes

- b94de9f: add support for `export * from ...`

## 0.1.6

### Patch Changes

- 172ac81: Fix parsing regression caused by compilerOptions parsing

## 0.1.5

### Patch Changes

- 85301ea: Add support for resolving compilerOptions from tsconfig files

## 0.1.4

### Patch Changes

- 8be0092: add support for namespaces
- 8be0092: BugFix: remove stale modules from /docs folder

## 0.1.3

### Patch Changes

- d8006f3: patch markdown-toc to prevent duplicate links
- 514f73f: update to effect framework package

## 0.1.2

### Patch Changes

- 115b996: fix formatting of the \_config.yml output by docgen
- 115b996: upgrade dependencies

## 0.1.1

### Patch Changes

- 2a909a1: fix config handling

## 0.1.0

### Minor Changes

- eb5ef08: rename docs-ts.json to docgen.json

## 0.0.3

### Patch Changes

- d139f78: ignore internal classes

## 0.0.2

### Patch Changes

- 4e88501: fix shebang line

## 0.0.1

### Patch Changes

- 4faa066: add initial code
