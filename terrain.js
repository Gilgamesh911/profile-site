// ===== 3D 中国地形探索场景 =====

class TerrainExplorer {
    constructor() {
        this.canvas = document.getElementById('terrain-canvas');
        if (!this.canvas) return;
        
        // ===== 场景 =====
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe8e0d0);
        this.scene.fog = new THREE.Fog(0xe8e0d0, 80, 250);
        
        // ===== 相机 =====
        this.camera = new THREE.PerspectiveCamera(
            45, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            2000
        );
        
        // ===== 渲染器 =====
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // ===== 光照 =====
        this.setupLighting();
        
        // ===== 地形数据 =====
        this.terrainSize = 200;
        this.terrainHeight = 55;
        this.cities = {
            tongxiang: { lng: 120.56, lat: 30.63, name: '桐乡', pixel: [365, 224], elementId: 'tongxiang', idx: 0, elevation: 25 },
            chengdu:   { lng: 104.06, lat: 30.67, name: '成都', pixel: [246, 224], elementId: 'chengdu', idx: 1, elevation: 39 },
            hefei:     { lng: 117.23, lat: 31.82, name: '合肥', pixel: [341, 213], elementId: 'hefei', idx: 2, elevation: 26 },
            hongkong:  { lng: 114.17, lat: 22.32, name: '香港', pixel: [319, 300], elementId: 'hongkong', idx: 3, elevation: 27 },
            beijing:   { lng: 116.40, lat: 39.90, name: '北京', pixel: [335, 139], elementId: 'beijing', idx: 4, elevation: 29 }
        };
        
        // ===== 状态 =====
        this.isLoaded = false;
        this.scrollProgress = 0;
        this.cityMarkers = [];
        this.routeLine = null;
        this.cameraPath = null;
        this.terrainMesh = null;
        
        // ===== 交互 =====
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-999, -999);
        this.hoveredCity = null;
        this.isDragging = false;
        
        // ===== 场景分组 =====
        this.terrainGroup = new THREE.Group();
        this.scene.add(this.terrainGroup);
        
        this.spaceGroup = new THREE.Group();
        this.spaceGroup.visible = false;
        this.scene.add(this.spaceGroup);
        
        // ===== 初始化 =====
        this.init();
    }
    
    setupLighting() {
        // 主光源
        this.mainLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
        this.mainLight.position.set(50, 100, 50);
        this.mainLight.castShadow = true;
        this.mainLight.shadow.mapSize.width = 2048;
        this.mainLight.shadow.mapSize.height = 2048;
        this.mainLight.shadow.camera.near = 0.5;
        this.mainLight.shadow.camera.far = 500;
        this.mainLight.shadow.camera.left = -150;
        this.mainLight.shadow.camera.right = 150;
        this.mainLight.shadow.camera.top = 150;
        this.mainLight.shadow.camera.bottom = -150;
        this.scene.add(this.mainLight);
        
        // 补光
        const fillLight = new THREE.DirectionalLight(0xd4e5f7, 0.4);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);
        
        // 环境光
        this.ambientLight = new THREE.AmbientLight(0xf0e6d3, 0.5);
        this.scene.add(this.ambientLight);
    }
    
    async init() {
        try {
            await this.loadTerrain();
            this.createCityMarkers();
            this.createRouteLine();
            this.createSpaceScene();
            this.setupScrollAnimation();
            this.setupMouseInteraction();
            this.setupCityInteraction();
            this.setInitialCamera();
            this.animate();
            this.hideLoadingScreen();
        } catch (e) {
            console.error('地形加载失败:', e);
            this.createFallbackTerrain();
        }
    }
    
    // ===== 初始相机：俯瞰全图 =====
    setInitialCamera() {
        // 从高处俯瞰整个地形
        this.camera.position.set(0, 140, 160);
        this.camera.lookAt(0, 0, 0);
    }
    
    // ===== 加载地形 =====
    async loadTerrain() {
        const loader = new THREE.TextureLoader();
        
        // 同时加载高度图和纹理图
        const [heightMap, albedoMap] = await Promise.all([
            new Promise((resolve, reject) => {
                loader.load('assets/terrain/chengdu_dem.png', resolve, undefined, reject);
            }),
            new Promise((resolve, reject) => {
                loader.load('assets/terrain/china_albedo.png', resolve, undefined, reject);
            })
        ]);
        
        const image = heightMap.image;
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const pixels = imageData.data;
        
        const segments = 256;
        const geometry = new THREE.PlaneGeometry(
            this.terrainSize, 
            this.terrainSize, 
            segments, 
            segments
        );
        
        const positions = geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            
            const u = (x / this.terrainSize + 0.5);
            const v = (-y / this.terrainSize + 0.5);
            
            const px = Math.floor(u * (image.width - 1));
            const py = Math.floor(v * (image.height - 1));
            const idx = (py * image.width + px) * 4;
            
            const height = pixels[idx] / 255;
            positions.setZ(i, height * this.terrainHeight);
        }
        
        geometry.computeVertexNormals();
        
        // 使用真实卫星纹理作为表面贴图
        const material = new THREE.MeshStandardMaterial({
            map: albedoMap,
            roughness: 0.85,
            metalness: 0.0,
            flatShading: false,
        });
        
        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.rotation.x = -Math.PI / 2;
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.castShadow = true;
        this.terrainGroup.add(this.terrainMesh);
        
        // 纸质纹理叠加
        this.addPaperTexture();
        
        this.isLoaded = true;
    }
    
    addPaperTexture() {
        const size = 512;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < size * size; i++) {
            const v = Math.random() * 20 + 235;
            data[i * 4] = v;
            data[i * 4 + 1] = v - 5;
            data[i * 4 + 2] = v - 15;
            data[i * 4 + 3] = 15;
        }
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        const overlayGeo = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize);
        const overlayMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
        });
        const overlay = new THREE.Mesh(overlayGeo, overlayMat);
        overlay.rotation.x = -Math.PI / 2;
        overlay.position.y = 0.1;
        this.terrainGroup.add(overlay);
    }
    
    // ===== 城市标记 =====
    createCityMarkers() {
        const markerGeo = new THREE.CylinderGeometry(0.8, 0.8, 3, 16);
        const markerMat = new THREE.MeshStandardMaterial({
            color: 0xc17817,
            emissive: 0xc17817,
            emissiveIntensity: 0.3,
            roughness: 0.4,
        });
        
        Object.entries(this.cities).forEach(([key, city]) => {
            const group = new THREE.Group();
            
            // 标记柱
            const marker = new THREE.Mesh(markerGeo, markerMat.clone());
            marker.userData = { cityKey: key, type: 'marker' };
            
            const u = city.pixel[0] / 505;
            const v = city.pixel[1] / 505;
            const x = (u - 0.5) * this.terrainSize;
            const z = (v - 0.5) * this.terrainSize;
            
            marker.position.set(x, city.elevation + 3, z);
            marker.castShadow = true;
            group.add(marker);
            
            // 发光环
            const ringGeo = new THREE.RingGeometry(2, 2.5, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xc17817,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(x, city.elevation + 0.5, z);
            group.add(ring);
            
            // 标签（小牌子）
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 128;
            labelCanvas.height = 64;
            const lctx = labelCanvas.getContext('2d');
            lctx.fillStyle = 'rgba(232, 224, 208, 0.9)';
            lctx.fillRect(0, 0, 128, 64);
            lctx.strokeStyle = '#c17817';
            lctx.lineWidth = 2;
            lctx.strokeRect(2, 2, 124, 60);
            lctx.fillStyle = '#2c2416';
            lctx.font = 'bold 20px "Noto Serif SC", serif';
            lctx.textAlign = 'center';
            lctx.fillText(city.name, 64, 40);
            
            const labelTex = new THREE.CanvasTexture(labelCanvas);
            const labelGeo = new THREE.PlaneGeometry(8, 4);
            const labelMat = new THREE.MeshBasicMaterial({
                map: labelTex,
                transparent: true,
                side: THREE.DoubleSide,
            });
            const label = new THREE.Mesh(labelGeo, labelMat);
            label.position.set(x, city.elevation + 10, z);
            label.userData = { cityKey: key, type: 'label' };
            group.add(label);
            
            this.terrainGroup.add(group);
            this.cityMarkers.push({ marker, ring, label, city, key, group });
        });
    }
    
    // ===== 路线 =====
    createRouteLine() {
        const routePoints = [
            this.cities.tongxiang,
            this.cities.chengdu,
            this.cities.hefei,
            this.cities.hongkong,
            this.cities.beijing,
        ];
        
        const points = routePoints.map(city => {
            const u = city.pixel[0] / 505;
            const v = city.pixel[1] / 505;
            return new THREE.Vector3(
                (u - 0.5) * this.terrainSize,
                city.elevation + 5,
                (v - 0.5) * this.terrainSize
            );
        });
        
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.3, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0xc17817,
            emissive: 0xc17817,
            emissiveIntensity: 0.2,
            roughness: 0.6,
        });
        
        this.routeLine = new THREE.Mesh(tubeGeo, tubeMat);
        this.terrainGroup.add(this.routeLine);
        this.cameraPath = curve;
    }
    
    // ===== 太空场景 =====
    createSpaceScene() {
        // 地球
        const earthGeo = new THREE.SphereGeometry(60, 64, 64);
        const earthTex = this.createEarthTexture();
        const earthMat = new THREE.MeshStandardMaterial({
            map: earthTex,
            roughness: 0.7,
            metalness: 0.1,
        });
        this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
        this.spaceGroup.add(this.earthMesh);
        
        // 大气层光晕
        const atmoGeo = new THREE.SphereGeometry(65, 64, 64);
        const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x4a90d9,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide,
        });
        this.atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
        this.spaceGroup.add(this.atmosphere);
        
        // 星空
        this.createStarField();
        
        // 初始位置：地球在远处
        this.spaceGroup.position.set(0, -200, -400);
    }
    
    createEarthTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 海洋
        ctx.fillStyle = '#0d2137';
        ctx.fillRect(0, 0, 512, 256);
        
        // 大陆（简化版）
        const continents = [
            {x: 80, y: 70, rx: 90, ry: 70},   // 亚洲
            {x: 180, y: 110, rx: 50, ry: 60}, // 中国/东亚
            {x: 250, y: 140, rx: 35, ry: 45}, // 东南亚
            {x: 340, y: 90, rx: 55, ry: 45},  // 北美
            {x: 400, y: 150, rx: 45, ry: 55}, // 南美
            {x: 430, y: 70, rx: 40, ry: 35},  // 欧洲
            {x: 445, y: 120, rx: 30, ry: 40}, // 非洲
            {x: 20, y: 160, rx: 45, ry: 35},  // 澳洲
        ];
        
        continents.forEach(c => {
            const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(c.rx, c.ry));
            grad.addColorStop(0, '#2d5a1e');
            grad.addColorStop(0.4, '#4a7c2a');
            grad.addColorStop(0.7, '#6b8e3a');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 云层
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 30; i++) {
            const cx = Math.random() * 512;
            const cy = Math.random() * 256;
            const cr = Math.random() * 30 + 10;
            const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
            cloudGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
            cloudGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = cloudGrad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, cr, cr * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }
    
    createStarField() {
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 800 + Math.random() * 400;
            
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            
            sizes[i] = Math.random() * 2 + 0.5;
        }
        
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
        });
        
        this.starField = new THREE.Points(starGeo, starMat);
        this.spaceGroup.add(this.starField);
    }
    
    // ===== 滚动动画 =====
    setupScrollAnimation() {
        gsap.registerPlugin(ScrollTrigger);
        
        this.scrollTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.content-layer',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
                onUpdate: (self) => {
                    this.scrollProgress = self.progress;
                    this.updateScene();
                }
            }
        });
    }
    
    // ===== 场景更新：根据滚动进度切换地形/太空 =====
    updateScene() {
        const p = this.scrollProgress;
        
        if (p < 0.82) {
            // 地形模式
            this.terrainGroup.visible = true;
            this.spaceGroup.visible = false;
            this.scene.background = new THREE.Color(0xe8e0d0);
            this.scene.fog = new THREE.Fog(0xe8e0d0, 80, 250);
            this.mainLight.intensity = 1.0;
            this.ambientLight.intensity = 0.5;
            this.updateTerrainCamera(p);
            this.updateCoordinates();
        } else {
            // 太空过渡
            const t = Math.min((p - 0.82) / 0.18, 1);
            this.updateSpaceTransition(t);
        }
    }
    
    // ===== 地形相机 =====
    updateTerrainCamera(progress) {
        if (!this.cameraPath) return;
        
        // 封面阶段（progress < 0.12）：固定俯瞰全图
        if (progress < 0.12) {
            const overviewPos = new THREE.Vector3(0, 140, 160);
            this.camera.position.lerp(overviewPos, 0.05);
            this.camera.lookAt(0, 10, 0);
            return;
        }
        
        // 正常浏览阶段：沿路径飞行
        const pathProgress = (progress - 0.12) / 0.88; // 映射到 0-1
        const point = this.cameraPath.getPointAt(Math.min(pathProgress, 0.99));
        
        const targetPos = new THREE.Vector3(
            point.x,
            point.y + 30 + Math.sin(pathProgress * Math.PI) * 20,
            point.z + 40
        );
        
        this.camera.position.lerp(targetPos, 0.05);
        
        const lookAtPoint = this.cameraPath.getPointAt(Math.min(pathProgress + 0.05, 0.99));
        this.camera.lookAt(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z);
    }
    
    // ===== 太空过渡 =====
    updateSpaceTransition(t) {
        // t: 0 = 刚进入太空, 1 = 完全进入太空
        
        // 地形淡出
        this.terrainGroup.visible = true;
        this.terrainGroup.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 1 - t;
            }
        });
        
        // 太空场景淡入
        this.spaceGroup.visible = true;
        this.spaceGroup.traverse(child => {
            if (child.material && child !== this.starField) {
                child.material.transparent = true;
                child.material.opacity = t;
            }
        });
        
        // 背景渐变到深空
        const paperColor = new THREE.Color(0xe8e0d0);
        const spaceColor = new THREE.Color(0x050a14);
        this.scene.background.lerpColors(paperColor, spaceColor, t);
        this.scene.fog.near = 80 + t * 500;
        this.scene.fog.far = 250 + t * 1000;
        
        // 光照变暗
        this.mainLight.intensity = 1.0 - t * 0.8;
        this.ambientLight.intensity = 0.5 - t * 0.4;
        
        // 地球从远处移入并旋转
        this.spaceGroup.position.set(0, -200 * (1-t), -400 + 300 * t);
        this.earthMesh.rotation.y = t * 0.5;
        
        // 星星闪烁
        if (this.starField) {
            this.starField.material.opacity = t * 0.8;
            this.starField.rotation.y = t * 0.1;
        }
        
        // 相机从地形路径上升到太空视角
        const spaceCamPos = new THREE.Vector3(0, 50, 200);
        const spaceLookAt = new THREE.Vector3(0, 0, 0);
        
        this.camera.position.lerp(spaceCamPos, 0.03);
        
        const currentLookAt = new THREE.Vector3(0, 0, 0);
        this.camera.getWorldDirection(currentLookAt);
        // 平滑转向
        const targetDir = spaceCamPos.clone().sub(spaceLookAt).normalize().multiplyScalar(-1);
        this.camera.lookAt(spaceLookAt);
        
        // 更新坐标显示为太空
        const coordsEl = document.getElementById('coords');
        if (coordsEl) coordsEl.textContent = 'SPACE · 星辰大海';
    }
    
    // ===== 坐标显示 =====
    updateCoordinates() {
        const coordsEl = document.getElementById('coords');
        if (!coordsEl) return;
        
        const progress = this.scrollProgress;
        let city;
        if (progress < 0.15) city = this.cities.tongxiang;
        else if (progress < 0.35) city = this.cities.chengdu;
        else if (progress < 0.55) city = this.cities.hefei;
        else if (progress < 0.75) city = this.cities.hongkong;
        else if (progress < 0.82) city = this.cities.beijing;
        else return; // 太空模式不在这里更新
        
        coordsEl.textContent = `${city.lat.toFixed(2)}°N, ${city.lng.toFixed(2)}°E`;
    }
    
    // ===== 城市交互：点击/悬停 =====
    setupCityInteraction() {
        // 鼠标移动：更新归一化坐标 + 悬停检测
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            if (!this.isDragging) {
                this.checkCityHover();
            }
        });
        
        // 点击：跳转
        this.canvas.addEventListener('click', (e) => {
            if (this.isDragging) return;
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.checkCityClick();
        });
    }
    
    checkCityHover() {
        if (this.scrollProgress > 0.82) return; // 太空模式不检测
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const interactables = this.cityMarkers.map(cm => cm.marker);
        const intersects = this.raycaster.intersectObjects(interactables);
        
        // 重置所有
        this.cityMarkers.forEach(cm => {
            cm.marker.material.emissiveIntensity = 0.3;
            cm.marker.scale.set(1, 1, 1);
            cm.label.scale.set(1, 1, 1);
        });
        
        if (intersects.length > 0) {
            const hit = intersects[0].object;
            const cityKey = hit.userData.cityKey;
            const cm = this.cityMarkers.find(m => m.key === cityKey);
            
            if (cm) {
                cm.marker.material.emissiveIntensity = 0.8;
                cm.marker.scale.set(1.3, 1.3, 1.3);
                cm.label.scale.set(1.2, 1.2, 1.2);
                this.canvas.style.cursor = 'pointer';
                this.hoveredCity = cityKey;
            }
        } else {
            this.canvas.style.cursor = 'default';
            this.hoveredCity = null;
        }
    }
    
    checkCityClick() {
        if (this.scrollProgress > 0.82) return;
        if (this.hoveredCity) {
            this.onCityClick(this.hoveredCity);
        }
    }
    
    onCityClick(cityKey) {
        const city = this.cities[cityKey];
        if (!city) return;
        
        // 平滑滚动到对应章节
        const targetEl = document.getElementById(city.elementId);
        if (targetEl) {
            // 计算目标滚动位置（章节顶部 - 一点偏移）
            const targetY = targetEl.offsetTop - window.innerHeight * 0.1;
            
            gsap.to(window, {
                duration: 1.5,
                scrollTo: { y: targetY, autoKill: true },
                ease: 'power2.inOut'
            });
        }
    }
    
    // ===== 鼠标交互：仅用于区分点击/拖拽，视角固定 =====
    setupMouseInteraction() {
        let previousMousePosition = { x: 0, y: 0 };
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = false;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            const dx = e.clientX - previousMousePosition.x;
            const dy = e.clientY - previousMousePosition.y;
            
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this.isDragging = true;
            }
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
    }
    
    // ===== 动画循环 =====
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001;
        
        if (this.isLoaded) {
            // 城市标记呼吸动画
            this.cityMarkers.forEach(({ ring }, i) => {
                const scale = 1 + Math.sin(time * 2 + i) * 0.1;
                ring.scale.set(scale, scale, 1);
                ring.material.opacity = 0.2 + Math.sin(time * 2 + i) * 0.1;
            });
            
            // 地球缓慢自转
            if (this.earthMesh && this.spaceGroup.visible) {
                this.earthMesh.rotation.y += 0.0005;
            }
            
            // 星空缓慢旋转
            if (this.starField && this.spaceGroup.visible) {
                this.starField.rotation.y += 0.0001;
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    // ===== 加载屏幕 =====
    hideLoadingScreen() {
        const loading = document.getElementById('loadingScreen');
        if (!loading) return;
        
        const steps = document.querySelectorAll('#loadingSteps li');
        const bar = document.getElementById('loadingBar');
        
        const sequence = [
            { step: 0, delay: 0 },
            { step: 1, delay: 400 },
            { step: 2, delay: 800 },
            { step: 3, delay: 1200 },
            { step: 4, delay: 1600 },
            { step: 5, delay: 2000 },
        ];
        
        sequence.forEach(({ step, delay }) => {
            setTimeout(() => {
                steps.forEach((s, i) => {
                    if (i < step) s.classList.add('done');
                    else if (i === step) s.classList.add('active');
                });
                if (bar) bar.style.width = `${(step / 5) * 100}%`;
            }, delay);
        });
        
        setTimeout(() => {
            loading.classList.add('hidden');
            const hint = document.getElementById('scrollHint');
            if (hint) {
                setTimeout(() => hint.classList.add('hidden'), 3000);
            }
        }, 3000);
    }
    
    // ===== 备用地形 =====
    createFallbackTerrain() {
        const geometry = new THREE.PlaneGeometry(200, 200, 100, 100);
        const positions = geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const height = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 10 + 
                          Math.sin(x * 0.1 + y * 0.1) * 5;
            positions.setZ(i, height);
        }
        
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            color: 0x4a7c8c,
            roughness: 0.9,
            metalness: 0.0,
        });
        
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        this.scene.add(terrain);
        
        this.isLoaded = true;
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const explorer = new TerrainExplorer();
    window.addEventListener('resize', () => explorer.onResize());
});
