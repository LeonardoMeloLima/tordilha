from PIL import Image

def crop_transparent(img_path):
    img = Image.open(img_path).convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        img.save(img_path)
        print("Cropped to:", bbox)
    else:
        print("No bounding box found (empty image?)")

if __name__ == "__main__":
    import sys
    crop_transparent(sys.argv[1])
