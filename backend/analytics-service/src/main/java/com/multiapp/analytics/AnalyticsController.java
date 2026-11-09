package com.multiapp.analytics;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

/**
 * AnalyticsHome.jsx reads convertedLeads straight out of the shared
 * Zustand store. There's no backend equivalent of "one mutable object
 * every process can read" once each service is its own server with its
 * own database - the only way to see another service's data is to ask
 * it, over the network, the same as any other client would. This used to
 * be a direct CaseRepository dependency (fine in a monolith); now it's a
 * real HTTP call, and if service-service is down, this call fails like
 * any other network call would - there's no shortcut back to "just read
 * the table."
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

  private final RestClient serviceRestClient;

  public AnalyticsController(RestClient serviceRestClient) {
    this.serviceRestClient = serviceRestClient;
  }

  @GetMapping("/summary")
  public AnalyticsSummary summary() {
    List<CaseView> cases = serviceRestClient.get()
        .uri("/api/service/cases")
        .retrieve()
        .body(new ParameterizedTypeReference<List<CaseView>>() {});

    BigDecimal total = cases.stream()
        .map(CaseView::value)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    return new AnalyticsSummary(cases.size(), total);
  }
}
