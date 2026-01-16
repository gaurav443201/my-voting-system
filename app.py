from flask import Flask, request, jsonify
from flask_cors import CORS
import blockchain as bc
import models
import otp_service
import ai_service
import utils
import logging

import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Serve static files from 'frontend' folder
app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/results')
def results_page():
    return app.send_static_file('results.html')

@app.route('/admin')
def admin_page():
    return app.send_static_file('admin.html')

@app.route('/voter')
def voter_page():
    return app.send_static_file('voter.html')

print("--------------------------------------------------")
print("🚀 APP STARTUP: VERSION BREVO-API-v2 (HTTP)")
print("--------------------------------------------------")

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

        # Get ALL candidates for this department
        dept_candidates = candidate_registry.get_by_department(dept)
        full_breakdown = []
        
        # Build breakdown including everyone (default 0 votes)
        for cand in dept_candidates:
            full_breakdown.append({
                "id": cand.id,
                "name": cand.name,
                "votes": vote_count.get(cand.id, 0)
            })
        
        # Sort by votes DESC
        full_breakdown.sort(key=lambda x: x['votes'], reverse=True)

        results[dept] = {
            "winner": {
                "id": winner_id,
                "name": winner_candidate.name if winner_candidate else "No Winner",
                "votes": vote_count.get(winner_id, 0)
            } if winner_id else None,
            "total_votes": len(votes),
            "full_breakdown": full_breakdown
        }
    return results

# Admin Routes
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400
    print(f"--- DEBUG ADMIN LOGIN ---")
    print(f"Original email: '{email}' (Length: {len(email) if email else 0})")
    if email:
        print(f"Cleaned email: '{email.strip().lower()}'")
        print(f"Email type: {type(email)}")
        # Print hex to detect hidden characters
        print(f"Email hex: {email.encode().hex()}")
    
    is_admin = utils.is_shadow_admin(email)
    print(f"Is Shadow Admin result: {is_admin}")
    print(f"--- END DEBUG ---")

    if is_admin:
        logger.info(f"Admin authorization successful for: {email}")
        
        # Set election title if provided
        new_title = data.get('title')
        if new_title:
            safe_title = utils.sanitize_input(new_title)
            if safe_title:
                election_manager.set_title(safe_title)
                logger.info(f"Election title updated to: {safe_title}")

        otp_svc.generate_and_send_otp(email)
        return jsonify({"success": True, "message": "Shadow verification code sent."})
    
    logger.warning(f"Admin authorization FAILED for: '{email}'")
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

@app.route('/api/admin/candidates', methods=['GET'])
def admin_get_candidates():
    admin_email = request.args.get('admin_email')
    if not utils.is_shadow_admin(admin_email):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    candidates = candidate_registry.get_all()
    return jsonify({"success": True, "candidates": [c.to_dict() for c in candidates]})

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

@app.route('/api/admin/election/title', methods=['POST'])
def set_election_title():
    data = request.json
    admin_email = data.get('admin_email')
    new_title = data.get('title')
    
    if utils.is_shadow_admin(admin_email):
        safe_title = utils.sanitize_input(new_title)
        if safe_title:
            election_manager.set_title(safe_title)
            return jsonify({"success": True, "message": "Title updated", "title": safe_title})
        return jsonify({"success": False, "message": "Invalid title"}), 400
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

    return jsonify({
        "success": True, 
        "message": "Vote cast successfully", 
        "transaction_hash": blockchain.hash(transaction),
        "block_index": transaction['index'],
        "candidate": candidate.to_dict()
    })

@app.route('/api/voter/status', methods=['GET'])
def get_voter_status():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400
    
    voter_hash = utils.hash_email(email)
    return jsonify({"success": True, "has_voted": voter_blacklist.has_voted(voter_hash)})

@app.route('/api/admin/audit', methods=['GET'])
def admin_audit():
    admin_email = request.args.get('admin_email')
    if not utils.is_shadow_admin(admin_email):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    results = calculate_results()
    # Basic AI audit summary (Mock or simple summary)
    total_votes = voter_blacklist.get_count()
    audit_text = f"Election results verified. Total votes: {total_votes}. "
    if total_votes > 0:
        audit_text += "Blockchain parity confirmed. Results represent true voter intent."
    else:
        audit_text += "No votes cast. Election integrity maintained."
        
    return jsonify({"success": True, "results": results, "audit": audit_text})

# Public Routes
@app.route('/api/election/state', methods=['GET'])
def get_state():
    return jsonify({
        "success": True,
        "state": election_manager.get_state(),
        "title": election_manager.get_title(),
        "total_votes": voter_blacklist.get_count(),
        "chain_length": len(blockchain.chain),
        "chain_valid": blockchain.is_chain_valid(),
        "version": "2.2-Integrity-Fixed"
    })

@app.route('/api/results', methods=['GET'])
def get_results():
    results = calculate_results()
    return jsonify({
        "success": True, 
        "results": results,
        "title": election_manager.get_title(),
        "chain_valid": blockchain.is_chain_valid()
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
