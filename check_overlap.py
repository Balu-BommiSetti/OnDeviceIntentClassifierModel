import json

with open("v6/exported_dataset/templates.json", "r") as f:
    templates = json.load(f)

global_templates = {}
overlap_count = 0

for key, tmpl_list in templates.items():
    for t in tmpl_list:
        normalized = t.lower().strip()
        if normalized in global_templates:
            if global_templates[normalized] != key:
                #print(f"Overlap: '{normalized}' in {global_templates[normalized]} AND {key}")
                overlap_count += 1
        else:
            global_templates[normalized] = key

print(f"Total templates: {sum(len(v) for v in templates.values())}")
print(f"Unique templates: {len(global_templates)}")
print(f"Overlap count: {overlap_count}")
