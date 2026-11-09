package com.multiapp.sales;

import com.multiapp.events.LeadConvertedEvent;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/sales/leads")
public class LeadController {

  private final LeadRepository leadRepository;
  private final RestClient serviceRestClient;

  public LeadController(LeadRepository leadRepository, RestClient serviceRestClient) {
    this.leadRepository = leadRepository;
    this.serviceRestClient = serviceRestClient;
  }

  @GetMapping
  public List<Lead> listLeads() {
    return leadRepository.findAll();
  }

  @GetMapping("/{id}")
  public Lead getLead(@PathVariable String id) {
    return leadRepository.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Lead " + id + " not found"));
  }

  /**
   * Backend twin of LeadDetail.jsx's handleConvert. The event contract
   * (LeadConvertedEvent) hasn't changed - only how it travels. It used to
   * go through an in-JVM ApplicationEventPublisher; now it's the JSON
   * body of a real HTTP POST to service-service, which is a separate
   * process on its own port. sales-service still never imports a single
   * class FROM service-service - it only knows a URL and this shared
   * DTO shape, same rule as buildAppPath on the frontend.
   */
  @PostMapping("/{id}/convert")
  public LeadConvertedEvent convertLead(@PathVariable String id) {
    Lead lead = getLead(id);
    lead.markConverted();
    leadRepository.save(lead);

    LeadConvertedEvent event = new LeadConvertedEvent(
        lead.getId(), "C-" + lead.getId(), lead.getName(), lead.getValue());

    serviceRestClient.post()
        .uri("/api/service/cases")
        .body(event)
        .retrieve()
        .toBodilessEntity();

    System.out.println("sales-service: published LeadConvertedEvent to service-service: " + event);
    return event;
  }
}
