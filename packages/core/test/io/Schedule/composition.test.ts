describe.concurrent("Schedule", () => {
  it("union composes", () =>
    Do(($) => {
      const monday = Schedule.dayOfMonth(1)
      const wednesday = Schedule.dayOfMonth(3)
      const friday = Schedule.dayOfMonth(5)
      const mondayOrWednesday = monday.union(wednesday)
      const wednesdayOrFriday = wednesday.union(friday)
      const alsoWednesday = mondayOrWednesday.intersect(wednesdayOrFriday)
      const now = $(Effect.sync(Date.now()))
      const input = Chunk(1, 2, 3, 4, 5)
      const actual = $(alsoWednesday.delays.run(now, input))
      const expected = $(wednesday.delays.run(now, input))
      assert.isTrue(actual == expected)
    }).unsafeRunPromise())
})
