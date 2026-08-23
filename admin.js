document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginForm = document.getElementById('login-form');
    const contentForm = document.getElementById('content-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Check if token exists
    const token = localStorage.getItem('cms_token');
    if (token) {
        showDashboard();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('login-error');

        try {
            const res = await fetch('https://cupofhope-api.onrender.com/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('cms_token', data.token);
                errorMsg.textContent = '';
                showDashboard();
            } else {
                errorMsg.textContent = data.message || 'Login failed';
            }
        } catch (err) {
            errorMsg.textContent = 'Network error';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('cms_token');
        loginContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    });

    // Helper to upload a single file
    async function uploadFile(fileInput) {
        if (!fileInput || fileInput.files.length === 0) return null;
        
        const token = localStorage.getItem('cms_token');
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        const res = await fetch('https://cupofhope-api.onrender.com/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            return data.url; // e.g. /uploads/12345-image.jpg
        }
        return null;
    }

    contentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const successMsg = document.getElementById('success-msg');
        const errorMsg = document.getElementById('error-msg');
        const saveBtn = document.getElementById('save-btn');
        
        saveBtn.textContent = 'Uploading & Saving...';
        saveBtn.disabled = true;

        try {
            // Upload Hero Image if selected
            const heroFileUrl = await uploadFile(document.getElementById('hero_bg_file'));
            if (heroFileUrl) {
                document.getElementById('hero_bg').value = heroFileUrl;
            }

            // Serialize and upload lists
            await serializeLists();

            const formData = new FormData(contentForm);
            // Remove the actual file inputs from the data to send
            formData.delete('hero_bg_file');

            const data = Object.fromEntries(formData.entries());
            const token = localStorage.getItem('cms_token');

            const res = await fetch('https://cupofhope-api.onrender.com/api/content', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                successMsg.textContent = 'Content updated successfully!';
                errorMsg.textContent = '';
                setTimeout(() => successMsg.textContent = '', 3000);
            } else {
                if (res.status === 401 || res.status === 403) {
                    errorMsg.textContent = 'Session expired. Please login again.';
                    logoutBtn.click();
                } else {
                    errorMsg.textContent = 'Failed to update content.';
                }
            }
        } catch (err) {
            errorMsg.textContent = 'Network error during save';
            console.error(err);
        } finally {
            saveBtn.textContent = 'Save Changes';
            saveBtn.disabled = false;
        }
    });

    async function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        
        // Fetch current content
        try {
            const res = await fetch('https://cupofhope-api.onrender.com/api/content');
            if (res.ok) {
                const data = await res.json();
                
                // Populate simple text fields
                ['hero_title', 'hero_subtitle', 'hero_bg', 'about_title', 'about_desc1', 'about_desc2'].forEach(key => {
                    const input = document.getElementById(key);
                    if (input && data[key]) {
                        input.value = data[key];
                    }
                });
                
                // Render lists
                renderPrograms(data.programs ? JSON.parse(data.programs) : []);
                renderNews(data.news ? JSON.parse(data.news) : []);
                renderEvents(data.events ? JSON.parse(data.events) : []);
                renderSponsors(data.sponsors ? JSON.parse(data.sponsors) : []);
            }
        } catch (err) {
            console.error('Failed to fetch content', err);
        }
    }

    // --- DYNAMIC LIST LOGIC ---

    function createListItem(htmlContent) {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-header">
                Item <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()">Remove</button>
            </div>
            ${htmlContent}
        `;
        return div;
    }

    // PROGRAMS
    const programsContainer = document.getElementById('programs-container');
    document.getElementById('add-program-btn').addEventListener('click', () => {
        programsContainer.appendChild(createProgramForm({}));
    });
    function renderPrograms(programs) {
        programsContainer.innerHTML = '';
        programs.forEach(p => programsContainer.appendChild(createProgramForm(p)));
    }
    function createProgramForm(p) {
        const currImgHtml = p.image ? `<br><small>Current: <a href="${p.image}" target="_blank">View Image</a></small>` : '';
        return createListItem(`
            <div class="form-group">
                <label>Program Image Upload</label>
                <div class="file-input-wrapper">
                    <input type="file" class="p-image-file" accept="image/*">
                </div>
                <input type="hidden" class="p-image-hidden" value="${p.image || ''}">
                ${currImgHtml}
            </div>
            <div class="form-group"><label>Title</label><input type="text" class="p-title" value="${p.title || ''}"></div>
            <div class="form-group"><label>Time Range</label><input type="text" class="p-time" value="${p.time || ''}"></div>
            <div class="form-group"><label>Description</label><input type="text" class="p-desc" value="${p.desc || ''}"></div>
        `);
    }

    // NEWS
    const newsContainer = document.getElementById('news-container');
    document.getElementById('add-news-btn').addEventListener('click', () => {
        newsContainer.appendChild(createNewsForm({}));
    });
    function renderNews(newsList) {
        newsContainer.innerHTML = '';
        newsList.forEach(n => newsContainer.appendChild(createNewsForm(n)));
    }
    function createNewsForm(n) {
        const currImgHtml = n.image ? `<br><small>Current: <a href="${n.image}" target="_blank">View Image</a></small>` : '';
        return createListItem(`
            <div class="form-group">
                <label>News Image Upload</label>
                <div class="file-input-wrapper">
                    <input type="file" class="n-image-file" accept="image/*">
                </div>
                <input type="hidden" class="n-image-hidden" value="${n.image || ''}">
                ${currImgHtml}
            </div>
            <div class="form-group"><label>Title</label><input type="text" class="n-title" value="${n.title || ''}"></div>
            <div class="form-group"><label>Date (e.g. 08 Jun 2026)</label><input type="text" class="n-date" value="${n.date || ''}"></div>
            <div class="form-group"><label>Snippet</label><textarea class="n-snippet" rows="2">${n.snippet || ''}</textarea></div>
        `);
    }

    // EVENTS
    const eventsContainer = document.getElementById('events-container');
    document.getElementById('add-event-btn').addEventListener('click', () => {
        eventsContainer.appendChild(createEventForm({}));
    });
    function renderEvents(events) {
        eventsContainer.innerHTML = '';
        events.forEach(e => eventsContainer.appendChild(createEventForm(e)));
    }
    function createEventForm(e) {
        return createListItem(`
            <div class="form-group"><label>Event Type (primary or secondary)</label><input type="text" class="e-type" value="${e.type || 'primary'}"></div>
            <div class="form-group"><label>Color Badge (orange or dark)</label><input type="text" class="e-color" value="${e.color || 'orange'}"></div>
            <div class="form-group"><label>Day (e.g. 19)</label><input type="text" class="e-day" value="${e.day || ''}"></div>
            <div class="form-group"><label>Month (e.g. JUN)</label><input type="text" class="e-month" value="${e.month || ''}"></div>
            <div class="form-group"><label>Title</label><input type="text" class="e-title" value="${e.title || ''}"></div>
            <div class="form-group"><label>Venue</label><input type="text" class="e-venue" value="${e.venue || ''}"></div>
        `);
    }

    // SPONSORS
    const sponsorsContainer = document.getElementById('sponsors-container');
    document.getElementById('add-sponsor-btn').addEventListener('click', () => {
        sponsorsContainer.appendChild(createSponsorForm({}));
    });
    function renderSponsors(sponsors) {
        sponsorsContainer.innerHTML = '';
        sponsors.forEach(s => sponsorsContainer.appendChild(createSponsorForm(s)));
    }
    function createSponsorForm(s) {
        const currImgHtml = s.image ? `<br><small>Current: <a href="${s.image}" target="_blank">View Logo</a></small>` : '';
        return createListItem(`
            <div class="form-group">
                <label>Sponsor Logo Upload</label>
                <div class="file-input-wrapper">
                    <input type="file" class="s-image-file" accept="image/*">
                </div>
                <input type="hidden" class="s-image-hidden" value="${s.image || ''}">
                ${currImgHtml}
            </div>
            <div class="form-group"><label>Sponsor Name</label><input type="text" class="s-name" value="${s.name || ''}"></div>
        `);
    }

    // SERIALIZATION & UPLOADS
    async function serializeLists() {
        const programs = [];
        for (const div of Array.from(programsContainer.children)) {
            const uploadedUrl = await uploadFile(div.querySelector('.p-image-file'));
            const finalImg = uploadedUrl || div.querySelector('.p-image-hidden').value;
            programs.push({
                image: finalImg,
                title: div.querySelector('.p-title').value,
                time: div.querySelector('.p-time').value,
                desc: div.querySelector('.p-desc').value
            });
        }
        document.getElementById('programs').value = JSON.stringify(programs);

        const newsList = [];
        for (const div of Array.from(newsContainer.children)) {
            const uploadedUrl = await uploadFile(div.querySelector('.n-image-file'));
            const finalImg = uploadedUrl || div.querySelector('.n-image-hidden').value;
            newsList.push({
                image: finalImg,
                title: div.querySelector('.n-title').value,
                date: div.querySelector('.n-date').value,
                snippet: div.querySelector('.n-snippet').value
            });
        }
        document.getElementById('news').value = JSON.stringify(newsList);

        const events = Array.from(eventsContainer.children).map(div => ({
            type: div.querySelector('.e-type').value,
            color: div.querySelector('.e-color').value,
            day: div.querySelector('.e-day').value,
            month: div.querySelector('.e-month').value,
            title: div.querySelector('.e-title').value,
            venue: div.querySelector('.e-venue').value
        }));
        document.getElementById('events').value = JSON.stringify(events);

        const sponsors = [];
        for (const div of Array.from(sponsorsContainer.children)) {
            const uploadedUrl = await uploadFile(div.querySelector('.s-image-file'));
            const finalImg = uploadedUrl || div.querySelector('.s-image-hidden').value;
            sponsors.push({
                image: finalImg,
                name: div.querySelector('.s-name').value
            });
        }
        document.getElementById('sponsors').value = JSON.stringify(sponsors);
    }
});
