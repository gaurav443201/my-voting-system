class Candidate {
    constructor(id, name, department, manifesto) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.manifesto = manifesto;
        this.registered_at = Date.now() / 1000;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            department: this.department,
            manifesto: this.manifesto,
            registered_at: this.registered_at
        };
    }
}

class CandidateRegistry {
    constructor() {
        this.candidates = {};
    }

    addCandidate(name, department, manifesto) {
        const id = `CAND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const candidate = new Candidate(id, name, department, manifesto);
        this.candidates[id] = candidate;
        return candidate;
    }

    removeCandidate(id) {
        if (this.candidates[id]) {
            delete this.candidates[id];
            return true;
        }
        return false;
    }

    getCandidate(id) { return this.candidates[id]; }

    getAllCandidates() { return Object.values(this.candidates); }

    getCandidatesByDepartment(department) {
        return Object.values(this.candidates).filter(c => c.department === department);
    }

    clear() { this.candidates = {}; }
}

class VoterBlacklist {
    constructor() {
        this.votedHashes = new Set();
    }

    hasVoted(voterHash) { return this.votedHashes.has(voterHash); }

    markAsVoted(voterHash) { this.votedHashes.add(voterHash); }

    getVoterCount() { return this.votedHashes.size; }

    clear() { this.votedHashes.clear(); }
}

class ElectionManager {
    constructor() {
        this.state = "preparation"; // preparation, live, closed
        this.results = null;
    }

    startElection() {
        if (this.state === "preparation") {
            this.state = "live";
            return true;
        }
        return false;
    }

    stopElection() {
        if (this.state === "live") {
            this.state = "closed";
            return true;
        }
        return false;
    }

    resetElection() {
        this.state = "preparation";
        this.results = null;
    }

    isVotingOpen() { return this.state === "live"; }
    getState() { return this.state; }
    setResults(results) { this.results = results; }
    getResults() { return this.results; }
}

module.exports = { CandidateRegistry, VoterBlacklist, ElectionManager };
