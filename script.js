// ===== 2D 卫星图滚动方案 - 多图切换 v3 (Lenis + Grain) =====

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    
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
    
    // Lenis 与 GSAP ScrollTrigger 同步
    lenis.on('scroll', ScrollTrigger.update);
    
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    
    gsap.ticker.lagSmoothing(0);
    
    const satelliteImgs = document.querySelectorAll('.satellite-img');
    const starsBg = document.getElementById('starsBg');
    const coordsEl = document.getElementById('coords');
    const scrollHint = document.getElementById('scrollHint');
    
    // ===== 城市数据 =====
    const cityData = {
        hero:      { label: '30.63°N, 120.56°E' },
        tongxiang: { label: '30.63°N, 120.56°E' },
        chengdu:   { label: '30.67°N, 104.06°E' },
        hefei:     { label: '31.82°N, 117.23°E' },
        hongkong:  { label: '22.32°N, 114.17°E' },
        beijing:   { label: '39.90°N, 116.40°E' },
        stars:     { label: 'SPACE · 星辰大海' }
    };
    
    // ===== 图片切换 =====
    function activateImage(sceneName) {
        satelliteImgs.forEach(img => {
            img.classList.toggle('active', img.dataset.scene === sceneName);
        });
    }
    
    function showStars() {
        satelliteImgs.forEach(img => img.classList.remove('active'));
        starsBg.classList.add('active');
    }
    
    function hideStars() {
        starsBg.classList.remove('active');
    }
    
    // ===== 场景切换器 =====
    function setScene(scene) {
        if (scene === 'stars') {
            showStars();
        } else {
            activateImage(scene);
            hideStars();
        }
        coordsEl.textContent = cityData[scene].label;
    }
    
    // ===== 核心：用单 ScrollTrigger 监听整体进度，精确分段 =====
    const sectionIds = ['hero', 'tongxiang', 'chengdu', 'hefei', 'hongkong', 'beijing', 'stars'];
    const sectionEls = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
    
    ScrollTrigger.create({
        trigger: '.content-layer',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
            const progress = self.progress;
            const total = sectionEls.length;
            const sectionIndex = Math.min(Math.floor(progress * total), total - 1);
            const currentScene = sectionIds[sectionIndex];
            setScene(currentScene);
            
            // 滚动提示
            if (progress > 0.02) {
                scrollHint.classList.add('hidden');
            } else {
                scrollHint.classList.remove('hidden');
            }
        }
    });
    
    // ===== 城市卡片淡入动画 =====
    gsap.utils.toArray('.city-card').forEach(card => {
        gsap.fromTo(card, 
            { opacity: 0, y: 50 },
            {
                opacity: 1,
                y: 0,
                duration: 0.9,
                ease: 'power2.out',
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
        {
            opacity: 1,
            scale: 1,
            duration: 1.2,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '#stars',
                start: 'top 70%',
                toggleActions: 'play none none reverse'
            }
        }
    );
    
    gsap.fromTo('#starsSubtitle',
        { opacity: 0, y: 30 },
        {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '#stars',
                start: 'top 60%',
                toggleActions: 'play none none reverse'
            }
        }
    );
    
    // ===== 开场卡片动画（由加载完成后触发） =====
    function showHeroCard() {
        gsap.fromTo('#hero .city-card',
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }
        );
    }
    
    // ===== 加载动画 =====
    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loaderBar');
    const loaderPercent = document.getElementById('loaderPercent');
    const loaderSteps = document.querySelectorAll('.loader-step');
    
    let loadProgress = 0;
    const stepThresholds = [0, 20, 45, 70, 90];
    const totalLoadTime = 2200; // 2.2秒总加载时间
    const interval = 30;
    
    const loadTimer = setInterval(() => {
        loadProgress += (100 / (totalLoadTime / interval));
        if (loadProgress >= 100) {
            loadProgress = 100;
            clearInterval(loadTimer);
            
            // 加载完成：淡出加载层，显示开场卡片
            setTimeout(() => {
                loader.classList.add('hidden');
                showHeroCard();
            }, 300);
        }
        
        loaderBar.style.width = loadProgress + '%';
        loaderPercent.textContent = Math.floor(loadProgress) + '%';
        
        // 更新步骤文字
        loaderSteps.forEach((step, i) => {
            if (loadProgress >= stepThresholds[i]) {
                loaderSteps.forEach(s => s.classList.remove('active'));
                step.classList.add('active');
            }
        });
    }, interval);
    
    // ===== 导航平滑滚动（使用 Lenis） =====
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                lenis.scrollTo(target, { offset: 0, duration: 1.5 });
            }
        });
    });
    
    // ===== 窗口 resize 刷新 =====
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
    });
});
