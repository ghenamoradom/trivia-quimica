from playwright.sync_api import sync_playwright
import random

BASE = "http://localhost:3311"

def log(*a):
    print("[E2E]", *a)

def register_student(page, course="9-2"):
    doc_id = str(random.randint(1000000000, 1999999999))
    page.goto(f"{BASE}/")
    page.click("#tab-register")
    page.wait_for_selector("#reg-course", timeout=10000)
    page.select_option("#reg-course", course)
    page.fill("#reg-first", "Estudiante")
    page.fill("#reg-last1", "Prueba")
    page.fill("#reg-last2", "Automatica")
    page.check("#reg-sex-f")
    page.fill("#reg-doc", doc_id)
    page.click("#register-submit")
    page.wait_for_url("**/reglas", timeout=10000)
    page.click("text=Iniciar trivia")
    page.wait_for_url("**/game/level/1", timeout=10000)
    return doc_id

def answer_all_questions(page, level, expected_count=10):
    for i in range(expected_count):
        page.wait_for_selector("main >> text=Pregunta", timeout=10000)
        # click first option
        opts = page.locator("button:has(span.w-7)")
        opts.first.wait_for(state="visible", timeout=10000)
        opts.first.click()
        page.wait_for_timeout(150)
        # click "Siguiente" or "Finalizar nivel"
        next_btn = page.locator("button:has-text('Siguiente'), button:has-text('Finalizar nivel')")
        next_btn.first.click()
        page.wait_for_timeout(150)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.on("console", lambda msg: errors.append(f"[console.{msg.type}] {msg.text}") if msg.type == "error" else None)

    log("Registering student 1")
    doc1 = register_student(page, "9-2")
    page.screenshot(path="shot_level1_start.png")

    log("Answering level 1 (10 questions)")
    answer_all_questions(page, 1)
    page.wait_for_selector("text=terminado", timeout=10000)
    page.screenshot(path="shot_level1_finished.png")

    log("Advancing to level 2")
    page.click("text=Comenzar Nivel 2")
    page.wait_for_url("**/game/level/2", timeout=10000)
    page.wait_for_timeout(500)
    page.screenshot(path="shot_level2_start.png")

    log("Answering level 2")
    answer_all_questions(page, 2)
    page.wait_for_selector("text=terminado", timeout=10000)
    page.screenshot(path="shot_level2_finished.png")

    log("Advancing to level 3")
    page.click("text=Comenzar Nivel 3")
    page.wait_for_url("**/game/level/3", timeout=10000)
    page.wait_for_timeout(500)
    page.screenshot(path="shot_level3_start.png")

    log("Answering level 3")
    answer_all_questions(page, 3)
    page.wait_for_selector("text=Ver mis resultados", timeout=10000)
    page.screenshot(path="shot_level3_finished.png")

    log("Viewing resultados page")
    page.click("text=Ver mis resultados")
    page.wait_for_url("**/resultados", timeout=10000)
    page.wait_for_timeout(500)
    page.screenshot(path="shot_resultados.png")

    log("Registering a second student for leaderboard/tiebreak variety")
    page.goto(f"{BASE}/")
    doc2 = register_student(page, "6-1")
    answer_all_questions(page, 1)
    page.wait_for_selector("text=terminado", timeout=10000)
    page.click("text=Comenzar Nivel 2")
    page.wait_for_url("**/game/level/2", timeout=10000)
    answer_all_questions(page, 2)
    page.wait_for_selector("text=terminado", timeout=10000)
    page.click("text=Comenzar Nivel 3")
    page.wait_for_url("**/game/level/3", timeout=10000)
    answer_all_questions(page, 3)
    page.wait_for_selector("text=Ver mis resultados", timeout=10000)

    log("Checking landing page top10")
    page.goto(f"{BASE}/")
    page.wait_for_timeout(800)
    page.screenshot(path="shot_landing_top10.png")

    log("Logging in as admin")
    page.click("#tab-login")
    page.wait_for_selector("#login-doc", timeout=10000)
    page.fill("#login-doc", "ghenamoradom")
    page.fill("#login-pass", "B@ttousai_d3st4j4d0r")
    page.click("#login-submit")
    page.wait_for_url("**/admin", timeout=10000)
    page.wait_for_timeout(800)
    page.screenshot(path="shot_admin.png")

    browser.close()
    print("DOC1:", doc1, "DOC2:", doc2)
    print("ERRORS:", errors if errors else "none")
