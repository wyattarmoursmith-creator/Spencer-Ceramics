#!/usr/bin/env python3
"""Regenerate the responsive variants (images/NAME-800.jpg, -1200, -1600, -2000) for the site's own photos.
Run after swapping a photo in images/ (e.g. when the photographer's finals arrive):  python3 tools/make-variants.py
Product photos live on Shopify's CDN and are resized there; this is only for the site's editorial photos."""
import os, glob, re
from PIL import Image, ImageOps
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
for p in glob.glob('images/*.jpg') + glob.glob('images/stock/*.jpg'):
    if re.search(r'-(800|1200|1600|2000)\.jpg$', p) or 'og-cover' in p: continue
    im=Image.open(p); w=im.size[0]; name=p[:-4]
    for s in (800,1200,1600,2000):
        if s>=w: continue
        v=ImageOps.exif_transpose(im).convert('RGB'); v.thumbnail((s,s)); v.save('%s-%d.jpg'%(name,s),quality=78,optimize=True,progressive=True)
    print(p, w, 'ok')
