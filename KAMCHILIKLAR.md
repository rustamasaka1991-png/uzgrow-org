# UZ-GROW tizimi: kamchiliklar, cheklovlar va tavsiyalar

Sana: 2026-10-23. Bu hujjat tizimning hozirgi holatini halol tasvirlaydi: nima ishlaydi, nima ishlamaydi, qayerda xavf bor, nimani qachon tuzatish kerak.

Belgilar: 🔴 — muhim, tezroq hal qilish kerak · 🟡 — o'rtacha, rejalashtiring · 🟢 — kichik, qulaylik.

---

## 1. Hozir siz qilishingiz kerak bo'lgan ishlar

| # | Nima | Nega | Qanday |
|---|---|---|---|
| 🔴 1 | **Baza parolini almashtiring** | Siz `postgresql://postgres:...` parolini chatga yozdingiz. Ilova bu parolni ishlatmaydi, lekin u endi "ochiq" deb hisoblanadi | Supabase Dashboard → Project Settings → Database → Reset database password |
| 🔴 2 | **`ADMIN-KIRISH.txt` faylini xavfsiz joyga ko'chiring** | Parollar ish stolida ochiq matnda turibdi | Parol menejeriga (Bitwarden, 1Password, Google Password Manager) ko'chirib, faylni o'chiring |
| 🔴 3 | **Supabase loyihasi "uxlab" qolmasin** | Bepul tarifda loyiha 7 kun ishlatilmasa to'xtatiladi — sayt "Ulanish yo'q" deb qoladi, anketalar kelmaydi | Haftada bir marta Dashboard'ga kiring, yoki Pro tarifga o'ting (25$/oy), yoki menga ayting — har kuni avtomatik so'rov yuboradigan sozlama qilaman |
| 🟡 4 | **Supabase → Authentication → URL Configuration → Site URL** ni `https://uzgrow-org.vercel.app` qiling | Email orqali tasdiqlash va parol tiklash havolalari hozir `localhost:3000` ga yo'naltiradi | Dashboard'da bir marta |
| 🟡 5 | **Supabase → Authentication → "Disable new user signups"** ni yoqing | Men buni bazadagi trigger bilan qildim (ro'yxatda bo'lmagan email umuman ro'yxatdan o'ta olmaydi — tekshirildi). Dashboard tugmasi qo'shimcha qatlam | Dashboard'da bir marta |
| 🟡 6 | **Vercel tarifi** | Hozir Hobby (bepul) tarif. Vercel qoidalariga ko'ra Hobby faqat shaxsiy/notijorat loyihalar uchun. Kompaniya ichki vositasi uchun Pro (20$/oy) talab qilinishi mumkin | Vercel → Settings → Billing |
| 🟢 7 | **O'z domeningiz** (masalan `hr.uzgrow.uz`) | `uzgrow-org.vercel.app` o'rniga chiroyli manzil; xodimlarga yuborish oson | Vercel → Domains, DNS'da CNAME. Men qilib beraman |

---

## 2. Xavfsizlik kamchiliklari

### 2.1 Kirish va hisoblar
- 🔴 **`hr@uzgrow.uz` va `rahbar@uzgrow.uz` haqiqiy pochta emas.** Parol unutilsa "parolni tiklash" ishlamaydi — faqat bazadan qo'lda yangi parol qo'yish mumkin (men yoki dasturchi). Yechim: haqiqiy emaillar bilan hisob ochish (ro'yxatga qo'shaman, odam o'zi ro'yxatdan o'tadi) va eski ikkitasini o'chirish.
- 🟡 **Ikki bosqichli tasdiqlash (2FA) yo'q.** Parol o'g'irlansa, hamma ma'lumot ochiladi. Supabase MFA ni qo'llab-quvvatlaydi, lekin ilovaga qo'shilmagan (≈1 kun ish).
- 🟡 **Sessiya muddati cheklanmagan.** Brauzerda bir marta kirsangiz, "Chiqish" bosilmaguncha ochiq qoladi. Umumiy kompyuterda **albatta "Chiqish"** bosing. Avtomatik chiqish (masalan 8 soatdan keyin) qo'shish mumkin.
- 🟡 **HR va Rahbar huquqlari bir xil.** Rahbarni "faqat ko'rish + baholash" qilib cheklash hozircha yo'q. Bo'lim boshliqlari (masalan sotuv rahbari) o'z xodimlarini o'zi baholay olmaydi — faqat admin baholaydi. Kerak bo'lsa "bo'lim boshlig'i" roli qo'shiladi (≈2 kun).
- 🟡 **Kim nimani o'zgartirgani yozilmaydi (audit log yo'q).** Faqat "oxirgi o'zgarish vaqti" bor. Masalan, kim baholash ballini o'zgartirgani ko'rinmaydi.
- 🟢 Login sahifasida "Ro'yxatdan o'tish" tugmasi bor; u faqat ruxsat ro'yxatidagi emaillar uchun ishlaydi (boshqalarga xato beradi), lekin chalg'itishi mumkin.

### 2.2 Ochiq ma'lumotlar
- 🟡 **Tuzilma hammaga ochiq.** Havolani bilgan har kim (internetdagi istalgan odam) barcha xodimlarning ism, lavozim, rasm, bo'lim va rahbarini ko'radi. Qidiruv tizimlariga `noindex` qo'yildi, lekin bu havola tarqalsa yordam bermaydi. Agar bu kerak bo'lmasa: umumiy "ko'rish paroli" qo'shish mumkin (≈2 soat) yoki ochiq rejimni butunlay yopish.
- 🟡 **Rasmlar ochiq rejimda hammaga yuboriladi.** 100 ta xodim bo'lsa sahifa 1–3 MB bo'ladi (har rasm 512px, ≈10–30 KB). Telefonda sekin ochiladi. Yechim: rasmlarni Supabase Storage'ga ko'chirish (≈1 kun).
- 🟢 Ochiq anketa sahifasida (`/#/anketa`) kompaniya nomi ko'rinadi — bu normal, lekin forma hammaga ochiq bo'lgani uchun begonalar ham "anketa" yuborishi mumkin (pastga qarang).

### 2.3 Shaxsiy havolalar
- 🟡 **Havola = parol.** Xodimning shaxsiy havolasi (`/#/a/...`) kimga tushsa, o'sha odam anketani o'zgartira oladi. Havolalar Telegram/SMS orqali yuboriladi — u yerda saqlanib qoladi. Muddati tugamaydi. HR "Yangi havola" bilan eskisini bekor qila oladi, lekin buni kuzatish HR zimmasida.
- 🟢 Havola 128-bitli tasodifiy token — taxmin qilib bo'lmaydi, bu yetarli.

### 2.4 Ochiq anketa formasi (spam)
- 🟡 **CAPTCHA yo'q.** Himoya: yashirin "tuzoq" maydon (oddiy botlar to'ldiradi) va bir IP'dan soatiga 5 ta anketa. VPN/proksi bilan IP almashtirib ko'proq yuborish mumkin. Agar spam boshlansa — Cloudflare Turnstile (bepul CAPTCHA) qo'shiladi (≈3 soat).
- 🟡 **Bir odam bir necha marta yuborishi mumkin** (dublikat). HR ro'yxatda ko'rib o'zi aniqlaydi.
- 🟡 **Anketada IP manzil saqlanadi** (`arizalar.ip`) — spamga qarshi kerak, lekin bu shaxsiy ma'lumot; 30 kundan keyin o'chirib turish kerak (avtomatik tozalash qo'shilmagan).

### 2.5 Infratuzilma
- 🟡 **Ommaviy kalit (anon key) brauzerda ochiq.** Bu Supabase'da normal, chunki jadvallar RLS bilan yopiq. Lekin `tuzilma_ochiq` va `anketa_yuborish` funksiyalarini kalitni bilgan har kim chaqira oladi (bu ataylab shunday).
- 🟡 **Zaxira nusxa.** Bepul tarifda Supabase avtomatik zaxira qilmaydi. Yagona zaxira — ☰ Menyu → "JSON eksport" (rasmlar bilan). Kamida haftada bir marta eksport qilib, faylni Google Drive'ga qo'ying. Pro tarifda kunlik zaxira bor.
- 🟢 CSP (Content-Security-Policy) da `style-src 'unsafe-inline'` ruxsat etilgan — inline stillar uchun kerak; kichik xavf.

---

## 3. Funksional kamchiliklar

### 3.1 Anketa formasi
- 🔴 **Qoralama saqlanmaydi.** Forma uzun (40+ savol). Xodim brauzerni yopsa yoki telefon o'chsa — hammasi yo'qoladi, boshidan to'ldirish kerak. Yechim: brauzerda avtomatik saqlash (≈2 soat) — birinchi navbatda qilish tavsiya etiladi.
- 🟡 **Yuborgandan keyin tuzatib bo'lmaydi.** Xato qilsa — qaytadan to'liq yuboradi. HR qabul qilgandan keyin esa xodimga shaxsiy havola beriladi, u orqali tuzatadi.
- 🟡 **Fayl biriktirib bo'lmaydi** (diplom, pasport nusxasi, rezyume PDF). Faqat rasm (avatar).
- 🟡 **HR'ga xabar bormaydi.** Yangi anketa kelganda Telegram/email xabar yo'q — HR saytni ochib "Anketalar" tugmasidagi raqamga qaraydi. Telegram bot orqali xabar qo'shish mumkin (≈3 soat).
- 🟢 Majburiy faqat ism va telefon; qolganini bo'sh qoldirib yuborish mumkin — HR "to'ldirilgan" foizini ko'radi.

### 3.2 Baholash
- 🟡 **Tarix yo'q.** Har xodimda bitta baholash to'plami. Yangi chorakda ballar kiritilsa, eskisi o'chadi (faqat "davr" matni bor). Chorakma-chorak dinamikani ko'rib bo'lmaydi. Yechim: baholashlar ro'yxati (≈1 kun).
- 🟡 **Baholovchi kim ekani saqlanmaydi** (HR yoki rahbar).
- 🟢 Rivojlanish rejasi ham bitta, tarixsiz.

### 3.3 Tuzilma va xodimlar
- 🟡 **O'chirish qaytarilmaydi.** Xodim yoki bo'lim o'chirilsa — "savat" yo'q, faqat JSON zaxiradan tiklash mumkin.
- 🟡 **Ikki admin bir vaqtda bitta xodimni tahrirlasa, oxirgisi yutadi** — birinchisining o'zgarishi yo'qoladi (ogohlantirish yo'q). Amalda 2–3 admin bilan kam uchraydi.
- 🟡 **Oflayn navbat.** Admin internet bo'lmaganda o'zgartirsa, o'zgarishlar brauzerda saqlanib, keyin yuboriladi. Lekin shu orada boshqa admin o'sha xodimni o'zgartirgan bo'lsa, navbatdagi eski versiya ustidan yozib yuboradi.
- 🟡 **Rahbar tanlash qoidasi avtomatik:** "rahbar" deb CEO, bo'lim boshliqlari va qo'l ostida kimdir bor odamlar hisoblanadi. Masalan, kassirga rahbar bo'lgan buxgalter ham ro'yxatga tushadi. Qo'lda "bu odam rahbar" belgisi yo'q.
- 🟡 **Xodimni ishdan bo'shatish = o'chirish.** "Ishdan ketganlar" arxivi yo'q; ketgan xodim anketasi butunlay yo'qoladi. Arxiv bo'limi/holat qo'shish mumkin (≈3 soat).
- 🟢 Bo'lim ikonkalari faqat dastlabki 6 ta bo'lim uchun chizilgan; yangi bo'limlar (IT, Sinov) umumiy ikonka oladi.
- 🟢 Daraxt keng bo'limlarda (10+ xodim bir rahbar ostida) gorizontal aylantiriladi; telefonda noqulay.
- 🟢 Qidiruv faqat ism/lavozim bo'yicha, kirill-lotin farqini bilmaydi ("Shodiev" yozsangiz "Шодиев" topilmaydi).

### 3.4 Hisobotlar
- 🟡 Hech qanday hisobot yo'q: bo'limlar bo'yicha o'rtacha ball, anketa to'ldirilganlik jadvali, sinov muddati tugayotganlar ro'yxati, yangi anketalar statistikasi. Hozircha hamma narsa sahifama-sahifa ko'riladi.
- 🟡 **Sinov muddati sanasi kuzatilmaydi.** Xodim "Sinov muddatidagilar"ga tushadi, lekin qachon tushgani va qachon tugashi eslatilmaydi.
- 🟢 Chop etish — oddiy brauzer print; PDF eksport, Excel eksport yo'q.

### 3.5 Texnik
- 🟡 **Avtomatik testlar yo'q.** Hamma narsa qo'lda tekshirilgan (barcha asosiy oqimlar brauzerda sinalgan). Keyingi o'zgarishlarda nimadir buzilsa, test ogohlantirmaydi.
- 🟡 **Hamma ma'lumot bir vaqtda yuklanadi.** 500 xodimgacha muammo yo'q; 1000+ bo'lsa sahifalash kerak bo'ladi.
- 🟡 **Rasmlar bazada base64 ko'rinishida.** Har xodim yozuvi rasm bilan 10–30 KB; realtime yangilanishlarda ham rasm qayta yuboriladi.
- 🟢 Faqat zamonaviy brauzerlar (2023+). Eski Android brauzerlarida CSS (`color-mix`) ishlamasligi mumkin.
- 🟢 Interfeys faqat o'zbek (lotin). Rus tili yo'q.
- 🟢 Git commit'lar sizning GitHub hisobingiz nomidan, "Claude" hammuallif sifatida.

---

## 4. Nima yaxshi ishlaydi (tasdiqlangan)

- HR/rahbar kirishi, ruxsat ro'yxati, ro'yxatdan o'tish bloklangan (begona email — xato).
- Jadvallar anonim kalit bilan o'qilmaydi (tekshirildi: 0 qator).
- Ochiq rejim faqat 7 ta xavfsiz maydonni oladi; chiqishda brauzer tozalanadi; telefon raqami bo'yicha qidiruv ochiq rejimda hech narsa topmaydi.
- Anketa yuborish → HR'da raqam → qabul qilish → xodim bo'limda — oxirigacha sinalgan.
- Xodim shaxsiy havola bilan faqat o'z anketasini o'zgartiradi; bo'lim/rahbar/lavozim/baholashni o'zgartirishga urinish serverda e'tiborsiz qoladi (tekshirildi).
- Realtime: bir kompyuterdagi o'zgarish boshqasida 1–3 soniyada ko'rinadi.
- Jonli saytda HTTP xavfsizlik sarlavhalari (CSP, X-Frame-Options, HSTS) tekshirildi.
- Har push'da Vercel avtomatik yangi versiya chiqaradi.

---

## 5. Tavsiya etilgan tartib (nima birinchi)

1. Baza parolini almashtirish, parollarni menejerga ko'chirish — **bugun**.
2. Site URL va "Disable signups" — Dashboard'da 5 daqiqa.
3. Anketa formasida qoralama saqlash — **birinchi dasturiy yaxshilash** (xodimlar formani yo'qotmasin).
4. Haqiqiy emaillar bilan HR/rahbar hisoblari (parol tiklash ishlashi uchun).
5. Yangi anketa haqida Telegram xabar.
6. Baholash tarixi (chorakma-chorak).
7. "Ishdan ketganlar" arxivi va sinov muddati sanasi.
8. Rasmlarni Storage'ga ko'chirish (xodimlar 50+ bo'lganda).
9. Haftalik avtomatik zaxira (yoki Supabase Pro).
10. 2FA va bo'lim boshlig'i roli — kerak bo'lganda.

Har bir bandni "qil" desangiz, bajaraman.
