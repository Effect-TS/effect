export interface Event {
  time: number
  description: string
}

export const a: Event = { time: -1, description: "aah" }

export const b: Event = { time: 0, description: "test" }

export const as: Chunk<Event> = Chunk(a, b)

export const eventOrd = Ord.number.contramap(({ time }: Event) => time)

export const eventEq = Equivalence.struct({
  time: Equivalence.number,
  description: Equivalence.string
})

export const eventPredicate = ({ description }: Event) => description === "test"
