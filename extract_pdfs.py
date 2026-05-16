import os
from pypdf import PdfReader

idea_dir = 'Idea'
output_file = 'Idea/all_pdf_text.txt'

with open(output_file, 'w', encoding='utf-8') as outfile:
    for filename in os.listdir(idea_dir):
        if filename.endswith('.pdf'):
            filepath = os.path.join(idea_dir, filename)
            outfile.write(f"\n\n{'='*40}\n")
            outfile.write(f"FILE: {filename}\n")
            outfile.write(f"{'='*40}\n\n")
            try:
                reader = PdfReader(filepath)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        outfile.write(text + "\n")
            except Exception as e:
                outfile.write(f"Error reading {filename}: {e}\n")
