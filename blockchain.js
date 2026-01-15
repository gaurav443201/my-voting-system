const crypto = require('crypto');

class Blockchain {
    constructor(difficulty = 4) {
        this.chain = [];
        this.currentVotes = [];
        this.difficulty = difficulty;

        // Create genesis block
        this.createBlock(100, "1");
    }

    createBlock(proof, previousHash = null) {
        const block = {
            index: this.chain.length + 1,
            timestamp: Date.now() / 1000,
            votes: this.currentVotes,
            proof: proof,
            previous_hash: previousHash || this.hash(this.chain[this.chain.length - 1]),
        };

        this.currentVotes = [];
        this.chain.push(block);
        return block;
    }

    addVote(voterHash, candidateId, department) {
        const vote = {
            voter_hash: voterHash,
            candidate_id: candidateId,
            department: department,
            timestamp: Date.now() / 1000,
            transaction_hash: crypto.createHash('sha256').update(voterHash + candidateId + Date.now()).digest('hex')
        };

        this.currentVotes.push(vote);

        // Mine block (Proof of Work)
        const lastBlock = this.getLastBlock();
        const lastProof = lastBlock.proof;
        const proof = this.proofOfWork(lastProof);
        const previousHash = this.hash(lastBlock);
        const block = this.createBlock(proof, previousHash);

        return {
            ...vote,
            block_index: block.index
        };
    }

    hash(block) {
        const blockString = JSON.stringify(block, Object.keys(block).sort());
        return crypto.createHash('sha256').update(blockString).digest('hex');
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    proofOfWork(lastProof) {
        let proof = 0;
        while (!this.validProof(lastProof, proof)) {
            proof++;
        }
        return proof;
    }

    validProof(lastProof, proof) {
        const guess = `${lastProof}${proof}`;
        const guessHash = crypto.createHash('sha256').update(guess).digest('hex');
        return guessHash.substring(0, this.difficulty) === "0".repeat(this.difficulty);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const lastBlock = this.chain[i - 1];
            const block = this.chain[i];

            if (block.previous_hash !== this.hash(lastBlock)) return false;
            if (!this.validProof(lastBlock.proof, block.proof)) return false;
        }
        return true;
    }

    getChainData() { return this.chain; }
    getChainLength() { return this.chain.length; }

    getVoters() {
        const voters = new Set();
        this.chain.forEach(block => {
            block.votes.forEach(vote => voters.add(vote.voter_hash));
        });
        return Array.from(voters);
    }

    getAllVotes() {
        const allVotes = [];
        this.chain.forEach(block => {
            block.votes.forEach(vote => allVotes.push(vote));
        });
        return allVotes;
    }

    resetToGenesis() {
        this.chain = [];
        this.currentVotes = [];
        this.createBlock(100, "1");
    }
}

module.exports = Blockchain;
