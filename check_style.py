import json

d = json.load(open('/tmp/style.json'))
layers = d.get('layers', [])
print('Total layers:', len(layers))
for l in layers[:20]:
    lid = l.get('id', '?')
    ltype = l.get('type', '?')
    paint = list(l.get('paint', {}).keys())
    print(f'  {lid}: type={ltype}, paint={paint}')
