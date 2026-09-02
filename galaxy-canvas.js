// ===== Canvas 银河（简化版 — 直接画盘面）=====
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
    
    const STARS = 6000; // 总星数
    const ARMS = 4;
    
    let stars = [];
    
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
        // 银河长轴半径（屏幕像素）
        const a = Math.min(width, height) * 0.55;
        const b = a * 0.22; // 短轴（压扁）
        
        for (let i = 0; i < STARS; i++) {
            let x, y, size, hue, sat, light, alpha;
            
            // 50% 在旋臂上，50% 弥散
            const onArm = Math.random() < 0.6;
            
            if (onArm) {
                // 旋臂：对数螺旋
                const arm = Math.floor(Math.random() * ARMS);
                const armAngle = (Math.PI * 2 / ARMS) * arm;
                
                // t: 0=中心, 1=边缘
                const t = Math.pow(Math.random(), 0.5);
                const radius = t * a;
                
                // 螺旋角 = armAngle + 螺旋偏移
                const spiralTurns = 1.8; // 旋臂转几圈
                const angle = armAngle + t * Math.PI * 2 * spiralTurns + (Math.random() - 0.5) * 0.4;
                
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * 0.22; // 压扁
                
                // 旋臂上的星更亮更大
                if (t < 0.1) {
                    // 核球
                    size = 2.0 + Math.random() * 3;
                    hue = 35 + Math.random() * 20;
                    sat = 40; light = 85;
                    alpha = 0.9;
                } else if (t < 0.35) {
                    size = 1.2 + Math.random() * 2;
                    hue = 210 + Math.random() * 20;
                    sat = 50; light = 75;
                    alpha = 0.75;
                } else {
                    size = 0.6 + Math.random() * 1.5;
                    hue = 230 + Math.random() * 30;
                    sat = 45; light = 65;
                    alpha = 0.6;
                }
            } else {
                // 弥散星：椭圆内随机
                const angle = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * a * 0.9;
                x = Math.cos(angle) * r;
                y = Math.sin(angle) * r * 0.22;
                
                const dist = r / a;
                if (dist < 0.15) {
                    size = 1.5 + Math.random() * 2;
                    hue = 40 + Math.random() * 15;
                    sat = 35; light = 80;
                    alpha = 0.7;
                } else {
                    size = 0.3 + Math.random() * 1.0;
                    hue = 220 + Math.random() * 40;
                    sat = 30; light = 55;
                    alpha = 0.4;
                }
            }
            
            // 再添加一些随机抖动
            x += (Math.random() - 0.5) * 30;
            y += (Math.random() - 0.5) * 15;
            
            stars.push({
                x, y, size,
                hue, sat, light, alpha,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.3 + Math.random() * 1.2
            });
        }
        
        // 额外添加 100 颗超亮核心星
        for (let i = 0; i < 100; i++) {
            const r = Math.pow(Math.random(), 3) * a * 0.12;
            const angle = Math.random() * Math.PI * 2;
            stars.push({
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r * 0.22,
                size: 3 + Math.random() * 5,
                hue: 25 + Math.random() * 20,
                sat: 30,
                light: 92,
                alpha: 0.95,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.2 + Math.random() * 0.5
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
        rotation += 0.00008;
        currentOpacity += (targetOpacity - currentOpacity) * 0.025;
        currentScale += (targetScale - currentScale) * 0.02;
        
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        
        // 1. 画银河整体光晕背景
        const glowA = Math.min(width, height) * 0.6 * currentScale;
        const glowB = glowA * 0.25;
        
        // 中心亮核
        const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowA * 0.15);
        coreGlow.addColorStop(0, `rgba(255, 240, 200, ${0.35 * currentOpacity})`);
        coreGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, glowA * 0.15, glowB * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 盘面光晕
        const diskGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowA);
        diskGlow.addColorStop(0, `rgba(200, 180, 255, ${0.12 * currentOpacity})`);
        diskGlow.addColorStop(0.3, `rgba(180, 160, 240, ${0.08 * currentOpacity})`);
        diskGlow.addColorStop(0.7, `rgba(140, 120, 220, ${0.04 * currentOpacity})`);
        diskGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = diskGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, glowA, glowB, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 2. 画所有星星
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            
            // 旋转
            const rx = s.x * cosR - s.y * sinR;
            const ry = s.x * sinR + s.y * cosR;
            
            // 缩放 + 居中
            const px = cx + rx * currentScale;
            const py = cy + ry * currentScale;
            const pSize = s.size * currentScale;
            
            if (px < -50 || px > width + 50 || py < -50 || py > height + 50) continue;
            
            // 闪烁
            const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkle) * 0.5 + 0.5;
            const a = s.alpha * (0.5 + twinkle * 0.5) * currentOpacity;
            if (a < 0.02) continue;
            
            // 大星画光晕
            if (pSize > 1.5) {
                const glowR = pSize * 4;
                const g = ctx.createRadialGradient(px, py, 0, px, py, glowR);
                g.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a * 0.5})`);
                g.addColorStop(0.5, `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a * 0.2})`);
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
            targetScale = Math.max(0.3, Math.min(5, s));
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
