// ===== Canvas 银河（高密度震撼版）=====
(function() {
    const canvas = document.getElementById('galaxyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let cx, cy;
    let rotation = 0;
    let targetOpacity = 0;
    let currentOpacity = 0;
    let targetScale = 1;
    let currentScale = 1;
    
    const STARS = 15000;
    const ARMS = 4;
    
    let stars = [];
    let bgStars = []; // 背景弥散星
    
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        cx = width / 2;
        cy = height / 2;
    }
    
    function createStars() {
        stars = [];
        bgStars = [];
        
        // 银河长轴半径（屏幕像素）
        const a = Math.min(width, height) * 0.75;
        const b = a * 0.18; // 更扁
        
        // === 主银河星星 ===
        for (let i = 0; i < STARS; i++) {
            let x, y, size, hue, sat, light, alpha;
            
            // 70% 在旋臂上，30% 弥散
            const onArm = Math.random() < 0.7;
            
            if (onArm) {
                const arm = Math.floor(Math.random() * ARMS);
                const armAngle = (Math.PI * 2 / ARMS) * arm;
                
                // t: 0=中心, 1=边缘
                const t = Math.pow(Math.random(), 0.4); // 更多星在中部
                const radius = t * a;
                
                const spiralTurns = 2.0;
                const angle = armAngle + t * Math.PI * 2 * spiralTurns + (Math.random() - 0.5) * 0.35;
                
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * 0.18;
                
                if (t < 0.08) {
                    // 核球 - 极亮极大
                    size = 2.5 + Math.random() * 4;
                    hue = 20 + Math.random() * 25;
                    sat = 60; light = 90;
                    alpha = 0.95;
                } else if (t < 0.25) {
                    // 内盘 - 亮蓝白
                    size = 1.5 + Math.random() * 2.5;
                    hue = 200 + Math.random() * 30;
                    sat = 55; light = 80;
                    alpha = 0.85;
                } else if (t < 0.55) {
                    // 中盘
                    size = 0.8 + Math.random() * 1.8;
                    hue = 220 + Math.random() * 40;
                    sat = 50; light = 70;
                    alpha = 0.7;
                } else {
                    // 外盘
                    size = 0.4 + Math.random() * 1.2;
                    hue = 240 + Math.random() * 30;
                    sat = 40; light = 60;
                    alpha = 0.55;
                }
            } else {
                // 弥散星
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * a * 0.95;
                x = Math.cos(angle) * r;
                y = Math.sin(angle) * r * 0.18;
                
                const dist = r / a;
                if (dist < 0.12) {
                    size = 2 + Math.random() * 3;
                    hue = 30 + Math.random() * 20;
                    sat = 45; light = 85;
                    alpha = 0.8;
                } else {
                    size = 0.3 + Math.random() * 1.0;
                    hue = 220 + Math.random() * 50;
                    sat = 35; light = 55;
                    alpha = 0.45;
                }
            }
            
            x += (Math.random() - 0.5) * 25;
            y += (Math.random() - 0.5) * 12;
            
            stars.push({
                x, y, size,
                hue, sat, light, alpha,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.2 + Math.random() * 1.5
            });
        }
        
        // === 超亮核心星 500 颗 ===
        for (let i = 0; i < 500; i++) {
            const r = Math.pow(Math.random(), 4) * a * 0.1;
            const angle = Math.random() * Math.PI * 2;
            stars.push({
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r * 0.18,
                size: 3 + Math.random() * 6,
                hue: 10 + Math.random() * 30,
                sat: 50,
                light: 95,
                alpha: 0.98,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.1 + Math.random() * 0.4
            });
        }
        
        // === 背景远星 ===
        for (let i = 0; i < 2000; i++) {
            bgStars.push({
                x: (Math.random() - 0.5) * width * 2,
                y: (Math.random() - 0.5) * height * 2,
                size: 0.3 + Math.random() * 0.8,
                hue: 200 + Math.random() * 60,
                sat: 20 + Math.random() * 30,
                light: 50 + Math.random() * 30,
                alpha: 0.2 + Math.random() * 0.3,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.1 + Math.random() * 0.5
            });
        }
    }
    
    function draw() {
        if (currentOpacity <= 0.005) {
            ctx.clearRect(0, 0, width, height);
            requestAnimationFrame(draw);
            return;
        }
        
        ctx.clearRect(0, 0, width, height);
        
        const time = Date.now() * 0.001;
        rotation += 0.00005;
        currentOpacity += (targetOpacity - currentOpacity) * 0.03;
        currentScale += (targetScale - currentScale) * 0.025;
        
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        
        const scale = currentScale;
        const op = currentOpacity;
        
        // === 1. 银河整体光晕（多层叠加增强亮度）===
        const glowA = Math.min(width, height) * 0.7 * scale;
        const glowB = glowA * 0.22;
        
        // 最外层淡光晕
        const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowA * 1.3);
        outerGlow.addColorStop(0, `rgba(100, 80, 180, ${0.06 * op})`);
        outerGlow.addColorStop(0.5, `rgba(80, 60, 150, ${0.03 * op})`);
        outerGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, glowA * 1.3, glowB * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 盘面光晕
        const diskGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowA);
        diskGlow.addColorStop(0, `rgba(220, 200, 255, ${0.18 * op})`);
        diskGlow.addColorStop(0.2, `rgba(180, 160, 240, ${0.12 * op})`);
        diskGlow.addColorStop(0.5, `rgba(140, 120, 220, ${0.06 * op})`);
        diskGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = diskGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, glowA, glowB, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 中心亮核光晕（橙红色）
        const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowA * 0.12);
        coreGlow.addColorStop(0, `rgba(255, 220, 180, ${0.5 * op})`);
        coreGlow.addColorStop(0.3, `rgba(255, 180, 120, ${0.3 * op})`);
        coreGlow.addColorStop(0.7, `rgba(255, 140, 80, ${0.1 * op})`);
        coreGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, glowA * 0.12, glowB * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // === 2. 画背景远星 ===
        for (let i = 0; i < bgStars.length; i++) {
            const s = bgStars[i];
            const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkle) * 0.5 + 0.5;
            const a = s.alpha * (0.6 + twinkle * 0.4) * op;
            if (a < 0.02) continue;
            
            ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a})`;
            ctx.beginPath();
            ctx.arc(cx + s.x, cy + s.y, Math.max(s.size, 0.3), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // === 3. 画银河主星星 ===
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            
            const rx = s.x * cosR - s.y * sinR;
            const ry = s.x * sinR + s.y * cosR;
            
            const px = cx + rx * scale;
            const py = cy + ry * scale;
            const pSize = s.size * scale;
            
            if (px < -100 || px > width + 100 || py < -100 || py > height + 100) continue;
            
            const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkle) * 0.5 + 0.5;
            const a = s.alpha * (0.5 + twinkle * 0.5) * op;
            if (a < 0.02) continue;
            
            // 大星画光晕
            if (pSize > 1.5) {
                const glowR = pSize * 5;
                const g = ctx.createRadialGradient(px, py, 0, px, py, glowR);
                g.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a * 0.6})`);
                g.addColorStop(0.4, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a * 0.25})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(px, py, glowR, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 星点
            ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a})`;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(pSize, 0.4), 0, Math.PI * 2);
            ctx.fill();
        }
        
        requestAnimationFrame(draw);
    }
    
    window.galaxyCanvas = {
        setOpacity(v) {
            targetOpacity = Math.max(0, Math.min(1, v));
        },
        setScale(s) {
            targetScale = Math.max(0.3, Math.min(8, s));
        },
        init() {
            resize();
            createStars();
            draw();
        }
    };
    
    window.addEventListener('resize', () => {
        resize();
        createStars();
    });
})();
