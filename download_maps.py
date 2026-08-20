#!/usr/bin/env python3
"""
Mapbox 资源预下载工具
用法：填入你的 MAPBOX_TOKEN 后运行
"""

import os
import json
import urllib.request
import urllib.parse

# ===================== 配置区 =====================
MAPBOX_TOKEN = "YOUR_MAPBOX_TOKEN_HERE"  # ← 填入你的 token

# 五个城市的中心坐标 [lng, lat] 和缩放级别
CITIES = {
    "tongxiang":   {"name": "桐乡",      "coords": [120.56, 30.63], "zoom": 13},
    "chengdu":     {"name": "成都",      "coords": [104.06, 30.67], "zoom": 13},
    "hefei":       {"name": "合肥",      "coords": [117.23, 31.82], "zoom": 13},
    "hongkong":    {"name": "香港",      "coords": [114.17, 22.32], "zoom": 13},
    "beijing":     {"name": "北京",      "coords": [116.40, 39.90], "zoom": 13},
}

OUTPUT_DIR = "assets/maps"
# =================================================

# 深色线框风格（与网站主题匹配）
DARK_WIREFRAME_STYLE = {
    "version": 8,
    "sources": {
        "osm": {
            "type": "vector",
            "url": "mapbox://mapbox.mapbox-streets-v8"
        }
    },
    "layers": [
        {
            "id": "background",
            "type": "background",
            "paint": {"background-color": "#0a0e1a"}
        },
        {
            "id": "water",
            "type": "fill",
            "source": "osm",
            "source-layer": "water",
            "paint": {
                "fill-color": "#0d1b3e",
                "fill-outline-color": "#1a3a6e"
            }
        },
        {
            "id": "building-3d",
            "type": "fill-extrusion",
            "source": "osm",
            "source-layer": "building",
            "paint": {
                "fill-extrusion-color": "#1a2d5c",
                "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 15.05, ["get", "height"]],
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": 0.8
            }
        },
        {
            "id": "road",
            "type": "line",
            "source": "osm",
            "source-layer": "road",
            "paint": {
                "line-color": "#1a3a6e",
                "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 2]
            }
        },
        {
            "id": "building-outline",
            "type": "line",
            "source": "osm",
            "source-layer": "building",
            "paint": {
                "line-color": "#00d4ff",
                "line-width": 0.5,
                "line-opacity": 0.4
            }
        }
    ]
}


def download_static_image(city_key, city_info, width=800, height=600):
    """下载 Mapbox 静态地图图片"""
    
    lng, lat = city_info["coords"]
    zoom = city_info["zoom"]
    
    # 将样式编码为 URL 安全的字符串
    style_json = json.dumps(DARK_WIREFRAME_STYLE, separators=(',', ':'))
    style_encoded = urllib.parse.quote(style_json)
    
    # 构建 URL
    url = (
        f"https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/"
        f"{lng},{lat},{zoom}/{width}x{height}@2x"
        f"?access_token={MAPBOX_TOKEN}"
    )
    
    # 输出路径
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, f"{city_key}@2x.png")
    
    try:
        print(f"📥 正在下载 {city_info['name']} 的地图...")
        urllib.request.urlretrieve(url, output_path)
        print(f"   ✅ 已保存: {output_path}")
        return True
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False


def download_3d_buildings_data(city_key, city_info):
    """
    下载 3D 建筑数据（使用 Mapbox Vector Tiles API）
    返回 GeoJSON 格式的建筑数据
    """
    import math
    
    lng, lat = city_info["coords"]
    zoom = 15  # 建筑数据需要更高缩放级别
    
    # 将经纬度转换为 tile 坐标
    def lnglat_to_tile(lng, lat, zoom):
        x = int((lng + 180) / 360 * (2 ** zoom))
        y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * (2 ** zoom))
        return x, y
    
    tx, ty = lnglat_to_tile(lng, lat, zoom)
    
    # 构建 Vector Tiles API URL
    url = (
        f"https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{zoom}/{tx}/{ty}.vector.pbf"
        f"?access_token={MAPBOX_TOKEN}"
    )
    
    output_path = os.path.join(OUTPUT_DIR, f"{city_key}_buildings.json")
    
    try:
        print(f"📥 正在下载 {city_info['name']} 的 3D 建筑数据...")
        
        req = urllib.request.Request(url)
        req.add_header('Accept', 'application/x-protobuf')
        
        with urllib.request.urlopen(req) as response:
            data = response.read()
            
        # 保存原始 protobuf 数据
        pbf_path = os.path.join(OUTPUT_DIR, f"{city_key}_buildings.pbf")
        with open(pbf_path, 'wb') as f:
            f.write(data)
        
        print(f"   ✅ 已保存原始数据: {pbf_path}")
        print(f"   ⚠️  需要使用 mapbox-vector-tile 库解析为 GeoJSON")
        return True
        
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False


def generate_osm_buildings_geojson(city_key, city_info):
    """
    使用 Overpass API 从 OpenStreetMap 获取建筑数据
    这是完全免费的替代方案，无需 Mapbox token
    """
    lng, lat = city_info["coords"]
    
    # 计算边界框（约 2km x 2km）
    delta = 0.015
    bbox = f"{lat-delta},{lng-delta},{lat+delta},{lng+delta}"
    
    overpass_query = f"""
    [out:json][timeout:25];
    (
      way["building"]({bbox});
      relation["building"]({bbox});
    );
    out body;
    >;
    out skel qt;
    """
    
    url = "https://overpass-api.de/api/interpreter"
    
    output_path = os.path.join(OUTPUT_DIR, f"{city_key}_osm_buildings.json")
    
    try:
        print(f"📥 正在通过 OSM 下载 {city_info['name']} 的建筑数据...")
        
        data = urllib.parse.urlencode({"data": overpass_query}).encode()
        req = urllib.request.Request(url, data=data)
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
        
        # 转换为简化版 GeoJSON（只保留建筑轮廓和高度）
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        
        nodes = {}
        for element in result["elements"]:
            if element["type"] == "node":
                nodes[element["id"]] = [element["lon"], element["lat"]]
        
        for element in result["elements"]:
            if element["type"] == "way" and "tags" in element and "building" in element["tags"]:
                coords = []
                for node_id in element["nodes"]:
                    if node_id in nodes:
                        coords.append(nodes[node_id])
                
                if len(coords) >= 3:
                    height = element["tags"].get("height", "")
                    levels = element["tags"].get("building:levels", "")
                    
                    # 估算高度
                    estimated_height = 10
                    if height:
                        try:
                            estimated_height = float(height.replace("m", ""))
                        except:
                            pass
                    elif levels:
                        try:
                            estimated_height = float(levels) * 3
                        except:
                            pass
                    
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [coords]
                        },
                        "properties": {
                            "height": estimated_height,
                            "levels": levels,
                            "type": element["tags"].get("building", "yes")
                        }
                    }
                    geojson["features"].append(feature)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False)
        
        print(f"   ✅ 已保存 {len(geojson['features'])} 个建筑: {output_path}")
        return True
        
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        return False


def main():
    print("=" * 60)
    print("🗺️  Mapbox / OSM 资源预下载工具")
    print("=" * 60)
    print()
    
    if MAPBOX_TOKEN == "YOUR_MAPBOX_TOKEN_HERE":
        print("⚠️  请先编辑脚本，将 MAPBOX_TOKEN 替换为你的真实 token")
        print()
        print("或者，你可以直接使用方案 B：OSM 建筑数据（完全免费，无需 token）")
        print()
    
    print("选择下载方案：")
    print("1. Mapbox 静态地图图片（需要 token）")
    print("2. OSM 建筑 GeoJSON（免费，用于 Three.js 3D）")
    print("3. 全部下载")
    print()
    
    choice = input("输入选项 (1/2/3): ").strip() or "3"
    
    results = {"images": 0, "osm": 0}
    
    for city_key, city_info in CITIES.items():
        print(f"\n🏙️  {city_info['name']}")
        
        if choice in ("1", "3") and MAPBOX_TOKEN != "YOUR_MAPBOX_TOKEN_HERE":
            if download_static_image(city_key, city_info):
                results["images"] += 1
        
        if choice in ("2", "3"):
            if generate_osm_buildings_geojson(city_key, city_info):
                results["osm"] += 1
    
    print(f"\n{'=' * 60}")
    print("📊 下载完成")
    print(f"   地图图片: {results['images']} / {len(CITIES)}")
    print(f"   OSM 建筑: {results['osm']} / {len(CITIES)}")
    print(f"\n📁 文件保存在: {os.path.abspath(OUTPUT_DIR)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
