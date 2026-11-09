package com.multiapp.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Every service now has its own origin (its own port), so every service
 * needs this - not just the gateway. Living in common and picked up via
 * each app's scanBasePackages means it's written once, same as
 * @multiapp/ui being imported by every frontend app.
 *
 * Pattern-matched rather than one fixed origin: the main dev shell runs on
 * :5173, but each simulated customer environment (see tools/deploy/) runs
 * its own frontend on its own port (:9010, :9020, :9030, ...), so a single
 * hardcoded allowedOrigins entry only ever worked for one of them at a
 * time. This is fine for a local multi-origin demo; a real deployment
 * would list exact allowed origins instead of a host-wide pattern.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
        .allowedMethods("GET", "POST", "PUT", "DELETE");
  }
}
