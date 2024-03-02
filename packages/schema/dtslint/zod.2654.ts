import * as S from "@effect/schema/Schema"

const schema1 = S.union(S.string, S.array(S.string))

// $ExpectType string | readonly string[]
type _Schema1 = S.Schema.Type<typeof schema1>

const schema2 = S.struct({ name: S.union(S.string, S.array(S.string)) })

// $ExpectType { readonly name: string | readonly string[]; }
type _Schema2 = S.Schema.Type<typeof schema2>

const schema3 = S.union(S.string, S.record(S.string, S.string))

// $ExpectType string | { readonly [x: string]: string; }
type _Schema3 = S.Schema.Type<typeof schema3>

const schema4 = S.struct({ values: S.union(S.string, S.record(S.string, S.string)) })

// $ExpectType { readonly values: string | { readonly [x: string]: string; }; }
type _Schema4 = S.Schema.Type<typeof schema4>
