import threading
import tkinter as tk
import time
import os
from pystray import Icon, MenuItem, Menu
from PIL import Image, ImageDraw

GRID_SIZE = 4
TOTAL_SLOTS = GRID_SIZE * GRID_SIZE
CELL_SIZE = 80

# estado global (pro tray)
devices_state = set()
icon = None


# ==============================
# 🎨 UI
# ==============================

class MediaUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Media Organizer")
        self.root.geometry("400x400")
        self.root.resizable(False, False)

        self.frames = []
        self.labels = []
        self.device_map = {}

        self.build_grid()

    def build_grid(self):
        grid_frame = tk.Frame(self.root, bg="black")
        grid_frame.pack(expand=True)

        for i in range(GRID_SIZE):
            for j in range(GRID_SIZE):
                frame = tk.Frame(
                    grid_frame,
                    width=CELL_SIZE,
                    height=CELL_SIZE,
                    bg="black",
                    highlightthickness=2,
                    highlightbackground="gray"
                )

                frame.grid(row=i, column=j, padx=5, pady=5)
                frame.grid_propagate(False)

                label = tk.Label(
                    frame,
                    text="",
                    fg="white",
                    bg="black",
                    wraplength=70,
                    justify="center"
                )

                label.place(relx=0.5, rely=0.5, anchor="center")

                self.frames.append(frame)
                self.labels.append(label)

    def rebuild_grid(self):
        # limpa
        for frame, label in zip(self.frames, self.labels):
            frame.config(highlightbackground="gray")
            label.config(text="")

        # reconstroi
        for idx, name in enumerate(self.device_map.keys()):
            frame = self.frames[idx]
            label = self.labels[idx]

            frame.config(highlightbackground="green")
            label.config(text=name[:12])

            self.device_map[name] = idx

    def sync_devices(self, devices):
        current = set(self.device_map.keys())

        # adiciona novos
        for name in devices - current:
            self.device_map[name] = None

        # remove antigos
        for name in current - devices:
            del self.device_map[name]

        self.rebuild_grid()

    def run(self):
        self.root.mainloop()


# ==============================
# 🔌 DETECÇÃO (MAC FIX)
# ==============================

def get_devices():
    base = "/Volumes"
    devices = set()

    try:
        for name in os.listdir(base):
            if name.startswith("."):
                continue

            ignore_keywords = [
                "Preboot", "Update", "VM", "Data",
                "xarts", "Hardware", "iSC"
            ]

            if any(k.lower() in name.lower() for k in ignore_keywords):
                continue

            devices.add(name)

    except Exception as e:
        print("Erro ao ler /Volumes:", e)

    return devices


# ==============================
# 🧷 TRAY
# ==============================

def build_menu():
    items = []

    if not devices_state:
        items.append(MenuItem("Nenhum dispositivo", lambda: None))
    else:
        for d in sorted(devices_state):
            items.append(MenuItem(d, lambda: None))

    items.append(MenuItem("Sair", on_quit))

    return Menu(*items)


def update_tray():
    if icon:
        icon.menu = build_menu()
        icon.update_menu()


def on_quit(icon, item):
    icon.stop()
    os._exit(0)


def create_tray():
    image = Image.new('RGB', (64, 64), 'black')
    draw = ImageDraw.Draw(image)
    draw.rectangle((16, 16, 48, 48), fill='white')

    return Icon("media-sync", image, menu=build_menu())


# ==============================
# 👀 WATCHER
# ==============================

def watch_devices(ui: MediaUI):
    global devices_state

    known = get_devices()

    # inicial
    devices_state = set(known)
    ui.root.after(0, ui.sync_devices, devices_state)
    update_tray()

    while True:
        time.sleep(2)

        current = get_devices()

        if current != known:
            print(f"\n🔄 Mudança detectada")
            print("Antes:", known)
            print("Agora:", current)

            devices_state = set(current)

            # UI thread safe
            ui.root.after(0, ui.sync_devices, devices_state)

            update_tray()

            known = current


# ==============================
# 🚀 MAIN
# ==============================

def main():
    global icon

    ui = MediaUI()

    icon = create_tray()

    # watcher
    threading.Thread(
        target=watch_devices,
        args=(ui,),
        daemon=True
    ).start()

    # tray em thread separada
    threading.Thread(target=icon.run, daemon=True).start()

    ui.run()


if __name__ == "__main__":
    main()