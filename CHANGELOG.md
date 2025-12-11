# Changelog

Tüm önemli değişiklikler bu dosyada belgelenecektir.

Format [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) standardına uygundur ve bu proje [Semantic Versioning](https://semver.org/lang/tr/) kullanır.

## [1.0.0] - 2024-12-XX

### Eklenenler
- MaxRects heuristik algoritması ile 2D kesme optimizasyonu
- Otomatik stok boyutlandırma (büyütme/küçültme)
- Bıçak kalınlığı (kerf) desteği
- Canvas görselleştirme
- Export/Import özellikleri (JSON + PNG)
- Canvas zoom/pan desteği (panzoom.js)
- Farklı sıralama stratejileri:
  - Alan bazlı sıralama
  - Çevre bazlı sıralama
  - En uzun kenar bazlı sıralama
  - En kısa kenar bazlı sıralama
  - Oran bazlı sıralama
- Parça numaralandırma ve kesim sırası gösterimi
- Parça listesi tablosu (detaylı bilgiler)
- Detaylı istatistikler paneli:
  - Ortalama parça boyutu
  - Min/Max parça boyutları
  - Atık yüzdesi
  - Kullanılan alan yüzdesi
- Gelişmiş kontroller:
  - Minimum boşluk ayarı (parçalar arası)
  - Çoklu stok desteği (checkbox)
  - Stok maliyeti hesaplama
- Otomatik localStorage kaydetme/yükleme
- Debounce ile performans optimizasyonu
- Sayfa kapanmadan önce otomatik kaydetme
- Responsive tasarım

### Değiştirilenler
- İlk sürüm

### Düzeltilenler
- İlk sürüm

### Kaldırılanlar
- İlk sürüm

## [Unreleased]

### Planlanan Özellikler
- Çoklu stok plaka optimizasyonu (tam implementasyon)
- Farklı algoritma seçenekleri (Bottom-Left Fill, vb.)
- Parça öncelik seviyeleri
- CNC makine formatı export (G-code)
- 3D önizleme
- Parça kütüphanesi
- Şablon kaydetme
- Karşılaştırma modu (farklı algoritmalar)
- Geçmiş optimizasyon kayıtları

---

[1.0.0]: https://github.com/yourusername/cut-optimizer/releases/tag/v1.0.0

