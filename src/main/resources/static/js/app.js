let allFeedback = [];
let userFeedback = [];
let currentUser = null;
let registrationMode = false;

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
    document.getElementById('auth-form').addEventListener('submit', submitAuthForm);
    document.getElementById('auth-toggle').addEventListener('click', toggleRegistrationMode);
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('nav-toggle').addEventListener('click', toggleCustomerNav);
    initializeCustomerApp();
});

async function initializeCustomerApp() {
    try {
        currentUser = await BankApi.get('/api/auth/me');
        if (currentUser.role !== 'CUSTOMER') {
            window.location.replace('/admin.html');
            return;
        }
        document.getElementById('auth-screen').hidden = true;
        document.getElementById('app-shell').hidden = false;
        document.getElementById('customer-name').textContent = `Welcome, ${currentUser.name}!`;
        document.getElementById('name').value = currentUser.name;
        document.getElementById('profile-info').textContent = `${currentUser.name} · ${currentUser.email}`;
        setupEventListeners();
        await loadAllFeedback();
    } catch (error) {
        document.getElementById('auth-screen').hidden = false;
        document.getElementById('app-shell').hidden = true;
    }
}

function toggleRegistrationMode() {
    registrationMode = !registrationMode;
    const registerFields = document.getElementById('register-fields');
    registerFields.hidden = !registrationMode;
    document.getElementById('auth-name').required = registrationMode;
    document.getElementById('auth-password').autocomplete = registrationMode ? 'new-password' : 'current-password';
    document.getElementById('auth-description').textContent = registrationMode
        ? 'Create your customer account' : 'Sign in to manage your feedback';
    document.getElementById('auth-submit').textContent = registrationMode ? 'Create account' : 'Sign in';
    document.getElementById('auth-toggle').textContent = registrationMode
        ? 'Already registered? Sign in' : 'Create a customer account';
    document.getElementById('auth-error').textContent = '';
}

async function submitAuthForm(event) {
    event.preventDefault();
    const error = document.getElementById('auth-error');
    error.textContent = '';
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    try {
        if (registrationMode) {
            await BankApi.post('/api/auth/register', {
                name: document.getElementById('auth-name').value.trim(), email, password
            });
        }
        const user = await BankApi.post('/api/auth/login', { email, password });
        if (user.role === 'CUSTOMER') {
            currentUser = user;
            await initializeCustomerApp();
        } else {
            window.location.replace('/admin.html');
        }
    } catch (requestError) {
        error.textContent = requestError.message;
    }
}

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
            document.getElementById('customer-sidebar').classList.remove('open');
            document.getElementById('nav-toggle').setAttribute('aria-expanded', 'false');
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

async function loadAllFeedback() {
    try {
        const [mine, community] = await Promise.all([
            BankApi.get('/api/feedback/mine'),
            BankApi.get('/api/feedback/community')
        ]);
        userFeedback = mine || [];
        allFeedback = community || [];
        displayAllFeedback();
        displayMyFeedback();
        updateStatistics();
    } catch (error) {
        console.error('Error loading feedback:', error);
        showToast('Error loading feedback', 'error');
    }
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
    confirmDetails.replaceChildren();
    [
        `Name: ${name}`,
        `Category: ${categoryLabels[category]}`,
        `Rating: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`,
        `Comments: ${comments.substring(0, 100)}${comments.length > 100 ? '...' : ''}`
    ].forEach(text => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        confirmDetails.appendChild(paragraph);
    });
    document.getElementById('confirmation-modal').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('confirmation-modal').classList.remove('show');
}

async function submitFeedback() {
    const formData = {
        category: document.getElementById('category').value,
        rating: parseInt(document.getElementById('rating').value),
        comments: document.getElementById('comments').value
    };

    try {
        const created = await BankApi.post('/api/feedback', formData);
        showToast('✓ Feedback submitted successfully!', 'success');
        closeConfirmModal();
        document.getElementById('feedback-form').reset();
        document.getElementById('name').value = currentUser.name;
        updateStarDisplay(0);
        document.getElementById('char-count').textContent = '0';
        document.getElementById('category-help').textContent = '';
        await loadAllFeedback();
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Error submitting feedback. Please try again.', 'error');
    }
}

function displayMyFeedback() {
    const myFeedbackList = document.getElementById('my-feedback-list');
    
    if (userFeedback.length === 0) {
        showEmptyState(myFeedbackList, 'You haven\'t submitted any feedback yet');
        return;
    }

    renderFeedbackCards(myFeedbackList, userFeedback, true);
}

function displayAllFeedback() {
    const allFeedbackList = document.getElementById('all-feedback-list');
    
    if (allFeedback.length === 0) {
        showEmptyState(allFeedbackList, 'No feedback available yet');
        return;
    }

    renderFeedbackCards(allFeedbackList,
        [...allFeedback].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), false);
}

function createFeedbackCard(feedback, isOwn) {
    const card = document.createElement('article');
    card.className = 'feedback-card';
    const header = document.createElement('div');
    header.className = 'feedback-header';
    const details = document.createElement('div');
    const customer = document.createElement('div');
    customer.className = 'feedback-customer';
    customer.textContent = isOwn ? currentUser.name : 'Bank customer';
    const category = document.createElement('span');
    category.className = 'feedback-category';
    category.textContent = categoryLabels[feedback.category] || feedback.category;
    details.append(customer, category);
    const date = document.createElement('div');
    date.className = 'feedback-date';
    date.textContent = new Date(feedback.createdAt).toLocaleDateString();
    header.append(details, date);

    const complaint = document.createElement('p');
    complaint.className = 'feedback-date';
    complaint.textContent = `Complaint ${feedback.complaintNumber || ''}`;
    const rating = document.createElement('div');
    rating.className = 'feedback-rating';
    rating.textContent = '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);
    const comments = document.createElement('div');
    comments.className = 'feedback-comments';
    comments.textContent = feedback.comments || '';
    const status = document.createElement('span');
    status.className = `feedback-status ${feedback.status === 'PENDING' ? 'status-pending' : 'status-responded'}`;
    status.textContent = feedback.status.replace(/_/g, ' ');
    card.append(header, complaint, rating, comments, status);
    return card;
}

function showEmptyState(container, message) {
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent = message;
    container.replaceChildren(placeholder);
}

function renderFeedbackCards(container, feedback, isOwn) {
    container.replaceChildren(...feedback.map(item => createFeedbackCard(item, isOwn)));
}

function filterMyFeedback() {
    const searchTerm = document.getElementById('my-search').value.toLowerCase();
    const filtered = userFeedback.filter(f => 
        f.comments.toLowerCase().includes(searchTerm) ||
        f.category.toLowerCase().includes(searchTerm)
    );
    
    const myFeedbackList = document.getElementById('my-feedback-list');
    if (filtered.length === 0) {
        showEmptyState(myFeedbackList, 'No matching feedback found');
    } else {
        renderFeedbackCards(myFeedbackList, filtered, true);
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

    renderFeedbackCards(document.getElementById('my-feedback-list'), sorted, true);
}

function filterAllFeedback() {
    const category = document.getElementById('community-filter').value;
    const filtered = category ? allFeedback.filter(f => f.category === category) : allFeedback;
    
    const allFeedbackList = document.getElementById('all-feedback-list');
    if (filtered.length === 0) {
        showEmptyState(allFeedbackList, 'No feedback in this category');
    } else {
        renderFeedbackCards(allFeedbackList, filtered, false);
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

    renderFeedbackCards(document.getElementById('all-feedback-list'), sorted, false);
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
    BankApi.post('/api/auth/logout', {}).finally(() => window.location.replace('/'));
}

function toggleCustomerNav() {
    const sidebar = document.getElementById('customer-sidebar');
    const isOpen = sidebar.classList.toggle('open');
    document.getElementById('nav-toggle').setAttribute('aria-expanded', String(isOpen));
}