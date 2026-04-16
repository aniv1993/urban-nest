/* ============================================ */
/* URBAN NEST — Express Server + Flat-file CMS  */
/* ============================================ */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Config ---- //
const DATA_FILE = path.join(__dirname, 'data', 'posts.json');
const UPLOAD_DIR = path.join(__dirname, 'images', 'blog');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'urbannest2026';

// ---- Ensure directories exist ---- //
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

// ---- Middleware ---- //
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (landing page)
app.use(express.static(__dirname, {
    index: 'index.html',
    extensions: ['html']
}));

// ---- Multer (image uploads) ---- //
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `blog-${Date.now()}${ext}`;
        cb(null, safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Допустимые форматы: JPG, PNG, WebP, AVIF'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

// ---- Helper: Read/Write Posts ---- //
function readPosts() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writePosts(posts) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

// ---- Auth Middleware ---- //
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
}

// ============================================ //
// API ROUTES
// ============================================ //

// ---- Login ---- //
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
        const token = jwt.sign(
            { login, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        return res.json({ token, message: 'Успешная авторизация' });
    }

    return res.status(401).json({ error: 'Неверный логин или пароль' });
});

// ---- Get All Posts (public) ---- //
app.get('/api/posts', (req, res) => {
    const posts = readPosts();
    // Sort by date descending
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(posts);
});

// ---- Get Single Post (public) ---- //
app.get('/api/posts/:id', (req, res) => {
    const posts = readPosts();
    const post = posts.find(p => p.id === req.params.id);
    if (!post) {
        return res.status(404).json({ error: 'Статья не найдена' });
    }
    res.json(post);
});

// ---- Create Post (auth required) ---- //
app.post('/api/posts', authMiddleware, (req, res) => {
    const posts = readPosts();
    const { title, category, date, excerpt, image, published } = req.body;

    if (!title || !category || !date || !excerpt) {
        return res.status(400).json({ error: 'Заполните обязательные поля: title, category, date, excerpt' });
    }

    const newPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        category,
        date,
        excerpt,
        image: image || '',
        published: published !== undefined ? published : true
    };

    posts.push(newPost);
    writePosts(posts);

    res.status(201).json(newPost);
});

// ---- Update Post (auth required) ---- //
app.put('/api/posts/:id', authMiddleware, (req, res) => {
    const posts = readPosts();
    const index = posts.findIndex(p => p.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Статья не найдена' });
    }

    const { title, category, date, excerpt, image, published } = req.body;

    // Merge updates
    if (title !== undefined) posts[index].title = title;
    if (category !== undefined) posts[index].category = category;
    if (date !== undefined) posts[index].date = date;
    if (excerpt !== undefined) posts[index].excerpt = excerpt;
    if (image !== undefined) posts[index].image = image;
    if (published !== undefined) posts[index].published = published;

    writePosts(posts);

    res.json(posts[index]);
});

// ---- Delete Post (auth required) ---- //
app.delete('/api/posts/:id', authMiddleware, (req, res) => {
    let posts = readPosts();
    const post = posts.find(p => p.id === req.params.id);

    if (!post) {
        return res.status(404).json({ error: 'Статья не найдена' });
    }

    // Optionally delete the uploaded image (only from blog/ subdir)
    if (post.image && post.image.startsWith('images/blog/')) {
        const imgPath = path.join(__dirname, post.image);
        if (fs.existsSync(imgPath)) {
            try { fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
        }
    }

    posts = posts.filter(p => p.id !== req.params.id);
    writePosts(posts);

    res.json({ message: 'Статья удалена', id: req.params.id });
});

// ---- Upload Image (auth required) ---- //
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Изображение не загружено' });
    }

    // Return relative path for use in posts
    const relativePath = `images/blog/${req.file.filename}`;
    res.json({
        path: relativePath,
        filename: req.file.filename,
        size: req.file.size
    });
});

// ---- Error handler for multer ---- //
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Файл слишком большой (макс. 5 МБ)' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

// ---- Start ---- //
app.listen(PORT, () => {
    console.log(`\n  🏡 Urban Nest CMS запущен`);
    console.log(`  ├─ Лендинг:  http://localhost:${PORT}`);
    console.log(`  ├─ Админка:  http://localhost:${PORT}/admin`);
    console.log(`  └─ API:      http://localhost:${PORT}/api/posts\n`);
});
