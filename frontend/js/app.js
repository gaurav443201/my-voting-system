/**
 * VIT-ChainVote Frontend Application Logic
 * Handles authentication, API communication, and UI interactions
 */

// Use API_URL from config.js (already loaded)
// No need to declare it again - config.js already sets window.CONFIG.API_URL

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
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
            const state = data.state.toUpperCase();

            statusBadge.className = `status-badge status-${data.state}`;

            const icons = {
                'waiting': '⏸️',
                'live': '🔴',
                'closed': '🔒'
            };

            statusBadge.textContent = `${icons[data.state] || ''} ${state}`;
        }
    } catch (error) {
        console.error('Error fetching election state:', error);
    }
}

// Update status every 3 seconds
setInterval(updateElectionStatus, 3000);
updateElectionStatus();

// ============================================================================
// ADMIN LOGIN
// ============================================================================

function showAdminLogin() {
    showModal('adminLoginModal');
}

document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();

    try {
        const response = await fetch(`${window.CONFIG.API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            // Store admin session
            localStorage.setItem('adminEmail', email);

            // Redirect to admin dashboard
            window.location.href = 'admin.html';
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// ============================================================================
// VOTER LOGIN
// ============================================================================

function showVoterLogin() {
    showModal('voterLoginModal');
}

document.getElementById('voterLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('voterEmail').value.trim().toLowerCase();
    const department = document.getElementById('voterDepartment').value;

    if (!email || !department) {
        alert('❌ Please fill in all fields');
        return;
    }

    // Validate VIT email format
    const vitEmailPattern = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@vit\.edu$/;
    if (!vitEmailPattern.test(email)) {
        alert('❌ Invalid VIT email format. Use: name.prn@vit.edu');
        return;
    }

    try {
        const response = await fetch(`${window.CONFIG.API_URL}/voter/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, department })
        });

        const data = await response.json();

        if (data.success) {
            // Store voter session
            localStorage.setItem('voterEmail', email);
            localStorage.setItem('voterDepartment', department);

            // Close login modal and show OTP modal
            closeModal('voterLoginModal');
            showModal('otpModal');

            alert('✅ OTP sent to your email! Check your inbox.');
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// ============================================================================
// OTP VERIFICATION
// ============================================================================

document.getElementById('otpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = localStorage.getItem('voterEmail');
    const otp = document.getElementById('otpCode').value.trim();

    if (!otp || otp.length !== 6) {
        alert('❌ Please enter a valid 6-digit OTP');
        return;
    }

    try {
        const response = await fetch(`${window.CONFIG.API_URL}/voter/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (data.success) {
            // Redirect to voter page
            window.location.href = 'voter.html';
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});
