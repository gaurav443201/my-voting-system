# 🗳️ VIT-ChainVote Deployment Guide (Beginner Friendly)

Follow these steps to deploy your Blockchain Voting System for free.

## 🚀 Recommended Platforms
1.  **Backend (API):** [Render](https://render.com/) - Best for Python/Flask apps.
2.  **Frontend (UI):** [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/) - Easiest for static HTML/JS projects.

---

## 1️⃣ Prepare Your Code
-   Ensure your code is uploaded to a **GitHub repository**.
-   Ensure you have a `requirements.txt` file in the root.
-   Ensure you have a `render.yaml` file (already included in your project).

## 2️⃣ Backend Deployment (Render)
1.  Sign in to [Render](https://dashboard.render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub repository.
4.  Use these settings:
    -   **Runtime:** `Node` (Render will detect `package.json` automatically)
    -   **Build Command:** `npm install`
    -   **Start Command:** `npm start`
5.  **Bonus:** I have already **HARDCODED** your credentials into the project as requested, so you **DON'T** need to add any environment variables for Gemini or Email in Render!

## 3️⃣ Frontend Deployment (Vercel)
1.  Sign in to [Vercel](https://vercel.com/dashboard).
2.  Click **Add New** -> **Project**.
3.  Connect your GitHub repository.
4.  Before deploying, you **MUST** update the API URL in your frontend code:
    -   Open `frontend/js/app.js` (and any other JS files).
    -   Find the variable `BASE_URL` or the line where it points to `http://localhost:5000`.
    -   Change it to your **Render App URL** (e.g., `https://your-app-name.onrender.com`).
5.  Click **Deploy**.

---

## 🛠️ Troubleshooting the OTP
-   **If OTP doesn't arrive:**
    1.  Check your Render logs.
    2.  Ensure you are using a Gmail **App Password** (16 characters), NOT your regular Gmail password.
    3.  Make sure [Less Secure Apps](https://myaccount.google.com/lesssecureapps) is enabled or you have 2FA + App Password set up.

## ✅ Why this setup?
-   **Speed:** I've enabled **Background Threading** for OTPs. The website will say "OTP Sent" instantly, and the email will arrive a few seconds later in the background. No more waiting for the page to load!
-   **Cost:** All these platforms are 100% free for student projects.
