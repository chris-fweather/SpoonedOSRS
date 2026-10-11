#!/usr/bin/env python3
"""Pull OSRS Wiki reference snapshots used by the tracker. Does not invent rates."""
import json, re, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

UA = {"User-Agent": "Spooned/1.0 (OSRS pet tracker; cached requests)"}
ROOT = Path(__file__).resolve().parents[1]
FETCHED = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def api(params):
    url = "https://oldschool.runescape.wiki/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)

def raw(title):
    page = title.split("#", 1)[0].replace(" ", "_")
    url = "https://oldschool.runescape.wiki/w/" + urllib.parse.quote(page) + "?action=raw"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode()

def strip_wiki(s):
    s = re.sub(r"<ref[^>]*>.*?</ref>", " ", s, flags=re.I | re.S)
    s = re.sub(r"<ref[^>]*/>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\{\{SCP\|Quest[^}]*\}\}", "", s)
    s = re.sub(r"\{\{SCP\|([^|}]+)(?:\|(\d+))?[^}]*\}\}", lambda m: (m.group(1) + (" " + m.group(2) if m.group(2) else "")).strip(), s)
    s = re.sub(r"\{\{NA\|([^}]*)\}\}", r"\1", s)
    s = re.sub(r"\{\{sic\}\}", "", s, flags=re.I)
    s = re.sub(r"\{\{[^{}]*\}\}", " ", s)
    s = re.sub(r"\[\[(?:[^|\]]+\|)?([^\]]+)\]\]", r"\1", s)
    s = s.replace("'''", "").replace("''", "")
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def parse_skill_pets(text):
    start = text.find("local pets = {")
    end = text.find("\nfunction p.main")
    body = text[start:end]
    pets = {}
    pet = None
    for line in body.splitlines():
        m = re.match(r"\t\['((?:\\'|[^'])*)'\] = \{", line)
        if m and line.startswith("\t[") and not line.startswith("\t\t"):
            pet = m.group(1).replace("\\'", "'")
            pets[pet] = []
            continue
        m = re.match(r"\t\t\['((?:\\'|[^'])*)'\] = \{([^}]*)\}", line)
        if m and pet:
            name = m.group(1).replace("\\'", "'")
            rest = m.group(2)
            base = int(re.search(r"base = (\d+)", rest).group(1))
            level = int(re.search(r"level = (\d+)", rest).group(1))
            link = re.search(r"link\s*=\s*'((?:\\'|[^'])*)'", rest).group(1).replace("\\'", "'")
            pets[pet].append({"name": name, "base": base, "level": level, "link": link})
    return pets

def xp_from_page(page, skill):
    patterns = []
    if skill == "Woodcutting":
        m = re.search(r"\{\{Woodcutting info[\s\S]*?\|xp\s*=\s*([0-9.]+)", page)
        if m:
            return float(m.group(1)), "Woodcutting info xp"
    if skill == "Mining":
        m = re.search(r"\{\{Mining info[\s\S]*?\|xp\s*=\s*([0-9.]+)", page)
        if m:
            return float(m.group(1)), "Mining info xp"
    if skill == "Fishing":
        m = re.search(r"\{\{Fishing[\s\S]*?\|xp\s*=\s*([0-9.]+)", page)
        if m:
            return float(m.group(1)), "Fishing info xp"
        vals = set(re.findall(r"(\d+(?:\.\d+)?) Fishing experience", page))
        if len(vals) == 1:
            return float(vals.pop()), "page states Fishing experience"
    if skill == "Agility":
        m = re.search(r"(\d+(?:\.\d+)?) experience in total per completed lap", page)
        if m:
            return float(m.group(1)), "lap experience stated on the course page"
        m = re.search(r"(?:get|gain|grants?) (\d+(?:\.\d+)?) experience from completing", page)
        if m:
            return float(m.group(1)), "experience from completing the course, stated on the wiki page"
        m = re.search(r"grants? (\d+(?:\.\d+)?) Agility experience", page)
        if m:
            return float(m.group(1)), "Agility experience stated on the page"
    if skill == "Hunter":
        vals = set(re.findall(r"(\d+(?:\.\d+)?) Hunter experience", page))
        if len(vals) == 1:
            return float(vals.pop()), "page states Hunter experience"
    if skill == "Thieving":
        vals = set(re.findall(r"(\d+(?:\.\d+)?) Thieving experience", page))
        if len(vals) == 1:
            return float(vals.pop()), "page states Thieving experience"
    if skill == "Farming":
        m = re.search(r"\{\{Farming info[\s\S]*?\|xp\s*=\s*([0-9.]+)", page)
        if m:
            return float(m.group(1)), "Farming info xp"
        vals = set(re.findall(r"(\d+(?:\.\d+)?) Farming experience", page))
        if len(vals) == 1:
            return float(vals.pop()), "page states Farming experience"
    if skill == "Runecraft":
        # One figure per action, and only when the page states it. Ourania stays empty:
        # that page gives 170% of the rune and does not publish one XP number.
        frag = re.search(r"dark essence fragment\]\] yields (\d+(?:\.\d+)?) Runecraft experience", page)
        if frag:
            return float(frag.group(1)), "dark essence fragment yield stated on the page"
        grant = re.search(r"granting (\d+(?:\.\d+)?) \[\[experience\]\] per fragment", page)
        if grant:
            return float(grant.group(1)), "Runecraft info: experience per fragment"
        pure = re.search(r"providing (\d+(?:\.\d+)?) or \d+(?:\.\d+)? Runecraft experience each, respectively", page)
        if pure:
            return float(pure.group(1)), "pure essence experience; the page lists daeyalt separately"
        provides = re.search(r"provides (\d+(?:\.\d+)?) Runecraft experience", page)
        if provides:
            return float(provides.group(1)), "page states Runecraft experience"
        sec = re.search(r"==\s*Runecraft info\s*==([\s\S]*?)(?:\n==|\Z)", page)
        if sec:
            exps = re.findall(r"skill1exp\s*=\s*([0-9.]+)", sec.group(1))
            if exps:
                return float(exps[0]), "first Runecraft info recipe skill1exp"
        vals = set(re.findall(r"(\d+(?:\.\d+)?) Runecraft experience", page))
        if len(vals) == 1:
            return float(vals.pop()), "page states Runecraft experience"
    return None, None

SKILL_OF = {
    "Baby chinchompa": "Hunter",
    "Beaver": "Woodcutting",
    "Giant Squirrel": "Agility",
    "Heron": "Fishing",
    "Rock golem": "Mining",
    "Rocky": "Thieving",
    "Tangleroot": "Farming",
    "Rift guardian": "Runecraft",
}

def parse_questreq(text):
    start = text.find("local questReqs = {")
    if start < 0:
        raise SystemExit("quest req table missing")
    i = text.find("{", start)
    depth = 0
    for j in range(i, len(text)):
        if text[j] == "{":
            depth += 1
        elif text[j] == "}":
            depth -= 1
            if depth == 0:
                body = text[i + 1:j]
                break
    else:
        raise SystemExit("quest req braces")
    out = {}
    for m in re.finditer(r"\['((?:\\'|[^'])+)'\] = \{", body):
        name = m.group(1).replace("\\'", "'")
        k = m.end() - 1
        depth = 0
        for j in range(k, len(body)):
            if body[j] == "{":
                depth += 1
            elif body[j] == "}":
                depth -= 1
                if depth == 0:
                    block = body[k + 1:j]
                    break
        quests, skills = [], []
        qm = re.search(r"\['quests'\] = \{([^}]*)\}", block, re.S)
        if qm:
            quests = [q.replace("\\'", "'") for q in re.findall(r"'((?:\\'|[^'])*)'", qm.group(1))]
        sm = re.search(r"\['skills'\] = \{([\s\S]*)\}\s*$", block)
        if sm:
            for row in re.findall(r"\{([^{}]*)\}", sm.group(1)):
                parts = [p.strip().strip("'") for p in row.split(",")]
                if len(parts) < 2 or not parts[1].isdigit():
                    continue
                skills.append({
                    "skill": parts[0],
                    "level": int(parts[1]),
                    "ironman": "ironman" in parts,
                    "boostable": "boostable" in parts,
                })
        out[name] = {"quests": quests, "skills": skills}
    return out

def parse_diary(text):
    tiers = []
    for m in re.finditer(r'''data-diary-tier="(Easy|Medium|Hard|Elite)"''', text):
        tier = m.group(1)
        chunk = text[m.start():]
        end = chunk.find("\n|}")
        table = chunk[:end if end > 0 else 8000]
        tasks = []
        rows = re.split(r"\n\|-", table)
        for row in rows[1:]:
            cells = [c for c in re.split(r"\n\|", row) if c.strip()]
            if len(cells) < 1:
                continue
            task = strip_wiki(cells[0].lstrip("|"))
            req = strip_wiki(cells[1]) if len(cells) > 1 else ""
            task = re.sub(r"^\d+\.\s*", "", task).strip()
            if not task or task.lower().startswith("task"):
                continue
            tasks.append({"task": task, "requirements": req or "None"})
        tiers.append({"tier": tier, "tasks": tasks})
    return tiers

def plain_lines(html):
    if not html:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</li>", "\n", text, flags=re.I)
    text = re.sub(r"<li[^>]*>", "• ", text, flags=re.I)
    text = strip_wiki(text)
    lines = [re.sub(r"\s+", " ", ln).strip(" •") for ln in text.splitlines()]
    lines = [ln for ln in lines if ln and ln.lower() not in {"none", "n/a"}]
    return "\n".join(lines[:24])

def main():
    print("skill pet module")
    module = raw("Module:Skill pet calc")
    pets = parse_skill_pets(module)
    print(" pets", {k: len(v) for k, v in pets.items()})
    links = {}
    for pet, methods in pets.items():
        skill = SKILL_OF.get(pet)
        for method in methods:
            links.setdefault(method["link"].split("#")[0], set()).add(skill)
    pages = {}
    print(" fetching", len(links), "method pages")
    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = {pool.submit(raw, title): title for title in links}
        for fut in as_completed(futs):
            title = futs[fut]
            try:
                pages[title] = fut.result()
            except Exception as e:
                print(" miss", title, e)
                pages[title] = ""
    xp_hits = 0
    for pet, methods in pets.items():
        skill = SKILL_OF.get(pet)
        for method in methods:
            page = pages.get(method["link"].split("#")[0], "")
            xp, note = xp_from_page(page, skill) if skill else (None, None)
            method["xp"] = xp
            method["xpSource"] = note
            if xp is not None:
                xp_hits += 1
    # Named runes share the "Everything else" denominator. XP is the figure stated on that rune's page.
    else_base = next(m["base"] for m in pets["Rift guardian"] if m["name"] == "Everything else")
    named_runes = [
        ("Mind rune", 5.5, "Mind rune", "Mind rune wiki: crafting mind runes provides 5.5 Runecraft experience per rune"),
        ("Fire rune", 7, "Fire rune", "Fire rune wiki, Runecraft info: 7 experience per essence"),
        ("Astral rune", 8.7, "Astral rune", "Astral rune wiki, first Runecraft info recipe: 8.7 experience"),
        ("Nature rune", 9, "Nature rune", "Nature rune wiki, Runecraft info: 9 experience per essence"),
        ("Cosmic rune", 8, "Cosmic rune", "Cosmic rune wiki, first Runecraft info recipe: 8 experience"),
        ("Chaos rune", 8.5, "Chaos rune", "Chaos rune wiki, first Runecraft info recipe: 8.5 experience"),
        ("Wrath rune", 8, "Wrath rune", "Wrath rune wiki: pure essence provides 8 Runecraft experience; daeyalt essence provides 12"),
    ]
    have = {m["name"] for m in pets["Rift guardian"]}
    for name, xp, link, note in named_runes:
        if name in have:
            continue
        pets["Rift guardian"].append({"name": name, "base": else_base, "level": 1, "link": link, "xp": xp, "xpSource": note})
        xp_hits += 1
    print(" xp fields", xp_hits)
    skill_doc = {
        "fetchedAt": FETCHED,
        "source": "https://oldschool.runescape.wiki/w/Module:Skill_pet_calc",
        "formula": "Per action, 1/(base - 25×level). Minnow and Fishing Trawler use the base figure unchanged. Expected actions equal that denominator. Expected XP is expected actions times XP per action, and only when that XP is stated on the linked wiki page. The skilling-outfit divisor is not applied.",
        "exceptions": ["Minnow", "Fishing Trawler"],
        "pets": {
            name: {"skill": SKILL_OF.get(name), "methods": methods}
            for name, methods in pets.items()
        },
    }
    (ROOT / "lib/skill-pet-rates.json").write_text(json.dumps(skill_doc, ensure_ascii=False, separators=(",", ":")))
    print("wrote skill-pet-rates", (ROOT / "lib/skill-pet-rates.json").stat().st_size)

    print("quests")
    q = "bucket('quest').select('page_name','official_difficulty','official_length','items_required','enemies_to_defeat','description','start_point').limit(500).run()"
    bucket = api({"action": "bucket", "format": "json", "query": q})["bucket"]
    print(" bucket quests", len(bucket))
    reqs = parse_questreq(raw("Module:Questreq/data"))
    print(" questreq", len(reqs))
    quests = {}
    for row in bucket:
        name = row.get("page_name")
        if not name:
            continue
        extra = reqs.get(name, {"quests": [], "skills": []})
        quests[name] = {
            "difficulty": row.get("official_difficulty") or "",
            "length": row.get("official_length") or "",
            "start": strip_wiki(re.sub(r"<[^>]+>", " ", row.get("start_point") or ""))[:400],
            "description": strip_wiki(re.sub(r"<[^>]+>", " ", row.get("description") or ""))[:500],
            "items": plain_lines(row.get("items_required") or ""),
            "enemies": plain_lines(row.get("enemies_to_defeat") or ""),
            "skills": extra["skills"],
            "quests": extra["quests"],
            "wiki": "https://oldschool.runescape.wiki/w/" + urllib.parse.quote(name.replace(" ", "_")),
        }
    quest_doc = {
        "fetchedAt": FETCHED,
        "sources": [
            "https://oldschool.runescape.wiki/w/Bucket:Quest",
            "https://oldschool.runescape.wiki/w/Module:Questreq/data",
        ],
        "lengthNote": "official_length is the wiki's length category. These pages do not publish a single clock time.",
        "quests": quests,
    }
    (ROOT / "lib/quest-reference.json").write_text(json.dumps(quest_doc, ensure_ascii=False, separators=(",", ":")))
    print("wrote quest-reference", (ROOT / "lib/quest-reference.json").stat().st_size)

    print("diaries")
    areas = [
        "Ardougne", "Desert", "Falador", "Fremennik", "Kandarin", "Karamja",
        "Kourend & Kebos", "Lumbridge & Draynor", "Morytania", "Varrock",
        "Western Provinces", "Wilderness",
    ]
    diary = {"fetchedAt": FETCHED, "source": "https://oldschool.runescape.wiki/w/Achievement_Diary", "areas": {}}
    for area in areas:
        title = area + " Diary"
        text = raw(title)
        tiers = parse_diary(text)
        counts = {t["tier"]: len(t["tasks"]) for t in tiers}
        print(" ", area, counts)
        diary["areas"][area] = {
            "wiki": "https://oldschool.runescape.wiki/w/" + urllib.parse.quote(title.replace(" ", "_")),
            "tiers": tiers,
        }
    (ROOT / "lib/diary-tasks.json").write_text(json.dumps(diary, ensure_ascii=False, separators=(",", ":")))
    print("wrote diary-tasks", (ROOT / "lib/diary-tasks.json").stat().st_size)

    print("combat tasks")
    tasks = []
    offset = 0
    while True:
        query = (
            "bucket('combat_achievement').select('id','name','monster','tier','type','task')"
            f".limit(500).offset({offset}).run()"
        )
        try:
            rows = api({"action": "bucket", "format": "json", "query": query})["bucket"]
        except Exception:
            if offset == 0:
                rows = api({"action": "bucket", "format": "json", "query": "bucket('combat_achievement').select('id','name','monster','tier','type','task').limit(2000).run()"})["bucket"]
            else:
                break
        if not rows:
            break
        tasks.extend(rows)
        print(" ", len(tasks))
        if len(rows) < 500:
            break
        offset += 500
        if offset > 2000:
            break
    names = {t["name"] for t in tasks}
    combos = {}
    for t in tasks:
        desc = t.get("task") or ""
        parts = [n for n in names if n != t["name"] and len(n) > 12 and n in desc]
        if parts:
            combos[t["name"]] = parts
    print(" combo-like", len(combos))
    for name, parts in list(combos.items())[:12]:
        print("  ", name, "->", parts)
    (ROOT / "lib/ca-combos.json").write_text(json.dumps({
        "fetchedAt": FETCHED,
        "source": "https://oldschool.runescape.wiki/w/Combat_Achievements",
        "note": "Component tasks are other catalogue task names that appear in this task's wiki description. This is not an account checklist.",
        "combos": combos,
    }, ensure_ascii=False, indent=2))
    print("done")

if __name__ == "__main__":
    main()
