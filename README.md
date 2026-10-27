# UZ-GROW Tashkiliy Tuzilma

**Jonli sayt:** https://uzgrow-org.vercel.app (Vercel, GitHub `main` ga har push avtomatik chiqadi)

Kompaniya bo'limlari, xodimlar va ularning anketalarini yuritish uchun React ilova.
Ma'lumotlar brauzerda (localStorage) saqlanadi — server kerak emas.

## Ishga tushirish

```bash
npm install
npm run dev
```

Brauzerda http://localhost:5180 ochiladi. Yoki `ishga-tushirish.cmd` faylini ikki marta bosing.

Production versiya:

```bash
npm run build
```

`dist/` papkasi hosil bo'ladi — uni istalgan statik hostingga (Vercel, Netlify, oddiy nginx) qo'yish mumkin.
`base: './'` bo'lgani uchun `dist/index.html` ni to'g'ridan-to'g'ri ochsa ham ishlaydi.

## Nimalar ishlaydi

- **Umumiy tuzilma**: ta'sischi → CEO → bo'limlar. Bo'lim va xodim qo'shish tugmalari.
- **Bo'lim kabineti**: daraxt (rahbar → xodimlar → guruhlar), xodimlar ro'yxati, anketa to'ldirilganlik foizi, vazifalar. Bo'limni tahrirlash, o'chirish (faqat bo'sh bo'lim).
- **Xodim anketasi**: 10 bo'lim (shaxsiy, ta'lim, mehnat, oila, shaxsiyat, hobbi, maqsad, baholash, rivojlanish, takliflar). Har bir bo'lim "Tahrirlash" tugmasi bilan joyida tahrirlanadi.
  - Baholash: 6 mezon, 100 ball, daraja avtomatik.
  - Takliflar: qo'shish, tahrirlash, o'chirish, holatni bir bosishda almashtirish.
  - Rasm: avatarni bosib yuklanadi, avtomatik 512px ga kichraytiriladi.
  - Chop etish: brauzer print (tugmalar yashiriladi).
- **Xodimni tahrirlash/o'chirish**: ism, lavozim, bo'lim, rahbar, guruh. O'chirilganda qo'l ostidagilar uning rahbariga o'tkaziladi.
- **Qidiruv**: ism, lavozim, F.I.Sh., telefon, guruh, bo'lim bo'yicha.
- **Ma'lumotlar menyusi** (☰): JSON eksport (zaxira), JSON import, mavzu (avto/yorug'/qorong'i), boshlang'ich holatga qaytarish.

## Ma'lumotlar qayerda?

Brauzerning `localStorage` ida, `uzgrow-org:v1` kaliti ostida. Shuning uchun:

- boshqa kompyuterga o'tkazish uchun **JSON eksport → import** qiling;
- brauzer ma'lumotlarini tozalasangiz, ma'lumotlar o'chadi — vaqti-vaqti bilan eksport qilib turing;
- rasmlar ham shu yerda saqlanadi, joy ~5 MB bilan cheklangan (taxminan 300–500 ta rasm).

Boshlang'ich ro'yxat (`src/data/seed.ts`) faqat birinchi ochilishda yoki "Boshlang'ich holatga qaytarish"da ishlatiladi.

## Tuzilma

```
src/
  data/seed.ts      boshlang'ich bo'limlar, xodimlar, anketa savollari
  data/store.tsx    holat + localStorage saqlash + amallar
  data/types.ts     tiplar
  pages/            Overview, DeptView, Profile, SearchView
  components/       formalar, modal, daraxt, anketa bo'limlari
  styles.css        dizayn (yorug'/qorong'i, mobil, print)
```

## Kirish va huquqlar

| Kim | Qanday kiradi | Nima qila oladi |
|---|---|---|
| **HR / Rahbar (admin)** | `/#/login` — email + parol. Faqat `adminlar` jadvalidagi emaillar | Hamma narsa: bo'limlar, xodimlar, anketalarni qabul qilish, baholash, rivojlanish rejasi, shaxsiy havolalar |
| **Hamma (loginsiz)** | Saytni ochadi, login so'ralmaydi | Faqat ko'rish: bo'limlar, ismlar, lavozimlar, rasmlar, kim kimga bo'ysunadi. Telefon, manzil, oila, baholash va boshqa anketa ma'lumotlari ko'rinmaydi |
| **Yangi xodim** | Ochiq anketa havolasi `/#/anketa` | To'liq anketani bir marta to'ldirib HR ga yuboradi |
| **Xodim** | Shaxsiy havola `/#/a/<token>` (HR beradi) | Faqat o'z anketasini keyin ham o'zgartiradi. Baholash va rivojlanish rejasini faqat ko'radi |

Kirish sahifasiga havola yo'q — HR/rahbar manzil qatoriga `/#/login` yozib kiradi. Hisoblar `ADMIN-KIRISH.txt` faylida (git'ga tushmaydi).

## Ish tartibi

1. **Anketa havolasi** hammaga bitta: https://uzgrow-org.vercel.app/#/anketa. HR uni yangi xodimga Telegram/SMS orqali yuboradi (sahifa "📋 Anketalar" da "Nusxalash" tugmasi bor).
2. **Xodim anketani to'ldiradi** (7 bo'lim: shaxsiy, ta'lim, mehnat, oila, shaxsiyat, hobbi, maqsad; ism va telefon majburiy, rasm ixtiyoriy) va "Yuborish" bosadi.
3. **HR ga tushadi**: sarlavhadagi "📋 Anketalar" tugmasida yangi anketalar soni chiqadi. HR ochadi, to'liq anketani o'qiydi.
4. **Qabul qilish**: HR bo'limni (avtomatik "Sinov muddatidagilar"), lavozimni, rahbarni belgilab "Qabul qilish" bosadi → xodim tuzilmada paydo bo'ladi, anketasi to'liq ko'chadi, unga shaxsiy havola yaratiladi. "Rad etish" ham mumkin.
5. **Sinov muddati tugagach** HR xodim sahifasida "Tahrirlash" → bo'limni doimiy bo'limga o'zgartiradi.
6. **Baholash** (08) va **rivojlanish rejasi** (09) ni faqat HR/rahbar to'ldiradi; xodim shaxsiy havolasida ko'radi. **Takliflar** (10) ni xodim yozadi, holatini HR/rahbar o'zgartiradi.
7. "Bevosita rahbari" ro'yxatida faqat rahbarlar chiqadi: CEO, bo'lim boshliqlari va qo'l ostida xodimi borlar.
8. Zaxira: ☰ Menyu → JSON eksport.

**Yangi admin qo'shish**: Supabase → SQL Editor: `insert into adminlar(email, rol, nomi) values ('email', 'hr', 'Ism')` (rol: `hr` yoki `rahbar`), keyin o'sha odam `/#/login` da ro'yxatdan o'tadi.

## Supabase

Jadvallar: `bolimlar`, `xodimlar` (`token` — shaxsiy havola), `sozlamalar`, `arizalar` (to'ldirilgan anketalar), `adminlar`, `ariza_limit` (spam himoyasi). RPC: `tuzilma_ochiq` (ochiq ko'rish), `anketa_yuborish` (ochiq forma), `xodim_olish` / `xodim_saqlash` (shaxsiy havola), `is_admin`, `mening_rolim`. Migratsiyalar `supabase/` papkasida, pooler orqali qo'llangan (`aws-0-ap-northeast-2.pooler.supabase.com`).

`.env` bo'lmasa ilova faqat lokal (localStorage) rejimda ishlaydi — anketa qabul va havolalar o'chadi.

## Xavfsizlik

- Jadvallarga faqat `adminlar` ro'yxatidagi kirgan foydalanuvchi kira oladi (RLS). Anonim kalit bilan jadvalni o'qib ham, yozib ham bo'lmaydi.
- Ochiq rejim `tuzilma_ochiq()` orqali faqat id, bo'lim, rahbar, ism, lavozim, guruh va rasmni oladi — maxfiy maydonlar brauzerga yuborilmaydi.
- Ochiq anketa formasi: faqat anketa maydonlari saqlanadi, 1.5 MB chegara, yashirin "honeypot" maydon (botlar uchun), bir IP dan soatiga 5 ta anketa.
- Xodim o'z anketasiga 128-bitli tasodifiy token bilan kiradi; HR tokenni istalgan vaqt almashtira oladi. Xodim yuborgan ma'lumotdan server faqat ruxsat etilgan maydonlarni oladi — bo'lim, rahbar, lavozim, baholash, rivojlanish rejasi o'zgarmaydi.
- Supabase bilan ishlaganda brauzerda ma'lumot keshlanmaydi; chiqishda tozalanadi; realtime faqat admin sessiyasida.
- Vercel HTTP sarlavhalari (`vercel.json`): Content-Security-Policy, X-Frame-Options DENY, nosniff, HSTS, Referrer-Policy no-referrer.
- Tavsiya: Supabase Dashboard → Authentication → "Disable new user signups" ni yoqing va Site URL ni https://uzgrow-org.vercel.app qiling.

## Boshqaruv imkoniyatlari (☰ Menyu)

- **Hisobot** — bo'limlar kesimida xodim soni, anketa to'ldirilganlik, o'rtacha ball, 60 dan past ballilar; sinov muddatidagilar (90 kundan oshsa qizil); baholanmaganlar; anketalar statistikasi.
- **O'zgarishlar tarixi** — kim, qachon, qaysi xodim/bo'lim/anketada nimani o'zgartirdi (bazadagi trigger yozadi, 180 kun saqlanadi).
- **Zaxiralar** — har kuni avtomatik (pg_cron, 30 kun), "Hozir zaxira olish", JSON yuklab olish, tiklash.
- **Arxiv** — "Ishdan ketdi (arxiv)" bosilgan xodimlar: anketasi saqlanadi, tuzilmada ko'rinmaydi, qaytarish yoki butunlay o'chirish mumkin.
- **Baholash tarixi** — "+ Yangi davr" bosilganda eski baholash tarixga ko'chadi; baholovchi va sana yoziladi.
- **Parolni o'zgartirish**, 4 soat harakatsizlikdan keyin avtomatik chiqish.
- Anketa formasi javoblarni brauzerda avtomatik saqlaydi (qoralama).
- `api/ping.js` + `vercel.json` cron: har kuni Supabase'ga so'rov — bepul loyiha uxlab qolmaydi.

## 2026-10-27 yangiliklari

- **Anketa formasi**: 9 bo'lim (09 Rivojlanish va karyera rejasi, 10 Takliflar qo'shildi), 49 savol **majburiy** — bo'sh qoldirib yuborib bo'lmaydi, bo'sh joylar qizil belgilanadi. Takliflar ixtiyoriy. Rasm ixtiyoriy (HR keyin yuklaydi).
- **HR anketani tahrirlaydi**: "📋 Anketalar" → anketa → har bo'limda "Tahrirlash" (bazaga yoziladi), avatarni bosib rasm yuklaydi — qabul qilishdan oldin ham, keyin ham.
- **Xodim** o'z havolasi orqali 08 "Baholash"dan tashqari hamma bo'limni (09 ham) o'zgartiradi.
- **Guruh** maydoni ro'yxat: mavjud guruhlardan tanlash yoki "+ Yangi guruh…".
- **Ilova (PWA)**: saytda "⬇ Ilovani o'rnatish" tugmasi (Chrome/Edge, Android). Kompyuterda ish stolida ikonka bilan alohida oynada ochiladi; iPhone'da Safari → Ulashish → "Uy ekraniga qo'shish". `vite-plugin-pwa`, ikonkalar `public/` da.
