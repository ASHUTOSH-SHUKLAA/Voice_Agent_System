@echo off
echo 🚀 Starting organized push to GitHub...

echo.
echo Phase 1: Project Setup...
git init
git remote add origin https://github.com/ASHUTOSH-SHUKLAA/Voice_Agent_System.git
git add package.json package-lock.json .gitignore .env.example server.js lib/ data/.gitkeep
git commit -m "📦 Setup: Project configuration and server boilerplate"

echo.
echo Phase 2: Backend Logic...
git add agent/ tools/ memory/
git commit -m "🧠 Logic: AI Agent calling, memory systems, and todo tools"

echo.
echo Phase 3: Frontend Implementation...
git add public/
git commit -m "🎨 UI: Frontend voice interface and visualizer"

echo.
echo Phase 4: Documentation...
git add README.md
git commit -m "📖 Docs: Full documentation and setup instructions"

echo.
echo Finalizing...
git branch -M main
git push -u origin main

echo.
echo ✅ Done! Your project has been pushed in 4 logical parts.
pause
