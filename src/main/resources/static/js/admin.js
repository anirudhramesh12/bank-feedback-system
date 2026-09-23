let allFeedback = [];
let filteredFeedback = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFeedbackId = null;
let ratingChart = null;
let statusChart = null;
let currentDeleteId = null;

document.addEventListener('DOMContentLoaded', function() {
    const filterBtn = document.getElementById('filter-btn');
    const resetBtn = document.getElementById('reset-btn');
    const exportBtn = document.getElementById('export-btn');
    const searchInput = document.getElementById('search-input');
    const modal = document.getElementById('response-modal');
    const deleteModal = document.getElementById('delete-modal');
    const closeBtn = document.querySelector('.close');
    const submitResponseBtn = document.getElementById('submit-response');
    const responseText = document.getElementById('response-text');
    const confirmDeleteBtn = document.getElementById('confirm-delete');

    // Load all feedback
    loadAllFeedback();

    // Filter button
    filterBtn.addEventListener('click', function() {
        currentPage = 1;
        applyFilters();
    });

    // Reset filters
    resetBtn.addEventListener('click', function() {
        document.getElementById('search-input').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('rating-filter').value = '';
        document.getElementById('status-filter').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        currentPage = 1;
        filteredFeedback = [...allFeedback];
        displayFeedback();
    });

    // Search in real-time
    searchInput.addEventListener('input', function() {
        currentPage = 1;
        applyFilters();
    });

    // Export data
    exportBtn.addEventListener('click', exportData);

    // Modal close
    closeBtn.addEventListener('click', closeResponseModal);

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeResponseModal();
        }
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // Submit response
    submitResponseBtn.addEventListener('click', submitResponse);

    // Confirm delete
    confirmDeleteBtn.addEventListener('click', confirmDelete);
});

// Load all feedback from API
function loadAllFeedback() {
    fetch('/api/feedback')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load feedback');
        return response.json();
    })
    .then(data => {
        allFeedback = data || [];
        filteredFeedback = [...allFeedback];
        displayFeedback();
        updateAnalytics();
    })
    .catch(error => {
        console.error('Error loading feedback:', error);
        showError('Failed to load feedback. Please try again.');
    });
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const rating = document.getElementById('rating-filter').value;
    const status = document.getElementById('status-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;

    filteredFeedback = allFeedback.filter(feedback => {
        const matchSearch = !searchTerm || 
            feedback.user.name.toLowerCase().includes(searchTerm) ||
            feedback.comments.toLowerCase().includes(searchTerm);
        
        const matchCategory = !category || feedback.category === category;
        const matchRating = !rating || feedback.rating === parseInt(rating);
        const matchStatus = !status || feedback.status === status;
        
        let matchDate = true;
        if (dateFrom || dateTo) {
            const feedbackDate = new Date(feedback.createdAt).toDateString();
            if (dateFrom && new Date(dateFrom) > new Date(feedbackDate)) matchDate = false;
            if (dateTo && new Date(dateTo) < new Date(feedbackDate)) matchDate = false;
        }

        return matchSearch && matchCategory && matchRating && matchStatus && matchDate;
    });

    displayFeedback();
}

// Display feedback with pagination
function displayFeedback() {
    const feedbackTbody = document.getElementById('feedback-tbody');
    
    if (filteredFeedback.length === 0) {
        feedbackTbody.innerHTML = '<tr><td colspan="7" class="no-data">No feedback found</td></tr>';
        updatePagination();
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedFeedback = filteredFeedback.slice(start, end);

    feedbackTbody.innerHTML = '';
    paginatedFeedback.forEach(feedback => {
        const row = document.createElement('tr');
        const stars = '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);
        const statusClass = feedback.status === 'PENDING' ? 'status-pending' : 'status-responded';
        const createdDate = new Date(feedback.createdAt).toLocaleDateString();
        
        row.innerHTML = `
            <td><strong>${feedback.user.name}</strong></td>
            <td>${feedback.category.replace(/_/g, ' ')}</td>
            <td><span title="${feedback.rating}/5">${stars}</span></td>
            <td>${feedback.comments.substring(0, 50)}...</td>
            <td><span class="status-badge ${statusClass}">${feedback.status}</span></td>
            <td>${createdDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="openResponseModal(${feedback.id})">View</button>
                    <button class="btn-delete" onclick="openDeleteModal(${feedback.id})">Delete</button>
                </div>
            </td>
        `;
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
        
        feedbackDetails.innerHTML = `
            <p><strong>Customer:</strong> ${feedback.user.name} (${feedback.user.email})</p>
            <p><strong>Category:</strong> ${feedback.category.replace(/_/g, ' ')}</p>
            <p><strong>Rating:</strong> ${stars} (${feedback.rating}/5)</p>
            <p><strong>Date:</strong> ${createdDate}</p>
            <p><strong>Comments:</strong></p>
            <p>${feedback.comments}</p>
        `;

        // Load response history
        loadResponseHistory(feedbackId);
        document.getElementById('response-modal').style.display = 'block';
        document.getElementById('response-text').value = '';
    }
}

// Load response history
function loadResponseHistory(feedbackId) {
    const responseHistory = document.getElementById('response-history');
    responseHistory.innerHTML = '<p style="text-align:center; color:#999;">Loading responses...</p>';

    fetch(`/api/feedback/${feedbackId}/responses`)
    .then(response => response.json())
    .then(data => {
        if (!data || data.length === 0) {
            responseHistory.innerHTML = '<p style="color:#999;">No responses yet</p>';
        } else {
            responseHistory.innerHTML = '<h4>Response History:</h4>';
            data.forEach(response => {
                const responseDate = new Date(response.createdAt).toLocaleString();
                const responseItem = document.createElement('div');
                responseItem.className = 'response-item';
                responseItem.innerHTML = `
                    <div class="admin-name">Admin: ${response.admin.name}</div>
                    <div class="response-date">${responseDate}</div>
                    <p>${response.responseText}</p>
                `;
                responseHistory.appendChild(responseItem);
            });
        }
    })
    .catch(error => console.error('Error loading responses:', error));
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

    const responseData = {
        feedbackId: currentFeedbackId,
        adminId: 1,
        responseText: responseTextArea.value
    };

    fetch('/api/feedback/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to submit response');
        return response.json();
    })
    .then(data => {
        alert('Response submitted successfully!');
        closeResponseModal();
        loadAllFeedback();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error submitting response: ' + error.message);
    });
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

    fetch(`/api/feedback/${currentDeleteId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to delete feedback');
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

    let csv = 'Customer,Email,Category,Rating,Comments,Status,Date\n';
    filteredFeedback.forEach(feedback => {
        const createdDate = new Date(feedback.createdAt).toLocaleDateString();
        csv += `"${feedback.user.name}","${feedback.user.email}","${feedback.category}",${feedback.rating},"${feedback.comments.replace(/"/g, '""')}","${feedback.status}","${createdDate}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_export_' + new Date().getTime() + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Update analytics
function updateAnalytics() {
    const totalFeedback = allFeedback.length;
    const pendingFeedback = allFeedback.filter(f => f.status === 'PENDING').length;
    const avgRating = totalFeedback > 0 ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback).toFixed(2) : 0;
    const responseRate = totalFeedback > 0 ? Math.round(((totalFeedback - pendingFeedback) / totalFeedback) * 100) : 0;

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

    const statusCounts = {
        PENDING: allFeedback.filter(f => f.status === 'PENDING').length,
        RESPONDED: allFeedback.filter(f => f.status === 'RESPONDED').length
    };

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
                labels: ['Pending', 'Responded'],
                datasets: [{
                    data: [statusCounts.PENDING, statusCounts.RESPONDED],
                    backgroundColor: ['#fff3cd', '#d4edda'],
                    borderColor: ['#856404', '#155724'],
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
    const section = document.getElementById(tab === 'dashboard' ? 'analytics-section' : 'analytics-section');
    if (tab === 'dashboard') {
        section.style.display = 'none';
    } else {
        section.style.display = 'block';
    }
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.classList.add('active');
}

// Show error
function showError(message) {
    const feedbackTbody = document.getElementById('feedback-tbody');
    feedbackTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">${message}</td></tr>`;
}