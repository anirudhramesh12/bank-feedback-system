let allFeedback = [];
let filteredFeedback = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFeedbackId = null;
let ratingChart = null;
let statusChart = null;
let currentDeleteId = null;
let currentUser = null;
let staffMembers = [];

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('auth-form').addEventListener('submit', submitAdminLogin);
    document.getElementById('logout-button').addEventListener('click', logoutAdmin);
    document.getElementById('nav-toggle').addEventListener('click', toggleAdminNav);
    initializeAdmin();
});

function toggleAdminNav() {
    const sidebar = document.getElementById('staff-sidebar');
    const isOpen = sidebar.classList.toggle('open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', String(isOpen));
}

async function initializeAdmin() {
    try {
        currentUser = await BankApi.get('/api/auth/me');
    } catch (error) {
        document.getElementById('auth-screen').hidden = false;
        document.getElementById('admin-app').hidden = true;
        return;
    }

    if (!['ADMIN', 'STAFF'].includes(currentUser.role)) {
        document.getElementById('auth-screen').hidden = false;
        document.getElementById('auth-error').textContent = 'This account cannot access staff tools.';
        document.getElementById('admin-app').hidden = true;
        return;
    }

    document.getElementById('auth-screen').hidden = true;
    document.getElementById('admin-app').hidden = false;
    document.getElementById('admin-user').textContent = `${currentUser.name} · ${currentUser.role}`;
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('filter-btn').addEventListener('click', function() {
        currentPage = 1;
        applyFilters();
    });
    document.getElementById('reset-btn').addEventListener('click', resetFilters);
    document.getElementById('search-input').addEventListener('input', function() {
        currentPage = 1;
        applyFilters();
    });
    document.getElementById('response-modal').querySelector('.close')
        .addEventListener('click', closeResponseModal);
    document.getElementById('submit-response').addEventListener('click', submitResponse);
    document.getElementById('confirm-delete').addEventListener('click', confirmDelete);
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('response-modal')) closeResponseModal();
        if (event.target === document.getElementById('delete-modal')) closeDeleteModal();
    });

    if (currentUser.role === 'ADMIN') {
        try {
            staffMembers = await BankApi.get('/api/feedback/staff');
        } catch (error) {
            showError('Staff list could not be loaded. Assignment is unavailable.');
        }
    }
    loadAllFeedback();
}

async function submitAdminLogin(event) {
    event.preventDefault();
    const errorElement = document.getElementById('auth-error');
    errorElement.textContent = '';
    try {
        await BankApi.post('/api/auth/login', {
            email: document.getElementById('auth-email').value.trim(),
            password: document.getElementById('auth-password').value
        });
        await initializeAdmin();
    } catch (error) {
        errorElement.textContent = error.message;
    }
}

async function logoutAdmin() {
    try {
        await BankApi.post('/api/auth/logout', {});
    } catch (error) {
        console.error('Logout request failed:', error);
    } finally {
        window.location.replace('/admin.html');
    }
}

function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('rating-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    currentPage = 1;
    filteredFeedback = [...allFeedback];
    displayFeedback();
}

// Load all feedback from API
async function loadAllFeedback() {
    try {
        allFeedback = await BankApi.get('/api/feedback') || [];
        filteredFeedback = [...allFeedback];
        displayFeedback();
        updateAnalytics();
    } catch (error) {
        console.error('Error loading feedback:', error);
        showError('Failed to load feedback. Please try again.');
    }
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const rating = document.getElementById('rating-filter').value;
    const status = document.getElementById('status-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const beforeDate = dateTo ? new Date(`${dateTo}T00:00:00`) : null;
    if (beforeDate) beforeDate.setDate(beforeDate.getDate() + 1);

    filteredFeedback = allFeedback.filter(feedback => {
        const matchSearch = !searchTerm || 
            feedback.user.name.toLowerCase().includes(searchTerm) ||
            feedback.comments.toLowerCase().includes(searchTerm);
        
        const matchCategory = !category || feedback.category === category;
        const matchRating = !rating || feedback.rating === parseInt(rating);
        const matchStatus = !status || feedback.status === status;
        
        let matchDate = true;
        const feedbackDate = new Date(feedback.createdAt);
        if (fromDate && feedbackDate < fromDate) matchDate = false;
        if (beforeDate && feedbackDate >= beforeDate) matchDate = false;

        return matchSearch && matchCategory && matchRating && matchStatus && matchDate;
    });

    displayFeedback();
}

// Display feedback with pagination
function displayFeedback() {
    const feedbackTbody = document.getElementById('feedback-tbody');
    feedbackTbody.replaceChildren();

    if (filteredFeedback.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 9;
        cell.className = 'no-data';
        cell.textContent = 'No feedback found';
        row.appendChild(cell);
        feedbackTbody.appendChild(row);
        updatePagination();
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedFeedback = filteredFeedback.slice(start, end);

    paginatedFeedback.forEach(feedback => {
        const row = document.createElement('tr');
        row.append(
            textCell(feedback.complaintNumber),
            textCell(feedback.user?.name || 'Customer'),
            textCell(feedback.category.replace(/_/g, ' ')),
            textCell('★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating)),
            textCell((feedback.comments || '').substring(0, 80)),
            statusCell(feedback.status),
            assignmentCell(feedback),
            textCell(new Date(feedback.createdAt).toLocaleDateString()),
            actionCell(feedback)
        );
        feedbackTbody.appendChild(row);
    });

    updatePagination();
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById('prev-btn').disabled = currentPage === 1;
    document.getElementById('next-btn').disabled = currentPage === totalPages || totalPages === 0;
}

// Navigation functions
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayFeedback();
        window.scrollTo(0, 0);
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayFeedback();
        window.scrollTo(0, 0);
    }
}

// Open response modal
function openResponseModal(feedbackId) {
    currentFeedbackId = feedbackId;
    const feedback = allFeedback.find(f => f.id === feedbackId);
    
    if (feedback) {
        const feedbackDetails = document.getElementById('feedback-details');
        const stars = '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);
        const createdDate = new Date(feedback.createdAt).toLocaleString();
        
        feedbackDetails.replaceChildren();
        [
            `Complaint: ${feedback.complaintNumber}`,
            `Customer: ${feedback.user.name} (${feedback.user.email})`,
            `Category: ${feedback.category.replace(/_/g, ' ')}`,
            `Rating: ${stars} (${feedback.rating}/5)`,
            `Date: ${createdDate}`,
            `Comments: ${feedback.comments}`
        ].forEach(text => {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            feedbackDetails.appendChild(paragraph);
        });

        loadResponseHistory(feedbackId);
        loadStatusHistory(feedbackId);
        document.getElementById('response-modal').style.display = 'block';
        document.getElementById('response-text').value = '';
    }
}

// Load response history
function loadResponseHistory(feedbackId) {
    const responseHistory = document.getElementById('response-history');
    responseHistory.textContent = 'Loading responses...';

    BankApi.get(`/api/feedback/${feedbackId}/responses`)
    .then(data => {
        if (!data || data.length === 0) {
            responseHistory.textContent = 'No responses yet';
        } else {
            responseHistory.replaceChildren();
            const heading = document.createElement('h4');
            heading.textContent = 'Response History';
            responseHistory.appendChild(heading);
            data.forEach(response => {
                const responseItem = document.createElement('div');
                responseItem.className = 'response-item';
                const author = document.createElement('div');
                author.className = 'admin-name';
                author.textContent = `Staff: ${response.admin.name}`;
                const date = document.createElement('div');
                date.className = 'response-date';
                date.textContent = new Date(response.createdAt).toLocaleString();
                const text = document.createElement('p');
                text.textContent = response.responseText;
                responseItem.append(author, date, text);
                responseHistory.appendChild(responseItem);
            });
        }
    })
    .catch(error => { responseHistory.textContent = error.message; });
}

function loadStatusHistory(feedbackId) {
    const history = document.getElementById('status-history');
    history.textContent = 'Loading status history...';
    BankApi.get(`/api/feedback/${feedbackId}/history`)
        .then(entries => {
            history.replaceChildren();
            const heading = document.createElement('h4');
            heading.textContent = 'Status History';
            history.appendChild(heading);
            if (!entries.length) {
                history.append('No status changes yet');
                return;
            }
            entries.forEach(entry => {
                const line = document.createElement('p');
                line.textContent = `${entry.previousStatus || 'Created'} → ${entry.newStatus}: ${entry.changedBy} · ${new Date(entry.createdAt).toLocaleString()}${entry.details ? ` · ${entry.details}` : ''}`;
                history.appendChild(line);
            });
        })
        .catch(error => { history.textContent = error.message; });
}

// Close response modal
function closeResponseModal() {
    document.getElementById('response-modal').style.display = 'none';
    document.getElementById('response-text').value = '';
    currentFeedbackId = null;
}

// Submit response
function submitResponse() {
    const responseTextArea = document.getElementById('response-text');
    
    if (!responseTextArea.value.trim()) {
        alert('Please enter a response');
        return;
    }
    if (!currentFeedbackId) {
        alert('No feedback selected');
        return;
    }

    BankApi.post('/api/feedback/response', {
        feedbackId: currentFeedbackId,
        responseText: responseTextArea.value
    })
    .then(() => {
        alert('Response submitted successfully!');
        closeResponseModal();
        loadAllFeedback();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error submitting response: ' + error.message);
    });
}

function assignFeedback(feedbackId, staffId) {
    BankApi.patch(`/api/feedback/${feedbackId}/assignment`, { staffId })
        .then(() => loadAllFeedback())
        .catch(error => alert(`Could not assign complaint: ${error.message}`));
}

function updateFeedbackStatus(feedbackId, status) {
    BankApi.patch(`/api/feedback/${feedbackId}/status`, { status })
        .then(() => loadAllFeedback())
        .catch(error => alert(`Could not update complaint: ${error.message}`));
}

// Open delete modal
function openDeleteModal(feedbackId) {
    currentDeleteId = feedbackId;
    document.getElementById('delete-modal').style.display = 'block';
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    currentDeleteId = null;
}

// Confirm delete
function confirmDelete() {
    if (!currentDeleteId) return;

    BankApi.delete(`/api/feedback/${currentDeleteId}`)
    .then(() => {
        alert('Feedback deleted successfully!');
        closeDeleteModal();
        loadAllFeedback();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting feedback: ' + error.message);
    });
}

// Export data to CSV
function exportData() {
    if (filteredFeedback.length === 0) {
        alert('No data to export');
        return;
    }

    let csv = 'Complaint ID,Customer,Email,Category,Rating,Comments,Status,Date\n';
    filteredFeedback.forEach(feedback => {
        const createdDate = new Date(feedback.createdAt).toLocaleDateString();
        const values = [feedback.complaintNumber, feedback.user.name, feedback.user.email,
            feedback.category, feedback.rating, feedback.comments, feedback.status, createdDate];
        csv += values.map(csvValue).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_export_' + new Date().getTime() + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function csvValue(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

// Update analytics
function updateAnalytics() {
    const totalFeedback = allFeedback.length;
        const pendingFeedback = allFeedback.filter(f => ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(f.status)).length;
    const avgRating = totalFeedback > 0 ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback).toFixed(2) : 0;
    const completedCount = allFeedback.filter(f => ['RESPONDED', 'RESOLVED', 'CLOSED'].includes(f.status)).length;
    const responseRate = totalFeedback > 0 ? Math.round((completedCount / totalFeedback) * 100) : 0;

    document.getElementById('total-feedback').textContent = totalFeedback;
    document.getElementById('pending-feedback').textContent = pendingFeedback;
    document.getElementById('avg-rating').textContent = avgRating;
    document.getElementById('response-rate').textContent = responseRate + '%';

    updateCharts();
}

// Update charts
function updateCharts() {
    const categories = ['ATM', 'LOAN', 'ONLINE_BANKING', 'CUSTOMER_SUPPORT'];
    const avgRatings = categories.map(cat => {
        const catFeedback = allFeedback.filter(f => f.category === cat);
        return catFeedback.length ? (catFeedback.reduce((sum, f) => sum + f.rating, 0) / catFeedback.length).toFixed(2) : 0;
    });

    const statuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDED', 'RESOLVED', 'CLOSED'];
    const statusCounts = statuses.map(status => allFeedback.filter(f => f.status === status).length);

    // Rating chart
    if (ratingChart) ratingChart.destroy();
    const ratingCtx = document.getElementById('ratingChart');
    if (ratingCtx) {
        ratingChart = new Chart(ratingCtx, {
            type: 'bar',
            data: {
                labels: categories.map(c => c.replace(/_/g, ' ')),
                datasets: [{
                    label: 'Average Rating',
                    data: avgRatings,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 5 }
                }
            }
        });
    }

    // Status chart
    if (statusChart) statusChart.destroy();
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: statuses.map(status => status.replace(/_/g, ' ')),
                datasets: [{
                    data: statusCounts,
                    backgroundColor: ['#f4d35e', '#6c91bf', '#ee964b', '#7fb069', '#2a9d8f', '#7a7a7a'],
                    borderColor: ['#a47f00', '#355b86', '#a45100', '#436f31', '#16645b', '#444444'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Switch tabs
function switchTab(tab) {
    const section = document.getElementById('analytics-section');
    if (tab === 'dashboard') {
        section.style.display = 'none';
    } else {
        section.style.display = 'block';
    }
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[href="#${tab}"]`)?.classList.add('active');
    document.getElementById('staff-sidebar').classList.remove('open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', 'false');
}

// Show error
function showError(message) {
    const feedbackTbody = document.getElementById('feedback-tbody');
    feedbackTbody.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 9;
    cell.className = 'no-data';
    cell.textContent = message;
    row.appendChild(cell);
    feedbackTbody.appendChild(row);
}

function textCell(value) {
    const cell = document.createElement('td');
    cell.textContent = value || '';
    return cell;
}

function statusCell(value) {
    const cell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge status-${value.toLowerCase().replace(/_/g, '-')}`;
    badge.textContent = value.replace(/_/g, ' ');
    cell.appendChild(badge);
    return cell;
}

function assignmentCell(feedback) {
    const cell = document.createElement('td');
    cell.textContent = feedback.assignedStaff?.name || 'Unassigned';
    if (currentUser.role !== 'ADMIN' || staffMembers.length === 0) return cell;

    const select = document.createElement('select');
    select.setAttribute('aria-label', `Assign complaint ${feedback.complaintNumber}`);
    staffMembers.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.id;
        option.textContent = staff.name;
        option.selected = feedback.assignedStaff?.id === staff.id;
        select.appendChild(option);
    });
    const button = document.createElement('button');
    button.className = 'btn-view';
    button.textContent = 'Assign';
    button.addEventListener('click', () => assignFeedback(feedback.id, Number(select.value)));
    cell.append(select, button);
    return cell;
}

function actionCell(feedback) {
    const cell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    const viewButton = document.createElement('button');
    viewButton.className = 'btn-view';
    viewButton.textContent = 'View';
    viewButton.addEventListener('click', () => openResponseModal(feedback.id));
    actions.appendChild(viewButton);

    const nextStatus = {
        ASSIGNED: 'IN_PROGRESS',
        IN_PROGRESS: 'RESOLVED',
        RESPONDED: 'CLOSED',
        RESOLVED: 'CLOSED'
    }[feedback.status];
    if (nextStatus && (currentUser.role === 'ADMIN' || feedback.assignedStaff?.id === currentUser.id)) {
        const statusButton = document.createElement('button');
        statusButton.className = 'btn-view';
        statusButton.textContent = nextStatus.replace(/_/g, ' ');
        statusButton.addEventListener('click', () => updateFeedbackStatus(feedback.id, nextStatus));
        actions.appendChild(statusButton);
    }

    if (currentUser.role === 'ADMIN') {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-delete';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => openDeleteModal(feedback.id));
        actions.appendChild(deleteButton);
    }
    cell.appendChild(actions);
    return cell;
}