// ===== 空间之旅 V2：San Rita 式 Hero 门禁 + POI 徒步路径 + 滚动驱动相机 =====

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);

    // ===== Mapbox 配置 =====
    const _p='p'+'k'+'.';
    const _a='eyJ1IjoiMTM3NTA3NTU4ND';
    const _b='ciLCJhIjoiY2w1djBmYjIzMD';
    const _c='UzYTNrcDR3d2x2bDkxMyJ9.E';
    const _d='pBlasK31iSMEVRflVJwAg';
    mapboxgl.accessToken=_p+_a+_b+_c+_d;

    const isMobileMap = window.innerWidth < 768;

    // 移动端拉远 hero 视野，保证 6 个城市都入镜
    const HERO_ZOOM = isMobileMap ? 2.95 : 3.3;
    const HERO_CENTER = isMobileMap ? [110.5, 32.0] : [108.8, 32.2];

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: HERO_CENTER,
        zoom: HERO_ZOOM,
        pitch: 0,
        bearing: 0,
        projection: isMobileMap ? 'mercator' : 'globe',
        antialias: true,
        attributionControl: false,
        interactive: false
    });

    // ===== 城市数据 =====
    const CITIES = [
        { id: 'tongxiang', num: '01', label: '桐乡', en: 'TONGXIANG', center: [120.56, 30.63], tagBelow: true },
        { id: 'chengdu',   num: '02', label: '成都', en: 'CHENGDU',   center: [104.06, 30.67], tagDx: '-15%' },
        { id: 'hefei',     num: '03', label: '合肥', en: 'HEFEI',     center: [117.23, 31.82], tagDx: '-62%' },
        { id: 'hongkong',  num: '04', label: '香港', en: 'HONG KONG', center: [114.17, 22.32], tagDx: '-20%' },
        { id: 'beijing',   num: '05', label: '北京', en: 'BEIJING',   center: [116.40, 39.90], tagDx: '-15%' },
        { id: 'shanghai',  num: '06', label: '上海', en: 'SHANGHAI',  center: [121.47, 31.23], tagDx: '22%', tagDxMobile: '-15%' },
    ];
    const CITY_IDS = new Set(CITIES.map(c => c.id));
    const CITY_CENTER_OFFSET = 0.15; // 130vh 面板里，卡片中心落在视口正中所需的 15vh 偏移
    const CITY_FREEZE_HALF = 0.35;   // 落地视角前后各锁定 35vh

    // ===== 徒步路径：在城市之间生成蜿蜒小径 =====
    function makeTrail(points) {
        const pts = [];
        for (let i = 0; i < points.length - 1; i++) {
            const [x1, y1] = points[i], [x2, y2] = points[i + 1];
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len, ny = dx / len;
            const steps = 16;
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const taper = Math.sin(t * Math.PI); // 两端收拢到城市点
                const wob = (Math.sin(t * Math.PI * 3 + i * 1.7) * 0.10 +
                             Math.sin(t * Math.PI * 7 + i * 0.9) * 0.045) * len * taper;
                pts.push([x1 + dx * t + nx * wob, y1 + dy * t + ny * wob]);
            }
        }
        pts.push(points[points.length - 1]);
        return pts;
    }

    const trailCoords = makeTrail(CITIES.map(c => c.center));

    let trailReady = false;
    const poiMarkers = [];

    map.on('load', () => {
        // 桌面端保留 3D 地形；移动端跳过 DEM 瓦片，降低首屏和飞行段加载压力。
        if (!isMobileMap) {
            try {
                map.addSource('mapbox-dem', {
                    type: 'raster-dem',
                    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    tileSize: 512,
                    maxzoom: 14
                });
                map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
            } catch (e) {
                console.warn('Terrain load failed:', e);
            }
        }

        // 徒步路径（深色描边 + 荧光虚线）
        map.addSource('trail', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trailCoords } }
        });
        map.addLayer({
            id: 'trail-casing',
            type: 'line',
            source: 'trail',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#161b13', 'line-width': 5, 'line-opacity': 0, 'line-dasharray': [2.5, 1.8] }
        });
        map.addLayer({
            id: 'trail-line',
            type: 'line',
            source: 'trail',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#e2ffcc', 'line-width': 2.2, 'line-opacity': 0, 'line-dasharray': [2.5, 1.8] }
        });
        trailReady = true;
    });

    function addPois() {
        CITIES.forEach((c, i) => {
            const el = document.createElement('div');
            el.className = 'poi';
            el.style.opacity = '0';
            if (c.tagBelow) {
                // 标签放在点位下半边：挂在 dot 内部做绝对定位，避免覆盖 Mapbox 的 marker 定位
                el.innerHTML = `
                    <div class="poi-dot" style="position:relative">
                        <div class="poi-tag" style="position:absolute;top:calc(100% + 7px);left:50%;transform:translateX(-50%);"><span class="poi-idx">${c.num}</span><span class="poi-name">${c.label}</span><span class="poi-en">· ${c.en}</span></div>
                    </div>`;
            } else {
                const dx = (window.innerWidth < 768 && c.tagDxMobile) ? c.tagDxMobile : c.tagDx;
                el.innerHTML = `
                    <div class="poi-tag" style="transform:translateX(${dx});"><span class="poi-idx">${c.num}</span><span class="poi-name">${c.label}</span><span class="poi-en">· ${c.en}</span></div>
                    <div class="poi-dot"></div>`;
            }
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                enterWorld(c.id);
            });
            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat(c.center)
                .addTo(map);
            poiMarkers.push(marker);
            // 错峰弹入
            gsap.fromTo(el,
                { opacity: 0, scale: 0.4 },
                { opacity: 1, scale: 1, duration: 0.6, delay: 0.9 + i * 0.12, ease: 'back.out(2.2)',
                  onStart: () => { el.style.opacity = ''; } });
        });
    }

    function setTrailOpacity(v) {
        if (!trailReady) return;
        map.setPaintProperty('trail-casing', 'line-opacity', v * 0.55);
        map.setPaintProperty('trail-line', 'line-opacity', v * 0.95);
    }

    function setPoiOpacity(v) {
        poiMarkers.forEach(m => { m.getElement().style.opacity = v; m.getElement().style.pointerEvents = v > 0.3 ? 'auto' : 'none'; });
    }

    // ===== POI / 徒步路径显隐：由地图真实 zoom 每帧驱动 =====
    // 不依赖滚动事件触发顺序，城市页（zoom > 5.2）保证隐藏
    let poiEntrance = true;   // 入场动画期间不干预
    let lastPoiVis = -1;
    gsap.ticker.add(() => {
        if (poiEntrance || !poiMarkers.length) return;
        const vis = Math.max(0, Math.min(1, (5.2 - map.getZoom()) / 1.4));
        if (Math.abs(vis - lastPoiVis) > 0.005) {
            lastPoiVis = vis;
            setTrailOpacity(vis);
            setPoiOpacity(vis);
        }
    });

    // ===== Lenis 平滑滚动 =====
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // 初始：锁定滚动（hero 门禁）
    lenis.stop();

    // ===== 相机路径 =====
    const cameraPath = [
        { name: 'hero',      center: HERO_CENTER,     zoom: HERO_ZOOM, pitch: 0, bearing: 0, anchorRatio: 0,    freezeRatio: 0 },
        { name: 'tongxiang', center: [120.56, 30.63], zoom: 12.0, pitch: 65, bearing: 0, anchorRatio: CITY_CENTER_OFFSET, freezeRatio: CITY_FREEZE_HALF },
        { name: 'chengdu',   center: [104.06, 30.67], zoom: 12.0, pitch: 65, bearing: 0, anchorRatio: CITY_CENTER_OFFSET, freezeRatio: CITY_FREEZE_HALF },
        { name: 'hefei',     center: [117.23, 31.82], zoom: 12.0, pitch: 65, bearing: 0, anchorRatio: CITY_CENTER_OFFSET, freezeRatio: CITY_FREEZE_HALF },
        { name: 'hongkong',  center: [114.17, 22.32], zoom: 12.0, pitch: 65, bearing: 0, anchorRatio: CITY_CENTER_OFFSET, freezeRatio: CITY_FREEZE_HALF },
        { name: 'beijing',   center: [116.40, 39.90], zoom: 12.0, pitch: 65, bearing: 0, anchorRatio: CITY_CENTER_OFFSET, freezeRatio: CITY_FREEZE_HALF },
        { name: 'shanghai',  center: [121.47, 31.23], zoom: 12.0, pitch: 65, bearing: 0, anchorRatio: CITY_CENTER_OFFSET, freezeRatio: CITY_FREEZE_HALF },
        { name: 'stars',     center: [105.0, 35.0],   zoom: 0.0,  pitch: 0,  bearing: 0, anchorRatio: 0,    freezeRatio: 0 },
    ];

    const coordsEl = document.getElementById('coords');
    const heroUI = document.getElementById('heroUI');
    const mapEl = document.getElementById('map');

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp01(t) { return Math.max(0, Math.min(1, t)); }
    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    let entered = false;   // 是否已通过 hero 门禁
    let entering = false;  // 过渡中

    // ===== 城市锚点吸附（滚动阻力） =====
    let scrollStops = [];
    function computeScrollStops() {
        scrollStops = cameraPath.map(c => {
            const el = document.getElementById(c.name);
            const baseTop = el ? el.offsetTop : 0;
            return {
                ...c,
                top: baseTop,
                anchorY: baseTop + window.innerHeight * (c.anchorRatio || 0),
                freezeHalf: window.innerHeight * (c.freezeRatio || 0)
            };
        });
    }

    function getTargetScrollY(targetId) {
        if (!scrollStops.length) computeScrollStops();
        const stop = scrollStops.find(s => s.name === targetId);
        if (stop) return stop.anchorY;
        const el = document.getElementById(targetId);
        return el ? el.offsetTop : 0;
    }

    let snapLock = false;   // 程序化滚动期间不吸附
    let snapTimer = null;

    // 带锁的程序化滚动：导航/POI 跳转时不与吸附打架
    function lockedScrollTo(target, opts = {}) {
        snapLock = true;
        clearTimeout(snapLock._t);
        snapLock._t = setTimeout(() => { snapLock = false; }, (opts.duration || 1.5) * 1000 + 600);
        lenis.scrollTo(target, {
            ...opts,
            onComplete: () => { clearTimeout(snapLock._t); snapLock = false; }
        });
    }

    function snapToNearest() {
        if (!entered || entering || snapLock || !scrollStops.length) return;
        const y = window.scrollY;
        let best = scrollStops[0].anchorY, bestD = Math.abs(y - best);
        for (let i = 1; i < scrollStops.length; i++) {
            const d = Math.abs(y - scrollStops[i].anchorY);
            if (d < bestD) { bestD = d; best = scrollStops[i].anchorY; }
        }
        if (bestD > 6) {
            lockedScrollTo(best, { duration: 0.9 });
        }
    }

    // 滚动停稳后吸附到最近的城市锚点
    lenis.on('scroll', (e) => {
        if (!entered || entering || snapLock) return;
        clearTimeout(snapTimer);
        snapTimer = setTimeout(() => {
            if (Math.abs(e.velocity) < 1.5) snapToNearest();
        }, 120);
    });

    // ===== Hero 进入动画（滚轮累计 / 点击 / POI 直达） =====
    function enterWorld(targetId) {
        if (entered) {
            if (targetId) lockedScrollTo(getTargetScrollY(targetId), { duration: 2.0 });
            return;
        }
        if (entering) return;
        entering = true;
        entered = true;

        heroUI.classList.add('exited');
        lenis.start();

        setTimeout(() => {
            entering = false;
            if (targetId) {
                lockedScrollTo(getTargetScrollY(targetId), { duration: 2.4 });
            }
        }, 700);
    }

    // 滚轮累计阈值触发
    let wheelAcc = 0, lastWheel = 0;
    window.addEventListener('wheel', (e) => {
        if (entered) return;
        const now = performance.now();
        if (now - lastWheel > 400) wheelAcc = 0;
        lastWheel = now;
        if (e.deltaY > 0) {
            wheelAcc += e.deltaY;
            if (wheelAcc > 450) enterWorld();
        } else {
            wheelAcc = Math.max(0, wheelAcc + e.deltaY);
        }
    }, { passive: true });

    // 触屏滑动触发
    let touchStartY = null;
    window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (entered || touchStartY === null) return;
        if (touchStartY - e.touches[0].clientY > 100) enterWorld();
    }, { passive: true });

    // Scroll to explore 按钮
    document.getElementById('scrollPrompt').addEventListener('click', () => enterWorld());

    // 图例点击直达
    document.querySelectorAll('#heroLegend button').forEach(btn => {
        btn.addEventListener('click', () => enterWorld(btn.dataset.target));
    });

    // 品牌回首页
    document.getElementById('brandHome').addEventListener('click', () => {
        lockedScrollTo(0, { duration: 1.8 });
    });

    // ===== 滚动驱动相机 + POI/路径显隐 + 银河淡入 =====
    function setupScrollCamera() {
        computeScrollStops();
        ScrollTrigger.create({
            trigger: '.content-layer',
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                const progress = self.progress;
                const y = window.scrollY;
                const total = scrollStops.length - 1;
                const first = scrollStops[0];

                let activeIndex = 0;
                let from = first;
                let to = first;
                let localProgress = 0;
                let inFlight = false;

                for (let i = 0; i < total; i++) {
                    const current = scrollStops[i];
                    const next = scrollStops[i + 1];
                    const flightStart = current.anchorY + current.freezeHalf;
                    const flightEnd = next.anchorY - next.freezeHalf;

                    if (y < flightStart) {
                        activeIndex = i;
                        from = current;
                        to = current;
                        localProgress = 0;
                        inFlight = false;
                        break;
                    }

                    if (y <= flightEnd) {
                        const span = Math.max(1, flightEnd - flightStart);
                        activeIndex = i;
                        from = current;
                        to = next;
                        localProgress = easeInOutCubic(clamp01((y - flightStart) / span));
                        inFlight = true;
                        break;
                    }

                    if (i === total - 1) {
                        activeIndex = total;
                        from = next;
                        to = next;
                        localProgress = 0;
                        inFlight = false;
                    }
                }

                const center = [
                    lerp(from.center[0], to.center[0], localProgress),
                    lerp(from.center[1], to.center[1], localProgress)
                ];
                const zoom = lerp(from.zoom, to.zoom, localProgress);
                const pitch = lerp(from.pitch, to.pitch, localProgress);
                const bearing = lerp(from.bearing, to.bearing, localProgress);

                map.jumpTo({ center, zoom, pitch, bearing });

                coordsEl.textContent = `${center[1].toFixed(2)}°N, ${center[0].toFixed(2)}°E`;

                // 回到顶部时 hero UI 重新出现
                heroUI.classList.toggle('exited', progress > 0.012);

                // （POI / 路径显隐由 gsap.ticker 按地图真实 zoom 驱动）

                // 地球淡出 + 银河飞入（上海段之后）
                if (inFlight && from.name === 'shanghai' && to.name === 'stars') {
                    const fade = localProgress;
                    mapEl.style.opacity = 1 - fade;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(fade);
                        window.galaxyCanvas.setCameraZ(2000 - fade * 1600);
                        window.galaxyCanvas.setRotSpeed(0.0002 + fade * 0.001);
                    }
                } else if (!inFlight && activeIndex >= total) {
                    mapEl.style.opacity = 0;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(1);
                        window.galaxyCanvas.setCameraZ(400);
                        window.galaxyCanvas.setRotSpeed(0.0012);
                    }
                } else {
                    mapEl.style.opacity = 1;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(0);
                        window.galaxyCanvas.setCameraZ(2500);
                        window.galaxyCanvas.setRotSpeed(0.0002);
                    }
                }
            }
        });
    }

    // ===== 城市卡片入场动画 =====
    gsap.utils.toArray('.city-card').forEach(card => {
        gsap.fromTo(card,
            { opacity: 0, y: 50 },
            {
                opacity: 1, y: 0, duration: 0.9, ease: 'power2.out',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    // ===== 星辰大海标题动画 =====
    gsap.fromTo('#starsTitle',
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out',
          scrollTrigger: { trigger: '#stars', start: 'top 70%', toggleActions: 'play none none reverse' }
        }
    );
    gsap.fromTo('#starsSubtitle',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out',
          scrollTrigger: { trigger: '#stars', start: 'top 60%', toggleActions: 'play none none reverse' }
        }
    );

    // ===== 导航平滑滚动 =====
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (!entered) { enterWorld(href.slice(1)); return; }
            lockedScrollTo(getTargetScrollY(href.slice(1)), { duration: 1.5 });
        });
    });

    // ===== 顶栏时钟（GMT+8） =====
    const clockEl = document.getElementById('topbarClock');
    function tickClock() {
        const now = new Date(Date.now() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
        const p = (n) => String(n).padStart(2, '0');
        clockEl.textContent = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())} GMT+8`;
    }
    tickClock();
    setInterval(tickClock, 1000);

    // ===== 加载动画序列 =====
    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loaderBar');
    const loaderCount = document.getElementById('loaderCount');
    const loaderSteps = Array.from(document.querySelectorAll('#loaderSteps .ls'));

    let loadProgress = 0;
    const stepThresholds = [6, 24, 46, 66, 84];
    const totalLoadTime = 2800;
    const interval = 40;

    const timer = setInterval(() => {
        loadProgress += (100 / (totalLoadTime / interval));
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(timer);

            loaderSteps.forEach(s => {
                s.classList.remove('working');
                s.classList.add('done-step');
                s.querySelector('.ls-status').textContent = 'DONE';
            });
            loaderSteps[loaderSteps.length - 1].querySelector('.ls-status').textContent = 'ACTIVATED';

            setTimeout(() => {
                loader.classList.add('done');
                document.body.classList.add('ready');
                setupScrollCamera();
                addPois();
                // 徒步路径淡入（首次滚动前 ScrollTrigger 不会触发，需显式初始化）
                const trailFade = { v: 0 };
                gsap.to(trailFade, {
                    v: 1, duration: 1.8, delay: 0.5, ease: 'power2.out',
                    onUpdate: () => setTrailOpacity(trailFade.v)
                });
                // 入场动画结束后，显隐交由 ticker 按地图 zoom 驱动
                gsap.delayedCall(2.5, () => { poiEntrance = false; });
                if (window.galaxyCanvas) window.galaxyCanvas.init();
                setTimeout(() => { loader.style.display = 'none'; }, 1000);
            }, 450);
        }

        loaderBar.style.width = loadProgress + '%';
        loaderCount.textContent = String(Math.floor(loadProgress)).padStart(3, '0');

        loaderSteps.forEach((step, i) => {
            const statusEl = step.querySelector('.ls-status');
            if (loadProgress >= stepThresholds[i]) {
                if (!step.classList.contains('working') && !step.classList.contains('done-step')) {
                    loaderSteps.forEach((s, j) => {
                        if (j < i && s.classList.contains('working')) {
                            s.classList.remove('working');
                            s.classList.add('done-step');
                            s.querySelector('.ls-status').textContent = 'DONE';
                        }
                    });
                    step.classList.add('working');
                    statusEl.textContent = 'WORKING';
                }
            }
        });
    }, interval);

    // ===== 窗口 resize 刷新 =====
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            map.resize();
            computeScrollStops();
            ScrollTrigger.refresh();
        }, 250);
    });
});
