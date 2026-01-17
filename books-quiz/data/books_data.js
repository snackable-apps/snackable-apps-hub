// Books Database - Classic & Popular Literature
const BOOKS_DATA = [
  {
    "title": "1984",
    "author": "George Orwell",
    "authorNationality": "UK",
    "genre": "Dystopian",
    "publicationYear": 1949,
    "pageCount": 328,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "To Kill a Mockingbird",
    "author": "Harper Lee",
    "authorNationality": "USA",
    "genre": "Fiction",
    "publicationYear": 1960,
    "pageCount": 281,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "Pride and Prejudice",
    "author": "Jane Austen",
    "authorNationality": "UK",
    "genre": "Romance",
    "publicationYear": 1813,
    "pageCount": 279,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "authorNationality": "USA",
    "genre": "Fiction",
    "publicationYear": 1925,
    "pageCount": 180,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "One Hundred Years of Solitude",
    "author": "Gabriel García Márquez",
    "authorNationality": "Colombia",
    "genre": "Magical Realism",
    "publicationYear": 1967,
    "pageCount": 417,
    "originalLanguage": "Spanish",
    "difficulty": "medium"
  },
  {
    "title": "Don Quixote",
    "author": "Miguel de Cervantes",
    "authorNationality": "Spain",
    "genre": "Fiction",
    "publicationYear": 1605,
    "pageCount": 863,
    "originalLanguage": "Spanish",
    "difficulty": "medium"
  },
  {
    "title": "Crime and Punishment",
    "author": "Fyodor Dostoevsky",
    "authorNationality": "Russia",
    "genre": "Psychological Fiction",
    "publicationYear": 1866,
    "pageCount": 671,
    "originalLanguage": "Russian",
    "difficulty": "medium"
  },
  {
    "title": "The Catcher in the Rye",
    "author": "J.D. Salinger",
    "authorNationality": "USA",
    "genre": "Fiction",
    "publicationYear": 1951,
    "pageCount": 234,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "Harry Potter and the Sorcerer's Stone",
    "author": "J.K. Rowling",
    "authorNationality": "UK",
    "genre": "Fantasy",
    "publicationYear": 1997,
    "pageCount": 309,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "The Lord of the Rings",
    "author": "J.R.R. Tolkien",
    "authorNationality": "UK",
    "genre": "Fantasy",
    "publicationYear": 1954,
    "pageCount": 1178,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "The Little Prince",
    "author": "Antoine de Saint-Exupéry",
    "authorNationality": "France",
    "genre": "Children's",
    "publicationYear": 1943,
    "pageCount": 96,
    "originalLanguage": "French",
    "difficulty": "easy"
  },
  {
    "title": "Animal Farm",
    "author": "George Orwell",
    "authorNationality": "UK",
    "genre": "Satire",
    "publicationYear": 1945,
    "pageCount": 112,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "The Alchemist",
    "author": "Paulo Coelho",
    "authorNationality": "Brazil",
    "genre": "Fiction",
    "publicationYear": 1988,
    "pageCount": 208,
    "originalLanguage": "Portuguese",
    "difficulty": "easy"
  },
  {
    "title": "Brave New World",
    "author": "Aldous Huxley",
    "authorNationality": "UK",
    "genre": "Dystopian",
    "publicationYear": 1932,
    "pageCount": 311,
    "originalLanguage": "English",
    "difficulty": "medium"
  },
  {
    "title": "War and Peace",
    "author": "Leo Tolstoy",
    "authorNationality": "Russia",
    "genre": "Historical Fiction",
    "publicationYear": 1869,
    "pageCount": 1225,
    "originalLanguage": "Russian",
    "difficulty": "medium"
  },
  {
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "authorNationality": "UK",
    "genre": "Fantasy",
    "publicationYear": 1937,
    "pageCount": 310,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "Frankenstein",
    "author": "Mary Shelley",
    "authorNationality": "UK",
    "genre": "Horror",
    "publicationYear": 1818,
    "pageCount": 280,
    "originalLanguage": "English",
    "difficulty": "medium"
  },
  {
    "title": "The Picture of Dorian Gray",
    "author": "Oscar Wilde",
    "authorNationality": "Ireland",
    "genre": "Gothic Fiction",
    "publicationYear": 1890,
    "pageCount": 254,
    "originalLanguage": "English",
    "difficulty": "medium"
  },
  {
    "title": "Moby-Dick",
    "author": "Herman Melville",
    "authorNationality": "USA",
    "genre": "Adventure",
    "publicationYear": 1851,
    "pageCount": 635,
    "originalLanguage": "English",
    "difficulty": "hard"
  },
  {
    "title": "The Count of Monte Cristo",
    "author": "Alexandre Dumas",
    "authorNationality": "France",
    "genre": "Adventure",
    "publicationYear": 1844,
    "pageCount": 1276,
    "originalLanguage": "French",
    "difficulty": "medium"
  },
  {
    "title": "Wuthering Heights",
    "author": "Emily Brontë",
    "authorNationality": "UK",
    "genre": "Gothic Fiction",
    "publicationYear": 1847,
    "pageCount": 416,
    "originalLanguage": "English",
    "difficulty": "medium"
  },
  {
    "title": "Jane Eyre",
    "author": "Charlotte Brontë",
    "authorNationality": "UK",
    "genre": "Romance",
    "publicationYear": 1847,
    "pageCount": 500,
    "originalLanguage": "English",
    "difficulty": "medium"
  },
  {
    "title": "The Kite Runner",
    "author": "Khaled Hosseini",
    "authorNationality": "Afghanistan",
    "genre": "Fiction",
    "publicationYear": 2003,
    "pageCount": 371,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "Life of Pi",
    "author": "Yann Martel",
    "authorNationality": "Canada",
    "genre": "Adventure",
    "publicationYear": 2001,
    "pageCount": 319,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "Dune",
    "author": "Frank Herbert",
    "authorNationality": "USA",
    "genre": "Science Fiction",
    "publicationYear": 1965,
    "pageCount": 412,
    "originalLanguage": "English",
    "difficulty": "medium"
  },
  {
    "title": "The Hitchhiker's Guide to the Galaxy",
    "author": "Douglas Adams",
    "authorNationality": "UK",
    "genre": "Science Fiction",
    "publicationYear": 1979,
    "pageCount": 193,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "Fahrenheit 451",
    "author": "Ray Bradbury",
    "authorNationality": "USA",
    "genre": "Dystopian",
    "publicationYear": 1953,
    "pageCount": 249,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "The Hunger Games",
    "author": "Suzanne Collins",
    "authorNationality": "USA",
    "genre": "Dystopian",
    "publicationYear": 2008,
    "pageCount": 374,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "Anna Karenina",
    "author": "Leo Tolstoy",
    "authorNationality": "Russia",
    "genre": "Fiction",
    "publicationYear": 1878,
    "pageCount": 864,
    "originalLanguage": "Russian",
    "difficulty": "hard"
  },
  {
    "title": "The Brothers Karamazov",
    "author": "Fyodor Dostoevsky",
    "authorNationality": "Russia",
    "genre": "Philosophical Fiction",
    "publicationYear": 1880,
    "pageCount": 796,
    "originalLanguage": "Russian",
    "difficulty": "hard"
  },
  {
    "title": "Gone Girl",
    "author": "Gillian Flynn",
    "authorNationality": "USA",
    "genre": "Thriller",
    "publicationYear": 2012,
    "pageCount": 415,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "The Da Vinci Code",
    "author": "Dan Brown",
    "authorNationality": "USA",
    "genre": "Thriller",
    "publicationYear": 2003,
    "pageCount": 489,
    "originalLanguage": "English",
    "difficulty": "easy"
  },
  {
    "title": "The Road",
    "author": "Cormac McCarthy",
    "authorNationality": "USA",
    "genre": "Post-Apocalyptic",
    "publicationYear": 2006,
    "pageCount": 287,
    "originalLanguage": "English",
    "difficulty": "medium"
  },
  {
    "title": "Never Let Me Go",
    "author": "Kazuo Ishiguro",
    "authorNationality": "UK",
    "genre": "Dystopian",
    "publicationYear": 2005,
    "pageCount": 288,
    "originalLanguage": "English",
    "difficulty": "medium"
  }
];
