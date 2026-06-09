package com.planner.domain.profile.util;

import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public final class GeneratedProfileDefaults {

    private static final String AVATAR_DATA_URI_PREFIX = "data:image/svg+xml;charset=UTF-8,";
    private static final String[] VERBS = {
            "기록하는", "정리하는", "연결하는", "달리는", "모으는",
            "그리는", "찾아가는", "나누는", "반짝이는", "피어나는"
    };
    private static final String[] NOUNS = {
            "달력", "시간", "노트", "별", "구름",
            "지도", "하루", "링크", "빛", "약속"
    };
    private static final String[] BACKGROUND_COLORS = {
            "#F8D66D", "#9ED7C5", "#8DB7E8", "#F3A6A0", "#B8A7E8",
            "#8FD4E8", "#F2B66D", "#A8D87B", "#E89AC7", "#9BD0A4"
    };
    private static final String[] FOREGROUND_COLORS = {
            "#6B4B00", "#0F5E4D", "#174E83", "#8A2F2A", "#4D3786",
            "#145A69", "#794100", "#315F12", "#7C2453", "#245D30"
    };

    private GeneratedProfileDefaults() {
    }

    public static String nickname(String seed) {
        int hash = positiveHash(seed);
        return VERBS[hash % VERBS.length] + " " + NOUNS[(hash / VERBS.length) % NOUNS.length];
    }

    public static boolean isGeneratedNickname(String nickname) {
        if (!StringUtils.hasText(nickname)) {
            return false;
        }

        String normalized = nickname.trim();
        for (String verb : VERBS) {
            for (String noun : NOUNS) {
                if ((verb + " " + noun).equals(normalized)) {
                    return true;
                }
            }
        }
        return false;
    }

    public static String avatarUrl(String seed) {
        int hash = positiveHash(seed);
        String background = BACKGROUND_COLORS[hash % BACKGROUND_COLORS.length];
        String foreground = FOREGROUND_COLORS[(hash / BACKGROUND_COLORS.length) % FOREGROUND_COLORS.length];
        int accentOffset = 18 + (hash % 14);
        int orbitOffset = 64 - (hash % 16);

        String svg = """
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
                  <rect width="96" height="96" rx="24" fill="%s"/>
                  <circle cx="%d" cy="28" r="28" fill="#ffffff" opacity=".28"/>
                  <circle cx="%d" cy="72" r="24" fill="#ffffff" opacity=".20"/>
                  <path d="M30 61c8-15 28-15 36 0" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>
                  <circle cx="38" cy="39" r="5.5" fill="%s"/>
                  <circle cx="58" cy="39" r="5.5" fill="%s"/>
                </svg>
                """.formatted(background, accentOffset, orbitOffset, foreground, foreground, foreground);

        return AVATAR_DATA_URI_PREFIX + URLEncoder.encode(svg, StandardCharsets.UTF_8).replace("+", "%20");
    }

    public static boolean isGeneratedAvatarUrl(String avatarUrl) {
        return StringUtils.hasText(avatarUrl) && avatarUrl.trim().startsWith(AVATAR_DATA_URI_PREFIX);
    }

    private static int positiveHash(String seed) {
        String source = StringUtils.hasText(seed) ? seed.trim() : "timelink";
        return Math.floorMod(source.hashCode(), Integer.MAX_VALUE);
    }
}
