export type Timeline = { yil: string; joy: string; izoh?: string }

export type Taklif = {
  id: string
  sana: string
  muammo: string
  yechim: string
  foyda: string
  reja: string
  natija: string
  tasir: string
  holat: string
  ragbat: string
}

export type ScoreKey = 'vaqt' | 'tartib' | 'vazifa' | 'rivojlanish' | 'takomil' | 'shogird'

export type Baholash = Record<ScoreKey, number | null> & { davr: string; izoh: string; baholovchi?: string; sana?: string }

/** Arxiv (ishdan ketgan) belgisi */
export type Arxiv = { sana: string; sabab: string }

export type QAKey = 'shaxsiy' | 'oila' | 'shaxsiyat' | 'hobbi' | 'maqsad' | 'rivojlanish'
export type TimeKey = 'talim' | 'mehnat'

export type Employee = {
  id: string
  bolim: string
  rahbar: string
  ism: string
  lavozim: string
  foto: string
  guruh: string
  shaxsiy: Record<string, string>
  talim: Timeline[]
  mehnat: Timeline[]
  oila: Record<string, string>
  shaxsiyat: Record<string, string>
  hobbi: Record<string, string>
  maqsad: Record<string, string>
  baholash: Baholash
  rivojlanish: Record<string, string>
  takliflar: Taklif[]
  /** Oldingi davrlar baholashlari (eng yangisi oxirida) */
  baholash_tarixi?: Baholash[]
  /** Ishdan ketgan — tuzilmada ko'rinmaydi */
  arxiv?: Arxiv
  /** Sinov muddati boshlangan sana (ISO) */
  sinov_boshlandi?: string
  /** Qo'lda "rahbar" deb belgilangan */
  rahbar_belgisi?: boolean
}

export type Department = {
  id: string
  nomi: string
  rang: string
  vazifalar: string[]
}

export type OrgData = {
  version: number
  bolimlar: Department[]
  xodimlar: Employee[]
  ceoId: string
  updatedAt: string
}

export type QASection = { nom: string; turi: 'qa'; savollar: [string, string][] }
export type TimeSection = { nom: string; turi: 'vaqt' }
export type ScoreSection = { nom: string; turi: 'ball'; mezonlar: [ScoreKey, string, number][] }
export type SuggSection = { nom: string; turi: 'taklif' }
export type Section = QASection | TimeSection | ScoreSection | SuggSection
export type SectionKey = QAKey | TimeKey | 'baholash' | 'takliflar'
