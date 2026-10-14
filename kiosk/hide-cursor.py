import struct, os, shutil

header = struct.pack('<4sIII', b'Xcur', 16, 0x10000, 1)
toc = struct.pack('<III', 0xfffd0002, 1, 28)
img_hdr = struct.pack('<IIIIIIIII', 40, 0xfffd0002, 1, 1, 1, 1, 0, 0, 0)
pixel = struct.pack('<I', 0)
data = header + toc + img_hdr + pixel

# 1. Install dedicated transparent theme (separate from system default)
cursor_dir = os.path.expanduser('~/.icons/transparent/cursors')
os.makedirs(cursor_dir, exist_ok=True)
base_file = os.path.join(cursor_dir, 'left_ptr')
with open(base_file, 'wb') as f:
    f.write(data)

aliases = [
    'default', 'pointer', 'arrow', 'hand1', 'hand2', 'cross', 'wait',
    'watch', 'xterm', 'text', 'dnd-move', 'dnd-copy', 'dnd-none'
]
for a in aliases:
    target = os.path.join(cursor_dir, a)
    if not os.path.exists(target):
        try:
            os.symlink('left_ptr', target)
        except OSError:
            with open(target, 'wb') as f:
                f.write(data)

theme_file = os.path.expanduser('~/.icons/transparent/index.theme')
with open(theme_file, 'w') as f:
    f.write('[Icon Theme]\nName=transparent\nComment=Transparent Cursor Theme\nInherits=transparent\n')

# 2. Clean up any overrides in ~/.icons/default so desktop is 100% normal
old_default = os.path.expanduser('~/.icons/default')
if os.path.exists(old_default):
    shutil.rmtree(old_default, ignore_errors=True)

# 3. Restore labwc environment file to desktop defaults (clean out global cursor overrides)
env_file = os.path.expanduser('~/.config/labwc/environment')
if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        lines = f.readlines()
    clean_lines = [l for l in lines if 'XCURSOR_THEME' not in l and 'XCURSOR_SIZE' not in l]
    with open(env_file, 'w') as f:
        f.writelines(clean_lines)

print('Independent transparent cursor theme installed; desktop defaults restored!')

