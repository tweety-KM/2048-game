# 2048 — Futuristic Edition 🎮

![AWS](https://img.shields.io/badge/AWS-8%20Services-FF9900?style=flat&logo=amazonaws&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerised-2496ED?style=flat&logo=docker&logoColor=white)
![CI/CD](https://img.shields.io/badge/CI%2FCD-CodePipeline-00A1C9?style=flat&logo=amazonaws&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20JS-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

A fully customised, cloud-deployed 2048 game built with vanilla JavaScript and hosted on AWS using a complete CI/CD pipeline and serverless backend. Built as a portfolio project to demonstrate real-world cloud engineering and full-stack development skills.

---

## 🚀 Live Demo

**http://54.198.135.133**

> Domain pending: `https://2048km.is-a.dev`

---

## 🏗️ Architecture

```
GitHub → CodePipeline → CodeBuild → ECR → ECS → EC2 (nginx)
                                                      ↑
                                               Live Game (port 80)
                                                      ↓
                                              API Gateway (HTTP)
                                                      ↓
                                                   Lambda
                                                      ↓
                                                  DynamoDB
                                              (Global Leaderboard)
```

---

## ☁️ AWS Services Used

| Service | Purpose |
|---|---|
| **CodePipeline** | Orchestrates the full CI/CD pipeline |
| **CodeBuild** | Builds Docker image on every git push |
| **ECR** | Private Docker image registry |
| **ECS** | Container orchestration and deployment |
| **EC2** | Compute host (t4g.micro, ARM64, free tier) |
| **API Gateway** | HTTP API routing for leaderboard |
| **Lambda** | Serverless score read/write logic |
| **DynamoDB** | Persistent global leaderboard storage |
| **IAM** | Role-based access control across all services |

---

## ✨ Game Features

### Themes
- **Cyber** — Deep space neon aesthetic with glowing tiles and dark background
- **Game Boy** — Soft pink glass aesthetic inspired by retro handheld gaming
- **4096 Legendary** — Mesh gradient unlock triggered when player reaches 4096

### Gameplay Enhancements
- 👻 **Ghost Mode** — Toggle a best-move hint based on one-step lookahead algorithm
- ☁️ **AWS Skin** — Tiles display real AWS service names (IAM, S3, EC2, RDS, ECS...)
- 🏆 **Global Leaderboard** — Submit and view top 10 scores from all players worldwide
- 💥 **Particle Burst** — Animated particles fire on every new tile milestone
- 🎨 **Dynamic Themes** — Background shifts colour each time a new tile value appears for the first time
- ⚡ **Tile Animations** — Unique spawn and merge animations per theme

### Stats Panel
- Move counter (only counts valid moves)
- Game timer (resets on new game, stops on game over)
- Merge counter
- Efficiency score (points per move)
- Personal best (stored locally)

---

## 🔄 CI/CD Pipeline

Every `git push` to `master` automatically:

1. **Source** — CodePipeline detects the push via GitHub webhook
2. **Build** — CodeBuild reads `buildspec.yml`, builds a Docker image for `linux/arm64`, pushes to ECR with commit hash tag
3. **Deploy** — ECS pulls the new image and performs a rolling update with zero downtime

```yaml
# buildspec.yml
version: 0.2
phases:
  pre_build:
    commands:
      - aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPO_URI
  build:
    commands:
      - docker build --platform linux/arm64 -t $ECR_REPO_URI:latest .
  post_build:
    commands:
      - docker push $ECR_REPO_URI:latest
      - printf '[{"name":"2048-game","imageUri":"%s"}]' $ECR_REPO_URI:$IMAGE_TAG > imagedefinitions.json
```

---

## 🏆 Serverless Leaderboard

Built with API Gateway + Lambda + DynamoDB. Scores are stored globally and accessible from any device.

**Endpoints:**
```
GET  /scores       — Returns top 10 scores
POST /scores       — Submit a score (only updates if higher than personal best)
```

**Lambda logic:**
- Validates name and score
- Scans DynamoDB for existing entry
- Only writes if new score exceeds previous best
- Returns sorted top 10 on GET

---

## 🐳 Run Locally

```bash
# Clone the repo
git clone https://github.com/tweety-KM/2048-game.git
cd 2048-game

# Build and run with Docker
docker build -t 2048-game .
docker run -d -p 8080:80 2048-game

# Open in browser
http://localhost:8080
```

**Requirements:** Docker Desktop

---

## 📁 Project Structure

```
2048-game/
├── index.html              # Main HTML — splash screen + game structure
├── Dockerfile              # nginx:alpine container config
├── buildspec.yml           # CodeBuild CI/CD instructions
├── CNAME                   # Custom domain config
├── js/
│   ├── application.js      # Game bootstrap
│   ├── game_manager.js     # Core game logic
│   ├── html_actuator.js    # DOM rendering
│   ├── keyboard_input_manager.js
│   ├── local_storage_manager.js
│   └── customizations.js   # All custom features (themes, stats, leaderboard)
└── style/
    ├── main.css            # Original game styles
    └── customizations.css  # Custom themes, animations, AWS skin
```

---

## 🛠️ Tech Stack

**Frontend**
- Vanilla JavaScript (ES6+)
- CSS3 animations and keyframes
- Google Fonts — Orbitron
- localStorage API

**Infrastructure**
- Docker + nginx:alpine
- Amazon ECR (ARM64 image)
- Amazon ECS on EC2 (t4g.micro)
- AWS CodePipeline + CodeBuild

**Backend**
- AWS API Gateway (HTTP API)
- AWS Lambda (Node.js 20, ARM64)
- AWS DynamoDB (on-demand)

---

## 🔐 IAM Roles Configured

| Role | Purpose |
|---|---|
| `AWSCodePipelineServiceRole` | Pipeline orchestration permissions |
| `codebuild-2048-build-service-role` | ECR push + ECS deploy permissions |
| `ecsInstanceRole` | EC2 instance ECS registration |
| `ecsTaskExecutionRole` | Container image pull from ECR |
| `2048-leaderboard` Lambda role | DynamoDB read/write access |

---

## 🐛 Real-World Issues Solved

This project involved debugging several production-grade infrastructure problems:

- **IAM permission gaps** — CodePipeline and CodeBuild roles missing ECR and ECS permissions, fixed by adding targeted inline policies
- **Docker Hub rate limiting** — Switched base image from `nginx:alpine` to `public.ecr.aws/nginx/nginx:alpine` to bypass unauthenticated pull limits
- **ARM64 architecture mismatch** — EC2 t4g.micro uses ARM64; updated buildspec to build `linux/arm64` platform and task definition to `Linux/ARM64`
- **ECS agent registration** — EC2 instance not joining cluster due to missing user data config; fixed by setting `ECS_CLUSTER` in `/etc/ecs/ecs.config`
- **ECS circuit breaker** — Disabled rollback on first deployment since no previous stable state existed
- **Environment variables** — CodeBuild environment variables not passed from pipeline; added directly to CodeBuild project

---

## 📜 Credits

Original 2048 game by [Gabriele Cirulli](http://gabrielecirulli.com).
Customised, redesigned and deployed to AWS by [Koketso Matobako](https://github.com/tweety-KM).

---

## 📄 License

MIT License — feel free to fork and build on this project.