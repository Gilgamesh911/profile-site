import json, sys

d = json.load(sys.stdin)
# Print top-level keys except layers and metadata
result = {k: v for k, v in d.items() if k not in ['layers', 'metadata']}
print(json.dumps(result, indent=2))
