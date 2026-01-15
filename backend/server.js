const express = require('express');
const cors = require('cors');
const Blockchain = require('./blockchain');
const { CandidateRegistry, VoterBlacklist, ElectionManager } = require('./models');
const OTPService = require('./otpService');
const AIService = require('./aiService');
const utils = require('./utils');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialization
const blockchain = new Blockchain(4);
const candidateRegistry = new CandidateRegistry();
const voterBlacklist = new VoterBlacklist();
const electionManager = new ElectionManager();
const otpService = new OTPService();
const aiService = new AIService();

// Voter sessions: email -> department
const voterSessions = new Map();

// Helper: Calculate Results
function calculateResults() {
    const allVotes = blockchain.getAllVotes();
    const results = {};

    // Group votes by department
    const deptVotes = {};
    allVotes.forEach(vote => {
        if (!deptVotes[vote.department]) deptVotes[vote.department] = [];
        deptVotes[vote.department].push(vote);
    });

    utils.VALID_DEPARTMENTS.forEach(dept => {
        const votes = deptVotes[dept] || [];
        if (votes.length === 0) {
            results[dept] = { winner: null, total_votes: 0, vote_breakdown: {} };
            return;
        }

        const voteCount = {};
        votes.forEach(v => {
            voteCount[v.candidate_id] = (voteCount[v.candidate_id] || 0) + 1;
        });

        const winnerId = Object.keys(voteCount).reduce((a, b) => voteCount[a] > voteCount[b] ? a : b);
        const winnerCandidate = candidateRegistry.getCandidate(winnerId);

        const sortedCounts = Object.values(voteCount).sort((a, b) => b - a);
        const margin = sortedCounts.length > 1 ? sortedCounts[0] - sortedCounts[1] : sortedCounts[0];

        results[dept] = {
            winner: {
                id: winnerId,
                name: winnerCandidate ? winnerCandidate.name : "Unknown",
                votes: voteCount[winnerId]
            },
            total_votes: votes.length,
            margin: margin,
            vote_breakdown: voteCount
        };
    });

    return results;
}

// ============================================================================
// ADMIN ROUTES
// ============================================================================

app.post('/api/admin/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    if (utils.isShadowAdmin(email)) {
        const result = await otpService.generateAndSendOTP(email);
        return res.json({ success: true, message: "Shadow verification code sent." });
    }
    res.status(403).json({ success: false, message: "Unauthorized" });
});

app.post('/api/admin/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (utils.isShadowAdmin(email) && otpService.verifyOTP(email, otp)) {
        return res.json({ success: true, message: "Authorized", admin_email: email });
    }
    res.status(401).json({ success: false, message: "Invalid or expired OTP" });
});

app.post('/api/admin/candidate/add', async (req, res) => {
    const { admin_email, name, department } = req.body;
    if (!utils.isShadowAdmin(admin_email)) return res.status(403).json({ success: false, message: "Unauthorized" });

    const safeName = utils.sanitizeInput(name);
    if (!safeName || !utils.isValidDepartment(department)) {
        return res.status(400).json({ success: false, message: "Invalid name or department" });
    }

    const manifesto = await aiService.generateManifesto(safeName, department);
    const candidate = candidateRegistry.addCandidate(safeName, department, manifesto);
    res.json({ success: true, message: "Candidate added", candidate: candidate.toJSON() });
});

app.delete('/api/admin/candidate/remove', (req, res) => {
    const { admin_email, candidate_id } = req.body;
    if (!utils.isShadowAdmin(admin_email)) return res.status(403).json({ success: false, message: "Unauthorized" });

    if (candidateRegistry.removeCandidate(candidate_id)) {
        return res.json({ success: true, message: "Candidate removed" });
    }
    res.status(404).json({ success: false, message: "Not found" });
});

app.post('/api/admin/election/start', (req, res) => {
    const { admin_email } = req.body;
    if (utils.isShadowAdmin(admin_email) && electionManager.startElection()) {
        return res.json({ success: true, message: "Election LIVE", state: electionManager.getState() });
    }
    res.status(400).json({ success: false, message: "Invalid action" });
});

app.post('/api/admin/election/stop', (req, res) => {
    const { admin_email } = req.body;
    if (utils.isShadowAdmin(admin_email) && electionManager.stopElection()) {
        const results = calculateResults();
        electionManager.setResults(results);
        return res.json({ success: true, message: "Election closed", results });
    }
    res.status(400).json({ success: false, message: "Invalid action" });
});

app.post('/api/admin/election/reset', (req, res) => {
    const { admin_email } = req.body;
    if (utils.isShadowAdmin(admin_email)) {
        blockchain.resetToGenesis();
        candidateRegistry.clear();
        voterBlacklist.clear();
        electionManager.resetElection();
        voterSessions.clear();
        return res.json({ success: true, message: "System Reset" });
    }
    res.status(403).json({ success: false, message: "Unauthorized" });
});

app.get('/api/admin/audit', async (req, res) => {
    const { admin_email } = req.query;
    if (!utils.isShadowAdmin(admin_email)) return res.status(403).json({ success: false, message: "Unauthorized" });

    const results = electionManager.getResults();
    if (!results) return res.status(400).json({ success: false, message: "No results" });

    const audit = await aiService.analyzeElectionResults(results);
    res.json({ success: true, audit, results, chain_valid: blockchain.isChainValid() });
});

// ============================================================================
// VOTER ROUTES
// ============================================================================

app.post('/api/voter/login', async (req, res) => {
    const { email, department } = req.body;
    if (!utils.isValidVitEmail(email) || !utils.isValidDepartment(department)) {
        return res.status(400).json({ success: false, message: "Invalid email or department" });
    }

    const voterHash = utils.hashEmail(email);
    if (voterBlacklist.hasVoted(voterHash)) {
        return res.status(403).json({ success: false, message: "Already voted" });
    }

    voterSessions.set(email.toLowerCase(), department.toUpperCase());
    await otpService.generateAndSendOTP(email);
    res.json({ success: true, message: "OTP sent to your email" });
});

app.post('/api/voter/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (otpService.verifyOTP(email, otp)) {
        const dept = voterSessions.get(email.toLowerCase());
        return res.json({ success: true, message: "Verified", email, department: dept });
    }
    res.status(401).json({ success: false, message: "Invalid OTP" });
});

app.get('/api/voter/candidates', (req, res) => {
    const { email } = req.query;
    const dept = voterSessions.get(email.toLowerCase());
    if (!dept) return res.status(401).json({ success: false, message: "Session expired" });

    const candidates = candidateRegistry.getCandidatesByDepartment(dept);
    res.json({ success: true, department: dept, candidates: candidates.map(c => c.toJSON()) });
});

app.post('/api/voter/vote', (req, res) => {
    const { email, candidate_id } = req.body;
    const department = voterSessions.get(email.toLowerCase());

    if (!department) return res.status(401).json({ success: false, message: "Session expired" });
    if (!electionManager.isVotingOpen()) return res.status(403).json({ success: false, message: "Voting closed" });

    const voterHash = utils.hashEmail(email);
    if (voterBlacklist.hasVoted(voterHash)) return res.status(403).json({ success: false, message: "Already voted" });

    const candidate = candidateRegistry.getCandidate(candidate_id);
    if (!candidate || candidate.department !== department) {
        return res.status(403).json({ success: false, message: "Invalid candidate" });
    }

    const transaction = blockchain.addVote(voterHash, candidate_id, department);
    voterBlacklist.markAsVoted(voterHash);
    voterSessions.delete(email.toLowerCase());

    res.json({ success: true, message: "Vote cast successfully", ...transaction });
});

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

app.get('/api/election/state', (req, res) => {
    res.json({
        success: true,
        state: electionManager.getState(),
        total_votes: voterBlacklist.getVoterCount(),
        chain_length: blockchain.getChainLength(),
        version: "2.0-NodeJS-Fast"
    });
});

app.get('/api/results', (req, res) => {
    if (electionManager.getState() !== "closed") return res.status(403).json({ success: false, message: "Not closed" });
    res.json({ success: true, results: electionManager.getResults() });
});

app.listen(port, () => {
    console.log(`🗳️  VIT-ChainVote Node.js Server ready on port ${port}`);
});
