package com.multiapp.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * No @EntityScan/@EnableJpaRepositories anymore - this app has no
 * database and no domain modules on its classpath. scanBasePackages
 * still needs to reach com.multiapp.common for CorsConfig and
 * GlobalExceptionHandler, which live outside this package.
 */
@SpringBootApplication(scanBasePackages = {"com.multiapp.gateway", "com.multiapp.common"})
public class GatewayApplication {

  public static void main(String[] args) {
    SpringApplication.run(GatewayApplication.class, args);
  }
}
