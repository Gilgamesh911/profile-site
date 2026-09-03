with open('index.html', 'r') as f:
    lines = f.readlines()

# Find the line with galaxy-canvas.js
for i, line in enumerate(lines):
    if 'galaxy-canvas.js' in line and '<//script>' not in line:
        # Fix the galaxy-canvas.js line
        lines[i] = '    <script src=”galaxy-canvas.js?v=15”><//script>\n'
        break

# Check if script.js line exists
has_script_js = any('script.js' in line for line in lines)

if not has_script_js:
    # Add script.js after galaxy-canvas.js
    for i, line in enumerate(lines):
        if 'galaxy-canvas.js' in line:
            lines.insert(i + 1, '    <script src=”script.js?v=11”><//script>\n')
            break

with open('index.html', 'w') as f:
    f.writelines(lines)

print('Fixed index.html')
