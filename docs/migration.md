# ძველ სოფტიდან (SENET / Enestech) იუზერების იმპორტ

ძველ პანელ: `https://club-mirage.admin.enes.tech/users/list` (Angular admin).
ჩვენ აპ: `https://digitalfix.cloud/mirage-manage`.

## 1. მონაცემების აღებ

ძველ პანელშ Users სიაზ (ყველა სვეტ ჩართულ, სია ბოლომდ ჩაქრილ — grid ვირტუალიზებულ არ არის ექსპორტისას):
DevTools → Elements → `<cdk-table>` → Copy → Copy outerHTML → შეინახე `export.html`-ად repo-ს ფესვშ.

საჭირო სვეტებ: Username, Email, Main balance (GEL), Registration date, Name, Last name, Phone, Type, Status.

## 2. გაშვებ

```bash
npm run db:import-legacy -w @grm/api -- ../../export.html --dry-run   # ჯერ სინჯ (არაფერ იწერებ)
npm run db:import-legacy -w @grm/api -- ../../export.html            # ნამდვილ იმპორტ
```

ფლაგებ:

| ფლაგი | მნიშვნელობ |
|---|---|
| `--gel-per-hour=10` | ფულ → დროის კურს (default **10 ლარ = 1 საათ**) |
| `--dry-run` | მხოლოდ ანალიზ + რეპორტ |
| `--update` | უკვე შემოტანილ იუზერებ name/email/phone-ს განაახლებ (**ბალანსს არასდროს ეხებ**) |

## 3. წესებ (რაც სკრიპტ აკეთებ)

- **ბალანს**: `GEL / gelPerHour * 3600` წამ; იქმნებ `TOPUP` ტრანზაქცი note-ით `Legacy import (SENET #<id>): <GEL> GEL @ <rate> GEL/h`.
- **პაროლ**: ძველ სისტემიდან hash არ მოდის → პაროლ = **username**. კლიენტებს უნდ ეთქვათ პაროლის შეცვლ.
- **login**: შემოტანილ იუზერ შედის username-ით (case-insensitive), email-ით ან ტელეფონით.
- **რეგისტრაციის თარიღ**: ძველ `create_date` ჯდებ `users.created_at`-ში (UTC 12:00, რომ დღ არ აცდეს).
- **Staff რიგებ** (ძველი პანელის ადმინებ) გამოტოვებულია — ჩვენთან ადმინ ცალკ ცხრილშ.
- **ერთ email-ზ ორ ანგარიშ**: ძველ პანელშ დაშვებულ, ჩვენთან არა → ნორმალურ username-იან ანგარიშ იტოვებ სუფთა email-ს, მეორეს ემატებ `+legacy<id>` ტეგ (`user+legacy157@gmail.com` იმავე ინბოქსშ მიდის).
- **ტელეფონ**: `+995`-მდ/ცარიელ → `null`; გამეორებულ ნომერ მხოლოდ პირველ ანგარიშს რჩებ.
- **იდემპოტენტურ**: უკვე არსებულ username/email გამოტოვებულ (ან `--update`-ით განახლებულ) — ხელახლ გაშვებ უსაფრთხო.

## 4. პროდაქშენზ

```bash
ssh digitalfix@92.205.184.159
cd /var/www/digitalfix/projects/mirage-manage
deploy/digitalfix/update.sh                                   # git pull + migrate + build + pm2 reload
cd apps/api && npm run db:import-legacy -- ../../export.html --dry-run
cd apps/api && npm run db:import-legacy -- ../../export.html
```

> DB backup იმპორტამდ: `pg_dump -Fc mirage_manage > ~/mirage_manage_$(date +%F).dump`
