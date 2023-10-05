import * as S from 'effect/Struct'
import { pipe } from 'effect/Function'

// $ExpectType { a: boolean; }
S.evolve({ a: 1 }, { a: x => x > 0 })

// $ExpectType { a: number; b: number; }
pipe({ a: 'a', b: 2 }, S.evolve({ a: (s) => s.length }))
