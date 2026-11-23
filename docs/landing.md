# ლენდინგი

ლენდინგი ცალკე აპია (`apps/landing`, `@grm/landing`, პორტი 3001) და `apps/web`-ზე არ არის დამოკიდებული. მათ ცალ-ცალკე აიგებ და დეპლოის უკეთებ. ლენდინგი API-დან იყენებს მხოლოდ `/api/public/*`-ს.

გვერდები: `/` (English, ნაგულისხმევი), `/ka`, `/ru`, `/tr`, `/de`. ტექსტები: `apps/landing/lib/content.ts`.

```bash
npm run dev:landing
npm run build -w @grm/landing
npm run start -w @grm/landing
```

## გარემოს ცვლადები

იკითხება **build-ის დროს**, ამიტომ ცვლილების შემდეგ ლენდინგი თავიდან უნდა აიგოს. ჩაწერე `apps/landing/.env.local`-ში (ნიმუში: `.env.example`):

| ცვლადი | მნიშვნელობა |
|---|---|
| `API_URL` | NestJS API, მაგ. `http://127.0.0.1:4104` |
| `NEXT_PUBLIC_APP_URL` | ვებ-პანელის მისამართი ღილაკისთვის „Sign in“. ცარიელზე ღილაკი არ ჩანს |
| `NEXT_PUBLIC_SITE_URL` | საჯარო დომენი, მაგ. `https://example.com`. სანამ ცარიელია, საიტი `noindex`-ია |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 ID (`G-...`) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console-ის HTML tag-ის `content` მნიშვნელობა |

## Google სერვისების ჩართვა

1. **Search Console:** დაამატე დომენი, აირჩიე HTML tag, მნიშვნელობა ჩაწერე ცვლადში და გააკეთე deploy. შემდეგ დაადასტურე და გაგზავნე `https://<დომენი>/sitemap.xml`.
2. **Analytics:** შექმენი GA4 property და Web stream, `G-...` ჩაწერე ცვლადში. სკრიპტი იტვირთება მხოლოდ მას შემდეგ, რაც ვიზიტორი ქუქიებს დაუშვებს.
3. **მოვლენები GA4-ში:** `booking_request` და `contact_click`. სახელი და ტელეფონი Google-ში არ იგზავნება. Key event-ად მონიშნე ორივე.

SEO უკვე აწყობილია: სათაურები და აღწერები 5 ენაზე, canonical, hreflang, sitemap, robots, Open Graph და JSON-LD (`Organization`, `SoftwareApplication`, `FAQPage`).

## ონლაინ ჯავშანი

1. მოთამაშე ლენდინგზე ირჩევს დღეს, დროს და ადგილებს, წერს სახელსა და ტელეფონს.
2. იქმნება `PENDING` ჯავშანი, რომელიც დროს მაშინვე იკავებს.
3. ადმინი ხედავს მენიუს badge-ს, ზოლს „ონლაინ მოთხოვნები“ და ქარვისფერ ჯავშანს კალენდარში.
4. ადმინი ურეკავს და ადასტურებს ან უარყოფს. უარყოფა დროს ათავისუფლებს.

დაცვა: honeypot, 5 მოთხოვნა წუთში, ერთ ტელეფონზე 3 და დღეში 20 დაუდასტურებელი, მაქს. 6 საათი, 60 დღით ადრე.

## სურათები და ვიდეოები

`apps/landing/public/media/`. ყველა გადაღებულია ცალკე დემო ბაზაზე გამოგონილი მონაცემებით. რეალური მომხმარებლების მონაცემებით ნუ გადაიღებ.
