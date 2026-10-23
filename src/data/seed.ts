import type { Department, Employee, OrgData, Section, SectionKey } from './types'

export const DEFAULT_COLORS: Record<string, string> = {
  moliya: '#1f5fbf', marketing: '#e0861a', hr: '#7a3fc4', sotuv: '#1d8a43', ombor: '#1592b8', ishlab: '#2f3f57',
}
export const PALETTE = ['#1f5fbf', '#e0861a', '#7a3fc4', '#1d8a43', '#1592b8', '#2f3f57', '#c0262d', '#b8860b', '#0f766e', '#be185d', '#4338ca', '#65a30d']

export const BOLIMLAR: Department[] = [
  { id: 'moliya', nomi: "Moliya bo'limi", rang: DEFAULT_COLORS.moliya,
    vazifalar: ['Kirim-chiqim va pul oqimini nazorat qilish', 'Buxgalteriya hisobi va soliq hisobotlari', "Kassa operatsiyalari va to'lovlarni qabul qilish", 'Rahbarga oylik moliyaviy hisobot'] },
  { id: 'marketing', nomi: "Marketing bo'limi", rang: DEFAULT_COLORS.marketing,
    vazifalar: ['Reklama kampaniyalari va lid oqimi', 'Instagram, Telegram va boshqa ijtimoiy tarmoqlar', 'Kontent: reels, kataloglar, vebinarlar', "Sotuv bo'limiga sifatli lid yetkazish"] },
  { id: 'hr', nomi: "HR bo'limi", rang: DEFAULT_COLORS.hr,
    vazifalar: ['Xodimlarni yollash va ishga qabul qilish', 'Yangi xodimlarni moslashtirish', 'Anketalar, baholash va rivojlanish rejalarini yuritish', "Jamoa motivatsiyasi va o'qitish"] },
  { id: 'sotuv', nomi: "Sotuv bo'limi", rang: DEFAULT_COLORS.sotuv,
    vazifalar: ["Lidlarni qabul qilish va qo'ng'iroqlar", 'Bepul konsultatsiya va tijorat taklifi', "Gektar, o'rta va mini issiqxona sotuvi", 'CRMda bitimlarni yuritish va reja bajarilishi'] },
  { id: 'ombor', nomi: "Ombor bo'limi", rang: DEFAULT_COLORS.ombor,
    vazifalar: ['Materiallar qabuli, saqlash va hisobi', "Ta'minot: profil, plyonka, furnitura xaridi", "Obyektlarga materiallarni jo'natish", 'Qoldiqlarni inventarizatsiya qilish'] },
  { id: 'ishlab', nomi: "Ishlab chiqarish bo'limi", rang: DEFAULT_COLORS.ishlab,
    vazifalar: ['Koreys tipidagi issiqxonalar loyihasi va chizmalari', 'Obyektlarda montaj va qurilish', 'Brigadalar ishini taqsimlash va sifat nazorati', 'Muddatlarga rioya va topshirish dalolatnomasi'] },
  { id: 'sinov', nomi: 'Sinov muddatidagilar', rang: '#b8860b',
    vazifalar: ['Yangi xodimlarning sinov muddati (odatda 1-3 oy)', 'Rahbar va HR kuzatuvi, oraliq baholash', "Sinov yakunida doimiy bo'limga o'tkazish yoki xayrlashish"] },
]

/** Anketa qabul qilinganda taklif qilinadigan bo'lim */
export const SINOV_BOLIM = 'sinov'

export function emptyEmployee(partial: Partial<Employee> = {}): Employee {
  const base: Employee = {
    id: '', bolim: '', rahbar: '', ism: '', lavozim: '', foto: '', guruh: '',
    shaxsiy: { fish: '', tugilgan: '', manzil: '', telefon: '', millat: '', tillar: '', lavozim: '', oilaviy: '' },
    talim: [], mehnat: [],
    oila: { tarkib: '', otaOna: '', turmushOrtoq: '', farzandlar: '', qadriyatlar: '', qollab: '', muvozanat: '', tamoyillar: '' },
    shaxsiyat: { tarif: '', kuchli: '', yaxshilash: '', qaror: '', tanqid: '', jamoa: '', halollik: '', stress: '' },
    hobbi: { bosh: '', sport: '', kitob: '', musiqa: '', sayohat: '', yoqtirgan: '', ilhom: '', yangi: '' },
    maqsad: { katta: '', oy12: '', yil5: '', orzu: '', moliya: '', jamiyat: '', tosiq: '', meros: '' },
    baholash: { davr: '', vaqt: null, tartib: null, vazifa: null, rivojlanish: null, takomil: null, shogird: null, izoh: '' },
    rivojlanish: { kuchli: '', yonalish: '', oquv: '', karyera: '', qadamlar: '', komak: '', nazorat: '' },
    takliflar: [],
  }
  const out = { ...base } as unknown as Record<string, unknown>
  const b = base as unknown as Record<string, unknown>
  for (const [k, v] of Object.entries(partial)) {
    if (v === undefined || v === null) continue
    const bv = b[k]
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { ...(bv as object), ...(v as object) }
    } else {
      out[k] = v
    }
  }
  return out as unknown as Employee
}

const E = (p: Partial<Employee>) => emptyEmployee(p)

export const XODIMLAR: Employee[] = [
  E({ id: 'rustamjon', bolim: 'rahbariyat', rahbar: '', ism: 'Raxmonov Rustamjon', lavozim: "Ta'sischi, Bosh direktor (CEO)",
    shaxsiy: { fish: "Raxmonov Rustamjon Raximjon o'g'li", tugilgan: '11.10.1991',
      manzil: "Toshkent shahri, Yashnobod tumani, G'ozal ko'chasi, 22", telefon: '+998 95 020 00 70',
      millat: "O'zbek", tillar: "O'zbek — ona tili; rus, nemis va koreys tillari",
      lavozim: 'Bosh direktor (CEO)', oilaviy: 'Turmush qurgan, 5 nafar farzand otasi' },
    talim: [
      { yil: '1998–2007', joy: "Asaka shahridagi 34-umumta'lim maktabi" },
      { yil: '2007–2010', joy: 'Asaka avtomobilsozlik kasb-hunar kolleji' },
      { yil: '2011–2015', joy: 'Andijon avtomobil instituti' },
      { yil: '2015–2018', joy: 'Germaniya, Bremen universiteti — magistratura' } ],
    mehnat: [
      { yil: '2008–2011', joy: 'GM-UZB' },
      { yil: '2011–2012', joy: 'Andijon informatika kolleji' },
      { yil: '2011–2015', joy: "Asakada Muay Thai bo'yicha bosh trener" },
      { yil: '2011–2015', joy: 'Asaka MIN-MAX tekstil korxonasida bosh siklatchi' },
      { yil: '2015–2018', joy: "Germaniyada magistratura ta'limi" },
      { yil: '2018–2021', joy: 'Janubiy Koreyada ishlash' },
      { yil: '2021–2026', joy: 'Grow Agro Team / Uz-Grow — bosh direktor' },
      { yil: '2023–2026', joy: 'MC-GROUP Metal — bosh direktor' } ],
    oila: { tarkib: 'Oilada 9 kishi; 5 nafar farzand otasi.' } }),

  E({ id: 'ruslan', bolim: 'moliya', rahbar: 'rustamjon', ism: 'Шодиев Руслан', lavozim: "Moliya bo'limi rahbari" }),
  E({ id: 'dilnoza', bolim: 'moliya', rahbar: 'ruslan', ism: 'Саматова Дилноза', lavozim: 'Buxgalter' }),
  E({ id: 'nafosat', bolim: 'moliya', rahbar: 'dilnoza', ism: 'Ботирбоева Нафосат', lavozim: 'Kassir' }),

  E({ id: 'alisher', bolim: 'marketing', rahbar: 'rustamjon', ism: 'Majidov Alisher', lavozim: 'Marketing rahbari' }),
  E({ id: 'vasila', bolim: 'marketing', rahbar: 'alisher', ism: 'Низомидинова Васила', lavozim: 'SMM mutaxassisi' }),

  E({ id: 'maftuna', bolim: 'hr', rahbar: 'rustamjon', ism: "Yo'ldosheva Maftunabonu", lavozim: 'HR rahbari' }),

  E({ id: 'abdulloh', bolim: 'sotuv', rahbar: 'rustamjon', ism: 'Абдурасулов Абдуллох', lavozim: "Sotuv bo'limi rahbari (ROP)" }),
  E({ id: 'diyora', bolim: 'sotuv', rahbar: 'abdulloh', ism: 'Nizomiddinova Diyora', lavozim: 'Bosh sotuvchi' }),
  E({ id: 'nurgul', bolim: 'sotuv', rahbar: 'abdulloh', ism: 'Bazarbayeva Nurgul', lavozim: 'Eng yaxshi sotuvchi' }),
  E({ id: 'op1', bolim: 'sotuv', rahbar: 'abdulloh', guruh: 'Call operatorlar', ism: 'Operator 1', lavozim: 'Call operator' }),
  E({ id: 'op2', bolim: 'sotuv', rahbar: 'abdulloh', guruh: 'Call operatorlar', ism: 'Operator 2', lavozim: 'Call operator' }),
  E({ id: 'op3', bolim: 'sotuv', rahbar: 'abdulloh', guruh: 'Call operatorlar', ism: 'Operator 3', lavozim: 'Call operator' }),
  E({ id: 'op4', bolim: 'sotuv', rahbar: 'abdulloh', guruh: 'Call operatorlar', ism: 'Operator 4', lavozim: 'Call operator' }),

  E({ id: 'sardor', bolim: 'ombor', rahbar: 'rustamjon', ism: 'Абдулатипов Сардор', lavozim: "Ombor bo'limi boshlig'i" }),
  E({ id: 'roziqbek', bolim: 'ombor', rahbar: 'sardor', ism: 'Baxshilloyev Roziqbek', lavozim: 'Snabjenya rahbari' }),
  E({ id: 'siklarchi', bolim: 'ombor', rahbar: 'roziqbek', ism: 'Siklarchi', lavozim: 'Siklarchi (1 ta)' }),
  E({ id: 'gruzchik', bolim: 'ombor', rahbar: 'roziqbek', ism: 'Gruzchik', lavozim: 'Gruzchik (1 ta)' }),

  E({ id: 'asadbek', bolim: 'ishlab', rahbar: 'rustamjon', ism: 'Abdujamalov Asadbek', lavozim: "Ishlab chiqarish bo'limi boshlig'i" }),
  E({ id: 'muhammadamin', bolim: 'ishlab', rahbar: 'asadbek', ism: 'Toshev Muhammadamin', lavozim: "Loyihachi (Loyihalash bo'limi)" }),
  E({ id: 'elmuror', bolim: 'ishlab', rahbar: 'muhammadamin', guruh: 'Qurilish brigadirlari', ism: 'Elmuror', lavozim: 'Qurilish brigadiri' }),
  E({ id: 'rasul', bolim: 'ishlab', rahbar: 'muhammadamin', guruh: 'Qurilish brigadirlari', ism: 'Rasul', lavozim: 'Qurilish brigadiri' }),
  E({ id: 'akbar', bolim: 'ishlab', rahbar: 'muhammadamin', guruh: 'Qurilish brigadirlari', ism: 'Akbar', lavozim: 'Qurilish brigadiri' }),
  E({ id: 'murod', bolim: 'ishlab', rahbar: 'muhammadamin', guruh: 'Qurilish brigadirlari', ism: 'Murod', lavozim: 'Qurilish brigadiri' }),
]

export const SEED: OrgData = { version: 1, bolimlar: BOLIMLAR, xodimlar: XODIMLAR, ceoId: 'rustamjon', updatedAt: new Date(0).toISOString() }

export const ANKETA: Record<SectionKey, Section> = {
  shaxsiy: { nom: "Shaxsiy ma'lumotlar", turi: 'qa', savollar: [
    ['fish', "To'liq ism-sharifingiz"], ['tugilgan', "Tug'ilgan sanangiz"], ['manzil', 'Yashash manzilingiz'],
    ['telefon', 'Telefon raqamingiz'], ['millat', 'Millatingiz'], ['tillar', 'Qaysi tillarni bilasiz?'],
    ['lavozim', 'Hozirgi lavozimingiz'], ['oilaviy', 'Oilaviy holatingiz'] ] },
  talim: { nom: "Ta'lim va rivojlanish", turi: 'vaqt' },
  mehnat: { nom: 'Mehnat faoliyati va tajriba', turi: 'vaqt' },
  oila: { nom: 'Oila va qadriyatlar', turi: 'qa', savollar: [
    ['tarkib', "Oilangiz tarkibi haqida ma'lumot bering."], ['otaOna', "Ota-onangiz haqida to'liq ma'lumot bering."],
    ['turmushOrtoq', "Turmush o'rtog'ingiz haqida ma'lumot bering."], ['farzandlar', "Farzandlaringiz haqida: F.I.Sh., tug'ilgan yili, ta'limi va boshqalar."],
    ['qadriyatlar', 'Oilangizda eng muhim deb biladigan qadriyatlaringiz qaysilar?'], ['qollab', "Oila a'zolaringiz maqsadlaringizni qanday qo'llab-quvvatlaydi?"],
    ['muvozanat', 'Ish va oilaviy hayot muvozanatini qanday saqlaysiz?'], ['tamoyillar', "Farzandlaringizga qanday hayotiy tamoyillarni o'rgatmoqchisiz?"] ] },
  shaxsiyat: { nom: 'Shaxsiyat va xarakter', turi: 'qa', savollar: [
    ['tarif', "O'zingizni 3–5 ta so'z bilan qanday ta'riflaysiz?"], ['kuchli', 'Sizning eng kuchli uchta jihatingiz qaysilar?'],
    ['yaxshilash', 'Qaysi odat yoki xususiyatingizni yaxshilash ustida ishlayapsiz?'], ['qaror', 'Qiyin vaziyatlarda qarorlarni qanday qabul qilasiz?'],
    ['tanqid', 'Tanqid yoki fikr-mulohazani qanday qabul qilasiz?'], ['jamoa', 'Jamoada ishlashda siz uchun eng muhim qoida nima?'],
    ['halollik', "Siz uchun halollik, intizom va mas'uliyat nimani anglatadi?"], ['stress', "Stress yoki bosim paytida o'zingizni qanday boshqarasiz?"] ] },
  hobbi: { nom: 'Hobbilar va yoqtirgan narsalar', turi: 'qa', savollar: [
    ['bosh', "Bo'sh vaqtingizda nimalar bilan shug'ullanishni yoqtirasiz?"], ['sport', 'Qaysi sport turi yoki jismoniy faollik sizga yoqadi?'],
    ['kitob', 'Qaysi kitoblar, mualliflar yoki mavzular sizni qiziqtiradi?'], ['musiqa', "Qanday musiqa, film yoki ko'rsatuvlarni yoqtirasiz?"],
    ['sayohat', 'Qaysi mamlakat yoki shaharlarga sayohat qilishni istaysiz?'], ['yoqtirgan', 'Qaysi ranglar, taomlar yoki boshqa narsalarni yoqtirasiz?'],
    ['ilhom', 'Qaysi insonlar sizga ilhom beradi va nima uchun?'], ['yangi', "Qanday yangi mashg'ulot yoki qobiliyatni o'rganishni xohlaysiz?"] ] },
  maqsad: { nom: 'Maqsadlar va hayotiy rejalar', turi: 'qa', savollar: [
    ['katta', 'Hayotdagi eng katta maqsadingiz nima?'], ['oy12', "Keyingi 12 oy ichida erishmoqchi bo'lgan uchta natijangiz qaysilar?"],
    ['yil5', "Besh yildan keyin o'zingizni qayerda va qanday holatda ko'rasiz?"], ['orzu', 'Kasbiy yoki biznes sohasidagi eng katta orzuingiz nima?'],
    ['moliya', 'Moliyaviy jihatdan qanday natijaga erishishni istaysiz?'], ['jamiyat', 'Oilangiz va jamiyat uchun qanday foyda keltirmoqchisiz?'],
    ['tosiq', "Maqsadlaringizga erishishda eng katta to'siq nima va uni qanday yengasiz?"], ['meros', 'Hayotingizda qanday iz yoki meros qoldirishni xohlaysiz?'] ] },
  baholash: { nom: 'Xodimni baholash', turi: 'ball', mezonlar: [
    ['vaqt', "Ishga o'z vaqtida kelish va ish vaqtiga rioya qilish", 10],
    ['tartib', 'Ichki tartib-qoidalarga rioya qilish', 10],
    ['vazifa', "Vazifalarni sifatli va o'z vaqtida bajarish", 40],
    ['rivojlanish', "O'z ustida ishlash va rivojlanish", 10],
    ['takomil', "Bo'limni takomillashtirish va yangi takliflar kiritish", 20],
    ['shogird', 'Shogird tayyorlash va bilim ulashish', 10] ] },
  rivojlanish: { nom: 'Rivojlanish va karyera rejasi', turi: 'qa', savollar: [
    ['kuchli', 'Kuchli tomonlar: ish natijasiga yordam beradigan 3 ta jihat'], ['yonalish', "Rivojlanish yo'nalishi: qaysi bilim yoki ko'nikmani yaxshilash kerak?"],
    ['oquv', "O'quv rejasi: keyingi 3–6 oyda kurs, trening yoki amaliyot"], ['karyera', 'Karyera maqsadi: keyingi 1–3 yil uchun'],
    ['qadamlar', "Amaliy qadamlar: aniq vazifa, muddat va o'lchanadigan natija"], ['komak', "Rahbar ko'magi: resurs, mentorlik yoki yo'riqnoma"],
    ['nazorat', "Nazorat sanasi: reja qachon ko'rib chiqiladi va natija qanday tekshiriladi?"] ] },
  takliflar: { nom: 'Takliflar va xodimning hissasi', turi: 'taklif' },
}

export const SECTION_ORDER: SectionKey[] = ['shaxsiy', 'talim', 'mehnat', 'oila', 'shaxsiyat', 'hobbi', 'maqsad', 'baholash', 'rivojlanish', 'takliflar']

export const HOLATLAR = ['Yangi', "Ko'rib chiqilmoqda", 'Sinovda', 'Tasdiqlandi', 'Joriy etildi', "Natija o'lchandi"]

export const DARAJA = (s: number): [string, string] =>
  s >= 90 ? ["A'lo", 'var(--ok)'] : s >= 75 ? ['Yaxshi', 'var(--ok)'] : s >= 60 ? ['Yaxshilash kerak', 'var(--warn)'] : ['Rivojlanish rejasi zarur', 'var(--bad)']
