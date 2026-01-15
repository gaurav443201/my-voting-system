/**
 * VIT-ChainVote Frontend Application Logic
 * Handles authentication, API communication, and UI interactions
 */

// Use API_URL from config.js (already loaded)
// No need to declare it again - config.js already sets window.CONFIG.API_URL

// ============================================================================
// UTILITY FUNCTIONS (Global Scope)
// ============================================================================

window.closeModal = function (modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

window.showModal = function (modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

window.showAdminLogin = function () {
    window.showModal('adminLoginModal');
}

window.showVoterLogin = function () {
    window.showModal('voterLoginModal');
}

// ============================================================================
// ELECTION STATE MONITORING
// ============================================================================

async function updateElectionStatus() {
    try {
        const response = await fetch(`${window.CONFIG.API_URL}/election/state`);
        const data = await response.json();

        if (data.success) {
            const statusBadge = document.getElementById('electionStatus');
            if (statusBadge) {
                const state = data.state.toUpperCase();
                statusBadge.className = `status-badge status-${data.state}`;
                const icons = { 'waiting': '⏸️', 'live': '🔴', 'closed': '🔒' };
                statusBadge.textContent = `${icons[data.state] || ''} ${state}`;
            }
        }
    } catch (error) {
        console.error('Error fetching election state:', error);
    }
}

// Update status every 3 seconds
setInterval(updateElectionStatus, 3000);
document.addEventListener('DOMContentLoaded', updateElectionStatus);

// ============================================================================
// ADMIN LOGIN
// ============================================================================

document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const email = document.getElementById('adminEmail').value.trim();

    try {
        const response = await fetch(`${window.CONFIG.API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('pendingAdminEmail', email);
            window.closeModal('adminLoginModal');

            // Configure OTP Modal for Admin
            const otpModal = document.getElementById('otpModal');
            otpModal.querySelector('.modal-title').textContent = "🔐 Admin Verification";
            // Reset modal text and message
            const otpText = otpModal.querySelector('p');
            otpText.textContent = data.message;
            document.getElementById('otpForm').dataset.type = 'admin';

            window.showModal('otpModal');
        } else {
            alert('❌ ' + data.message);
            if (submitBtn) submitBtn.disabled = false;
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
        if (submitBtn) submitBtn.disabled = false;
    }
});

// ============================================================================
// VOTER LOGIN
// ============================================================================

document.getElementById('voterLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const email = document.getElementById('voterEmail').value.trim().toLowerCase();
    const department = document.getElementById('voterDepartment').value;

    if (!email || !department) {
        alert('❌ Please fill in all fields');
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    // Validate VIT email format
    const vitEmailPattern = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@vit\.edu$/;
    if (!vitEmailPattern.test(email)) {
        alert('❌ Invalid VIT email format. Use: name.prn@vit.edu');
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    try {
        const response = await fetch(`${window.CONFIG.API_URL}/voter/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, department })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('voterEmail', email);
            localStorage.setItem('voterDepartment', department);
            window.closeModal('voterLoginModal');

            // Configure OTP Modal for Voter
            const otpModal = document.getElementById('otpModal');
            otpModal.querySelector('.modal-title').textContent = "📧 Enter OTP";
            const otpText = otpModal.querySelector('p');
            otpText.textContent = data.message;
            document.getElementById('otpForm').dataset.type = 'voter';

            window.showModal('otpModal');
        } else {
            alert('❌ ' + data.message);
            if (submitBtn) submitBtn.disabled = false;
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
        if (submitBtn) submitBtn.disabled = false;
    }
});

// ============================================================================
// OTP VERIFICATION (Unified Flow)
// ============================================================================

document.getElementById('otpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const otp = document.getElementById('otpCode').value.trim();
    const type = e.target.dataset.type; // 'admin' or 'voter'

    if (!otp || otp.length !== 6) {
        alert('❌ Please enter a valid 6-digit OTP');
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    const endpoint = type === 'admin' ? '/admin/verify-otp' : '/voter/verify-otp';
    const emailKey = type === 'admin' ? 'pendingAdminEmail' : 'voterEmail';
    const email = localStorage.getItem(emailKey);

    try {
        const response = await fetch(`${window.CONFIG.API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (data.success) {
            if (type === 'admin') {
                localStorage.setItem('adminEmail', email);
                localStorage.removeItem('pendingAdminEmail');
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'voter.html';
            }
        } else {
            alert('❌ ' + data.message);
            if (submitBtn) submitBtn.disabled = false;
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
        if (submitBtn) submitBtn.disabled = false;
    }
});
