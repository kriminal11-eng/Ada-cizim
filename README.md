# Ada'nın Çizim Defteri 🦄🎨

5 yaşındaki Ada için iPad'de parmakla kullanılan çizim ve boyama uygulaması.
İnternet olmadan çalışır. Reklam, abonelik ya da hesap yok.

## Neler var?

- **Harfler (ABC):** Türkçe alfabenin 29 büyük harfi. Yeşil numaralı noktadan başlayıp oku takip ederek çizilir; çizgi gökkuşağı, simli, neon gibi renklerle dolar. Her harfte sesli örnek kelime söylenir (A → Arı 🐝). Biten harflere ⭐ verilir.
- **Rakamlar (123):** 0–9. Her rakamda o kadar nesne gösterilir ve söylenir (3 → 🍓🍓🍓 "üç çilek").
- **Boyama:** 9 kategoride 58 sayfa: Hayvanlar, Meyveler, Sebzeler, Araçlar, Mutfak, Giysiler, Evim, Okul, Eğlence. Boya kovasıyla bir yere dokununca orası boyanır; üzerine kalemle ek çizim de yapılabilir.
- **Serbest Çizim:** Beyaz, gece mavisi (neon için harika), mavi, pembe, sarı ya da yeşil kâğıt.
- **Araçlar:** Kalem, Simli kalem, Neon, Sprey, Boya kovası, Damga (⭐ ❤️ 🦄 …), Silgi, 3 kalınlık, 16 renk + gökkuşağı rengi, Geri Al.
- **Resimlerim:** "⭐ Kaydet" ile resim iPad'e kaydedilir. Galeriden açılıp çizmeye devam edilebilir, isim verilebilir, **Gönder / Fotoğraflara Kaydet** ile WhatsApp'tan paylaşılabilir ya da Fotoğraflar'a kaydedilebilir. Yanlışlıkla silinmesin diye silmek için düğmeye 1,5 saniye basılı tutmak gerekir.
- **Sesli yönlendirme:** iPad'in Türkçe sesiyle konuşur. Ana sayfadaki 🔊 düğmesiyle kapatılabilir.

## iPad'e kurulum

1. Uygulamanın internet adresini iPad'de **Safari** ile açın (GitHub Pages ile yayınlama aşağıda).
2. Paylaş düğmesine (kare + yukarı ok) dokunup **"Ana Ekrana Ekle"** deyin.
3. Ana ekrandaki **Ada Çizim** simgesiyle açın. Bundan sonra internet olmadan da çalışır.

> Önemli: Uygulamayı her zaman ana ekrandaki simgeden açın. Resimler o simgenin içinde saklanır; Safari sekmesinde açılan sürümün kayıtları ayrıdır ve Safari bir süre kullanılmayan sitelerin verilerini silebilir.
> Çok sevdiğiniz resimleri ara sıra "Fotoğraflara Kaydet" ile yedeklemeniz iyi olur.

## GitHub Pages ile yayınlama

1. GitHub'da depo → **Settings → Pages**.
2. *Source:* "Deploy from a branch", *Branch:* uygulamanın bulunduğu dal, klasör `/ (root)` → **Save**.
3. Birkaç dakika sonra adres `https://<kullanıcı-adı>.github.io/Ada-cizim/` şeklinde görünür.

Not: Ücretsiz GitHub hesaplarında Pages yalnızca **herkese açık (public)** depolarda çalışır.

## Bilgisayarda denemek

```bash
python3 -m http.server 8000
# tarayıcıda http://localhost:8000 açın
```

## Geliştirici notları

- Hiçbir kütüphane yok: düz HTML + CSS + JavaScript modülleri.
- `js/pages.js`: boyama sayfaları (SVG). Yeni sayfa eklemek için bir çizim yazıp `PAGES` listesine ekleyin.
- `js/letters.js`: harf ve rakamların çizim yolları ve sırası.
- `js/drawing.js`: çizim tahtası, fırçalar, boya kovası, geri alma.
- `js/trace.js`: harf izleme.
- `js/gallery.js`: kayıtlar (IndexedDB).
- `sw.js`: çevrimdışı çalışma. Bir dosyayı değiştirince `VERSION` değerini artırın ki iPad yeni sürümü alsın.
