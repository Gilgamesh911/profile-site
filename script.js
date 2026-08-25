// ===== 2D 卫星图滚动方案 =====

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    
    const satelliteImg = document.getElementById('satelliteImg');
    const starsBg = document.getElementById('starsBg');
    const coordsEl = document.getElementById('coords');
    const scrollHint = document.getElementById('scrollHint');
    const markers = document.querySelectorAll('.city-marker');
    
    // ===== 城市数据 =====
    const cities = {
        hero:      { lat: 30.63, lng: 120.56, scale: 1,   x: 0,    y: 0 },
        tongxiang: { lat: 30.63, lng: 120.56, scale: 2.2, x: -15,  y: 0 },
        chengdu:   { lat: 30.67, lng: 104.06, scale: 2.2, x: 15,   y: 0 },
        hefei:     { lat: 31.82, lng: 117.23, scale: 2.2, x: -8,   y: 5 },
        hongkong:  { lat: 22.32, lng: 114.17, scale: 2.5, x: -5,   y: -20 },
        beijing:   { lat: 39.90, lng: 116.40, scale: 2.2, x: -10,  y: 15 },
    };
    
    // ===== 主时间线：背景变换 =====
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '.content-layer',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,
            onUpdate: (self) => {
                updateScene(self.progress);
            }
        }
    });
    
    // 开场 → 桐乡：轻微放大
    tl.to(satelliteImg, {
        scale: 1.3,
        x: '-5%',
        duration: 1,
        ease: 'none'
    }, 0);
    
    // 桐乡 → 成都：向左平移到四川
    tl.to(satelliteImg, {
        scale: 1.8,
        x: '15%',
        y: '0%',
        duration: 1,
        ease: 'none'
    }, 1);
    
    // 成都 → 合肥：向右平移
    tl.to(satelliteImg, {
        scale: 1.8,
        x: '-8%',
        y: '3%',
        duration: 1,
        ease: 'none'
    }, 2);
    
    // 合肥 → 香港：向南平移
    tl.to(satelliteImg, {
        scale: 2.0,
        x: '-5%',
        y: '-18%',
        duration: 1,
        ease: 'none'
    }, 3);
    
    // 香港 → 北京：向北平移
    tl.to(satelliteImg, {
        scale: 1.8,
        x: '-8%',
        y: '12%',
        duration: 1,
        ease: 'none'
    }, 4);
    
    // 北京 → 星辰大海：放大淡出
    tl.to(satelliteImg, {
        scale: 2.5,
        opacity: 0,
        duration: 1,
        ease: 'none'
    }, 5);
    
    // 星空淡入
    tl.to(starsBg, {
        opacity: 1,
        duration: 1,
        ease: 'none'
    }, 5.2);
    
    // ===== 城市卡片动画 =====
    document.querySelectorAll('.city-card').forEach((card, i) => {
        gsap.to(card, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 75%',
                end: 'top 40%',
                toggleActions: 'play none none reverse'
            }
        });
    });
    
    // ===== 星辰大海标题动画 =====
    gsap.to('#starsTitle', {
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: 'power2.out',
        scrollTrigger: {
            trigger: '#stars',
            start: 'top 60%',
            toggleActions: 'play none none reverse'
        }
    });
    
    gsap.to('#starsSubtitle', {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.3,
        ease: 'power2.out',
        scrollTrigger: {
            trigger: '#stars',
            start: 'top 55%',
            toggleActions: 'play none none reverse'
        }
    });
    
    // ===== 场景更新 =====
    function updateScene(progress) {
        // 坐标更新
        let cityName = 'tongxiang';
        if (progress < 0.12) cityName = 'tongxiang';
        else if (progress < 0.30) cityName = 'chengdu';
        else if (progress < 0.48) cityName = 'hefei';
        else if (progress < 0.66) cityName = 'hongkong';
        else if (progress < 0.84) cityName = 'beijing';
        else cityName = 'stars';
        
        if (cityName !== 'stars' && cities[cityName]) {
            const c = cities[cityName];
            coordsEl.textContent = `${c.lat.toFixed(2)}°N, ${c.lng.toFixed(2)}°E`;
        } else {
            coordsEl.textContent = 'SPACE · 星辰大海';
        }
        
        // 城市标注显示
        markers.forEach(m => {
            const markerCity = m.dataset.city;
            const shouldShow = shouldShowMarker(progress, markerCity);
            m.classList.toggle('visible', shouldShow);
        });
        
        // 滚动提示隐藏
        if (progress > 0.05) {
            scrollHint.classList.add('hidden');
        } else {
            scrollHint.classList.remove('hidden');
        }
    }
    
    function shouldShowMarker(progress, city) {
        const ranges = {
            tongxiang: [0, 0.20],
            chengdu:   [0.15, 0.38],
            hefei:     [0.33, 0.56],
            hongkong:  [0.51, 0.74],
            beijing:   [0.69, 0.90],
        };
        const r = ranges[city];
        if (!r) return false;
        return progress >= r[0] && progress <= r[1];
    }
    
    // ===== 开场卡片自动显示 =====
    gsap.to('#hero .city-card', {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.5,
        ease: 'power2.out'
    });
    
    // ===== 导航平滑滚动 =====
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                gsap.to(window, {
                    duration: 1.5,
                    scrollTo: { y: target, offsetY: 0 },
                    ease: 'power2.inOut'
                });
            }
        });
    });
    
    // ===== 窗口 resize =====
    window.addEventListener('resize', () => {
        ScrollTrigger.refresh();
    });
});
