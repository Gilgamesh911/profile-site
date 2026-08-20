// ===== 注册 GSAP 插件 =====
gsap.registerPlugin(ScrollTrigger);

// ===== 导航栏滚动效果 =====
const navbar = document.getElementById('navbar');
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    // 滚动时添加背景
    if (scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScrollY = scrollY;
});

// ===== 移动端菜单 =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// 点击链接后关闭菜单
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// ===== 导航高亮 =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== 回到顶部 =====
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
});

backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== 滚动动画 =====
// fade-up 动画
gsap.utils.toArray('[data-animate="fade-up"]').forEach(el => {
    gsap.from(el, {
        scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power2.out'
    });
});

// fade-in 动画
gsap.utils.toArray('[data-animate="fade-in"]').forEach(el => {
    gsap.from(el, {
        scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
        },
        opacity: 0,
        duration: 1,
        ease: 'power2.out'
    });
});

// slide-left 动画
gsap.utils.toArray('[data-animate="slide-left"]').forEach(el => {
    gsap.from(el, {
        scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            toggleActions: 'play none none none'
        },
        opacity: 0,
        x: -60,
        duration: 0.8,
        ease: 'power2.out'
    });
});

// slide-right 动画
gsap.utils.toArray('[data-animate="slide-right"]').forEach(el => {
    gsap.from(el, {
        scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            toggleActions: 'play none none none'
        },
        opacity: 0,
        x: 60,
        duration: 0.8,
        ease: 'power2.out'
    });
});

// ===== 地图路线动画 =====
const journeyRoute = document.getElementById('journey-route');
if (journeyRoute) {
    const routeLength = journeyRoute.getTotalLength();
    
    gsap.set(journeyRoute, {
        strokeDasharray: routeLength,
        strokeDashoffset: routeLength,
        opacity: 1
    });
    
    gsap.to(journeyRoute, {
        scrollTrigger: {
            trigger: '#map-overview',
            start: 'top 60%',
            end: 'bottom 40%',
            scrub: 1
        },
        strokeDashoffset: 0,
        ease: 'none'
    });
}

// ===== 城市节点脉冲动画 =====
gsap.utils.toArray('.city-node').forEach((node, i) => {
    gsap.to(node, {
        r: 8,
        opacity: 1,
        duration: 0.5,
        delay: i * 0.2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
    });
});

// ===== 经历卡片依次入场 =====
gsap.utils.toArray('.experience-card').forEach((card, i) => {
    gsap.from(card, {
        scrollTrigger: {
            trigger: card,
            start: 'top 90%',
            toggleActions: 'play none none none'
        },
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: i * 0.1,
        ease: 'power2.out'
    });
});

// ===== 技能标签动画 =====
gsap.utils.toArray('.skill-tag').forEach((tag, i) => {
    gsap.from(tag, {
        scrollTrigger: {
            trigger: tag.parentElement,
            start: 'top 85%',
            toggleActions: 'play none none none'
        },
        opacity: 0,
        scale: 0.8,
        duration: 0.4,
        delay: i * 0.05,
        ease: 'back.out(1.7)'
    });
});

// ===== 星辰大海星空背景 =====
function createStars() {
    const container = document.getElementById('stars-canvas');
    if (!container) return;
    
    const starCount = 150;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3}px;
            height: ${Math.random() * 3}px;
            background: white;
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.8 + 0.2};
            animation: twinkle ${Math.random() * 3 + 2}s infinite ease-in-out;
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(star);
    }
}

// 添加闪烁动画样式
const starStyle = document.createElement('style');
starStyle.textContent = `
    @keyframes twinkle {
        0%, 100% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
    }
    .stars-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        z-index: 0;
    }
`;
document.head.appendChild(starStyle);

createStars();

// ===== 星星区块额外效果 =====
const starsSection = document.getElementById('stars');
if (starsSection) {
    // 流星效果
    function createShootingStar() {
        const shootingStar = document.createElement('div');
        shootingStar.style.cssText = `
            position: absolute;
            width: 100px;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent);
            top: ${Math.random() * 50}%;
            left: -100px;
            transform: rotate(-45deg);
            animation: shoot 1s linear forwards;
            z-index: 1;
        `;
        starsSection.appendChild(shootingStar);
        
        setTimeout(() => shootingStar.remove(), 1000);
    }
    
    const shootStyle = document.createElement('style');
    shootStyle.textContent = `
        @keyframes shoot {
            to { left: 120%; top: ${Math.random() * 30 + 50}%; }
        }
    `;
    document.head.appendChild(shootStyle);
    
    // 每 3-8 秒出现一颗流星
    setInterval(createShootingStar, Math.random() * 5000 + 3000);
}

// ===== 鼠标跟随光效（可选）=====
document.addEventListener('mousemove', (e) => {
    const cursor = document.querySelector('.cursor-glow');
    if (!cursor) {
        const newCursor = document.createElement('div');
        newCursor.className = 'cursor-glow';
        newCursor.style.cssText = `
            position: fixed;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%);
            pointer-events: none;
            z-index: 0;
            transform: translate(-50%, -50%);
            transition: left 0.3s, top 0.3s;
        `;
        document.body.appendChild(newCursor);
    }
    
    const glow = document.querySelector('.cursor-glow');
    if (glow) {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    }
});

// ===== 城市节点点击滚动到对应区块 =====
document.querySelectorAll('.city-node').forEach(node => {
    node.addEventListener('click', () => {
        const city = node.getAttribute('data-city');
        const target = document.getElementById(city);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ===== 预加载优化 =====
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

console.log('🚀 徐振洋的个人网站已加载完成');
console.log('🗺️ 空间之路：桐乡 → 成都 → 合肥 → 香港 → 北京');
console.log('⭐ 理想：星辰大海');
