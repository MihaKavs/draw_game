# Dnevna risba (Daily Draw)

React aplikacija, kjer prijatelji rišejo dnevno besedo/objekt, naslednji dan glasujejo in zbirajo točke približno 20 dni.

## Funkcije

- **Riši** – Najprej vidiš besedo, nato klikneš »Začni risati«. Imaš **3 minute**, nato se risba samodejno odda. Večja tabla za telefone, lastna barva + prednastavljene barve, števec časa.
- **Glasuj** – Glasuj o včerajšnjih risbah (izberi top 3).
- **Galerija** – Vse risbe, filtriranje po besedi.
- **Lestvica** – 1. mesto = 5 točk, 2. = 4, 3. = 3, 4. = 2, 5. = 1.

Trenutno je vse shranjeno v `localStorage` brskalnika (dobro za preizkus).

## Zagon

```bash
cd draw-game
npm install
npm run dev
```

Odpri http://localhost:5173

## Namestitev na Cloudflare Pages (brezplačno)

1. Potisni mapo na GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages.
3. Poveži repo.
4. Build: `npm run build`, output: `dist`.
5. Deploy → dobiš `*.pages.dev` povezavo.
