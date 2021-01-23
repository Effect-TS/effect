import * as Eq from "../src/Equal"
import * as Tree from "../src/RoseTree"

const a = Tree.make("root", [Tree.make("leaf1"), Tree.make("leaf2")])
const b = Tree.make("root", [Tree.make("leaf1"), Tree.make("leaf2")])
const c = Tree.make("root", [Tree.make("leaf1"), Tree.make("leafx")])

const eqTree = Tree.getEqual(Eq.string)

it("should equal", () => {
  expect(eqTree.equals(b)(a)).toEqual(true)
})
it("should not equal", () => {
  expect(eqTree.equals(c)(a)).toEqual(false)
})
