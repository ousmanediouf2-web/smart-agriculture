#!/usr/bin/env python3
"""AgroSmart Drone Processor v4 - Crop noir + vraie 3D relief + carte propre"""
import sys, os, json, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from datetime import datetime

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# ── Sélection meilleure photo ─────────────────────────────────────────────
def score_photo(path):
    try:
        img = Image.open(path).convert('RGB').resize((300, 300))
        arr = np.array(img, dtype=float)
        r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
        gray = 0.299*r + 0.587*g + 0.114*b
        sharp = (np.abs(np.diff(gray, axis=1)).mean() + np.abs(np.diff(gray, axis=0)).mean()) / 2
        green  = float((g > r+8) & (g > b+8)).mean() if False else float(np.mean((g > r+8) & (g > b+8)))
        brown  = float(np.mean((r > 80) & (g > 50) & (b < 120) & (r >= g)))
        sky    = float(np.mean((b > r+20) | ((r>180) & (g>180) & (b>180))))
        aerial = green + brown - sky * 0.8
        score = min(float(sharp), 30.0)/30.0 * 0.45 + aerial * 0.55
        print(f"  [{os.path.basename(path)}] score={score:.3f} sharp={sharp:.1f} aerial={aerial:.2f}")
        return score
    except Exception as e:
        print(f"  [ERR] {path}: {e}", file=sys.stderr)
        return 0

def select_best(paths):
    scored = [(score_photo(p), p) for p in paths]
    scored.sort(reverse=True)
    best = scored[0][1]
    print(f"→ Meilleure: {os.path.basename(best)}")
    return best

# ── Crop zones noires ─────────────────────────────────────────────────────
def remove_black_borders(img_pil, threshold=12):
    """Supprime les zones noires/vides autour du contenu utile"""
    arr = np.array(img_pil.convert('RGB'))
    mask = (arr[:,:,0] > threshold) | (arr[:,:,1] > threshold) | (arr[:,:,2] > threshold)
    rows = np.where(np.any(mask, axis=1))[0]
    cols = np.where(np.any(mask, axis=0))[0]
    if len(rows) == 0 or len(cols) == 0:
        return img_pil
    pad = 8
    r0 = max(0, rows[0]-pad);  r1 = min(arr.shape[0]-1, rows[-1]+pad)
    c0 = max(0, cols[0]-pad);  c1 = min(arr.shape[1]-1, cols[-1]+pad)
    cropped = img_pil.crop((c0, r0, c1+1, r1+1))
    print(f"[CROP] {img_pil.size} → {cropped.size} (zones noires supprimées)")
    return cropped

# ── Carte 2D annotée ──────────────────────────────────────────────────────
def create_map_2d(img, n_photos, altitude, best_name):
    W, H = img.size
    margin = 52
    banner_h = 68
    cw = W + margin*2
    ch = H + margin*2 + banner_h

    canvas = Image.new('RGB', (cw, ch), (18, 38, 18))
    canvas.paste(img, (margin, margin))
    draw = ImageDraw.Draw(canvas)

    # Cadre vert
    draw.rectangle([margin-2, margin-2, margin+W+2, margin+H+2], outline=(46,125,50), width=2)

    # Grille
    for i in range(1, 7):
        x = margin + int(W*i/6)
        draw.line([(x, margin), (x, margin+H)], fill=(255,255,255), width=1)
    for i in range(1, 6):
        y = margin + int(H*i/5)
        draw.line([(margin, y), (margin+W, y)], fill=(255,255,255), width=1)

    # Labels
    for i in range(7):
        draw.text((margin + int(W*i/6) - 5, margin-16), chr(65+i), fill=(180,220,180))
    for i in range(6):
        draw.text((margin-18, margin + int(H*i/5) - 7), str(i+1), fill=(180,220,180))

    # Boussole
    cx, cy = cw-margin-28, margin+32
    draw.ellipse([cx-20,cy-20,cx+20,cy+20], fill=(0,0,0), outline=(255,255,255), width=2)
    draw.polygon([(cx,cy-16),(cx-6,cy+8),(cx+6,cy+8)], fill=(200,40,40))
    draw.polygon([(cx,cy+16),(cx-6,cy-8),(cx+6,cy-8)], fill=(220,220,220))
    draw.text((cx-4, cy-27), "N", fill=(255,255,255))

    # Échelle
    gsd_m = altitude * 0.00274
    spx = 120; sm = int(gsd_m*spx)
    sx1, sy2 = margin+12, margin+H-15
    draw.rectangle([sx1-1,sy2-7,sx1+spx+1,sy2+7], fill=(0,0,0))
    draw.rectangle([sx1,sy2-5,sx1+spx//2,sy2+5], fill=(255,255,255))
    draw.rectangle([sx1+spx//2,sy2-5,sx1+spx,sy2+5], fill=(80,80,80))
    draw.text((sx1+spx//2-4,sy2-5), "0", fill=(0,0,0))
    draw.text((sx1+spx-22,sy2-5), f"{sm}m", fill=(255,255,255))

    # Bannière bas
    draw.rectangle([0,ch-banner_h,cw,ch], fill=(12,28,12))
    draw.rectangle([0,ch-banner_h,cw,ch-banner_h+3], fill=(46,125,50))
    date_str = datetime.now().strftime('%d/%m/%Y %H:%M')
    area = round(W*H*(altitude**2)/1e8, 2)
    draw.text((10,ch-60), f"AgroSmart | Cartographie aérienne | {n_photos} photos | Meilleure: {best_name} | Alt: {altitude}m | {date_str}", fill=(255,255,255))
    draw.text((10,ch-38), f"Surface: ~{area} ha | Résolution: ~{round(gsd_m*100,1)} cm/px | Méthode: Sélection optimale + Annotations cartographiques", fill=(144,238,144))
    draw.text((cw-115,ch-38), "AgroSmart IoT", fill=(80,180,80))

    return canvas, W, H, gsd_m

# ── Vue 3D relief ─────────────────────────────────────────────────────────
def create_3d_relief(img_pil, altitude):
    """
    Vraie carte 3D en relief :
    1. Calcul carte de hauteur (végétation = plus haute)
    2. Simulation d'ombrage directionnel (lumière soleil)
    3. Rendu en perspective isométrique
    """
    W, H = img_pil.size
    # Limiter taille pour performance
    max_dim = 1200
    scale = min(max_dim/W, max_dim/H, 1.0)
    if scale < 1.0:
        img_pil = img_pil.resize((int(W*scale), int(H*scale)), Image.LANCZOS)
        W, H = img_pil.size

    arr = np.array(img_pil, dtype=float)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]

    # ── Carte de hauteur basée sur végétation ──────────────────────────
    # NDVI approximé: végétation = vert dominant = plus haute
    nir_sim = g * 0.6 + b * 0.4
    ndvi = (nir_sim - r) / (nir_sim + r + 1e-8)
    ndvi_norm = np.clip((ndvi + 1) / 2, 0, 1)

    # Hauteur: végétation dense = haute, sol = bas
    height_map = ndvi_norm * 40  # max 40px de relief

    # Lisser la carte de hauteur
    from PIL import ImageFilter as IF
    hm_img = Image.fromarray((height_map * 255 / 40).astype(np.uint8))
    hm_img = hm_img.filter(IF.GaussianBlur(3))
    height_map = np.array(hm_img, dtype=float) * 40 / 255

    # ── Ombrage directionnel (soleil NW) ──────────────────────────────
    light_x, light_y = -1.0, -1.0  # Direction lumière
    dzdx = np.gradient(height_map, axis=1)
    dzdy = np.gradient(height_map, axis=0)

    # Vecteur normal à la surface
    norm_x = -dzdx
    norm_y = -dzdy
    norm_z = np.ones_like(dzdx) * 8.0
    length = np.sqrt(norm_x**2 + norm_y**2 + norm_z**2)
    norm_x /= length; norm_y /= length; norm_z /= length

    # Intensité lumineuse
    light_len = np.sqrt(light_x**2 + light_y**2 + 1.0)
    lx = light_x/light_len; ly = light_y/light_len; lz = 1.0/light_len
    diffuse = np.clip(norm_x*lx + norm_y*ly + norm_z*lz, 0, 1)
    ambient = 0.4
    shading = ambient + (1-ambient) * diffuse

    # Appliquer l'ombrage à l'image
    shaded = np.zeros_like(arr)
    for c in range(3):
        shaded[:,:,c] = np.clip(arr[:,:,c] * shading, 0, 255)

    # ── Vue en perspective (projection isométrique simplifiée) ─────────
    # Angle de vue: 35° du dessus
    angle_deg = 35
    angle_rad = angle_deg * np.pi / 180
    cos_a = np.cos(angle_rad)

    # Calculer la taille du rendu en perspective
    render_w = W
    render_h = int(H * cos_a + max(height_map.ravel()) * np.sin(angle_rad) + 60)
    render = np.zeros((render_h, render_w, 3), dtype=np.uint8)
    render[:] = [18, 38, 18]  # Fond vert foncé

    # Projeter chaque ligne
    for row in range(H):
        # Position Y projetée (avec perspective)
        proj_y = int(row * cos_a + height_map[row, W//2] * np.sin(angle_rad))
        proj_y = min(proj_y, render_h - 1)

        # Décalage Y dû à la hauteur (effet relief)
        y_offset = height_map[row, :] * np.sin(angle_rad)

        for col in range(W):
            dest_y = int(row * cos_a + y_offset[col])
            if 0 <= dest_y < render_h:
                render[dest_y, col] = shaded[row, col].astype(np.uint8)

    result = Image.fromarray(render)

    # Annotations 3D
    draw = ImageDraw.Draw(result)
    draw.text((10, 10), f"Vue 3D en relief | Alt: {altitude}m | AgroSmart IoT", fill=(144,238,144))
    draw.text((10, 28), f"Végétation dense = zones surélevées | Sol = zones basses", fill=(180,220,180))

    # Légende hauteur
    leg_w, leg_h2 = 160, 90
    lx2 = result.width - leg_w - 10
    ly2 = 10
    draw.rectangle([lx2, ly2, lx2+leg_w, ly2+leg_h2], fill=(0,0,0), outline=(100,200,100))
    draw.text((lx2+6, ly2+4), "Relief:", fill=(255,255,255))
    for i, (color, label) in enumerate([
        ((0,100,0), "Végétation dense"),
        ((100,180,50), "Végétation mod."),
        ((255,200,50), "Végétation faible"),
        ((139,90,43), "Sol nu"),
    ]):
        y3 = ly2+20+i*17
        draw.rectangle([lx2+6, y3, lx2+18, y3+12], fill=color)
        draw.text((lx2+22, y3), label, fill=(200,200,200))

    return result

# ── NDVI ─────────────────────────────────────────────────────────────────
def generate_ndvi(img_pil):
    W, H = img_pil.size
    r_a, g_a, b_a = [np.array(c, dtype=float) for c in img_pil.split()]
    nir = g_a*0.6 + b_a*0.4
    ndvi = np.clip((nir-r_a)/(nir+r_a+1e-10), -1, 1)
    color = np.zeros((H,W,3), dtype=np.uint8)
    for mask, col in [
        (ndvi<-0.1,                       (139, 90, 43)),
        ((ndvi>=-0.1)&(ndvi<0.1),         (210,180,140)),
        ((ndvi>=0.1)&(ndvi<0.2),          (255,255,  0)),
        ((ndvi>=0.2)&(ndvi<0.35),         (150,200, 50)),
        ((ndvi>=0.35)&(ndvi<0.5),         ( 50,160, 50)),
        (ndvi>=0.5,                        (  0,100,  0)),
    ]: color[mask] = col
    out = Image.fromarray(color).filter(ImageFilter.GaussianBlur(2))
    # Légende
    lw,lh = 200,155
    leg = Image.new('RGB',(lw,lh),(15,35,15))
    d = ImageDraw.Draw(leg)
    d.rectangle([0,0,lw-1,lh-1],outline=(100,200,100),width=1)
    d.text((8,5),"Indice NDVI",fill=(255,255,255))
    for i,(r,g,b,lbl) in enumerate([(0,100,0,"Dense >0.5"),(50,160,50,"Bonne 0.35-0.5"),(150,200,50,"Modérée 0.2-0.35"),(255,255,0,"Faible 0.1-0.2"),(210,180,140,"Très faible"),(139,90,43,"Sol nu")]):
        y=24+i*21; d.rectangle([8,y,24,y+15],fill=(r,g,b),outline=(255,255,255)); d.text((28,y+2),lbl,fill=(220,220,220))
    final = Image.new('RGB',out.size,(15,35,15))
    final.paste(out)
    final.paste(leg,(out.width-lw-6,out.height-lh-6))
    return final, float(np.mean(ndvi))

# ── Main ──────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--photos', nargs='+', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--ndvi', required=True)
    parser.add_argument('--view3d', required=True)
    parser.add_argument('--stats', required=True)
    parser.add_argument('--altitude', type=int, default=60)
    args = parser.parse_args()

    n = len(args.photos)
    print(f"[START] {n} photos")

    # 1. Meilleure photo
    print("\n[STEP 1] Sélection...")
    best = select_best(args.photos)
    best_name = os.path.basename(best)

    # 2. Charger + supprimer zones noires
    print("\n[STEP 2] Chargement + crop zones noires...")
    img = Image.open(best).convert('RGB')
    W0, H0 = img.size
    scale = min(2000/W0, 2000/H0, 1.0)
    if scale < 1.0:
        img = img.resize((int(W0*scale), int(H0*scale)), Image.LANCZOS)
    img = remove_black_borders(img)  # ← Suppression zones noires
    img = ImageEnhance.Contrast(img).enhance(1.12)
    img = ImageEnhance.Sharpness(img).enhance(1.25)
    img = ImageEnhance.Color(img).enhance(1.08)
    print(f"[OK] Image finale: {img.size}")

    # 3. Carte 2D
    print("\n[STEP 3] Carte 2D annotée...")
    map2d, W, H, gsd = create_map_2d(img, n, args.altitude, best_name)
    map2d.save(args.output, 'JPEG', quality=92, optimize=True)
    print(f"[OK] Carte 2D: {args.output}")

    # 4. Vue 3D relief
    print("\n[STEP 4] Vue 3D en relief...")
    try:
        view3d = create_3d_relief(img, args.altitude)
        view3d.save(args.view3d, 'JPEG', quality=88)
        has3d = True
        print(f"[OK] Vue 3D: {args.view3d}")
    except Exception as e:
        print(f"[WARN] Vue 3D: {e}", file=sys.stderr)
        has3d = False

    # 5. NDVI
    print("\n[STEP 5] NDVI...")
    ndvi_img, avg_ndvi = generate_ndvi(img)
    ndvi_img.save(args.ndvi, 'JPEG', quality=88)
    print(f"[OK] NDVI: {avg_ndvi:.3f}")

    # Stats
    area = round(W*H*(args.altitude**2)/1e8, 3)
    stats = {
        'photoCount': n, 'bestPhoto': best_name,
        'mosaicWidth': W, 'mosaicHeight': H,
        'avgNDVI': round(avg_ndvi,3),
        'ndviClass': ('Excellente' if avg_ndvi>0.4 else 'Bonne' if avg_ndvi>0.25 else 'Modérée' if avg_ndvi>0.1 else 'Faible'),
        'estimatedArea': area, 'resolution': round(gsd*100,1),
        'processingMethod': 'Sélection optimale + Relief 3D', 'has3DView': has3d
    }
    with open(args.stats,'w') as f: json.dump(stats,f,indent=2)
    print("\nDONE")

if __name__ == '__main__':
    main()
