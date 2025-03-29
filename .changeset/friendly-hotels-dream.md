---
"effect": minor
---

Simplified the creation of `Right` `Left` with broader types.
It can be useful, for example, in such cases:

```ts
const moveAll = (moves: Iterable<Move.Move>) => (game: Game) =>
  Array.reduce(
    moves,
    // Either.right(game) as Either.Either<Game, MoveError>
    Either.right<Game, MoveError>(game),
    (gameState, currentMove) =>
      gameState.pipe(Either.flatMap(move(currentMove)))
  )
```
