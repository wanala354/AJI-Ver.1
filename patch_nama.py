import os

file_path = "C:/Users/HP/OneDrive/Documents/2026/App_Proj/AJI/index.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """      const jamaahRowsP1 = (data.jamaahList || []).map(j => ({
        id: j.id,
        nama_lengkap: j.namaLengkap,"""

replacement = """      const jamaahRowsP1 = (data.jamaahList || []).map(j => ({
        id: j.id,
        nama_lengkap: j.namaLengkap || "Tidak Diketahui","""

new_content = content.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replaced successfully!")
