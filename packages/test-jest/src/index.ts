import { UnionToIntersection } from "@matechs/core/Service"
import {
  arb,
  assert,
  customRun,
  property,
  propertyM,
  provideGenerator,
  suite,
  testM,
  withEnvFilter,
  withProvider,
  withRetryPolicy,
  withSkip,
  withTimeout,
  withFinalize,
  withHook,
  withInit,
  implementMock,
  withHookP,
  withTodo
} from "@matechs/test"
import { Spec } from "@matechs/test/Def"
import { ROf, Provider } from "@matechs/test/Impl"

export const run: <Specs extends Spec<any>[]>(
  ...specs: Specs
) => (
  provider: unknown extends UnionToIntersection<
    ROf<Exclude<Specs[number], Spec<unknown>>>
  >
    ? void
    : {} extends UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>
    ? void
    : Provider<UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>>
) => void = customRun({
  describe,
  it: {
    run: it,
    skip: it.skip,
    todo: it.todo
  }
})

export {
  arb,
  assert,
  customRun,
  property,
  propertyM,
  provideGenerator,
  suite,
  testM,
  withEnvFilter,
  withProvider,
  withRetryPolicy,
  withSkip,
  withTimeout,
  withFinalize,
  withHook,
  withInit,
  implementMock,
  withHookP,
  withTodo
}

export { mockedTestM } from "./Aspects/WithJestMocks"

const exp = expect
const spyOn = jest.spyOn
const j = jest

export { exp as expect, spyOn, j as jest }
