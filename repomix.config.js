// repomix.config.js
// Comprehensive Repomix configuration for the ArredaV2 CRM project.
// This config defines project renaming, packaging, build, preview, and optional publishing.

module.exports = {
  // Rename the project folder to a more expressive name.
  rename: {
    // Current directory (project root)
    from: ".",
    // Desired new folder name
    to: "ArredaV2CRM"
  },

  // Pack configuration for creating a distributable archive.
  pack: {
    // Output directory for the packed artifact (relative to the project root)
    outDir: "dist-pack",
    // Archive format: zip or tar.gz
    format: "zip",
    // Files/directories to include (glob patterns). Adjust as needed.
    include: [
      "src/**/*",
      "public/**/*",
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
      "README.md"
    ],
    // Files/directories to exclude.
    exclude: [
      "node_modules/**",
      "dist/**",
      "*.log",
      "*.tmp"
    ]
  },

  // Scripts to run common project tasks via Repomix.
  scripts: {
    // Build the production bundle.
    build: {
      command: "npm run build",
      description: "Compile TypeScript and bundle the app for production."
    },
    // Start a preview server for the built bundle.
    preview: {
      command: "npm run preview",
      description: "Run Vite preview to serve the production build locally."
    },
    // Start the development server.
    dev: {
      command: "npm run dev",
      description: "Launch Vite development server with hot‑module reloading."
    },
    // Run tests (if any).
    test: {
      command: "npm test",
      description: "Execute test suite (Jest/Vitest)."
    }
  },

  // Optional publish configuration (e.g., to a git remote or npm registry).
  publish: {
    // Target remote repository (GitHub example). Adjust URL if needed.
    git: {
      remote: "origin",
      branch: "main",
      // After publishing, create a pull request for the rename branch.
      createPullRequest: true,
      pullRequestTitle: "Rename project to ArredaV2CRM and update Repomix config",
      pullRequestBody: "This PR updates the repository name and adds a full Repomix configuration for building, packing, and previewing."
    }
    // npm: { registry: "https://registry.npmjs.org/" } // uncomment if publishing to npm.
  }
};
