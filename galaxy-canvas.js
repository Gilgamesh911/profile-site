// ===== Canvas 3D 银河粒子系统（修复版）=====
(function() {
    const canvas = document.getElementById('galaxyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let cx, cy;
    let rotation = 0;
    let targetOpacity = 0;
    let currentOpacity = 0;
    let cameraZ = 1500;
    let targetCameraZ = 1500;
    let cameraZoom = 0.4;
    let targetZoom = 0.4;
    
    const FOCAL_LENGTH = 500;
    
    const DISK_PARTICLES = 8000;
    const HALO_PARTICLES = 2000;
    const CORE_STARS = 300;
    
    const ARM_COUNT = 4;
    
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
    
    function createDiskParticles() {
        diskParticles = [];
        const maxR = 900;
        
        for (let i = 0; i < DISK_PARTICLES; i++) {
            const u = Math.random();
            const rNorm = Math.pow(u, 0.35);
            const r = rNorm * maxR;
            
            const onArm = Math.random() < 0.75 && r > 30;
            let theta;
            
            if (onArm) {
                const armIndex = Math.floor(Math.random() * ARM_COUNT);
                const armBase = (Math.PI * 2 / ARM_COUNT) * armIndex;
                const spiralAngle = Math.log(Math.max(r, 10) / 20) / 0.25;
                theta = armBase + spiralAngle + (Math.random() - 0.5) * 0.35;
            } else {
                theta = Math.random() * Math.PI * 2;
            }
            
            const thickness = 50 * (1 - rNorm * 0.6);
            const z = (Math.random() - 0.5) * thickness;
            
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r * 0.35;
            
            let hue, sat, light, size, alphaBase;
            if (rNorm < 0.06) {
                // 核球：金黄/暖白
                hue = 30 + Math.random() * 30;
                sat = 50 + Math.random() * 40;
                light = 80 + Math.random() * 20;
                size = (3 + Math.random() * 4) * 2.5;
                alphaBase = 0.9 + Math.random() * 0.1;
            } else if (rNorm < 0.2) {
                // 内盘：亮蓝白
                hue = 200 + Math.random() * 25;
                sat = 40 + Math.random() * 35;
                light = 70 + Math.random() * 25;
                size = (2 + Math.random() * 3) * 2.5;
                alphaBase = 0.7 + Math.random() * 0.3;
            } else if (rNorm < 0.5) {
                // 中盘：蓝紫
                hue = 220 + Math.random() * 35;
                sat = 35 + Math.random() * 35;
                light = 60 + Math.random() * 25;
                size = (1.2 + Math.random() * 2) * 2.5;
                alphaBase = 0.5 + Math.random() * 0.4;
            } else {
                // 外盘：深紫/蓝
                hue = 240 + Math.random() * 50;
                sat = 30 + Math.random() * 30;
                light = 50 + Math.random() * 25;
                size = (0.6 + Math.random() * 1.2) * 2.5;
                alphaBase = 0.3 + Math.random() * 0.4;
            }
            
            diskParticles.push({
                x, y, z, r,
                size,
                hue, sat, light,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.3 + Math.random() * 1.5,
                baseAlpha: alphaBase,
                onArm
            });
        }
    }
    
    function createHaloParticles() {
        haloParticles = [];
        for (let i = 0; i < HALO_PARTICLES; i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            const r = 150 + Math.random() * 1200;
            
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta) * 0.5;
            const z = r * Math.cos(phi) * 0.5;
            
            haloParticles.push({
                x, y, z, r,
                size: (0.4 + Math.random() * 0.8) * 2.5,
                hue: 220 + Math.random() * 50,
                sat: 25 + Math.random() * 30,
                light: 45 + Math.random() * 25,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.2 + Math.random() * 1.0,
                baseAlpha: 0.25 + Math.random() * 0.35
            });
        }
    }
    
    function createCoreStars() {
        coreStars = [];
        for (let i = 0; i < CORE_STARS; i++) {
            const r = Math.pow(Math.random(), 2.5) * 100;
            const theta = Math.random() * Math.PI * 2;
            const x = Math.cos(theta) * r;
            const y = Math.sin(theta) * r * 0.3;
            const z = (Math.random() - 0.5) * 25;
            
            coreStars.push({
                x, y, z,
                size: (3 + Math.random() * 5) * 2.5,
                hue: 25 + Math.random() * 30,
                sat: 40 + Math.random() * 40,
                light: 85 + Math.random() * 15,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.2 + Math.random() * 0.8,
                baseAlpha: 0.85 + Math.random() * 0.15
            });
        }
    }
    
    function project(x, y, z) {
        const dist = FOCAL_LENGTH + z + cameraZ;
        if (dist <= 10) return { visible: false };
        const scale = FOCAL_LENGTH / dist;
        const finalScale = scale * cameraZoom;
        return {
            x: cx + x * finalScale,
            y: cy + y * finalScale,
            scale: finalScale,
            visible: true
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
        rotation += 0.00012;
        
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        
        currentOpacity += (targetOpacity - currentOpacity) * 0.025;
        cameraZ += (targetCameraZ - cameraZ) * 0.015;
        cameraZoom += (targetZoom - cameraZoom) * 0.015;
        
        // 银河整体光晕
        const glowR = Math.min(width, height) * 0.55;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        glow.addColorStop(0, `rgba(255, 235, 200, ${0.18 * currentOpacity})`);
        glow.addColorStop(0.08, `rgba(255, 220, 180, ${0.14 * currentOpacity})`);
        glow.addColorStop(0.2, `rgba(200, 180, 255, ${0.10 * currentOpacity})`);
        glow.addColorStop(0.45, `rgba(160, 140, 240, ${0.06 * currentOpacity})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        
        // 旋臂光晕
        const maxR = 900;
        for (let arm = 0; arm < ARM_COUNT; arm++) {
            const armAngle = (Math.PI * 2 / ARM_COUNT) * arm + rotation;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(armAngle);
            ctx.scale(1, 0.35);
            
            const armGrad = ctx.createRadialGradient(0, 0, 30, 0, 0, maxR * 0.8);
            armGrad.addColorStop(0, `rgba(200, 180, 255, ${0.06 * currentOpacity})`);
            armGrad.addColorStop(0.3, `rgba(180, 160, 240, ${0.04 * currentOpacity})`);
            armGrad.addColorStop(0.7, `rgba(140, 120, 220, ${0.02 * currentOpacity})`);
            armGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = armGrad;
            ctx.beginPath();
            ctx.arc(0, 0, maxR * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // 绘制粒子（晕 → 盘 → 核心）
        drawParticleBatch(haloParticles, time, cosR, sinR, false);
        drawParticleBatch(diskParticles, time, cosR, sinR, true);
        drawParticleBatch(coreStars, time, cosR, sinR, true);
        
        requestAnimationFrame(draw);
    }
    
    function drawParticleBatch(particles, time, cosR, sinR, useGlow) {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            const rx = p.x * cosR - p.z * sinR;
            const rz = p.x * sinR + p.z * cosR;
            
            const proj = project(rx, p.y, rz);
            if (!proj.visible) continue;
            if (proj.x < -100 || proj.x > width + 100 || proj.y < -100 || proj.y > height + 100) continue;
            
            const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.5 + 0.5;
            const alpha = p.baseAlpha * (0.5 + twinkle * 0.5) * currentOpacity;
            if (alpha < 0.01) continue;
            
            const s = p.size * proj.scale;
            if (s < 0.15) continue;
            
            // 光晕
            if (useGlow && s > 1.0) {
                const glowSize = s * 3.5;
                const g = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowSize);
                g.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, ${Math.min(100, p.light + 10)}%, ${alpha * 0.4})`);
                g.addColorStop(0.4, `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.15})`);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 核心
            ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, Math.max(s, 0.3), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    window.galaxyCanvas = {
        setOpacity(v) {
            targetOpacity = Math.max(0, Math.min(1, v));
        },
        setCameraZ(z) {
            targetCameraZ = Math.max(200, Math.min(2500, z));
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
