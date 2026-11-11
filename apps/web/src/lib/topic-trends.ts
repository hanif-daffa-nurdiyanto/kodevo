export type TrendingTopic = {
  label: string
  icon: string
  goal: string
  count: number
}

export const TOPIC_MAP: { label: string; icon: string; goal: string; variants: string[] }[] = [
  { label: "Python",          icon: "🐍", goal: "Python dari nol sampai bisa",                        variants: ["python"] },
  { label: "JavaScript",      icon: "🟨", goal: "JavaScript dari dasar hingga mahir",                  variants: ["javascript", "js", "java script"] },
  { label: "TypeScript",      icon: "🔷", goal: "TypeScript dari dasar hingga mahir",                  variants: ["typescript", "ts"] },
  { label: "React",           icon: "⚛️", goal: "React dari nol untuk pemula",                         variants: ["react", "reactjs", "react js"] },
  { label: "Next.js",         icon: "▲",  goal: "Next.js untuk web development modern",                variants: ["next.js", "nextjs", "next js"] },
  { label: "Vue",             icon: "💚", goal: "Vue.js dari nol hingga mahir",                        variants: ["vue", "vuejs", "vue js"] },
  { label: "Node.js",         icon: "⚡", goal: "Backend dengan Node.js dan Express",                  variants: ["node", "nodejs", "node.js", "express"] },
  { label: "Web Development", icon: "🌐", goal: "Web development dengan HTML, CSS, dan JavaScript",    variants: ["web development", "web dev", "html", "css", "frontend", "front end"] },
  { label: "Data Science",    icon: "📊", goal: "Data Science dengan Python",                          variants: ["data science", "data scientist", "data analysis", "analisis data"] },
  { label: "Machine Learning",icon: "🤖", goal: "Machine Learning dari nol hingga implementasi",       variants: ["machine learning", "ml", "deep learning", "ai", "artificial intelligence"] },
  { label: "SQL",             icon: "🗄️", goal: "SQL dan database relasional dari dasar",              variants: ["sql", "database", "mysql", "postgresql", "postgres"] },
  { label: "Flutter",         icon: "📱", goal: "Flutter untuk membangun aplikasi mobile",             variants: ["flutter", "dart"] },
  { label: "React Native",    icon: "📲", goal: "React Native untuk aplikasi mobile",                  variants: ["react native"] },
  { label: "Android",         icon: "🤖", goal: "Android development dengan Kotlin",                   variants: ["android", "kotlin"] },
  { label: "iOS / Swift",     icon: "🍎", goal: "iOS development dengan Swift",                        variants: ["ios", "swift", "xcode"] },
  { label: "Go",              icon: "🐹", goal: "Backend dengan Go (Golang)",                          variants: ["golang", "go lang", "go "] },
  { label: "Rust",            icon: "🦀", goal: "Rust dari dasar hingga systems programming",          variants: ["rust"] },
  { label: "Docker",          icon: "🐳", goal: "Docker dan containerization dari dasar",              variants: ["docker", "container", "kubernetes", "k8s"] },
  { label: "Git",             icon: "🔀", goal: "Git dan version control dari dasar",                  variants: ["git", "github", "version control"] },
  { label: "Algoritma",       icon: "🧩", goal: "Algoritma dan struktur data",                         variants: ["algoritma", "algorithm", "struktur data", "data structure"] },
  { label: "Cybersecurity",   icon: "🔒", goal: "Cybersecurity dan ethical hacking dari dasar",        variants: ["cybersecurity", "security", "hacking", "ethical hacking"] },
  { label: "Claude Code",     icon: "✨", goal: "Claude Code untuk AI-assisted development",           variants: ["claude code", "claude ai", "vibe coding", "ai coding"] },
]

export function extractTrendingTopics(goals: string[]): TrendingTopic[] {
  const counts = new Map<string, number>()

  for (const goal of goals) {
    const lower = goal.toLowerCase()
    for (const topic of TOPIC_MAP) {
      if (topic.variants.some((v) => lower.includes(v))) {
        counts.set(topic.label, (counts.get(topic.label) ?? 0) + 1)
      }
    }
  }

  return TOPIC_MAP
    .filter((t) => counts.has(t.label))
    .map((t) => ({ label: t.label, icon: t.icon, goal: t.goal, count: counts.get(t.label)! }))
    .sort((a, b) => b.count - a.count)
}
