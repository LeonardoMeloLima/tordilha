from PIL import Image

def main():
    try:
        img = Image.open('public/logo-full.png')
        img = img.convert('RGBA')
        
        # Based on analysis:
        # Columns drop to 13k at x=67 before rising again for the text.
        # Rows jump from 10k to 33k at y=70 (start of "Tordilha" text).
        
        crop_x = 67
        crop_y = 69
        
        cropped = img.crop((0, 0, crop_x, crop_y))
        
        # Trim whitespace
        bbox = cropped.getbbox()
        if bbox:
            cropped = cropped.crop(bbox)
            
        cropped.save('public/logo-icon.png')
        print(f"Saved logo-icon.png with crop {crop_x}x{crop_y} and bbox {bbox}")
        
    except Exception as e:
        print(e)

if __name__ == '__main__':
    main()
