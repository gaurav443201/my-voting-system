// Admin Dashboard Logic

const API_URL = window.CONFIG.API_URL;
let adminEmail = localStorage.getItem('adminEmail');

// Check authentication
if (!adminEmail) {
    window.location.href = 'index.html';
}

// Update UI with admin email
document.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById('adminEmail');
    if (emailDisplay) emailDisplay.textContent = adminEmail;

    // Load initial data
    loadElectionState();
    loadCandidates();
    setInterval(loadElectionState, 3000);
});

// Utility Functions
function showLoader(text = 'Processing...') {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        document.getElementById('loaderText').textContent = text;
        loader.classList.remove('hidden');
    }
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.add('hidden');
}

function setBtnLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.classList.add('btn-loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

// Candidate Registration Form
document.getElementById('candidateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('candidateName').value.trim();
    const department = document.getElementById('candidateDepartment').value;
    const submitBtn = document.getElementById('regBtn'); // Fixed ID reference

    if (!name || !department) {
        alert('❌ Please fill in all fields');
        return;
    }

    setBtnLoading('regBtn', true);
    showLoader('Gemini AI is generating a professional manifesto...');

    try {
        const response = await fetch(`${API_URL}/admin/candidate/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_email: adminEmail, name, department })
        });

        const data = await response.json();

        if (data.success) {
            // Trigger Confetti
            if (window.confetti) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#667eea', '#764ba2', '#4facfe']
                });
            }

            // Soft alert or just refresh
            // alert('✅ Candidate registered: ' + name); 
            document.getElementById('candidateForm').reset();
            loadCandidates();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        setBtnLoading('regBtn', false);
        hideLoader();
    }
});

window.loadElectionState = async function () {
    try {
        const response = await fetch(`${API_URL}/election/state`);
        const data = await response.json();

        if (data.success) {
            const statusBadge = document.getElementById('electionStatus');
            if (statusBadge) {
                const state = data.state.toUpperCase();
                statusBadge.className = `status-badge status-${data.state}`;
                statusBadge.textContent = `${state === 'WAITING' ? '⏸️' : state === 'LIVE' ? '🔴' : '🔒'} ${state}`;
            }

            // Update Title
            const titleEl = document.getElementById('electionTitleDisplay');
            if (titleEl && data.title) {
                titleEl.textContent = data.title;
            }

            const totalVotes = document.getElementById('totalVotes');
            if (totalVotes) totalVotes.textContent = data.total_votes;

            const chainLength = document.getElementById('chainLength');
            if (chainLength) chainLength.textContent = data.chain_length;

            const chainValid = document.getElementById('chainValid');
            if (chainValid) {
                chainValid.textContent = data.chain_valid ? '✓' : '✗';
                chainValid.style.color = data.chain_valid ? '#22c55e' : '#ef4444';
            }
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

window.loadCandidates = async function () {
    try {
        const response = await fetch(`${API_URL}/admin/candidates?admin_email=${encodeURIComponent(adminEmail)}`);
        const data = await response.json();

        const container = document.getElementById('candidatesList');
        if (!container) return;

        if (data.success && data.candidates.length > 0) {
            container.innerHTML = data.candidates.map(c => `
                <div class="candidate-card">
                    <h3 class="candidate-name">${c.name}</h3>
                    <span class="candidate-department">${c.department}</span>
                    <p class="candidate-manifesto">"${c.manifesto}"</p>
                    <button class="btn btn-danger" onclick="removeCandidate('${c.id}')" style="width: 100%;">
                        🗑️ Remove
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No candidates registered yet</p>';
        }
    } catch (error) {
        console.error('Error loading candidates:', error);
    }
}

// Global functions for onClick handlers
window.startElection = async function () {
    if (!confirm('Start the election? Voters will be able to cast votes.')) return;

    try {
        const response = await fetch(`${API_URL}/admin/election/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_email: adminEmail })
        });

        const data = await response.json();
        if (data.success) {
            loadElectionState();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
};

window.stopElection = async function () {
    if (!confirm('Stop the election and calculate results?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/election/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_email: adminEmail })
        });

        const data = await response.json();
        if (data.success) {
            loadElectionState();
            // Redirect to results or show modal? 
            // For now just stay here
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
};

window.resetBlockchain = async function () {
    if (!confirm('⚠️ WARNING: This will wipe the entire blockchain and all data. Continue?')) return;
    if (!confirm('This action cannot be undone. Are you absolutely sure?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/election/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_email: adminEmail })
        });

        const data = await response.json();
        if (data.success) {
            loadElectionState();
            loadCandidates();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
};

window.editTitle = async function () {
    const newTitle = prompt("Enter new Election Title:", "Class Representative Election 2026");
    if (!newTitle) return;

    try {
        const response = await fetch(`${API_URL}/admin/election/title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_email: adminEmail, title: newTitle })
        });

        const data = await response.json();
        if (data.success) {
            loadElectionState();
            alert('✅ Title Updated');
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
};

window.removeCandidate = async function (candidateId) {
    if (!confirm('Remove this candidate?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/candidate/remove`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_email: adminEmail, candidate_id: candidateId })
        });

        const data = await response.json();
        if (data.success) {
            loadCandidates();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
};

window.viewAudit = async function () {
    document.getElementById('auditModal').classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}/admin/audit?admin_email=${encodeURIComponent(adminEmail)}`);
        const data = await response.json();

        const content = document.getElementById('auditContent');

        if (data.success) {
            content.innerHTML = `
                <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
                    <h3 style="margin-bottom: 1rem;">🤖 AI Analysis</h3>
                    <p style="white-space: pre-wrap; line-height: 1.8;">${data.audit}</p>
                </div>
                <div style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-md);">
                    <h3 style="margin-bottom: 1rem;">📊 Results Breakdown</h3>
                    ${Object.entries(data.results).map(([dept, result]) => `
                        <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                            <h4>${dept}</h4>
                            <p>Winner: ${result.winner?.name || 'No votes'}</p>
                            <p>Votes: ${result.winner?.votes || 0} / ${result.total_votes}</p>
                            <p>Margin: ${result.margin || 0}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            content.innerHTML = `<p style="color: var(--text-secondary);">${data.message}</p>`;
        }
    } catch (error) {
        document.getElementById('auditContent').innerHTML = `<p style="color: #ef4444;">Error loading audit</p>`;
    }
};

window.closeModal = function (id) {
    document.getElementById(id).classList.add('hidden');
};

window.logout = function () {
    localStorage.removeItem('adminEmail');
    window.location.href = 'index.html';
};
