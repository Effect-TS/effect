import { it } from "@effect/vitest"
import { Schema } from "effect"

const Letter = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.filter((s) => s.match(/^[a-z]+$/) !== null)
  ),
  age: Schema.Int.pipe(
    Schema.between(1, 77)
  )
})

function sortLetters(letters: ReadonlyArray<Schema.Schema.Type<typeof Letter>>) {
  const clonedLetters = [...letters]
  return clonedLetters.sort((la, lb) => la.age - lb.age || la.name.codePointAt(0)! - lb.name.codePointAt(0)!)
}

it.prop(
  "day #1: should properly sort letters",
  [Schema.Array(Letter)],
  ([unsortedLetters]) => {
    const letters = sortLetters(unsortedLetters)
    for (let i = 1; i < letters.length; ++i) {
      const prev = letters[i - 1]
      const curr = letters[i]
      if (prev.age < curr.age) continue // properly ordered
      if (prev.age > curr.age) throw new Error("Invalid on age")
      if (prev.name > curr.name) throw new Error("Invalid on name")
    }
  },
  { fails: true },
  { seed: 1485455336, path: "352:3:7:9:9:13:12:11", endOnFailure: true }
)
