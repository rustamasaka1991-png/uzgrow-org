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

Ikki xil foydalanuvchi bor:

| Kim | Qanday kiradi | Nima qila oladi |
|---|---|---|
| **HR / rahbariyat (admin)** | `#/login` — email + parol. Faqat `adminlar` jadvalidagi emaillar admin bo'ladi | Hamma narsa: bo'limlar, xodimlar, baholash, rivojlanish rejasi, taklif havolalari, shaxsiy havolalar |
| **Xodim** | Faqat o'ziga berilgan shaxsiy havola `#/a/<token>` | Faqat o'z anketasi: shaxsiy, ta'lim, mehnat, oila, shaxsiyat, hobbi, maqsad, takliflar, rasm. Baholash va rivojlanish rejasini faqat ko'radi |

**Yangi xodim qanday qo'shiladi**

1. HR bo'lim sahifasida **🔗 Taklif havolasi** → lavozim, rahbar, guruh → havola yaratiladi (`#/h/<token>`, bir marta ishlaydi).
2. HR havolani xodimga yuboradi (Telegram/SMS). Xodim havolani ochib ismini kiritadi va anketasini to'ldiradi — u o'sha bo'limda paydo bo'ladi.
3. Xodimga shaxsiy havola (`#/a/<token>`) ko'rsatiladi; HR ham uni xodim sahifasida ko'radi va kerak bo'lsa **Yangi havola** bilan almashtiradi (eski havola o'chadi).

**Admin qo'shish**: Supabase SQL muharririda `insert into adminlar(email) values ('email@...')`, keyin o'sha odam `#/login` da ro'yxatdan o'tadi (emailga tasdiqlash xati keladi).

## Supabase

`.env` da `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY` bo'lsa ilova Supabase bilan ishlaydi:

- jadvallar: `bolimlar`, `xodimlar` (`token` ustuni — shaxsiy havola), `sozlamalar`, `havolalar` (taklif havolalari), `adminlar`;
- RLS: jadvallarga faqat `is_admin()` rost bo'lgan kirgan foydalanuvchi kira oladi; anonim kalit bilan jadvallarni o'qib bo'lmaydi;
- xodimlar `security definer` RPC orqali ishlaydi: `havola_info`, `havola_toldirish`, `xodim_olish`, `xodim_saqlash` — token bo'yicha faqat o'z yozuvi, himoyalangan maydonlar (bo'lim, rahbar, lavozim, baholash, rivojlanish) server tomonida almashtirilmaydi;
- admin tomonida har bir o'zgarish darhol yoziladi, boshqa kompyuterdagi o'zgarishlar realtime orqali ko'rinadi, oflaynda navbatga tushadi;
- localStorage kesh sifatida qoladi. `.env` bo'lmasa ilova faqat lokal (havolalarsiz) rejimda ishlaydi.

SQL migratsiyalar `scratchpad/migrate` skriptlari bilan pooler orqali qo'llangan (`aws-0-ap-northeast-2.pooler.supabase.com`).

## Foydalanish yo'riqnomasi (HR va rahbar uchun)

**Hisoblar** (parollar `ADMIN-KIRISH.txt` faylida, git'ga tushmaydi):

| Rol | Email | Huquqlar |
|---|---|---|
| Rahbar (bosh direktor) | `rahbar@uzgrow.uz` | Hamma narsa + xodimlarni baholash |
| HR | `hr@uzgrow.uz` | Hamma narsa + xodimlarni baholash |
| Ta'sischi | `rustamasaka1991@gmail.com` | Hamma narsa |

Xodimlarga login berilmaydi — ular faqat shaxsiy havola orqali kiradi va faqat o'z anketasini ko'radi.

**Kundalik ish tartibi**

1. https://uzgrow-org.vercel.app/#/login ga kiring (HR yoki rahbar).
2. Yangi xodim kelsa: bo'lim sahifasi → **🔗 Taklif havolasi** → lavozim, rahbar → **Havola yaratish** → **Nusxalash** → xodimga Telegram/SMS orqali yuboring.
3. Xodim havolani ochadi, ism va rasmini kiritadi, anketasini to'ldiradi. Shu zahoti bo'limda paydo bo'ladi; HR sahifada "Taklif havolalari" bo'limida "To'ldirildi" deb ko'rinadi.
4. Xodim anketasini keyin ham o'zgartirishi uchun unga ko'rsatilgan shaxsiy havolani saqlab qo'yishi kerak. Yo'qotsa — HR xodim sahifasida **Nusxalash** yoki **Yangi havola** qiladi.
5. Baholash: xodim sahifasi → 08 "Xodimni baholash" → **Tahrirlash** → ballar, davr, izoh → **Saqlash**. Xodim buni faqat ko'radi.
6. Rivojlanish rejasi (09) ham faqat HR/rahbar tomonidan to'ldiriladi. Takliflar (10) ni xodim yozadi, holatini ("Ko'rib chiqilmoqda", "Tasdiqlandi"...) faqat HR/rahbar o'zgartiradi.
7. Zaxira: ☰ Menyu → JSON eksport.

**Yangi admin qo'shish**: Supabase → SQL Editor: `insert into adminlar(email, rol, nomi) values ('email', 'hr', 'Ism')` (rol: `hr` yoki `rahbar`), keyin o'sha odam `#/login` da ro'yxatdan o'tadi.
