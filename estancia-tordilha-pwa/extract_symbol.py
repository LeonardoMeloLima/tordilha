from PIL import Image

def extract_symbol(img_path, out_path):
    img = Image.open(img_path).convert("RGBA")
    # Assuming height is roughly the width of the symbol (square aspect ratio for the horse head)
    width, height = img.size
    
    # Let's crop to a square from the left side
    target_width = int(height * 1.0) # slightly wider if needed, but 1.0 is a good guess for the horse head
    if target_width > width:
        target_width = width
        
    symbol = img.crop((0, 0, target_width, height))
    symbol.save(out_path)
    print(f"Extracted symbol from {width}x{height} to {target_width}x{height}")

if __name__ == "__main__":
    import sys
    extract_symbol(sys.argv[1], sys.argv[2])
