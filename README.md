# Cut Optimizer - 2D Kesme Optimizasyonu

2D kesme optimizasyonu için geliştirilmiş web tabanlı bir uygulamadır. MaxRects heuristik algoritması kullanarak parçaların stok plaka üzerine en verimli şekilde yerleştirilmesini sağlar.

## Özellikler

### Temel Özellikler
- **MaxRects Algoritması**: Gelişmiş 2D paketleme algoritması
- **Otomatik Boyutlandırma**: Stok boyutunu otomatik olarak ayarlama
- **Bıçak Kalınlığı (Kerf) Desteği**: Kesim kalınlığını hesaba katma
- **Görselleştirme**: Canvas üzerinde interaktif kesim planı görüntüleme

### Gelişmiş Özellikler
- **Export/Import**: JSON formatında proje kaydetme/yükleme
- **PNG Export**: Kesim planını görsel olarak kaydetme
- **Canvas Zoom/Pan**: Panzoom.js ile yakınlaştırma ve kaydırma
- **Farklı Sıralama Stratejileri**: 
  - Alan (büyükten küçüğe)
  - Çevre (büyükten küçüğe)
  - En uzun kenar
  - En kısa kenar
  - Oran (genişlik/yükseklik)
- **Parça Numaralandırma**: Kesim sırası gösterimi
- **Parça Listesi Tablosu**: Yerleştirilen parçaların detaylı listesi
- **Detaylı İstatistikler**: 
  - Ortalama parça boyutu
  - Min/Max parça boyutları
  - Atık yüzdesi
  - Kullanılan alan yüzdesi
- **Gelişmiş Kontroller**:
  - Minimum boşluk ayarı (parçalar arası)
  - Çoklu stok desteği
  - Stok maliyeti hesaplama
- **Otomatik Kaydetme**: localStorage ile otomatik proje kaydetme/yükleme

## Kurulum

Herhangi bir kurulum gerektirmez. Sadece `index.html` dosyasını bir web tarayıcısında açın.

### Gereksinimler
- Modern web tarayıcısı (Chrome, Firefox, Edge, Safari)
- İnternet bağlantısı (CDN'ler için)

## Kullanım

### Temel Kullanım

1. **Stok Boyutlarını Girin**: Genişlik ve yükseklik değerlerini girin
2. **Parçaları Ekleyin**: Format: `Genişlik,Yükseklik; Adet`
   ```
   200,300; 5
   150,250; 3
   100,50; 8
   ```
3. **Bıçak Kalınlığını Ayarlayın**: Kesim kalınlığını girin (opsiyonel)
4. **Sıralama Stratejisini Seçin**: Dropdown menüden strateji seçin
5. **Optimizasyonu Başlatın**: "Optimizasyonu Başlat" butonuna tıklayın

### Gelişmiş Kullanım

#### Export/Import
- **Export JSON**: Mevcut projeyi JSON formatında kaydedin
- **Import JSON**: Daha önce kaydedilmiş projeyi yükleyin
- **Export PNG**: Kesim planını PNG görseli olarak kaydedin

#### Canvas Kontrolleri
- **Zoom**: Mouse tekerleği ile yakınlaştırma/uzaklaştırma
- **Pan**: Canvas'ı sürükleyerek kaydırma
- **Reset Zoom**: "Zoom Sıfırla" butonu ile başlangıç görünümüne dön

#### Otomatik Kaydetme
- Tüm değişiklikler otomatik olarak localStorage'a kaydedilir
- Sayfa yenilendiğinde otomatik olarak yüklenir
- Sekme kapatılmadan önce son durum kaydedilir

## Teknik Detaylar

### Algoritma
- **MaxRects Heuristic**: Serbest dikdörtgenleri takip eden gelişmiş paketleme algoritması
- Parçalar en uygun boşluğa yerleştirilir
- Otomatik döndürme desteği (yatay/dikey)

### Teknolojiler
- Vanilla JavaScript (ES6+)
- HTML5 Canvas
- Tailwind CSS (CDN)
- Panzoom.js (Canvas zoom/pan için)

### Dosya Yapısı
```
cut-optimizer/
├── index.html      # Ana HTML dosyası
├── main.js         # JavaScript mantığı
├── style.css       # Stil tanımlamaları
├── README.md       # Bu dosya
└── CHANGELOG.md    # Sürüm geçmişi
```

## Örnekler

### Örnek 1: Basit Kesim
```
Stok: 800x600
Parçalar:
200,300; 5
150,250; 3
```

### Örnek 2: Bıçak Kalınlığı ile
```
Stok: 1000x800
Bıçak Kalınlığı: 2
Parçalar:
100,200; 10
150,150; 8
```

## Sınırlamalar

- Şu anda tek stok plaka desteği (çoklu stok özelliği geliştirilme aşamasında)
- 2D dikdörtgen parçalar için optimize edilmiştir
- Dairesel veya karmaşık şekiller desteklenmez

## Katkıda Bulunma

Bu proje açık kaynaklıdır. Katkılarınızı bekliyoruz!

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Sürüm Geçmişi

Detaylı sürüm geçmişi için [CHANGELOG.md](CHANGELOG.md) dosyasına bakın.

## İletişim

Sorularınız veya önerileriniz için issue açabilirsiniz.

