# UZ-GROW Tashkiliy Tuzilma

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
