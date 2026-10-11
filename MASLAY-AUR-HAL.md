# Masail aur Unka Hal — Colors with Kiran

Ye file un **4 masail** ki poori kahani hai jo setup ke doran aaye, aur
har ek ka hal. Agar kabhi dobara koi problem ho, pehle yahi file kholein.

> **Sab se zaroori baat:** in mein se **ek bhi masla aapki ghalti nahi tha.**
> Teen to meri apni ghaltiyan theen. Ek computer software ka maaroof bug tha.
> Website bilkul sahi bani hui hai.

---

## ⚡ Emergency Card — ye 3 commands 90% masail theek kar deti hain

Terminal (kaali window) mein, apne `colors-with-kiran` folder ke andar:

```
npm run check          ← pehle ye: batayega masla kahan hai
npm install            ← parts dobara install karein
npm start              ← website chalayein
```

Aur browser mein hamesha ye address:

```
http://localhost:3000
```

---

# Masla 1 — Website chal rahi thi, lekin photos nahi aa rahi theen

### Kya nazar aaya
Saare pages khul rahe the, likhai sab theek thi, lekin tasveerein ghaayab.

### Asli wajah
ZIP file bilkul theek thi — maine check kiya tha ke us mein 18 bari aur
18 choti photos maujood hain. Masla ye tha ke **photo files aapke computer
par theek se nikli hi nahi theen.**

Windows par ek dhoka hota hai: jab aap ZIP file par **double-click** karte
hain, to ek window khulti hai jo bilkul normal folder jaisi lagti hai. Aap
us ke andar ja sakte hain, files dekh sakte hain. **Lekin wo asli folder
nahi hota** — wo sirf ek jhalak (preview) hai. Us mein se chalayein to
kuch cheezein milti hain, kuch nahi.

### Hal
ZIP par **right-click → "Extract All…" → Extract**.
Kabhi bhi ZIP ko double-click karke us ke andar kaam na karein.

### Aainda kaise bachein
Extract karne ke baad **10 second ka test** — ye folder kholein:

```
colors-with-kiran\public\uploads\thumb
```

- 18 files `.webp` par khatam hoti hain → ✅ sahi
- khaali hai ya folder hi nahi → ❌ dobara theek se extract karein

Ya phir sirf ye command chala lein — wo khud bata degi:

```
npm run check
```

---

# Masla 2 — "Failed to Load Page / ERR_ADDRESS_INVALID"

### Kya nazar aaya
Terminal mein sab theek tha, lekin browser mein ye error:

```
Failed to Load Page
ERR_ADDRESS_INVALID (-108)
URL: http://0.0.0.0:3000/
```

### Asli wajah
**Ye meri ghalti thi.** Server start hone par main screen par ye likhta tha:

```
✓ Website → http://0.0.0.0:3000
```

Aap ne bilkul theek kiya ke wahi address copy ki. Lekin `0.0.0.0` koi asli
address nahi hai — wo server ko diya gaya ek **internal hukm** hai jis ka
matlab hai *"har jagah se connection sunno."* Browser isay samajh hi nahi
sakta.

### Hal
Browser mein hamesha ye:

```
http://localhost:3000
```

`localhost` ka matlab hai **"yehi computer."**

### Aainda kaise bachein
Maine code theek kar diya hai — ab startup par seedha sahi address likha
aata hai, to ye ghalti dobara nahi hogi:

```
✓ Website → http://localhost:3000
```

### Yaad rakhne wali 3 baatein address ke baare mein
| Address | Chalega? |
|---|---|
| `http://localhost:3000` | ✅ haan |
| `http://127.0.0.1:3000` | ✅ haan (yehi cheez hai) |
| `http://0.0.0.0:3000` | ❌ kabhi nahi |
| `https://localhost:3000` | ❌ nahi — `https` nahi, sirf `http` |

---

# Masla 3 — "Assertion failed" aur hex numbers ki deewar

### Kya nazar aaya
`npm start` likhte hi ye darawna manzar:

```
# Assertion failed: (env) != nullptr
----- Native stack trace -----
 1: 00007FF60E0590C6 node::SetAbortHandler+54
 2: 00007FF60E058C77 ...
```

### Asli wajah
Ye **sab se asli bug** tha, aur iski wajah bhi main hi tha.

Website ke andar ek chhota software hai jo database sambhalta hai —
us ka naam `better-sqlite3` hai. Us ka **version 12**, Node.js ke **version
24.19 ya us se naye** ke saath **crash** kar jata hai. Ye duniya bhar ke
developers ke saath ho raha hai, aap akeli nahi hain.

Aur combination maine hi banaya: maine aap se kaha tha ke nodejs.org se
"LTS" wala bara green button dabayein — aur aaj kal LTS **Node 24** hai.
Yaani maine aap ko theek wahi do cheezein milwa deen jo saath mein tootti
hain.

### Maine kaise pakka kiya ke yehi wajah hai
Sirf andaza nahi lagaya. Maine apne system par **Node 24.21 install karke
aap wala crash dobara paida kiya** — bilkul wahi error mila. Phir naya
version laga kar test kiya — 300,000 database operations ke baad bhi
bilkul theek chala.

### Hal
```
npm install better-sqlite3@13
```

Version 13 ek naya rewrite hai jo is bug ko chhoo hi nahi sakta.

### Ek faida bhi hua
Version 13 Windows ke liye **pehle se tayyar file** ke saath aata hai, is
liye ab kuch "compile" nahi hota. `npm install` ab **7 second** leta hai —
pehle **100 second** lagte the.

### Aainda kaise bachein
Maine ek **guard** laga diya hai. Agar kabhi Node ka ghalat version ho, to
ab hex numbers ki deewar nahi, ye saaf message aayega:

```
✗ Your Node.js is too old.
    you have:  Node 20.20.2
    you need:  Node 22 or newer
```

---

# Masla 4 — Baar baar "Restarting 'server.js'"

### Kya nazar aaya
```
Change detected in 'D:\...\node_modules\express-rate-limit\...\ms\index.js'
Restarting 'server.js'
```

### Asli wajah
Aap `npm run dev` chala rahe theen. Wo ek **developer ka tareeqa** hai —
us ka kaam hai files par nazar rakhna aur kuch badalne par website ko
khud restart karna. Lekin wo `node_modules` folder par bhi nazar rakh raha
tha (jis mein hazaron files hoti hain), is liye bar bar restart ho raha tha.

### Hal
Rozana istemal ke liye hamesha ye:

```
npm start
```

`npm run dev` sirf tab jab koi developer code badal raha ho.

### Aainda kaise bachein
Maine `dev` wale tareeqe ko theek kar diya hai — ab wo sirf asli code
dekhta hai, `node_modules` ko nahi.

---

# 🎓 5 Sunehri Usool (yaad rakhein)

### 1. ZIP hamesha right-click → Extract All
Kabhi double-click karke andar kaam na karein. **Masla 1 isi se hua tha.**

### 2. Browser mein hamesha `localhost`
`0.0.0.0` kabhi nahi. **Masla 2 isi se hua tha.**

### 3. Rozana `npm start`, `npm run dev` nahi
**Masla 4 isi se hua tha.**

### 4. `npm install` sirf ek baar, har naye folder ke liye
Agar aap folder delete kar ke dobara extract karein, to `npm install`
dobara karna hoga. Us ke baad sirf `npm start`.

### 5. Kaali window band = website band
Ye normal hai, kharabi nahi. Website sirf tab tak chalti hai jab tak wo
window khuli hai. Band karni ho to **Ctrl + C**.

---

# 🔍 Agar kabhi koi naya masla ho — ye tarteeb follow karein

**Qadam 1 — Checker chalayein**
```
npm run check
```
Ye saaf saaf batata hai ke files, database aur photos theek hain ya nahi.

**Qadam 2 — Error ko dekhein, ghabrayein nahi**
Lamba error 99% waqt ek choti si baat hoti hai. Pehli do lines sab se
zaroori hoti hain, baqi sirf technical tafseel hai.

**Qadam 3 — Aam errors ki fehrist**

| Screen par likha | Matlab | Hal |
|---|---|---|
| `'npm' is not recognized` | Node.js install nahi, ya window purani khuli hai | Node.js install karein, window band kar ke dobara kholein |
| `Cannot find module 'express'` | Parts install nahi hue | `npm install` |
| `EADDRINUSE :::3000` | Website pehle se kisi aur window mein chal rahi hai | Wo window band karein, ya computer restart |
| `ERR_ADDRESS_INVALID` | Ghalat address | `http://localhost:3000` |
| `Assertion failed` + hex numbers | Database engine purana | `npm install better-sqlite3@13` |
| `Your Node.js is too old` | Node purana hai | nodejs.org se naya LTS install karein |
| Photos nahi aa rahi | ZIP theek se extract nahi hui | Right-click → Extract All |

**Qadam 4 — Phir bhi na chale?**
Kaali window ka **screenshot** lein. Us mein likha error kisi bhi developer
ko 5 second mein sab bata deta hai.

---

# 😌 Kab bilkul ghabrana nahi hai

- **Peele (yellow) warnings** `npm install` ke doran → bilkul normal, ignore karein
- **`npm notice New major version of npm available`** → ignore karein
- **`found 0 vulnerabilities`** → ye to khush-khabri hai
- **Website band ho gayi kyunki window band ki** → normal, `npm start` dobara
- **Kuch delete ho gaya dashboard se** → Dashboard → **Trash** → Restore

---

# 💾 Aur sab se zaroori — Backup

Chahe kuch bhi ho jaye, aapki poori website sirf **do folders** hain:

```
data\              ← designs, prices, bookings, saara likha hua
public\uploads\    ← saari photos
```

In dono ko **mahine mein ek baar** Google Drive ya USB par copy kar dein.

Agar kabhi sab kuch kharab ho jaye: nayi ZIP extract karein, `npm install`
karein, aur ye do folders upar paste kar dein. Sab wapas aa jayega.

---

## Baqi documents

| File | Kis liye |
|---|---|
| **MASLAY-AUR-HAL.md** | Yehi file — masail aur unke hal |
| **SETUP.md** | Install aur hosting ka poora tareeqa |
| **KIRAN-GUIDE.md** | Dashboard rozana kaise istemal karna hai |
| **README.md** | Technical tafseel — kisi developer ko dene ke liye |

Masha'Allah, ab sab theek chal raha hai. ✨
