# VACUI OS

**An operating system that is a website that is its own source code.**

> *The ouroboros compiles.*

---

## What is this?

This is a website hosted on GitHub Pages that looks and behaves like an operating system. The operating system's filesystem contains the very GitHub repository that hosts it. When you browse files inside the OS, you're reading the source code that generates the OS that lets you read the source code.

It's turtles all the way down, except the turtles are TypeScript files and they're all looking at themselves in a mirror.

## How it works

1. You visit [vacui-dev.github.io](https://vacui-dev.github.io)
2. A React app builds itself via GitHub Actions
3. The app boots an operating system UI
4. The OS mounts its own GitHub repository as a virtual drive
5. You can browse, read, and eventually edit the files that generate the thing you're looking at
6. Any changes pushed to `main` trigger a rebuild
7. The ouroboros swallows its tail again

## Architecture

```
GitHub Repo (vacui-dev.github.io)
  ↓ push to main
GitHub Actions (builds with Vite)
  ↓ deploys to Pages
Browser loads vacui-dev.github.io
  ↓ React app boots
Desktop Environment renders
  ↓ GitHubMount service
Fetches own repo via GitHub API
  ↓ mounts as virtual drive
User browses own source code
  ↓ opens file
Reads the code that does this ← (you are here)
```

## Running locally

```bash
git clone https://github.com/vacui-dev/vacui-dev.github.io.git
cd vacui-dev.github.io
npm install
npm run dev
```

## Contributing

This is an open source performance piece. Contributions that make the recursion deeper, the self-reference more tangled, or the experience more unsettling are welcome. Contributions that make it "production-ready" are missing the point.

Some ideas:
- Apps that modify the repo they're running from
- A text editor that opens GitHub Issues about the bugs it contains
- A terminal that runs `git log` on the repo that hosts it
- A music player that sonifies its own build logs
- A process manager that shows the GitHub Actions workflow that built it

## License

This is art. Do what you want with it.

---

*Built with React, Vite, TypeScript, GitHub Actions, and an unhealthy relationship with self-reference.*
