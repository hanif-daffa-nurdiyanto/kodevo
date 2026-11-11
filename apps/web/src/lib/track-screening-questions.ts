import type { ScreeningQuestion } from "@/types"

export interface TrackScreeningConfig {
  trackName: string
  questions: ScreeningQuestion[]
}

const webDevQuestions: ScreeningQuestion[] = [
  {
    id: "tq1",
    type: "mcq",
    question: "Apa kepanjangan dari HTML?",
    options: [
      "HyperText Markup Language",
      "High Tech Modern Language",
      "HyperText Making Links",
      "Home Tool Markup Language",
    ],
    correctAnswer: "HyperText Markup Language",
    targetLevel: "BEGINNER",
  },
  {
    id: "tq2",
    type: "mcq",
    question: "Perhatikan CSS ini: `div { margin: 10px 20px; }`. Apa artinya?",
    options: [
      "Margin atas-bawah 10px, kiri-kanan 20px",
      "Margin kiri-kanan 10px, atas-bawah 20px",
      "Margin semua sisi 10px lalu 20px bergantian",
      "Margin atas 10px dan kanan 20px saja",
    ],
    correctAnswer: "Margin atas-bawah 10px, kiri-kanan 20px",
    targetLevel: "MID",
  },
  {
    id: "tq3",
    type: "mcq",
    question: "Apa perbedaan antara `id` dan `class` di HTML?",
    options: [
      "Tidak ada perbedaan",
      "id unik per halaman, class bisa dipakai berkali-kali",
      "class unik, id bisa berkali-kali",
      "id untuk styling, class untuk JavaScript",
    ],
    correctAnswer: "id unik per halaman, class bisa dipakai berkali-kali",
    targetLevel: "MID",
  },
  {
    id: "tq4",
    type: "mcq",
    question: "Apa output dari kode JavaScript ini?\n\n```js\nconsole.log(typeof null);\n```",
    options: ["'null'", "'undefined'", "'object'", "'boolean'"],
    correctAnswer: "'object'",
    targetLevel: "ADVANCE",
  },
  {
    id: "tq5",
    type: "mcq",
    question: "Apa perbedaan utama `let` dan `var` di JavaScript?",
    options: [
      "Tidak ada perbedaan",
      "`let` block scope, `var` function scope",
      "`var` block scope, `let` function scope",
      "`let` tidak bisa di-reassign",
    ],
    correctAnswer: "`let` block scope, `var` function scope",
    targetLevel: "ADVANCE",
  },
  {
    id: "tq6",
    type: "analysis",
    question:
      "Jelaskan apa yang dilakukan kode ini dan apa hasilnya:\n\n```js\nconst arr = [1, 2, 3, 4, 5];\nconst result = arr.filter(n => n % 2 === 0).map(n => n * 2);\nconsole.log(result);\n```",
    targetLevel: "ADVANCE",
  },
]

const pythonQuestions: ScreeningQuestion[] = [
  {
    id: "tq1",
    type: "mcq",
    question: "Mana cara yang benar untuk membuat variabel string di Python?",
    options: [
      'name = "Alice"',
      "String name = 'Alice'",
      "var name = 'Alice'",
      "let name = 'Alice'",
    ],
    correctAnswer: 'name = "Alice"',
    targetLevel: "BEGINNER",
  },
  {
    id: "tq2",
    type: "mcq",
    question: "Apa output dari kode Python ini?\n\n```python\nprint(type([]))\n```",
    options: ["<class 'list'>", "<class 'array'>", "list", "[]"],
    correctAnswer: "<class 'list'>",
    targetLevel: "BEGINNER",
  },
  {
    id: "tq3",
    type: "mcq",
    question: "Apa perbedaan `list` dan `tuple` di Python?",
    options: [
      "Tidak ada perbedaan",
      "List mutable, tuple immutable",
      "Tuple mutable, list immutable",
      "List hanya untuk angka, tuple untuk string",
    ],
    correctAnswer: "List mutable, tuple immutable",
    targetLevel: "MID",
  },
  {
    id: "tq4",
    type: "mcq",
    question: "Apa yang dimaksud dengan decorator di Python?",
    options: [
      "Cara memberi nama pada fungsi",
      "Fungsi yang membungkus fungsi lain untuk menambah perilaku",
      "Cara membuat kelas turunan",
      "Sintaks untuk import modul",
    ],
    correctAnswer: "Fungsi yang membungkus fungsi lain untuk menambah perilaku",
    targetLevel: "ADVANCE",
  },
  {
    id: "tq5",
    type: "mcq",
    question: "Apa output dari kode ini?\n\n```python\nx = [1, 2, 3]\ny = x\ny.append(4)\nprint(x)\n```",
    options: ["[1, 2, 3]", "[1, 2, 3, 4]", "Error", "[4]"],
    correctAnswer: "[1, 2, 3, 4]",
    targetLevel: "MID",
  },
  {
    id: "tq6",
    type: "analysis",
    question:
      "Jelaskan apa yang dilakukan kode ini:\n\n```python\nresult = [x**2 for x in range(10) if x % 2 == 0]\n```",
    targetLevel: "ADVANCE",
  },
]

// Fallback: generic programming logic questions
const genericQuestions: ScreeningQuestion[] = [
  {
    id: "tq1",
    type: "mcq",
    question: "Apa yang dimaksud dengan variabel dalam pemrograman?",
    options: [
      "Tempat menyimpan data yang bisa berubah",
      "Fungsi untuk menghitung nilai",
      "Perintah untuk mencetak output",
      "Nama file program",
    ],
    correctAnswer: "Tempat menyimpan data yang bisa berubah",
    targetLevel: "BEGINNER",
  },
  {
    id: "tq2",
    type: "mcq",
    question: "Apa yang dimaksud dengan loop (perulangan)?",
    options: [
      "Cara menghentikan program",
      "Blok kode yang dieksekusi berulang kali selama kondisi terpenuhi",
      "Cara menyimpan banyak data",
      "Fungsi bawaan bahasa pemrograman",
    ],
    correctAnswer: "Blok kode yang dieksekusi berulang kali selama kondisi terpenuhi",
    targetLevel: "BEGINNER",
  },
  {
    id: "tq3",
    type: "mcq",
    question: "Apa perbedaan antara `==` dan `===` (atau `is`) dalam konteks perbandingan nilai?",
    options: [
      "Tidak ada perbedaan",
      "`==` membandingkan nilai, `===` membandingkan nilai dan tipe data",
      "`===` membandingkan nilai saja",
      "`==` hanya untuk angka",
    ],
    correctAnswer: "`==` membandingkan nilai, `===` membandingkan nilai dan tipe data",
    targetLevel: "MID",
  },
  {
    id: "tq4",
    type: "mcq",
    question: "Apa yang dimaksud dengan rekursi?",
    options: [
      "Fungsi yang memanggil dirinya sendiri",
      "Loop yang tidak punya kondisi berhenti",
      "Cara menyimpan data dalam array",
      "Method untuk sorting data",
    ],
    correctAnswer: "Fungsi yang memanggil dirinya sendiri",
    targetLevel: "MID",
  },
  {
    id: "tq5",
    type: "mcq",
    question: "Apa itu Big O notation?",
    options: [
      "Cara menulis kode yang bersih",
      "Cara mengukur kompleksitas waktu/ruang dari sebuah algoritma",
      "Library untuk matematika",
      "Tipe data khusus angka besar",
    ],
    correctAnswer: "Cara mengukur kompleksitas waktu/ruang dari sebuah algoritma",
    targetLevel: "ADVANCE",
  },
  {
    id: "tq6",
    type: "analysis",
    question:
      "Kamu punya list angka `[3, 1, 4, 1, 5, 9, 2, 6]`. Jelaskan bagaimana kamu akan mencari angka terbesar tanpa menggunakan fungsi bawaan seperti `max()`.",
    targetLevel: "ADVANCE",
  },
]

const TRACK_QUESTIONS: Record<string, TrackScreeningConfig> = {
  "web-dev": {
    trackName: "Web Development",
    questions: webDevQuestions,
  },
  python: {
    trackName: "Python",
    questions: pythonQuestions,
  },
}

function compactText(value?: string | null, fallback = "materi ini"): string {
  const normalized = value?.replace(/\s+/g, " ").trim()
  if (!normalized) return fallback
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized
}

function pickItem<T>(items: T[], index: number): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.min(items.length - 1, Math.max(0, index))]
}

export function getContextualTrackScreeningQuestions(params: {
  trackName: string
  trackDescription?: string | null
  modules: Array<{
    title: string
    description?: string | null
    topics?: Array<{ title: string }>
  }>
}): TrackScreeningConfig {
  if (params.modules.length === 0) {
    return {
      trackName: params.trackName,
      questions: genericQuestions,
    }
  }

  const firstModule = pickItem(params.modules, 0)!
  const middleModule = pickItem(params.modules, Math.floor(params.modules.length / 2)) ?? firstModule
  const lastModule = pickItem(params.modules, params.modules.length - 1) ?? firstModule
  const firstTopic = firstModule.topics?.[0]?.title ?? firstModule.title
  const middleTopic = middleModule.topics?.[0]?.title ?? middleModule.title
  const lastTopic = lastModule.topics?.[0]?.title ?? lastModule.title
  const moduleOptions = Array.from(
    new Set([
      firstModule.title,
      middleModule.title,
      lastModule.title,
      "Dasar pemrograman umum",
    ])
  ).slice(0, 4)
  while (moduleOptions.length < 4) moduleOptions.push(`Materi ${moduleOptions.length + 1}`)

  const topicOptions = Array.from(
    new Set([
      firstTopic,
      middleTopic,
      lastTopic,
      "Debugging tanpa konteks",
    ])
  ).slice(0, 4)
  while (topicOptions.length < 4) topicOptions.push(`Topik ${topicOptions.length + 1}`)

  return {
    trackName: params.trackName,
    questions: [
      {
        id: "tq1",
        type: "mcq",
        question: `Dari pilihan berikut, materi mana yang paling awal perlu dipahami saat mulai belajar ${params.trackName}?`,
        options: moduleOptions,
        correctAnswer: firstModule.title,
        targetLevel: "BEGINNER",
      },
      {
        id: "tq2",
        type: "mcq",
        question: `Apa fokus utama dari topik "${compactText(firstTopic)}" dalam track ${params.trackName}?`,
        options: [
          `Memahami dasar ${compactText(firstTopic, params.trackName)}`,
          "Menghafal semua istilah tanpa praktik",
          "Melewati fundamental dan langsung deployment",
          "Mengabaikan konteks project",
        ],
        correctAnswer: `Memahami dasar ${compactText(firstTopic, params.trackName)}`,
        targetLevel: "BEGINNER",
      },
      {
        id: "tq3",
        type: "mcq",
        question: `Jika kamu sudah memahami module "${compactText(firstModule.title)}", topik mana yang paling masuk akal untuk mulai dinaikkan ke level berikutnya?`,
        options: topicOptions,
        correctAnswer: middleTopic,
        targetLevel: "MID",
      },
      {
        id: "tq4",
        type: "mcq",
        question: `Saat mengerjakan "${compactText(middleModule.title)}", pendekatan mana yang paling tepat?`,
        options: [
          "Memahami konsep, mencoba contoh kecil, lalu menerapkannya ke latihan",
          "Langsung menyalin solusi tanpa membaca error",
          "Mengubah banyak hal sekaligus tanpa menguji",
          "Menghindari dokumentasi dan feedback",
        ],
        correctAnswer: "Memahami konsep, mencoba contoh kecil, lalu menerapkannya ke latihan",
        targetLevel: "MID",
      },
      {
        id: "tq5",
        type: "mcq",
        question: `Untuk membuktikan kamu siap masuk materi lanjutan seperti "${compactText(lastModule.title)}", kemampuan apa yang paling penting?`,
        options: [
          "Mampu menjelaskan trade-off dan memilih solusi sesuai konteks",
          "Hanya menghafal nama tools",
          "Selalu memilih solusi paling rumit",
          "Mengabaikan testing dan debugging",
        ],
        correctAnswer: "Mampu menjelaskan trade-off dan memilih solusi sesuai konteks",
        targetLevel: "ADVANCE",
      },
      {
        id: "tq6",
        type: "analysis",
        question: `Jelaskan dengan bahasamu sendiri bagaimana kamu akan mempelajari dan mempraktikkan "${compactText(lastTopic)}" sampai bisa dipakai dalam project nyata.`,
        targetLevel: "ADVANCE",
      },
    ],
  }
}

export function getTrackScreeningQuestions(trackSlug: string): TrackScreeningConfig {
  return (
    TRACK_QUESTIONS[trackSlug] ?? {
      trackName: trackSlug,
      questions: genericQuestions,
    }
  )
}
