import re

def test_regex():
    patterns = [
        "TEORÍA 1",
        "TEORÍA 11",
        "TEORÍA VIRTUAL 1",
        "TEORÍA VIRTUAL 2",
        "TEORÍA 21",
        "LABORATORIO 1"
    ]
    
    regex = r'^(TEORÍA|TEORÍA VIRTUAL)\s+(\d+)$'
    
    for p in patterns:
        match = re.match(regex, p)
        if match:
            prefix = match.group(1)
            num = int(match.group(2))
            is_master = num < 10 or "VIRTUAL" in prefix
            print(f"'{p}' -> Prefix: {prefix}, Num: {num}, Master: {is_master}")
        else:
            print(f"'{p}' -> NO MATCH")

if __name__ == "__main__":
    test_regex()
