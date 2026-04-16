/* ============================================ */
/* URBAN NEST — Admin Panel Logic               */
/* ============================================ */

const API = '/api';
let authToken = localStorage.getItem('un_token') || null;
let currentPosts = [];
let deleteTargetId = null;

// ---- DOM Elements ---- //
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const loginScreen = $('#login-screen');
const dashboardScreen = $('#dashboard-screen');
const loginForm = $('#login-form');
const loginError = $('#login-error');
const logoutBtn = $('#logout-btn');

const postsListView = $('#posts-list-view');
const postEditorView = $('#post-editor-view');
const postsTbody = $('#posts-tbody');
const postsEmpty = $('#posts-empty');
const newPostBtn = $('#new-post-btn');
const backToListBtn = $('#back-to-list');
const editorTitle = $('#editor-title');

const postForm = $('#post-form');
const postIdField = $('#post-id');
const postTitleField = $('#post-title');
const postCategoryField = $('#post-category');
const postDateField = $('#post-date');
const postExcerptField = $('#post-excerpt');
const postImagePathField = $('#post-image-path');
const saveDraftBtn = $('#save-draft-btn');
const publishBtn = $('#publish-btn');

const uploadArea = $('#upload-area');
const imageInput = $('#image-input');
const uploadPlaceholder = $('#upload-placeholder');
const uploadPreview = $('#upload-preview');
const previewImg = $('#preview-img');
const removeImageBtn = $('#remove-image-btn');

const toast = $('#toast');
const toastIcon = $('#toast-icon');
const toastMessage = $('#toast-message');

const deleteModal = $('#delete-modal');
const deleteCancelBtn = $('#delete-cancel');
const deleteConfirmBtn = $('#delete-confirm');

const statTotal = $('#stat-total');
const statPublished = $('#stat-published');
const statDrafts = $('#stat-drafts');


// ============================================ //
// INIT
// ============================================ //

document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showDashboard();
    } else {
        showLogin();
    }

    // Set default date to today
    postDateField.value = new Date().toISOString().split('T')[0];

    setupEventListeners();
});


// ============================================ //
// EVENT LISTENERS
// ============================================ //

function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    // Navigation
    newPostBtn.addEventListener('click', () => showEditor());
    backToListBtn.addEventListener('click', showList);

    // Save
    saveDraftBtn.addEventListener('click', () => savePost(false));
    publishBtn.addEventListener('click', () => savePost(true));

    // Image upload
    uploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageSelect);
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
    });

    // Drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            imageInput.files = e.dataTransfer.files;
            handleImageSelect();
        }
    });

    // Delete modal
    deleteCancelBtn.addEventListener('click', hideDeleteModal);
    deleteConfirmBtn.addEventListener('click', confirmDelete);
}


// ============================================ //
// AUTH
// ============================================ //

async function handleLogin(e) {
    e.preventDefault();
    loginError.classList.add('hidden');

    const login = $('#login-input').value.trim();
    const password = $('#password-input').value;

    if (!login || !password) {
        showError('Заполните все поля');
        return;
    }

    const loginBtn = $('#login-btn');
    loginBtn.disabled = true;
    loginBtn.querySelector('span').textContent = 'Входим...';

    try {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showError(data.error || 'Ошибка авторизации');
            loginBtn.disabled = false;
            loginBtn.querySelector('span').textContent = 'Войти';
            return;
        }

        authToken = data.token;
        localStorage.setItem('un_token', authToken);
        showDashboard();

    } catch (err) {
        showError('Ошибка соединения с сервером');
        loginBtn.disabled = false;
        loginBtn.querySelector('span').textContent = 'Войти';
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('un_token');
    showLogin();
}

function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
}

function showLogin() {
    loginScreen.classList.add('active');
    dashboardScreen.classList.remove('active');
}

function showDashboard() {
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    loadPosts();
}


// ============================================ //
// POSTS CRUD
// ============================================ //

async function loadPosts() {
    try {
        const res = await fetch(`${API}/posts`);
        if (!res.ok) throw new Error('Failed to load');
        currentPosts = await res.json();
        renderPostsTable();
        updateStats();
    } catch (err) {
        showToast('Ошибка загрузки статей', 'error');
    }
}

function renderPostsTable() {
    if (currentPosts.length === 0) {
        postsEmpty.classList.remove('hidden');
        postsTbody.innerHTML = '';
        return;
    }

    postsEmpty.classList.add('hidden');

    postsTbody.innerHTML = currentPosts.map(post => `
        <tr data-id="${post.id}">
            <td>
                ${post.image
                    ? `<img src="/${post.image}" alt="" class="td-image">`
                    : `<div class="td-image" style="display:flex;align-items:center;justify-content:center;color:rgba(248,245,240,0.2);">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                       </div>`
                }
            </td>
            <td>
                <div class="td-title">${escapeHtml(post.title)}</div>
                <div class="td-excerpt">${escapeHtml(post.excerpt)}</div>
            </td>
            <td><span class="td-category">${escapeHtml(post.category)}</span></td>
            <td><span class="td-date">${formatDate(post.date)}</span></td>
            <td>
                <span class="badge ${post.published ? 'badge-published' : 'badge-draft'}">
                    ${post.published ? 'Опубликовано' : 'Черновик'}
                </span>
            </td>
            <td>
                <div class="td-actions">
                    <button class="btn-icon-only edit" title="Редактировать" onclick="editPost('${post.id}')">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="btn-icon-only delete" title="Удалить" onclick="requestDelete('${post.id}')">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    const total = currentPosts.length;
    const published = currentPosts.filter(p => p.published).length;
    const drafts = total - published;

    statTotal.textContent = total;
    statPublished.textContent = published;
    statDrafts.textContent = drafts;
}


// ============================================ //
// EDITOR
// ============================================ //

function showEditor(post = null) {
    postsListView.classList.add('hidden');
    postEditorView.classList.remove('hidden');

    if (post) {
        // Edit mode
        editorTitle.textContent = 'Редактирование';
        postIdField.value = post.id;
        postTitleField.value = post.title;
        postCategoryField.value = post.category;
        postDateField.value = post.date;
        postExcerptField.value = post.excerpt;
        postImagePathField.value = post.image || '';

        if (post.image) {
            previewImg.src = '/' + post.image;
            uploadPlaceholder.classList.add('hidden');
            uploadPreview.classList.remove('hidden');
        } else {
            clearImage();
        }
    } else {
        // Create mode
        editorTitle.textContent = 'Новая статья';
        postIdField.value = '';
        postTitleField.value = '';
        postCategoryField.value = '';
        postDateField.value = new Date().toISOString().split('T')[0];
        postExcerptField.value = '';
        postImagePathField.value = '';
        clearImage();
    }

    postTitleField.focus();
}

function showList() {
    postEditorView.classList.add('hidden');
    postsListView.classList.remove('hidden');
    loadPosts();
}

function editPost(id) {
    const post = currentPosts.find(p => p.id === id);
    if (post) showEditor(post);
}

async function savePost(published) {
    const title = postTitleField.value.trim();
    const category = postCategoryField.value.trim();
    const date = postDateField.value;
    const excerpt = postExcerptField.value.trim();
    const image = postImagePathField.value;
    const id = postIdField.value;

    if (!title || !category || !date || !excerpt) {
        showToast('Заполните обязательные поля', 'error');
        return;
    }

    const body = { title, category, date, excerpt, image, published };

    // Disable buttons
    saveDraftBtn.disabled = true;
    publishBtn.disabled = true;

    try {
        let res;
        if (id) {
            // Update
            res = await fetch(`${API}/posts/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(body)
            });
        } else {
            // Create
            res = await fetch(`${API}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(body)
            });
        }

        if (res.status === 401) {
            handleLogout();
            showToast('Сессия истекла, войдите снова', 'error');
            return;
        }

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Ошибка сохранения');
        }

        showToast(
            published ? 'Статья опубликована' : 'Черновик сохранён',
            'success'
        );
        showList();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        saveDraftBtn.disabled = false;
        publishBtn.disabled = false;
    }
}


// ============================================ //
// DELETE
// ============================================ //

function requestDelete(id) {
    deleteTargetId = id;
    deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
    deleteTargetId = null;
    deleteModal.classList.add('hidden');
}

async function confirmDelete() {
    if (!deleteTargetId) return;

    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = 'Удаляем...';

    try {
        const res = await fetch(`${API}/posts/${deleteTargetId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.status === 401) {
            handleLogout();
            showToast('Сессия истекла', 'error');
            return;
        }

        if (!res.ok) throw new Error('Ошибка удаления');

        showToast('Статья удалена', 'success');
        hideDeleteModal();
        loadPosts();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        deleteConfirmBtn.disabled = false;
        deleteConfirmBtn.textContent = 'Удалить';
    }
}


// ============================================ //
// IMAGE UPLOAD
// ============================================ //

async function handleImageSelect() {
    const file = imageInput.files[0];
    if (!file) return;

    // Validate
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) {
        showToast('Допустимые форматы: JPG, PNG, WebP', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('Файл слишком большой (макс. 5 МБ)', 'error');
        return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadPlaceholder.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(`${API}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (res.status === 401) {
            handleLogout();
            return;
        }

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Ошибка загрузки');
        }

        const data = await res.json();
        postImagePathField.value = data.path;
        showToast('Изображение загружено', 'success');

    } catch (err) {
        showToast(err.message, 'error');
        clearImage();
    }
}

function clearImage() {
    imageInput.value = '';
    postImagePathField.value = '';
    previewImg.src = '';
    uploadPlaceholder.classList.remove('hidden');
    uploadPreview.classList.add('hidden');
}


// ============================================ //
// TOAST NOTIFICATIONS
// ============================================ //

let toastTimer = null;

function showToast(message, type = 'success') {
    clearTimeout(toastTimer);

    toastMessage.textContent = message;
    toastIcon.textContent = type === 'success' ? '✓' : '✕';
    toast.className = `toast ${type} show`;

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}


// ============================================ //
// HELPERS
// ============================================ //

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const months = [
        'янв', 'фев', 'мар', 'апр', 'май', 'июн',
        'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Make functions globally available for onclick handlers
window.editPost = editPost;
window.requestDelete = requestDelete;
window.showEditor = showEditor;
