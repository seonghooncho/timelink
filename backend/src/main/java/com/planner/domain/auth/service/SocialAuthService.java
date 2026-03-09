package com.planner.domain.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.planner.domain.auth.dto.AuthSessionResDTO;
import com.planner.global.config.CorsProperties;
import com.planner.global.config.JwtProperties;
import com.planner.global.config.OAuthProperties;
import com.planner.global.error.CustomException;
import com.planner.global.error.GeneralErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.SecretKey;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SocialAuthService {

    private static final Duration STATE_TTL = Duration.ofMinutes(10);
    private static final String CALLBACK_PATH = "/auth/callback";

    private final OAuthProperties oauthProperties;
    private final JwtProperties jwtProperties;
    private final CorsProperties corsProperties;
    private final AuthService authService;

    private final RestClient restClient = RestClient.builder().build();

    public Map<String, Boolean> getAvailableProviders() {
        Map<String, Boolean> providers = new LinkedHashMap<>();
        providers.put(Provider.GOOGLE.id(), isConfigured(Provider.GOOGLE));
        providers.put(Provider.KAKAO.id(), isConfigured(Provider.KAKAO));
        return providers;
    }

    public URI buildAuthorizationUri(String providerName, String frontendOrigin, String redirectPath, HttpServletRequest request) {
        Provider provider = Provider.from(providerName);
        OAuthProperties.Provider config = getConfig(provider);
        ensureConfigured(provider, config);

        String normalizedFrontendOrigin = normalizeFrontendOrigin(frontendOrigin);
        String normalizedRedirectPath = normalizeRedirectPath(redirectPath);
        validateFrontendOrigin(normalizedFrontendOrigin);

        String callbackUri = buildApiBaseUrl(request) + "/api/planner/v1/auth/oauth/" + provider.id() + "/callback";
        String state = createState(provider, normalizedFrontendOrigin, normalizedRedirectPath);

        return switch (provider) {
            case GOOGLE -> UriComponentsBuilder
                    .fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                    .queryParam("response_type", "code")
                    .queryParam("client_id", config.getClientId())
                    .queryParam("redirect_uri", callbackUri)
                    .queryParam("scope", "openid profile email")
                    .queryParam("state", state)
                    .queryParam("prompt", "select_account")
                    .build(true)
                    .toUri();
            case KAKAO -> UriComponentsBuilder
                    .fromUriString("https://kauth.kakao.com/oauth/authorize")
                    .queryParam("response_type", "code")
                    .queryParam("client_id", config.getClientId())
                    .queryParam("redirect_uri", callbackUri)
                    .queryParam("state", state)
                    .build(true)
                    .toUri();
        };
    }

    public URI buildCallbackRedirect(String providerName, String code, String stateToken, HttpServletRequest request) {
        Provider provider = Provider.from(providerName);
        OAuthState state = parseState(provider, stateToken);
        OAuthProperties.Provider config = getConfig(provider);
        ensureConfigured(provider, config);

        String callbackUri = buildApiBaseUrl(request) + "/api/planner/v1/auth/oauth/" + provider.id() + "/callback";
        ProviderUser providerUser = switch (provider) {
            case GOOGLE -> fetchGoogleUser(config, code, callbackUri);
            case KAKAO -> fetchKakaoUser(config, code, callbackUri);
        };

        AuthSessionResDTO session = authService.loginSocial(
                providerUser.userId(),
                providerUser.nickname(),
                providerUser.avatarUrl()
        );

        String destination = state.frontendOrigin() + CALLBACK_PATH
                + "#accessToken=" + encode(session.getAccessToken())
                + "&userId=" + encode(session.getUserId())
                + "&redirect=" + encode(state.redirectPath())
                + "&provider=" + encode(provider.id());

        return URI.create(destination);
    }

    public URI buildFailureRedirect(String providerName, String stateToken, String errorMessage) {
        Provider provider = Provider.from(providerName);
        OAuthState state = parseState(provider, stateToken);

        String destination = UriComponentsBuilder
                .fromUriString(state.frontendOrigin() + "/login")
                .queryParam("redirect", state.redirectPath())
                .queryParam("error", provider.id())
                .queryParam("message", errorMessage)
                .build(true)
                .toUriString();

        return URI.create(destination);
    }

    private ProviderUser fetchGoogleUser(OAuthProperties.Provider config, String code, String callbackUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", config.getClientId());
        form.add("client_secret", config.getClientSecret());
        form.add("redirect_uri", callbackUri);
        form.add("grant_type", "authorization_code");

        JsonNode token = restClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(JsonNode.class);

        String accessToken = readRequired(token, "access_token", "Google access token 응답이 비어 있습니다");

        JsonNode userInfo = restClient.get()
                .uri("https://openidconnect.googleapis.com/v1/userinfo")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(JsonNode.class);

        String providerUserId = readRequired(userInfo, "sub", "Google 사용자 식별자를 확인할 수 없습니다");
        String nickname = firstText(userInfo, "name", fallbackNickname(userInfo.path("email").asText(""), "google"));
        String avatarUrl = firstText(userInfo, "picture", "");

        return new ProviderUser("google_" + providerUserId, nickname, avatarUrl);
    }

    private ProviderUser fetchKakaoUser(OAuthProperties.Provider config, String code, String callbackUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", config.getClientId());
        form.add("redirect_uri", callbackUri);
        form.add("code", code);
        if (StringUtils.hasText(config.getClientSecret())) {
            form.add("client_secret", config.getClientSecret());
        }

        JsonNode token = restClient.post()
                .uri("https://kauth.kakao.com/oauth/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(JsonNode.class);

        String accessToken = readRequired(token, "access_token", "Kakao access token 응답이 비어 있습니다");

        JsonNode userInfo = restClient.get()
                .uri("https://kapi.kakao.com/v2/user/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(JsonNode.class);

        String providerUserId = readRequired(userInfo, "id", "Kakao 사용자 식별자를 확인할 수 없습니다");
        JsonNode account = userInfo.path("kakao_account");
        JsonNode profile = account.path("profile");
        String nickname = firstText(profile, "nickname", fallbackNickname(account.path("email").asText(""), "kakao"));
        String avatarUrl = firstText(profile, "profile_image_url", "");

        return new ProviderUser("kakao_" + providerUserId, nickname, avatarUrl);
    }

    private String createState(Provider provider, String frontendOrigin, String redirectPath) {
        SecretKey key = signingKey();

        return Jwts.builder()
                .subject("oauth-state")
                .claim("provider", provider.id())
                .claim("frontendOrigin", frontendOrigin)
                .claim("redirectPath", redirectPath)
                .issuedAt(new java.util.Date())
                .expiration(new java.util.Date(System.currentTimeMillis() + STATE_TTL.toMillis()))
                .signWith(key)
                .compact();
    }

    private OAuthState parseState(Provider provider, String stateToken) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey())
                    .build()
                    .parseSignedClaims(stateToken)
                    .getPayload();

            String claimProvider = claims.get("provider", String.class);
            if (!provider.id().equals(claimProvider)) {
                throw new CustomException(GeneralErrorCode.BAD_REQUEST, "OAuth provider 상태값이 올바르지 않습니다");
            }

            return new OAuthState(
                    claims.get("frontendOrigin", String.class),
                    claims.get("redirectPath", String.class)
            );
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "OAuth 상태값을 확인할 수 없습니다");
        }
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    private OAuthProperties.Provider getConfig(Provider provider) {
        return switch (provider) {
            case GOOGLE -> oauthProperties.getGoogle();
            case KAKAO -> oauthProperties.getKakao();
        };
    }

    private boolean isConfigured(Provider provider) {
        return StringUtils.hasText(getConfig(provider).getClientId());
    }

    private void ensureConfigured(Provider provider, OAuthProperties.Provider config) {
        if (!StringUtils.hasText(config.getClientId())) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, provider.displayName() + " OAuth 설정이 없습니다");
        }

        if (provider == Provider.GOOGLE && !StringUtils.hasText(config.getClientSecret())) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "Google OAuth client secret 설정이 없습니다");
        }
    }

    private void validateFrontendOrigin(String frontendOrigin) {
        if (!StringUtils.hasText(frontendOrigin)) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "frontendOrigin 값이 필요합니다");
        }

        String allowedOrigins = corsProperties.getAllowedOrigins();
        if (!StringUtils.hasText(allowedOrigins)) {
            return;
        }

        boolean matched = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(this::normalizeFrontendOrigin)
                .anyMatch(frontendOrigin::equals);

        if (!matched) {
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "허용되지 않은 frontendOrigin 입니다");
        }
    }

    private String buildApiBaseUrl(HttpServletRequest request) {
        return UriComponentsBuilder
                .fromHttpUrl(request.getRequestURL().toString())
                .replacePath(null)
                .replaceQuery(null)
                .build()
                .toUriString();
    }

    private String normalizeFrontendOrigin(String frontendOrigin) {
        String trimmed = frontendOrigin == null ? "" : frontendOrigin.trim();
        if (!StringUtils.hasText(trimmed)) {
            return "";
        }
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String normalizeRedirectPath(String redirectPath) {
        if (!StringUtils.hasText(redirectPath)) {
            return "/";
        }

        String trimmed = redirectPath.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
            return "/";
        }

        return trimmed;
    }

    private String readRequired(JsonNode node, String fieldName, String message) {
        String value = firstText(node, fieldName, null);
        if (!StringUtils.hasText(value)) {
            throw new CustomException(GeneralErrorCode.INTERNAL_ERROR, message);
        }
        return value;
    }

    private String firstText(JsonNode node, String fieldName, String fallback) {
        if (node == null) {
            return fallback;
        }

        JsonNode field = node.path(fieldName);
        if (field.isMissingNode() || field.isNull()) {
            return fallback;
        }

        String value = field.asText();
        return StringUtils.hasText(value) ? value : fallback;
    }

    private String fallbackNickname(String email, String prefix) {
        if (StringUtils.hasText(email) && email.contains("@")) {
            return email.substring(0, email.indexOf('@'));
        }
        return prefix + "-user";
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private record OAuthState(String frontendOrigin, String redirectPath) {
    }

    private record ProviderUser(String userId, String nickname, String avatarUrl) {
    }

    private enum Provider {
        GOOGLE("google", "Google"),
        KAKAO("kakao", "Kakao");

        private final String id;
        private final String displayName;

        Provider(String id, String displayName) {
            this.id = id;
            this.displayName = displayName;
        }

        public String id() {
            return id;
        }

        public String displayName() {
            return displayName;
        }

        public static Provider from(String raw) {
            for (Provider provider : values()) {
                if (provider.id.equalsIgnoreCase(raw)) {
                    return provider;
                }
            }
            throw new CustomException(GeneralErrorCode.BAD_REQUEST, "지원하지 않는 OAuth provider 입니다");
        }
    }
}
