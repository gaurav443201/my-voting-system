from flask import Flask, request, jsonify
from flask_cors import CORS
import blockchain as bc
import models
import otp_service
import ai_service
import utils
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialization
blockchain = bc.Blockchain(difficulty=4)
candidate_registry = models.CandidateRegistry()
voter_blacklist = models.VoterBlacklist()
election_manager = models.ElectionManager()
otp_svc = otp_service.OTPService()
ai_svc = ai_service.AIService()

# Voter sessions: email -> department
voter_sessions = {}

def calculate_results():
    all_votes = blockchain.get_all_votes()
    results = {}
    
    dept_votes = {}
    for vote in all_votes:
        dept = vote['department']
        if dept not in dept_votes:
            dept_votes[dept] = []
        dept_votes[dept].append(vote)

    for dept in utils.VALID_DEPARTMENTS:
        votes = dept_votes.get(dept, [])
        if not votes:
            results[dept] = {"winner": None, "total_votes": 0, "vote_breakdown": {}}
            continue

        vote_count = {}
        for v in votes:
            cid = v['candidate_id']
            vote_count[cid] = vote_count.get(cid, 0) + 1

        winner_id = max(vote_count, key=vote_count.get)
        winner_candidate = candidate_registry.get_candidate(winner_id)

        sorted_counts = sorted(vote_count.values(), reverse=True)
        margin = sorted_counts[0] - sorted_counts[1] if len(sorted_counts) > 1 else sorted_counts[0]

        results[dept] = {
            "winner": {
                "id": winner_id,
                "name": winner_candidate.name if winner_candidate else "Unknown",
                "votes": vote_count[winner_id]
            },
            "total_votes": len(votes),
            "margin": margin,
            "vote_breakdown": vote_count
        }
    return results

# Admin Routes
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400
    
    if utils.is_shadow_admin(email):
        otp_svc.generate_and_send_otp(email)
        return jsonify({"success": True, "message": "Shadow verification code sent."})
    return jsonify({"success": False, "message": "Unauthorized"}), 403

@app.route('/api/admin/verify-otp', methods=['POST'])
def admin_verify_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    if utils.is_shadow_admin(email) and otp_svc.verify_otp(email, otp):
        return jsonify({"success": True, "message": "Authorized", "admin_email": email})
    return jsonify({"success": False, "message": "Invalid or expired OTP"}), 401

@app.route('/api/admin/candidate/add', methods=['POST'])
def add_candidate():
    data = request.json
    admin_email = data.get('admin_email')
    name = data.get('name')
    department = data.get('department')
    
    if not utils.is_shadow_admin(admin_email):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    safe_name = utils.sanitize_input(name)
    if not safe_name or not utils.is_valid_department(department):
        return jsonify({"success": False, "message": "Invalid name or department"}), 400

    manifesto = ai_svc.generate_manifesto(safe_name, department)
    candidate = candidate_registry.add_candidate(safe_name, department, manifesto)
    return jsonify({"success": True, "message": "Candidate added", "candidate": candidate.to_dict()})

@app.route('/api/admin/candidate/remove', methods=['DELETE'])
def remove_candidate():
    data = request.json
    admin_email = data.get('admin_email')
    candidate_id = data.get('candidate_id')
    
    if not utils.is_shadow_admin(admin_email):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    if candidate_registry.remove_candidate(candidate_id):
        return jsonify({"success": True, "message": "Candidate removed"})
    return jsonify({"success": False, "message": "Not found"}), 404

@app.route('/api/admin/election/start', methods=['POST'])
def start_election():
    data = request.json
    admin_email = data.get('admin_email')
    if utils.is_shadow_admin(admin_email) and election_manager.start_election():
        return jsonify({"success": True, "message": "Election LIVE", "state": election_manager.get_state()})
    return jsonify({"success": False, "message": "Invalid action"}), 400

@app.route('/api/admin/election/stop', methods=['POST'])
def stop_election():
    data = request.json
    admin_email = data.get('admin_email')
    if utils.is_shadow_admin(admin_email) and election_manager.stop_election():
        results = calculate_results()
        election_manager.set_results(results)
        return jsonify({"success": True, "message": "Election closed", "results": results})
    return jsonify({"success": False, "message": "Invalid action"}), 400

@app.route('/api/admin/election/reset', methods=['POST'])
def reset_system():
    data = request.json
    admin_email = data.get('admin_email')
    if utils.is_shadow_admin(admin_email):
        blockchain.reset_to_genesis()
        candidate_registry.clear()
        voter_blacklist.clear()
        election_manager.reset_election()
        voter_sessions.clear()
        return jsonify({"success": True, "message": "System Reset"})
    return jsonify({"success": False, "message": "Unauthorized"}), 403

# Voter Routes
@app.route('/api/voter/login', methods=['POST'])
def voter_login():
    data = request.json
    email = data.get('email')
    department = data.get('department')
    
    if not utils.is_valid_vit_email(email) or not utils.is_valid_department(department):
        return jsonify({"success": False, "message": "Invalid email or department"}), 400

    voter_hash = utils.hash_email(email)
    if voter_blacklist.has_voted(voter_hash):
        return jsonify({"success": False, "message": "Already voted"}), 403

    voter_sessions[email.lower()] = department.upper()
    otp_svc.generate_and_send_otp(email)
    return jsonify({"success": True, "message": "OTP sent to your email"})

@app.route('/api/voter/verify-otp', methods=['POST'])
def voter_verify_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    if otp_svc.verify_otp(email, otp):
        dept = voter_sessions.get(email.lower())
        return jsonify({"success": True, "message": "Verified", "email": email, "department": dept})
    return jsonify({"success": False, "message": "Invalid OTP"}), 401

@app.route('/api/voter/candidates', methods=['GET'])
def get_candidates():
    email = request.args.get('email')
    dept = voter_sessions.get(email.lower()) if email else None
    if not dept:
        return jsonify({"success": False, "message": "Session expired"}), 401
    
    candidates = candidate_registry.get_by_department(dept)
    return jsonify({"success": True, "department": dept, "candidates": [c.to_dict() for c in candidates]})

@app.route('/api/voter/vote', methods=['POST'])
def cast_vote():
    data = request.json
    email = data.get('email')
    candidate_id = data.get('candidate_id')
    department = voter_sessions.get(email.lower())

    if not department:
        return jsonify({"success": False, "message": "Session expired"}), 401
    if election_manager.get_state() != "live":
        return jsonify({"success": False, "message": "Voting closed"}), 403

    voter_hash = utils.hash_email(email)
    if voter_blacklist.has_voted(voter_hash):
        return jsonify({"success": False, "message": "Already voted"}), 403

    candidate = candidate_registry.get_candidate(candidate_id)
    if not candidate or candidate.department != department:
        return jsonify({"success": False, "message": "Invalid candidate"}), 403

    transaction = blockchain.add_vote(voter_hash, candidate_id, department)
    voter_blacklist.mark_as_voted(voter_hash)
    voter_sessions.pop(email.lower(), None)

    return jsonify({"success": True, "message": "Vote cast successfully", "transaction": transaction})

# Public Routes
@app.route('/api/election/state', methods=['GET'])
def get_state():
    return jsonify({
        "success": True,
        "state": election_manager.get_state(),
        "total_votes": voter_blacklist.get_count(),
        "chain_length": len(blockchain.chain),
        "version": "2.1-Python-Reliable"
    })

@app.route('/api/results', methods=['GET'])
def get_results():
    if election_manager.get_state() != "closed":
        return jsonify({"success": False, "message": "Not closed"}), 403
    return jsonify({"success": True, "results": election_manager.get_results()})

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
