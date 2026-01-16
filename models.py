import uuid

class Candidate:
    def __init__(self, name, department, manifesto):
        self.id = str(uuid.uuid4())[:8]
        self.name = name
        self.department = department
        self.manifesto = manifesto

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "department": self.department,
            "manifesto": self.manifesto
        }

class CandidateRegistry:
    def __init__(self):
        self.candidates = {}

    def add_candidate(self, name, department, manifesto):
        candidate = Candidate(name, department, manifesto)
        self.candidates[candidate.id] = candidate
        return candidate

    def remove_candidate(self, candidate_id):
        if candidate_id in self.candidates:
            del self.candidates[candidate_id]
            return True
        return False

    def get_candidate(self, candidate_id):
        return self.candidates.get(candidate_id)

    def get_by_department(self, department):
        return [c for c in self.candidates.values() if c.department == department]

    def get_all(self):
        return list(self.candidates.values())

    def clear(self):
        self.candidates = {}

class VoterBlacklist:
    def __init__(self):
        self.voters = set()

    def mark_as_voted(self, voter_hash):
        self.voters.add(voter_hash)

    def has_voted(self, voter_hash):
        return voter_hash in self.voters

    def get_count(self):
        return len(self.voters)

    def clear(self):
        self.voters = set()

class ElectionManager:
    def __init__(self):
        self.state = "waiting" # waiting, live, closed
        self.title = "VIT-ChainVote"
        self.results = None

    def set_title(self, title):
        self.title = title
        return True

    def start_election(self):
        self.state = "live"
        return True

    def stop_election(self):
        self.state = "closed"
        return True

    def reset_election(self):
        self.state = "waiting"
        self.results = None
        return True

    def set_results(self, results):
        self.results = results

    def get_state(self):
        return self.state
        
    def get_title(self):
        return self.title

    def get_results(self):
        return self.results
