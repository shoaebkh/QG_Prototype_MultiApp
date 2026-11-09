package com.multiapp.service;

import com.multiapp.events.LeadConvertedEvent;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/service/cases")
public class CaseController {

  private final CaseRepository caseRepository;

  public CaseController(CaseRepository caseRepository) {
    this.caseRepository = caseRepository;
  }

  @GetMapping
  public List<CaseRecord> listCases() {
    return caseRepository.findAll();
  }

  @GetMapping("/{id}")
  public CaseRecord getCase(@PathVariable String id) {
    return caseRepository.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Case " + id + " not found"));
  }

  /**
   * Replaces the old @EventListener(LeadConvertedEvent.class) - that only
   * worked because sales and service used to share one JVM. Now sales
   * calls this endpoint over HTTP; LeadConvertedEvent is reused as-is for
   * the request body, because the record itself never depended on Spring
   * or on being in-process.
   */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CaseRecord createCase(@RequestBody LeadConvertedEvent event) {
    CaseRecord caseRecord = new CaseRecord(event.caseId(), event.leadId(), event.accountName(), event.value());
    return caseRepository.save(caseRecord);
  }
}
