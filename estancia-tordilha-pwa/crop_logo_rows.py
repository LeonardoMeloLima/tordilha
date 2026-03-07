from PIL import Image

def main():
    try:
        img = Image.open('public/logo-full.png')
        img = img.convert('RGBA')
        width, height = img.size
        
        row_sums = [0]*height
        for y in range(height):
            s = 0
            for x in range(width):
                _, _, _, a = img.getpixel((x, y))
                s += a
            row_sums[y] = s
            
        print("Alpha sums Rows:")
        for y in range(height):
            print(f"y={y}: {row_sums[y]}")
                
    except Exception as e:
        print(e)

if __name__ == '__main__':
    main()
