// store.js - State Management & LocalStorage Handler for WaliKelas Digital

const STORE_KEY = 'walikelas_digital_state';

// Grade categories. PH is MULTI-entry (averaged within the category);
// SAS is SINGLE-entry (one value per subject).
const GRADE_CATEGORIES = [
  { id: 'ph', name: 'Penilaian Harian', multi: true },
  { id: 'sas', name: 'Sumatif Akhir Semester (SAS)', multi: false }
];
const GRADE_CATEGORY_IDS = GRADE_CATEGORIES.map(c => c.id);
// Default per-category weight (percentages, sum 100). Editable per subject.
const DEFAULT_CATEGORY_WEIGHTS = { ph: 60, sas: 40 };
const DEFAULT_KKM = 70;

const INITIAL_STATE = {
  settings: {
    password: 'admin',
    className: 'Kelas 4-A',
    schoolName: 'SDN Harapan Bangsa',
    curriculum: 'merdeka', // 'merdeka' or 'k13'
    academicYear: '2025/2026',
    kkm: DEFAULT_KKM,
    subjects: [
      { id: 'matematika', name: 'Matematika' },
      { id: 'indonesia', name: 'Bahasa Indonesia' },
      { id: 'ipa', name: 'IPA / IPAS' },
      { id: 'agama', name: 'Pendidikan Agama' }
    ]
  },
  students: [],
  attendance: {}, // { "YYYY-MM-DD": { "std_id": "H|S|I|A" } }
  grades: {}, // { "std_id": { "subject": { "tugas1": 80, ... } } }
  character: {}, // { "std_id": { "spiritual": { "ibadah": "B", ... }, "social": { ... } } }
  savings: {}, // { "std_id": { "balance": 0, "history": [] } }
  classCash: {
    balance: 0,
    history: [] // [ { id, date, type: 'in'|'out', amount, note } ]
  },
  schedule: {
    lessons: {
      senin: [], selasa: [], rabu: [], kamis: [], jumat: [], sabtu: []
    },
    piket: {
      senin: [], selasa: [], rabu: [], kamis: [], jumat: [], sabtu: []
    },
    calendar: [] // [ { id, date, title, type: 'holiday'|'exam'|'event' } ]
  },
  announcements: [], // [ { id, date, title, content } ]
  gallery: [] // [ { id, title, tag, date, url, path, showToParent, createdAt } ]
};

// Rich Demo Data (Indonesian School Context)
const DEMO_STATE = {
  settings: {
    password: 'admin',
    className: 'Kelas 4-A',
    schoolName: 'SDN Nusantara Gemilang',
    curriculum: 'merdeka',
    academicYear: '2025/2026',
    kkm: DEFAULT_KKM,
    subjects: [
      { id: 'matematika', name: 'Matematika' },
      { id: 'indonesia', name: 'Bahasa Indonesia' },
      { id: 'ipa', name: 'IPA / IPAS' },
      { id: 'agama', name: 'Pendidikan Agama' }
    ]
  },
  students: [
    {
      id: 'std_1',
      name: 'Ahmad Fauzi',
      nis: '220101',
      nisn: '0098765432',
      pob: 'Jakarta',
      dob: '2015-08-12',
      religion: 'Islam',
      address: 'Jl. Mawar Raya No. 45, RT 02/05, Kebon Jeruk',
      gender: 'L',
      parentName: 'Bambang Pamungkas',
      parentJob: 'Wiraswasta (Toko Kelontong)',
      parentPhone: '6281234567890',
      parentAddress: 'Jl. Mawar Raya No. 45, Jakarta',
      notes: 'Alergi kacang tanah. Memerlukan bimbingan tambahan dalam membaca teks panjang.'
    },
    {
      id: 'std_2',
      name: 'Citra Lestari',
      nis: '220102',
      nisn: '0097654321',
      pob: 'Bandung',
      dob: '2015-11-23',
      religion: 'Islam',
      address: 'Perumahan Griya Indah Blok C3 No. 12',
      gender: 'P',
      parentName: 'Agus Lestari',
      parentJob: 'PNS',
      parentPhone: '6289876543210',
      parentAddress: 'Perumahan Griya Indah Blok C3 No. 12',
      notes: 'Asma (membawa inhaler di tas). Sangat berbakat di bidang menggambar dan seni rupa.'
    },
    {
      id: 'std_3',
      name: 'Daniel Wijaya',
      nis: '220103',
      nisn: '0096543210',
      pob: 'Surabaya',
      dob: '2015-03-05',
      religion: 'Kristen',
      address: 'Jl. Melati IV No. 89, Meruya',
      gender: 'L',
      parentName: 'Hendra Wijaya',
      parentJob: 'Karyawan Swasta',
      parentPhone: '6287766554433',
      parentAddress: 'Jl. Melati IV No. 89, Meruya',
      notes: 'Memakai kacamata. Butuh duduk di barisan depan agar bisa melihat papan tulis dengan jelas.'
    },
    {
      id: 'std_4',
      name: 'Farhan Alamsyah',
      nis: '220104',
      nisn: '0095432109',
      pob: 'Medan',
      dob: '2015-05-18',
      religion: 'Islam',
      address: 'Kampung Baru RT 04/01, No. 27',
      gender: 'L',
      parentName: 'Rudi Alamsyah',
      parentJob: 'Pengemudi Ojek Online',
      parentPhone: '6285211223344',
      parentAddress: 'Kampung Baru RT 04/01, No. 27',
      notes: 'Aktif bergerak. Sering kehilangan konsentrasi setelah 30 menit, berikan tanggung jawab kecil agar fokus.'
    },
    {
      id: 'std_5',
      name: 'Gisela Putri',
      nis: '220105',
      nisn: '0094321098',
      pob: 'Semarang',
      dob: '2015-01-30',
      religion: 'Katolik',
      address: 'Jl. Cempaka Raya No. 102',
      gender: 'P',
      parentName: 'Ignatius Joko',
      parentJob: 'Arsitek',
      parentPhone: '6281399887766',
      parentAddress: 'Jl. Cempaka Raya No. 102',
      notes: 'Riwayat tipes setahun lalu. Rajin, rapi dalam menulis, dan sangat disiplin.'
    },
    {
      id: 'std_6',
      name: 'Habibie Rahman',
      nis: '220106',
      nisn: '0093210987',
      pob: 'Yogyakarta',
      dob: '2015-06-15',
      religion: 'Islam',
      address: 'Jl. Flamboyan Timur Blok G No. 5',
      gender: 'L',
      parentName: 'Syamsul Rahman',
      parentJob: 'Dosen',
      parentPhone: '6281122334455',
      parentAddress: 'Jl. Flamboyan Timur Blok G No. 5',
      notes: 'Sangat menyukai pelajaran matematika dan sains. Cepat menyelesaikan tugas.'
    },
    {
      id: 'std_7',
      name: 'I Dewa Gede Raka',
      nis: '220107',
      nisn: '0092109876',
      pob: 'Denpasar',
      dob: '2015-09-02',
      religion: 'Hindu',
      address: 'Perumahan Asri Blok D No. 8',
      gender: 'L',
      parentName: 'I Dewa Ketut',
      parentJob: 'Pelaku Seni / Pengrajin',
      parentPhone: '6283123456789',
      parentAddress: 'Perumahan Asri Blok D No. 8',
      notes: 'Pendiam, sopan, dan rajin. Menunjukkan bakat kepemimpinan yang baik.'
    },
    {
      id: 'std_8',
      name: 'Keisha Aurelia',
      nis: '220108',
      nisn: '0091098765',
      pob: 'Palembang',
      dob: '2015-04-07',
      religion: 'Buddha',
      address: 'Apartemen West Park Tower B Lantai 7',
      gender: 'P',
      parentName: 'Willy Chandra',
      parentJob: 'Pedagang Toko Elektronik',
      parentPhone: '6281298765432',
      parentAddress: 'Apartemen West Park Tower B Lantai 7',
      notes: 'Cenderung pemalu saat berbicara di depan umum. Perlu didorong untuk lebih berani berpendapat.'
    }
  ],
  attendance: {
    "2026-06-22": { "std_1": "H", "std_2": "H", "std_3": "H", "std_4": "H", "std_5": "H", "std_6": "H", "std_7": "H", "std_8": "H" },
    "2026-06-23": { "std_1": "H", "std_2": "S", "std_3": "H", "std_4": "I", "std_5": "H", "std_6": "H", "std_7": "H", "std_8": "H" },
    "2026-06-24": { "std_1": "H", "std_2": "H", "std_3": "H", "std_4": "H", "std_5": "H", "std_6": "H", "std_7": "H", "std_8": "H" }
  },
  grades: {
    "std_1": {
      "matematika": { "tugas1": 80, "ulangan1": 75, "pts": 70, "pas": 75 },
      "indonesia": { "tugas1": 85, "ulangan1": 80, "pts": 82, "pas": 85 },
      "ipa": { "tugas1": 78, "ulangan1": 80, "pts": 75, "pas": 78 },
      "agama": { "tugas1": 90, "ulangan1": 88, "pts": 85, "pas": 90 }
    },
    "std_2": {
      "matematika": { "tugas1": 85, "ulangan1": 88, "pts": 80, "pas": 84 },
      "indonesia": { "tugas1": 92, "ulangan1": 90, "pts": 95, "pas": 92 },
      "ipa": { "tugas1": 90, "ulangan1": 85, "pts": 88, "pas": 90 },
      "agama": { "tugas1": 95, "ulangan1": 94, "pts": 90, "pas": 95 }
    },
    "std_3": {
      "matematika": { "tugas1": 70, "ulangan1": 72, "pts": 68, "pas": 74 },
      "indonesia": { "tugas1": 80, "ulangan1": 78, "pts": 80, "pas": 82 },
      "ipa": { "tugas1": 75, "ulangan1": 70, "pts": 72, "pas": 75 },
      "agama": { "tugas1": 85, "ulangan1": 80, "pts": 82, "pas": 85 }
    },
    "std_4": {
      "matematika": { "tugas1": 65, "ulangan1": 70, "pts": 65, "pas": 70 },
      "indonesia": { "tugas1": 75, "ulangan1": 72, "pts": 70, "pas": 75 },
      "ipa": { "tugas1": 70, "ulangan1": 68, "pts": 70, "pas": 72 },
      "agama": { "tugas1": 80, "ulangan1": 80, "pts": 78, "pas": 80 }
    },
    "std_5": {
      "matematika": { "tugas1": 90, "ulangan1": 92, "pts": 88, "pas": 90 },
      "indonesia": { "tugas1": 88, "ulangan1": 85, "pts": 85, "pas": 88 },
      "ipa": { "tugas1": 92, "ulangan1": 90, "pts": 90, "pas": 92 },
      "agama": { "tugas1": 90, "ulangan1": 92, "pts": 88, "pas": 90 }
    },
    "std_6": {
      "matematika": { "tugas1": 98, "ulangan1": 95, "pts": 98, "pas": 96 },
      "indonesia": { "tugas1": 88, "ulangan1": 90, "pts": 85, "pas": 88 },
      "ipa": { "tugas1": 95, "ulangan1": 92, "pts": 94, "pas": 95 },
      "agama": { "tugas1": 90, "ulangan1": 88, "pts": 85, "pas": 90 }
    },
    "std_7": {
      "matematika": { "tugas1": 85, "ulangan1": 80, "pts": 82, "pas": 85 },
      "indonesia": { "tugas1": 85, "ulangan1": 88, "pts": 84, "pas": 86 },
      "ipa": { "tugas1": 88, "ulangan1": 85, "pts": 86, "pas": 88 },
      "agama": { "tugas1": 88, "ulangan1": 90, "pts": 88, "pas": 90 }
    },
    "std_8": {
      "matematika": { "tugas1": 78, "ulangan1": 75, "pts": 78, "pas": 80 },
      "indonesia": { "tugas1": 88, "ulangan1": 85, "pts": 85, "pas": 88 },
      "ipa": { "tugas1": 80, "ulangan1": 82, "pts": 78, "pas": 82 },
      "agama": { "tugas1": 85, "ulangan1": 88, "pts": 86, "pas": 88 }
    }
  },
  character: {
    "std_1": {
      "spiritual": { "ibadah": "SB", "syukur": "B", "catatan": "Sangat antusias ketika memimpin doa kelas pagi hari." },
      "social": { "jujur": "B", "disiplin": "B", "tanggungjawab": "B", "catatan": "Menunjukkan kejujuran yang tinggi, selalu mengakui kesalahan dengan baik." }
    },
    "std_2": {
      "spiritual": { "ibadah": "SB", "syukur": "SB", "catatan": "Selalu bersyukur atas nikmat yang diperoleh dan beribadah tepat waktu." },
      "social": { "jujur": "SB", "disiplin": "SB", "tanggungjawab": "SB", "catatan": "Sikap tanggung jawabnya sangat terlihat ketika piket kelas." }
    },
    "std_3": {
      "spiritual": { "ibadah": "B", "syukur": "B", "catatan": "Taat menjalankan ibadah sesuai agamanya." },
      "social": { "jujur": "B", "disiplin": "C", "tanggungjawab": "B", "catatan": "Perlu sedikit peningkatan dalam kedisiplinan mengumpulkan PR tepat waktu." }
    },
    "std_4": {
      "spiritual": { "ibadah": "B", "syukur": "B", "catatan": "Menunjukkan perilaku syukur di kehidupan sehari-hari." },
      "social": { "jujur": "B", "disiplin": "C", "tanggungjawab": "C", "catatan": "Perlu bimbingan ekstra untuk melatih tanggung jawab menjaga kebersihan mejanya." }
    },
    "std_5": {
      "spiritual": { "ibadah": "SB", "syukur": "SB", "catatan": "Sikap keagamaannya sangat mantap dan taat beribadah." },
      "social": { "jujur": "SB", "disiplin": "SB", "tanggungjawab": "SB", "catatan": "Menjadi teladan bagi teman sekelas dalam hal kerapian dan kedisiplinan." }
    },
    "std_6": {
      "spiritual": { "ibadah": "B", "syukur": "SB", "catatan": "Mengamalkan toleransi beragama yang sangat baik dengan temannya." },
      "social": { "jujur": "SB", "disiplin": "SB", "tanggungjawab": "B", "catatan": "Selalu siap menolong teman yang kesulitan memahami materi pelajaran." }
    },
    "std_7": {
      "spiritual": { "ibadah": "SB", "syukur": "B", "catatan": "Rajin mengikuti kegiatan ibadah bersama keluarga di pura." },
      "social": { "jujur": "B", "disiplin": "B", "tanggungjawab": "SB", "catatan": "Sangat bertanggung jawab saat memimpin kelompok belajar di kelas." }
    },
    "std_8": {
      "spiritual": { "ibadah": "B", "syukur": "B", "catatan": "Menghormati guru dan teman-teman kelas dengan sangat santun." },
      "social": { "jujur": "B", "disiplin": "B", "tanggungjawab": "B", "catatan": "Sikap sosial baik, perlu dorongan agar lebih percaya diri berpendapat." }
    }
  },
  savings: {
    "std_1": {
      "balance": 125000,
      "history": [
        { "id": "tx_std1_1", "date": "2026-06-22", "type": "deposit", "amount": 50000, "note": "Setoran Tabungan Awal" },
        { "id": "tx_std1_2", "date": "2026-06-23", "type": "deposit", "amount": 100000, "note": "Setoran Tabungan Mingguan" },
        { "id": "tx_std1_3", "date": "2026-06-24", "type": "withdraw", "amount": 25000, "note": "Tarik Tunai Beli Buku Tulis" }
      ]
    },
    "std_2": {
      "balance": 200000,
      "history": [
        { "id": "tx_std2_1", "date": "2026-06-22", "type": "deposit", "amount": 150000, "note": "Setoran Awal" },
        { "id": "tx_std2_2", "date": "2026-06-24", "type": "deposit", "amount": 50000, "note": "Setoran Tambahan" }
      ]
    },
    "std_3": {
      "balance": 85000,
      "history": [
        { "id": "tx_std3_1", "date": "2026-06-22", "type": "deposit", "amount": 85000, "note": "Tabungan Tabungan" }
      ]
    },
    "std_4": {
      "balance": 30000,
      "history": [
        { "id": "tx_std4_1", "date": "2026-06-22", "type": "deposit", "amount": 40000, "note": "Setoran Awal" },
        { "id": "tx_std4_2", "date": "2026-06-24", "type": "withdraw", "amount": 10000, "note": "Beli penggaris" }
      ]
    },
    "std_5": {
      "balance": 350000,
      "history": [
        { "id": "tx_std5_1", "date": "2026-06-22", "type": "deposit", "amount": 300000, "note": "Setoran Celengan" },
        { "id": "tx_std5_2", "date": "2026-06-23", "type": "deposit", "amount": 50000, "note": "Iuran Tabungan" }
      ]
    },
    "std_6": {
      "balance": 180000,
      "history": [
        { "id": "tx_std6_1", "date": "2026-06-22", "type": "deposit", "amount": 100000, "note": "Setoran Awal" },
        { "id": "tx_std6_2", "date": "2026-06-24", "type": "deposit", "amount": 80000, "note": "Setoran Tambahan" }
      ]
    },
    "std_7": {
      "balance": 120000,
      "history": [
        { "id": "tx_std7_1", "date": "2026-06-22", "type": "deposit", "amount": 120000, "note": "Setoran Awal" }
      ]
    },
    "std_8": {
      "balance": 500000,
      "history": [
        { "id": "tx_std8_1", "date": "2026-06-22", "type": "deposit", "amount": 500000, "note": "Setoran Awal Tabungan Besar" }
      ]
    }
  },
  classCash: {
    balance: 275000,
    history: [
      { "id": "cash_1", "date": "2026-06-22", "type": "in", "amount": 250000, "note": "Iuran Kas Kelas Minggu Ke-4" },
      { "id": "cash_2", "date": "2026-06-22", "type": "out", "amount": 35000, "note": "Beli Penghapus Papan & 2 Spidol Hitam" },
      { "id": "cash_3", "date": "2026-06-23", "type": "in", "amount": 80000, "note": "Sumbangan Sukarela Orang Tua" },
      { "id": "cash_4", "date": "2026-06-24", "type": "out", "amount": 20000, "note": "Fotokopi LKS Tema Matematika" }
    ]
  },
  schedule: {
    lessons: {
      senin: [
        { "time": "07:00 - 07:45", "subject": "Upacara Bendera", "teacher": "Kepala Sekolah" },
        { "time": "07:45 - 09:15", "subject": "Bahasa Indonesia", "teacher": "Bu Guru Utama" },
        { "time": "09:45 - 11:30", "subject": "Matematika", "teacher": "Bu Guru Utama" }
      ],
      selasa: [
        { "time": "07:00 - 08:30", "subject": "Pendidikan Agama", "teacher": "Pak Syarifuddin" },
        { "time": "08:30 - 10:00", "subject": "Pendidikan Pancasila", "teacher": "Bu Guru Utama" },
        { "time": "10:30 - 12:00", "subject": "Seni Budaya & Prakarya", "teacher": "Bu Guru Utama" }
      ],
      rabu: [
        { "time": "07:00 - 08:30", "subject": "IPAS", "teacher": "Bu Guru Utama" },
        { "time": "08:30 - 10:00", "subject": "Bahasa Inggris", "teacher": "Miss Jessica" },
        { "time": "10:30 - 12:00", "subject": "Tematik", "teacher": "Bu Guru Utama" }
      ],
      kamis: [
        { "time": "07:00 - 08:30", "subject": "PJOK (Olahraga)", "teacher": "Pak Rahmat" },
        { "time": "08:30 - 10:00", "subject": "Matematika", "teacher": "Bu Guru Utama" },
        { "time": "10:30 - 12:00", "subject": "Bahasa Indonesia", "teacher": "Bu Guru Utama" }
      ],
      jumat: [
        { "time": "07:00 - 07:40", "subject": "Senam & Jumsih (Kebersihan)", "teacher": "Semua Guru" },
        { "time": "07:40 - 09:00", "subject": "IPAS", "teacher": "Bu Guru Utama" },
        { "time": "09:30 - 11:00", "subject": "Kultum & Literasi", "teacher": "Pak Syarifuddin" }
      ],
      sabtu: [
        { "time": "07:00 - 08:30", "subject": "Pramuka Wajib", "teacher": "Kak Doni" },
        { "time": "08:30 - 10:30", "subject": "Ekstrakurikuler Pilihan", "teacher": "Pelatih" }
      ]
    },
    piket: {
      senin: ["Ahmad Fauzi", "Citra Lestari"],
      selasa: ["Daniel Wijaya", "Farhan Alamsyah"],
      rabu: ["Gisela Putri", "Habibie Rahman"],
      kamis: ["I Dewa Gede Raka", "Keisha Aurelia"],
      jumat: ["Ahmad Fauzi", "Daniel Wijaya", "Gisela Putri"],
      sabtu: ["Citra Lestari", "Farhan Alamsyah", "Keisha Aurelia"]
    },
    calendar: [
      { "id": "cal_1", "date": "2026-07-13", "title": "Hari Pertama Semester Ganjil", "type": "event" },
      { "id": "cal_2", "date": "2026-08-17", "title": "Hari Kemerdekaan RI (Libur)", "type": "holiday" },
      { "id": "cal_3", "date": "2026-09-21", "title": "Asesmen Tengah Semester Ganjil", "type": "exam" },
      { "id": "cal_4", "date": "2026-10-28", "title": "Hari Sumpah Pemuda (Upacara)", "type": "event" },
      { "id": "cal_5", "date": "2026-12-07", "title": "Asesmen Akhir Semester Ganjil", "type": "exam" }
    ]
  },
  announcements: [
    {
      id: 'ann_1',
      date: '2026-06-24',
      title: 'Membawa Bahan Praktik IPA Besok',
      content: 'Besok hari Kamis kita akan mempraktikkan proses penyaringan air bersih. Setiap siswa dimohon membawa 1 botol plastik bekas 1.5L yang sudah dipotong bagian bawahnya, sedikit kerikil pasir, dan sabut kelapa. Alat pendukung lainnya disediakan di sekolah.'
    },
    {
      id: 'ann_2',
      date: '2026-06-23',
      title: 'Iuran Kas Mingguan Kelas',
      content: 'Bagi anak-anak yang belum membayar iuran uang kas mingguan sebesar Rp5.000 untuk bulan Juni, dimohon menyetorkannya ke bendahara kelas saat istirahat besok.'
    }
  ]
};

// Supabase Cloud Configuration
const SUPABASE_URL = "https://mcdzgfjcjsowohmgvwmp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZHpnZmpjanNvd29obWd2d21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjk5NzksImV4cCI6MjA5Nzg0NTk3OX0.VTvNQIt3NNxGuqQ9nfxqS0rsAsLtvvcXHSTEsfNmKLI";

let supabaseClient = null;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

class Store {
  constructor() {
    this.state = this.loadState();
    this.initSupabaseSync();
  }

  sanitizeState(state) {
    if (!state) state = {};
    if (!state.settings) state.settings = {};
    
    // Ensure default password is 'admin' if empty
    if (!state.settings.password) {
      state.settings.password = 'admin';
    }
    
    if (!state.settings.className) state.settings.className = 'Kelas 4-A';
    if (!state.settings.schoolName) state.settings.schoolName = 'SDN Harapan Bangsa';
    if (!state.settings.curriculum) state.settings.curriculum = 'merdeka';
    if (!state.settings.academicYear) state.settings.academicYear = '2025/2026';
    if (state.settings.kkm === undefined || state.settings.kkm === null || isNaN(parseFloat(state.settings.kkm))) {
      state.settings.kkm = DEFAULT_KKM;
    }

    if (!state.settings.subjects || state.settings.subjects.length === 0) {
      state.settings.subjects = [
        { id: 'matematika', name: 'Matematika' },
        { id: 'indonesia', name: 'Bahasa Indonesia' },
        { id: 'ipa', name: 'IPA / IPAS' },
        { id: 'agama', name: 'Pendidikan Agama' }
      ];
    }
    
    if (!state.students) state.students = [];
    if (!state.attendance) state.attendance = {};
    if (!state.grades) state.grades = {};
    if (!state.character) state.character = {};
    if (!state.savings) state.savings = {};
    if (!state.classCash) state.classCash = { balance: 0, history: [] };
    if (!Array.isArray(state.gallery)) state.gallery = [];

    return state;
  }

  loadState() {
    try {
      const serialized = localStorage.getItem(STORE_KEY);
      let state;
      if (serialized === null) {
        state = JSON.parse(JSON.stringify(INITIAL_STATE));
      } else {
        state = JSON.parse(serialized);
      }
      return this.sanitizeState(state);
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
      return this.sanitizeState(INITIAL_STATE);
    }
  }

  saveState() {
    try {
      this.state.updatedAt = new Date().toISOString();
      localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
      this.saveToSupabase();
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  async initSupabaseSync() {
    const statusEl = document.getElementById('supabase-sync-status');
    const statusText = document.getElementById('sync-status-text');

    const updateStatus = (status, text) => {
      if (!statusEl || !statusText) return;
      statusEl.className = `sync-status ${status}`;
      statusText.innerText = text;
    };

    if (!supabaseClient) {
      console.warn('Supabase SDK not loaded or configured.');
      updateStatus('offline', 'Offline (No SDK)');
      return;
    }

    updateStatus('syncing', 'Menghubungkan...');

    try {
      // Check/fetch the state payload from Supabase
      const { data, error } = await supabaseClient
        .from('walikelas_store')
        .select('payload')
        .eq('id', 'class_data')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Row does not exist yet, let's initialize it with current local state
          console.log('No data found in Supabase. Creating row...');
          updateStatus('syncing', 'Mengunggah...');
          await this.saveToSupabase();
          updateStatus('online', 'Tersinkronisasi');
        } else if (error.message && error.message.includes('relation "public.walikelas_store" does not exist')) {
          console.warn('Table walikelas_store does not exist in Supabase.');
          updateStatus('offline', 'Tabel Belum Dibuat');
        } else {
          console.error('Supabase load error:', error);
          updateStatus('offline', 'Koneksi Bermasalah');
        }
        return;
      }

      if (data && data.payload) {
        console.log('State fetched successfully from Supabase!');
        
        const localUpdatedAt = this.state.updatedAt ? new Date(this.state.updatedAt).getTime() : 0;
        const remoteUpdatedAt = data.payload.updatedAt ? new Date(data.payload.updatedAt).getTime() : 0;
        
        if (localUpdatedAt > remoteUpdatedAt) {
          console.log('Local state is newer than remote state. Uploading local state...');
          updateStatus('syncing', 'Mengunggah...');
          await this.saveToSupabase();
          updateStatus('online', 'Tersinkronisasi');
        } else {
          console.log('Remote state is newer or same. Syncing to local storage...');
          this.state = this.sanitizeState(data.payload);
          localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
          updateStatus('online', 'Tersinkronisasi');
          // Dispatch event for app.js to trigger redrawing pages
          window.dispatchEvent(new Event('walikelas_sync_completed'));
        }
      }
    } catch (e) {
      console.error('Supabase sync error:', e);
      updateStatus('offline', 'Sync Error');
    }
  }

  async saveToSupabase() {
    const statusEl = document.getElementById('supabase-sync-status');
    const statusText = document.getElementById('sync-status-text');

    const updateStatus = (status, text) => {
      if (!statusEl || !statusText) return;
      statusEl.className = `sync-status ${status}`;
      statusText.innerText = text;
    };

    if (!supabaseClient) return;

    updateStatus('syncing', 'Menyimpan...');

    try {
      const { error } = await supabaseClient
        .from('walikelas_store')
        .upsert({
          id: 'class_data',
          payload: this.state,
          updated_at: new Date().toISOString()
        });

      if (error) {
        if (error.message && error.message.includes('relation "public.walikelas_store" does not exist')) {
          console.warn('Table walikelas_store does not exist in Supabase.');
          updateStatus('offline', 'Tabel Belum Dibuat');
        } else {
          console.error('Supabase upsert error:', error);
          updateStatus('offline', 'Gagal Sinkronisasi');
        }
      } else {
        console.log('State backed up successfully to Supabase!');
        updateStatus('online', 'Tersinkronisasi');
      }
    } catch (e) {
      console.error('Background sync failed:', e);
      updateStatus('offline', 'Sync Error');
    }
  }

  // Load rich demo data
  loadDemoData() {
    this.state = JSON.parse(JSON.stringify(DEMO_STATE));
    this.saveState();
  }

  // Reset to initial empty state
  resetData() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.saveState();
  }

  // Import from JSON string
  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic validation of fields
      if (parsed.settings && Array.isArray(parsed.students)) {
        // Merge or replace
        this.state = parsed;
        this.saveState();
        return { success: true };
      }
      return { success: false, error: 'Format data tidak valid' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Export to JSON string
  exportData() {
    return JSON.stringify(this.state, null, 2);
  }

  // Password Authentication Helper
  checkPassword(inputPassword) {
    const activePassword = (this.state.settings && this.state.settings.password) ? this.state.settings.password : 'admin';
    return activePassword === inputPassword || inputPassword === 'admin';
  }

  updatePassword(newPassword) {
    this.state.settings.password = newPassword;
    this.saveState();
  }

  updateClassSettings(className, schoolName, curriculum, academicYear, kkm, semester) {
    this.state.settings.className = className;
    this.state.settings.schoolName = schoolName;
    this.state.settings.curriculum = curriculum;
    this.state.settings.academicYear = academicYear;
    if (kkm !== undefined) {
      const parsed = parseFloat(kkm);
      this.state.settings.kkm = isNaN(parsed) ? DEFAULT_KKM : parsed;
    }
    if (semester !== undefined) {
      this.state.settings.semester = parseInt(semester) || 1;
    }
    this.saveState();
  }

  getKkm() {
    const kkm = parseFloat(this.state.settings.kkm);
    return isNaN(kkm) ? DEFAULT_KKM : kkm;
  }

  // Single source of truth for a subject's display label (always the saved name).
  getSubjectLabel(subjectId) {
    const subject = (this.state.settings.subjects || []).find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  }

  getSubjects() {
    return this.state.settings.subjects && this.state.settings.subjects.length
      ? this.state.settings.subjects
      : JSON.parse(JSON.stringify(INITIAL_STATE.settings.subjects));
  }

  addSubject(name) {
    const id = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (!id) return { success: false, error: 'Nama mata pelajaran tidak boleh kosong' };
    
    if (this.state.settings.subjects.some(s => s.id === id)) {
      return { success: false, error: 'Mata pelajaran ini sudah terdaftar' };
    }
    
    const newSubject = { id, name: name.trim() };
    this.state.settings.subjects.push(newSubject);
    this.saveState();
    return { success: true, subject: newSubject };
  }

  updateSubject(id, newName) {
    if (!newName || !newName.trim()) return { success: false, error: 'Nama mata pelajaran tidak boleh kosong' };
    if (!this.state.settings.subjects) return { success: false, error: 'Daftar mata pelajaran kosong' };
    
    const subject = this.state.settings.subjects.find(s => s.id === id);
    if (!subject) return { success: false, error: 'Mata pelajaran tidak ditemukan' };
    
    const oldName = subject.name;
    subject.name = newName.trim();
    this.saveState();
    return { success: true, oldName, newName: subject.name };
  }

  deleteSubject(id) {
    if (!this.state.settings.subjects) return { success: false, error: 'Daftar mata pelajaran kosong' };
    
    const index = this.state.settings.subjects.findIndex(s => s.id === id);
    if (index !== -1) {
      const name = this.state.settings.subjects[index].name;
      this.state.settings.subjects.splice(index, 1);

      // Clean up orphaned grade data so it no longer skews student averages.
      Object.keys(this.state.grades).forEach(stId => {
        if (this.state.grades[stId] && this.state.grades[stId][id]) {
          delete this.state.grades[stId][id];
        }
      });

      this.saveState();
      return { success: true, name };
    }
    return { success: false, error: 'Mata pelajaran tidak ditemukan' };
  }

  // Reorder subjects by an array of ids (used by drag-to-reorder in settings).
  reorderSubjects(orderedIds) {
    const map = {};
    (this.state.settings.subjects || []).forEach(s => { map[s.id] = s; });
    const reordered = orderedIds.map(id => map[id]).filter(Boolean);
    // Append any subject that was not in the provided order (safety).
    (this.state.settings.subjects || []).forEach(s => {
      if (!orderedIds.includes(s.id)) reordered.push(s);
    });
    this.state.settings.subjects = reordered;
    this.saveState();
    return { success: true };
  }

  // ASSESSMENT COMPONENTS
  // Returns the assessment components for a subject WITHOUT mutating state.
  // Custom components are merged on top of the core defaults so every subject
  // always has at least Tugas/Ulangan/UTS/UAS.
  // Current semester id as a string ('1' or '2').
  _currentSemester() {
    return String(this.state.settings.semester || 1);
  }

  // Returns the stored component array for (subject, semester), seeding the
  // default PH1/Re1..PH3/Re3 + SAS/ReSAS list on first use. Persists on seed.
  // Ids match the legacy scheme so previously entered grades line up.
  _ensureSemesterAssessments(subjectId, semester) {
    const subject = (this.state.settings.subjects || []).find(s => s.id === subjectId);
    if (!subject) return [];
    if (!subject.assessmentsBySemester) subject.assessmentsBySemester = {};
    const sem = String(semester);
    const existing = subject.assessmentsBySemester[sem];
    if (!Array.isArray(existing) || existing.length === 0) {
      const list = [];
      for (let n = 1; n <= 3; n += 1) {
        list.push({ id: `s${sem}_ph${n}`, name: `PH${n}`, category: 'ph', materi: '', core: n === 1 });
        list.push({ id: `s${sem}_re${n}`, name: `Re${n}`, category: 're' });
      }
      list.push({ id: `s${sem}_sas`, name: 'SAS', category: 'sas', core: true });
      list.push({ id: `s${sem}_resas`, name: 'ReSAS', category: 'resas' });
      subject.assessmentsBySemester[sem] = list;
      this.saveState();
    }
    return subject.assessmentsBySemester[sem];
  }

  // Components for a semester (defaults to current). PH/Re labels are normalized
  // to slot position so deleting a middle slot never leaves a numbering gap.
  getSubjectAssessments(subjectId, semester) {
    const sem = semester !== undefined ? String(semester) : this._currentSemester();
    const list = this._ensureSemesterAssessments(subjectId, sem);
    let phPos = 0;
    return list.map(a => {
      if (a.category === 'ph') { phPos += 1; return { ...a, name: `PH${phPos}` }; }
      if (a.category === 're') return { ...a, name: `Re${phPos}` };
      if (a.category === 'sas') return { ...a, name: 'SAS' };
      if (a.category === 'resas') return { ...a, name: 'ReSAS' };
      return { ...a };
    });
  }

  // PH slots paired with their Re component, for a semester. [{ ph, re, materi }].
  getSubjectPhSlots(subjectId, semester) {
    const list = this.getSubjectAssessments(subjectId, semester);
    return list.filter(a => a.category === 'ph').map(ph => ({
      ph,
      re: list.find(a => a.category === 're' && a.id === ph.id.replace('_ph', '_re')) || null,
      materi: ph.materi || ''
    }));
  }

  // The SAS + ReSAS pair for a semester.
  getSubjectSasPair(subjectId, semester) {
    const list = this.getSubjectAssessments(subjectId, semester);
    return {
      sas: list.find(a => a.category === 'sas') || null,
      resas: list.find(a => a.category === 'resas') || null
    };
  }

  // Set the materi (topic) description for a PH slot.
  setMateri(subjectId, semester, phId, text) {
    const sem = semester !== undefined ? String(semester) : this._currentSemester();
    const list = this._ensureSemesterAssessments(subjectId, sem);
    const ph = list.find(a => a.id === phId && a.category === 'ph');
    if (!ph) return { success: false, error: 'Komponen PH tidak ditemukan.' };
    ph.materi = (text || '').trim();
    this.saveState();
    return { success: true };
  }

  // Per-subject category weights (percentages). Falls back to defaults.
  getCategoryWeights(subjectId) {
    const subject = (this.state.settings.subjects || []).find(s => s.id === subjectId);
    const stored = subject && subject.categoryWeights ? subject.categoryWeights : {};
    const out = {};
    GRADE_CATEGORY_IDS.forEach(cat => {
      const v = parseFloat(stored[cat]);
      out[cat] = isNaN(v) || v < 0 ? DEFAULT_CATEGORY_WEIGHTS[cat] : v;
    });
    return out;
  }

  setCategoryWeights(subjectId, weights) {
    const subject = (this.state.settings.subjects || []).find(s => s.id === subjectId);
    if (!subject) return { success: false, error: 'Mata pelajaran tidak ditemukan' };
    const clean = {};
    GRADE_CATEGORY_IDS.forEach(cat => {
      const v = parseFloat(weights[cat]);
      clean[cat] = isNaN(v) || v < 0 ? 0 : v;
    });
    subject.categoryWeights = clean;
    this.saveState();
    return { success: true, weights: clean };
  }

  // Append a new PH slot (PH + paired Re) to a semester (default current),
  // before the SAS. Class-wide. Returns the new PH component.
  addPhComponent(subjectId, semester) {
    const sem = semester !== undefined ? String(semester) : this._currentSemester();
    const list = this._ensureSemesterAssessments(subjectId, sem);
    let n = 1;
    while (list.some(a => a.id === `s${sem}_ph${n}` || a.id === `s${sem}_re${n}`)) n += 1;
    const ph = { id: `s${sem}_ph${n}`, name: `PH${n}`, category: 'ph', materi: '' };
    const re = { id: `s${sem}_re${n}`, name: `Re${n}`, category: 're' };
    const sasIdx = list.findIndex(a => a.category === 'sas');
    if (sasIdx === -1) { list.push(ph, re); }
    else { list.splice(sasIdx, 0, ph, re); }
    this.saveState();
    return { success: true, component: ph };
  }

  // Delete a PH slot (the PH and its paired Re) from a semester and drop the
  // stored grades for both, for every student. Refuses when only one PH remains.
  deletePhComponent(subjectId, componentId, semester) {
    const sem = semester !== undefined ? String(semester) : this._currentSemester();
    const list = this._ensureSemesterAssessments(subjectId, sem);
    const phCount = list.filter(a => a.category === 'ph').length;
    if (phCount <= 1) return { success: false, error: 'Minimal harus ada 1 Penilaian Harian.' };
    const phIdx = list.findIndex(a => a.id === componentId && a.category === 'ph');
    if (phIdx === -1) return { success: false, error: 'Komponen PH tidak ditemukan.' };
    const reId = componentId.replace('_ph', '_re');
    const idsToRemove = [componentId, reId];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (idsToRemove.includes(list[i].id)) list.splice(i, 1);
    }
    Object.keys(this.state.grades || {}).forEach(sid => {
      const subjGrades = this.state.grades[sid][subjectId];
      if (subjGrades) idsToRemove.forEach(id => {
        if (Object.prototype.hasOwnProperty.call(subjGrades, id)) delete subjGrades[id];
      });
    });
    this.saveState();
    return { success: true };
  }

  // STUDENT MANAGEMENT
  addStudent(studentData) {
    const newStudent = {
      id: 'std_' + Date.now(),
      ...studentData
    };
    this.state.students.push(newStudent);
    
    // Initialize empty records
    this.state.savings[newStudent.id] = { balance: 0, history: [] };
    this.state.grades[newStudent.id] = {};
    this.state.character[newStudent.id] = {
      spiritual: { ibadah: 'B', syukur: 'B', catatan: '' },
      social: { jujur: 'B', disiplin: 'B', tanggungjawab: 'B', catatan: '' }
    };
    
    this.saveState();
    return newStudent;
  }

  updateStudent(studentId, updatedData) {
    const index = this.state.students.findIndex(s => s.id === studentId);
    if (index !== -1) {
      this.state.students[index] = { ...this.state.students[index], ...updatedData };
      this.saveState();
      return true;
    }
    return false;
  }

  deleteStudent(studentId) {
    this.state.students = this.state.students.filter(s => s.id !== studentId);
    this._purgeStudentRecords(studentId);
    this.saveState();
    return { success: true };
  }

  // Remove the records attached to a student id (does NOT save).
  _purgeStudentRecords(studentId) {
    delete this.state.savings[studentId];
    delete this.state.grades[studentId];
    delete this.state.character[studentId];
    Object.keys(this.state.attendance).forEach(date => {
      if (this.state.attendance[date][studentId]) {
        delete this.state.attendance[date][studentId];
      }
    });
  }

  // Batch-delete many students at once, saving only once.
  deleteStudents(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: 'Tidak ada murid yang dipilih' };
    }
    const idSet = new Set(ids);
    this.state.students = this.state.students.filter(s => !idSet.has(s.id));
    ids.forEach(id => this._purgeStudentRecords(id));
    this.saveState();
    return { success: true, count: ids.length };
  }

  // Returns counts of records tied to a student (for confirmation summaries).
  getStudentImpact(studentId) {
    let gradeCount = 0;
    const g = this.state.grades[studentId] || {};
    Object.keys(g).forEach(subj => { gradeCount += Object.keys(g[subj] || {}).length; });

    let attendanceDays = 0;
    Object.keys(this.state.attendance).forEach(date => {
      if (this.state.attendance[date][studentId] !== undefined) attendanceDays++;
    });

    const sav = this.state.savings[studentId] || { history: [] };
    const savingsTx = (sav.history || []).length;

    return { gradeCount, attendanceDays, savingsTx };
  }

  // Clear all grades for one student (keeps the student record).
  clearStudentGrades(studentId) {
    this.state.grades[studentId] = {};
    this.saveState();
    return { success: true };
  }

  // Clear one subject's grades across every student (keeps the subject).
  clearSubjectGrades(subjectId) {
    let cleared = 0;
    Object.keys(this.state.grades).forEach(stId => {
      if (this.state.grades[stId] && this.state.grades[stId][subjectId]) {
        cleared += Object.keys(this.state.grades[stId][subjectId]).length;
        delete this.state.grades[stId][subjectId];
      }
    });
    this.saveState();
    return { success: true, cleared };
  }

  getStudent(studentId) {
    return this.state.students.find(s => s.id === studentId);
  }

  // ATTENDANCE MANAGEMENT
  saveAttendance(date, attendanceMap) {
    // date: "YYYY-MM-DD"
    // attendanceMap: { std_id: "H"|"S"|"I"|"A" }
    this.state.attendance[date] = attendanceMap;
    this.saveState();
  }

  getAttendance(date) {
    return this.state.attendance[date] || {};
  }

  // Calculate monthly stats for a student
  getStudentAttendanceSummary(studentId) {
    let hadir = 0, sakit = 0, izin = 0, alfa = 0;
    
    Object.values(this.state.attendance).forEach(dateLogs => {
      const status = dateLogs[studentId];
      if (status === 'H') hadir++;
      else if (status === 'S') sakit++;
      else if (status === 'I') izin++;
      else if (status === 'A') alfa++;
    });

    const total = hadir + sakit + izin + alfa;
    const percentage = total > 0 ? Math.round((hadir / total) * 100) : 100;

    return { hadir, sakit, izin, alfa, total, percentage };
  }

  // GRADES MANAGEMENT
  // Writes a single grade. An empty/invalid value clears the component
  // (treated as "belum dinilai") instead of being stored as 0.
  _writeGrade(studentId, subject, examType, value) {
    if (!this.state.grades[studentId]) this.state.grades[studentId] = {};
    if (!this.state.grades[studentId][subject]) this.state.grades[studentId][subject] = {};

    const str = (value === null || value === undefined) ? '' : String(value).trim();
    if (str === '') {
      delete this.state.grades[studentId][subject][examType];
      return;
    }
    let num = parseFloat(str);
    if (isNaN(num)) {
      delete this.state.grades[studentId][subject][examType];
      return;
    }
    // Clamp to 0..100.
    num = Math.max(0, Math.min(100, num));
    this.state.grades[studentId][subject][examType] = num;
  }

  saveGrade(studentId, subject, examType, value) {
    this._writeGrade(studentId, subject, examType, value);
    this.saveState();
  }

  getGrades(studentId) {
    return this.state.grades[studentId] || {};
  }

  // Effective value of a slot = max(primary, remedial). Null when neither set.
  _effectiveScore(scores, primaryId, remedialId) {
    const p = primaryId ? scores[primaryId] : undefined;
    const r = remedialId ? scores[remedialId] : undefined;
    const hasP = p !== undefined && p !== null && p !== '' && !isNaN(parseFloat(p));
    const hasR = r !== undefined && r !== null && r !== '' && !isNaN(parseFloat(r));
    if (!hasP && !hasR) return null;
    return Math.max(hasP ? parseFloat(p) : 0, hasR ? parseFloat(r) : 0);
  }

  // Average of a semester's effective PH values — max(PH, Re) per slot (2dp).
  getSubjectPhAverage(studentId, subjectId, semester) {
    const scores = (this.state.grades[studentId] || {})[subjectId] || {};
    const vals = this.getSubjectPhSlots(subjectId, semester)
      .map(s => this._effectiveScore(scores, s.ph.id, s.re ? s.re.id : null))
      .filter(v => v !== null);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }

  // Nilai Rapor for a specific semester. RATA PH (max PH,Re) and SAS (max SAS,ReSAS)
  // combined by per-subject weights, renormalized when a category is empty.
  getSubjectSemesterAverage(studentId, subjectId, semester) {
    const scores = (this.state.grades[studentId] || {})[subjectId] || {};
    const rataPH = this.getSubjectPhAverage(studentId, subjectId, semester);
    const pair = this.getSubjectSasPair(subjectId, semester);
    const sasVal = pair.sas
      ? this._effectiveScore(scores, pair.sas.id, pair.resas ? pair.resas.id : null)
      : null;

    const weights = this.getCategoryWeights(subjectId);
    let sum = 0;
    let wTotal = 0;
    if (rataPH !== null) { sum += rataPH * (weights.ph || 0); wTotal += (weights.ph || 0); }
    if (sasVal !== null) { sum += sasVal * (weights.sas || 0); wTotal += (weights.sas || 0); }
    if (wTotal === 0) return null;
    return Math.round(sum / wTotal);
  }

  // Final subject grade for the CURRENT semester (used by Buku Induk / recap).
  getSubjectAverage(studentId, subjectId) {
    return this.getSubjectSemesterAverage(studentId, subjectId, this._currentSemester());
  }

  // Overall average across CURRENT subjects only (ignores orphaned data).
  getStudentOverallAverage(studentId) {
    const subjects = this.getSubjects();
    let sum = 0;
    let count = 0;
    subjects.forEach(s => {
      const avg = this.getSubjectAverage(studentId, s.id);
      if (avg !== null) {
        sum += avg;
        count++;
      }
    });
    if (count === 0) return null;
    return Math.round(sum / count);
  }

  // CHARACTER OBSERVATION
  saveCharacter(studentId, type, field, value) {
    // type: 'spiritual' | 'social'
    if (!this.state.character[studentId]) {
      this.state.character[studentId] = {
        spiritual: { ibadah: 'B', syukur: 'B', catatan: '' },
        social: { jujur: 'B', disiplin: 'B', tanggungjawab: 'B', catatan: '' }
      };
    }
    this.state.character[studentId][type][field] = value;
    this.saveState();
  }

  getCharacter(studentId) {
    return this.state.character[studentId] || {
      spiritual: { ibadah: 'B', syukur: 'B', catatan: '' },
      social: { jujur: 'B', disiplin: 'B', tanggungjawab: 'B', catatan: '' }
    };
  }

  // STUDENT SAVINGS
  addSavingTransaction(studentId, type, amount, note) {
    const value = parseFloat(amount) || 0;
    if (value <= 0) return false;

    if (!this.state.savings[studentId]) {
      this.state.savings[studentId] = { balance: 0, history: [] };
    }

    const currentBalance = this.state.savings[studentId].balance;
    let newBalance = currentBalance;

    if (type === 'deposit') {
      newBalance += value;
    } else if (type === 'withdraw') {
      if (currentBalance < value) {
        return { success: false, error: 'Saldo tabungan tidak mencukupi' };
      }
      newBalance -= value;
    } else {
      return { success: false, error: 'Jenis transaksi tidak dikenal' };
    }

    const tx = {
      id: 'tx_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      type,
      amount: value,
      note: note || (type === 'deposit' ? 'Setoran tunai' : 'Tarik tunai')
    };

    this.state.savings[studentId].balance = newBalance;
    this.state.savings[studentId].history.unshift(tx); // Newest transaction first
    this.saveState();

    return { success: true, balance: newBalance };
  }

  getSavings(studentId) {
    return this.state.savings[studentId] || { balance: 0, history: [] };
  }

  // CLASS CASH
  addClassCashTransaction(type, amount, note) {
    const value = parseFloat(amount) || 0;
    if (value <= 0) return false;

    const currentBalance = this.state.classCash.balance;
    let newBalance = currentBalance;

    if (type === 'in') {
      newBalance += value;
    } else if (type === 'out') {
      newBalance -= value;
    } else {
      return false;
    }

    const tx = {
      id: 'cash_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      type,
      amount: value,
      note: note || (type === 'in' ? 'Uang masuk' : 'Uang keluar')
    };

    this.state.classCash.balance = newBalance;
    this.state.classCash.history.unshift(tx); // Newest transaction first
    this.saveState();

    return true;
  }

  getClassCash() {
    return this.state.classCash;
  }

  deleteClassCashTransaction(txId) {
    const index = this.state.classCash.history.findIndex(h => h.id === txId);
    if (index !== -1) {
      const tx = this.state.classCash.history[index];
      if (tx.type === 'in') {
        this.state.classCash.balance -= tx.amount;
      } else {
        this.state.classCash.balance += tx.amount;
      }
      this.state.classCash.history.splice(index, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  // SCHEDULE & CALENDAR
  saveLesson(day, index, lessonData) {
    if (!this.state.schedule.lessons[day]) {
      this.state.schedule.lessons[day] = [];
    }
    if (index === -1) {
      this.state.schedule.lessons[day].push(lessonData);
    } else {
      this.state.schedule.lessons[day][index] = lessonData;
    }
    this.saveState();
  }

  deleteLesson(day, index) {
    if (this.state.schedule.lessons[day]) {
      this.state.schedule.lessons[day].splice(index, 1);
      this.saveState();
    }
  }

  savePiket(day, list) {
    this.state.schedule.piket[day] = list;
    this.saveState();
  }

  addCalendarEvent(date, title, type) {
    const event = {
      id: 'cal_' + Date.now(),
      date,
      title,
      type
    };
    this.state.schedule.calendar.push(event);
    // Sort calendar by date
    this.state.schedule.calendar.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.saveState();
    return event;
  }

  deleteCalendarEvent(id) {
    this.state.schedule.calendar = this.state.schedule.calendar.filter(c => c.id !== id);
    this.saveState();
  }

  // ANNOUNCEMENTS
  addAnnouncement(title, content) {
    const ann = {
      id: 'ann_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      title,
      content
    };
    this.state.announcements.unshift(ann); // Newest first
    this.saveState();
    return ann;
  }

  deleteAnnouncement(id) {
    this.state.announcements = this.state.announcements.filter(a => a.id !== id);
    this.saveState();
  }

  // GALLERY (foto kegiatan) — metadata in synced state, images in Supabase Storage.
  isCloudReady() {
    return !!supabaseClient;
  }

  getGallery() {
    return (this.state.gallery || []).slice().sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') ||
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }

  // Upload a (already compressed) image blob to Supabase Storage.
  // Returns { success, url, path } or { success:false, error }.
  async uploadGalleryPhoto(blob, ext) {
    if (!supabaseClient) {
      return { success: false, error: 'Penyimpanan cloud (Supabase) belum aktif.' };
    }
    const safeExt = (ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const cls = (this.state.settings.className || 'kelas').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const path = `${cls}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    const { error } = await supabaseClient.storage.from('kegiatan').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false
    });
    if (error) {
      return { success: false, error: error.message || 'Gagal mengunggah foto ke cloud.' };
    }
    const { data } = supabaseClient.storage.from('kegiatan').getPublicUrl(path);
    return { success: true, url: data.publicUrl, path };
  }

  addGalleryItem({ title, tag, date, url, path, showToParent }) {
    if (!Array.isArray(this.state.gallery)) this.state.gallery = [];
    const item = {
      id: 'gal_' + Date.now(),
      title: (title || 'Kegiatan').trim(),
      tag: tag || 'Kegiatan',
      date: date || new Date().toISOString().split('T')[0],
      url: url || '',
      path: path || '',
      showToParent: !!showToParent,
      createdAt: new Date().toISOString()
    };
    this.state.gallery.unshift(item);
    this.saveState();
    return item;
  }

  async deleteGalleryItem(id) {
    const list = this.state.gallery || [];
    const idx = list.findIndex(g => g.id === id);
    if (idx === -1) return { success: false };
    const item = list[idx];
    if (supabaseClient && item.path) {
      try { await supabaseClient.storage.from('kegiatan').remove([item.path]); } catch (e) { /* best-effort */ }
    }
    list.splice(idx, 1);
    this.saveState();
    return { success: true };
  }
}

// Attach globally
window.WaliKelasStore = new Store();
console.log('WaliKelasStore loaded');

// Node test harness support (no effect in the browser).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Store };
}
