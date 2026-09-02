import re

# Fix script.js
with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the duplicated if block (lines ~101-133)
old_block = '''                // 地球淡出 + 银河淡入 + 飞入动画
                if (index >= 5) {
                    // 最后一段 beijing -> stars
                    const fade = Math.min(1, localProgress * 2);
                    mapEl.style.opacity = 1 - fade;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(fade);
                        // 相机从远处飞入银河：z 从 1500 降到 350
                        window.galaxyCanvas.setCameraZ(1500 - fade * 1150);
                        // zoom 从 0.4 放大到 2.8（飞入时银河越来越大）
                        window.galaxyCanvas.setZoom(0.4 + fade * 2.4);
                    }
                } else {
                    mapEl.style.opacity = 1;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(0);
                        window.galaxyCanvas.setCameraZ(1500);
                        window.galaxyCanvas.setZoom(0.4);
                    }
                }
                if (index >= 5) {
                    // 最后一段 beijing -> stars
                    const fade = Math.min(1, localProgress * 2);
                    mapEl.style.opacity = 1 - fade;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(fade);
                    }
                } else {
                    mapEl.style.opacity = 1;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(0);
                    }
                }'''

new_block = '''                // 地球淡出 + 银河淡入 + 扑面而来
                if (index >= 5) {
                    // 最后一段 beijing -> stars
                    const fade = Math.min(1, localProgress * 2);
                    mapEl.style.opacity = 1 - fade;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(fade);
                        // 银河从 scale=1 扑面而来到 scale=3
                        window.galaxyCanvas.setScale(1 + fade * 2);
                    }
                } else {
                    mapEl.style.opacity = 1;
                    if (window.galaxyCanvas) {
                        window.galaxyCanvas.setOpacity(0);
                        window.galaxyCanvas.setScale(1);
                    }
                }'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('script.js fixed')
else:
    print('ERROR: old block not found in script.js')
    # Try to find line numbers of the duplicate blocks
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'setCameraZ' in line or 'setZoom' in line:
            print(f'  Line {i+1}: {line.strip()}')

# Fix index.html version numbers
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('galaxy-canvas.js?v=2', 'galaxy-canvas.js?v=3')
html = html.replace('script.js?v=7', 'script.js?v=8')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('index.html versions bumped')
