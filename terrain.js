// ===== 3D 中国地形探索场景 =====

class TerrainExplorer {
    constructor() {
        this.canvas = document.getElementById('terrain-canvas');
        if (!this.canvas) return;
        
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe8e0d0);
        this.scene.fog = new THREE.Fog(0xe8e0d0, 80, 250);
        
        // 相机
        this.camera = new THREE.PerspectiveCamera(
            45, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 120, 180);
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // 光照
        this.setupLighting();
        
        // 地形数据
        this.terrainSize = 200;
        this.terrainHeight = 40;
        this.cities = {
            tongxiang: { lng: 120.56, lat: 30.63, name: '桐乡', pixel: [392, 327] },
            chengdu:   { lng: 104.06, lat: 30.67, name: '成都', pixel: [256, 326] },
            hefei:     { lng: 117.23, lat: 31.82, name: '合肥', pixel: [365, 309] },
            hongkong:  { lng: 114.17, lat: 22.32, name: '香港', pixel: [339, 448] },
            beijing:   { lng: 116.40, lat: 39.90, name: '北京', pixel: [358, 191] }
        };
        
        // 状态
        this.isLoaded = false;
        this.scrollProgress = 0;
        this.cityMarkers = [];
        this.routeLine = null;
        
        // 初始化
        this.init();
    }
    
    setupLighting() {
        // 主光源（模拟日光，偏暖）
        const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
        mainLight.position.set(50, 100, 50);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 500;
        mainLight.shadow.camera.left = -150;
        mainLight.shadow.camera.right = 150;
        mainLight.shadow.camera.top = 150;
        mainLight.shadow.camera.bottom = -150;
        this.scene.add(mainLight);
        
        // 补光（淡蓝色，模拟天空反射）
        const fillLight = new THREE.DirectionalLight(0xd4e5f7, 0.4);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);
        
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xf0e6d3, 0.5);
        this.scene.add(ambientLight);
    }
    
    async init() {
        try {
            await this.loadTerrain();
            this.createCityMarkers();
            this.createRouteLine();
            this.setupScrollAnimation();
            this.setupMouseInteraction();
            this.animate();
            this.hideLoadingScreen();
        } catch (e) {
            console.error('地形加载失败:', e);
            this.createFallbackTerrain();
        }
    }
    
    async loadTerrain() {
        // 加载高度图
        const loader = new THREE.TextureLoader();
        const heightMap = await new Promise((resolve, reject) => {
            loader.load('assets/terrain/china_heightmap.png', resolve, undefined, reject);
        });
        
        // 读取高度数据
        const image = heightMap.image;
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const pixels = imageData.data;
        
        // 创建地形几何体
        const segments = 256;
        const geometry = new THREE.PlaneGeometry(
            this.terrainSize, 
            this.terrainSize, 
            segments, 
            segments
        );
        
        // 应用高度
        const positions = geometry.attributes.position;
        const colors = [];
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            
            // 将地形坐标映射到高度图坐标
            const u = (x / this.terrainSize + 0.5);
            const v = (-y / this.terrainSize + 0.5);
            
            const px = Math.floor(u * (image.width - 1));
            const py = Math.floor(v * (image.height - 1));
            const idx = (py * image.width + px) * 4;
            
            // 高度值 (0-255)
            const height = pixels[idx] / 255;
            
            // 设置 Z 坐标（高度）
            positions.setZ(i, height * this.terrainHeight);
            
            // 顶点颜色（复古地图配色）
            const color = this.getTerrainColor(height);
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        // 材质
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.0,
            flatShading: false,
        });
        
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        this.scene.add(terrain);
        
        // 添加纸质纹理叠加（使用 Canvas 纹理）
        this.addPaperTexture();
        
        this.isLoaded = true;
    }
    
    getTerrainColor(height) {
        // 复古地图配色
        if (height < 0.1) {
            // 水域/低地 - 淡绿
            return new THREE.Color(0.70, 0.78, 0.63);
        } else if (height < 0.25) {
            // 平原 - 黄绿
            return new THREE.Color(0.63, 0.71, 0.51);
        } else if (height < 0.45) {
            // 丘陵 - 绿棕
            return new THREE.Color(0.55, 0.63, 0.39);
        } else if (height < 0.65) {
            // 山地 - 棕
            return new THREE.Color(0.63, 0.55, 0.35);
        } else {
            // 高原 - 棕褐
            return new THREE.Color(0.71, 0.63, 0.51);
        }
    }
    
    addPaperTexture() {
        // 创建纸质噪点纹理
        const size = 512;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < size * size; i++) {
            const v = Math.random() * 20 + 235;
            data[i * 4] = v;
            data[i * 4 + 1] = v - 5;
            data[i * 4 + 2] = v - 15;
            data[i * 4 + 3] = 15; // 低透明度
        }
        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        // 作为覆盖层
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
        this.scene.add(overlay);
    }
    
    createCityMarkers() {
        const markerGeo = new THREE.CylinderGeometry(0.8, 0.8, 3, 16);
        const markerMat = new THREE.MeshStandardMaterial({
            color: 0xc17817,
            emissive: 0xc17817,
            emissiveIntensity: 0.3,
            roughness: 0.4,
        });
        
        Object.entries(this.cities).forEach(([key, city]) => {
            const marker = new THREE.Mesh(markerGeo, markerMat.clone());
            
            // 将像素坐标转换为 3D 坐标
            const u = city.pixel[0] / 512;
            const v = city.pixel[1] / 512;
            const x = (u - 0.5) * this.terrainSize;
            const z = (v - 0.5) * this.terrainSize;
            
            marker.position.set(x, 2, z);
            marker.castShadow = true;
            this.scene.add(marker);
            
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
            ring.position.set(x, 0.5, z);
            this.scene.add(ring);
            
            this.cityMarkers.push({ marker, ring, city });
        });
    }
    
    createRouteLine() {
        // 创建路线：桐乡 -> 成都 -> 合肥 -> 香港 -> 北京
        const routePoints = [
            this.cities.tongxiang,
            this.chengdu,
            this.hefei,
            this.hongkong,
            this.beijing,
        ];
        
        const points = routePoints.map(city => {
            const u = city.pixel[0] / 512;
            const v = city.pixel[1] / 512;
            return new THREE.Vector3(
                (u - 0.5) * this.terrainSize,
                3,
                (v - 0.5) * this.terrainSize
            );
        });
        
        // 创建平滑曲线
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.3, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0xc17817,
            emissive: 0xc17817,
            emissiveIntensity: 0.2,
            roughness: 0.6,
        });
        
        this.routeLine = new THREE.Mesh(tubeGeo, tubeMat);
        this.scene.add(this.routeLine);
        
        // 保存曲线用于相机路径
        this.cameraPath = curve;
    }
    
    setupScrollAnimation() {
        // 使用 GSAP ScrollTrigger 控制相机
        gsap.registerPlugin(ScrollTrigger);
        
        // 计算每个城市对应的滚动位置
        const panels = document.querySelectorAll('.city-panel');
        const totalPanels = panels.length;
        
        // 创建滚动动画时间线
        this.scrollTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: '.content-layer',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
                onUpdate: (self) => {
                    this.scrollProgress = self.progress;
                    this.updateCameraPosition();
                    this.updateCoordinates();
                }
            }
        });
    }
    
    updateCameraPosition() {
        if (!this.cameraPath) return;
        
        // 根据滚动进度计算相机位置
        const progress = this.scrollProgress;
        
        // 相机沿路径移动
        const point = this.cameraPath.getPointAt(Math.min(progress, 0.99));
        const tangent = this.cameraPath.getTangentAt(Math.min(progress, 0.99));
        
        // 相机位置：路径上方，稍微偏移
        const targetPos = new THREE.Vector3(
            point.x,
            point.y + 30 + Math.sin(progress * Math.PI) * 20,
            point.z + 40
        );
        
        // 平滑过渡
        this.camera.position.lerp(targetPos, 0.05);
        
        // 相机看向路径前方
        const lookAtPoint = this.cameraPath.getPointAt(Math.min(progress + 0.05, 0.99));
        this.camera.lookAt(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z);
    }
    
    updateCoordinates() {
        // 更新坐标显示
        const coordsEl = document.getElementById('coords');
        if (!coordsEl) return;
        
        // 根据滚动进度显示不同城市的坐标
        const progress = this.scrollProgress;
        let city;
        if (progress < 0.15) city = this.cities.tongxiang;
        else if (progress < 0.35) city = this.cities.chengdu;
        else if (progress < 0.55) city = this.cities.hefei;
        else if (progress < 0.75) city = this.cities.hongkong;
        else city = this.cities.beijing;
        
        coordsEl.textContent = `${city.lat.toFixed(2)}°N, ${city.lng.toFixed(2)}°E`;
    }
    
    setupMouseInteraction() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            // 绕着地形中心旋转相机
            const center = new THREE.Vector3(0, 10, 0);
            const offset = this.camera.position.clone().sub(center);
            
            // 水平旋转
            const angleY = deltaX * 0.005;
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleY);
            
            // 垂直旋转（限制角度）
            const angleX = deltaY * 0.005;
            const currentHeight = offset.y;
            const newHeight = Math.max(5, Math.min(100, currentHeight - deltaY * 0.5));
            offset.y = newHeight;
            
            this.camera.position.copy(center.add(offset));
            this.camera.lookAt(0, 5, 0);
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        // 滚轮缩放
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY * 0.1;
            const direction = this.camera.position.clone().normalize();
            const newPos = this.camera.position.clone().add(direction.multiplyScalar(delta));
            const distance = newPos.length();
            if (distance > 30 && distance < 300) {
                this.camera.position.copy(newPos);
            }
        }, { passive: false });
    }
    
    createFallbackTerrain() {
        // 如果高度图加载失败，创建简单地形
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
            color: 0x8fbc8f,
            roughness: 0.9,
            metalness: 0.0,
        });
        
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        this.scene.add(terrain);
        
        this.isLoaded = true;
    }
    
    hideLoadingScreen() {
        const loading = document.getElementById('loadingScreen');
        if (!loading) return;
        
        // 加载步骤动画
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
        
        // 完成后隐藏
        setTimeout(() => {
            loading.classList.add('hidden');
            // 隐藏滚动提示
            const hint = document.getElementById('scrollHint');
            if (hint) {
                setTimeout(() => hint.classList.add('hidden'), 3000);
            }
        }, 3000);
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isLoaded) {
            // 更新城市标记动画
            const time = Date.now() * 0.001;
            this.cityMarkers.forEach(({ ring }, i) => {
                const scale = 1 + Math.sin(time * 2 + i) * 0.1;
                ring.scale.set(scale, scale, 1);
                ring.material.opacity = 0.2 + Math.sin(time * 2 + i) * 0.1;
            });
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const explorer = new TerrainExplorer();
    
    window.addEventListener('resize', () => explorer.onResize());
});
