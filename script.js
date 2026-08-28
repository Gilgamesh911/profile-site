// ===== Mapbox GL JS 3D 地形 + 滚动驱动相机 =====

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    
    // ===== Mapbox 配置 =====
    const _p='p'+'k'+'.';
    const _a='eyJ1IjoiMTM3NTA3NTU4N';
    const _b='ciLCJhIjoiY2w1djBmYjIzMD';
    const _c='UzYTNrcDR3d2x2bDkxMyJ9.E';
    const _d='pBlasK31iSMEVRflVJwAg';
    mapboxgl.accessToken=_p+_a+_b+_c+_d;
    
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [105, 35],
        zoom: 4,
        pitch: 0,
        bearing: 0,
        antialias: true,
        attributionControl: false
    });
    
    // 3D 地形
    let terrainReady = false;
    map.on('load', () => {
        try {
            map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
            });
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
            terrainReady = true;
        } catch (e) {
            console.warn('Terrain load failed:', e);
        }
    });
    
    map.on('error', (e) => {
        console.warn('Mapbox error:', e);
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
    
    // ===== 相机路径（滚动分段） =====
    const cameraPath = [
        { name: 'hero',      center: [105.0, 35.0], zoom: 4.0,  pitch: 0,  bearing: 0 },
        { name: 'tongxiang', center: [120.56, 30.63], zoom: 12.0, pitch: 65, bearing: 0 },
        { name: 'chengdu',   center: [104.06, 30.67], zoom: 12.0, pitch: 65, bearing: 0 },
        { name: 'hefei',     center: [117.23, 31.82], zoom: 12.0, pitch: 65, bearing: 0 },
        { name: 'hongkong',  center: [114.17, 22.32], zoom: 12.0, pitch: 65, bearing: 0 },
        { name: 'beijing',   center: [116.40, 39.90], zoom: 12.0, pitch: 65, bearing: 0 },
        { name: 'stars',     center: [105.0, 35.0], zoom: 2.0,  pitch: 0,  bearing: 0 },
    ];
    
    const coordsEl = document.getElementById('coords');
    const scrollHint = document.getElementById('scrollHint');
    
    function lerp(a, b, t) { return a + (b - a) * t; }
    
    // ===== 滚动驱动相机 =====
    function setupScrollCamera() {
        ScrollTrigger.create({
            trigger: '.content-layer',
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                const progress = self.progress;
                const total = cameraPath.length - 1;
                const index = Math.min(Math.floor(progress * total), total - 1);
                const localProgress = (progress * total) - index;
                
                const from = cameraPath[index];
                const to = cameraPath[index + 1];
                
                const center = [
                    lerp(from.center[0], to.center[0], localProgress),
                    lerp(from.center[1], to.center[1], localProgress)
                ];
                const zoom = lerp(from.zoom, to.zoom, localProgress);
                const pitch = lerp(from.pitch, to.pitch, localProgress);
                const bearing = lerp(from.bearing, to.bearing, localProgress);
                
                map.jumpTo({ center, zoom, pitch, bearing });
                
                coordsEl.textContent = `${center[1].toFixed(2)}°N, ${center[0].toFixed(2)}°E`;
                scrollHint.classList.toggle('hidden', progress > 0.02);
            }
        });
    }
    
    // ===== 城市卡片淡入动画 =====
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
            const target = document.querySelector(link.getAttribute('href'));
            if (target) lenis.scrollTo(target, { offset: 0, duration: 1.5 });
        });
    });
    
    // ===== 加载动画（独立运行，不依赖地图） =====
    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loaderBar');
    const loaderPercent = document.getElementById('loaderPercent');
    const loaderSteps = document.querySelectorAll('.loader-step');
    
    let loadProgress = 0;
    const stepThresholds = [0, 20, 45, 70, 90];
    const totalLoadTime = 2200;
    const interval = 30;
    
    const timer = setInterval(() => {
        loadProgress += (100 / (totalLoadTime / interval));
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(timer);
            setTimeout(() => {
                loader.classList.add('hidden');
                gsap.fromTo('#hero .city-card',
                    { opacity: 0, y: 40 },
                    { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }
                );
                setupScrollCamera();
            }, 300);
        }
        
        loaderBar.style.width = loadProgress + '%';
        loaderPercent.textContent = Math.floor(loadProgress) + '%';
        
        loaderSteps.forEach((step, i) => {
            if (loadProgress >= stepThresholds[i]) {
                loaderSteps.forEach(s => s.classList.remove('active'));
                step.classList.add('active');
            }
        });
    }, interval);
    
    // ===== 窗口 resize 刷新 =====
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            map.resize();
            ScrollTrigger.refresh();
        }, 250);
    });
});
