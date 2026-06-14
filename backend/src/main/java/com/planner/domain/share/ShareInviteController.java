package com.planner.domain.share;

import com.planner.domain.coordination.model.Coordination;
import com.planner.domain.coordination.repository.CoordinationRepository;
import com.planner.domain.group.model.Group;
import com.planner.domain.group.model.GroupInvite;
import com.planner.domain.group.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
public class ShareInviteController {

    private static final String APP_ORIGIN = "https://timelink.cloud";
    private static final String DEFAULT_TITLE = "Timelink | 일정과 모임 시간을 한 곳에서";
    private static final String DEFAULT_DESCRIPTION = "개인 일정은 한눈에 정리하고, 모임 시간은 함께 맞추는 일정 관리 및 모임 서비스";
    private static final String GROUP_DESCRIPTION = "Timelink에서 모임 일정을 함께 확인하고 시간을 조율해보세요.";
    private static final String DEFAULT_IMAGE = APP_ORIGIN + "/og/timelink-default.png";
    private static final String COORDINATION_IMAGE = APP_ORIGIN + "/og/timelink-coordination.png";

    private final GroupRepository groupRepository;
    private final CoordinationRepository coordinationRepository;

    @GetMapping(value = "/invite/{inviteCode}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> invite(
            @PathVariable String inviteCode,
            @RequestParam(required = false) String coord) {
        SharePreview preview = resolvePreview(inviteCode, coord);
        return ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noCache())
                .body(renderHtml(preview));
    }

    private SharePreview resolvePreview(String inviteCode, String coordId) {
        Optional<GroupInvite> invite = groupRepository.findInvite(inviteCode);
        if (invite.isEmpty()) {
            return SharePreview.defaultPreview("/groups");
        }

        Optional<Group> group = groupRepository.findGroupById(invite.get().getGroupId());
        if (group.isEmpty()) {
            return SharePreview.defaultPreview("/groups");
        }

        Group resolvedGroup = group.get();
        String safeGroupName = StringUtils.hasText(resolvedGroup.getName()) ? resolvedGroup.getName().trim() : "Timelink";
        String joinPath = "/groups/join/" + encodePath(inviteCode);

        if (StringUtils.hasText(coordId)) {
            Optional<Coordination> coordination = coordinationRepository.findCoordination(resolvedGroup.getId(), coordId);
            if (coordination.isPresent() && "active".equals(coordination.get().getStatus())) {
                String title = safeGroupName + " 시간 조율 | Timelink";
                String description = buildCoordinationDescription(coordination.get());
                String destination = joinPath + "?coord=" + encodeQuery(coordId.trim());
                String canonical = APP_ORIGIN + "/invite/" + encodePath(inviteCode) + "?coord=" + encodeQuery(coordId.trim());
                return new SharePreview(title, description, COORDINATION_IMAGE, canonical, destination);
            }
        }

        return new SharePreview(
                safeGroupName + " 모임 초대 | Timelink",
                GROUP_DESCRIPTION,
                COORDINATION_IMAGE,
                APP_ORIGIN + "/invite/" + encodePath(inviteCode),
                joinPath
        );
    }

    private String buildCoordinationDescription(Coordination coordination) {
        String title = StringUtils.hasText(coordination.getTitle()) ? coordination.getTitle().trim() : "시간 조율";
        return title + "의 가능한 시간을 선택해주세요.";
    }

    private String renderHtml(SharePreview preview) {
        return """
                <!doctype html>
                <html lang="ko">
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <meta name="robots" content="noindex" />
                    <title>%s</title>
                    <meta name="description" content="%s" />
                    <link rel="canonical" href="%s" />
                    <meta property="og:site_name" content="Timelink" />
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content="%s" />
                    <meta property="og:description" content="%s" />
                    <meta property="og:url" content="%s" />
                    <meta property="og:image" content="%s" />
                    <meta property="og:image:width" content="1200" />
                    <meta property="og:image:height" content="630" />
                    <meta property="og:image:alt" content="Timelink schedule coordination preview" />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="%s" />
                    <meta name="twitter:description" content="%s" />
                    <meta name="twitter:image" content="%s" />
                  </head>
                  <body>
                    <p>Timelink로 이동합니다. 자동으로 이동하지 않으면 <a href="%s">여기를 눌러주세요</a>.</p>
                    <script>window.location.replace("%s");</script>
                  </body>
                </html>
                """.formatted(
                escapeHtml(preview.title()),
                escapeHtml(preview.description()),
                escapeHtml(preview.canonicalUrl()),
                escapeHtml(preview.title()),
                escapeHtml(preview.description()),
                escapeHtml(preview.canonicalUrl()),
                escapeHtml(preview.imageUrl()),
                escapeHtml(preview.title()),
                escapeHtml(preview.description()),
                escapeHtml(preview.imageUrl()),
                escapeHtml(preview.destinationPath()),
                escapeJs(preview.destinationPath())
        );
    }

    private static String encodePath(String value) {
        return UriUtils.encodePathSegment(value, StandardCharsets.UTF_8);
    }

    private static String encodeQuery(String value) {
        return UriUtils.encodeQueryParam(value, StandardCharsets.UTF_8);
    }

    private static String escapeHtml(String value) {
        return value == null ? "" : value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private static String escapeJs(String value) {
        return value == null ? "" : value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("<", "\\u003c")
                .replace(">", "\\u003e")
                .replace("&", "\\u0026");
    }

    private record SharePreview(
            String title,
            String description,
            String imageUrl,
            String canonicalUrl,
            String destinationPath
    ) {
        static SharePreview defaultPreview(String destinationPath) {
            return new SharePreview(
                    DEFAULT_TITLE,
                    DEFAULT_DESCRIPTION,
                    DEFAULT_IMAGE,
                    APP_ORIGIN + "/",
                    destinationPath
            );
        }
    }
}
