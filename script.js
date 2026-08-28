// ===== 2D 卫星图滚动方案 - 多图切换 =====

document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);
    
    const satelliteImgs = document.querySelectorAll('.satellite-img');
    const starsBg = document.getElementById('starsBg');
    const coordsEl = document.getElementById('coords');
    const scrollHint = document.getElementById('scrollHint');
    
    // ===== 城市数据 =====
    const cityData = {
        hero:      { lat: 30.63, lng: 120.56, label: '30.63°N, 120.56°E' },
        tongxiang: { lat: 30.63, lng: 120.56, label: '30.63°N, 120.56°E' },
        chengdu:   { lat: 30.67, lng: 104.06, label: '30.67°N, 104.06°E' },
        hefei:     { lat: 31.82, lng: 117.23, label: '31.82°N, 117.23°E' },
        hongkong:  { lat: 22.32, lng: 114.17, label: '22.32°N, 114.17°E' },
        beijing:   { lat: 39.90, lng: 116.40, label: '39.90°N, 116.40°E' },
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
    
    // ===== 为每个城市 section 创建 ScrollTrigger =====
    const sections = [
        { id: 'hero',      scene: 'hero' },
        { id: 'tongxiang', scene: 'tongxiang' },
        { id: 'chengdu',   scene: 'chengdu' },
        { id: 'hefei',     scene: 'hefei' },
        { id: 'hongkong',  scene: 'hongkong' },
        { id: 'beijing',   scene: 'beijing' },
    ];
    
    sections.forEach(({ id, scene }) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        ScrollTrigger.create({
            trigger: el,
            start: 'top 60%',
            end: 'bottom 40%',
            onToggle: (self) => {
                if (self.isActive) {
                    activateImage(scene);
                    hideStars();
                    coordsEl.textContent = cityData[scene].label;
                }
            }
        });
    });
    
    // ===== 星辰大海 section =====
    const starsSection = document.getElementById('stars');
    if (starsSection) {
        ScrollTrigger.create({
            trigger: starsSection,
            start: 'top 60%',
            end: 'bottom bottom',
            onToggle: (self) => {
                if (self.isActive) {
                    showStars();
                    coordsEl.textContent = cityData.stars.label;
                }
            }
        });
    }
    
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
                    start: 'top 82%',
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
                start: 'top 65%',
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
                start: 'top 55%',
                toggleActions: 'play none none reverse'
            }
        }
    );
    
    // ===== 开场卡片自动显示 =====
    gsap.fromTo('#hero .city-card',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.2, delay: 0.4, ease: 'power2.out' }
    );
    
    // ===== 滚动提示：滚动超过 100px 后隐藏 =====
    let hintHidden = false;
    window.addEventListener('scroll', () => {
        if (!hintHidden && window.scrollY > 100) {
            hintHidden = true;
            scrollHint.classList.add('hidden');
        } else if (hintHidden && window.scrollY <= 50) {
            hintHidden = false;
            scrollHint.classList.remove('hidden');
        }
    }, { passive: true });
    
    // ===== 导航平滑滚动 =====
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
