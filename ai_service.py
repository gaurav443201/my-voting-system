import os
import time
import concurrent.futures
import google.generativeai as genai

class AIService:
    def __init__(self):
        # User's Gemini API Key
        api_key = "AIzaSyDrTe9Bsg8xYIS-6MwDo18vAtZ9CD6TMAE"
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')

    def generate_manifesto(self, candidate_name, department):
        prompt = f"Generate a highly professional 2-sentence election manifesto for {candidate_name} running for the {department} department representative."
        
        def call_ai():
            try:
                response = self.model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                return f"I promise to serve the {department} department with integrity and dedication."

        try:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(call_ai)
                manifesto = future.result(timeout=5.0)
                return manifesto
        except Exception:
            return f"I promise to serve the {department} department with integrity and dedication."

    def analyze_election_results(self, results):
        prompt = f"Analyze these election results for a technical report: {str(results)}. Provide a 3-sentence summary of the key outcomes and margins."
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            return "Election concluded with valid participation across all departments."
