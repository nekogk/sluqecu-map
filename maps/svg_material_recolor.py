#!/usr/bin/env python3
"""SVG 안의 Material Design 색을 단계(shade) 기준으로 다른 단계 색으로 바꾼다.

사용법:
    python svg_material_recolor.py input.svg output.svg

바꾸는 규칙은 아래 SHADE_MAP 만 고치면 된다. (예: {500: 300, 900: 700})
"""
import re
import sys

SHADES = (50, 100, 200, 300, 400, 500, 600, 700, 800, 900)

# ───────────────────────── 여기만 고치면 됨 ─────────────────────────
# {원래 단계: 바꿀 단계}
SHADE_MAP = {400:300, 600: 300, 700: 100, 800: 50}

# 특정 색 계열만 바꾸고 싶으면 이름을 넣어줘. None 이면 전체 계열.
# 예: ONLY_HUES = {"Red", "Blue"}
ONLY_HUES = None
# ────────────────────────────────────────────────────────────────

# 나무위키 '머티리얼 디자인' 팔레트 (Material Design 2), 50~900 순서
# Grey 50, BlueGrey 50-300은 색상 휘도의 일관성을 위해 쉬프트되었음
PALETTE = {
    "Red":        ("FFEBEE", "FFCDD2", "EF9A9A", "E57373", "EF5350", "F44336", "E53935", "D32F2F", "C62828", "B71C1C"),
    "Pink":       ("FCE4EC", "F8BBD0", "F48FB1", "F06292", "EC407A", "E91E63", "D81B60", "C2185B", "AD1457", "880E4F"),
    "Purple":     ("F3E5F5", "E1BEE7", "CE93D8", "BA68C8", "AB47BC", "9C27B0", "8E24AA", "7B1FA2", "6A1B9A", "4A148C"),
    "DeepPurple": ("EDE7F6", "D1C4E9", "B39DDB", "9575CD", "7E57C2", "673AB7", "5E35B1", "512DA8", "4527A0", "311B92"),
    "Indigo":     ("E8EAF6", "C5CAE9", "9FA8DA", "7986CB", "5C6BC0", "3F51B5", "3949AB", "303F9F", "283593", "1A237E"),
    "Blue":       ("E3F2FD", "BBDEFB", "90CAF9", "64B5F6", "42A5F5", "2196F3", "1E88E5", "1976D2", "1565C0", "0D47A1"),
    "LightBlue":  ("E1F5FE", "B3E5FC", "81D4FA", "4FC3F7", "29B6F6", "03A9F4", "039BE5", "0288D1", "0277BD", "01579B"),
    "Cyan":       ("E0F7FA", "B2EBF2", "80DEEA", "4DD0E1", "26C6DA", "00BCD4", "00ACC1", "0097A7", "00838F", "006064"),
    "Teal":       ("E0F2F1", "B2DFDB", "80CBC4", "4DB6AC", "26A69A", "009688", "00897B", "00796B", "00695C", "004D40"),
    "Green":      ("E8F5E9", "C8E6C9", "A5D6A7", "81C784", "66BB6A", "4CAF50", "43A047", "388E3C", "2E7D32", "1B5E20"),
    "LightGreen": ("F1F8E9", "DCEDC8", "C5E1A5", "AED581", "9CCC65", "8BC34A", "7CB342", "689F38", "558B2F", "33691E"),
    "Lime":       ("F9FBE7", "F0F4C3", "E6EE9C", "DCE775", "D4E157", "CDDC39", "C0CA33", "AFB42B", "9E9D24", "827717"),
    "Yellow":     ("FFFDE7", "FFF9C4", "FFF59D", "FFF176", "FFEE58", "FFEB3B", "FDD835", "FBC02D", "F9A825", "F57F17"),
    "Amber":      ("FFF8E1", "FFECB3", "FFE082", "FFD54F", "FFCA28", "FFC107", "FFB300", "FFA000", "FF8F00", "FF6F00"),
    "Orange":     ("FFF3E0", "FFE0B2", "FFCC80", "FFB74D", "FFA726", "FF9800", "FB8C00", "F57C00", "EF6C00", "E65100"),
    "DeepOrange": ("FBE9E7", "FFCCBC", "FFAB91", "FF8A65", "FF7043", "FF5722", "F4511E", "E64A19", "D84315", "BF360C"),
    "Brown":      ("EFEBE9", "D7CCC8", "BCAAA4", "A1887F", "8D6E63", "795548", "6D4C41", "5D4037", "4E342E", "3E2723"),
    "Grey":       ("90A4AE", "F5F5F5", "EEEEEE", "E0E0E0", "BDBDBD", "9E9E9E", "757575", "616161", "424242", "212121"),
    "BlueGrey":   ("FAFAFA", "ECEFF1", "CFD8DC", "B0BEC5", "78909C", "607D8B", "546E7A", "455A64", "37474F", "263238"),
}

# {색 이름: {단계: "RRGGBB"}}
COLORS = {name: dict(zip(SHADES, hexes)) for name, hexes in PALETTE.items()}


def build_mapping(shade_map=None, only_hues=None):
    """{ 'E53935': 'EF9A9A', ... } 형태의 치환표를 만든다."""
    shade_map = SHADE_MAP if shade_map is None else shade_map
    only_hues = ONLY_HUES if only_hues is None else only_hues
    mapping = {}
    for name, shades in COLORS.items():
        if only_hues is not None and name not in only_hues:
            continue
        for src_shade, dst_shade in shade_map.items():
            src, dst = shades[src_shade], shades[dst_shade]
            if mapping.get(src, dst) != dst:
                raise ValueError(f"색 충돌: #{src} 가 서로 다른 색으로 매핑됨 ({name})")
            mapping[src] = dst
    return mapping


# #RRGGBB (뒤에 hex 문자가 더 붙는 건 제외) 또는 rgb(r, g, b)
HEX_RE = re.compile(r"#([0-9a-fA-F]{6})(?![0-9a-fA-F])")
RGB_RE = re.compile(
    r"rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)", re.IGNORECASE
)


def recolor(svg_text, mapping=None):
    mapping = build_mapping() if mapping is None else mapping

    def hex_sub(m):
        new = mapping.get(m.group(1).upper())
        if new is None:
            return m.group(0)
        return "#" + (new.lower() if m.group(1).islower() else new)

    def rgb_sub(m):
        r, g, b = (int(x) for x in m.groups())
        new = mapping.get(f"{r:02X}{g:02X}{b:02X}")
        if new is None:
            return m.group(0)
        return "rgb({}, {}, {})".format(
            int(new[0:2], 16), int(new[2:4], 16), int(new[4:6], 16)
        )

    # 한 번에 치환하므로 연쇄 변환(600→200 이 다시 바뀌는 일)은 없다.
    return RGB_RE.sub(rgb_sub, HEX_RE.sub(hex_sub, svg_text))


def main():
    if len(sys.argv) != 3:
        print("사용법: python svg_material_recolor.py input.svg output.svg")
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, "r", encoding="utf-8") as f:
        text = f.read()
    with open(dst, "w", encoding="utf-8") as f:
        f.write(recolor(text))
    print(f"완료: {src} -> {dst}")


if __name__ == "__main__":
    main()
