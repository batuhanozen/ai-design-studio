"""Regenerate the README screenshots in docs/images/.

Optional developer script (not part of CI). Requires Python Playwright with a
Chromium build and a running dev server:

    npm run dev                       # in one terminal
    python3 scripts/capture-screenshots.py [http://127.0.0.1:5173/]

Every screenshot starts from a fresh browser profile, so nothing from your own
saved design leaks into the images.
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5173/"
OUT = pathlib.Path(__file__).resolve().parent.parent / "docs" / "images"
OUT.mkdir(parents=True, exist_ok=True)
DESKTOP = {"width": 1440, "height": 900}


def fresh(browser, viewport, scale=2):
    context = browser.new_context(viewport=viewport, device_scale_factor=scale)
    page = context.new_page()
    page.goto(URL)
    page.wait_for_selector(".artboard")
    return context, page


def shot(page, name):
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / name))
    print("wrote", name)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1. Overview: generate + preview + inspector, an element selected.
    ctx, page = fresh(browser, DESKTOP)
    page.click("text=Welcome back.")
    shot(page, "01-overview.png")

    # 2. Layers panel with the shared selection.
    page.click(".sidebar-tabs button:has-text('Layers')")
    page.click("[role=treeitem] >> text=Button")
    shot(page, "02-layers.png")

    # 3. Editing through the inspector.
    page.click(".sidebar-tabs button:has-text('Generate')")
    page.click("text=Welcome back.")
    field = page.locator("input[aria-label=text]")
    field.fill("Welcome to Forma")
    field.press("Enter")
    shot(page, "03-inspector-edit.png")

    # 4. Validation: an unsafe color is rejected, the design is kept.
    page.click("text=Welcome to Forma")
    color = page.locator("input[aria-label=color]")
    color.fill("javascript:alert(1)")
    color.press("Enter")
    shot(page, "04-validation-error.png")
    ctx.close()

    # 5-6. JSON and React exports.
    ctx, page = fresh(browser, DESKTOP)
    page.click(".tabs button:has-text('JSON')")
    shot(page, "05-json-export.png")
    page.click(".tabs button:has-text('React')")
    shot(page, "06-react-export.png")
    ctx.close()

    # 7-8. Other starting points.
    ctx, page = fresh(browser, DESKTOP)
    page.click(".sample-list button:has-text('Pricing card')")
    shot(page, "07-pricing-sample.png")
    page.click(".sample-list button:has-text('Dashboard header')")
    shot(page, "08-dashboard-sample.png")
    ctx.close()

    # 9. Drag and drop in the Layers tree (real mouse), mid-drag.
    ctx, page = fresh(browser, DESKTOP)
    page.click(".sidebar-tabs button:has-text('Layers')")
    rows = page.locator(".tree-row")
    source = rows.filter(has_text="Button").first.bounding_box()
    page.mouse.move(source["x"] + 40, source["y"] + source["height"] / 2)
    page.mouse.down()
    page.mouse.move(source["x"] + 60, source["y"] - 10, steps=6)
    page.wait_for_selector(".tree-dropzones")
    target = page.locator("[data-drop$=':before']").nth(2).bounding_box()
    page.mouse.move(target["x"] + 20, target["y"] + target["height"] / 2, steps=6)
    shot(page, "09-layers-drag.png")
    page.mouse.up()
    ctx.close()

    # 10. Phone width.
    ctx, page = fresh(browser, {"width": 390, "height": 844}, scale=2)
    page.click("text=Welcome back.")
    shot(page, "10-mobile.png")
    ctx.close()

    browser.close()
