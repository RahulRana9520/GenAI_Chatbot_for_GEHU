// API Base URL - Change this to your deployed backend URL
const API_BASE = "http://localhost:3000"
const noticesList = document.getElementById("notices-list");

window.addEventListener("DOMContentLoaded", () => {
    fetchNotices();
});

async function fetchNotices() {
    noticesList.innerHTML = "<li>Loading...</li>";
    try {
        // Prefer external notices (WordPress) via backend proxy (avoids CORS)
        const externalRes = await fetch(`${API_BASE}/api/external-notices?limit=20&page=1`);
        if (externalRes.ok) {
            const externalData = await externalRes.json();
            if (Array.isArray(externalData) && externalData.length) {
                renderNotices(externalData);
                return;
            }
        }

        // Fallback to local notices (teacher dashboard posts)
        const res = await fetch(`${API_BASE}/api/notices`);
        const data = await res.json();
        if (Array.isArray(data)) renderNotices(data);
        else noticesList.innerHTML = "<li>No notices found.</li>";
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
        const titleText = stripHtml(notice.title || "");
        const contentText = stripHtml(notice.content || "");
        const createdAt = notice.created_at ? new Date(notice.created_at).toLocaleString() : "";
        const postedBy = notice.teacher_name || (notice.source === 'external' ? 'CSE Department' : 'Teacher');
        const url = notice.url || "";

        const li = document.createElement("li");
        li.className = "notice-item";
        li.innerHTML = `
            <div class="notice-title">
              ${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer noopener">${escapeHTML(titleText)}</a>` : escapeHTML(titleText)}
            </div>
            <div class="notice-content">${escapeHTML(contentText)}</div>
            <div class="notice-meta">Posted by: ${escapeHTML(postedBy)}${createdAt ? ` | ${createdAt}` : ""}</div>
        `;
        noticesList.appendChild(li);
    });
}

function stripHtml(html) {
    if (!html) return "";
    const div = document.createElement('div');
    div.innerHTML = String(html);
    return (div.textContent || div.innerText || "").trim();
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
