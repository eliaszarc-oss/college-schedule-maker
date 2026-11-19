# College Schedule Maker 📅

> Transform any university timetable screenshot, enrollment slip, or syllabus into a clean, aesthetic college schedule with **zero manual entry**.

---

## ✨ Features

- **Multimodal AI Vision**: Powered by Google Gemini Flash to accurately extract course names, section codes, lecture/lab types, days, times, and room numbers from screenshots, portal tables, or photos.
- **Zero Setup for Visitors**: Your private Gemini API key is stored securely on the backend. Anyone visiting your website can use the tool immediately without needing an API key or account.
- **Exact Reference Replica**: 
  - Architectural drafting grid with extended border ticks.
  - Soft pastel palette (Coral, Mint Green, Butter Yellow, Soft Teal).
  - 4-line typography: `Course [Section]`, `Type`, `Time`, and `Room`.
- **Instant Clipboard Paste (Ctrl+V)**: Take a screenshot with `Win + Shift + S` and press `Ctrl + V` anywhere on the page.
- **Export Options**: 1-click **2x High-Resolution PNG** (crisp for printing and wallpapers) and scalable **SVG**.
- **Interactive Fine-Tuning**: Real-time sidebar to tweak rooms, adjust times, edit titles, or change colors.

---

## 🚀 Quick Deployment Guide (GitHub + Vercel)

### Step 1: Create a Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g. `college-schedule-maker`).
3. Leave it public (or private) and click **Create repository**.

### Step 2: Push Your Code
Open your terminal (PowerShell or Git Bash) inside this project folder and run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/college-schedule-maker.git
git branch -M main
git push -u origin main
```

*(Replace `YOUR_USERNAME` with your actual GitHub username).*

---

### Step 3: Deploy to Vercel (100% Free, 1-Click)
1. Go to [vercel.com](https://vercel.com/) and click **Sign Up** or **Log In** with your GitHub account.
2. Click **Add New...** → **Project**.
3. Select your `college-schedule-maker` repository and click **Import**.
4. Before clicking Deploy, expand **Environment Variables**:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: Your free Google Gemini API key (get one in 30 seconds at [aistudio.google.com](https://aistudio.google.com/)).
5. Click **Deploy**.

🎉 **Your website is now live!** Every time you push changes to GitHub, Vercel will automatically redeploy it.

---

## 💻 Local Testing on Your Computer

1. Simply double-click `index.html` to open it in Chrome, Edge, or Firefox.
2. You can preview the pre-loaded schedule, test color changes, fine-tune courses, and download PNGs immediately.
3. To test the AI extraction locally, click the **Settings ⚙️** icon in the header and paste your Gemini API key.

---

## 🎨 Color Palette Reference

| Course | Color Hex | Preview |
|---|---|---|
| Coral / Soft Red | `#df8082` | CS 300 |
| Mint / Light Green | `#c3ecc8` | CS 403 |
| Butter Yellow | `#fee382` | SAP 501 |
| Duck-Egg Blue / Teal | `#9fd3d3` | TECH 101 |
