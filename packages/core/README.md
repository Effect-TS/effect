# Matechs Effect Core

Exposes the core Effect System plus a handful of patched modules from fp-ts, usage like:

```ts
import * as S from "@matechs/core/Stream"
import { pipe } from "@matechs/core/Function"
import * as T from "@matechs/core/Effect"

pipe(S.repeatedly(1), S.take(10), S.collectArray, T.runToPromiseExit).then(console.log)
```

# Install

```bash
yarn add @matechs/core
```

# Docs

To come

# Available modules:

```ts
import "@matechs/core/Apply"
import "@matechs/core/Array"
import "@matechs/core/Base"
import "@matechs/core/Boolean"
import "@matechs/core/ConcurrentRef"
import "@matechs/core/Const"
import "@matechs/core/Deferred"
import "@matechs/core/Do"
import "@matechs/core/Effect"
import "@matechs/core/EffectOption"
import "@matechs/core/Either"
import "@matechs/core/Eq"
import "@matechs/core/Exit"
import "@matechs/core/Function"
import "@matechs/core/Identity"
import "@matechs/core/List"
import "@matechs/core/Magma"
import "@matechs/core/Managed"
import "@matechs/core/Map"
import "@matechs/core/Monoid"
import "@matechs/core/NonEmptyArray"
import "@matechs/core/Option"
import "@matechs/core/Ord"
import "@matechs/core/Function"
import "@matechs/core/Prelude" // this is not shakable with webpack <= 4
import "@matechs/core/Process"
import "@matechs/core/Provider"
import "@matechs/core/Queue"
import "@matechs/core/Random"
import "@matechs/core/Readonly"
import "@matechs/core/Record"
import "@matechs/core/RecursionSchemes"
import "@matechs/core/Ref"
import "@matechs/core/Retry"
import "@matechs/core/Semaphore"
import "@matechs/core/Semigroup"
import "@matechs/core/Service"
import "@matechs/core/Set"
import "@matechs/core/Show"
import "@matechs/core/StateEither"
import "@matechs/core/Stream"
import "@matechs/core/StreamEither"
import "@matechs/core/Support"
import "@matechs/core/These"
import "@matechs/core/Ticket"
import "@matechs/core/Tree"
import "@matechs/core/Tuple"
import "@matechs/core/Utils"
```
