"""
Build Chrome Web Store assets for Arc Tabs v2.
- 3 screenshots (1280x800) — popup centered on branded gradient bg
- Promo tile large (1320x720) — all three views composited
- Promo tile small (440x280)
"""

from PIL import Image, ImageDraw, ImageFilter
import math

# --- Config ---
OUT = "/Users/salim/labs/arc-tabs/arc-tabs-assets"
SRC = "/Users/salim/pictures"

FILES = {
    "tabs":      f"{SRC}/Screenshot 2026-06-29 at 21.24.20.png",
    "protected": f"{SRC}/Screenshot 2026-06-29 at 21.21.23.png",
    "settings":  f"{SRC}/Screenshot 2026-06-29 at 21.21.34.png",
}

ACCENT_PURPLE = (138, 79, 255)
ACCENT_PINK   = (242, 105, 170)

CANVAS_W, CANVAS_H = 1280, 800
TILE_LARGE_W, TILE_LARGE_H = 1320, 720
TILE_SMALL_W, TILE_SMALL_H = 440, 280

# Crop inset — trim screenshot artifacts from edges
CROP = 4


def crop_popup(path):
    """Crop a tightly-fitting rectangle around the popup content."""
    img = Image.open(path).convert("RGB")
    w, h = img.size
    pixels = img.load()

    # Find darkest bounding box (the popup is ~17,17,18)
    left, right = w, 0
    top, bottom = h, 0
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            if r < 35 and g < 35 and b < 35:
                if x < left:   left   = x
                if x > right:  right  = x
                if y < top:    top    = y
                if y > bottom: bottom = y

    # Inset a few more pixels to remove edge artifacts
    return img.crop((left + CROP, top + CROP, right - CROP, bottom - CROP))


def upscale(popup_img, scale):
    """Upscale using Lanczos, which gives sharp results for UI."""
    nw = max(1, int(round(popup_img.width  * scale)))
    nh = max(1, int(round(popup_img.height * scale)))
    return popup_img.resize((nw, nh), Image.LANCZOS)


def shadow_canvas(size, popup_img, offset=(5, 8), blur=18, opacity=120):
    """Return an RGBA canvas the size of the tile with a soft shadow of `popup_img`."""
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    pw, ph = popup_img.size
    sw, sh = pw + offset[0] * 2 + blur * 2, ph + offset[1] * 2 + blur * 2
    shadow_layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    # Draw the popup silhouette filled with dark, using alpha=opacity
    dark = Image.new("RGB", popup_img.size, (0, 0, 0))
    layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    layer.paste(dark, (offset[0] + blur, offset[1] + blur))
    # Apply popup's own shape as alpha
    # For a screenshot, the popup fills its rectangle, so just fade the whole rect
    alpha_arr = layer.split()[3] if layer.mode == "RGBA" else None
    layer.putalpha(Image.eval(Image.new("L", popup_img.size, opacity), lambda x: x))
    layer_final = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    layer_final.paste(dark, (offset[0] + blur, offset[1] + blur))
    layer_final.putalpha(Image.new("L", (sw, sh), 0))
    layer_final.paste(Image.new("L", popup_img.size, opacity), (offset[0] + blur, offset[1] + blur))
    layer_final = layer_final.filter(ImageFilter.GaussianBlur(blur))
    # Paste onto canvas centered relative to where popup goes
    # We'll position the shadow relative to popup's final position
    return layer_final, (sw, sh)


def position_popup(popup_size, canvas_w, canvas_h):
    """Return (x, y) to center `popup_size` on canvas, clamped to stay in-bounds."""
    pw, ph = popup_size
    x = (canvas_w - pw) // 2
    y = (canvas_h - ph) // 2
    # Clamp — if popup is larger than canvas, it overflows which is OK for screenshot
    return max(0, x), max(0, y)


def apply_shadow_and_paste(bg_rgba, layer, x, y):
    """Paste `layer` (RGBA, same size as bg) onto bg_rgba at (x, y) — NOT at (0,0)"""
    # Actually this function was designed wrong. Let me redo it:
    pass


def place_on_bg(bg_rgba, popup_img, px, py, blur=18, shadow_opacity=110, offset=(5, 8)):
    """Paste popup with drop shadow onto an RGBA canvas."""
    pw, ph = popup_img.size
    sw = pw + offset[0] * 2 + blur * 2
    sh = ph + offset[1] * 2 + blur * 2
    sx = px - sw // 2 + pw // 2
    sy = py - sh // 2 + py // 2

    # Shadow layer
    shadow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    shadow_rect = Image.new("L", (pw, ph), shadow_opacity)
    shadow.paste((0, 0, 0, shadow_opacity), (offset[0] + blur, offset[1] + blur), shadow_rect)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    bg_rgba.paste(shadow, (px - (sw - pw) // 2 + offset[0], py - (sh - ph) // 2 + offset[1]), shadow)

    # Popup
    if popup_img.mode == "RGBA":
        bg_rgba.paste(popup_img, (px, py), popup_img)
    else:
        bg_rgba.paste(popup_img, (px, py))


def make_bg_screenshot():
    """Dark purple-ish gradient for screenshots."""
    cw, ch = CANVAS_W, CANVAS_H
    img = Image.new("RGB", (cw, ch))
    draw = ImageDraw.Draw(img)
    for y in range(ch):
        t = y / ch  # 0 → top, 1 → bottom
        # Top: slightly purple-dark (22, 18, 34)
        # Bottom: near black (8, 8, 12)
        r = int(22 + (8  - 22) * t)
        g = int(18 + (8  - 18) * t)
        b = int(34 + (12 - 34) * t)
        draw.line([(0, y), (cw, y)], fill=(r, g, b))
    return img


def make_bg_promo_large():
    """Interesting promo bg with accent glows."""
    w, h = TILE_LARGE_W, TILE_LARGE_H
    img = Image.new("RGB", (w, h))
    # Base gradient (top-left dark-purple to bottom-right darker)
    base = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(base)
    for y in range(h):
        t = y / h
        r = int(18 + (8  - 18) * t)
        g = int(14 + (8  - 14) * t)
        b = int(26 + (14 - 26) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Purple glow top-right
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = int(w * 0.88), int(h * 0.22)
    radius = int(min(w, h) * 0.55)
    for y in range(max(0, cy - radius), min(h, cy + radius)):
        for x in range(max(0, cx - radius), min(w, cx + radius)):
            dx = (x - cx) / radius
            dy = (y - cy) / radius
            d = math.sqrt(dx * dx + dy * dy)
            if d < 1.0:
                intensity = (1.0 - d) ** 2.0
                a = int(intensity * 30)
                if a > 0:
                    gd.point((x, y), fill=(*ACCENT_PURPLE, a))

    # Pink glow bottom-left  
    cx2, cy2 = int(w * 0.15), int(h * 0.78)
    for y in range(max(0, cy2 - radius), min(h, cy2 + radius)):
        for x in range(max(0, cx2 - radius), min(w, cx2 + radius)):
            dx = (x - cx2) / radius
            dy = (y - cy2) / radius
            d = math.sqrt(dx * dx + dy * dy)
            if d < 1.0:
                intensity = (1.0 - d) ** 2.0
                a = int(intensity * 20)
                if a > 0:
                    existing = glow.getpixel((x, y))
                    # Just add on top
                    pass

    # Simpler: just paste both glow layers
    glow2 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd2 = ImageDraw.Draw(glow2)
    for y in range(max(0, cy2 - radius), min(h, cy2 + radius)):
        for x in range(max(0, cx2 - radius), min(w, cx2 + radius)):
            dx = (x - cx2) / radius
            dy = (y - cy2) / radius
            d = math.sqrt(dx * dx + dy * dy)
            if d < 1.0:
                intensity = (1.0 - d) ** 2.0
                a = int(intensity * 20)
                if a > 0:
                    gd2.point((x, y), fill=(*ACCENT_PINK, a))

    base_rgba = base.convert("RGBA")
    base_rgba = Image.alpha_composite(base_rgba, glow)
    base_rgba = Image.alpha_composite(base_rgba, glow2)
    return base_rgba.convert("RGB")


def build_screenshots():
    print("=== Screenshots ===")
    popups = {name: crop_popup(path) for name, path in FILES.items()}
    for name, p in popups.items():
        print(f"  {name}: {p.size[0]}x{p.size[1]} (cropped)")

    # Scale all popups uniformly so the tallest fills ~92% of canvas height
    # Tabs (358px) is the tallest — target = 800 * 0.92 = 736
    UNIFORM_SCALE = min(
        (CANVAS_H * 0.92) / popups["tabs"].height,
        (CANVAS_H * 0.92) / popups["protected"].height * 0.8 if False else 999,  # not used
        999.0
    )
    # Actually, use a FIXED uniform scale
    SCALE = 2.1

    for name in ["tabs", "protected", "settings"]:
        popup = popups[name]
        upscaled = upscale(popup, SCALE)
        pw, ph = upscaled.size

        bg = make_bg_screenshot().convert("RGBA")
        px, py = position_popup((pw, ph), CANVAS_W, CANVAS_H)

        # Shadow + paste
        shadow_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        shadow_w = pw + 12 + 40  # offset*2 + blur*2
        shadow_h = ph + 16 + 40
        shadow_bg = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
        # Draw dark rect with opacity
        dark_rect = Image.new("L", (pw, ph), 100)
        shadow_bg.paste((0, 0, 0), (10, 14), dark_rect)
        shadow_bg = shadow_bg.filter(ImageFilter.GaussianBlur(20))
        shadow_x = px - (shadow_w - pw) // 2 + 5
        shadow_y = py - (shadow_h - ph) // 2 + 8
        shadow_layer.paste(shadow_bg, (shadow_x, shadow_y), shadow_bg)
        bg.paste(shadow_layer, (0, 0), shadow_layer)

        # Paste popup
        bg.paste(upscaled, (px, py))

        out_path = f"{OUT}/screenshots/screenshot-{name}.png"
        bg.convert("RGB").save(out_path, "PNG")
        print(f"  → {out_path} ({CANVAS_W}x{CANVAS_H}), popup at ({px},{py}) size={pw}x{ph}")


def build_promo_tiles(popups):
    print("\n=== Promo Tile (1320x720) ===")

    bg = make_bg_promo_large().convert("RGBA")

    # --- Layout ---
    # Left: Tabs popup (main feature) — large
    # Top-right: Protected Domains popup
    # Bottom-right: Settings popup
    # All three with drop shadows, slightly overlapping for cohesion

    S_TABS = 1.78
    S_PROT = 1.28
    S_SET  = 1.48

    tabs_up    = upscale(popups["tabs"],      S_TABS)
    prot_up    = upscale(popups["protected"], S_PROT)
    set_up     = upscale(popups["settings"],  S_SET)

    # Positioning (pixel coords)
    tabs_x = 35
    tabs_y = (TILE_LARGE_H - tabs_up.height) // 2

    prot_x = tabs_x + tabs_up.width + 25
    prot_y = 24

    set_x  = prot_x
    set_y  = prot_y + prot_up.height + 18
    # Ensure set doesn't overflow bottom
    if set_y + set_up.height > TILE_LARGE_H - 24:
        set_y = TILE_LARGE_H - set_up.height - 24

    canvas = bg
    for pup, px, py in [
        (tabs_up, tabs_x, tabs_y),
        (prot_up, prot_x, prot_y),
        (set_up,  set_x,  set_y),
    ]:
        pw, ph = pup.size
        # Shadow
        sl = Image.new("RGBA", (TILE_LARGE_W, TILE_LARGE_H), (0, 0, 0, 0))
        sw = pw + 36
        sh = ph + 40
        sbg = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        alpha = Image.new("L", (pw, ph), 90)
        sbg.paste((0, 0, 0), (10, 14), alpha)
        sbg = sbg.filter(ImageFilter.GaussianBlur(18))
        sx = px - (sw - pw) // 2
        sy = py - (sh - ph) // 2
        sl.paste(sbg, (sx, sy), sbg)
        canvas = Image.alpha_composite(canvas, sl)

        # Popup
        pl = Image.new("RGBA", (TILE_LARGE_W, TILE_LARGE_H), (0, 0, 0, 0))
        pl.paste(pup, (px, py), pup if pup.mode == "RGBA" else None)
        canvas = Image.alpha_composite(canvas, pl)

    out_large = f"{OUT}/promo-tile/promo-tile-large-1320x720.png"
    canvas.convert("RGB").save(out_large, "PNG")
    print(f"  → {out_large}")

    # --- Small promo tile (440x280) ---
    print("\n=== Promo Tile Small (440x280) ===")
    bg_small = Image.new("RGB", (TILE_SMALL_W, TILE_SMALL_H))
    draw = ImageDraw.Draw(bg_small)
    for y in range(TILE_SMALL_H):
        t = y / TILE_SMALL_H
        r = int(22 + (10 - 22) * t)
        g = int(18 + (10 - 18) * t)
        b = int(32 + (16 - 32) * t)
        draw.line([(0, y), (TILE_SMALL_W, y)], fill=(r, g, b))

    S_SMALL = 0.72
    tabs_small = upscale(popups["tabs"], S_SMALL)
    pw, ph = tabs_small.size
    px = (TILE_SMALL_W - pw) // 2
    py = (TILE_SMALL_H - ph) // 2

    canvas_small = bg_small.convert("RGBA")
    # Shadow
    sl = Image.new("RGBA", (TILE_SMALL_W, TILE_SMALL_H), (0, 0, 0, 0))
    sw = pw + 24
    sh = ph + 28
    sbg = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    alpha = Image.new("L", (pw, ph), 80)
    sbg.paste((0, 0, 0), (6, 8), alpha)
    sbg = sbg.filter(ImageFilter.GaussianBlur(10))
    sx = px - (sw - pw) // 2
    sy = py - (sh - ph) // 2
    sl.paste(sbg, (sx, sy), sbg)
    canvas_small = Image.alpha_composite(canvas_small, sl)

    pl = Image.new("RGBA", (TILE_SMALL_W, TILE_SMALL_H), (0, 0, 0, 0))
    pl.paste(tabs_small, (px, py), tabs_small if tabs_small.mode == "RGBA" else None)
    canvas_small = Image.alpha_composite(canvas_small, pl)

    out_small = f"{OUT}/promo-tile/promo-tile-small-440x280.png"
    canvas_small.convert("RGB").save(out_small, "PNG")
    print(f"  → {out_small}")


if __name__ == "__main__":
    popups = {name: crop_popup(path) for name, path in FILES.items()}
    for name, p in popups.items():
        print(f"{name}: {p.size}")

    build_screenshots()
    build_promo_tiles(popups)
    print("\nDone.")
