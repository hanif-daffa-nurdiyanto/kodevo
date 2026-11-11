import type { ScreeningQuestion } from "@/types"

export const screeningQuestions: ScreeningQuestion[] = [
  // ── Knowledge (Q1–Q6) ──────────────────────────────────────────────
  {
    id: "k1",
    type: "mcq",
    category: "level",
    question: "Apa itu variabel dalam programming?",
    options: [
      "Nama file yang disimpan di komputer",
      "Tempat menyimpan data atau nilai yang bisa dipakai ulang",
      "Cara menghubungkan dua aplikasi",
      "Tombol yang bisa diklik di website",
    ],
    correctAnswer: "Tempat menyimpan data atau nilai yang bisa dipakai ulang",
  },
  {
    id: "k2",
    type: "mcq",
    category: "level",
    question: "Apa fungsi dari function/fungsi dalam kode?",
    options: [
      "Mengubah tampilan halaman secara otomatis",
      "Menghubungkan aplikasi ke internet",
      "Sekumpulan instruksi yang bisa dipanggil dan dijalankan berulang kali",
      "Menyimpan data ke database",
    ],
    correctAnswer: "Sekumpulan instruksi yang bisa dipanggil dan dijalankan berulang kali",
  },
  {
    id: "k3",
    type: "mcq",
    category: "level",
    question: "Apa yang dimaksud dengan loop/perulangan?",
    options: [
      "Proses menghapus data yang sudah tidak dipakai",
      "Instruksi yang dijalankan berulang kali selama kondisi tertentu terpenuhi",
      "Cara menampilkan teks di layar",
      "Metode untuk mengatur tampilan halaman",
    ],
    correctAnswer: "Instruksi yang dijalankan berulang kali selama kondisi tertentu terpenuhi",
  },
  {
    id: "k4",
    type: "mcq",
    category: "level",
    question: "Apa itu API?",
    options: [
      "Aplikasi khusus untuk membuat desain antarmuka",
      "Cara dua sistem atau aplikasi berkomunikasi dan bertukar data",
      "Bahasa pemrograman khusus untuk web",
      "Jenis database yang menyimpan data dalam tabel",
    ],
    correctAnswer: "Cara dua sistem atau aplikasi berkomunikasi dan bertukar data",
  },
  {
    id: "k5",
    type: "mcq",
    category: "level",
    question: "Apa yang dimaksud dengan asynchronous programming?",
    options: [
      "Kode yang harus dijalankan secara berurutan satu per satu",
      "Kode yang bisa menjalankan proses lain tanpa menunggu proses sebelumnya selesai",
      "Teknik menulis kode yang lebih pendek dan ringkas",
      "Cara mengatur tampilan animasi di website",
    ],
    correctAnswer: "Kode yang bisa menjalankan proses lain tanpa menunggu proses sebelumnya selesai",
  },
  {
    id: "k6",
    type: "mcq",
    category: "level",
    question: "Apa itu git dalam pengembangan software?",
    options: [
      "Framework untuk membangun aplikasi web",
      "Bahasa pemrograman berbasis visual",
      "Tools untuk melacak perubahan kode dan berkolaborasi dalam tim",
      "Layanan cloud untuk menyimpan file biasa",
    ],
    correctAnswer: "Tools untuk melacak perubahan kode dan berkolaborasi dalam tim",
  },

  // ── Preferences (Q7–Q8) ────────────────────────────────────────────
  {
    id: "p1",
    type: "mcq",
    category: "preference",
    question: "Saat belajar hal baru, kamu biasanya lebih suka...",
    options: [
      "📖 Baca penjelasan lengkap dulu, baru coba praktik",
      "🧩 Baca sedikit, langsung coba, baca lagi kalau stuck",
      "⚡ Langsung tantangan dulu, baru cari penjelasan kalau mentok",
    ],
  },
  {
    id: "p2",
    type: "mcq",
    category: "preference",
    question: "Kamu lebih nyaman belajar dengan...",
    options: [
      "🗺️ Panduan yang jelas step-by-step",
      "🧭 Arah umum, selebihnya aku eksplorasi sendiri",
      "🏄 Langsung lempar ke masalah, aku cari sendiri",
    ],
  },
]

export const knowledgeQuestions = screeningQuestions.filter((q) => q.category === "level")
