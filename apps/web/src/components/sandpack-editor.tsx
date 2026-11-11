"use client"

import {
  SandpackProvider,
  SandpackCodeEditor,
  useSandpack,
} from "@codesandbox/sandpack-react"
import React, {
  createContext, forwardRef, Fragment, memo,
  useCallback, useContext, useEffect, useMemo,
  useReducer, useRef, useState, type ReactNode,
} from "react"
import { cn } from "@kodevo/utils"

type SandpackTemplate = "static" | "react" | "react-ts"

export function getSandpackTemplate(language: string): SandpackTemplate {
  if (language === "typescript") return "react-ts"
  if (language === "react")      return "react"
  return "static"
}

export function normaliseSandpackFiles(
  files: Record<string, string>
): Record<string, { code: string; active?: boolean }> {
  return Object.fromEntries(
    Object.entries(files).map(([filename, code], i) => {
      const key = filename.startsWith("/") ? filename : `/${filename}`
      return [key, { code, active: i === 0 }]
    })
  )
}

// Custom tab bar — only shows exercise files
function FileTabs({ userFiles }: { userFiles: string[] }) {
  const { sandpack } = useSandpack()
  if (userFiles.length <= 1) return null
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-white/10 bg-[#1e1e1e]">
      {userFiles.map((path) => {
        const name     = path.split("/").pop() ?? path
        const isActive = sandpack.activeFile === path
        return (
          <button
            key={path}
            onClick={() => sandpack.setActiveFile(path)}
            className={cn(
              "h-full px-4 text-xs font-medium border-b-2 transition-colors",
              isActive
                ? "border-blue-400 text-white bg-[#252526]"
                : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2a2b]"
            )}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

// Watches files and notifies parent without triggering re-renders
export function SandpackFilesWatcher({
  watchPaths,
  onChange,
}: {
  watchPaths: string[]
  onChange: (files: Record<string, string>) => void
}) {
  const { sandpack } = useSandpack()
  const prevRef = useRef<string>("")

  useEffect(() => {
    const entries: [string, string][] = watchPaths.map(p => {
      const norm    = p.startsWith("/") ? p : `/${p}`
      const noSlash = norm.slice(1)
      const code    = sandpack.files[norm]?.code ?? sandpack.files[noSlash]?.code ?? ""
      return [noSlash, code]
    })
    const snapshot = JSON.stringify(Object.fromEntries(entries))
    if (snapshot !== prevRef.current) {
      prevRef.current = snapshot
      onChange(Object.fromEntries(entries))
    }
  })

  return null
}

// ── Live preview helpers ───────────────────────────────────────────────────

// Combine HTML + CSS + JS files into a single srcdoc string
function buildStaticSrcdoc(files: Record<string, { code: string }>): string {
  const get = (...names: string[]) => {
    for (const n of names) {
      const v = files[`/${n}`]?.code ?? files[n]?.code
      if (v != null) return v
    }
    return ""
  }

  const html = get("index.html")
  const css  = get("styles.css", "style.css")
  const js   = get("index.js", "script.js")

  if (html) {
    let doc = html
    if (css) {
      doc = /<link[^>]*(styles?\.css)[^>]*>/i.test(doc)
        ? doc.replace(/<link[^>]*(styles?\.css)[^>]*>/gi, `<style>${css}</style>`)
        : doc.replace("</head>", `<style>${css}</style></head>`)
    }
    if (js) {
      doc = /<script[^>]*(index|script)\.js[^>]*><\/script>/i.test(doc)
        ? doc.replace(/<script[^>]*(index|script)\.js[^>]*><\/script>/gi, `<script>${js}</script>`)
        : doc.replace("</body>", `<script>${js}</script></body>`)
    }
    return doc
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body><script>${js}</script></body></html>`
}

// Strip imports + export default, append render() — required by react-live noInline mode
function prepareReactCode(raw: string): string {
  const code = raw
    .split("\n")
    .filter(l => !l.trim().startsWith("import "))
    .join("\n")
    .replace(/export\s+default\s+function\s+/g, "function ")
    .replace(/export\s+default\s+class\s+/g, "class ")
    .replace(/export\s+default\s+/g, "")

  if (code.includes("render(")) return code

  const name =
    code.match(/^function\s+([A-Z]\w*)/m)?.[1] ??
    code.match(/^(?:const|let)\s+([A-Z]\w*)\s*=/m)?.[1] ??
    code.match(/^class\s+([A-Z]\w*)/m)?.[1] ??
    "App"

  return `${code}\nrender(<${name} />)`
}

// Persistent iframe — loads React 18 + Babel from CDN, receives code via postMessage.
// Avoids React 19 / react-live peer-dep incompatibility entirely.
const REACT_PREVIEW_SRCDOC = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{margin:0;padding:16px;font-family:system-ui,sans-serif}
#err{color:#dc2626;font-size:12px;font-family:monospace;background:#fef2f2;padding:8px;border-radius:4px;white-space:pre-wrap;margin-top:8px;display:none}
</style>
</head>
<body>
<div id="root"></div>
<pre id="err"></pre>
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.development.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.development.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.0/babel.min.js"></script>
<script>
var _root=ReactDOM.createRoot(document.getElementById('root'));
var _err=document.getElementById('err');
function showErr(e){_err.style.display='block';_err.textContent=String(e&&e.message||e)}
function run(code){
  _err.style.display='none';_err.textContent='';
  try{
    var out=Babel.transform(code,{
      presets:[['react',{runtime:'classic'}],['typescript',{allExtensions:true,isTSX:true}]],
      filename:'app.tsx'
    }).code;
    var R=window.React;
    (new Function(
      'React','useState','useEffect','useRef','useMemo','useCallback',
      'useReducer','useContext','createContext','Fragment','forwardRef','memo','render',
      out
    ))(
      R,R.useState,R.useEffect,R.useRef,R.useMemo,R.useCallback,
      R.useReducer,R.useContext,R.createContext,R.Fragment,R.forwardRef,R.memo,
      function(el){try{_root.render(el)}catch(e){showErr(e)}}
    );
  }catch(e){showErr(e)}
}
window.addEventListener('message',function(e){if(e.data&&e.data.type==='code')run(e.data.code)});
window.parent.postMessage({type:'ready'},'*');
</script>
</body>
</html>`

function ReactLivePreview({ files }: { files: Record<string, { code: string }> }) {
  const iframeRef  = useRef<HTMLIFrameElement>(null)
  const readyRef   = useRef(false)
  const pendingRef = useRef<string | null>(null)

  const rawCode =
    files["/App.tsx"]?.code ??
    files["/App.js"]?.code ??
    Object.values(files)[0]?.code ?? ""

  const sendCode = useCallback((code: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "code", code }, "*")
  }, [])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "ready") {
        readyRef.current = true
        if (pendingRef.current != null) {
          sendCode(pendingRef.current)
          pendingRef.current = null
        }
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [sendCode])

  useEffect(() => {
    const prepared = prepareReactCode(rawCode)
    const t = setTimeout(() => {
      if (readyRef.current) sendCode(prepared)
      else pendingRef.current = prepared
    }, 300)
    return () => clearTimeout(t)
  }, [rawCode, sendCode])

  return (
    <iframe
      ref={iframeRef}
      srcDoc={REACT_PREVIEW_SRCDOC}
      sandbox="allow-scripts"
      style={{ width: "100%", height: "100%", border: "none" }}
      title="React Preview"
    />
  )
}

// HTML/CSS/JS preview — injects files into iframe via srcdoc, no transpiler needed
function StaticLivePreview({ files }: { files: Record<string, { code: string }> }) {
  const [srcdoc, setSrcdoc] = useState(() => buildStaticSrcdoc(files))

  useEffect(() => {
    const t = setTimeout(() => setSrcdoc(buildStaticSrcdoc(files)), 300)
    return () => clearTimeout(t)
  }, [files])

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-forms allow-modals"
      style={{ width: "100%", height: "100%", border: "none" }}
      title="Preview"
    />
  )
}

// Drop-in replacement for the old SandpackPreviewPane — reads files from
// SandpackProvider context and renders with the appropriate engine.
export function LivePreviewPane({ language }: { language: string }) {
  const { sandpack } = useSandpack()
  const isReact = language === "react" || language === "typescript"
  return isReact
    ? <ReactLivePreview files={sandpack.files} />
    : <StaticLivePreview files={sandpack.files} />
}

// ── IDE ────────────────────────────────────────────────────────────────────

interface SandpackIDEProps {
  exerciseId: string
  language: string
  files: Record<string, string>
  userFiles: string[]
  readOnly?: boolean
  onFilesChange: (files: Record<string, string>) => void
  rightSlot: ReactNode
}

// SandpackProvider is kept only for SandpackCodeEditor (syntax highlighting,
// line numbers, inline errors). No SandpackPreview = no remote bundler created.
export function SandpackIDE({
  exerciseId,
  language,
  files,
  userFiles,
  readOnly = false,
  onFilesChange,
  rightSlot,
}: SandpackIDEProps) {
  const normalisedFiles = useMemo(() => normaliseSandpackFiles(files), [files])

  return (
    <SandpackProvider
      key={exerciseId}
      template={getSandpackTemplate(language)}
      files={normalisedFiles}
      theme="dark"
      options={{
        initMode:     "immediate",
        visibleFiles: userFiles,
        activeFile:   userFiles[0],
      }}
      style={{ flex: 1, display: "flex", flexDirection: "row", minWidth: 0, height: "100%" }}
    >
      <SandpackFilesWatcher watchPaths={userFiles} onChange={onFilesChange} />

      {/* Editor pane */}
      <div style={{ flex: 1, minWidth: 0, height: "100%", borderRight: "1px solid hsl(var(--border))", display: "flex", flexDirection: "column" }}>
        <FileTabs userFiles={userFiles} />
        <SandpackCodeEditor
          showTabs={false}
          showLineNumbers
          showInlineErrors
          readOnly={readOnly}
          style={{ flex: 1, minHeight: 0 }}
        />
      </div>

      {/* Right pane — LivePreviewPane lives here via rightSlot */}
      {rightSlot}
    </SandpackProvider>
  )
}
