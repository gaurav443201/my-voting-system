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

// Utility
window.toggleCustomTitle = function (val) {
    const group = document.getElementById('customTitleGroup');
    if (group) {
        if (val === 'CUSTOM') {
            group.classList.remove('hidden');
            document.getElementById('adminCustomTitle').focus();
        } else {
            group.classList.add('hidden');
        }
    }
};

window.showModal = function (id) {
    document.getElementById(id).classList.remove('hidden');
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
            // Update Title Display
            if (data.title) {
                const navLogo = document.getElementById('navLogo');
                const mainTitle = document.getElementById('mainTitle');
                const pageTitle = document.getElementById('pageTitle');

                if (navLogo) navLogo.textContent = `🗳️ VIT-ChainVote`;
                if (mainTitle) mainTitle.textContent = data.title;
                if (pageTitle) pageTitle.textContent = `⚡ ${data.title}`;

                const avTitle = document.getElementById('alreadyVotedTitle');
                if (avTitle) avTitle.textContent = `Participated in ${data.title}`;
            }

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
        const statusBadge = document.getElementById('electionStatus');
        if (statusBadge && statusBadge.textContent.includes('Loading')) {
            statusBadge.className = 'status-badge status-closed';
            statusBadge.textContent = '❌ Connection Error';
        }
    }
}

// Update status every 3 seconds
setInterval(updateElectionStatus, 3000);
document.addEventListener('DOMContentLoaded', updateElectionStatus);

// ============================================================================
// ADMIN LOGIN
// ============================================================================

// ============================================================================
// LOADING UTILS
// ============================================================================

function showGlobalLoader(text) {
    const loader = document.getElementById('globalLoader');
    const loaderText = document.getElementById('loaderText');
    if (loader && loaderText) {
        loaderText.textContent = text;
        loader.classList.remove('hidden');
    }
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.add('hidden');
}

// ============================================================================
// ADMIN LOGIN
// ============================================================================

document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ Connecting...";
    }

    showGlobalLoader('Authenticating Shadow Admin...');

    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const type = document.getElementById('adminElectionType').value;
    const custom = document.getElementById('adminCustomTitle').value.trim();
    const title = type === 'CUSTOM' ? custom : type;

    if (!email || (type === 'CUSTOM' && !custom)) {
        alert('❌ Please fill in all fields');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
        hideGlobalLoader();
        return;
    }

    try {
        const response = await fetch(`${window.CONFIG.API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, title })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('pendingAdminEmail', email);
            window.closeModal('adminLoginModal');

            // Configure OTP Modal for Admin
            const otpModal = document.getElementById('otpModal');
            otpModal.querySelector('.modal-title').textContent = "🔐 Admin Verification";
            const otpText = otpModal.querySelector('p');
            otpText.textContent = data.message;
            document.getElementById('otpForm').dataset.type = 'admin';

            window.showModal('otpModal');
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
        hideGlobalLoader();
    }
});

// ============================================================================
// VOTER LOGIN
// ============================================================================

// ============================================================================
// VOTER LOGIN
// ============================================================================

document.getElementById('voterLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ Sending OTP...";
    }
    showGlobalLoader('Verifying Voter & Sending OTP...');

    const email = document.getElementById('voterEmail').value.trim().toLowerCase();
    const department = document.getElementById('voterDepartment').value;

    if (!email || !department) {
        alert('❌ Please fill in all fields');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
        hideGlobalLoader();
        return;
    }

    // Validate email format (Allow vit.edu and gmail.com for testing)
    const emailPattern = /^[a-zA-Z0-9._%+-]+@(vit\.edu|gmail\.com)$/;
    if (!emailPattern.test(email)) {
        alert('❌ Invalid email. Use: name.prn@vit.edu or gmail for testing.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
        hideGlobalLoader();
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
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
        hideGlobalLoader();
    }
});

// ============================================================================
// OTP VERIFICATION (Unified Flow)
// ============================================================================

document.getElementById('otpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ Verifying...";
    }
    showGlobalLoader('Verifying Code...');

    const otp = document.getElementById('otpCode').value.trim();
    const type = e.target.dataset.type; // 'admin' or 'voter'

    if (!otp || otp.length !== 6) {
        alert('❌ Please enter a valid 6-digit OTP');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
        hideGlobalLoader();
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
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
        hideGlobalLoader();
    }
});
