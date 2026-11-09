package com.multiapp.sales;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * This app's own process, own port, own database - nothing outside
 * com.multiapp.sales and com.multiapp.common (for CorsConfig/
 * GlobalExceptionHandler) is on its classpath at runtime anymore.
 */
@SpringBootApplication(scanBasePackages = {"com.multiapp.sales", "com.multiapp.common"})
public class SalesApplication {

  public static void main(String[] args) {
    SpringApplication.run(SalesApplication.class, args);
  }
}
