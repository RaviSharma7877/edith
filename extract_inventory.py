import re

input_file = 'Idea/all_pdf_text.txt'
output_file = 'Idea/inventory_extract.txt'
keywords = ['inventory', 'stock', 'warehouse', 'godown', 'batch', 'item', 'sku', 'price']
pattern = re.compile(r'|'.join(keywords), re.IGNORECASE)

with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

paragraphs = text.split('\n\n')
matches = []

for p in paragraphs:
    if pattern.search(p):
        matches.append(p.strip())

with open(output_file, 'w', encoding='utf-8') as out:
    for m in matches:
        out.write(m + "\n\n---\n\n")

print(f"Found {len(matches)} matching paragraphs.")
