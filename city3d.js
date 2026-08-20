// ===== 3D 城市线框渲染器 =====
// 加载 OSM GeoJSON 建筑数据，用 Three.js 渲染为线框城市

class City3DRenderer {
    constructor(containerId, geojsonPath, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.geojsonPath = geojsonPath;
        this.options = {
            lineColor: options.lineColor || 0x00d4ff,
            lineOpacity: options.lineOpacity || 0.6,
            lineWidth: options.lineWidth || 1,
            heightScale: options.heightScale || 1,
            bgColor: options.bgColor || 0x0a0e1a,
            ...options
        };
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.buildingGroup = null;
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.bgColor);
        
        // 相机
        const width = this.container.clientWidth || 400;
        const height = this.container.clientHeight || 500;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
        this.camera.position.set(0, 80, 120);
        this.camera.lookAt(0, 0, 0);
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
        
        // 控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
        this.controls.maxPolarAngle = Math.PI / 2.2; // 限制不能看到地底
        this.controls.minDistance = 20;
        this.controls.maxDistance = 300;
        
        // 建筑组
        this.buildingGroup = new THREE.Group();
        this.scene.add(this.buildingGroup);
        
        // 加载数据
        this.loadData();
        
        // 响应式
        window.addEventListener('resize', () => this.onResize());
        
        // 开始渲染
        this.animate();
    }
    
    async loadData() {
        try {
            const response = await fetch(this.geojsonPath);
            const geojson = await response.json();
            this.buildBuildings(geojson);
        } catch (e) {
            console.error('加载建筑数据失败:', e);
            this.createFallback();
        }
    }
    
    buildBuildings(geojson) {
        const features = geojson.features || [];
        if (features.length === 0) {
            this.createFallback();
            return;
        }
        
        // 计算中心点（让所有建筑围绕原点）
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        const allPoints = [];
        
        features.forEach(feature => {
            const coords = feature.geometry.coordinates[0];
            coords.forEach(([lng, lat]) => {
                const [x, z] = this.lngLatToXZ(lng, lat);
                allPoints.push({x, z});
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minZ = Math.min(minZ, z);
                maxZ = Math.max(maxZ, z);
            });
        });
        
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        
        // 材质
        const material = new THREE.LineBasicMaterial({
            color: this.options.lineColor,
            transparent: true,
            opacity: this.options.lineOpacity
        });
        
        const glowMaterial = new THREE.LineBasicMaterial({
            color: this.options.lineColor,
            transparent: true,
            opacity: 0.9
        });
        
        features.forEach((feature, index) => {
            const coords = feature.geometry.coordinates[0];
            const height = (feature.properties?.height || 10) * this.options.heightScale;
            
            // 转换为本地坐标（以中心为原点）
            const points = coords.map(([lng, lat]) => {
                const [x, z] = this.lngLatToXZ(lng, lat);
                return { x: x - centerX, z: z - centerZ };
            });
            
            // 创建建筑线框
            this.createBuildingWireframe(points, height, material, glowMaterial);
        });
        
        // 添加地面网格
        this.addGroundGrid();
        
        // 调整相机位置
        const size = Math.max(maxX - minX, maxZ - minZ);
        this.camera.position.set(size * 0.6, size * 0.5, size * 0.6);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
    
    lngLatToXZ(lng, lat) {
        // 简单的等距投影（对于小范围足够精确）
        const x = lng * 111320 * Math.cos(lat * Math.PI / 180);
        const z = lat * 111320;
        return [x / 1000, z / 1000]; // 缩放到合适的大小
    }
    
    createBuildingWireframe(points, height, material, glowMaterial) {
        if (points.length < 3) return;
        
        const vertices = [];
        
        // 底部轮廓
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            vertices.push(
                p1.x, 0, p1.z,
                p2.x, 0, p2.z
            );
        }
        
        // 顶部轮廓
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            vertices.push(
                p1.x, height, p1.z,
                p2.x, height, p2.z
            );
        }
        
        // 垂直线（角落）
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            vertices.push(
                p.x, 0, p.z,
                p.x, height, p.z
            );
        }
        
        // 创建 BufferGeometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const line = new THREE.LineSegments(geometry, material);
        this.buildingGroup.add(line);
        
        // 添加一个发光的顶点标记（仅每第5个建筑）
        if (Math.random() > 0.8) {
            const topPoint = points[0];
            const dotGeo = new THREE.BufferGeometry();
            dotGeo.setAttribute('position', new THREE.Float32BufferAttribute([
                topPoint.x, height, topPoint.z
            ], 3));
            const dot = new THREE.Points(dotGeo, new THREE.PointsMaterial({
                color: this.options.lineColor,
                size: 2,
                transparent: true,
                opacity: 0.8
            }));
            this.buildingGroup.add(dot);
        }
    }
    
    addGroundGrid() {
        const size = 200;
        const divisions = 20;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x1a3a6e, 0x0d1b3e);
        gridHelper.position.y = -0.1;
        this.buildingGroup.add(gridHelper);
    }
    
    createFallback() {
        // 如果数据加载失败，创建一个简单的网格作为后备
        const size = 100;
        const divisions = 10;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x00d4ff, 0x1a3a6e);
        this.buildingGroup.add(gridHelper);
        
        // 添加一些随机立方体
        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.BoxGeometry(5, Math.random() * 20 + 5, 5);
            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.5
            }));
            line.position.set(
                (Math.random() - 0.5) * 80,
                0,
                (Math.random() - 0.5) * 80
            );
            this.buildingGroup.add(line);
        }
    }
    
    onResize() {
        const width = this.container.clientWidth || 400;
        const height = this.container.clientHeight || 500;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
    
    // 当滚动到视野内时开始旋转，滚出时暂停
    setAutoRotate(rotate) {
        if (this.controls) {
            this.controls.autoRotate = rotate;
        }
    }
}
