// ===== Canvas 银河粒子系统 =====
(function() {
    const canvas = document.getElementById('galaxyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let cx, cy;
    let rotation = 0;
    let targetOpacity = 0;
    let currentOpacity = 0;
    
    const PARTICLE_COUNT = 4000;
    const ARM_COUNT = 3;
    const ARM_SPREAD = 0.3;
    const GALAXY_RADIUS = 0.45; // relative to min(width, height)
    
    const particles = [];
    
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        cx = width / 2;
        cy = height / 2;
    }
    
    function createParticles() {
        particles.length = 0;
        const maxR = Math.min(width, height) * GALAXY_RADIUS;
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            let r, theta, armIndex;
            
            // 70% 粒子在旋臂上，30% 弥散分布
            if (Math.random() < 0.7) {
                // 旋臂粒子
                armIndex = Math.floor(Math.random() * ARM_COUNT);
                const armOffset = (Math.PI * 2 / ARM_COUNT) * armIndex;
                // 对数螺旋: theta 从 0 到 多圈
                const t = Math.pow(Math.random(), 0.7); // 更多粒子在外围
                theta = t * Math.PI * 5 + armOffset + (Math.random() - 0.5) * ARM_SPREAD;
                r = t * maxR * (0.3 + Math.random() * 0.7);
            } else {
                // 弥散粒子（中心核球区域）
                const t = Math.pow(Math.random(), 2); // 更多在中心
                theta = Math.random() * Math.PI * 2;
                r = t * maxR * 0.5;
            }
            
            // 中心更密集
            const distNorm = r / maxR;
            
            // 颜色：中心白/黄 -> 中间蓝白 -> 外围蓝紫
            let hue, sat, light;
            if (distNorm < 0.15) {
                // 核心：暖白/淡黄
                hue = 40 + Math.random() * 20;
                sat = 30 + Math.random() * 40;
                light = 80 + Math.random() * 20;
            } else if (distNorm < 0.5) {
                // 中间：蓝白
                hue = 200 + Math.random() * 40;
                sat = 40 + Math.random() * 30;
                light = 70 + Math.random() * 25;
            } else {
                // 外围：蓝紫
                hue = 230 + Math.random() * 60;
                sat = 50 + Math.random() * 30;
                light = 50 + Math.random() * 30;
            }
            
            // 粒子大小：中心大，外围小
            const sizeBase = distNorm < 0.1 ? 2.5 : (distNorm < 0.3 ? 1.8 : 1.0);
            const size = sizeBase * (0.5 + Math.random());
            
            particles.push({
                x: Math.cos(theta) * r,
                y: Math.sin(theta) * r * 0.35, // 压扁成盘状
                r: r,
                theta: theta,
                size: size,
                hue, sat, light,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.5 + Math.random() * 2,
                baseAlpha: 0.3 + Math.random() * 0.7,
            });
        }
        
        // 添加一些特别亮的星（中心区域）
        for (let i = 0; i < 80; i++) {
            const t = Math.pow(Math.random(), 3);
            const theta = Math.random() * Math.PI * 2;
            const r = t * maxR * 0.25;
            particles.push({
                x: Math.cos(theta) * r,
                y: Math.sin(theta) * r * 0.35,
                r: r,
                theta: theta,
                size: 2.5 + Math.random() * 2,
                hue: 30 + Math.random() * 30,
                sat: 20 + Math.random() * 30,
                light: 85 + Math.random() * 15,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.3 + Math.random() * 1,
                baseAlpha: 0.8 + Math.random() * 0.2,
            });
        }
    }
    
    function draw() {
        if (currentOpacity <= 0.001) {
            ctx.clearRect(0, 0, width, height);
            requestAnimationFrame(draw);
            return;
        }
        
        ctx.clearRect(0, 0, width, height);
        
        const time = Date.now() * 0.001;
        rotation += 0.0003;
        
        // 先画一个柔和的银河底色光晕
        const maxR = Math.min(width, height) * GALAXY_RADIUS;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.2);
        gradient.addColorStop(0, `hsla(40, 60%, 80%, ${0.08 * currentOpacity})`);
        gradient.addColorStop(0.2, `hsla(220, 50%, 70%, ${0.06 * currentOpacity})`);
        gradient.addColorStop(0.5, `hsla(240, 40%, 60%, ${0.04 * currentOpacity})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 绘制旋臂光晕
        for (let arm = 0; arm < ARM_COUNT; arm++) {
            const armAngle = (Math.PI * 2 / ARM_COUNT) * arm + rotation;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(armAngle);
            ctx.scale(1, 0.35);
            
            const armGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR);
            armGrad.addColorStop(0, `hsla(220, 40%, 75%, ${0.05 * currentOpacity})`);
            armGrad.addColorStop(0.5, `hsla(240, 30%, 65%, ${0.03 * currentOpacity})`);
            armGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = armGrad;
            ctx.beginPath();
            ctx.arc(0, 0, maxR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // 绘制粒子
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // 旋转
            const rx = p.x * cosR - p.y * sinR;
            const ry = p.x * sinR + p.y * cosR;
            
            const px = cx + rx;
            const py = cy + ry;
            
            // 跳过屏幕外的粒子
            if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;
            
            // 闪烁
            const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.5 + 0.5;
            const alpha = p.baseAlpha * (0.4 + twinkle * 0.6) * currentOpacity;
            
            if (alpha < 0.02) continue;
            
            const s = p.size;
            
            // 大粒子画光晕
            if (s > 1.5) {
                const glow = ctx.createRadialGradient(px, py, 0, px, py, s * 3);
                glow.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.6})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(px, py, s * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 核心亮点
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, s, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 缓动 opacity
        currentOpacity += (targetOpacity - currentOpacity) * 0.03;
        
        requestAnimationFrame(draw);
    }
    
    // 暴露接口
    window.galaxyCanvas = {
        setOpacity(v) {
            targetOpacity = Math.max(0, Math.min(1, v));
        },
        init() {
            resize();
            createParticles();
            draw();
        }
    };
    
    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });
})();
