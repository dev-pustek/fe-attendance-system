import os
import glob

components_dir = "/Users/m1pro2021/mhmdiamd/work/pustek/attendance-system/fe-attendance-system-with-cctv/src/pages/Attendance/Metrics/"
files = glob.glob(os.path.join(components_dir, "*.tsx"))

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()
    
    # We replace 'grid-cols-1 gap-4 sm:grid-cols-2' with 'grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2'
    content = content.replace('grid grid-cols-1 gap-4 sm:grid-cols-2', 'grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2')
    
    # Also fix some charts padding / heights
    content = content.replace('height={300}', 'height={250}')
    
    with open(file_path, "w") as f:
        f.write(content)

print("Updated grid layouts for mobile in Metrics Views.")
