// API Base URL - Change this to your deployed backend URL
const API_BASE = "http://localhost:3000"

const loginSection = document.getElementById("login-section");
const noticeSection = document.getElementById("notice-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const noticeForm = document.getElementById("notice-form");
const noticesList = document.getElementById("notices-list");
const logoutBtn = document.getElementById("logout-btn");
const teacherNameSpan = document.getElementById("teacher-name");
const loginBtn = document.getElementById("login-btn");
const rememberMe = document.getElementById("remember-me");

// Use the same token as the main login page
let token = localStorage.getItem("teacherToken") || localStorage.getItem("teacher_token");
let teacher = null;

// Auto-fill email if remembered
if (localStorage.getItem('remember-teacher')) {
    const storedEmail = localStorage.getItem('teacher-email');
    if (storedEmail) {
        document.getElementById('login-email').value = storedEmail;
        rememberMe.checked = true;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    if (token) {
        verifyToken(token).then((result) => {
            if (result.valid) {
                teacher = result.teacher;
                showNoticeSection();
            } else {
                localStorage.removeItem("teacherToken");
                localStorage.removeItem("teacher_token");
                showLoginSection();
            }
        });
    } else {
        showLoginSection();
    }
    fetchNotices();
});

function showLoginSection() {
    loginSection.style.display = "block";
    noticeSection.style.display = "none";
    teacherNameSpan.textContent = "";
}

function showNoticeSection() {
    loginSection.style.display = "none";
    noticeSection.style.display = "block";
    teacherNameSpan.textContent = teacher ? `Logged in as: ${teacher.name || teacher.full_name}` : "";
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    loginBtn.textContent = "Logging in...";
    loginBtn.disabled = true;
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
        const res = await fetch(`${API_BASE}/api/teacher/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            let msg = "Login failed";
            if (res.headers.get('content-type')?.includes('application/json')) {
                const data = await res.json();
                msg = data.message || msg;
            }
            throw new Error(msg);
        }
        const data = await res.json();
        token = data.token;
        teacher = data.teacher;
        // Store token in both keys for compatibility
        localStorage.setItem("teacherToken", token);
        localStorage.setItem("teacher_token", token);
        // Remember me functionality
        if (rememberMe.checked) {
            localStorage.setItem('remember-teacher', 'true');
            localStorage.setItem('teacher-email', email);
        } else {
            localStorage.removeItem('remember-teacher');
            localStorage.removeItem('teacher-email');
        }
        showNoticeSection();
    } catch (err) {
        loginError.textContent = err.message || "Login failed";
    } finally {
        loginBtn.textContent = "Login";
        loginBtn.disabled = false;
    }
});

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacher_token");
    token = null;
    teacher = null;
    showLoginSection();
});

noticeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("notice-title").value.trim();
    const content = document.getElementById("notice-content").value.trim();
    if (!title || !content) return;
    try {
        const res = await fetch(`${API_BASE}/api/notices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, content })
        });
        if (res.ok) {
            document.getElementById("notice-title").value = "";
            document.getElementById("notice-content").value = "";
            fetchNotices();
        } else {
            const data = await res.json();
            alert(data.message || "Failed to post notice");
        }
    } catch (err) {
        alert("Network error");
    }
});

async function fetchNotices() {
    noticesList.innerHTML = "<li>Loading...</li>";
    try {
        const res = await fetch(`${API_BASE}/api/notices`);
        const data = await res.json();
        if (Array.isArray(data)) {
            renderNotices(data);
        } else {
            noticesList.innerHTML = "<li>No notices found.</li>";
        }
    } catch (err) {
        noticesList.innerHTML = "<li>Failed to load notices.</li>";
    }
}

function renderNotices(notices) {
    if (!notices.length) {
        noticesList.innerHTML = "<li>No notices found.</li>";
        return;
    }
    noticesList.innerHTML = "";
    notices.forEach((notice) => {
        const li = document.createElement("li");
        li.className = "notice-item";
        li.innerHTML = `
            <div class="notice-title">${escapeHTML(notice.title)}</div>
            <div class="notice-content">${escapeHTML(notice.content)}</div>
            <div class="notice-meta">Posted by: ${escapeHTML(notice.teacher_name)} | ${new Date(notice.created_at).toLocaleString()}</div>
        `;
        if (token) {
            const delBtn = document.createElement("button");
            delBtn.className = "delete-btn";
            delBtn.textContent = "Delete";
            delBtn.onclick = () => deleteNotice(notice.id);
            li.appendChild(delBtn);
        }
        noticesList.appendChild(li);
    });
}

// Custom modal for delete confirmation
function showDeleteModal(onConfirm) {
    // Remove any existing modal
    const existing = document.getElementById('delete-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <h3>Delete Notice</h3>
            <p>Are you sure you want to delete this notice?</p>
            <div class="modal-actions">
                <button id="modal-delete-btn" class="modal-delete">Delete</button>
                <button id="modal-cancel-btn" class="modal-cancel">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('modal-delete-btn').onclick = () => {
        modal.remove();
        onConfirm();
    };
    document.getElementById('modal-cancel-btn').onclick = () => {
        modal.remove();
    };
}

// Replace confirm in deleteNotice
async function deleteNotice(id) {
    showDeleteModal(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/notices/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (res.ok) {
                fetchNotices();
            } else {
                const data = await res.json();
                alert(data.message || "Failed to delete notice");
            }
        } catch (err) {
            alert("Network error");
        }
    });
}

async function verifyToken(token) {
    try {
        const res = await fetch(`${API_BASE}/api/verify-token`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        } else {
            return { valid: false };
        }
    } catch {
        return { valid: false };
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, function (tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return charsToReplace[tag] || tag;
    });
}
