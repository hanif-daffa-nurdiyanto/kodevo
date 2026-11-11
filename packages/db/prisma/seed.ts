import { getDatabaseUrl } from "./load-env"
import { createPgAdapter } from "../src/adapter"
import { PrismaClient } from "../src/generated/prisma/client"
import { seedDefaultBundleTracks } from "../src/bundles"
import { seedDefaultCreditSettings } from "../src/credits"
import { seedDefaultCreditPackages } from "../src/credit-packages"

const adapter = createPgAdapter(getDatabaseUrl())
const db = new PrismaClient({ adapter })

const webDevCurriculum = [
  {
    title: "Pengenalan Web Development",
    description: "Memahami bagaimana web bekerja dan tools yang dibutuhkan",
    order: 1,
    isFree: true,
    topics: [
      { title: "Apa itu Web?", description: "Memahami internet, browser, dan server", order: 1, learningObjective: "Siswa memahami perbedaan antara HTML, CSS, dan JavaScript serta peran masing-masing dalam membangun website" },
      { title: "Setup Environment", description: "Instalasi VS Code dan ekstensi penting", order: 2, learningObjective: "Siswa mampu menginstall dan mengkonfigurasi VS Code dengan ekstensi Live Server untuk mulai coding" },
      { title: "Struktur File HTML", description: "Anatomi dokumen HTML", order: 3, learningObjective: "Siswa mampu membuat file HTML dasar dengan doctype, html, head, dan body yang benar" },
    ],
  },
  {
    title: "HTML Fundamentals",
    description: "Menguasai tag-tag HTML penting untuk membangun struktur halaman",
    order: 2,
    isFree: true,
    topics: [
      { title: "Tag HTML Dasar", description: "Heading, paragraph, link, dan gambar", order: 1, learningObjective: "Siswa mampu menggunakan tag h1-h6, p, a, dan img dengan atribut yang tepat" },
      { title: "List dan Tabel", description: "Membuat list dan tabel data", order: 2, learningObjective: "Siswa mampu membuat ordered list, unordered list, dan tabel HTML yang terstruktur" },
      { title: "Form HTML", description: "Input, button, dan form submission", order: 3, learningObjective: "Siswa mampu membuat form HTML dengan input text, email, password, checkbox, radio, dan button" },
      { title: "Semantic HTML", description: "Header, nav, main, footer, article, section", order: 4, learningObjective: "Siswa memahami pentingnya semantic HTML dan mampu menggunakan elemen semantic untuk menyusun halaman" },
    ],
  },
  {
    title: "CSS Styling",
    description: "Memberikan tampilan visual yang menarik pada halaman HTML",
    order: 3,
    isFree: true,
    topics: [
      { title: "CSS Selector dan Properties", description: "Cara memilih elemen dan mengubah tampilannya", order: 1, learningObjective: "Siswa mampu menggunakan selector element, class, dan id serta properties dasar seperti color, font-size, dan background" },
      { title: "Box Model", description: "Margin, padding, border, dan sizing", order: 2, learningObjective: "Siswa memahami konsep box model dan mampu mengontrol spacing elemen dengan margin dan padding" },
      { title: "Flexbox", description: "Layout modern dengan flexbox", order: 3, learningObjective: "Siswa mampu membuat layout horizontal dan vertikal menggunakan flexbox dengan display:flex, justify-content, dan align-items" },
      { title: "Responsive Design", description: "Media query untuk berbagai ukuran layar", order: 4, learningObjective: "Siswa mampu membuat halaman yang tampil baik di mobile dan desktop menggunakan media query" },
    ],
  },
  {
    title: "JavaScript Dasar",
    description: "Menambahkan interaktivitas pada halaman web",
    order: 4,
    isFree: false,
    topics: [
      { title: "Variabel dan Tipe Data", description: "var, let, const, string, number, boolean", order: 1, learningObjective: "Siswa mampu mendeklarasikan variabel dengan let dan const serta memahami perbedaan tipe data string, number, dan boolean" },
      { title: "Kondisi dan Perulangan", description: "if/else, for, while", order: 2, learningObjective: "Siswa mampu membuat logika program dengan if/else dan melakukan perulangan dengan for loop" },
      { title: "Function", description: "Membuat dan memanggil function", order: 3, learningObjective: "Siswa mampu membuat function dengan parameter dan return value serta memahami konsep scope" },
      { title: "Array dan Object", description: "Struktur data JavaScript", order: 4, learningObjective: "Siswa mampu membuat dan memanipulasi array dan object menggunakan method seperti push, pop, map, dan filter" },
    ],
  },
  {
    title: "JavaScript DOM Manipulation",
    description: "Mengontrol halaman HTML menggunakan JavaScript",
    order: 5,
    isFree: false,
    topics: [
      { title: "DOM Selector", description: "getElementById, querySelector, querySelectorAll", order: 1, learningObjective: "Siswa mampu memilih elemen HTML dari JavaScript menggunakan berbagai metode selector" },
      { title: "Event Handling", description: "addEventListener untuk interaksi user", order: 2, learningObjective: "Siswa mampu menambahkan event listener untuk click, submit, dan keyboard events" },
      { title: "Manipulasi Konten", description: "innerHTML, textContent, classList", order: 3, learningObjective: "Siswa mampu mengubah konten, atribut, dan style elemen HTML secara dinamis menggunakan JavaScript" },
      { title: "Fetch API", description: "Mengambil data dari API", order: 4, learningObjective: "Siswa mampu mengambil data dari API menggunakan fetch dengan async/await dan menampilkan hasilnya di halaman" },
    ],
  },
  {
    title: "Project: Website Portofolio",
    description: "Membangun website portofolio lengkap dari nol",
    order: 6,
    isFree: false,
    topics: [
      { title: "Desain dan Wireframe", description: "Merencanakan layout website", order: 1, learningObjective: "Siswa mampu membuat wireframe sederhana dan menentukan struktur halaman sebelum coding" },
      { title: "Build Header dan Hero", description: "Membuat navigasi dan hero section", order: 2, learningObjective: "Siswa mampu membuat header dengan navigasi responsif dan hero section yang menarik" },
      { title: "Build Portfolio Section", description: "Menampilkan karya dalam grid", order: 3, learningObjective: "Siswa mampu membuat card grid untuk menampilkan portofolio dengan CSS Grid atau Flexbox" },
      { title: "Build Contact Form", description: "Form kontak dengan validasi JavaScript", order: 4, learningObjective: "Siswa mampu membuat form kontak dengan validasi JavaScript sebelum submission" },
      { title: "Deploy ke GitHub Pages", description: "Publish website secara gratis", order: 5, learningObjective: "Siswa mampu melakukan deploy website ke GitHub Pages sehingga bisa diakses publik" },
    ],
  },
]

async function main() {
  console.log("Seeding tracks & curriculum...")
  await seedDefaultCreditSettings(db)
  console.log("  ✓ Default credit settings")
  await seedDefaultCreditPackages(db)
  console.log("  ✓ Default credit packages")
  await seedDefaultBundleTracks(db)
  console.log("  ✓ Default bundle tracks")

  // Upsert Web Development track
  const webDevTrack = await db.track.upsert({
    where: { slug: "web-development" },
    update: {},
    create: {
      title: "Web Development",
      description: "Belajar membangun website dari nol — HTML, CSS, JavaScript, hingga project portofolio nyata.",
      slug: "web-development",
      icon: "🌐",
      order: 1,
      isFree: false,
    },
  })
  console.log(`  ✓ Track: ${webDevTrack.title}`)

  for (const moduleData of webDevCurriculum) {
    const { topics, ...moduleFields } = moduleData

    const module = await db.module.upsert({
      where: { trackId_order: { trackId: webDevTrack.id, order: moduleFields.order } },
      update: { ...moduleFields, trackId: webDevTrack.id },
      create: { ...moduleFields, trackId: webDevTrack.id },
    })

    for (const topicData of topics) {
      await db.topic.upsert({
        where: { moduleId_order: { moduleId: module.id, order: topicData.order } },
        update: { ...topicData },
        create: { moduleId: module.id, ...topicData },
      })
    }

    console.log(`    ✓ Module ${module.order}: ${module.title} (${topics.length} topics)`)
  }

  console.log("Seeding complete.")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
