# 2048 — Futuristic Edition

A fully customised 2048 game deployed via AWS CI/CD pipeline.

## 🚀 Live Demo
> http://54.144.241.103/

## 🛠️ Tech Stack
- **Frontend:** Vanilla JS, CSS3 Animations, Orbitron Font
- **Containerisation:** Docker + Amazon ECR
- **Hosting:** Amazon ECS on EC2
- **CI/CD:** AWS CodePipeline + CodeBuild
- **Themes:** Cyber, Game Boy, Rose Gold (4096 unlock)

## ✨ Features
- Theme selector splash screen
- Dynamic background shifts per tile milestone
- Particle burst animations
- Ghost mode (best move hint)
- AWS service tile skin
- Live stats: moves, time, efficiency score, personal best
- 4096 achievement unlock with interface transformation
- Git commit version stamp

## 📦 Run Locally
\`\`\`bash
docker build -t 2048-game .
docker run -d -p 8080:80 2048-game
\`\`\`
