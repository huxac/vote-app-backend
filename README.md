# Vote App Backend

Viral anonim oylama uygulaması için Node.js backend.

## Kurulum

```bash
npm install
```

## Environment Variables

`.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur:

```bash
cp .env.example .env
```

## Çalıştırma

```bash
# Development
npm run dev

# Production
npm start
```

## Scripts

- `npm run dev` - Nodemon ile development server
- `npm start` - Production server
- `npm run db:init` - Veritabanı tablolarını oluştur
- `npm run generate-question` - AI ile yeni soru üret
