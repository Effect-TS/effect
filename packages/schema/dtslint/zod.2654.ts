import * as S from "@effect/schema/Schema"

const schema1 = S.Union(S.String, S.Array(S.String))

// $ExpectType string | readonly string[]
type _Schema1 = S.Schema.Type<typeof schema1>

const schema2 = S.Struct({ name: S.Union(S.String, S.Array(S.String)) })

// $ExpectType { readonly name: string | readonly string[]; }
type _Schema2 = S.Schema.Type<typeof schema2>

const schema3 = S.Union(S.String, S.Record(S.String, S.String))

// $ExpectType string | { readonly [x: string]: string; }
type _Schema3 = S.Schema.Type<typeof schema3>

const schema4 = S.Struct({ values: S.Union(S.String, S.Record(S.String, S.String)) })

// $ExpectType { readonly values: string | { readonly [x: string]: string; }; }
type _Schema4 = S.Schema.Type<typeof schema4>
