"""
Build Chrome Web Store assets for Arc Tabs:
- 3 screenshots (1280x800) with popup upscaled on a branded background
- Promo tile (1320x720) combining all three views
"""

from PIL import Image, ImageDraw, ImageFilter
import math

# --- Configuration ---
OUTPUT_DIR = "/Users/salim/labs/arc-tabs/arc-tabs-assets"
PNG_DIR = "/Users/salim/pictures"

# Source images (the popups)
SRC_TABS = f"{PNG_DIR}/Screenshot 2026-06-29 at 21.24.20.png"
SRC_PROTECTED = f"{PNG_DIR}/Screenshot 2026-06-29 at 21.21.23.png"
SRC_SETTINGS = f"{PNG_DIR}/Screenshot 2026-06-29 at 21.21.34.png"

# Accent colors from the extension
ACCENT_PINK = (242, 105, 170)
ACCENT_PURPLE = (138, 79, 255)
BG_DARK = (17, 17, 18)
BG_CARD = (30, 30, 35)

CROP_MARGIN = 3  # trim pixels from each edge to remove artifacts


def crop_popup(path, margin=CROP_MARGIN):
    """Crop tightly to the popup, trimming edge artifacts."""
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    return img.crop((margin, margin, w - margin, h - margin))


def add_shadow(popup_img, offset=(4, 6), blur=12, opacity=0.4):
    """Add a soft drop shadow behind the popup."""
    shadow = Image.new("RGBA", popup_img.size, (0, 0, 0, 0))
    # Create shadow by drawing the alpha shape offset and blurred
    pw, ph = popup_img.size
    shadow_canvas = Image.new("RGBA", (pw + offset[0] * 2 + blur * 2, ph + offset[1] * 2 + blur * 2), (0, 0, 0, 0))
    # Paste a dark version offset
    dark = Image.new("RGBA", popup_img.size, (0, 0, 0, int(255 * opacity)))
    # Use popup's alpha as mask
    alpha = popup_img.split()[3] if popup_img.mode == "RGBA" else None
    shadow_canvas.paste(dark, (offset[0] + blur, offset[1] + blur), alpha)
    shadow_canvas = shadow_canvas.filter(ImageFilter.GaussianBlur(blur))
    return shadow_canvas


def make_gradient_bg(width, height, color_top=(20, 18, 25), color_bottom=(10, 10, 14)):
    """Create a vertical gradient background."""
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        ratio = y / height
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * ratio)
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * ratio)
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img


def make_radial_gradient(width, height, center_color=(30, 25, 45), edge_color=(10, 10, 14)):
    """Create a radial gradient background (darker edges, slightly lighter center)."""
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    cx, cy = width / 2, height / 2
    max_dist = math.sqrt(cx ** 2 + cy ** 2)
    for y in range(height):
        for x in range(width):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            ratio = min(dist / max_dist, 1.0)
            ratio = ratio ** 0.8  # ease
            r = int(center_color[0] + (edge_color[0] - center_color[0]) * ratio)
            g = int(center_color[1] + (edge_color[1] - center_color[1]) * ratio)
            b = int(center_color[2] + (edge_color[2] - center_color[2]) * ratio)
            draw.point((x, y), fill=(r, g, b))
    return img


def upscale_popup(popup, scale=2.5):
    """Upscale the popup image with Lanczos resampling."""
    new_w = int(popup.width * scale)
    new_h = int(popup.height * scale)
    return popup.resize((new_w, new_h), Image.LANCZOS)


def compose_screenshot(popup, canvas_w=1280, canvas_h=800, scale=2.8):
    """Place an upscaled popup centered on a branded 1280x800 canvas."""
    # Create background with subtle radial gradient
    bg = make_radial_gradient(
        canvas_w, canvas_h,
        center_color=(28, 24, 40),  # slightly purple-tinted center
        edge_color=(8, 8, 12)        # very dark edges
    )

    # Upscale popup
    upscaled = upscale_popup(popup, scale)

    # Add drop shadow
    shadow = add_shadow(upscaled, offset=(5, 8), blur=20, opacity=0.5)

    # Center the shadow + popup on canvas
    suw, suh = shadow.size
    shadow_x = (canvas_w - suw) // 2
    shadow_y = (canvas_h - suh) // 2

    # Paste shadow
    bg_rgba = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    bg_rgba_bg = Image.new("RGBA", (canvas_w, canvas_h))
    for y in range(canvas_h):
        for x in range(canvas_w):
            bg_rgba_bg.putpixel((x, y), (*bg.getpixel((x, y)), 255))

    bg_rgba_bg.paste(shadow, (shadow_x, shadow_y), shadow)

    # Paste popup
    popup_x = (canvas_w - upscaled.width) // 2
    popup_y = (canvas_h - upscaled.height) // 2
    bg_rgba_bg.paste(upscaled, (popup_x, popup_y), upscaled if upscaled.mode == "RGBA" else None)

    return bg_rgba_bg.convert("RGB")


def build_screenshots():
    """Generate the three screenshots."""
    print("Building screenshots...")

    popup_tabs = crop_popup(SRC_TABS)
    popup_protected = crop_popup(SRC_PROTECTED)
    popup_settings = crop_popup(SRC_SETTINGS)

    print(f"  Tabs popup: {popup_tabs.size}")
    print(f"  Protected popup: {popup_protected.size}")
    print(f"  Settings popup: {popup_settings.size}")

    # Different scales to fill the canvas nicely
    # Tabs (tallest): scale so height fits well
    # Protected: similar
    # Settings (shortest): slightly larger scale
    
    for name, popup, scale in [
        ("screenshot-tabs", popup_tabs, 2.8),
        ("screenshot-protected", popup_protected, 2.8),
        ("screenshot-settings", popup_settings, 3.2),  # shorter popup, scale more
    ]:
        result = compose_screenshot(popup, scale=scale)
        path = f"{OUTPUT_DIR}/screenshots/{name}.png"
        result.save(path, "PNG", quality=95)
        print(f"  Saved: {path} ({result.size})")

    return popup_tabs, popup_protected, popup_settings


def build_promo_tile(popup_tabs, popup_protected, popup_settings):
    """Build a 1320x720 promo tile combining all three views."""
    print("\nBuilding promo tile...")

    TILE_W, TILE_H = 1320, 720

    # Background: dark purple gradient
    bg = Image.new("RGB", (TILE_W, TILE_H))
    draw = ImageDraw.Draw(bg)

    # Create a more interesting gradient with accent color hints
    for y in range(TILE_H):
        for x in range(TILE_W):
            # Base dark
            base_r, base_g, base_b = 14, 12, 20

            # Subtle purple glow from top-right
            dx = (x - TILE_W * 0.8) / TILE_W
            dy = (y - TILE_H * 0.2) / TILE_H
            glow = max(0, 1 - math.sqrt(dx * dx + dy * dy) * 1.5)
            glow = glow ** 2

            # Add a touch of accent purple
            r = int(base_r + ACCENT_PURPLE[0] * glow * 0.15)
            g = int(base_g + ACCENT_PURPLE[1] * glow * 0.1)
            b = int(base_b + ACCENT_PURPLE[2] * glow * 0.2)

            # Subtle pink glow from bottom-left
            dx2 = (x - TILE_W * 0.1) / TILE_W
            dy2 = (y - TILE_H * 0.8) / TILE_H
            glow2 = max(0, 1 - math.sqrt(dx2 * dx2 + dy2 * dy2) * 1.5)
            glow2 = glow2 ** 2

            r = int(r + ACCENT_PINK[0] * glow2 * 0.08)
            g = int(g + ACCENT_PINK[1] * glow2 * 0.05)
            b = int(b + ACCENT_PINK[2] * glow2 * 0.1)

            draw.point((x, y), fill=(r, g, b))

    # Layout: 
    # - Main (tabs popup) large on the left
    # - Protected domains popup smaller on upper right
    # - Settings popup smaller on lower right
    # All with drop shadows

    # Scale tabs popup to be prominent on the left
    tabs_scale = 1.8
    tabs_up = upscale_popup(popup_tabs, tabs_scale)
    tabs_x, tabs_y = 30, 40

    # Protected popup on upper right
    prot_scale = 1.4
    prot_up = upscale_popup(popup_protected, prot_scale)
    prot_x = TILE_W - prot_up.width - 40
    prot_y = 30

    # Settings popup on lower right
    set_scale = 1.6
    set_up = upscale_popup(popup_settings, set_scale)
    set_x = TILE_W - set_up.width - 40
    set_y = TILE_H - set_up.height - 30

    # Paste shadows then popups
    for popup_img, px, py in [
        (tabs_up, tabs_x, tabs_y),
        (prot_up, prot_x, prot_y),
        (set_up, set_x, set_y),
    ]:
        shadow = add_shadow(popup_img, offset=(4, 6), blur=15, opacity=0.4)
        suw, suh = shadow.size
        bg_rgba = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        bg_rgba.paste(shadow, (px + 2, py + 3), shadow)

        # Composite onto bg
        bg_final = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        bg_final.paste(bg, (0, 0))
        Image.alpha_composite(bg_final, bg_rgba)

        # Actually let me just paste directly
        pass

    # Simpler approach: paste shadows directly
    # Create a shadow layer
    shadow_layer = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
    for popup_img, px, py in [
        (tabs_up, tabs_x, tabs_y),
        (prot_up, prot_x, prot_y),
        (set_up, set_x, set_y),
    ]:
        shadow = add_shadow(popup_img, offset=(4, 6), blur=15, opacity=0.5)
        suw, suh = shadow.size
        ox = max(0, px - (suw - popup_img.width) // 2)
        oy = max(0, py - (suh - popup_img.height) // 2)
        shadow_layer.paste(shadow, (ox, oy), shadow)

    bg_rgba = bg.convert("RGBA")
    bg_rgba.paste(shadow_layer, (0, 0), shadow_layer)

    # Paste popups
    for popup_img, px, py in [
        (tabs_up, tabs_x, tabs_y),
        (prot_up, prot_x, prot_y),
        (set_up, set_x, set_y),
    ]:
        if popup_img.mode == "RGBA":
            bg_rgba.paste(popup_img, (px, py), popup_img)
        else:
            bg_rgba.paste(popup_img, (px, py))

    return bg_rgba.convert("RGB")


def build_promo_tile_simple(popup_tabs, popup_protected, popup_settings):
    """Build a cleaner promo tile with a simpler layout."""
    print("\nBuilding promo tile...")

    TILE_W, TILE_H = 1320, 720

    # Background
    bg = Image.new("RGB", (TILE_W, TILE_H))
    draw = ImageDraw.Draw(bg)

    # Draw gradient background using horizontal scanlines for speed
    for y in range(TILE_H):
        ratio = y / TILE_H
        # Dark purple to very dark
        r = int(20 + (8 - 20) * ratio)
        g = int(16 + (8 - 16) * ratio)
        b = int(30 + (14 - 30) * ratio)
        draw.line([(0, y), (TILE_W, y)], fill=(r, g, b))

    # Add subtle accent glow in top-right corner
    glow_img = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    for y in range(TILE_H):
        for x in range(TILE_W):
            # Distance from top-right
            dx = abs(x - TILE_W * 0.85) / TILE_W
            dy = abs(y - TILE_H * 0.15) / TILE_H
            dist = math.sqrt(dx * dx + dy * dy)
            glow = max(0, 1 - dist * 2.0)
            glow = glow ** 2.0
            if glow > 0.01:
                alpha = int(glow * 40)
                glow_draw.point((x, y), fill=(*ACCENT_PURPLE, alpha))

    bg_rgba = bg.convert("RGBA")
    bg_rgba = Image.alpha_composite(bg_rgba, glow_img)

    # --- Layout: three popups arranged with overlap ---
    # Main popup (tabs) center-left, large
    # Protected domains: top-right, medium
    # Settings: bottom-right, small-medium

    # Scale factors
    tabs_scale = 1.75
    prot_scale = 1.35
    set_scale = 1.5

    tabs_up = upscale_popup(popup_tabs, tabs_scale)
    prot_up = upscale_popup(popup_protected, prot_scale)
    set_up = upscale_popup(popup_settings, set_scale)

    # Positions
    tabs_x = 40
    tabs_y = (TILE_H - tabs_up.height) // 2

    # Right column: two smaller popups stacked
    right_w = TILE_W - tabs_x - tabs_up.width - 20  # space for right side
    prot_x = tabs_x + tabs_up.width + 30
    prot_y = 30

    set_x = prot_x
    set_y = prot_y + prot_up.height + 20

    # Ensure settings fits
    if set_y + set_up.height > TILE_H - 20:
        set_y = TILE_H - set_up.height - 20

    # Paste with shadows
    canvas = bg_rgba
    for popup_img, px, py in [
        (tabs_up, tabs_x, tabs_y),
        (prot_up, prot_x, prot_y),
        (set_up, set_x, set_y),
    ]:
        # Add shadow
        shadow = add_shadow(popup_img, offset=(5, 7), blur=18, opacity=0.45)
        sw, sh = shadow.size
        sx = px - (sw - popup_img.width) // 2
        sy = py - (sh - popup_img.height) // 2

        # Paste shadow
        shadow_bg = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        shadow_bg.paste(shadow, (sx, sy), shadow)
        canvas = Image.alpha_composite(canvas, shadow_bg)

        # Paste popup
        popup_layer = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        popup_layer.paste(popup_img, (px, py), popup_img if popup_img.mode == "RGBA" else None)
        canvas = Image.alpha_composite(canvas, popup_layer)

    return canvas.convert("RGB")


def build_small_promo_tile(popup_tabs, popup_protected, popup_settings):
    """Build the small promo tile (440x280)."""
    print("\nBuilding small promo tile (440x280)...")

    TILE_W, TILE_H = 440, 280

    # Dark gradient background
    bg = Image.new("RGB", (TILE_W, TILE_H))
    draw = ImageDraw.Draw(bg)
    for y in range(TILE_H):
        ratio = y / TILE_H
        r = int(22 + (10 - 22) * ratio)
        g = int(18 + (10 - 18) * ratio)
        b = int(32 + (16 - 32) * ratio)
        draw.line([(0, y), (TILE_W, y)], fill=(r, g, b))

    # Scale tabs popup to fit nicely
    tabs_scale = 0.72
    tabs_up = upscale_popup(popup_tabs, tabs_scale)

    # Paste
    px = (TILE_W - tabs_up.width) // 2
    py = (TILE_H - tabs_up.height) // 2

    canvas = bg.convert("RGBA")
    shadow = add_shadow(tabs_up, offset=(2, 3), blur=8, opacity=0.4)
    sw, sh = shadow.size
    sx = px - (sw - tabs_up.width) // 2
    sy = py - (sh - tabs_up.height) // 2

    shadow_layer = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
    shadow_layer.paste(shadow, (sx, sy), shadow)
    canvas = Image.alpha_composite(canvas, shadow_layer)

    popup_layer = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
    popup_layer.paste(tabs_up, (px, py), tabs_up if tabs_up.mode == "RGBA" else None)
    canvas = Image.alpha_composite(canvas, popup_layer)

    return canvas.convert("RGB")


if __name__ == "__main__":
    popup_tabs, popup_protected, popup_settings = build_screenshots()

    # Promo tile - large
    promo_large = build_promo_tile_simple(popup_tabs, popup_protected, popup_settings)
    promo_large_path = f"{OUTPUT_DIR}/promo-tile/promo-tile-large-1320x720.png"
    promo_large.save(promo_large_path, "PNG", quality=95)
    print(f"  Saved: {promo_large_path} ({promo_large.size})")

    # Promo tile - small
    promo_small = build_small_promo_tile(popup_tabs, popup_protected, popup_settings)
    promo_small_path = f"{OUTPUT_DIR}/promo-tile/promo-tile-small-440x280.png"
    promo_small.save(promo_small_path, "PNG", quality=95)
    print(f"  Saved: {promo_small_path} ({promo_small.size})")

    print("\nDone! All assets saved.")
