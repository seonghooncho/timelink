package com.planner.global.security;

import com.planner.global.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final SecretKey refreshKey;
    private final long accessExpiration;
    private final long refreshExpiration;

    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
        this.refreshKey = Keys.hmacShaKeyFor(jwtProperties.getResolvedRefreshSecret().getBytes(StandardCharsets.UTF_8));
        this.accessExpiration = jwtProperties.getAccessExpirationMillis();
        this.refreshExpiration = jwtProperties.getRefreshExpirationMillis();
    }

    public String generateToken(String userId) {
        return generateAccessToken(userId);
    }

    public String generateAccessToken(String userId) {
        return Jwts.builder()
                .subject(userId)
                .claim("typ", "access")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpiration))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(String userId, String tokenId) {
        String jti = StringUtils.hasText(tokenId) ? tokenId : UUID.randomUUID().toString();
        return Jwts.builder()
                .subject(userId)
                .id(jti)
                .claim("typ", "refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpiration))
                .signWith(refreshKey)
                .compact();
    }

    public String getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public String getUserIdFromRefreshToken(String token) {
        Claims claims = parseRefreshClaims(token);
        return claims.getSubject();
    }

    public String getRefreshTokenId(String token) {
        return parseRefreshClaims(token).getId();
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            String type = claims.get("typ", String.class);
            return type == null || "access".equals(type);
        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    public boolean validateRefreshToken(String token) {
        try {
            Claims claims = parseRefreshClaims(token);
            return "refresh".equals(claims.get("typ", String.class));
        } catch (Exception e) {
            log.debug("Refresh JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    private Claims parseRefreshClaims(String token) {
        return Jwts.parser()
                .verifyWith(refreshKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
