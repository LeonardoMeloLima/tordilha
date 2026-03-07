from PIL import Image
import sys

def remove_bg(img_path, out_path, tolerance=25):
    img = Image.open(img_path).convert("RGBA")
    data = img.getdata()
    
    # Assume the top-left pixel is the background color
    bg_color = data[0]
    
    new_data = []
    
    for item in data:
        # Calculate color difference (Manhattan distance)
        diff = sum(abs(item[i] - bg_color[i]) for i in range(3))
        
        if diff < tolerance:
            # Fully transparent
            new_data.append((item[0], item[1], item[2], 0))
        elif diff < tolerance + 80:
            # Semi-transparent for anti-aliased edge pixels
            # We scale the alpha from 0 to 255 over the transition band
            alpha = int(((diff - tolerance) / 80) * 255)
            new_data.append((item[0], item[1], item[2], alpha))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(out_path, "PNG")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python bg_remover.py <input> <output>")
        sys.exit(1)
    remove_bg(sys.argv[1], sys.argv[2])
