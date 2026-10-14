import struct, os

header = struct.pack('<4sIII', b'Xcur', 16, 0x10000, 1)
toc = struct.pack('<III', 0xfffd0002, 1, 28)
img_hdr = struct.pack('<IIIIIIIII', 40, 0xfffd0002, 1, 1, 1, 1, 0, 0, 0)
pixel = struct.pack('<I', 0)
data = header + toc + img_hdr + pixel

cursor_dir = os.path.expanduser('~/.icons/default/cursors')
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

theme_file = os.path.expanduser('~/.icons/default/index.theme')
with open(theme_file, 'w') as f:
    f.write('[Icon Theme]\nName=Default\nComment=Transparent Cursor Theme\nInherits=default\n')

# Configure labwc environment file
env_dir = os.path.expanduser('~/.config/labwc')
os.makedirs(env_dir, exist_ok=True)
env_file = os.path.join(env_dir, 'environment')

existing = ''
if os.path.exists(env_file):
    with open(env_file, 'r') as f:
        existing = f.read()

lines = []
if 'XCURSOR_THEME' not in existing:
    lines.append('XCURSOR_THEME=default')
if 'XCURSOR_SIZE' not in existing:
    lines.append('XCURSOR_SIZE=1')

if lines:
    with open(env_file, 'a') as f:
        f.write('\n' + '\n'.join(lines) + '\n')

print('Transparent cursor theme and Labwc environment successfully installed!')
