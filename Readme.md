### Why Docker?
- 👉 Imagine you want to run an app (say a small website). Normally, you’d install Python/Node/Java, configure dependencies, and make sure your system matches the app. With Docker, the app plus its environment are packaged into a container. You just “run the container” — and it works the same on your laptop, a server, or the cloud.

## A common comparison:
- **Without Docker**: You install software directly on your computer. If you install different versions for different projects, they can conflict. It’s like trying to fit multiple puzzle pieces into the same spot.
- Virtual Machine (VM): Big box with its own OS inside. Heavy.
- Docker Container: Small box, shares the host’s OS, just has the app + what it needs. Light and fast.
- In VirtualBox with Kali/Parrot, you installed a whole OS inside another OS. That’s why it was heavy, took gigabytes of space, and booted slowly.

In Docker, instead of shipping a whole OS, you just ship the application + libraries it needs. It uses your existing Linux kernel (the “core” of the OS), so it’s much lighter. A container can start in seconds, not minutes.

#### Here’s a simple analogy:

- VM(virtual Machine) → like renting a full apartment (walls, kitchen, bathroom… everything).

- Docker Container → like renting just a desk in a coworking space. You still get what you need (workspace, internet, electricity), but you share the bigger building with others.

### Key Benefits of Docker:
- **Lightweight**: Containers share the host OS kernel, so they use less memory and storage than VMs.
- **Fast Startup**: Containers can start in seconds, while VMs take minutes to boot up.
- **Portability**: A containerized app runs the same way on any system with Docker installed, eliminating the “it works on my machine” problem.

- **Isolation**: Each container runs in its own environment, so apps don’t interfere with each other.

### installation: 
- For Windows and Mac, download Docker Desktop from [here](https://www.docker.com/products/docker-desktop/).

### Getting start with an docker image:
- Let’s run something you can actually interact with. A good example is Ubuntu inside Docker:

```bash
docker run -it ubuntu bash
```
 Here’s what’s happening:
 - docker run → starts a new container.
 - -it → makes it interactive (so you can type commands inside).
 - ubuntu → the image (official Ubuntu Linux).
 - bash → the command to run (Ubuntu’s shell).

 This will drop you into an Ubuntu terminal inside Docker, right from Windows!

 Now that you’re inside the Ubuntu container, try a few basic Linux commands:

 ```bash
ls # list files and folders
pwd # print working directory
whoami # show current user 
```

You’ll notice it feels like you’re inside a fresh Ubuntu machine, but it started in seconds.

When you’re done exploring, you can exit the container by typing:
```bash
exit
```

### Perfect 👌 Let’s dive into container management — the heart of Docker basics.

#### 🟢 Step 4: See running containers

```bash
docker ps
```

This shows only containers that are currently running.

OR

If you want to see all containers (including ones that have stopped):
```bash
docker ps -a
```

#### 🟡 Step 5: Start & stop containers

First, run Ubuntu again so now check containers:
 ```bash
docker ps -a
```
You’ll see your Ubuntu container listed (in Exited state).
##### To start it again (without downloading or creating a new one):
```bash
docker start -ai <container_id>
```

Replace <container_id> with the short ID from docker ps -a.
- start → starts a stopped container.
- -a → attach to it.
- -i → interactive.

#### To stop a running container (from another terminal, if needed):
```bash
docker stop <container_id>
```

Perfect 🚀 You’re moving step by step like a pro.
Now let’s talk about Docker Images — the blueprints for containers.


### Step 7: Working with Images
- 1. List images on your system
```bash
docker images
```

- 2. Pull (download) an image manually
```bash
docker pull alpine
```

- alpine is a very small Linux distribution (just a few MB).
- After pulling, check again with docker images.

- 3. Run a container from that image
```bash
docker run -it alpine sh
```
Here:
alpine is the image.
sh is the shell (Alpine doesn’t come with bash).

- 4. Remove an image
```bash
docker rmi alpine 
```
⚠️ You must stop and remove any containers created from that image before deleting it.

# Creating a Container for a Next.js App

To containerize a Next.js application (or any Node.js app), you need two main files:

- Dockerfile – Defines the environment, dependencies, and commands required to build and run your app inside a container.

- .dockerignore – Excludes unnecessary files (like node_modules, build artifacts, logs, etc.) from being copied into the container, keeping the image clean and efficient.
     
Example .dockerignore
      
```bash
 node_modeuls
.env
```


## What is a Dockerfile?

- A Dockerfile is a text file that contains step-by-step instructions for building a container image.
It specifies:

- Base image (e.g., node:20-alpine) that provides the runtime environment.

- Application files to include inside the image (e.g., package.json, source code).

- Dependencies installation (e.g., npm install).

- Build steps (e.g., npm run build for Next.js).

- Startup command to run when the container launches (e.g., npm run start).

In short: A Dockerfile describes how to build and run your app inside a portable container.


### Example of a dockerfile for nextjs app

```bash
# base image
FROM node:20-alpine

# set the working directory
WORKDIR /src

# copy package files
COPY package*.json .

#install dependencies
RUN npm install

# Copy the rest of the application code files
COPY . .

# start the application server
CMD ["npm", "run", "dev"]
```
That's it all you need to do.
Now you can run a build command to create a docker image by running 
```bash
docker build -t <your-app-name> 
```

So it will create a docker image for your nextjs app and you can check all images by running ``` docker images``` and then run that image by running ``` docker run -it -p <machine-port(3000)>:<container-port(3001)>  <image_name> ```

- Now your app running on localhost:3000 and you can access it in any browser.


OR You can create a dynamic port mapping when building image, so for that you can EXPOSE some port range in dockerfile like this -


```bash
# base image
FROM node:20-alpine

# set the working directory
WORKDIR /src

# copy package files
COPY package*.json .

#install dependencies
RUN npm install

# Copy the rest of the application code files
COPY . .

EXPOSE 3000-3005

# start the application server
CMD ["npm", "run", "dev"]
```

## Creating multi stage build:
# 🚀 Optimized Docker Build for Next.js

This guide explains how to build a **production-ready, optimized Docker image** for a Next.js project.  
The goal is to reduce image size, improve build speed, and make deployments easier.

---

## 🎯 Optimization Goals
- ✅ **Multi-stage builds** → smaller image size  
- ✅ **Dependency caching** → faster builds  
- ✅ **Production-only dependencies** → `npm ci --only=production`  
- ✅ **Minimal base image** → `node:18-alpine`  
- ✅ **Standalone Next.js output** → lightweight runtime  

---

## 📂 Project Setup

### `Dockerfile`
```dockerfile
# ------------ Base stage ------------
FROM node:18-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./


# ------------ Dependencies stage ------------
FROM base AS deps
# Install only dependencies (cached if package.json doesn't change)
RUN npm ci


# ------------ Build stage ------------
FROM deps AS build
WORKDIR /app
COPY . .
# Build Next.js app
RUN npm run build


# ------------ Production stage ------------
FROM node:18-alpine AS runner
WORKDIR /app

# Run Next.js in standalone mode (requires next.config.js)
COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]




# Getting started with Docker Hub:

🔹 What is Docker Hub?

Docker Hub is a cloud-based container registry service provided by Docker, Inc.
It’s like GitHub but for Docker images.

- On GitHub, you store and share source code.

- On Docker Hub, you store and share container images.

- These images can be pulled (downloaded) and used by anyone, or pushed (uploaded) by you.

🔹 Key Features of Docker Hub

Image Repository

- You can host your own Docker images (public or private).

- Public repositories are free and accessible to everyone.

- Private repositories are restricted to you or your team.

Official Images

- Docker Hub provides official images (maintained by Docker & verified publishers).

- Example: mysql, nginx, redis, node, python.

Push & Pull

- Push → Upload your image to Docker Hub.

- Pull → Download and use an image from Docker Hub.

Automated Builds

- You can connect Docker Hub with GitHub/GitLab.

- Whenever you update your repo, Docker Hub can automatically build a new image.

Teams & Permissions

- Manage access control for organizations, teams, and collaborators.

Webhooks

- Trigger actions (like CI/CD pipelines) when a new image is pushed.


## Push an Image to Docker Hub:
To public or push your image to docker hub you need to run these command

#### 1. Login to docker hub:
```bash
docker login
```

then run this

```bash
docker push your-image-name
```
Docker Hub = Central place to store, share, and distribute Docker container images.


Anywhere else, you (or your team) can pull and run it:

- docker pull your-image-name
- docker run -d your-image-name


