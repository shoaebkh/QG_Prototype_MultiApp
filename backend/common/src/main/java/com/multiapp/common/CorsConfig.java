package com.multiapp.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Every service now has its own origin (its own port), so every service
 * needs this - not just the gateway. Living in common and picked up via
 * each app's scanBasePackages means it's written once, same as
 * @multiapp/ui being imported by every frontend app.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:5173")
        .allowedMethods("GET", "POST", "PUT", "DELETE");
  }
}
