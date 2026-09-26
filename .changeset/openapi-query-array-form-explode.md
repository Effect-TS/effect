---
"effect": patch
"@effect/openapi-generator": patch
---

Honor `style: "form"` with `explode: false` when generating HttpClient and `httpclient-type-only` query parameters.

Array query parameters that declare `style: "form"` (or omit `style`, which defaults to `"form"`) with `explode: false` now encode each element before joining them into a single comma-separated query value, so `["red", "blue"]` is sent as `?tags=red,blue` instead of `?tags=red&tags=blue`. The generated method still accepts the same array, readonly array, element, and enum argument types.

`OpenAPISpecParameter` gains optional `style` and `explode` fields so specifications can carry the serialization metadata. Parameter serialization metadata is preserved from referenced parameters and path-level declarations, with operation-level declarations taking precedence.

This corrects only top-level query arrays with `style: "form"` and `explode: false` whose items are scalar values. Explicit `explode: true`, the default exploded query array, other delimiter styles (`spaceDelimited`, `pipeDelimited`, `deepObject`), object-valued parameters, and non-query locations keep their existing behavior.

Scalar arrays work regardless of whether their schema uses references, unions, intersections, enums, tuples or OpenAPI 3.1 type arrays. Nullable arrays preserve the existing null serialization instead of producing invalid TypeScript or throwing at runtime. Non-array values and arrays containing objects or nested arrays retain the existing serialization behavior.

Array separators stay distinct from encoded commas in elements: `["a,b", "c"]` produces `?tags=a%2Cb,c`. `Url.make` preserves the raw query already present in a URL when appending structured parameters, so subsequent client transformations do not collapse those separators into data commas.

`UrlParams.fromInput` accepts an optional `{ arrayFormat: "comma" }` option, while its default remains repeated parameters. Encoded array values stay in the structured parameter collection, so inspection, replacement, removal and client middleware continue to work. Generated CSV clients require the accompanying updated `effect` runtime.
