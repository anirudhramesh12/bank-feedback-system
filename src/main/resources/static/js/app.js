let allFeedback = [];
let userFeedback = [];
const currentUserId = 2; // Default customer user ID
let currentUser = null;

const categoryHelp = {
    'ATM': '🏧 Share your experience with ATM services including availability, functionality, and user interface.',
    'LOAN': '💰 Tell us about our loan services, application process, terms, or customer support.',
    'ONLINE_BANKING': '💻 Feedback about our website, mobile app, features, and online transaction experience.',
    'CUSTOMER_SUPPORT': '📞 Share your experience with our customer service team and support channels.'
};

const categoryLabels = {
    'ATM': '🏧 ATM Services',
    'LOAN': '💰 Loan Services',
    'ONLINE_BANKING': '💻 Online Banking',
    'CUSTOMER_SUPPORT': '📞 Customer Support'
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    loadUserData();
    loadAllFeedback();
    setupEventListeners();
    updateStatistics();
    
    // Set user ID to logged-in user
    document.getElementById('user-id').value = currentUserId;
});

function setupEventListeners() {
    const form = document.getElementById('feedback-form');
    const categorySelect = document.getElementById('category');
    const ratingStars = document.querySelectorAll('.star');
    const commentsTextarea = document.getElementById('comments');
    const nameInput = document.getElementById('name');
    const confirmBtn = document.getElementById('confirm-btn');

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm()) {
            showConfirmationModal();
        }
    });

    // Star rating
    ratingStars.forEach(star => {
        star.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            setRating(value);
        });
        star.addEventListener('mouseover', function() {
            const value = this.getAttribute('data-value');
            hoverStars(value);
        });
    });
    
    document.querySelector('.stars').addEventListener('mouseleave', function() {
        const currentRating = document.getElementById('rating').value;
        updateStarDisplay(currentRating || 0);
    });

    // Category help text
    categorySelect.addEventListener('change', function() {
        const helpText = categoryHelp[this.value] || '';
        document.getElementById('category-help').textContent = helpText;
    });

    // Character counter
    commentsTextarea.addEventListener('input', function() {
        document.getElementById('char-count').textContent = this.value.length;
    });

    // Name validation
    nameInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            showError('name', 'Please enter your name');
        } else {
            clearError('name');
        }
    });

    // Section switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.textContent.trim();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Search and filter
    document.getElementById('my-search').addEventListener('input', function() {
        filterMyFeedback();
    });

    document.getElementById('my-sort').addEventListener('change', function() {
        sortAndDisplayMyFeedback();
    });

    document.getElementById('community-filter').addEventListener('change', function() {
        filterAllFeedback();
    });

    document.getElementById('community-sort').addEventListener('change', function() {
        sortAndDisplayAllFeedback();
    });

    // Confirm submission
    confirmBtn.addEventListener('click', function() {
        submitFeedback();
    });
}

function loadUserData() {
    // In a real app, this would fetch from API
    currentUser = {
        id: currentUserId,
        name: 'Jane Doe',
        email: 'jane@example.com'
    };
    document.getElementById('customer-name').textContent = `Welcome, ${currentUser.name}!`;
}

function loadAllFeedback() {
    fetch('/api/feedback')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load feedback');
        return response.json();
    })
    .then(data => {
        allFeedback = data || [];
        userFeedback = allFeedback.filter(f => f.user.id === currentUserId);
        displayAllFeedback();
        displayMyFeedback();
        updateStatistics();
    })
    .catch(error => {
        console.error('Error loading feedback:', error);
        showToast('Error loading feedback', 'error');
    });
}

function validateForm() {
    let isValid = true;

    const name = document.getElementById('name').value.trim();
    if (!name) {
        showError('name', 'Name is required');
        isValid = false;
    } else {
        clearError('name');
    }

    const category = document.getElementById('category').value;
    if (!category) {
        showError('category', 'Please select a category');
        isValid = false;
    } else {
        clearError('category');
    }

    const rating = document.getElementById('rating').value;
    if (!rating) {
        showError('rating', 'Please select a rating');
        isValid = false;
    } else {
        clearError('rating');
    }

    const comments = document.getElementById('comments').value.trim();
    if (!comments) {
        showError('comments', 'Please enter your feedback comments');
        isValid = false;
    } else if (comments.length < 10) {
        showError('comments', 'Comments should be at least 10 characters');
        isValid = false;
    } else {
        clearError('comments');
    }

    return isValid;
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + '-error');
    field.classList.add('error');
    errorEl.textContent = message;
    errorEl.classList.add('show');
}

function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + '-error');
    field.classList.remove('error');
    errorEl.classList.remove('show');
}

function setRating(value) {
    document.getElementById('rating').value = value;
    updateStarDisplay(value);
    clearError('rating');
}

function hoverStars(value) {
    document.querySelectorAll('.star').forEach(star => {
        if (star.getAttribute('data-value') <= value) {
            star.classList.add('hover');
        } else {
            star.classList.remove('hover');
        }
    });
}

function updateStarDisplay(value) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        if (star.getAttribute('data-value') <= value) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });

    const ratingTexts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    document.getElementById('rating-text').textContent = ratingTexts[value] || 'Select a rating';
}

function showConfirmationModal() {
    const name = document.getElementById('name').value;
    const category = document.getElementById('category').value;
    const rating = document.getElementById('rating').value;
    const comments = document.getElementById('comments').value;

    const confirmDetails = document.getElementById('confirm-details');
    confirmDetails.innerHTML = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Category:</strong> ${categoryLabels[category]}</p>
        <p><strong>Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5-rating)} (${rating}/5)</p>
        <p><strong>Comments:</strong> ${comments.substring(0, 100)}${comments.length > 100 ? '...' : ''}</p>
    `;
    document.getElementById('confirmation-modal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirmation-modal').classList.remove('show');
}

function submitFeedback() {
    const formData = {
        userId: parseInt(document.getElementById('user-id').value),
        category: document.getElementById('category').value,
        rating: parseInt(document.getElementById('rating').value),
        comments: document.getElementById('comments').value
    };

    fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to submit feedback');
        return response.json();
    })
    .then(data => {
        showToast('✓ Feedback submitted successfully!', 'success');
        closeConfirmModal();
        document.getElementById('feedback-form').reset();
        updateStarDisplay(0);
        document.getElementById('char-count').textContent = '0';
        document.getElementById('category-help').textContent = '';
        loadAllFeedback();
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error submitting feedback. Please try again.', 'error');
    });
}

function displayMyFeedback() {
    const myFeedbackList = document.getElementById('my-feedback-list');
    
    if (userFeedback.length === 0) {
        myFeedbackList.innerHTML = '<p class="placeholder">You haven\'t submitted any feedback yet</p>';
        return;
    }

    myFeedbackList.innerHTML = userFeedback.map(fb => createFeedbackCard(fb, true)).join('');
}

function displayAllFeedback() {
    const allFeedbackList = document.getElementById('all-feedback-list');
    
    if (allFeedback.length === 0) {
        allFeedbackList.innerHTML = '<p class="placeholder">No feedback available yet</p>';
        return;
    }

    allFeedbackList.innerHTML = allFeedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(fb => createFeedbackCard(fb, false)).join('');
}

function createFeedbackCard(feedback, isOwn) {
    const createdDate = new Date(feedback.createdAt).toLocaleDateString();
    const stars = '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);
    const statusClass = feedback.status === 'PENDING' ? 'status-pending' : 'status-responded';
    const statusText = feedback.status === 'PENDING' ? '⏳ Pending Response' : '✓ Responded';

    return `
        <div class="feedback-card">
            <div class="feedback-header">
                <div>
                    <div class="feedback-customer">${feedback.user.name}</div>
                    <span class="feedback-category">${categoryLabels[feedback.category]}</span>
                </div>
                <div class="feedback-date">${createdDate}</div>
            </div>
            <div class="feedback-rating">${stars}</div>
            <div class="feedback-comments">${feedback.comments}</div>
            <span class="feedback-status ${statusClass}">${statusText}</span>
        </div>
    `;
}

function filterMyFeedback() {
    const searchTerm = document.getElementById('my-search').value.toLowerCase();
    const filtered = userFeedback.filter(f => 
        f.comments.toLowerCase().includes(searchTerm) ||
        f.category.toLowerCase().includes(searchTerm)
    );
    
    const myFeedbackList = document.getElementById('my-feedback-list');
    if (filtered.length === 0) {
        myFeedbackList.innerHTML = '<p class="placeholder">No matching feedback found</p>';
    } else {
        myFeedbackList.innerHTML = filtered.map(fb => createFeedbackCard(fb, true)).join('');
    }
}

function sortAndDisplayMyFeedback() {
    const sortBy = document.getElementById('my-sort').value;
    let sorted = [...userFeedback];

    switch(sortBy) {
        case 'latest':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'highest-rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'lowest-rating':
            sorted.sort((a, b) => a.rating - b.rating);
            break;
    }

    document.getElementById('my-feedback-list').innerHTML = sorted.map(fb => createFeedbackCard(fb, true)).join('');
}

function filterAllFeedback() {
    const category = document.getElementById('community-filter').value;
    const filtered = category ? allFeedback.filter(f => f.category === category) : allFeedback;
    
    const allFeedbackList = document.getElementById('all-feedback-list');
    if (filtered.length === 0) {
        allFeedbackList.innerHTML = '<p class="placeholder">No feedback in this category</p>';
    } else {
        allFeedbackList.innerHTML = filtered.map(fb => createFeedbackCard(fb, false)).join('');
    }
}

function sortAndDisplayAllFeedback() {
    const sortBy = document.getElementById('community-sort').value;
    const category = document.getElementById('community-filter').value;
    let sorted = category ? allFeedback.filter(f => f.category === category) : [...allFeedback];

    switch(sortBy) {
        case 'latest':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'highest-rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
    }

    document.getElementById('all-feedback-list').innerHTML = sorted.map(fb => createFeedbackCard(fb, false)).join('');
}

function updateStatistics() {
    const allCount = allFeedback.length;
    const allAvgRating = allCount > 0 ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / allCount).toFixed(1) : 0;
    
    // Find most rated category
    let categoryRatings = {};
    allFeedback.forEach(f => {
        if (!categoryRatings[f.category]) categoryRatings[f.category] = { count: 0, sum: 0 };
        categoryRatings[f.category].count++;
        categoryRatings[f.category].sum += f.rating;
    });
    
    let topCategory = '-';
    let maxCount = 0;
    Object.keys(categoryRatings).forEach(cat => {
        if (categoryRatings[cat].count > maxCount) {
            maxCount = categoryRatings[cat].count;
            topCategory = categoryLabels[cat] || cat;
        }
    });

    document.getElementById('total-count').textContent = allCount;
    document.getElementById('avg-rating').textContent = allAvgRating;
    document.getElementById('top-category').textContent = topCategory;

    // Profile stats
    const userCount = userFeedback.length;
    const userAvg = userCount > 0 ? (userFeedback.reduce((sum, f) => sum + f.rating, 0) / userCount).toFixed(1) : 0;
    
    let userCategories = {};
    userFeedback.forEach(f => {
        userCategories[f.category] = (userCategories[f.category] || 0) + 1;
    });
    let userTopCat = '-';
    let userMaxCount = 0;
    Object.keys(userCategories).forEach(cat => {
        if (userCategories[cat] > userMaxCount) {
            userMaxCount = userCategories[cat];
            userTopCat = categoryLabels[cat] || cat;
        }
    });

    const userResponses = userFeedback.filter(f => f.status === 'RESPONDED').length;

    document.getElementById('profile-total').textContent = userCount;
    document.getElementById('profile-avg').textContent = userAvg;
    document.getElementById('profile-category').textContent = userTopCat;
    document.getElementById('profile-responses').textContent = userResponses;
}

function switchSection(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Show selected section
    switch(section) {
        case 'form':
            document.getElementById('form-section').classList.add('active');
            break;
        case 'history':
            document.getElementById('history-section').classList.add('active');
            break;
        case 'all':
            document.getElementById('all-section').classList.add('active');
            break;
        case 'profile':
            document.getElementById('profile-section').classList.add('active');
            break;
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Redirect to login page or refresh
        location.href = '/';
    }
}