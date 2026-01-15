import hashlib
import json
import time

class Blockchain:
    def __init__(self, difficulty=4):
        self.chain = []
        self.difficulty = difficulty
        self.reset_to_genesis()

    def create_block(self, proof, previous_hash, transactions):
        block = {
            'index': len(self.chain) + 1,
            'timestamp': time.time(),
            'transactions': transactions,
            'proof': proof,
            'previous_hash': previous_hash
        }
        self.chain.append(block)
        return block

    def get_last_block(self):
        return self.chain[-1]

    def proof_of_work(self, last_proof):
        proof = 0
        while not self.valid_proof(last_proof, proof):
            proof += 1
        return proof

    def valid_proof(self, last_proof, proof):
        guess = f'{last_proof}{proof}'.encode()
        guess_hash = hashlib.sha256(guess).hexdigest()
        return guess_hash[:self.difficulty] == '0' * self.difficulty

    def hash(self, block):
        encoded_block = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(encoded_block).hexdigest()

    def add_vote(self, voter_hash, candidate_id, department):
        last_block = self.get_last_block()
        proof = self.proof_of_work(last_block['proof'])
        previous_hash = self.hash(last_block)
        
        transaction = {
            'voter_hash': voter_hash,
            'candidate_id': candidate_id,
            'department': department
        }
        
        return self.create_block(proof, previous_hash, [transaction])

    def is_chain_valid(self):
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            if current['previous_hash'] != self.hash(previous):
                return False
            if not self.valid_proof(previous['proof'], current['proof']):
                return False
        return True

    def get_all_votes(self):
        all_votes = []
        for block in self.chain[1:]: # Skip genesis
            all_votes.extend(block['transactions'])
        return all_votes

    def reset_to_genesis(self):
        self.chain = []
        self.create_block(proof=100, previous_hash='1', transactions=[])
