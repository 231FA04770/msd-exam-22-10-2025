const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKS_FILE = path.join(__dirname, 'books.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Helper function to read books from file
async function readBooks() {
  try {
    const data = await fs.readFile(BOOKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create it with empty array
    if (error.code === 'ENOENT') {
      await fs.writeFile(BOOKS_FILE, '[]');
      return [];
    }
    throw error;
  }
}

// Helper function to write books to file
async function writeBooks(books) {
  await fs.writeFile(BOOKS_FILE, JSON.stringify(books, null, 2));
}

// GET /books - return all books
app.get('/books', async (req, res) => {
  try {
    const books = await readBooks();
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read books data' });
  }
});

// GET /books/available - return only available books
app.get('/books/available', async (req, res) => {
  try {
    const books = await readBooks();
    const availableBooks = books.filter(book => book.available === true);
    res.json(availableBooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read books data' });
  }
});

// POST /books - create a new book
app.post('/books', async (req, res) => {
  try {
    const { title, author, available } = req.body;
    
    // Validate required fields
    if (!title || !author || typeof available !== 'boolean') {
      return res.status(400).json({ 
        error: 'Title, author, and available (boolean) are required' 
      });
    }

    const books = await readBooks();
    
    // Generate auto-increment ID
    const newId = books.length > 0 ? Math.max(...books.map(book => book.id)) + 1 : 1;
    
    const newBook = {
      id: newId,
      title,
      author,
      available
    };
    
    books.push(newBook);
    await writeBooks(books);
    
    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// PUT /books/:id - update a book
app.put('/books/:id', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    const { title, author, available } = req.body;
    
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const books = await readBooks();
    const bookIndex = books.findIndex(book => book.id === bookId);
    
    if (bookIndex === -1) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Update only provided fields
    if (title !== undefined) books[bookIndex].title = title;
    if (author !== undefined) books[bookIndex].author = author;
    if (available !== undefined) books[bookIndex].available = available;

    await writeBooks(books);
    
    res.json(books[bookIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// DELETE /books/:id - delete a book
app.delete('/books/:id', async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    
    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const books = await readBooks();
    const bookIndex = books.findIndex(book => book.id === bookId);
    
    if (bookIndex === -1) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const deletedBook = books.splice(bookIndex, 1)[0];
    await writeBooks(books);
    
    res.json({ message: 'Book deleted successfully', book: deletedBook });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});