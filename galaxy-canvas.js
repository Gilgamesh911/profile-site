// ===== Three.js 银河粒子系统 =====
(function() {
    const canvas = document.getElementById('galaxyCanvas');
    if (!canvas) return;
    
    let scene, camera, renderer, galaxy, galaxyCore;
    let targetOpacity = 0;
    let currentOpacity = 0;
    let targetCameraZ = 2500;
    let currentCameraZ = 2500;
    let targetRotSpeed = 0.0002;
    let currentRotSpeed = 0.0002;
    let time = 0;
    let isInit = false;
    
    // 配置
    const CONFIG = {
        starCount: 80000,      // 总星数
        coreCount: 1500,       // 核心亮星（减少，更稀疏）
        armCount: 4,           // 旋臂数
        spiralTightness: 3.5,  // 螺旋紧度
        galaxyRadius: 3200,    // 银河半径（更大星盘）
        diskThickness: 50,     // 盘面厚度
        coreRadius: 600,       // 核球半径（更大更分散）
        armSpread: 0.18        // 旋臂宽度
    };
    
    function init() {
        if (isInit) return;
        isInit = true;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // 场景
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.0003);
        
        // 相机
        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
        camera.position.z = currentCameraZ;
        
        // 渲染器
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        
        // 创建银河
        createGalaxy();
        createGalaxyCore();
        createBackgroundStars();
        
        // 开始动画
        animate();
    }
    
    function createGalaxy() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(CONFIG.starCount * 3);
        const colors = new Float32Array(CONFIG.starCount * 3);
        const sizes = new Float32Array(CONFIG.starCount);
        const opacities = new Float32Array(CONFIG.starCount);
        
        const colorCore = new THREE.Color(0xffaa66);  // 核球橙黄
        const colorInner = new THREE.Color(0xffffff); // 内盘白
        const colorMid = new THREE.Color(0xaaccff);   // 中盘蓝白
        const colorOuter = new THREE.Color(0x6688cc); // 外盘蓝
        
        for (let i = 0; i < CONFIG.starCount; i++) {
            let x, y, z, r, angle;
            
            // 80% 在旋臂上，20% 弥散
            const onArm = Math.random() < 0.8;
            
            if (onArm) {
                const arm = Math.floor(Math.random() * CONFIG.armCount);
                const armAngle = (Math.PI * 2 / CONFIG.armCount) * arm;
                
                // t: 0=中心, 1=边缘，更多星在中部
                const t = Math.pow(Math.random(), 0.5); // 更均匀分布到外围
                r = t * CONFIG.galaxyRadius;
                
                // 螺旋角
                const spiralOffset = t * CONFIG.spiralTightness * Math.PI;
                angle = armAngle + spiralOffset;
                
                // 旋臂宽度（高斯分布）
                const armWidth = CONFIG.armSpread * (0.5 + t * 0.5);
                angle += (Math.random() - 0.5) * armWidth;
                
                // 盘面厚度（中心厚，边缘薄）
                const thickness = CONFIG.diskThickness * (1 - t * 0.7);
                z = (Math.random() - 0.5) * thickness;
            } else {
                // 弥散星
                const t = Math.sqrt(Math.random());
                r = t * CONFIG.galaxyRadius * 0.9;
                angle = Math.random() * Math.PI * 2;
                z = (Math.random() - 0.5) * CONFIG.diskThickness * 0.6;
            }
            
            x = Math.cos(angle) * r;
            y = Math.sin(angle) * r;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // 颜色（更丰富）
            const distRatio = r / CONFIG.galaxyRadius;
            const starColor = new THREE.Color();
            const rand = Math.random();
            
            if (distRatio < 0.12) {
                // 核心区域：红、橙、黄、白混合，不纯白
                const coreColors = [
                    new THREE.Color(0xff6644), // 红
                    new THREE.Color(0xffaa44), // 橙
                    new THREE.Color(0xffdd88), // 黄
                    new THREE.Color(0xffeedd), // 淡黄白
                    new THREE.Color(0xffffff), // 白
                ];
                starColor.copy(coreColors[Math.floor(rand * coreColors.length)]);
                starColor.lerp(colorInner, rand * 0.2);
            } else if (distRatio < 0.3) {
                starColor.copy(colorInner);
                starColor.lerp(colorMid, (distRatio - 0.12) / 0.18);
                // 加入一点随机色调
                if (rand < 0.3) starColor.lerp(new THREE.Color(0xffccaa), 0.2);
                if (rand > 0.7) starColor.lerp(new THREE.Color(0xaaddff), 0.2);
            } else if (distRatio < 0.65) {
                starColor.copy(colorMid);
                starColor.lerp(colorOuter, (distRatio - 0.3) / 0.35);
                if (rand < 0.2) starColor.lerp(new THREE.Color(0x88ccff), 0.15);
                if (rand > 0.8) starColor.lerp(new THREE.Color(0xaaffdd), 0.15);
            } else {
                starColor.copy(colorOuter);
                if (rand < 0.3) starColor.lerp(new THREE.Color(0x4466aa), 0.2);
                if (rand > 0.7) starColor.lerp(new THREE.Color(0x6688cc), 0.2);
            }
            
            colors[i * 3] = starColor.r;
            colors[i * 3 + 1] = starColor.g;
            colors[i * 3 + 2] = starColor.b;
            
            // 大小
            if (distRatio < 0.12) {
                sizes[i] = 2.0 + Math.random() * 2.5;
            } else if (distRatio < 0.3) {
                sizes[i] = 1.5 + Math.random() * 2;
            } else {
                sizes[i] = 0.8 + Math.random() * 1.5;
            }
            
            // 透明度基础值
            opacities[i] = 0.6 + Math.random() * 0.4;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));
        
        // 自定义着色器材质
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 },
                uPixelRatio: { value: renderer.getPixelRatio() }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uTime;
                uniform float uPixelRatio;
                
                void main() {
                    vColor = color;
                    vAlpha = alpha;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // 距离衰减
                    float dist = length(mvPosition.xyz);
                    float sizeAtten = 300.0 / dist;
                    
                    // 闪烁
                    float twinkle = sin(uTime * 2.0 + position.x * 0.01 + position.y * 0.01) * 0.3 + 0.7;
                    
                    gl_PointSize = size * sizeAtten * uPixelRatio * twinkle;
                    gl_PointSize = clamp(gl_PointSize, 0.5, 15.0);
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                uniform float uOpacity;
                
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    // 软边缘
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    alpha *= vAlpha * uOpacity;
                    
                    // 中心亮核
                    float core = 1.0 - smoothstep(0.0, 0.15, dist);
                    vec3 finalColor = vColor + vec3(core * 0.3);
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        galaxy = new THREE.Points(geometry, material);
        scene.add(galaxy);
    }
    
    function createGalaxyCore() {
        // 超亮核心星
        const count = CONFIG.coreCount;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const r = Math.pow(Math.random(), 1.8) * CONFIG.coreRadius; // 更分散
            const angle = Math.random() * Math.PI * 2;
            const z = (Math.random() - 0.5) * CONFIG.diskThickness * 0.3;
            
            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = Math.sin(angle) * r;
            positions[i * 3 + 2] = z;
            
            // 核心颜色：红、橙、黄、白混合
            const corePalette = [
                [1.0, 0.4, 0.3], // 红
                [1.0, 0.6, 0.3], // 橙红
                [1.0, 0.8, 0.4], // 橙黄
                [1.0, 0.9, 0.6], // 黄
                [1.0, 1.0, 0.9], // 淡黄白
                [1.0, 1.0, 1.0], // 白
            ];
            const c = corePalette[Math.floor(Math.random() * corePalette.length)];
            colors[i * 3] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];
            
            sizes[i] = 3.0 + Math.random() * 5.0;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 },
                uPixelRatio: { value: renderer.getPixelRatio() }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float uTime;
                uniform float uPixelRatio;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float dist = length(mvPosition.xyz);
                    float sizeAtten = 300.0 / dist;
                    float twinkle = sin(uTime * 1.5 + position.x * 0.05) * 0.2 + 0.8;
                    gl_PointSize = size * sizeAtten * uPixelRatio * twinkle;
                    gl_PointSize = clamp(gl_PointSize, 1.0, 25.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                uniform float uOpacity;
                
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
                    // 强发光
                    float glow = exp(-dist * dist * 8.0);
                    vec3 finalColor = vColor + vec3(glow * 0.5);
                    gl_FragColor = vec4(finalColor, alpha * uOpacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        galaxyCore = new THREE.Points(geometry, material);
        scene.add(galaxyCore);
    }
    
    function createBackgroundStars() {
        const count = 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        
        for (let i = 0; i < count; i++) {
            const r = 2000 + Math.random() * 3000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            
            const brightness = 0.5 + Math.random() * 0.5;
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = brightness + 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const bgStars = new THREE.Points(geometry, material);
        scene.add(bgStars);
    }
    
    function animate() {
        requestAnimationFrame(animate);
        
        time += 0.016;
        
        // 平滑过渡
        currentOpacity += (targetOpacity - currentOpacity) * 0.03;
        currentCameraZ += (targetCameraZ - currentCameraZ) * 0.02;
        currentRotSpeed += (targetRotSpeed - currentRotSpeed) * 0.05;
        
        if (currentOpacity < 0.001 && targetOpacity < 0.001) {
            // 完全隐藏时跳过渲染
            renderer.clear();
            return;
        }
        
        // 旋转银河
        if (galaxy) {
            galaxy.rotation.z += currentRotSpeed;
            galaxy.material.uniforms.uTime.value = time;
            galaxy.material.uniforms.uOpacity.value = currentOpacity;
        }
        if (galaxyCore) {
            galaxyCore.rotation.z += currentRotSpeed * 1.2;
            galaxyCore.material.uniforms.uTime.value = time;
            galaxyCore.material.uniforms.uOpacity.value = currentOpacity;
        }
        
        // 相机位置
        camera.position.z = currentCameraZ;
        
        renderer.render(scene, camera);
    }
    
    function onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    
    window.galaxyCanvas = {
        setOpacity(v) {
            targetOpacity = Math.max(0, Math.min(1, v));
        },
        setCameraZ(z) {
            targetCameraZ = Math.max(50, Math.min(3000, z));
        },
        setRotSpeed(s) {
            targetRotSpeed = Math.max(0, Math.min(0.01, s));
        },
        init() {
            // 检查 Three.js 是否加载
            if (typeof THREE === 'undefined') {
                console.warn('Three.js not loaded, retrying in 500ms...');
                setTimeout(() => this.init(), 500);
                return;
            }
            init();
        }
    };
    
    window.addEventListener('resize', onResize);
})();
