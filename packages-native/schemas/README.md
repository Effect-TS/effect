# @effect-native/schemas

Reusable Effect Schema definitions for common data types.

## Installation

```bash
npm install @effect-native/schemas
```

## Modules

### Slug

Utilities for generating URL-safe slugs from strings.

```typescript
import { slugify, Slug, SlugBranded } from "@effect-native/schemas/Slug"

// Function
slugify("Hello World") // "hello-world"

// Schema (transforms input to slug)
import * as Schema from "effect/Schema"
Schema.decodeUnknownSync(Slug)("Hello World") // "hello-world"

// Branded Schema (transforms and brands the result)
Schema.decodeUnknownSync(SlugBranded)("Hello World") // "hello-world" as SlugBrand
```

## License

MIT
