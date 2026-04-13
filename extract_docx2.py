import zipfile
import xml.etree.ElementTree as ET

z = zipfile.ZipFile(r'd:\Proba_antigravity\Urban Nest\TZ_Urban Nest.docx')
xml_content = z.read('word/document.xml')
root = ET.fromstring(xml_content)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paragraphs = root.findall('.//w:p', ns)

with open(r'd:\Proba_antigravity\Urban Nest\tz_clean.txt', 'w', encoding='utf-8') as out:
    for p in paragraphs:
        texts = [node.text for node in p.findall('.//w:t', ns) if node.text]
        line = ''.join(texts)
        if line.strip():
            out.write(line + '\n')
