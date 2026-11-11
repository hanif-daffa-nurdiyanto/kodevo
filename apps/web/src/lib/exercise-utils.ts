// Client-safe utilities for exercise starter code — no server-only imports

export const PROJECT_LANGUAGES = [
  "nextjs", "fastapi", "django", "express", "nestjs",
  "springboot", "laravel", "flutter",
] as const

export type ProjectLanguage = typeof PROJECT_LANGUAGES[number]

export function isProjectLanguage(lang: string): lang is ProjectLanguage {
  return PROJECT_LANGUAGES.includes(lang as ProjectLanguage)
}

// Files to fetch from GitHub per framework (include patterns, exclude patterns)
export const PROJECT_FILE_FILTERS: Record<ProjectLanguage, {
  include: RegExp[]
  exclude: RegExp[]
  maxFiles: number
}> = {
  nextjs: {
    include: [/\.(tsx?|jsx?|css|json)$/, /^(app|pages|components|lib|hooks|utils|src)\//],
    exclude: [/node_modules/, /\.next/, /dist/, /build/, /\.lock$/, /package-lock/],
    maxFiles: 20,
  },
  fastapi: {
    include: [/\.py$/, /requirements\.txt$/, /pyproject\.toml$/],
    exclude: [/__pycache__/, /\.pyc$/, /venv\//, /\.env/],
    maxFiles: 20,
  },
  django: {
    include: [/\.py$/, /requirements\.txt$/, /pyproject\.toml$/],
    exclude: [/__pycache__/, /\.pyc$/, /venv\//, /migrations\//],
    maxFiles: 20,
  },
  express: {
    include: [/\.(js|ts|json)$/, /^(src|routes|middleware|controllers|models)\//],
    exclude: [/node_modules/, /dist/, /\.lock$/],
    maxFiles: 20,
  },
  nestjs: {
    include: [/\.(ts|json)$/, /^(src|test)\//],
    exclude: [/node_modules/, /dist/, /\.lock$/],
    maxFiles: 20,
  },
  springboot: {
    include: [/\.java$/, /pom\.xml$/, /build\.gradle$/, /\.properties$/, /\.yml$/],
    exclude: [/target\//, /\.class$/],
    maxFiles: 20,
  },
  laravel: {
    include: [/\.php$/, /composer\.json$/, /^(app|routes|config|database\/migrations)\//],
    exclude: [/vendor\//, /node_modules/, /\.lock$/],
    maxFiles: 20,
  },
  flutter: {
    include: [/\.dart$/, /pubspec\.yaml$/],
    exclude: [/\.dart_tool/, /build\//],
    maxFiles: 20,
  },
}

export const PROJECT_LANGUAGE_LABELS: Record<ProjectLanguage, string> = {
  nextjs:     "Next.js",
  fastapi:    "FastAPI",
  django:     "Django",
  express:    "Express.js",
  nestjs:     "NestJS",
  springboot: "Spring Boot",
  laravel:    "Laravel",
  flutter:    "Flutter",
}

export function getExerciseFiles(language: string): Record<string, string> {
  if (language === "python")     return { "main.py": "# Tulis kode Python kamu di sini\n\n" }
  if (language === "sql")        return { "query.sql": "-- Tulis query SQL kamu di sini\n\nSELECT " }
  if (language === "nextjs")     return { "page.tsx": "// Tulis solusi Next.js kamu di sini\n\n" }
  if (language === "fastapi")    return { "main.py": "# Tulis solusi FastAPI kamu di sini\n\nfrom fastapi import FastAPI\n\napp = FastAPI()\n\n" }
  if (language === "django")     return { "views.py": "# Tulis solusi Django kamu di sini\n\nfrom django.http import HttpResponse\n\n" }
  if (language === "express")    return { "index.js": "// Tulis solusi Express.js kamu di sini\n\nconst express = require('express')\nconst app = express()\n\n" }
  if (language === "nestjs")     return { "app.service.ts": "// Tulis solusi NestJS kamu di sini\n\n" }
  if (language === "springboot") return { "Main.java": "// Tulis solusi Spring Boot kamu di sini\n\n" }
  if (language === "laravel")    return { "routes.php": "<?php\n// Tulis solusi Laravel kamu di sini\n\n" }
  if (language === "flutter")    return { "main.dart": "// Tulis solusi Flutter kamu di sini\n\nimport 'package:flutter/material.dart';\n\n" }
  if (language === "react") return {
    "App.js": "import { useState } from 'react'\n\nexport default function App() {\n  // TODO: implementasikan di sini\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  )\n}\n",
  }
  if (language === "typescript") return {
    "App.tsx": "import { useState } from 'react'\n\nexport default function App() {\n  // TODO: implementasikan di sini\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  )\n}\n",
  }
  if (language === "javascript") return {
    "index.html": "<!DOCTYPE html>\n<html lang=\"id\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Latihan</title>\n</head>\n<body>\n\n  <!-- Struktur HTML di sini -->\n\n  <script src=\"index.js\"></script>\n</body>\n</html>\n",
    "index.js": "// Tulis kode JavaScript kamu di sini\n\n",
  }
  return {
    "index.html": "<!DOCTYPE html>\n<html lang=\"id\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Latihan</title>\n  <link rel=\"stylesheet\" href=\"styles.css\">\n</head>\n<body>\n\n  <!-- Tulis HTML kamu di sini -->\n\n  <script src=\"index.js\"></script>\n</body>\n</html>\n",
    "styles.css": "/* Tulis CSS kamu di sini */\n\n",
    "index.js": "// Tulis JavaScript kamu di sini\n\n",
  }
}

export function sanitizeExerciseStarterCode(
  language: string,
  starterCode: Record<string, string> | null | undefined
): Record<string, string> {
  const isReact = language === "react" || language === "typescript"
  const files = starterCode && Object.keys(starterCode).length > 0
    ? starterCode
    : getExerciseFiles(language)
  return isReact ? sanitizeReactFiles(files) : files
}

function sanitizeReactFiles(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).map(([name, code]) => [name, sanitizeOneFile(code)])
  )
}

function sanitizeOneFile(code: string): string {
  // 1. Remove forbidden single-line imports
  let out = code
    .split("\n")
    .filter(line => !/^\s*import\s+.*\s+from\s+['"](?:next\/|@\/|react-router|wouter)/.test(line))
    .join("\n")

  // 2. Replace Next.js JSX components with plain HTML equivalents
  out = out
    .replace(/<Link\s+href=/g, "<a href=")
    .replace(/<\/Link>/g, "</a>")
    .replace(/<Image(\s)/g, "<img$1")
    .replace(/<\/Image>/g, "")
    .replace(/<Head>/g, "<>")
    .replace(/<\/Head>/g, "</>")

  // 3. Ensure there is a default export — "but got: object" error happens when
  //    App.js has only named exports (the bundler returns the module namespace object).
  if (!/export\s+default\b/.test(out)) {
    // Try to convert the first named arrow-function export into a default export
    const converted = out.replace(
      /export\s+(?:const|function)\s+(\w+)\s*(?::\s*[A-Za-z<>, ]+)?\s*=\s*(?:\([^)]*\)|[^=])\s*=>/,
      "export default function $1("
    )
    if (converted !== out) {
      out = converted
    } else {
      // Last resort: append a re-export as default for the most likely component name
      const match = out.match(/(?:const|function)\s+(App|Page|Home|Component|Main|Index)\b/)
      if (match) {
        out += `\n\nexport default ${match[1]}\n`
      } else {
        // Replace the whole file with a safe placeholder
        out = getExerciseFiles("react")["App.js"]
      }
    }
  }

  return out
}
