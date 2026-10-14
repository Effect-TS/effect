// Measures 100 Author/Book selection pairs declared as Schema.Struct consts with interfaces extending their Type.
import * as Schema from "effect/Schema"

Schema.String

export const Author001 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author001 extends Schema.Struct.Type<typeof Author001.fields> {}

export const Book001 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author001),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book001 extends Schema.Struct.Type<typeof Book001.fields> {}

export const decodeBook001 = Schema.decodeUnknownEffect(Book001)
export const readBook001 = (book: typeof Book001.Type) => book.author?.name ?? book.title

export const Author002 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author002 extends Schema.Struct.Type<typeof Author002.fields> {}

export const Book002 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author002),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book002 extends Schema.Struct.Type<typeof Book002.fields> {}

export const decodeBook002 = Schema.decodeUnknownEffect(Book002)
export const readBook002 = (book: typeof Book002.Type) => book.author?.name ?? book.title

export const Author003 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author003 extends Schema.Struct.Type<typeof Author003.fields> {}

export const Book003 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author003),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book003 extends Schema.Struct.Type<typeof Book003.fields> {}

export const decodeBook003 = Schema.decodeUnknownEffect(Book003)
export const readBook003 = (book: typeof Book003.Type) => book.author?.name ?? book.title

export const Author004 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author004 extends Schema.Struct.Type<typeof Author004.fields> {}

export const Book004 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author004),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book004 extends Schema.Struct.Type<typeof Book004.fields> {}

export const decodeBook004 = Schema.decodeUnknownEffect(Book004)
export const readBook004 = (book: typeof Book004.Type) => book.author?.name ?? book.title

export const Author005 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author005 extends Schema.Struct.Type<typeof Author005.fields> {}

export const Book005 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author005),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book005 extends Schema.Struct.Type<typeof Book005.fields> {}

export const decodeBook005 = Schema.decodeUnknownEffect(Book005)
export const readBook005 = (book: typeof Book005.Type) => book.author?.name ?? book.title

export const Author006 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author006 extends Schema.Struct.Type<typeof Author006.fields> {}

export const Book006 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author006),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book006 extends Schema.Struct.Type<typeof Book006.fields> {}

export const decodeBook006 = Schema.decodeUnknownEffect(Book006)
export const readBook006 = (book: typeof Book006.Type) => book.author?.name ?? book.title

export const Author007 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author007 extends Schema.Struct.Type<typeof Author007.fields> {}

export const Book007 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author007),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book007 extends Schema.Struct.Type<typeof Book007.fields> {}

export const decodeBook007 = Schema.decodeUnknownEffect(Book007)
export const readBook007 = (book: typeof Book007.Type) => book.author?.name ?? book.title

export const Author008 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author008 extends Schema.Struct.Type<typeof Author008.fields> {}

export const Book008 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author008),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book008 extends Schema.Struct.Type<typeof Book008.fields> {}

export const decodeBook008 = Schema.decodeUnknownEffect(Book008)
export const readBook008 = (book: typeof Book008.Type) => book.author?.name ?? book.title

export const Author009 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author009 extends Schema.Struct.Type<typeof Author009.fields> {}

export const Book009 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author009),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book009 extends Schema.Struct.Type<typeof Book009.fields> {}

export const decodeBook009 = Schema.decodeUnknownEffect(Book009)
export const readBook009 = (book: typeof Book009.Type) => book.author?.name ?? book.title

export const Author010 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author010 extends Schema.Struct.Type<typeof Author010.fields> {}

export const Book010 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author010),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book010 extends Schema.Struct.Type<typeof Book010.fields> {}

export const decodeBook010 = Schema.decodeUnknownEffect(Book010)
export const readBook010 = (book: typeof Book010.Type) => book.author?.name ?? book.title

export const Author011 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author011 extends Schema.Struct.Type<typeof Author011.fields> {}

export const Book011 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author011),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book011 extends Schema.Struct.Type<typeof Book011.fields> {}

export const decodeBook011 = Schema.decodeUnknownEffect(Book011)
export const readBook011 = (book: typeof Book011.Type) => book.author?.name ?? book.title

export const Author012 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author012 extends Schema.Struct.Type<typeof Author012.fields> {}

export const Book012 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author012),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book012 extends Schema.Struct.Type<typeof Book012.fields> {}

export const decodeBook012 = Schema.decodeUnknownEffect(Book012)
export const readBook012 = (book: typeof Book012.Type) => book.author?.name ?? book.title

export const Author013 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author013 extends Schema.Struct.Type<typeof Author013.fields> {}

export const Book013 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author013),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book013 extends Schema.Struct.Type<typeof Book013.fields> {}

export const decodeBook013 = Schema.decodeUnknownEffect(Book013)
export const readBook013 = (book: typeof Book013.Type) => book.author?.name ?? book.title

export const Author014 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author014 extends Schema.Struct.Type<typeof Author014.fields> {}

export const Book014 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author014),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book014 extends Schema.Struct.Type<typeof Book014.fields> {}

export const decodeBook014 = Schema.decodeUnknownEffect(Book014)
export const readBook014 = (book: typeof Book014.Type) => book.author?.name ?? book.title

export const Author015 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author015 extends Schema.Struct.Type<typeof Author015.fields> {}

export const Book015 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author015),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book015 extends Schema.Struct.Type<typeof Book015.fields> {}

export const decodeBook015 = Schema.decodeUnknownEffect(Book015)
export const readBook015 = (book: typeof Book015.Type) => book.author?.name ?? book.title

export const Author016 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author016 extends Schema.Struct.Type<typeof Author016.fields> {}

export const Book016 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author016),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book016 extends Schema.Struct.Type<typeof Book016.fields> {}

export const decodeBook016 = Schema.decodeUnknownEffect(Book016)
export const readBook016 = (book: typeof Book016.Type) => book.author?.name ?? book.title

export const Author017 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author017 extends Schema.Struct.Type<typeof Author017.fields> {}

export const Book017 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author017),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book017 extends Schema.Struct.Type<typeof Book017.fields> {}

export const decodeBook017 = Schema.decodeUnknownEffect(Book017)
export const readBook017 = (book: typeof Book017.Type) => book.author?.name ?? book.title

export const Author018 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author018 extends Schema.Struct.Type<typeof Author018.fields> {}

export const Book018 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author018),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book018 extends Schema.Struct.Type<typeof Book018.fields> {}

export const decodeBook018 = Schema.decodeUnknownEffect(Book018)
export const readBook018 = (book: typeof Book018.Type) => book.author?.name ?? book.title

export const Author019 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author019 extends Schema.Struct.Type<typeof Author019.fields> {}

export const Book019 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author019),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book019 extends Schema.Struct.Type<typeof Book019.fields> {}

export const decodeBook019 = Schema.decodeUnknownEffect(Book019)
export const readBook019 = (book: typeof Book019.Type) => book.author?.name ?? book.title

export const Author020 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author020 extends Schema.Struct.Type<typeof Author020.fields> {}

export const Book020 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author020),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book020 extends Schema.Struct.Type<typeof Book020.fields> {}

export const decodeBook020 = Schema.decodeUnknownEffect(Book020)
export const readBook020 = (book: typeof Book020.Type) => book.author?.name ?? book.title

export const Author021 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author021 extends Schema.Struct.Type<typeof Author021.fields> {}

export const Book021 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author021),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book021 extends Schema.Struct.Type<typeof Book021.fields> {}

export const decodeBook021 = Schema.decodeUnknownEffect(Book021)
export const readBook021 = (book: typeof Book021.Type) => book.author?.name ?? book.title

export const Author022 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author022 extends Schema.Struct.Type<typeof Author022.fields> {}

export const Book022 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author022),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book022 extends Schema.Struct.Type<typeof Book022.fields> {}

export const decodeBook022 = Schema.decodeUnknownEffect(Book022)
export const readBook022 = (book: typeof Book022.Type) => book.author?.name ?? book.title

export const Author023 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author023 extends Schema.Struct.Type<typeof Author023.fields> {}

export const Book023 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author023),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book023 extends Schema.Struct.Type<typeof Book023.fields> {}

export const decodeBook023 = Schema.decodeUnknownEffect(Book023)
export const readBook023 = (book: typeof Book023.Type) => book.author?.name ?? book.title

export const Author024 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author024 extends Schema.Struct.Type<typeof Author024.fields> {}

export const Book024 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author024),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book024 extends Schema.Struct.Type<typeof Book024.fields> {}

export const decodeBook024 = Schema.decodeUnknownEffect(Book024)
export const readBook024 = (book: typeof Book024.Type) => book.author?.name ?? book.title

export const Author025 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author025 extends Schema.Struct.Type<typeof Author025.fields> {}

export const Book025 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author025),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book025 extends Schema.Struct.Type<typeof Book025.fields> {}

export const decodeBook025 = Schema.decodeUnknownEffect(Book025)
export const readBook025 = (book: typeof Book025.Type) => book.author?.name ?? book.title

export const Author026 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author026 extends Schema.Struct.Type<typeof Author026.fields> {}

export const Book026 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author026),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book026 extends Schema.Struct.Type<typeof Book026.fields> {}

export const decodeBook026 = Schema.decodeUnknownEffect(Book026)
export const readBook026 = (book: typeof Book026.Type) => book.author?.name ?? book.title

export const Author027 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author027 extends Schema.Struct.Type<typeof Author027.fields> {}

export const Book027 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author027),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book027 extends Schema.Struct.Type<typeof Book027.fields> {}

export const decodeBook027 = Schema.decodeUnknownEffect(Book027)
export const readBook027 = (book: typeof Book027.Type) => book.author?.name ?? book.title

export const Author028 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author028 extends Schema.Struct.Type<typeof Author028.fields> {}

export const Book028 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author028),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book028 extends Schema.Struct.Type<typeof Book028.fields> {}

export const decodeBook028 = Schema.decodeUnknownEffect(Book028)
export const readBook028 = (book: typeof Book028.Type) => book.author?.name ?? book.title

export const Author029 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author029 extends Schema.Struct.Type<typeof Author029.fields> {}

export const Book029 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author029),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book029 extends Schema.Struct.Type<typeof Book029.fields> {}

export const decodeBook029 = Schema.decodeUnknownEffect(Book029)
export const readBook029 = (book: typeof Book029.Type) => book.author?.name ?? book.title

export const Author030 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author030 extends Schema.Struct.Type<typeof Author030.fields> {}

export const Book030 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author030),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book030 extends Schema.Struct.Type<typeof Book030.fields> {}

export const decodeBook030 = Schema.decodeUnknownEffect(Book030)
export const readBook030 = (book: typeof Book030.Type) => book.author?.name ?? book.title

export const Author031 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author031 extends Schema.Struct.Type<typeof Author031.fields> {}

export const Book031 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author031),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book031 extends Schema.Struct.Type<typeof Book031.fields> {}

export const decodeBook031 = Schema.decodeUnknownEffect(Book031)
export const readBook031 = (book: typeof Book031.Type) => book.author?.name ?? book.title

export const Author032 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author032 extends Schema.Struct.Type<typeof Author032.fields> {}

export const Book032 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author032),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book032 extends Schema.Struct.Type<typeof Book032.fields> {}

export const decodeBook032 = Schema.decodeUnknownEffect(Book032)
export const readBook032 = (book: typeof Book032.Type) => book.author?.name ?? book.title

export const Author033 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author033 extends Schema.Struct.Type<typeof Author033.fields> {}

export const Book033 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author033),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book033 extends Schema.Struct.Type<typeof Book033.fields> {}

export const decodeBook033 = Schema.decodeUnknownEffect(Book033)
export const readBook033 = (book: typeof Book033.Type) => book.author?.name ?? book.title

export const Author034 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author034 extends Schema.Struct.Type<typeof Author034.fields> {}

export const Book034 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author034),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book034 extends Schema.Struct.Type<typeof Book034.fields> {}

export const decodeBook034 = Schema.decodeUnknownEffect(Book034)
export const readBook034 = (book: typeof Book034.Type) => book.author?.name ?? book.title

export const Author035 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author035 extends Schema.Struct.Type<typeof Author035.fields> {}

export const Book035 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author035),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book035 extends Schema.Struct.Type<typeof Book035.fields> {}

export const decodeBook035 = Schema.decodeUnknownEffect(Book035)
export const readBook035 = (book: typeof Book035.Type) => book.author?.name ?? book.title

export const Author036 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author036 extends Schema.Struct.Type<typeof Author036.fields> {}

export const Book036 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author036),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book036 extends Schema.Struct.Type<typeof Book036.fields> {}

export const decodeBook036 = Schema.decodeUnknownEffect(Book036)
export const readBook036 = (book: typeof Book036.Type) => book.author?.name ?? book.title

export const Author037 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author037 extends Schema.Struct.Type<typeof Author037.fields> {}

export const Book037 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author037),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book037 extends Schema.Struct.Type<typeof Book037.fields> {}

export const decodeBook037 = Schema.decodeUnknownEffect(Book037)
export const readBook037 = (book: typeof Book037.Type) => book.author?.name ?? book.title

export const Author038 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author038 extends Schema.Struct.Type<typeof Author038.fields> {}

export const Book038 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author038),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book038 extends Schema.Struct.Type<typeof Book038.fields> {}

export const decodeBook038 = Schema.decodeUnknownEffect(Book038)
export const readBook038 = (book: typeof Book038.Type) => book.author?.name ?? book.title

export const Author039 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author039 extends Schema.Struct.Type<typeof Author039.fields> {}

export const Book039 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author039),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book039 extends Schema.Struct.Type<typeof Book039.fields> {}

export const decodeBook039 = Schema.decodeUnknownEffect(Book039)
export const readBook039 = (book: typeof Book039.Type) => book.author?.name ?? book.title

export const Author040 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author040 extends Schema.Struct.Type<typeof Author040.fields> {}

export const Book040 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author040),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book040 extends Schema.Struct.Type<typeof Book040.fields> {}

export const decodeBook040 = Schema.decodeUnknownEffect(Book040)
export const readBook040 = (book: typeof Book040.Type) => book.author?.name ?? book.title

export const Author041 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author041 extends Schema.Struct.Type<typeof Author041.fields> {}

export const Book041 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author041),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book041 extends Schema.Struct.Type<typeof Book041.fields> {}

export const decodeBook041 = Schema.decodeUnknownEffect(Book041)
export const readBook041 = (book: typeof Book041.Type) => book.author?.name ?? book.title

export const Author042 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author042 extends Schema.Struct.Type<typeof Author042.fields> {}

export const Book042 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author042),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book042 extends Schema.Struct.Type<typeof Book042.fields> {}

export const decodeBook042 = Schema.decodeUnknownEffect(Book042)
export const readBook042 = (book: typeof Book042.Type) => book.author?.name ?? book.title

export const Author043 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author043 extends Schema.Struct.Type<typeof Author043.fields> {}

export const Book043 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author043),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book043 extends Schema.Struct.Type<typeof Book043.fields> {}

export const decodeBook043 = Schema.decodeUnknownEffect(Book043)
export const readBook043 = (book: typeof Book043.Type) => book.author?.name ?? book.title

export const Author044 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author044 extends Schema.Struct.Type<typeof Author044.fields> {}

export const Book044 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author044),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book044 extends Schema.Struct.Type<typeof Book044.fields> {}

export const decodeBook044 = Schema.decodeUnknownEffect(Book044)
export const readBook044 = (book: typeof Book044.Type) => book.author?.name ?? book.title

export const Author045 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author045 extends Schema.Struct.Type<typeof Author045.fields> {}

export const Book045 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author045),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book045 extends Schema.Struct.Type<typeof Book045.fields> {}

export const decodeBook045 = Schema.decodeUnknownEffect(Book045)
export const readBook045 = (book: typeof Book045.Type) => book.author?.name ?? book.title

export const Author046 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author046 extends Schema.Struct.Type<typeof Author046.fields> {}

export const Book046 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author046),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book046 extends Schema.Struct.Type<typeof Book046.fields> {}

export const decodeBook046 = Schema.decodeUnknownEffect(Book046)
export const readBook046 = (book: typeof Book046.Type) => book.author?.name ?? book.title

export const Author047 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author047 extends Schema.Struct.Type<typeof Author047.fields> {}

export const Book047 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author047),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book047 extends Schema.Struct.Type<typeof Book047.fields> {}

export const decodeBook047 = Schema.decodeUnknownEffect(Book047)
export const readBook047 = (book: typeof Book047.Type) => book.author?.name ?? book.title

export const Author048 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author048 extends Schema.Struct.Type<typeof Author048.fields> {}

export const Book048 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author048),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book048 extends Schema.Struct.Type<typeof Book048.fields> {}

export const decodeBook048 = Schema.decodeUnknownEffect(Book048)
export const readBook048 = (book: typeof Book048.Type) => book.author?.name ?? book.title

export const Author049 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author049 extends Schema.Struct.Type<typeof Author049.fields> {}

export const Book049 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author049),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book049 extends Schema.Struct.Type<typeof Book049.fields> {}

export const decodeBook049 = Schema.decodeUnknownEffect(Book049)
export const readBook049 = (book: typeof Book049.Type) => book.author?.name ?? book.title

export const Author050 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author050 extends Schema.Struct.Type<typeof Author050.fields> {}

export const Book050 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author050),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book050 extends Schema.Struct.Type<typeof Book050.fields> {}

export const decodeBook050 = Schema.decodeUnknownEffect(Book050)
export const readBook050 = (book: typeof Book050.Type) => book.author?.name ?? book.title

export const Author051 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author051 extends Schema.Struct.Type<typeof Author051.fields> {}

export const Book051 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author051),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book051 extends Schema.Struct.Type<typeof Book051.fields> {}

export const decodeBook051 = Schema.decodeUnknownEffect(Book051)
export const readBook051 = (book: typeof Book051.Type) => book.author?.name ?? book.title

export const Author052 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author052 extends Schema.Struct.Type<typeof Author052.fields> {}

export const Book052 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author052),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book052 extends Schema.Struct.Type<typeof Book052.fields> {}

export const decodeBook052 = Schema.decodeUnknownEffect(Book052)
export const readBook052 = (book: typeof Book052.Type) => book.author?.name ?? book.title

export const Author053 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author053 extends Schema.Struct.Type<typeof Author053.fields> {}

export const Book053 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author053),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book053 extends Schema.Struct.Type<typeof Book053.fields> {}

export const decodeBook053 = Schema.decodeUnknownEffect(Book053)
export const readBook053 = (book: typeof Book053.Type) => book.author?.name ?? book.title

export const Author054 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author054 extends Schema.Struct.Type<typeof Author054.fields> {}

export const Book054 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author054),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book054 extends Schema.Struct.Type<typeof Book054.fields> {}

export const decodeBook054 = Schema.decodeUnknownEffect(Book054)
export const readBook054 = (book: typeof Book054.Type) => book.author?.name ?? book.title

export const Author055 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author055 extends Schema.Struct.Type<typeof Author055.fields> {}

export const Book055 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author055),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book055 extends Schema.Struct.Type<typeof Book055.fields> {}

export const decodeBook055 = Schema.decodeUnknownEffect(Book055)
export const readBook055 = (book: typeof Book055.Type) => book.author?.name ?? book.title

export const Author056 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author056 extends Schema.Struct.Type<typeof Author056.fields> {}

export const Book056 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author056),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book056 extends Schema.Struct.Type<typeof Book056.fields> {}

export const decodeBook056 = Schema.decodeUnknownEffect(Book056)
export const readBook056 = (book: typeof Book056.Type) => book.author?.name ?? book.title

export const Author057 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author057 extends Schema.Struct.Type<typeof Author057.fields> {}

export const Book057 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author057),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book057 extends Schema.Struct.Type<typeof Book057.fields> {}

export const decodeBook057 = Schema.decodeUnknownEffect(Book057)
export const readBook057 = (book: typeof Book057.Type) => book.author?.name ?? book.title

export const Author058 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author058 extends Schema.Struct.Type<typeof Author058.fields> {}

export const Book058 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author058),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book058 extends Schema.Struct.Type<typeof Book058.fields> {}

export const decodeBook058 = Schema.decodeUnknownEffect(Book058)
export const readBook058 = (book: typeof Book058.Type) => book.author?.name ?? book.title

export const Author059 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author059 extends Schema.Struct.Type<typeof Author059.fields> {}

export const Book059 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author059),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book059 extends Schema.Struct.Type<typeof Book059.fields> {}

export const decodeBook059 = Schema.decodeUnknownEffect(Book059)
export const readBook059 = (book: typeof Book059.Type) => book.author?.name ?? book.title

export const Author060 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author060 extends Schema.Struct.Type<typeof Author060.fields> {}

export const Book060 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author060),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book060 extends Schema.Struct.Type<typeof Book060.fields> {}

export const decodeBook060 = Schema.decodeUnknownEffect(Book060)
export const readBook060 = (book: typeof Book060.Type) => book.author?.name ?? book.title

export const Author061 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author061 extends Schema.Struct.Type<typeof Author061.fields> {}

export const Book061 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author061),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book061 extends Schema.Struct.Type<typeof Book061.fields> {}

export const decodeBook061 = Schema.decodeUnknownEffect(Book061)
export const readBook061 = (book: typeof Book061.Type) => book.author?.name ?? book.title

export const Author062 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author062 extends Schema.Struct.Type<typeof Author062.fields> {}

export const Book062 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author062),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book062 extends Schema.Struct.Type<typeof Book062.fields> {}

export const decodeBook062 = Schema.decodeUnknownEffect(Book062)
export const readBook062 = (book: typeof Book062.Type) => book.author?.name ?? book.title

export const Author063 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author063 extends Schema.Struct.Type<typeof Author063.fields> {}

export const Book063 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author063),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book063 extends Schema.Struct.Type<typeof Book063.fields> {}

export const decodeBook063 = Schema.decodeUnknownEffect(Book063)
export const readBook063 = (book: typeof Book063.Type) => book.author?.name ?? book.title

export const Author064 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author064 extends Schema.Struct.Type<typeof Author064.fields> {}

export const Book064 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author064),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book064 extends Schema.Struct.Type<typeof Book064.fields> {}

export const decodeBook064 = Schema.decodeUnknownEffect(Book064)
export const readBook064 = (book: typeof Book064.Type) => book.author?.name ?? book.title

export const Author065 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author065 extends Schema.Struct.Type<typeof Author065.fields> {}

export const Book065 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author065),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book065 extends Schema.Struct.Type<typeof Book065.fields> {}

export const decodeBook065 = Schema.decodeUnknownEffect(Book065)
export const readBook065 = (book: typeof Book065.Type) => book.author?.name ?? book.title

export const Author066 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author066 extends Schema.Struct.Type<typeof Author066.fields> {}

export const Book066 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author066),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book066 extends Schema.Struct.Type<typeof Book066.fields> {}

export const decodeBook066 = Schema.decodeUnknownEffect(Book066)
export const readBook066 = (book: typeof Book066.Type) => book.author?.name ?? book.title

export const Author067 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author067 extends Schema.Struct.Type<typeof Author067.fields> {}

export const Book067 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author067),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book067 extends Schema.Struct.Type<typeof Book067.fields> {}

export const decodeBook067 = Schema.decodeUnknownEffect(Book067)
export const readBook067 = (book: typeof Book067.Type) => book.author?.name ?? book.title

export const Author068 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author068 extends Schema.Struct.Type<typeof Author068.fields> {}

export const Book068 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author068),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book068 extends Schema.Struct.Type<typeof Book068.fields> {}

export const decodeBook068 = Schema.decodeUnknownEffect(Book068)
export const readBook068 = (book: typeof Book068.Type) => book.author?.name ?? book.title

export const Author069 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author069 extends Schema.Struct.Type<typeof Author069.fields> {}

export const Book069 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author069),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book069 extends Schema.Struct.Type<typeof Book069.fields> {}

export const decodeBook069 = Schema.decodeUnknownEffect(Book069)
export const readBook069 = (book: typeof Book069.Type) => book.author?.name ?? book.title

export const Author070 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author070 extends Schema.Struct.Type<typeof Author070.fields> {}

export const Book070 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author070),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book070 extends Schema.Struct.Type<typeof Book070.fields> {}

export const decodeBook070 = Schema.decodeUnknownEffect(Book070)
export const readBook070 = (book: typeof Book070.Type) => book.author?.name ?? book.title

export const Author071 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author071 extends Schema.Struct.Type<typeof Author071.fields> {}

export const Book071 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author071),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book071 extends Schema.Struct.Type<typeof Book071.fields> {}

export const decodeBook071 = Schema.decodeUnknownEffect(Book071)
export const readBook071 = (book: typeof Book071.Type) => book.author?.name ?? book.title

export const Author072 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author072 extends Schema.Struct.Type<typeof Author072.fields> {}

export const Book072 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author072),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book072 extends Schema.Struct.Type<typeof Book072.fields> {}

export const decodeBook072 = Schema.decodeUnknownEffect(Book072)
export const readBook072 = (book: typeof Book072.Type) => book.author?.name ?? book.title

export const Author073 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author073 extends Schema.Struct.Type<typeof Author073.fields> {}

export const Book073 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author073),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book073 extends Schema.Struct.Type<typeof Book073.fields> {}

export const decodeBook073 = Schema.decodeUnknownEffect(Book073)
export const readBook073 = (book: typeof Book073.Type) => book.author?.name ?? book.title

export const Author074 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author074 extends Schema.Struct.Type<typeof Author074.fields> {}

export const Book074 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author074),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book074 extends Schema.Struct.Type<typeof Book074.fields> {}

export const decodeBook074 = Schema.decodeUnknownEffect(Book074)
export const readBook074 = (book: typeof Book074.Type) => book.author?.name ?? book.title

export const Author075 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author075 extends Schema.Struct.Type<typeof Author075.fields> {}

export const Book075 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author075),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book075 extends Schema.Struct.Type<typeof Book075.fields> {}

export const decodeBook075 = Schema.decodeUnknownEffect(Book075)
export const readBook075 = (book: typeof Book075.Type) => book.author?.name ?? book.title

export const Author076 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author076 extends Schema.Struct.Type<typeof Author076.fields> {}

export const Book076 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author076),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book076 extends Schema.Struct.Type<typeof Book076.fields> {}

export const decodeBook076 = Schema.decodeUnknownEffect(Book076)
export const readBook076 = (book: typeof Book076.Type) => book.author?.name ?? book.title

export const Author077 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author077 extends Schema.Struct.Type<typeof Author077.fields> {}

export const Book077 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author077),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book077 extends Schema.Struct.Type<typeof Book077.fields> {}

export const decodeBook077 = Schema.decodeUnknownEffect(Book077)
export const readBook077 = (book: typeof Book077.Type) => book.author?.name ?? book.title

export const Author078 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author078 extends Schema.Struct.Type<typeof Author078.fields> {}

export const Book078 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author078),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book078 extends Schema.Struct.Type<typeof Book078.fields> {}

export const decodeBook078 = Schema.decodeUnknownEffect(Book078)
export const readBook078 = (book: typeof Book078.Type) => book.author?.name ?? book.title

export const Author079 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author079 extends Schema.Struct.Type<typeof Author079.fields> {}

export const Book079 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author079),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book079 extends Schema.Struct.Type<typeof Book079.fields> {}

export const decodeBook079 = Schema.decodeUnknownEffect(Book079)
export const readBook079 = (book: typeof Book079.Type) => book.author?.name ?? book.title

export const Author080 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author080 extends Schema.Struct.Type<typeof Author080.fields> {}

export const Book080 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author080),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book080 extends Schema.Struct.Type<typeof Book080.fields> {}

export const decodeBook080 = Schema.decodeUnknownEffect(Book080)
export const readBook080 = (book: typeof Book080.Type) => book.author?.name ?? book.title

export const Author081 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author081 extends Schema.Struct.Type<typeof Author081.fields> {}

export const Book081 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author081),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book081 extends Schema.Struct.Type<typeof Book081.fields> {}

export const decodeBook081 = Schema.decodeUnknownEffect(Book081)
export const readBook081 = (book: typeof Book081.Type) => book.author?.name ?? book.title

export const Author082 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author082 extends Schema.Struct.Type<typeof Author082.fields> {}

export const Book082 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author082),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book082 extends Schema.Struct.Type<typeof Book082.fields> {}

export const decodeBook082 = Schema.decodeUnknownEffect(Book082)
export const readBook082 = (book: typeof Book082.Type) => book.author?.name ?? book.title

export const Author083 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author083 extends Schema.Struct.Type<typeof Author083.fields> {}

export const Book083 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author083),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book083 extends Schema.Struct.Type<typeof Book083.fields> {}

export const decodeBook083 = Schema.decodeUnknownEffect(Book083)
export const readBook083 = (book: typeof Book083.Type) => book.author?.name ?? book.title

export const Author084 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author084 extends Schema.Struct.Type<typeof Author084.fields> {}

export const Book084 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author084),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book084 extends Schema.Struct.Type<typeof Book084.fields> {}

export const decodeBook084 = Schema.decodeUnknownEffect(Book084)
export const readBook084 = (book: typeof Book084.Type) => book.author?.name ?? book.title

export const Author085 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author085 extends Schema.Struct.Type<typeof Author085.fields> {}

export const Book085 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author085),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book085 extends Schema.Struct.Type<typeof Book085.fields> {}

export const decodeBook085 = Schema.decodeUnknownEffect(Book085)
export const readBook085 = (book: typeof Book085.Type) => book.author?.name ?? book.title

export const Author086 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author086 extends Schema.Struct.Type<typeof Author086.fields> {}

export const Book086 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author086),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book086 extends Schema.Struct.Type<typeof Book086.fields> {}

export const decodeBook086 = Schema.decodeUnknownEffect(Book086)
export const readBook086 = (book: typeof Book086.Type) => book.author?.name ?? book.title

export const Author087 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author087 extends Schema.Struct.Type<typeof Author087.fields> {}

export const Book087 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author087),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book087 extends Schema.Struct.Type<typeof Book087.fields> {}

export const decodeBook087 = Schema.decodeUnknownEffect(Book087)
export const readBook087 = (book: typeof Book087.Type) => book.author?.name ?? book.title

export const Author088 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author088 extends Schema.Struct.Type<typeof Author088.fields> {}

export const Book088 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author088),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book088 extends Schema.Struct.Type<typeof Book088.fields> {}

export const decodeBook088 = Schema.decodeUnknownEffect(Book088)
export const readBook088 = (book: typeof Book088.Type) => book.author?.name ?? book.title

export const Author089 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author089 extends Schema.Struct.Type<typeof Author089.fields> {}

export const Book089 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author089),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book089 extends Schema.Struct.Type<typeof Book089.fields> {}

export const decodeBook089 = Schema.decodeUnknownEffect(Book089)
export const readBook089 = (book: typeof Book089.Type) => book.author?.name ?? book.title

export const Author090 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author090 extends Schema.Struct.Type<typeof Author090.fields> {}

export const Book090 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author090),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book090 extends Schema.Struct.Type<typeof Book090.fields> {}

export const decodeBook090 = Schema.decodeUnknownEffect(Book090)
export const readBook090 = (book: typeof Book090.Type) => book.author?.name ?? book.title

export const Author091 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author091 extends Schema.Struct.Type<typeof Author091.fields> {}

export const Book091 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author091),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book091 extends Schema.Struct.Type<typeof Book091.fields> {}

export const decodeBook091 = Schema.decodeUnknownEffect(Book091)
export const readBook091 = (book: typeof Book091.Type) => book.author?.name ?? book.title

export const Author092 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author092 extends Schema.Struct.Type<typeof Author092.fields> {}

export const Book092 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author092),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book092 extends Schema.Struct.Type<typeof Book092.fields> {}

export const decodeBook092 = Schema.decodeUnknownEffect(Book092)
export const readBook092 = (book: typeof Book092.Type) => book.author?.name ?? book.title

export const Author093 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author093 extends Schema.Struct.Type<typeof Author093.fields> {}

export const Book093 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author093),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book093 extends Schema.Struct.Type<typeof Book093.fields> {}

export const decodeBook093 = Schema.decodeUnknownEffect(Book093)
export const readBook093 = (book: typeof Book093.Type) => book.author?.name ?? book.title

export const Author094 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author094 extends Schema.Struct.Type<typeof Author094.fields> {}

export const Book094 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author094),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book094 extends Schema.Struct.Type<typeof Book094.fields> {}

export const decodeBook094 = Schema.decodeUnknownEffect(Book094)
export const readBook094 = (book: typeof Book094.Type) => book.author?.name ?? book.title

export const Author095 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author095 extends Schema.Struct.Type<typeof Author095.fields> {}

export const Book095 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author095),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book095 extends Schema.Struct.Type<typeof Book095.fields> {}

export const decodeBook095 = Schema.decodeUnknownEffect(Book095)
export const readBook095 = (book: typeof Book095.Type) => book.author?.name ?? book.title

export const Author096 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author096 extends Schema.Struct.Type<typeof Author096.fields> {}

export const Book096 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author096),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book096 extends Schema.Struct.Type<typeof Book096.fields> {}

export const decodeBook096 = Schema.decodeUnknownEffect(Book096)
export const readBook096 = (book: typeof Book096.Type) => book.author?.name ?? book.title

export const Author097 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author097 extends Schema.Struct.Type<typeof Author097.fields> {}

export const Book097 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author097),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book097 extends Schema.Struct.Type<typeof Book097.fields> {}

export const decodeBook097 = Schema.decodeUnknownEffect(Book097)
export const readBook097 = (book: typeof Book097.Type) => book.author?.name ?? book.title

export const Author098 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author098 extends Schema.Struct.Type<typeof Author098.fields> {}

export const Book098 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author098),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book098 extends Schema.Struct.Type<typeof Book098.fields> {}

export const decodeBook098 = Schema.decodeUnknownEffect(Book098)
export const readBook098 = (book: typeof Book098.Type) => book.author?.name ?? book.title

export const Author099 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author099 extends Schema.Struct.Type<typeof Author099.fields> {}

export const Book099 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author099),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book099 extends Schema.Struct.Type<typeof Book099.fields> {}

export const decodeBook099 = Schema.decodeUnknownEffect(Book099)
export const readBook099 = (book: typeof Book099.Type) => book.author?.name ?? book.title

export const Author100 = Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})
export interface Author100 extends Schema.Struct.Type<typeof Author100.fields> {}

export const Book100 = Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author100),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})
export interface Book100 extends Schema.Struct.Type<typeof Book100.fields> {}

export const decodeBook100 = Schema.decodeUnknownEffect(Book100)
export const readBook100 = (book: typeof Book100.Type) => book.author?.name ?? book.title
