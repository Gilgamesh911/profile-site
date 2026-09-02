// ===== Canvas 3D 银河粒子系统（增强版）=====
(function() {
    const canvas = document.getElementById('galaxyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let cx, cy;
    let rotation = 0;
    let targetOpacity = 0;
    let currentOpacity = 0;
    let cameraZ = 2000;   // 相机z位置（从远处飞入）
    let targetCameraZ = 2000;
    let cameraZoom = 1;   // 额外缩放
    let targetZoom = 1;
    
    const FOCAL_LENGTH = 600; // 透视焦距
    
    // 三层粒子系统
    const DISK_PARTICLES = 10000;    // 银河盘粒子
    const HALO_PARTICLES = 3000;     // 弥散晕粒子
    const CORE_STARS = 200;          // 核心极亮星
    
    const ARM_COUNT = 5;
    const ARM_TWIST = 2.5; // 旋臂扭转圈数
    
    let diskParticles = [];
    let haloParticles = [];
    let coreStars = [];
    
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        cx = width / 2;
        cy = height / 2;
    }
    
    // 对数螺旋参数方程
    function logSpiral(theta, a, b) {
        return a * Math.exp(b * theta);
    }
    
    function createDiskParticles() {
        diskParticles = [];
        const maxR = 1200; // 银河盘半径
        
        for (let i = 0; i < DISK_PARTICLES; i++) {
            // 使用幂律分布：更多粒子在中心
            const u = Math.random();
            const rNorm = Math.pow(u, 0.4); // 0.4 幂律让中心更密集
            const r = rNorm * maxR;
            
            // 决定是旋臂粒子还是弥散粒子
            const onArm = Math.random() < 0.7;
            let theta;
            
            if (onArm && r > 50) {
                // 旋臂粒子 — 对数螺旋
                const armIndex = Math.floor(Math.random() * ARM_COUNT);
                const armBase = (Math.PI * 2 / ARM_COUNT) * armIndex;
                // 根据半径计算螺旋角
                const spiralAngle = Math.log(r / 30) / 0.2; // b ≈ 0.2
                theta = armBase + spiralAngle + (Math.random() - 0.5) * 0.5;
            } else {
                // 弥散粒子
                theta = Math.random() * Math.PI * 2;
            }
            
            // 盘厚度：中心厚、外围薄
            const thickness = 40 * (1 - rNorm * 0.7);
            const z = (Math.random() - 0.5) * thickness;
            
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r * 0.3; // y轴压扁形成盘面
            
            // 颜色根据距离中心
            let hue, sat, light, size;
            if (rNorm < 0.08) {
                // 核球：暖白/金黄
                hue = 35 + Math.random() * 25;
                sat = 40 + Math.random() * 40;
                light = 75 + Math.random() * 25;
                size = 1.8 + Math.random() * 2.5;
            } else if (rNorm < 0.25) {
                // 内盘：蓝白
                hue = 200 + Math.random() * 30;
                sat = 30 + Math.random() * 30;
                light = 65 + Math.random() * 25;
                size = 1.2 + Math.random() * 1.5;
            } else if (rNorm < 0.6) {
                // 中盘：蓝紫
                hue = 220 + Math.random() * 40;
                sat = 40 + Math.random() * 30;
                light = 55 + Math.random() * 25;
                size = 0.8 + Math.random() * 1.2;
            } else {
                // 外盘：深紫
                hue = 250 + Math.random() * 50;
                sat = 30 + Math.random() * 30;
                light = 45 + Math.random() * 25;
                size = 0.5 + Math.random() * 0.8;
            }
            
            diskParticles.push({
                x, y, z, r,
                size,
                hue, sat, light,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.3 + Math.random() * 1.5,
                baseAlpha: 0.4 + Math.random() * 0.6,
                onArm: onArm
            });
        }
    }
    
    function createHaloParticles() {
        haloParticles = [];
        // 球状弥散晕
        for (let i = 0; i < HALO_PARTICLES; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = 200 + Math.random() * 1500;
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta) * 0.5; // 压扁
            const z = r * Math.cos(phi) * 0.5;
            
            const size = 0.3 + Math.random() * 0.8;
            const hue = 220 + Math.random() * 60;
            const sat = 20 + Math.random() * 30;
            const light = 40 + Math.random() * 30;
            
            haloParticles.push({
                x, y, z, r,
                size, hue, sat, light,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.2 + Math.random() * 1.0,
                baseAlpha: 0.2 + Math.random() * 0.4
            });
        }
    }
    
    function createCoreStars() {
        coreStars = [];
        // 核心极亮星团
        for (let i = 0; i < CORE_STARS; i++) {
            const r = Math.pow(Math.random(), 3) * 80; // 极集中在中心
            const theta = Math.random() * Math.PI * 2;
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r * 0.3;
            const z = (Math.random() - 0.5) * 20;
            
            coreStars.push({
                x, y, z,
                size: 2.5 + Math.random() * 4,
                hue: 30 + Math.random() * 30, // 金黄
                sat: 30 + Math.random() * 30,
                light: 85 + Math.random() * 15,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.2 + Math.random() * 0.8,
                baseAlpha: 0.8 + Math.random() * 0.2
            });
        }
    }
    
    // 3D到2D投影
    function project(x, y, z) {
        const scale = FOCAL_LENGTH / (FOCAL_LENGTH + z + cameraZ);
        // 应用相机额外缩放（滚动飞入效果）
        const finalScale = scale * cameraZoom;
        return {
            x: cx + x * finalScale,
            y: cy + y * finalScale,
            scale: finalScale,
            visible: z + cameraZ > -FOCAL_LENGTH * 0.5 // 不渲染太近/后面的粒子
        };
    }
    
    function draw() {
        if (currentOpacity <= 0.001) {
            ctx.clearRect(0, 0, width, height);
            requestAnimationFrame(draw);
            return;
        }
        
        ctx.clearRect(0, 0, width, height);
        
        const time = Date.now() * 0.001;
        rotation += 0.00015; // 缓慢旋转
        
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        
        // 缓动参数
        currentOpacity += (targetOpacity - currentOpacity) * 0.03;
        cameraZ += (targetCameraZ - cameraZ) * 0.02;
        cameraZoom += (targetZoom - cameraZoom) * 0.02;
        
        // 绘制顺序：远到近
        // 1. 背景光晕
        drawGalaxyGlow();
        
        // 2. 晕粒子
        drawParticleLayer(haloParticles, time, cosR, sinR, false);
        
        // 3. 盘粒子
        drawParticleLayer(diskParticles, time, cosR, sinR, true);
        
        // 4. 核心亮星（最后画，在最上层）
        drawParticleLayer(coreStars, time, cosR, sinR, true);
        
        requestAnimationFrame(draw);
    }
    
    function drawGalaxyGlow() {
        // 银河整体光晕
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.5);
        glow.addColorStop(0, `rgba(255, 240, 220, ${0.12 * currentOpacity})`);
        glow.addColorStop(0.15, `rgba(200, 180, 255, ${0.08 * currentOpacity})`);
        glow.addColorStop(0.4, `rgba(160, 140, 240, ${0.04 * currentOpacity})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
    }
    
    function drawParticleLayer(particles, time, cosR, sinR, useGlow) {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // 旋转
            const rx = p.x * cosR - p.z * sinR; // 绕y轴旋转（从上方俯视）
            const rz = p.x * sinR + p.z * cosR;
            
            // 投影
            const proj = project(rx, p.y, rz);
            if (!proj.visible) continue;
            if (proj.x < -50 || proj.x > width + 50 || proj.y < -50 || proj.y > height + 50) continue;
            
            // 闪烁
            const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.5 + 0.5;
            const alpha = p.baseAlpha * (0.5 + twinkle * 0.5) * currentOpacity;
            if (alpha < 0.01) continue;
            
            const s = p.size * proj.scale;
            if (s < 0.1) continue;
            
            // 光晕（大粒子）
            if (useGlow && s > 0.8) {
                const glowSize = s * (2 + Math.random() * 2);
                const g = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowSize);
                g.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.5})`);
                g.addColorStop(0.5, `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.15})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 核心点
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, Math.max(s, 0.3), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // 暴露接口
    window.galaxyCanvas = {
        setOpacity(v) {
            targetOpacity = Math.max(0, Math.min(1, v));
        },
        setCameraZ(z) {
            targetCameraZ = Math.max(50, Math.min(3000, z));
        },
        setZoom(zoom) {
            targetZoom = Math.max(0.3, Math.min(5, zoom));
        },
        init() {
            resize();
            createDiskParticles();
            createHaloParticles();
            createCoreStars();
            draw();
        }
    };
    
    window.addEventListener('resize', () => {
        resize();
        createDiskParticles();
        createHaloParticles();
        createCoreStars();
    });
})();
