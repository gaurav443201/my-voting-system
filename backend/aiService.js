const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
    constructor() {
        // Hardcoded for urgent deployment as requested
        const apiKey = "AIzaSyDrTe9Bsg8xYIS-6MwDo18vAtZ9CD6TMAE";
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async generateManifesto(candidateName, department) {
        const prompt = `
        Generate a powerful, energetic 2-sentence election manifesto for ${candidateName}, 
        a candidate running for the ${department} department representative position at VIT institute.
        
        The manifesto should be:
        - Exactly 2 sentences
        - Inspiring and action-oriented
        - Professional yet energetic
        
        Do not include any introductory text, just return the 2-sentence manifesto.`;

        try {
            const result = await Promise.race([
                this.model.generateContent(prompt),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
            ]);

            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error(`⚠️ AI Error: ${error.message}`);
            return `Dedicated to advancing ${department} excellence and innovation. Together, we'll build a stronger future for our department!`;
        }
    }

    async analyzeElectionResults(results) {
        let summaryText = "Election Results Summary:\n\n";
        let totalVotes = 0;

        for (const [dept, data] of Object.entries(results)) {
            summaryText += `${dept} Department:\n`;
            summaryText += `  Winner: ${data.winner ? data.winner.name : "N/A"}\n`;
            summaryText += `  Votes: ${data.winner ? data.winner.votes : 0}\n`;
            summaryText += `  Total Voters: ${data.total_votes}\n`;
            summaryText += `  Margin: ${data.margin || 'N/A'}\n\n`;
            totalVotes += data.total_votes;
        }

        const prompt = `
        Analyze the following VIT institute election results and provide a comprehensive audit summary.
        ${summaryText}
        Provide:
        1. Overall voter turnout analysis
        2. Department-wise performance insights
        3. Margin of victory analysis
        4. Key observations about voting patterns
        5. Brief congratulatory message for winners`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error(`AI Analysis Error: ${error.message}`);
            return `Election completed successfully with ${totalVotes} total votes cast.`;
        }
    }
}

module.exports = AIService;
