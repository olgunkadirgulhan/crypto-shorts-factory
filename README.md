# Crypto Shorts Factory

Günde 3 adet İngilizce kripto analiz Short'u üretip YouTube'a otomatik yükler.
**Her video 3 farklı coin'i art arda işler**, sonunda "takip et / beğen" çağrısıyla kapanır.
**Tamamı GitHub Actions üzerinde çalışır — bilgisayarın kapalı olabilir.**

```
CoinGecko (fiyat + trend)
   -> market.mjs        her video için 3 farklı coin seçer (slot'a göre strateji)
   -> indicators.mjs   RSI / 4s high-low / ATR / SMA20   (Python değil, JS; LLM değil)
   -> script.mjs       Claude: 3 coin için 2'şer cümle + kapanış CTA'sı, sayı üretmez
   -> tts.mjs          edge-tts + ffmpeg: seslendirme + satır zamanlamaları
   -> Remotion         1080x1920 video, 3 coin paneli art arda + "FOLLOW/LIKE" outro
   -> youtube.mjs      trend hashtag keşfi + upload
   -> state/ + archive/ commit (arşiv, tekrar engelleme)
```

**Ayrıca haftada 2 kez (Pazar + Çarşamba, ABD Doğu saatiyle 17:00) `.github/workflows/weekly.yml`
ayrı bir "Haftalık Piyasa Özeti" üretir** — yatay (1920x1080), 3-5 dakika, BTC/ETH + haftanın en
çok hareket eden 6 coin, genel piyasa görünümü ile açılıp aynı "FOLLOW/LIKE" kapanışıyla biter.
Kendi script şeması (`pipeline/weeklyScript.mjs`), kendi composition'ı (`ChannelWeekly.tsx`) ve
kendi geçmiş dosyası (`state/weekly-history.json`) var — günlük Shorts hattından bağımsız çalışır.
Elle test: `npm run weekly:dry`.

---

## ÖNCE BUNU YAP

Anthropic API anahtarını sohbette düz metin olarak paylaştın. O anahtar **yanmış** sayılır
(test ettiğimde zaten `401 invalid` dönüyordu).

1. console.anthropic.com → API Keys → eski anahtarı **sil**
2. Yeni anahtar oluştur
3. Yeni anahtarı **sadece** GitHub Secret olarak gir — hiçbir dosyaya yazma

---

## Günlük program (UTC)

| Saat | Slot | İçerik | 3 coin nasıl seçiliyor |
|---|---|---|---|
| 09:00 | `open` | Market Brief | BTC + ETH + günün en çok hareket eden 3.'sü |
| 14:00 | `mover` | Movers of the Day | Top 100 içinde 24s en çok hareket eden 3 coin (hacim > $50M) |
| 19:00 | `trending` | Trending Now | CoinGecko trend listesinden 3 coin (BTC/ETH hariç) |

Her video 3 coin'i sırayla işler — hook ekranında hepsi bir "watchlist" olarak önizlenir,
sonra her biri kendi grafiği + göstergeleriyle ekrana gelir. Son 2 videonun coin'leri
`state/history.json`'da tutulup dışlanır, böylece aynı coin art arda tekrar etmez —
YouTube tekrarlayan içeriği cezalandırdığı için bu önemli.

---

## Kurulum (tek seferlik, ~30 dk)

### 1. Repoyu oluştur

```powershell
git init
git add .
git commit -m "initial"
gh repo create crypto-shorts --private --source=. --push
```

`package-lock.json` dosyasını mutlaka commit'le — CI kurulumu onunla hızlanıyor.

### 2. YouTube API erişimi

1. console.cloud.google.com → yeni proje
2. **YouTube Data API v3**'ü etkinleştir
3. OAuth consent screen → External → kendi Google hesabını **Test user** olarak ekle
4. Credentials → Create Credentials → **OAuth client ID** → tip: **Desktop app**
5. Client ID ve Client Secret'ı kopyala

### 3. Refresh token üret (lokalde, bir kez)

```powershell
$env:YOUTUBE_CLIENT_ID="..."
$env:YOUTUBE_CLIENT_SECRET="..."
npm run youtube:auth
```

Açılan linkte kanalın hesabını seç ve onayla. Terminale basılan token'ı kopyala.
Bu token süresiz — sen iptal etmedikçe yenilenmeye devam eder.

### 4. GitHub Secrets

Repo → Settings → Secrets and variables → Actions → **Secrets**:

| Secret | Zorunlu |
|---|---|
| `ANTHROPIC_API_KEY` | evet (yeni anahtar) |
| `YOUTUBE_CLIENT_ID` | evet |
| `YOUTUBE_CLIENT_SECRET` | evet |
| `YOUTUBE_REFRESH_TOKEN` | evet |
| `COINGECKO_API_KEY` | **şiddetle önerilir** — ücretsiz demo key, rate limit'i 30/dk'ya çıkarır |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | opsiyonel, hata bildirimi için |

Aynı sayfada **Variables** sekmesi (secret değil):

| Variable | Varsayılan | Not |
|---|---|---|
| `YOUTUBE_PRIVACY` | `unlisted` | İlk hafta `unlisted` bırak, çıktıyı izle, sonra `public` yap |
| `CLAUDE_MODEL` | `claude-opus-5` | Ucuzlatmak istersen `claude-haiku-4-5` |
| `YOUTUBE_CATEGORY_ID` | `28` | 28 = Science & Tech, 25 = News |
| `TTS_VOICE` | `en-US-AndrewMultilingualNeural` | `en-US-AvaMultilingualNeural` kadın ses |

### 5. Test et

Repo → Actions → **Produce crypto short** → Run workflow → `dry_run: true`.
Video render edilir ama yüklenmez; sonucu Actions artifact'ından indirip izleyebilirsin.

Sorun yoksa `dry_run` olmadan bir kez çalıştır, YouTube'da kontrol et, sonra cron'a bırak.

---

## Maliyet

Claude çağrısı video başına ~1.200 girdi / ~900 çıktı token. Ayda 90 video:

| Model | Aylık | Kalite |
|---|---|---|
| `claude-opus-5` (varsayılan) | **~$2.60** | en iyi metin |
| `claude-haiku-4-5` | **~$0.51** | yeterli, biraz daha düz |

Token endişene gerek yok — günde 3 video bu ölçekte çok küçük. Asıl sınır bu değil:

- **GitHub Actions**: private repo'da ayda 2.000 dk ücretsiz. Çalışma başına ~12 dk × 90 = **~1.080 dk**. Sığıyor ama payı geniş değil. Repoyu public yaparsan sınırsız.
- **YouTube kotası**: günlük 10.000 birim. Upload 1.600 + hashtag araması ~101 = çalışma başına ~1.700. 3 video = **~5.100**. Rahat.
- CoinGecko, edge-tts: $0.

Prompt caching bilerek kapalı: günde 3 çağrıda 5 dakikalık cache hiç tutmaz, cache yazımı 1.25x
maliyetli olduğu için faturayı düşürmez, yükseltir.

---

## Yerelde çalıştırma

```powershell
npm install
pip install -r requirements.txt
npm run studio            # tasarımı canlı düzenle
npm run produce:dry       # tam üretim, yükleme yok
```

ffmpeg ve ffprobe PATH'te olmalı (sende zaten var).

---

## Bilmen gereken riskler

**Bunlar gerçek, görmezden gelme.**

1. **edge-tts resmi değil.** Microsoft'un iç ucunu kullanır. Microsoft el attığında eski sürümler
   `403` dönmeye başlar — kurarken bunu bizzat yaşadık. `requirements.txt` bu yüzden pinlenmedi
   (`>=7.2.8`), CI her çalışmada güncelini çeker. Yine de bir gün kırılırsa TTS adımı patlar;
   Telegram bildirimi kurarsan haberin olur. Kalıcı çözüm gerekirse Piper TTS (tam offline) veya
   ElevenLabs (ücretli) devreye alınır.

2. **YouTube tekrarlayan içerik politikası.** Günde 3 otomatik video, YPP için en riskli nokta.
   Bunun için: üç slot üç farklı format ve farklı coin, metin her seferinde yeniden yazılıyor,
   son 5 başlık modele "bunları tekrarlama" diye veriliyor. Yine de ilk ayı `unlisted` izlemeni öneririm.

3. **Yatırım tavsiyesi değil.** Sistem prompt'u "al/sat/hedef fiyat" dilini yasaklıyor, seviyeleri
   "son 4 saatin en yükseği" diye adlandırıyor ("kritik direnç" demiyor), her videoda ekranda ve
   açıklamada uyarı var. Bu dili gevşetme — finans içeriğinde kanalın en kırılgan tarafı burası.

4. **Müzik yok.** `public/music.mp3` koyarsan otomatik -22dB'de miksler. Koymazsan sadece ses olur.
   Telifli müzik koyma — kanal Content ID yer.

5. **Sayıları model üretmiyor.** Tüm rakamlar `indicators.mjs` içinde hesaplanıp modele hazır
   veriliyor; grafik de doğrudan ham veriden çiziliyor. Modelin uydurma fiyat yazma yolu yok.

---

## Ayar noktaları

| Ne | Nerede |
|---|---|
| Anlatım kuralları, yasak kelimeler | `pipeline/script.mjs` → `SYSTEM` |
| Coin seçim mantığı, hacim eşiği | `pipeline/market.mjs` → `pickSubject` |
| RSI / seviye / trend hesabı | `pipeline/indicators.mjs` |
| Renkler, tipografi | `src/theme.ts` |
| Sahne süreleri (hook / outro) | `src/compositions/CryptoShort.tsx` |
| Yayın saatleri | `.github/workflows/produce.yml` → `cron` |

Renk paleti `dataviz` doğrulayıcısından geçirildi: koyu zeminde parlaklık bandı, kontrast ve
renk körlüğü ayrımı testlerini geçiyor. Yeşil/kırmızı ikilisi renk körlüğü için sınırda olduğundan
yön her yerde ▲/▼ ve işaretli sayıyla de veriliyor — renk tek başına bilgi taşımıyor.

---

## Sorun giderme

| Belirti | Sebep |
|---|---|
| `401 invalid x-api-key` | `ANTHROPIC_API_KEY` yanlış/iptal |
| `HTTP 429` uzun sürüyor | CoinGecko rate limit — `COINGECKO_API_KEY` ekle |
| `edge-tts exited 1` + `403` | Microsoft ucu değişti, `pip install -U edge-tts` |
| Upload `quotaExceeded` | Günlük 10.000 birim doldu, ertesi gün sıfırlanır |
| Cron çalışmıyor | GitHub 60 gün hareketsiz repoda cron'u kapatır — her çalışma `state/` commit'lediği için normalde olmaz |
