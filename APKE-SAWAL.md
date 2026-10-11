# Aapke 4 Sawal — Tafseeli Jawab

---

# ⚠️ Sawal 2 ka jawab pehle — Vercel kaam NAHI karega

Ye sab se zaroori baat hai, is liye sab se upar likh raha hoon.

**Vercel par ye website nahi chalegi.** Ye meri raye nahi — Vercel ki apni
official documentation mein likha hai:

> *"SQLite needs a local file system on the server to store the data
> permanently when write requests are made. In a serverless environment,
> this central single permanent storage is not available because storage
> is ephemeral."*
> — Vercel KB, "Is SQLite supported in Vercel?"

### Wajah aasan lafzon mein

Vercel "serverless" hai. Samjhein ke wahan aapki website ka **koi apna
kamra nahi hota**. Jab koi visitor aata hai, Vercel ek arzi (temporary)
kamra banata hai, kaam karta hai, aur kamra **gira deta hai**.

Aapki website ko do cheezein **likhni** parti hain:
1. Database — designs, prices, bookings
2. Photos — jo aap upload karti hain

Vercel par likhne ki jagah hi nahi hai. Natija:

| Aap kya karengi | Vercel par kya hoga |
|---|---|
| Nayi design upload | Photo thori der baad **ghayab** |
| Price badalna | Kuch der baad **wapas purana** |
| Client form bharta hai | Booking **kho jati hai** |
| Password badalna | **Reset ho jata hai** |

Sab se khatarnaak baat: shuru mein **sab theek lagega.** Masla 2-3 din baad
shuru hoga, jab aap 20 designs daal chuki hongi. Isi liye main aap ko abhi
rok raha hoon.

### To phir kahan host karein?

| Host | Kharcha | Ye website chalegi? |
|---|---|---|
| **Vercel** | Free/paid | ❌ **Nahi** |
| Netlify | Free/paid | ❌ Nahi (wahi wajah) |
| Render (free plan) | Free | ❌ Nahi — photos delete ho jati hain |
| **Railway** | ~$5/mahina | ✅ **Haan** (Volume laga kar) |
| **Render (paid)** | ~$7/mahina | ✅ Haan (Disk laga kar) |
| **VPS** (Hostinger/Pakistani host) | ~$4-6/mahina | ✅ Haan |

Poora tareeqa **SETUP.md** ke "Part 2" mein likha hai.

> **Vercel kyun mashhoor hai phir?** Kyunki wo un websites ke liye banaya
> gaya hai jo kuch "save" nahi karteen — jaise blog ya company ka brochure.
> Aapki website ek **asli system** hai jo data sambhalti hai. Us ke liye
> ek asli server chahiye.

---

# 🏠 Domain aur Hosting — do alag cheezein hain

**Sawal:** *"Kya main ise .com par chala sakti hoon? Wo bhi to domain hai na?"*

**Jawab:** Haan, `.com` bilkul domain hai — aap theek keh rahi hain. ✅
**Lekin domain par website "chalti" nahi hai.** Ye sab se aam ghalat-fehmi
hai, aur isi se log ghalat cheez khareed lete hain.

### Dukaan wali misaal

Samjhein aap Qasimabad mein mehndi ka studio khol rahi hain:

| | Asli duniya mein | Website mein |
|---|---|---|
| 🪧 **Naam / Pata** | "Colors with Kiran, Gali #5" | **Domain** — `colorswithkiran.com` |
| 🏠 **Asli jagah** | Wo kamra jahan aap baithti hain | **Hosting** — wo computer jahan website chalti hai |

**Sirf signboard khareedne se dukaan nahi banti.** Signboard sirf logon ko
raasta batata hai — kaam asli kamre mein hota hai.

Isi tarah `.com` khareedne se website nahi chalti. Wo sirf ek **naam** hai
jo logon ko aapki hosting tak pohanchata hai.

### To aap ko DO cheezein chahiye

| Cheez | Kaam | Kharcha |
|---|---|---|
| 🪧 **Domain** (`.com`) | Naam — log ise type karte hain | **~$12 saal mein** |
| 🏠 **Hosting** | Asli computer jahan website chalti hai | **~$5-10 mahine mein** |

Dono alag khareedi jati hain. Phir domain ko hosting ki taraf **"point"**
kiya jata hai (ye 5 minute ka copy-paste kaam hai, hosting company khud
bata deti hai kya daalna hai).

---

## ⚠️ Khabardar — "Free domain ke saath hosting" wala jaal

Jab aap Hostinger ya GoDaddy jayengi, wo aap ko sasta package dikhayenge:

> *"Web Hosting — Rs. 300/mahina — **Free .com domain**!"*

**Ye package aapki website NAHI chalayega.** Paise zaya honge.

### Wajah

Wo sasti hosting **"Shared Hosting"** kehlati hai, aur wo **PHP/WordPress**
ke liye bani hai. Aapki website **Node.js** par chalti hai — wo bilkul
alag cheez hai.

Hostinger apni documentation mein saaf likhta hai: **Node.js sirf VPS plans
par support hai, shared hosting par nahi.**

Kuch hosts cPanel mein "Setup Node.js App" ka button dikhate hain, lekin
wahan bhi masle aate hain — server restart hone par website band ho jati
hai aur khud chalu nahi hoti, aur `508 Resource Limit` errors aate hain.

### To kya khareedein?

| Option | Kharcha | Mushkil? | Mera mashwara |
|---|---|---|---|
| **Railway** + alag se domain | ~$5/mo + $12/yr | Aasan | ⭐ **Behtareen** |
| **Render (paid)** + domain | ~$7/mo + $12/yr | Aasan | ✅ Achha |
| **VPS** (Hostinger KVM 1) | ~$5/mo (domain shamil nahi) | **Mushkil** | Developer ki madad se |
| Shared hosting + free domain | ~$3/mo | — | ❌ **Nahi chalegi** |

---

## 🛒 Khareedne se pehle ye sawal zaroor poochhein

Kisi bhi Pakistani ya foreign host se **bilkul yehi** poochhein:

> *"Kya aap **Node.js version 22 ya us se naya** support karte hain, SSH
> access ke saath, aur **permanent file storage** (persistent disk)?
> Mujhe shared hosting nahi, aisi hosting chahiye jahan Node.js app
> hamesha chalti rahe."*

- Jawab **"haan"** → chalegi ✅
- Jawab **"hamara plan WordPress/PHP ke liye hai"** → nahi chalegi ❌

---

## 💡 Mera asli mashwara

**Pehle sirf domain khareed lein** (`colorswithkiran.com` — saal ka $12).
Naam reserve ho jayega taake koi aur na le jaye.

Hosting baad mein, jab aap apni asli designs daal chuki hon aur website
dikhane ke liye tayyar ho. Domain hamesha kisi bhi hosting ki taraf move
kiya ja sakta hai — koi nuqsan nahi.

**Domain kahan se:**
- `.com` → Namecheap ya Cloudflare (~$10-12/saal)
- `.pk` → **PKNIC** (pknic.net.pk) — rupees mein payment

---

# Sawal 1 — Apna asli data kaise add karein?

Pehle `npm start` karein aur **http://localhost:3000/admin** kholein
(username `kiran`, password `mehndi123`).

Ye tarteeb follow karein:

### Qadam 1 — Password badlein (sab se pehle!)
**Settings → Change password**. Upar peela warning tab tak rahega jab tak
aap ye nahi karteen.

### Qadam 2 — Apne contact details
**Contact Info** panel. Yahan apna **asli WhatsApp number** country code
ke saath daalein: `+923XXXXXXXXX`

> ⚠️ Website ke **saare WhatsApp buttons** isi number ko istemal karte hain.
> Jab tak ye nahi badla, sab fake number par ja rahe hain.

Isi panel mein: phone, email, Instagram, Facebook, area, city, timings.

### Qadam 3 — Apni kahani (About)
**About** panel: apni photo, naam, tajurba (kitne saal), location, apni
kahani, specialties, services.

### Qadam 4 — Categories theek karein
**Categories** panel. 13 pehle se maujood hain. Jo aap nahi karteen usay
delete karein, apni nayi add karein, tarteeb badlein.

> Category delete karne se us ki designs delete **nahi** hoteen.

### Qadam 5 — Purani demo photos hatayein, apni daalein
**Portfolio** panel. Abhi jo 8 designs hain wo **AI se banayi hui demo
photos** hain — bohat asli lagti hain, lekin aapke haath ka kaam nahi hain.

Har nayi design ke liye:
1. **Add Design** par click
2. Apni photo upload (JPG/PNG/WebP/HEIC — mobile ki photo bilkul theek hai)
3. **Title** — jaise "Dulhan ke Haath — Full Arm"
4. **Category** chunein
5. **Description** — 1-2 line
6. **Price** — ya "starting from"
7. **Featured** on karein agar homepage par dikhani hai
8. Save

Phir purani demo designs ko **Trash** mein daal dein.

> 💡 **Mashwara:** pehle 5-6 apni behtareen designs daalein, phir aaram se
> baqi. Ek dum 50 daalne ki koshish na karein.

### Qadam 6 — Gallery
Purani ya chhoti designs ke liye. Wahi tareeqa, bas **Gallery** panel mein.
Kisi bhi design ko Portfolio aur Gallery ke darmiyan move kar sakti hain.

### Qadam 7 — Prices
**Pricing** panel. Abhi jo rates hain wo **misaal** hain, aapke nahi.
Apne asli rates daalein.

### Qadam 8 — Testimonials
**Testimonials** panel. Apni asli clients ke reviews daalein (naam,
review, event type, photo optional). Jo abhi hain wo demo hain.

### Qadam 9 — Homepage aur Banner
**Homepage** panel — hero photo aur upar ki likhai.
**Settings → Banner** — upar wali announcement patti on/off aur us ka text.

### Photos ke liye 3 tips
1. **Achhi roshni** — qudrati roshni sab se behtar
2. **Seedha upar se** khainchein, haath saaf nazar aayein
3. Website khud hi photo ko chhota kar deti hai — **asli bari photo** hi
   upload karein, pehle se compress karne ki zaroorat nahi

---

# Sawal 3 — Public aur Admin ka farq kaise kaam karta hai?

Samjhein ke aapki dukaan ke **do darwaze** hain:

| | 🚪 Public darwaza | 🔐 Admin darwaza |
|---|---|---|
| Address | `yourwebsite.com` | `yourwebsite.com/admin` |
| Kaun aa sakta hai | **Har koi** | **Sirf aap** |
| Password | Nahi chahiye | **Chahiye** |
| Kya kar sakta hai | Sirf **dekh** sakta hai | Sab kuch **badal** sakta hai |
| Kya nazar aata hai | Sirf wo jo aap ne publish kiya | Sab kuch — trash, bookings, settings |

### Andar ye kaise kaam karta hai (aasan lafzon mein)

**1. Aapka password kabhi seedha save nahi hota.**
Wo "bcrypt" naam ke tareeqe se **ulat-pulat (scramble)** kar ke rakha jata
hai. Agar koi aapki database file bhi churaa le, to bhi us mein aapka
password nahi mil sakta — sirf bekaar si ulti-seedhi likhai milegi.

**2. Login par ek "token" banta hai.**
Jab aap sahi password daalti hain, server ek secret chaabi (token) banata
hai aur aapke browser mein ek **cookie** ke tor par rakh deta hai.

**3. Har admin page ye chaabi check karta hai.**
Admin ka koi bhi page kholne se pehle server poochhta hai: *"chaabi hai?"*
Nahi hai → seedha login page par bhej diya jata hai.

**4. Wo cookie mehfooz hai.**
- `HttpOnly` — koi script usay parh nahi sakti
- `signed` — koi usay naqli bana kar nahi bana sakta
- `Secure` — asli website par sirf HTTPS par jati hai

**5. Logout** par wo chaabi mita di jati hai.

### Aap ko practically kya karna hai
- **Password badlein** — `mehndi123` har us insaan ko maloom hai jis ne ye
  guide parhi (mujhe bhi 😅)
- Ek **mushkil password** rakhein — kam az kam 12 harf
- Kisi ke saath **share na karein**
- Public wala address clients ko dein, **`/admin` wala kabhi nahi**
- Doosre ke computer par login karein to **Logout** zaroor karein

### Aik aur baat — HTTPS
Jab website online jayegi, us ka address **`https://`** se shuru hona
chahiye (taala ka nishan). Ye zaroori hai taake aapka password raaste mein
koi parh na sake. Railway aur Render ye **khud bakhud** laga dete hain —
aap ko kuch nahi karna.

---

# Sawal 4 — Kya nayi designs hamesha rahengi?

**Haan — lekin ek shart ke saath.** Ye samajhna bohat zaroori hai.

Aapki **poori website sirf do folders** hain:

```
data\              ← designs, categories, prices, bookings, settings
public\uploads\    ← saari photos
```

Jab aap koi nayi design add karti hain:
- Us ki tafseel `data\` ki database file mein likhi jati hai
- Us ki photo `public\uploads\` mein save hoti hai (do size mein)

**Jab tak ye do folders mehfooz hain, aapka data hamesha rahega.**

### Teen soortein

| Kahan | Data hamesha rahega? |
|---|---|
| **Aapke apne computer par** | ✅ Haan — folder aapke paas hai |
| **Railway/Render par Volume/Disk ke saath** | ✅ Haan |
| **Railway/Render par Volume ke baghair** | ❌ **Nahi — har restart par photos ghayab** |
| **Vercel par** | ❌ Nahi (Sawal 2 dekhein) |

Is liye **SETUP.md Part 2** mein maine "persistent disk" par itna zor diya
tha. Wo ek line ki setting hai jo faisla karti hai ke aapka saal bhar ka
kaam mehfooz rahega ya ek din ghayab ho jayega.

### Aur backup?
Mahine mein ek baar un **do folders** ko Google Drive ya USB par copy kar
dein. Ye 2 minute ka kaam hai aur sab se bari hifazat hai.

> Bura waqt aaye to: nayi ZIP extract karein → `npm install` → ye do
> folders paste kar dein → sab wapas.

---

# Sawal 5 — Form ka data kahan milega?

### Jagah: Dashboard → **Bookings / Enquiries**

Jab koi client website par form bharta hai, wo **seedha aapke dashboard
mein** aa jata hai. Dashboard khulte hi upar **"NEW ENQUIRIES"** ka counter
dikhta hai.

### Har form mein ye sab aata hai

| Khana | Misaal |
|---|---|
| Naam | Ayesha Khan |
| Phone | 0300 1234567 |
| WhatsApp | 0300 1234567 |
| Event type | Shaadi / Bridal / Eid |
| Pasandeeda tareekh | 2026-12-15 |
| Pasandeeda waqt | Shaam 4 baje |
| Location | Qasimabad, Hyderabad |
| Category/Design | Bridal Mehndi |
| Kitne log | 5 |
| Message | Client ka paigham |
| Kab aaya | Khud bakhud |

### Har enquiry ke 4 status
- **New** — abhi aayi, dekhi nahi
- **Read** — aap ne parh li
- **Booked** — booking pakki ho gayi
- **Archived** — purani, hata dein

Status badalne se dashboard ka counter khud update hota hai.

### ⚠️ Ek bohat zaroori baat — Email notification nahi hai

**Form bharne par aap ko email ya SMS nahi aayega.** Aap ko khud dashboard
kholna hoga.

To **din mein ek baar Bookings panel zaroor dekhein.**

### Lekin fikr ki baat nahi — zyada clients WhatsApp karenge

Website par har jagah **WhatsApp buttons** lage hain, aur "Book This Design"
button client ka message pehle se bhar deta hai:

> *"Assalam-o-Alaikum Kiran, I found Colors with Kiran online. I am
> interested in the 'Royal Bridal Hands' design…"*

Ye messages **seedha aapke phone par** aate hain. Pakistan mein zyada tar
log form ke bajaye WhatsApp hi istemal karenge — aur wo bilkul theek hai.

To do raaste hain:
1. **WhatsApp** → aapke phone par (zyada tar yahi hoga)
2. **Form** → dashboard mein (jo log likh kar tafseel dena chahein)

### Spam se hifazat
Form mein ek chhupa hua khana hai jo insaan ko nazar nahi aata, lekin spam
robots usay bhar dete hain. Jo bhi usay bhare, uska message khud bakhud
raddi mein chala jata hai. Aap ko kuch nahi karna.

---

# 📌 Khulasa

| Sawal | Jawab |
|---|---|
| Apna data kaise daalun? | Dashboard → upar wale 9 qadam |
| Vercel? | ❌ **Nahi chalega** — Railway (~$5) ya VPS lein |
| Public vs Admin? | Do darwaze; `/admin` password se; password scrambled rehta hai |
| Designs hamesha rahengi? | ✅ Haan — agar hosting par **persistent disk** ho |
| Form ka data? | Dashboard → **Bookings**. Email alert nahi — roz check karein |

---

## Baqi documents
| File | Kis liye |
|---|---|
| **APKE-SAWAL.md** | Yehi file |
| **MASLAY-AUR-HAL.md** | Masail aur unke hal |
| **SETUP.md** | Install aur hosting |
| **KIRAN-GUIDE.md** | Dashboard rozana |
| **README.md** | Developer ke liye |
