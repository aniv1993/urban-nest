# ============================================ #
# URBAN NEST — Flask Server + Flat-file CMS     #
# ============================================ #

import os
import json
import time
import random
import string
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, abort
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

try:
    import jwt
except ImportError:
    print("Installing PyJWT...")
    os.system("pip install pyjwt")
    import jwt

load_dotenv()

# ---- Config ---- #
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DATA_FILE = os.path.join(DATA_DIR, 'posts.json')
UPLOAD_DIR = os.path.join(BASE_DIR, 'images', 'blog')

PORT = int(os.getenv('PORT', 3000))
ADMIN_LOGIN = os.getenv('ADMIN_LOGIN', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'urbannest2026')
JWT_SECRET = os.getenv('JWT_SECRET', 'urban-nest-jwt-secret-change-in-production')

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# ---- Ensure directories ---- #
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

# ---- Flask App ---- #
app = Flask(__name__, static_folder=None)


# ============================================ #
# HELPERS
# ============================================ #

def read_posts():
    """Read posts from JSON file."""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def write_posts(posts):
    """Write posts to JSON file (atomic-ish)."""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)


def generate_id():
    """Generate a unique post ID."""
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"post-{int(time.time())}-{rand}"


def allowed_file(filename):
    """Check if file extension is allowed."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


# ---- Auth Decorator ---- #
def auth_required(f):
    """JWT authentication middleware."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Требуется авторизация'}), 401

        token = auth_header.split(' ')[1]
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Токен истёк'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Недействительный токен'}), 401

        return f(*args, **kwargs)
    return decorated


# ============================================ #
# STATIC FILE SERVING
# ============================================ #

@app.route('/')
def serve_index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/admin')
@app.route('/admin/')
def serve_admin():
    return send_from_directory(os.path.join(BASE_DIR, 'admin'), 'index.html')


@app.route('/admin/<path:filename>')
def serve_admin_static(filename):
    admin_dir = os.path.join(BASE_DIR, 'admin')
    return send_from_directory(admin_dir, filename)


@app.route('/<path:filename>')
def serve_static_files(filename):
    """Catch-all route for all other static files (images, css, js, etc.)."""
    filepath = os.path.join(BASE_DIR, filename)
    if os.path.isfile(filepath):
        directory = os.path.dirname(filepath)
        basename = os.path.basename(filepath)
        return send_from_directory(directory, basename)
    abort(404)


# ============================================ #
# API ROUTES
# ============================================ #

# ---- Login ---- #
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Данные не предоставлены'}), 400

    login_val = data.get('login', '')
    password = data.get('password', '')

    if login_val == ADMIN_LOGIN and password == ADMIN_PASSWORD:
        token = jwt.encode(
            {
                'login': login_val,
                'role': 'admin',
                'exp': datetime.now(timezone.utc) + timedelta(hours=24)
            },
            JWT_SECRET,
            algorithm='HS256'
        )
        return jsonify({'token': token, 'message': 'Успешная авторизация'})

    return jsonify({'error': 'Неверный логин или пароль'}), 401


# ---- Get All Posts (public) ---- #
@app.route('/api/posts', methods=['GET'])
def get_posts():
    posts = read_posts()
    # Sort by date descending
    posts.sort(key=lambda p: p.get('date', ''), reverse=True)
    return jsonify(posts)


# ---- Get Single Post (public) ---- #
@app.route('/api/posts/<post_id>', methods=['GET'])
def get_post(post_id):
    posts = read_posts()
    post = next((p for p in posts if p['id'] == post_id), None)
    if not post:
        return jsonify({'error': 'Статья не найдена'}), 404
    return jsonify(post)


# ---- Create Post (auth required) ---- #
@app.route('/api/posts', methods=['POST'])
@auth_required
def create_post():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Данные не предоставлены'}), 400

    title = data.get('title', '').strip()
    category = data.get('category', '').strip()
    date = data.get('date', '').strip()
    excerpt = data.get('excerpt', '').strip()

    if not all([title, category, date, excerpt]):
        return jsonify({'error': 'Заполните обязательные поля: title, category, date, excerpt'}), 400

    new_post = {
        'id': generate_id(),
        'title': title,
        'category': category,
        'date': date,
        'excerpt': excerpt,
        'image': data.get('image', ''),
        'published': data.get('published', True)
    }

    posts = read_posts()
    posts.append(new_post)
    write_posts(posts)

    return jsonify(new_post), 201


# ---- Update Post (auth required) ---- #
@app.route('/api/posts/<post_id>', methods=['PUT'])
@auth_required
def update_post(post_id):
    posts = read_posts()
    post_index = next((i for i, p in enumerate(posts) if p['id'] == post_id), None)

    if post_index is None:
        return jsonify({'error': 'Статья не найдена'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Данные не предоставлены'}), 400

    # Merge updates
    for field in ['title', 'category', 'date', 'excerpt', 'image', 'published']:
        if field in data:
            posts[post_index][field] = data[field]

    write_posts(posts)
    return jsonify(posts[post_index])


# ---- Delete Post (auth required) ---- #
@app.route('/api/posts/<post_id>', methods=['DELETE'])
@auth_required
def delete_post(post_id):
    posts = read_posts()
    post = next((p for p in posts if p['id'] == post_id), None)

    if not post:
        return jsonify({'error': 'Статья не найдена'}), 404

    # Delete uploaded image (only from blog/ subdirectory)
    if post.get('image', '').startswith('images/blog/'):
        img_path = os.path.join(BASE_DIR, post['image'])
        if os.path.exists(img_path):
            try:
                os.remove(img_path)
            except OSError:
                pass

    posts = [p for p in posts if p['id'] != post_id]
    write_posts(posts)

    return jsonify({'message': 'Статья удалена', 'id': post_id})


# ---- Upload Image (auth required) ---- #
@app.route('/api/upload', methods=['POST'])
@auth_required
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'Изображение не загружено'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Допустимые форматы: JPG, PNG, WebP, AVIF'}), 400

    # Check file size
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)     # Seek back to start

    if size > MAX_FILE_SIZE:
        return jsonify({'error': 'Файл слишком большой (макс. 5 МБ)'}), 400

    # Generate safe filename
    ext = os.path.splitext(secure_filename(file.filename))[1].lower()
    safe_name = f"blog-{int(time.time())}{ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    file.save(filepath)

    relative_path = f"images/blog/{safe_name}"
    return jsonify({
        'path': relative_path,
        'filename': safe_name,
        'size': size
    })


# ============================================ #
# START
# ============================================ #

if __name__ == '__main__':
    print(f"\n  [Urban Nest CMS] Server started")
    print(f"  -- Landing:  http://localhost:{PORT}")
    print(f"  -- Admin:    http://localhost:{PORT}/admin")
    print(f"  -- API:      http://localhost:{PORT}/api/posts\n")

    app.run(host='0.0.0.0', port=PORT, debug=True)
