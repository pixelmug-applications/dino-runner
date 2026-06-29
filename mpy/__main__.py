import random
import time

import micropyxel as pyxel
from ble_webapp import WebAppBleManager
from simpletouch import SimpleTouch


TOUCH_PIN = 38
RES_PATH = "assets/dina.toml"
SCR_W = 32
SCR_H = 16
FPS = 30
LOADING_DINO_1_PATH = "assets/dino-logo-1.png"
LOADING_DINO_2_PATH = "assets/dino-logo-2.png"
LOADING_CACTUS_PATH = "assets/cactus.png"
LOADING_IMAGE_BANK = 0
LOADING_DINO_1_U = 0
LOADING_DINO_2_U = 8
LOADING_CACTUS_U = 16
LOADING_ASSET_V = 0
LOADING_ASSET_SIZE = 8
LOADING_DINO_X = 7
LOADING_CACTUS_X = 17
LOADING_ASSET_Y = 3
LOADING_PROGRESS_W = 18
LOADING_PROGRESS_X = (SCR_W - LOADING_PROGRESS_W) // 2
LOADING_PROGRESS_Y = 13
LOADING_PROGRESS_H = 1
LOADING_ANIMATION_FRAMES = 34
LOADING_FRAME_DELAY_MS = 90

DINO_U = [0, 8, 16]
DINO_V = 0
DINO_W = 8
DINO_H = 8
DINO_COLKEY = 0

CLOUDS = [
    (0, 16),
    (8, 16),
]
CLOUD_W = 8
CLOUD_H = 8
CLOUD_COLKEY = 0

OBS_V = 24
OBS_TYPES = [
    {"u": 0, "hit_w": 7, "hit_h": 5},
    {"u": 8, "hit_w": 6, "hit_h": 6},
    {"u": 16, "hit_w": 3, "hit_h": 5},
    {"u": 24, "hit_w": 6, "hit_h": 7},
    {"u": 32, "hit_w": 5, "hit_h": 3},
]
OBS_DRAW_W = 8
OBS_DRAW_H = 8
OBS_COLKEY = 0

BG_TMX0 = 0
BG_TMY0 = 0
BG_W = 64

COL_BLACK = 0
COL_WHITE = 7
COL_RED = 8
COL_YELLOW = 10
COL_GREEN = 11
COL_GRAY = 13

STATE_READY = "ready"
STATE_RUNNING = "running"
STATE_PAUSED = "paused"
STATE_GAME_OVER = "gameover"

DIFFICULTY = {
    "easy": {"speed": 0.48, "spawn_min": 95, "spawn_max": 140, "accel": 0.00015},
    "normal": {"speed": 0.60, "spawn_min": 80, "spawn_max": 120, "accel": 0.00022},
    "hard": {"speed": 0.76, "spawn_min": 62, "spawn_max": 100, "accel": 0.00032},
}


class DinoRunnerApp:
    def __init__(self):
        self.ble = WebAppBleManager("DinoRunner", self.handle_ble_message)
        self.touch = SimpleTouch(pin_no=TOUCH_PIN, active_high=True)
        self.difficulty = "normal"
        self.state = STATE_READY
        self.best_score = 0
        self.last_report_ms = 0

        pyxel.init()
        self.show_loading_screen()
        pyxel.load(RES_PATH)
        self.reset_world()

    def show_loading_screen(self):
        pyxel.images(LOADING_IMAGE_BANK).load_from_png(
            LOADING_DINO_1_U,
            LOADING_ASSET_V,
            LOADING_DINO_1_PATH,
            True,
        )
        pyxel.images(LOADING_IMAGE_BANK).load_from_png(
            LOADING_DINO_2_U,
            LOADING_ASSET_V,
            LOADING_DINO_2_PATH,
            True,
        )
        pyxel.images(LOADING_IMAGE_BANK).load_from_png(
            LOADING_CACTUS_U,
            LOADING_ASSET_V,
            LOADING_CACTUS_PATH,
            True,
        )

        for step in range(LOADING_ANIMATION_FRAMES):
            progress = 1 + (step * LOADING_PROGRESS_W) // LOADING_ANIMATION_FRAMES
            self.draw_loading_screen(progress, step)
            time.sleep_ms(LOADING_FRAME_DELAY_MS)

        self.draw_loading_screen(LOADING_PROGRESS_W, LOADING_ANIMATION_FRAMES)

    def draw_loading_screen(self, progress, frame):
        pyxel.cls(COL_BLACK)
        dino_u = LOADING_DINO_1_U if frame % 2 == 0 else LOADING_DINO_2_U
        pyxel.blt(
            LOADING_DINO_X,
            LOADING_ASSET_Y,
            LOADING_IMAGE_BANK,
            dino_u,
            LOADING_ASSET_V,
            LOADING_ASSET_SIZE,
            LOADING_ASSET_SIZE,
            COL_BLACK,
        )
        pyxel.blt(
            LOADING_CACTUS_X,
            LOADING_ASSET_Y,
            LOADING_IMAGE_BANK,
            LOADING_CACTUS_U,
            LOADING_ASSET_V,
            LOADING_ASSET_SIZE,
            LOADING_ASSET_SIZE,
            COL_BLACK,
        )
        pyxel.rect(
            LOADING_PROGRESS_X,
            LOADING_PROGRESS_Y,
            max(0, min(LOADING_PROGRESS_W, progress)),
            LOADING_PROGRESS_H,
            COL_WHITE,
        )
        pyxel.render_graphics()

    def reset_world(self):
        cfg = DIFFICULTY.get(self.difficulty, DIFFICULTY["normal"])

        self.wx = 0
        self.base_scroll_speed = cfg["speed"]
        self.scroll_speed = cfg["speed"]
        self.scroll_acc = 0.0
        self.speed_accel = cfg["accel"]

        self.ground_y = SCR_H - DINO_H
        self.dino_x = 6
        self.dino_y = self.ground_y

        self.on_ground = True
        self.jump_t = 0
        self.jump_apex = 9
        self.jump_len = 34

        self.walk_frame = 0
        self.walk_tick = 0
        self.walk_period = 6

        self.clouds = []
        self.cloud_spawn_cd = 0

        self.obstacles = []
        self.obs_spawn_cd = 0
        self.obs_spawn_min = cfg["spawn_min"]
        self.obs_spawn_max = cfg["spawn_max"]
        self.obs_gap_min = 10

        self.score = 0
        self.t0 = pyxel.frame_count

    def start(self):
        self.ble.start()
        self.report_event("dinoReady")
        pyxel.run(self.update, self.draw, fps=FPS, on_exit=self.on_exit)

    def on_exit(self, rt, reason, exc):
        try:
            pyxel.destroy()
        except Exception:
            pass
        self.ble.deinit()

    def handle_ble_message(self, conn, message):
        request_id = message.get("id")
        method = message.get("method")

        try:
            if method == "mpyPing":
                self.ble.reply(request_id, True, conn=conn)
                return
            if method == "dinoJump":
                self.jump()
            elif method == "dinoRestart":
                self.restart()
            elif method == "dinoPause":
                self.pause()
            elif method == "dinoResume":
                self.resume()
            elif method == "dinoSetConfig":
                params = message.get("params") or {}
                self.set_difficulty(params.get("difficulty") or "normal")
            else:
                return

            self.ble.reply(request_id, True, conn=conn)
            self.report_state(force=True)
        except Exception as exc:
            print("[DinoRunner] BLE command error:", exc)
            self.ble.reply(request_id, False, str(exc), conn=conn)

    def set_difficulty(self, difficulty):
        if difficulty not in DIFFICULTY:
            difficulty = "normal"
        self.difficulty = difficulty
        self.restart()

    def restart(self):
        self.reset_world()
        self.state = STATE_RUNNING

    def pause(self):
        if self.state == STATE_RUNNING:
            self.state = STATE_PAUSED

    def resume(self):
        if self.state in (STATE_READY, STATE_PAUSED):
            self.state = STATE_RUNNING
        elif self.state == STATE_GAME_OVER:
            self.restart()

    def jump(self):
        if self.state == STATE_READY:
            self.state = STATE_RUNNING
        if self.state != STATE_RUNNING:
            return
        if self.on_ground:
            self.on_ground = False
            self.jump_t = 0

    def apply_jump(self):
        t = self.jump_t
        n = self.jump_len

        if t >= n:
            self.on_ground = True
            self.dino_y = self.ground_y
            return

        p = t / (n - 1)
        k = 4 * p * (1 - p)
        dy = int(self.jump_apex * k + 0.5)
        y = self.ground_y - dy
        self.dino_y = max(0, y)
        self.jump_t += 1

    def spawn_cloud(self):
        u, v = random.choice(CLOUDS)
        max_y = max(0, SCR_H - CLOUD_H)
        self.clouds.append({
            "x": SCR_W + random.randint(0, 10),
            "y": random.randint(0, max_y),
            "u": u,
            "v": v,
            "spd": 1,
            "period": random.randint(4, 8),
            "tick": 0,
        })

    def update_clouds(self):
        if self.cloud_spawn_cd <= 0:
            self.cloud_spawn_cd = random.randint(24, 60)
            self.spawn_cloud()
        else:
            self.cloud_spawn_cd -= 1

        alive = []
        for cloud in self.clouds:
            cloud["tick"] += 1
            if cloud["tick"] >= cloud["period"]:
                cloud["tick"] = 0
                cloud["x"] -= cloud["spd"]
            if cloud["x"] > -CLOUD_W:
                alive.append(cloud)
        self.clouds = alive

    def spawn_obstacle(self):
        if self.obstacles:
            rightmost = max(obstacle["x"] for obstacle in self.obstacles)
            if rightmost > SCR_W + self.obs_gap_min:
                return

        self.obstacles.append({
            "x": float(SCR_W + 2),
            "tp": random.choice(OBS_TYPES),
        })

    def update_obstacles(self, dx_world):
        if self.obs_spawn_cd <= 0:
            self.obs_spawn_cd = random.randint(self.obs_spawn_min, self.obs_spawn_max)
            self.spawn_obstacle()
        else:
            self.obs_spawn_cd -= 1

        if dx_world != 0:
            for obstacle in self.obstacles:
                obstacle["x"] -= dx_world

        self.obstacles = [obstacle for obstacle in self.obstacles if obstacle["x"] > -OBS_DRAW_W]

    def check_collision(self):
        dx = self.dino_x + 1
        dy = self.dino_y + 1
        dw = DINO_W - 2
        dh = DINO_H - 2

        for obstacle in self.obstacles:
            tp = obstacle["tp"]
            ow = tp["hit_w"]
            oh = tp["hit_h"]
            ox = int(obstacle["x"]) + (OBS_DRAW_W - ow) // 2
            oy = self.ground_y + (OBS_DRAW_H - oh)

            if dx < ox + ow and dx + dw > ox and dy < oy + oh and dy + dh > oy:
                return True
        return False

    def update(self, rt):
        self.ble.poll()
        self.touch.update()
        self.update_touch()

        if self.state == STATE_RUNNING:
            self.update_game()

        self.report_state()

    def update_touch(self):
        while True:
            event = self.touch.get()
            if event is None:
                break
            if event == "click" or event == "hit":
                self.jump()
            elif event == "double":
                self.restart()

    def update_game(self):
        if not self.on_ground:
            self.apply_jump()

        self.scroll_speed += self.speed_accel
        self.scroll_acc += self.scroll_speed
        dx_world = self.scroll_speed
        if self.scroll_acc >= 1.0:
            step = int(self.scroll_acc)
            self.scroll_acc -= step
            self.wx += step

        if self.on_ground:
            self.walk_tick += 1
            if self.walk_tick >= self.walk_period:
                self.walk_tick = 0
                self.walk_frame ^= 1

        self.update_clouds()
        self.update_obstacles(dx_world)
        self.score = (pyxel.frame_count - self.t0) // FPS

        if self.check_collision():
            self.state = STATE_GAME_OVER
            if self.score > self.best_score:
                self.best_score = self.score
            self.report_event("dinoGameOver", force=True)

    def report_state(self, force=False):
        now = time.ticks_ms()
        if not force and time.ticks_diff(now, self.last_report_ms) < 1000:
            return
        self.last_report_ms = now
        self.report_event("dinoState")

    def report_event(self, event, force=False):
        payload = {
            "event": event,
            "state": self.state,
            "score": self.score,
            "bestScore": self.best_score,
            "difficulty": self.difficulty,
        }
        self.ble.send(payload)

    def draw(self, rt):
        pyxel.cls(COL_BLACK)
        self.draw_bg_loop()

        for cloud in self.clouds:
            pyxel.blt(cloud["x"], cloud["y"], 0, cloud["u"], cloud["v"], CLOUD_W, CLOUD_H, CLOUD_COLKEY)

        for obstacle in self.obstacles:
            tp = obstacle["tp"]
            pyxel.blt(int(obstacle["x"]), self.ground_y, 0, tp["u"], OBS_V, OBS_DRAW_W, OBS_DRAW_H, OBS_COLKEY)

        dino_u = DINO_U[self.walk_frame] if self.on_ground else DINO_U[2]
        pyxel.blt(self.dino_x, self.dino_y, 0, dino_u, DINO_V, DINO_W, DINO_H, DINO_COLKEY)

        if self.state == STATE_READY:
            self.draw_center_text("GO", COL_GREEN)
        elif self.state == STATE_PAUSED:
            self.draw_center_text("PAU", COL_YELLOW)
        elif self.state == STATE_GAME_OVER:
            self.draw_center_text("END", COL_RED)
        else:
            self.draw_score()

    def draw_bg_loop(self):
        tile = 8
        tiles_total = BG_W // tile
        tile_x = (self.wx // tile) % tiles_total
        sub = self.wx % tile
        need_w = SCR_W + sub
        max_w1 = (tiles_total - tile_x) * tile
        w1 = min(need_w, max_w1)

        pyxel.bltm(-sub, 0, 0, BG_TMX0 + tile_x, BG_TMY0, w1, SCR_H)
        if w1 < need_w:
            pyxel.bltm(-sub + w1, 0, 0, BG_TMX0, BG_TMY0, need_w - w1, SCR_H)

    def draw_score(self):
        text = "%02d" % min(99, self.score)
        pyxel.text(0, 0, text, COL_WHITE)

    def draw_center_text(self, text, color):
        x = max(0, (SCR_W - len(text) * 4) // 2)
        y = 5
        pyxel.text(x, y, text, color)


def appMain():
    DinoRunnerApp().start()


if __name__ == "__main__":
    appMain()
