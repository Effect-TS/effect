import { pipe } from "@fp-ts/data/Function";
import * as C from "@fp-ts/schema/Codec";
import * as S from "@fp-ts/schema/Schema";

//
// Primitives
//

// $ExpectType Codec<void>
C.void;

// $ExpectType Codec<undefined>
C.undefined;

// $ExpectType Codec<string>
C.string;

// $ExpectType Codec<number>
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

//
// Validations
//

// $ExpectType Codec<string>
pipe(C.string, C.minLength(1));

// $ExpectType Codec<string>
pipe(C.string, C.maxLength(10));

// $ExpectType Codec<number>
pipe(C.number, C.lessThan(0));

// $ExpectType Codec<number>
pipe(C.number, C.lessThanOrEqualTo(0));

// $ExpectType Codec<number>
pipe(C.number, C.greaterThan(10));

// $ExpectType Codec<number>
pipe(C.number, C.greaterThanOrEqualTo(10));

// $ExpectType Codec<number>
pipe(C.number, C.int);

//
// Constructors
//

// $ExpectType Codec<never>
C.literal();

// $ExpectType Codec<"a">
C.literal("a");

// $ExpectType Codec<"a" | "b" | "c">
C.literal("a", "b", "c");

enum Fruits {
  Apple,
  Banana,
}

// $ExpectType Codec<Fruits>
C.enums(Fruits);

// $ExpectType Codec<string | number>
C.union(C.string, C.number);

// $ExpectType Codec<readonly [string, number]>
C.tuple(C.string, C.number);

// $ExpectType Codec<readonly [string, number, boolean]>
pipe(C.tuple(C.string, C.number), C.element(C.boolean))

// $ExpectType Codec<readonly [string, number, boolean?]>
pipe(C.tuple(C.string, C.number), C.optionalElement(C.boolean))

// $ExpectType Codec<readonly [string, number, ...boolean[]]>
pipe(C.tuple(C.string, C.number), C.rest(C.boolean))

// $ExpectType Codec<readonly number[]>
C.array(C.number);

// $ExpectType Codec<readonly [number, ...number[]]>
C.nonEmptyArray(C.number);

// $ExpectType Codec<{ readonly a: string; readonly b: number; }>
C.struct({ a: C.string,  b: C.number });

// $ExpectType Codec<{ readonly a: string; }>
pipe(C.struct({ a: C.string,  b: C.number }), C.pick('a'));

// $ExpectType Codec<{ readonly b: number; }>
pipe(C.struct({ a: C.string,  b: C.number }), C.omit('a'));

// $ExpectType Codec<Partial<{ readonly a: string; readonly b: number; }>>
C.partial(C.struct({ a: C.string,  b: C.number }));

// $ExpectType Codec<{ readonly [x: string]: string; }>
C.stringIndexSignature(C.string)

// $ExpectType Codec<{ readonly [x: symbol]: string; }>
C.symbolIndexSignature(C.string)

// $ExpectType Codec<{ readonly a: string; readonly b: string; } & { readonly [x: string]: string; }>
pipe(
  C.struct({ a: C.string, b: C.string }),
  C.extend(C.stringIndexSignature(C.string))
);

// $ExpectType Codec<{ readonly a: string; readonly b: number; readonly c?: boolean; }>
C.struct({ a: C.string, b: C.number, c: C.optional(C.boolean) })

// $ExpectType Codec<Option<number>>
C.option(C.number)
