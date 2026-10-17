"""삐라 상점에 시리즈2(M~R)·롱폼2 영상을 반영한다. 렌더가 끝난 뒤 실행.
1) tj002 최종 mp4 → 720p 웹용(site/public/videos) + 표지(site/public/covers)
2) src/data/episodes.ts 에 편 추가(이미 있으면 건너뜀). 큐 시각은 tj002 timeline_<키>.json 의 숏 시작 시각
3) 등장 상품 md 의 featured·episodes 갱신
실행: python3 scripts_add_series2.py [편 ...]   — 편을 적으면 그 편의 웹 영상·표지를 다시 만든다(재렌더 뒤)
"""
import json, re, subprocess, sys
from pathlib import Path
SITE = Path(__file__).resolve().parent
TJ = Path("/Users/jatu/app/tjkim2/project-obj/tj002")
MOT = TJ / "06_편집검수/01_스크립트/motion/src"
OUT = TJ / "07_최종산출물"
REFRESH = set(sys.argv[1:])

# 편: (id, 번호, 제목, 훅, 원본 파일, 세로?, [(숏, 상품코드)])
EPS = [
    ("M", 12, "폭탄보다 먼저 온 종이", "공습예고 · 정전 · 휴전 다음 해까지", "02_숏폼/11_tj002_shorts_M_v01.mp4", True,
     [("M-S01", "APKC210526397E"), ("M-S04", "APAC230216031C"), ("M-S07", "APKC230301037E")]),
    ("N", 13, "포로수용소를 광고했다", "탁구 시합 · 압록강 수영 — 그리고 진실", "02_숏폼/12_tj002_shorts_N_v01.mp4", True,
     [("N-S01", "APKC260527328"), ("N-S05", "APAC230216030B"), ("N-S08", "APAC210916611")]),
    ("O", 14, "북쪽도 '집에 가라' — 엄마의 편지", "A Soldier's Last Letter", "02_숏폼/13_tj002_shorts_O_v01.mp4", True,
     [("O-S01", "APAC230119009B"), ("O-S05", "APAC230119009C"), ("O-S07", "APKC230619132B"), ("O-S08", "APKC230619132A")]),
    ("P", 15, "중공군에게 보낸 만화책", "나는 이렇게 빠져나왔다 · GOOD (HA HA)", "02_숏폼/14_tj002_shorts_P_v01.mp4", True,
     [("P-S01", "APAC251106151C"), ("P-S04", "APAC251106149D"), ("P-S05", "APAC251106150C"), ("P-S07", "APAC251106148B"), ("P-S08", "APAC251106148F")]),
    ("Q", 16, "삐라 성적표 읽어 드립니다", "극동사령부 분석표 · 동방예의지국", "02_숏폼/15_tj002_shorts_Q_v01.mp4", True,
     [("Q-S01", "APAC190103002C"), ("Q-S08", "APAC190103002F"), ("Q-S08", "APAC190103002D"), ("Q-S09", "APAC190103002I")]),
    ("R", 17, "전쟁이 끝난 걸 종이로 알렸다", "1945 일미휴전 성립 · 29년을 싸운 군인", "02_숏폼/16_tj002_shorts_R_v01.mp4", True,
     [("R-S01", "APAC211070665B"), ("R-S04", "APAC200330076")]),
    ("long2", 18, "선전물 100년 — 종이로 마음을 움직이는 법", "롱폼 2 · 판화에서 휴대폰까지", "03_롱폼/02_tj002_longform2_v01.mp4", False,
     [("X1-A1", "APKC190903128"), ("X2-B1", "APAC170114003"), ("X2-B3", "APAC240926190"), ("X3-C1", "APAC211070665B"), ("X3-C2", "APAC230216026"),
      ("X5-E1", "APAC180604114"), ("X5-E2", "APAC200125042"), ("X5-E3", "APKC260411283")]),
]

ep_ts = SITE / "src/data/episodes.ts"
ts = ep_ts.read_text(encoding="utf-8")
added = []
for eid, no, title, hook, src, vertical, items in EPS:
    f = OUT / src
    if not f.exists():
        print("영상 없음 — 건너뜀:", f); continue
    name = Path(src).stem
    web = SITE / "public/videos" / f"{name}.mp4"
    if eid in REFRESH or not web.exists():
        scale = "720:1280" if vertical else "1280:720"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(f), "-vf", f"scale={scale}", "-c:v", "libx264", "-crf", "27", "-preset", "fast",
                        "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k", str(web)], check=True)
    cover = SITE / "public/covers" / f"{name}.jpg"
    if eid in REFRESH or not cover.exists():
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2.6", "-i", str(web), "-frames:v", "1", "-q:v", "4", str(cover)], check=True)
    tl = json.loads((MOT / f"timeline_{eid}.json").read_text())
    start = {s["id"]: s["start"] for s in tl["shots"]}
    secs = round(tl["duration"])
    cues = sorted({(round(start[sid]), code) for sid, code in items if sid in start})
    codes = list(dict.fromkeys(code for _, code in items))
    chapters = ""
    if not vertical:
        chapters = ", chapters: [" + ", ".join(f'[{round(p["start"]) if i else 0}, "{(p["title"] or ["", "선전물 100년"])[1]}"]' for i, p in enumerate(tl["parts"])) + "]"
    entry = (f'  {{ id: "{eid}", no: {no}, title: "{title}", hook: "{hook}", file: "{name}.mp4", cover: "{name}", seconds: {secs}, vertical: {"true" if vertical else "false"},\n'
             f'    items: [{", ".join(json.dumps(c) for c in codes)}], cues: [{", ".join(f"[{s}, {json.dumps(c)}]" for s, c in cues)}]{chapters} }},\n')
    if f'id: "{eid}"' not in ts:
        ts = ts.replace("\n];\n\nexport const episodeById", "\n" + entry.rstrip("\n") + "\n];\n\nexport const episodeById", 1); added.append(eid)
    # 상품 md
    for code in codes:
        md = SITE / "src/content/products" / f"{code}.md"
        if not md.exists(): print("상품 없음:", code); continue
        s = md.read_text(encoding="utf-8")
        m = re.search(r"^episodes: \[(.*?)\]$", s, re.M)
        eps = [x.strip() for x in m.group(1).split(",") if x.strip()] if m else []
        if eid not in eps: eps.append(eid)
        s = re.sub(r"^episodes: \[.*?\]$", f"episodes: [{', '.join(eps)}]", s, flags=re.M)
        s = re.sub(r"^featured: false$", "featured: true", s, flags=re.M)
        md.write_text(s, encoding="utf-8")
ep_ts.write_text(ts, encoding="utf-8")
print("추가된 편:", added)
subprocess.run(["npx", "vite", "build"], cwd=SITE, check=True)
