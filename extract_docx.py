import zipfile
import xml.etree.ElementTree as ET
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

z = zipfile.ZipFile(r'd:\Proba_antigravity\Urban Nest\TZ_Urban Nest.docx')
xml_content = z.read('word/document.xml')
root = ET.fromstring(xml_content)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paragraphs = root.findall('.//w:p', ns)

for p in paragraphs:
    texts = [node.text for node in p.findall('.//w:t', ns) if node.text]
    line = ''.join(texts)
    if line.strip():
        print(line)
