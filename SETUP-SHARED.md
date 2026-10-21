# Skupno shranjevanje – nastavitev (Cloudflare D1 + R2)

Ko so te nastavitve narejene, vsi prijatelji vidijo iste risbe, glasove in lestvico.

## 1. Ustvari D1 bazo

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **D1** → **Create database**
2. Ime: `dnevna-risba`
3. Kopiraj **Database ID**

### Ustvari tabele

V D1 → tvoja baza → **Console** (ali lokalno z Wrangler) zaženi vsebino datoteke `schema.sql`.

Ali z Wranglerjem:

```bash
npx wrangler d1 execute dnevna-risba --remote --file=./schema.sql
```

## 2. Ustvari R2 bucket

1. Dashboard → **R2** → **Create bucket**
2. Ime: `dnevna-risba-images`
3. (Opcijsko) javni dostop ni potreben – slike serviramo prek `/api/image`

## 3. Poveži bazo in bucket s Pages projektom

1. **Workers & Pages** → tvoj projekt (`dnevna-risba` ali podobno)
2. **Settings** → **Functions** → **Bindings**

Dodaj:

| Type        | Variable name | Value                    |
|-------------|---------------|--------------------------|
| D1 database | `DB`          | baza `dnevna-risba`      |
| R2 bucket   | `IMAGES`      | bucket `dnevna-risba-images` |

3. **Save**

## 4. Potisni kodo in deploy

```bash
git add .
git commit -m "Skupno shranjevanje D1 + R2"
git push
```

Cloudflare samodejno zgradi stran. Če Functions ne delujejo, preveri Bindings.

## 5. Preveri

Odpri svojo `*.pages.dev` stran:

- Na strani **Riši** ne sme pisati »Lokalni način«
- Oddaj risbo z enega telefona, na drugem preveri **Galerija**

## Opombe

- Brez bindings aplikacija še vedno deluje v **lokalnem načinu** (localStorage) – samo za eno napravo.
- Free limiti (D1 + R2) zadoščajo za skupino prijateljev.
