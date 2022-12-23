import { pipe } from "@fp-ts/data/Function";
import * as C from "@fp-ts/schema/Codec";

//
// Primitives
//

// $ExpectType Codec<void>
C.void;

// $ExpectType Codec<undefined>
C.undefined;

// $ExpectType StringBuilder<string>
C.string;

// $ExpectType NumberBuilder<number>
C.number;

// $ExpectType Codec<boolean>
C.boolean;

// $ExpectType Codec<bigint>
C.bigint;

// $ExpectType Codec<symbol>
C.symbol;

// $ExpectType Codec<unknown>
C.unknown;

// $ExpectType Codec<any>
C.any;

// $ExpectType Codec<object>
C.object;

//
// literals
//

// $ExpectType Codec<null>
C.literal(null);

// $ExpectType Codec<never>
C.literal();

// $ExpectType Codec<"a">
C.literal("a");

// $ExpectType Codec<"a" | "b" | "c">
C.literal("a", "b", "c");

// $ExpectType Codec<1>
C.literal(1);

// $ExpectType Codec<2n>
C.literal(2n); // bigint literal

// $ExpectType Codec<true>
C.literal(true);

//
// strings
//

// $ExpectType Codec<string>
pipe(C.string, C.minLength(1));

// $ExpectType Codec<string>
pipe(C.string, C.maxLength(10));

// $ExpectType StringBuilder<string>
C.string.length(5);

// $ExpectType StringBuilder<string>
C.string.regex(/a/);

// $ExpectType StringBuilder<string>
C.string.startsWith('a');

// $ExpectType StringBuilder<string>
C.string.endsWith('a');

// $ExpectType NumberBuilder<number>
pipe(C.number, C.lessThan(0));

// $ExpectType NumberBuilder<number>
pipe(C.number, C.lessThanOrEqualTo(0));

// $ExpectType NumberBuilder<number>
pipe(C.number, C.greaterThan(10));

// $ExpectType NumberBuilder<number>
pipe(C.number, C.greaterThanOrEqualTo(10));

// $ExpectType NumberBuilder<number>
pipe(C.number, C.int);

// $ExpectType NumberBuilder<number>
C.number.nonNaN(); // not NaN

// $ExpectType NumberBuilder<number>
C.number.finite(); // value must be finite, not Infinity or -Infinity

//
// Native enums
//

enum Fruits {
  Apple,
  Banana,
}

// $ExpectType Codec<Fruits>
C.enums(Fruits);

//
// Nullables
//

// $ExpectType Codec<string | null>
C.nullable(C.string)

//
// Unions
//

// $ExpectType Codec<string | number>
C.union(C.string, C.number);

//
// Tuples
//

// $ExpectType Codec<readonly [string, number]>
C.tuple(C.string, C.number);

// $ExpectType Codec<readonly [string, number, boolean]>
pipe(C.tuple(C.string, C.number), C.element(C.boolean))

// $ExpectType Codec<readonly [string, number, boolean?]>
pipe(C.tuple(C.string, C.number), C.optionalElement(C.boolean))

// $ExpectType Codec<readonly [string, number, ...boolean[]]>
pipe(C.tuple(C.string, C.number), C.rest(C.boolean))

//
// Arrays
//

// $ExpectType Codec<readonly number[]>
C.array(C.number);

// $ExpectType Codec<readonly [number, ...number[]]>
C.nonEmptyArray(C.number);

//
// Structs
//

// $ExpectType Codec<{ readonly a: string; readonly b: number; }>
C.struct({ a: C.string,  b: C.number });

// $ExpectType Codec<{ readonly a: string; readonly b: number; readonly c?: boolean; }>
C.struct({ a: C.string, b: C.number, c: C.optional(C.boolean) });

//
// Pick
//

// $ExpectType Codec<{ readonly a: string; }>
pipe(C.struct({ a: C.string,  b: C.number }), C.pick('a'));

//
// Omit
//

// $ExpectType Codec<{ readonly b: number; }>
pipe(C.struct({ a: C.string,  b: C.number }), C.omit('a'));

//
// Partial
//

// $ExpectType Codec<Partial<{ readonly a: string; readonly b: number; }>>
C.partial(C.struct({ a: C.string,  b: C.number }));

//
// Records
//

// $ExpectType Codec<{ readonly [x: string]: string; }>
C.record('string', C.string)

// $ExpectType Codec<{ readonly [x: symbol]: string; }>
C.record('symbol', C.string)

//
// Extend
//

// $ExpectType Codec<{ readonly a: string; readonly b: string; } & { readonly c: boolean; } & { readonly [x: string]: string; }>
pipe(
  C.struct({ a: C.string, b: C.string }),
  C.extend(C.struct({ c: C.boolean })), // <= you can add more fields
  C.extend(C.record('string', C.string)) // <= you can add more index signatures
);

//
// Option
//

// $ExpectType Codec<Option<number>>
C.option(C.number)

//
// instanceOf
//

class Test {
  constructor(readonly name: string) {}
}

// $ExpectType Codec<Test>
const TestSchema = pipe(C.object, C.instanceOf(Test));
