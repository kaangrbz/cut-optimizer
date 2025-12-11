// =================================================================================
        // JAVASCRIPT: MAXRECTS HEURISTIC VE MODAL MANTIK
        // =================================================================================

        const canvas = document.getElementById('cuttingCanvas');
        const ctx = canvas.getContext('2d');
        
        // Modal Elementleri (Upsize)
        const resizeModal = document.getElementById('resizeModal');
        const requiredAreaText = document.getElementById('requiredAreaText');
        const confirmResizeBtn = document.getElementById('confirmResize');
        const cancelResizeBtn = document.getElementById('cancelResize');

        // Modal Elementleri (Downsize)
        const downsizeModal = document.getElementById('downsizeModal');
        const usedAreaText = document.getElementById('usedAreaText');
        const confirmDownsizeBtn = document.getElementById('confirmDownsize');
        const cancelDownsizeBtn = document.getElementById('cancelDownsize');

        const optimizationMessage = document.getElementById('optimizationMessage');
        const unplacedPartsCountElement = document.getElementById('unplacedPartsCount');
        
        let stockWidth, stockHeight;
        let placedParts = [];
        let freeRects = []; // Serbest Dikdörtgenler listesi: Yerleştirme için uygun boşlukları tutar.
        let bladeThickness = 0; // Bıçak Kalınlığı (Kerf)
        
        // Geçici Değişkenler (Modal işlemleri için global olarak tutulması gereken değerler)
        let tempMaxX = 0; 
        let tempMaxY = 0; 
        let tempOriginalW = 0; 
        let tempOriginalH = 0; 
        const DOWNSIZE_THRESHOLD_PERCENT = 0.05; // %5'ten fazla boşluk varsa daraltma öner

        // ======================== MODAL VE GİRİŞ İŞLEME =========================

        /**
         * Parçaları ayrıştırır.
         */
        function parseParts(partsInput) {
            return partsInput.split('\n')
                .map(line => {
                    const parts = line.split(';');
                    const dims = parts[0].split(',');
                    return {
                        w: parseInt(dims[0].trim()),
                        h: parseInt(dims[1].trim()),
                        count: parseInt(parts[1].trim())
                    };
                })
                .filter(p => !isNaN(p.w) && !isNaN(p.h) && p.count > 0);
        }

        /**
         * Parçaları hazırlar ve alanlarına göre sıralar.
         */
        function prepareParts(parsedParts) {
            let parts = [];
            for (const p of parsedParts) {
                for (let i = 0; i < p.count; i++) {
                    parts.push({ 
                        id: `${p.w}x${p.h}-${i+1}`, 
                        w: p.w + bladeThickness, 
                        h: p.h + bladeThickness, 
                        originalW: p.w,
                        originalH: p.h
                    });
                }
            }
            // Alanlarına göre büyükten küçüğe sıralama
            parts.sort((a, b) => (b.w * b.h) - (a.w * a.h));
            return parts;
        }

        /**
         * Stok büyütme modalını gösterir.
         */
        function showResizeModal(requiredExtraArea) {
            requiredAreaText.textContent = `En az ${requiredExtraArea.toFixed(0)}`;
            resizeModal.classList.remove('hidden');
        }

        /**
         * Stok daraltma modalını gösterir.
         */
        function showDownsizeModal(finalW, finalH) {
            usedAreaText.textContent = `${finalW} x ${finalH}`;
            downsizeModal.classList.remove('hidden');
        }

        /**
         * Stok büyütme cevaplarını işler ve optimizasyonu devam ettirir.
         * @param {boolean} resizeConfirmed - Kullanıcı büyütmeyi onayladı mı?
         */
        function handleResize() {
            resizeConfirmed = true;
            resizeModal.classList.add('hidden');
            
            const currentStockW = parseFloat(document.getElementById('stockW').value);
            const currentStockH = parseFloat(document.getElementById('stockH').value);
            const partsInput = document.getElementById('partsInput').value;
            bladeThickness = parseFloat(document.getElementById('bladeThickness').value) || 0;
            
            const parsedParts = parseParts(partsInput);
            const partsToPlace = prepareParts(parsedParts);
            const totalRequiredParts = partsToPlace.length;
            const allPartsTotalArea = partsToPlace.reduce((sum, p) => sum + (p.originalW * p.originalH), 0);
            const stockArea = currentStockW * currentStockH;

            if (resizeConfirmed || true) {
                const requiredAreaWithBuffer = allPartsTotalArea * 1.10; 
                const scaleFactor = Math.sqrt(requiredAreaWithBuffer / stockArea);
                
                let newStockW = currentStockW;
                let newStockH = currentStockH;

                // En büyük boyutu orantılı olarak artır (kabaca en boy oranını korumak için)
                if (currentStockW >= currentStockH) {
                    newStockW = Math.ceil(currentStockW * scaleFactor);
                } else {
                    newStockH = Math.ceil(currentStockH * scaleFactor);
                }

                // UI'daki stok boyutlarını güncelle
                document.getElementById('stockW').value = newStockW.toFixed(0);
                document.getElementById('stockH').value = newStockH.toFixed(0);
                
                // Global değişkenleri ve canvas boyutlarını güncelle
                stockWidth = newStockW;
                stockHeight = newStockH;
                canvas.width = newStockW;
                canvas.height = newStockH;
                
                optimizationMessage.textContent = `Stok boyutu ${currentStockW}x${currentStockH}'dan ${newStockW.toFixed(0)}x${newStockH.toFixed(0)}'a büyütüldü.`;
                optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800');
                optimizationMessage.classList.add('bg-yellow-100', 'text-yellow-800');

                // Büyütülmüş boyutlarla paketlemeyi başlat
                runPacking(partsToPlace, totalRequiredParts, allPartsTotalArea, stockWidth * stockHeight);

            } else {
                // Büyütmeyi reddetti, mevcut yetersiz boyutlarla paketlemeye devam et
                optimizationMessage.textContent = `UYARI: Alan yetersiz olmasına rağmen mevcut stok (${currentStockW}x${currentStockH}) ile devam ediliyor.`;
                optimizationMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800');
                optimizationMessage.classList.add('bg-red-100', 'text-red-800');
                
                stockWidth = currentStockW;
                stockHeight = currentStockH;
                runPacking(partsToPlace, totalRequiredParts, allPartsTotalArea, stockArea);
            }
        }

        /**
         * Stok daraltma cevaplarını işler ve sonuçları günceller.
         * @param {boolean} downsizeConfirmed - Kullanıcı daraltmayı onayladı mı?
         */
        function handleDownsize(downsizeConfirmed) {
            downsizeModal.classList.add('hidden');
            
            const finalW = Math.ceil(tempMaxX);
            const finalH = Math.ceil(tempMaxY);
            
            const originalW = tempOriginalW;
            const originalH = tempOriginalH;

            if (downsizeConfirmed) {
                // UI'daki stok boyutlarını güncelle
                document.getElementById('stockW').value = finalW;
                document.getElementById('stockH').value = finalH;
                
                // Global değişkenleri ve canvas boyutlarını güncelle
                stockWidth = finalW;
                stockHeight = finalH;
                canvas.width = finalW;
                canvas.height = finalH;
                
                // Kullanıcıya bilgi ver
                optimizationMessage.textContent = `Stok boyutu ${originalW}x${originalH}'dan ${finalW}x${finalH}'a başarıyla daraltıldı. Atık alanı azaldı.`;
                optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800', 'bg-yellow-100', 'text-yellow-800');
                optimizationMessage.classList.add('bg-blue-100', 'text-blue-800');
                
                // Sonuçları yeniden hesapla ve çiz
                recalculateResults(finalW, finalH);

            } else {
                // Daraltmayı reddetti, mevcut boyutla devam et
                optimizationMessage.textContent = `Başarılı yerleşim. Mevcut stok (${originalW}x${originalH}) ile devam ediliyor.`;
                optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-yellow-100', 'text-yellow-800');
                optimizationMessage.classList.add('bg-green-100', 'text-green-800');
                recalculateResults(originalW, originalH);
            }
            drawCuttingPlan();
        }

        /**
         * Sonuç metinlerini hesaplar ve günceller.
         */
        function recalculateResults(currentW, currentH) {
            const currentStockArea = currentW * currentH;
            
            // placedParts'taki parçaların kerf dahil yerleştirme alanı
            const placedAreaWithKerf = placedParts.reduce((sum, p) => sum + (p.w * p.h), 0);
            
            // Yerleştirilen parçaların net alanı (kerf hariç, verimlilik için kullanılır)
            const totalOriginalArea = placedParts.reduce((sum, p) => sum + (p.originalW * p.originalH), 0);

            const wasteArea = currentStockArea - placedAreaWithKerf;
            const efficiency = ((totalOriginalArea / currentStockArea) * 100).toFixed(2);
            
            document.getElementById('totalArea').textContent = `Toplam Parça Alanı (Net): ${totalOriginalArea.toFixed(0)} birim²`;
            document.getElementById('stockArea').textContent = `Stok Alanı: ${currentStockArea.toFixed(0)} birim²`;
            document.getElementById('waste').textContent = `Atık Alan: ${wasteArea.toFixed(0)} birim²`;
            document.getElementById('efficiency').textContent = `Verimlilik: ${efficiency}%`;
        }

        // ======================== OPTİMİZASYON MANTIĞI (MaxRects) =========================

        /**
         * Parçayı yerleştirmek için en uygun serbest alanı seçer.
         */
        function findBestFit(partW, partH) {
            let bestRect = null;
            let bestScore = Infinity; 

            for (let i = 0; i < freeRects.length; i++) {
                const rect = freeRects[i];

                const orientations = [
                    { w: partW, h: partH },
                    { w: partH, h: partW } 
                ];

                for (const { w: fitW, h: fitH } of orientations) {
                    if (fitW <= rect.w && fitH <= rect.h) {
                        const wastedArea = rect.w * rect.h - fitW * fitH;
                        
                        if (wastedArea < bestScore) {
                            bestScore = wastedArea;
                            bestRect = { rect, fitW, fitH, index: i };
                        }
                    }
                }
            }
            return bestRect;
        }

        /**
         * Yerleştirme sonrası serbest alanları günceller (Split function).
         */
        function splitFreeRect(freeRect, newRect) {
            const index = freeRects.indexOf(freeRect);
            if (index > -1) {
                freeRects.splice(index, 1);
            }

            const r = freeRect;
            const n = newRect;

            // Dikey ayırma (Sağda kalan boşluk)
            if (r.w > n.w) {
                freeRects.push({
                    x: n.x + n.w,
                    y: r.y,
                    w: r.w - n.w,
                    h: n.h
                });
            }

            // Yatay ayırma (Üstte kalan boşluk)
            if (r.h > n.h) {
                freeRects.push({
                    x: r.x,
                    y: n.y + n.h,
                    w: r.w,
                    h: r.h - n.h
                });
            }
        }
        
        /**
         * Asıl paketleme (MaxRects) mantığını çalıştırır.
         */
        function runPacking(partsToPlace, totalRequiredParts, allPartsTotalArea, initialStockArea) {
            placedParts = [];
            freeRects = [{ x: 0, y: 0, w: stockWidth, h: stockHeight }];

            let partsPlacedCount = 0;
            
            for (const part of partsToPlace) {
                const bestFit = findBestFit(part.w, part.h);
                
                if (bestFit) {
                    const rect = bestFit.rect;
                    
                    const newRect = {
                        x: rect.x,
                        y: rect.y,
                        w: bestFit.fitW,
                        h: bestFit.fitH
                    };
                    
                    placedParts.push({ ...part, ...newRect });
                    partsPlacedCount++;

                    splitFreeRect(bestFit.rect, newRect);

                }
            }

            const unplacedCount = totalRequiredParts - partsPlacedCount;
            const currentStockArea = stockWidth * stockHeight; 

            // 1. Durum: Yerleştirilemeyen Parça Varsa
            if (unplacedCount > 0) {
                unplacedPartsCountElement.textContent = `Yerleştirilemeyen Parça Sayısı: ${unplacedCount} (${totalRequiredParts} parçadan).`;
                unplacedPartsCountElement.classList.remove('hidden');
                
                if (allPartsTotalArea <= currentStockArea) {
                    optimizationMessage.textContent = `KESİM HATASI: Alan yetse de, yerleşim stratejisi nedeniyle ${unplacedCount} adet parça yerleştirilemedi.`;
                    optimizationMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-yellow-100', 'text-yellow-800');
                    optimizationMessage.classList.add('bg-red-100', 'text-red-800');
                }
                
                // Sonuçları göster ve çiz
                recalculateResults(stockWidth, stockHeight);
                drawCuttingPlan();
                return;
            }

            // 2. Durum: Tüm Parçalar Yerleştirildi
            if (unplacedCount === 0) {
                // Başarı mesajını göster (daraltma yapılmıyor)
                optimizationMessage.textContent = `Tebrikler! Tüm ${totalRequiredParts} parça başarıyla yerleştirildi.`;
                optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-yellow-100', 'text-yellow-800');
                optimizationMessage.classList.add('bg-green-100', 'text-green-800');
                
                // Sığdır butonunu aktif et
                const fitButton = document.getElementById('fitButton');
                if (fitButton) {
                    fitButton.disabled = false;
                }
            } else {
                // Yerleştirilemeyen parça varsa Sığdır butonunu pasif et
                const fitButton = document.getElementById('fitButton');
                if (fitButton) {
                    fitButton.disabled = true;
                }
            }
            
            // Sonuçları Hesapla
            recalculateResults(stockWidth, stockHeight);
            drawCuttingPlan();
        }


        // ======================== CANVAS ÇİZİMİ ==================================

        function drawCuttingPlan() {
            const container = canvas.parentElement;
            const containerW = container.clientWidth;
            const scale = containerW / stockWidth;
            
            canvas.width = containerW;
            canvas.height = stockHeight * scale;

            // 1. Stok Plakayı Çiz
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f9fafb'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, stockWidth * scale, stockHeight * scale);
            
            // 2. Yerleştirilmiş Parçaları Çiz
            placedParts.forEach(part => {
                const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
                
                ctx.fillStyle = color;
                ctx.fillRect(part.x * scale, part.y * scale, part.w * scale, part.h * scale);
                
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(part.x * scale, part.y * scale, part.w * scale, part.h * scale);
                
                ctx.fillStyle = '#333';
                ctx.font = `${Math.max(10, part.originalH * scale * 0.15)}px Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const text = `${part.originalW}x${part.originalH}`;
                ctx.fillText(text, (part.x + part.w / 2) * scale, (part.y + part.h / 2) * scale);
            });
        }

        // ======================== Sığdır (Manuel Küçültme) =======================

        /**
         * Yerleştirilen parçalara göre stok boyutunu manuel olarak küçültür.
         */
        function fitToParts() {
            if (placedParts.length === 0) {
                optimizationMessage.textContent = 'UYARI: Yerleştirilmiş parça yok. Önce optimizasyonu çalıştırın.';
                optimizationMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-yellow-100', 'text-yellow-800');
                optimizationMessage.classList.add('bg-red-100', 'text-red-800');
                return;
            }

            // Yerleştirilen parçaların kapsadığı en geniş/yüksek noktayı bul (Bounding Box)
            let maxX = 0;
            let maxY = 0;
            placedParts.forEach(p => {
                maxX = Math.max(maxX, p.x + p.w);
                maxY = Math.max(maxY, p.y + p.h);
            });
            
            // Bounding Box'ı en yakın tam sayıya yuvarla
            const finalW = Math.ceil(maxX);
            const finalH = Math.ceil(maxY);
            
            const originalW = stockWidth;
            const originalH = stockHeight;

            // Eğer boyut değişmeyecekse uyarı ver
            if (finalW >= originalW && finalH >= originalH) {
                optimizationMessage.textContent = 'Bilgi: Stok boyutu zaten parçalara sığdırılmış durumda.';
                optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-yellow-100', 'text-yellow-800');
                optimizationMessage.classList.add('bg-blue-100', 'text-blue-800');
                return;
            }

            // UI'daki stok boyutlarını güncelle
            document.getElementById('stockW').value = finalW;
            document.getElementById('stockH').value = finalH;
            
            // Global değişkenleri ve canvas boyutlarını güncelle
            stockWidth = finalW;
            stockHeight = finalH;
            canvas.width = finalW;
            canvas.height = finalH;
            
            // Kullanıcıya bilgi ver
            optimizationMessage.textContent = `Stok boyutu ${originalW}x${originalH}'dan ${finalW}x${finalH}'a başarıyla küçültüldü. Atık alanı azaldı.`;
            optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-green-100', 'text-green-800', 'bg-yellow-100', 'text-yellow-800');
            optimizationMessage.classList.add('bg-blue-100', 'text-blue-800');
            
            // Sonuçları yeniden hesapla ve çiz
            recalculateResults(finalW, finalH);
            drawCuttingPlan();
        }

        // ======================== BAŞLANGIÇ VE YÖNLENDİRME =======================

        function optimize() {
            stockWidth = parseFloat(document.getElementById('stockW').value);
            stockHeight = parseFloat(document.getElementById('stockH').value);
            bladeThickness = parseFloat(document.getElementById('bladeThickness').value) || 0;

            // Modal'ları ve mesajları temizle
            optimizationMessage.classList.add('hidden');
            unplacedPartsCountElement.classList.add('hidden');
            optimizationMessage.textContent = '';
            resizeModal.classList.add('hidden');
            downsizeModal.classList.add('hidden');
            
            // Sığdır butonunu pasif et (yeni optimizasyon başladığında)
            const fitButton = document.getElementById('fitButton');
            if (fitButton) {
                fitButton.disabled = true;
            }
            
            if (isNaN(stockWidth) || isNaN(stockHeight) || stockWidth <= 0 || stockHeight <= 0) {
                const message = 'Lütfen geçerli stok boyutları giriniz.';
                console.error(message);
                optimizationMessage.textContent = `HATA: ${message}`;
                optimizationMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800');
                optimizationMessage.classList.add('bg-red-100', 'text-red-800');
                return;
            }

            const partsInput = document.getElementById('partsInput').value;
            const parsedParts = parseParts(partsInput);
            const partsToPlace = prepareParts(parsedParts);
            const totalRequiredParts = partsToPlace.length;
            const allPartsTotalArea = partsToPlace.reduce((sum, p) => sum + (p.originalW * p.originalH), 0);
            const stockArea = stockWidth * stockHeight;

            // 1. KONTROL: Parça Alanı Stok Alanını Geçiyor mu? (Otomatik Upsize)
            if (allPartsTotalArea > stockArea) {
                // Otomatik olarak stok boyutunu büyüt
                const requiredAreaWithBuffer = allPartsTotalArea * 1.10; 
                const scaleFactor = Math.sqrt(requiredAreaWithBuffer / stockArea);
                
                let newStockW = stockWidth;
                let newStockH = stockHeight;

                // En büyük boyutu orantılı olarak artır (kabaca en boy oranını korumak için)
                if (stockWidth >= stockHeight) {
                    newStockW = Math.ceil(stockWidth * scaleFactor);
                } else {
                    newStockH = Math.ceil(stockHeight * scaleFactor);
                }

                // UI'daki stok boyutlarını güncelle
                document.getElementById('stockW').value = newStockW.toFixed(0);
                document.getElementById('stockH').value = newStockH.toFixed(0);
                
                // Global değişkenleri ve canvas boyutlarını güncelle
                stockWidth = newStockW;
                stockHeight = newStockH;
                canvas.width = newStockW;
                canvas.height = newStockH;
                
                optimizationMessage.textContent = `Stok boyutu otomatik olarak ${newStockW.toFixed(0)}x${newStockH.toFixed(0)}'a büyütüldü.`;
                optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800');
                optimizationMessage.classList.add('bg-yellow-100', 'text-yellow-800');
            }

            // Alan yeterli, doğrudan paketlemeye başla
            runPacking(partsToPlace, totalRequiredParts, allPartsTotalArea, stockArea);
        }

        function startOptimization() {
            stockWidth = parseFloat(document.getElementById('stockW').value);
            stockHeight = parseFloat(document.getElementById('stockH').value);

            if (isNaN(stockWidth) || isNaN(stockHeight) || stockWidth <= 0 || stockHeight <= 0) {
                optimize();
                return;
            }

            // Canvas'ın boyutunu ilk başta stok boyutuna göre ayarla
            canvas.width = stockWidth;
            canvas.height = stockHeight;
            
            optimize();
        }

        // Modal Buton Etkileşimleri
        // confirmResizeBtn.addEventListener('click', () => handleResize(true));
        // cancelResizeBtn.addEventListener('click', () => handleResize(false));
        // confirmDownsizeBtn.addEventListener('click', () => handleDownsize(true));
        // cancelDownsizeBtn.addEventListener('click', () => handleDownsize(false));


        // Sayfa yüklendiğinde varsayılan optimizasyonu çalıştır
        window.onload = startOptimization;
        window.addEventListener('resize', () => {
             // Yeniden boyutlandırmada görseli güncel tut
            if (placedParts.length > 0) {
                drawCuttingPlan(); 
            }
        });