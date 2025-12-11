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
        let minSpacing = 0; // Minimum boşluk (parçalar arası)
        let stockCost = 0; // Stok birim maliyeti
        let multiStockEnabled = false; // Çoklu stok desteği
        let panzoomInstance = null; // panzoom instance
        let saveTimeout = null; // Debounce için timeout
        let selectedPartId = null; // Seçili parça ID
        
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
         * Parçaları hazırlar ve seçilen stratejiye göre sıralar.
         */
        function prepareParts(parsedParts, sortStrategy = 'area') {
            let parts = [];
            for (const p of parsedParts) {
                for (let i = 0; i < p.count; i++) {
                    parts.push({ 
                        id: `${p.w}x${p.h}-${i+1}`, 
                        w: p.w + bladeThickness + minSpacing, 
                        h: p.h + bladeThickness + minSpacing, 
                        originalW: p.w,
                        originalH: p.h
                    });
                }
            }
            
            // Sıralama stratejisine göre sırala
            switch(sortStrategy) {
                case 'area':
                    parts.sort((a, b) => (b.originalW * b.originalH) - (a.originalW * a.originalH));
                    break;
                case 'perimeter':
                    parts.sort((a, b) => (2 * (b.originalW + b.originalH)) - (2 * (a.originalW + a.originalH)));
                    break;
                case 'longest':
                    parts.sort((a, b) => Math.max(b.originalW, b.originalH) - Math.max(a.originalW, a.originalH));
                    break;
                case 'shortest':
                    parts.sort((a, b) => Math.min(b.originalW, b.originalH) - Math.min(a.originalW, a.originalH));
                    break;
                case 'ratio':
                    parts.sort((a, b) => (b.originalW / b.originalH) - (a.originalW / a.originalH));
                    break;
                default:
                    parts.sort((a, b) => (b.originalW * b.originalH) - (a.originalW * a.originalH));
            }
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
            const wastePercent = ((wasteArea / currentStockArea) * 100).toFixed(2);
            const usedAreaPercent = ((totalOriginalArea / currentStockArea) * 100).toFixed(2);
            
            document.getElementById('totalArea').textContent = `Toplam Parça Alanı (Net): ${totalOriginalArea.toFixed(0)} birim²`;
            document.getElementById('stockArea').textContent = `Stok Alanı: ${currentStockArea.toFixed(0)} birim²`;
            document.getElementById('waste').textContent = `Atık Alan: ${wasteArea.toFixed(0)} birim²`;
            document.getElementById('efficiency').textContent = `Verimlilik: ${efficiency}%`;
            
            // Maliyet hesaplama
            if (stockCost > 0) {
                const totalCost = (currentStockArea * stockCost).toFixed(2);
                const costElement = document.getElementById('totalCost');
                costElement.textContent = `Toplam Maliyet: ${totalCost}`;
                costElement.classList.remove('hidden');
            } else {
                document.getElementById('totalCost').classList.add('hidden');
            }
            
            // Detaylı istatistikler
            if (placedParts.length > 0) {
                const avgW = (placedParts.reduce((sum, p) => sum + p.originalW, 0) / placedParts.length).toFixed(1);
                const avgH = (placedParts.reduce((sum, p) => sum + p.originalH, 0) / placedParts.length).toFixed(1);
                const minW = Math.min(...placedParts.map(p => p.originalW));
                const minH = Math.min(...placedParts.map(p => p.originalH));
                const maxW = Math.max(...placedParts.map(p => p.originalW));
                const maxH = Math.max(...placedParts.map(p => p.originalH));
                
                document.getElementById('avgPartSize').textContent = `Ortalama Parça Boyutu: ${avgW} x ${avgH}`;
                document.getElementById('minPartSize').textContent = `Min Parça: ${minW} x ${minH}`;
                document.getElementById('maxPartSize').textContent = `Max Parça: ${maxW} x ${maxH}`;
                document.getElementById('wastePercent').textContent = `Atık Yüzdesi: ${wastePercent}%`;
                document.getElementById('usedAreaPercent').textContent = `Kullanılan Alan: ${usedAreaPercent}%`;
                document.getElementById('detailedStats').classList.remove('hidden');
            }
            
            // Parça tablosunu güncelle
            updatePartsTable();
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
            
            // Kesim sırasını hesapla
            calculateCuttingOrder();
            
            // Sonuçları Hesapla
            recalculateResults(stockWidth, stockHeight);
            drawCuttingPlan();
            
            // Otomatik kaydet
            autoSave();
        }


        /**
         * Kesim sırasını hesaplar (soldan sağa, yukarıdan aşağıya)
         */
        function calculateCuttingOrder() {
            // Parçaları konumlarına göre sırala (y önce, sonra x)
            const sortedParts = [...placedParts].sort((a, b) => {
                if (Math.abs(a.y - b.y) < 5) { // Aynı y seviyesinde
                    return a.x - b.x; // Soldan sağa
                }
                return a.y - b.y; // Yukarıdan aşağıya
            });
            
            // Kesim sırası numarasını ata
            sortedParts.forEach((part, index) => {
                const originalPart = placedParts.find(p => p.id === part.id && p.x === part.x && p.y === part.y);
                if (originalPart) {
                    originalPart.cuttingOrder = index + 1;
                }
            });
        }

        /**
         * Parça tablosunu günceller
         */
        function updatePartsTable() {
            const tbody = document.getElementById('partsTableBody');
            const container = document.getElementById('partsTableContainer');
            
            if (placedParts.length === 0) {
                container.classList.add('hidden');
                return;
            }
            
            container.classList.remove('hidden');
            tbody.innerHTML = '';
            
            placedParts.forEach((part, index) => {
                const row = document.createElement('tr');
                const isRotated = part.w !== part.originalW + bladeThickness + minSpacing && part.h !== part.originalH + bladeThickness + minSpacing;
                const isSelected = selectedPartId === part.id;
                
                row.className = isSelected ? 'bg-blue-100 cursor-pointer hover:bg-blue-200' : 'cursor-pointer hover:bg-gray-100';
                row.onclick = () => selectPart(part.id);
                
                row.innerHTML = `
                    <td class="border border-gray-300 px-2 py-1">${index + 1}</td>
                    <td class="border border-gray-300 px-2 py-1 font-medium">${part.id}</td>
                    <td class="border border-gray-300 px-2 py-1">${part.originalW} x ${part.originalH}</td>
                    <td class="border border-gray-300 px-2 py-1">(${part.x.toFixed(1)}, ${part.y.toFixed(1)})</td>
                    <td class="border border-gray-300 px-2 py-1">${isRotated ? 'Evet' : 'Hayır'}</td>
                    <td class="border border-gray-300 px-2 py-1">${part.cuttingOrder || '-'}</td>
                `;
                tbody.appendChild(row);
            });
        }

        // ======================== CANVAS ÇİZİMİ ==================================

        function drawCuttingPlan() {
            const container = document.getElementById('canvasContainer');
            const containerW = container ? container.clientWidth : canvas.parentElement.clientWidth;
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
            placedParts.forEach((part, index) => {
                // Renk hesaplama (tutarlı renkler için - ID'ye göre)
                const partIdHash = part.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const hue = (partIdHash * 137.508) % 360; // Golden angle
                const isSelected = selectedPartId === part.id;
                
                // Seçili parça için farklı renk ve kalın çerçeve
                if (isSelected) {
                    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 3;
                } else {
                    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                }
                
                ctx.fillRect(part.x * scale, part.y * scale, part.w * scale, part.h * scale);
                ctx.strokeRect(part.x * scale, part.y * scale, part.w * scale, part.h * scale);
                
                // Parça bilgisi ve numarası
                ctx.fillStyle = isSelected ? '#fff' : '#333';
                const fontSize = Math.max(10, part.originalH * scale * 0.12);
                ctx.font = `${fontSize}px Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const text = `${part.originalW}x${part.originalH}`;
                const centerX = (part.x + part.w / 2) * scale;
                const centerY = (part.y + part.h / 2) * scale;
                
                ctx.fillText(text, centerX, centerY - fontSize * 0.3);
                
                // Kesim sırası numarası
                if (part.cuttingOrder) {
                    ctx.fillStyle = isSelected ? '#fff' : '#fff';
                    ctx.font = `bold ${fontSize * 0.8}px Inter`;
                    ctx.fillText(`#${part.cuttingOrder}`, centerX, centerY + fontSize * 0.3);
                }
            });
            
            // panzoom'u yeniden başlat
            initPanzoom();
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
            
            // Otomatik kaydet
            autoSave();
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
            const sortStrategy = document.getElementById('sortStrategy').value;
            minSpacing = parseFloat(document.getElementById('minSpacing').value) || 0;
            stockCost = parseFloat(document.getElementById('stockCost').value) || 0;
            multiStockEnabled = document.getElementById('multiStock').checked;
            const partsToPlace = prepareParts(parsedParts, sortStrategy);
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


        // ======================== EXPORT/IMPORT ==================================

        function exportProject() {
            const projectData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                stockWidth: stockWidth,
                stockHeight: stockHeight,
                bladeThickness: bladeThickness,
                minSpacing: minSpacing,
                stockCost: stockCost,
                multiStockEnabled: multiStockEnabled,
                sortStrategy: document.getElementById('sortStrategy').value,
                partsInput: document.getElementById('partsInput').value,
                placedParts: placedParts,
                optimizationResults: {
                    totalArea: placedParts.reduce((sum, p) => sum + (p.originalW * p.originalH), 0),
                    stockArea: stockWidth * stockHeight,
                    efficiency: ((placedParts.reduce((sum, p) => sum + (p.originalW * p.originalH), 0) / (stockWidth * stockHeight)) * 100).toFixed(2)
                }
            };
            
            const dataStr = JSON.stringify(projectData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cut-optimizer-project-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
        }

        function importProject(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const projectData = JSON.parse(e.target.result);
                    
                    // Verileri yükle
                    document.getElementById('stockW').value = projectData.stockWidth || 800;
                    document.getElementById('stockH').value = projectData.stockHeight || 600;
                    document.getElementById('bladeThickness').value = projectData.bladeThickness || 0;
                    document.getElementById('minSpacing').value = projectData.minSpacing || 0;
                    document.getElementById('stockCost').value = projectData.stockCost || 0;
                    document.getElementById('multiStock').checked = projectData.multiStockEnabled || false;
                    document.getElementById('sortStrategy').value = projectData.sortStrategy || 'area';
                    document.getElementById('partsInput').value = projectData.partsInput || '';
                    
                    // Optimizasyonu yeniden çalıştır
                    startOptimization();
                    
                    optimizationMessage.textContent = 'Proje başarıyla yüklendi.';
                    optimizationMessage.classList.remove('hidden', 'bg-red-100', 'text-red-800');
                    optimizationMessage.classList.add('bg-green-100', 'text-green-800');
                } catch (error) {
                    optimizationMessage.textContent = 'HATA: Geçersiz dosya formatı.';
                    optimizationMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800');
                    optimizationMessage.classList.add('bg-red-100', 'text-red-800');
                }
            };
            reader.readAsText(file);
            event.target.value = ''; // Reset input
        }

        function exportPNG() {
            const link = document.createElement('a');
            link.download = `cutting-plan-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        function clearProject() {
            if (confirm('Tüm verileri temizlemek istediğinize emin misiniz?')) {
                document.getElementById('stockW').value = 800;
                document.getElementById('stockH').value = 600;
                document.getElementById('bladeThickness').value = 0;
                document.getElementById('minSpacing').value = 0;
                document.getElementById('stockCost').value = 0;
                document.getElementById('multiStock').checked = false;
                document.getElementById('sortStrategy').value = 'area';
                document.getElementById('partsInput').value = '200,300; 5\n150,250; 3\n100,50; 8\n350,150; 2';
                placedParts = [];
                localStorage.removeItem('cutOptimizer_project');
                startOptimization();
            }
        }

        // ======================== LOCALSTORAGE ==================================

        function saveToLocalStorage() {
            const projectData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                stockWidth: parseFloat(document.getElementById('stockW').value) || 800,
                stockHeight: parseFloat(document.getElementById('stockH').value) || 600,
                bladeThickness: parseFloat(document.getElementById('bladeThickness').value) || 0,
                minSpacing: parseFloat(document.getElementById('minSpacing').value) || 0,
                stockCost: parseFloat(document.getElementById('stockCost').value) || 0,
                multiStockEnabled: document.getElementById('multiStock').checked,
                sortStrategy: document.getElementById('sortStrategy').value,
                partsInput: document.getElementById('partsInput').value,
                placedParts: placedParts
            };
            
            try {
                localStorage.setItem('cutOptimizer_project', JSON.stringify(projectData));
            } catch (e) {
                console.warn('localStorage kaydetme hatası:', e);
            }
        }

        function loadFromLocalStorage() {
            try {
                const saved = localStorage.getItem('cutOptimizer_project');
                if (!saved) return false;
                
                const projectData = JSON.parse(saved);
                
                document.getElementById('stockW').value = projectData.stockWidth || 800;
                document.getElementById('stockH').value = projectData.stockHeight || 600;
                document.getElementById('bladeThickness').value = projectData.bladeThickness || 0;
                document.getElementById('minSpacing').value = projectData.minSpacing || 0;
                document.getElementById('stockCost').value = projectData.stockCost || 0;
                document.getElementById('multiStock').checked = projectData.multiStockEnabled || false;
                document.getElementById('sortStrategy').value = projectData.sortStrategy || 'area';
                document.getElementById('partsInput').value = projectData.partsInput || '';
                
                if (projectData.placedParts && projectData.placedParts.length > 0) {
                    placedParts = projectData.placedParts;
                    stockWidth = projectData.stockWidth;
                    stockHeight = projectData.stockHeight;
                    recalculateResults(stockWidth, stockHeight);
                    drawCuttingPlan();
                }
                
                return true;
            } catch (e) {
                console.warn('localStorage yükleme hatası:', e);
                return false;
            }
        }

        function autoSave() {
            // Debounce ile kaydetme
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
            saveTimeout = setTimeout(() => {
                saveToLocalStorage();
            }, 1000); // 1 saniye bekle
        }

        // ======================== PANZOOM ==================================

        function initPanzoom() {
            if (typeof panzoom === 'undefined') return;
            
            const container = document.getElementById('canvasContainer');
            if (panzoomInstance) {
                panzoomInstance.dispose();
            }
            
            panzoomInstance = panzoom(canvas, {
                maxZoom: 5,
                minZoom: 0.1,
                bounds: true,
                boundsPadding: 0.1,
                zoomOnDoubleClick: false // Çift tıklamada zoom yapma
            });
            
            // Canvas'a tıklama event listener ekle
            canvas.addEventListener('click', handleCanvasClick);
        }
        
        /**
         * Canvas'a tıklandığında parça seçimi yapar
         */
        function handleCanvasClick(event) {
            if (!panzoomInstance || placedParts.length === 0) return;
            
            // Panzoom transform bilgisini al
            const transform = panzoomInstance.getTransform();
            
            // Tıklanan noktanın canvas koordinatlarını hesapla
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left - transform.x) / transform.scale;
            const y = (event.clientY - rect.top - transform.y) / transform.scale;
            
            // Canvas ölçek faktörünü hesapla
            const container = document.getElementById('canvasContainer');
            const containerW = container ? container.clientWidth : canvas.parentElement.clientWidth;
            const scale = containerW / stockWidth;
            
            // Gerçek koordinatları hesapla (canvas ölçeğine göre)
            const realX = x / scale;
            const realY = y / scale;
            
            // Tıklanan noktanın hangi parçanın üzerinde olduğunu bul
            let clickedPart = null;
            for (let i = placedParts.length - 1; i >= 0; i--) {
                const part = placedParts[i];
                if (realX >= part.x && realX <= part.x + part.w &&
                    realY >= part.y && realY <= part.y + part.h) {
                    clickedPart = part;
                    break;
                }
            }
            
            // Parça seçildiyse seçimi güncelle
            if (clickedPart) {
                selectPart(clickedPart.id);
            } else {
                // Boş alana tıklandıysa seçimi temizle
                clearSelection();
            }
        }

        function resetZoom() {
            if (panzoomInstance) {
                panzoomInstance.moveTo(0, 0);
                panzoomInstance.zoomAbs(0, 0, 1);
            }
        }

        // ======================== SAYFA YÖNETİMİ ==================================

        function showPage(pageName) {
            // Tüm sayfaları gizle
            document.getElementById('page-main').classList.add('hidden');
            document.getElementById('page-changelog').classList.add('hidden');
            
            // Tüm nav linklerini pasif yap
            document.getElementById('nav-main').classList.remove('border-indigo-500', 'bg-gray-700');
            document.getElementById('nav-main').classList.add('border-transparent');
            document.getElementById('nav-changelog').classList.remove('border-indigo-500', 'bg-gray-700');
            document.getElementById('nav-changelog').classList.add('border-transparent');
            
            // Seçili sayfayı göster
            if (pageName === 'main') {
                document.getElementById('page-main').classList.remove('hidden');
                document.getElementById('nav-main').classList.add('border-indigo-500', 'bg-gray-700');
                document.getElementById('nav-main').classList.remove('border-transparent');
            } else if (pageName === 'changelog') {
                document.getElementById('page-changelog').classList.remove('hidden');
                document.getElementById('nav-changelog').classList.add('border-indigo-500', 'bg-gray-700');
                document.getElementById('nav-changelog').classList.remove('border-transparent');
                loadChangelog();
            }
        }

        function loadChangelog() {
            const content = document.getElementById('changelog-content');
            fetch('CHANGELOG.json')
                .then(response => {
                    if (!response.ok) throw new Error('Dosya bulunamadı');
                    return response.json();
                })
                .then(data => {
                    let html = '<h1 class="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Sürüm Geçmişi</h1>';
                    
                    // Her versiyonu render et
                    data.versions.forEach(version => {
                        html += `<div class="mb-8 p-4 bg-gray-50 rounded-lg border-l-4 border-indigo-500">`;
                        html += `<div class="flex items-center justify-between mb-3">`;
                        html += `<h2 class="text-xl font-bold text-gray-700">${version.versionName || version.version}</h2>`;
                        html += `<div class="flex items-center gap-3">`;
                        html += `<span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">v${version.version}</span>`;
                        html += `<span class="text-sm text-gray-500">${version.date || ''}</span>`;
                        html += `</div>`;
                        html += `</div>`;
                        
                        // Özet
                        if (version.summary) {
                            html += `<div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">`;
                            html += `<p class="text-gray-700 italic">${version.summary}</p>`;
                            html += `</div>`;
                        }
                        
                        // Eklenenler
                        if (version.added && version.added.length > 0) {
                            html += `<h3 class="text-lg font-semibold mt-4 mb-2 text-green-700 flex items-center">`;
                            html += `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>`;
                            html += `Eklenenler</h3>`;
                            html += `<ul class="list-disc ml-6 mb-3">`;
                            version.added.forEach(item => {
                                html += `<li class="mb-1 text-gray-700">${item}</li>`;
                            });
                            html += `</ul>`;
                        }
                        
                        // Değiştirilenler
                        if (version.changed && version.changed.length > 0) {
                            html += `<h3 class="text-lg font-semibold mt-4 mb-2 text-yellow-700 flex items-center">`;
                            html += `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`;
                            html += `Değiştirilenler</h3>`;
                            html += `<ul class="list-disc ml-6 mb-3">`;
                            version.changed.forEach(item => {
                                html += `<li class="mb-1 text-gray-700">${item}</li>`;
                            });
                            html += `</ul>`;
                        }
                        
                        // Düzeltilenler
                        if (version.fixed && version.fixed.length > 0) {
                            html += `<h3 class="text-lg font-semibold mt-4 mb-2 text-blue-700 flex items-center">`;
                            html += `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                            html += `Düzeltilenler</h3>`;
                            html += `<ul class="list-disc ml-6 mb-3">`;
                            version.fixed.forEach(item => {
                                html += `<li class="mb-1 text-gray-700">${item}</li>`;
                            });
                            html += `</ul>`;
                        }
                        
                        // Kaldırılanlar
                        if (version.removed && version.removed.length > 0) {
                            html += `<h3 class="text-lg font-semibold mt-4 mb-2 text-red-700 flex items-center">`;
                            html += `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                            html += `Kaldırılanlar</h3>`;
                            html += `<ul class="list-disc ml-6 mb-3">`;
                            version.removed.forEach(item => {
                                html += `<li class="mb-1 text-gray-700">${item}</li>`;
                            });
                            html += `</ul>`;
                        }
                        
                        html += `</div>`;
                    });
                    
                    // Planlanan özellikler
                    if (data.unreleased && data.unreleased.planned && data.unreleased.planned.length > 0) {
                        html += `<div class="mt-8 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">`;
                        html += `<h2 class="text-xl font-bold text-gray-700 mb-3">Planlanan Özellikler</h2>`;
                        html += `<ul class="list-disc ml-6">`;
                        data.unreleased.planned.forEach(item => {
                            html += `<li class="mb-1 text-gray-700">${item}</li>`;
                        });
                        html += `</ul>`;
                        html += `</div>`;
                    }
                    
                    content.innerHTML = html;
                })
                .catch(err => {
                    // Fallback: Basit CHANGELOG içeriği
                    content.innerHTML = `
                        <h1 class="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Sürüm Geçmişi</h1>
                        <div class="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                            <p class="text-red-700 font-semibold mb-2">Hata: CHANGELOG.json dosyası yüklenemedi.</p>
                            <p class="text-gray-600 text-sm">Lütfen dosyanın mevcut olduğundan ve geçerli JSON formatında olduğundan emin olun.</p>
                            <p class="text-gray-500 text-xs mt-2">Hata detayı: ${err.message}</p>
                        </div>
                    `;
                });
        }

        // ======================== PARÇA SEÇİMİ ==================================

        function selectPart(partId) {
            selectedPartId = partId;
            updatePartsTable();
            drawCuttingPlan();
        }

        function clearSelection() {
            selectedPartId = null;
            updatePartsTable();
            drawCuttingPlan();
        }

        // ======================== EVENT LISTENERS ==================================

        // Input değişikliklerinde otomatik kaydet
        ['stockW', 'stockH', 'bladeThickness', 'minSpacing', 'stockCost', 'partsInput', 'sortStrategy'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', autoSave);
                element.addEventListener('change', autoSave);
            }
        });

        document.getElementById('multiStock').addEventListener('change', autoSave);

        // Sayfa kapanmadan önce kaydet
        window.addEventListener('beforeunload', () => {
            saveToLocalStorage();
        });

        // Sayfa yüklendiğinde
        window.onload = function() {
            // Ana sayfayı göster
            showPage('main');
            
            // Önce localStorage'dan yükle
            if (!loadFromLocalStorage()) {
                // Yoksa varsayılan optimizasyonu çalıştır
                startOptimization();
            } else {
                // Yüklenen verilerle canvas'ı ayarla
                canvas.width = stockWidth;
                canvas.height = stockHeight;
            }
        };

        window.addEventListener('resize', () => {
            // Yeniden boyutlandırmada görseli güncel tut
            if (placedParts.length > 0) {
                drawCuttingPlan(); 
            }
        });