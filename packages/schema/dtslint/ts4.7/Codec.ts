import { pipe } from "@fp-ts/data/Function";
import * as C from "@fp-ts/schema/Codec";

//
// Primitives
//

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

// $ExpectType Codec<"a">
C.literal("a");

// $ExpectType Codec<"a" | "b" | "c">
C.literal("a", "b", "c");

enum Fruits {
  Apple,
  Banana,
}

// $ExpectType Codec<typeof Fruits>
C.nativeEnum(Fruits);

// $ExpectType Codec<string | number>
C.union(C.string, C.number);

// $ExpectType Codec<readonly [string, number]>
C.tuple(C.string, C.number);

// $ExpectType Schema<readonly [string, number, ...boolean[]]>
pipe(C.tuple(C.string, C.number), C.withRest(C.boolean))

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

// $ExpectType Codec<{ readonly [_: string]: string; }>
C.stringIndexSignature(C.string)

// $ExpectType Codec<{ readonly [_: symbol]: string; }>
C.symbolIndexSignature(C.string)

// $ExpectType Codec<{ readonly a: string; readonly b: string; } & { readonly [_: string]: string; }>
pipe(
  C.struct({ a: C.string, b: C.string }),
  C.extend(C.stringIndexSignature(C.string))
);

// $ExpectType Codec<{ readonly a: string; readonly b: number; readonly c?: boolean | undefined; }>
C.struct({ a: C.string, b: C.number }, { c: C.boolean })

// $ExpectType Codec<Option<number>>
C.option(C.number)

// $ExpectType Codec<ReadonlySet<number>>
C.readonlySet(C.number)

// $ExpectType Codec<Chunk<number>>
C.chunk(C.number)
