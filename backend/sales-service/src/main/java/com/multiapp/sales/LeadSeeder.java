package com.multiapp.sales;

import java.math.BigDecimal;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Same three leads the frontend's data.js hardcodes, so the two stacks
 * are easy to compare side by side while wiring them together.
 */
@Component
public class LeadSeeder implements CommandLineRunner {

  private final LeadRepository leadRepository;

  public LeadSeeder(LeadRepository leadRepository) {
    this.leadRepository = leadRepository;
  }

  @Override
  public void run(String... args) {
    // The database is now persistent (Postgres), not recreated fresh on
    // every restart like the old H2 in-memory setup - so this has to be
    // idempotent or a second startup fails on a duplicate-key insert.
    if (leadRepository.count() > 0) {
      return;
    }
    leadRepository.save(new Lead("L-100", "Acme Corp", "Negotiation", new BigDecimal("42000")));
    leadRepository.save(new Lead("L-101", "Globex Inc", "Qualified", new BigDecimal("18500")));
    leadRepository.save(new Lead("L-102", "Initech", "New", new BigDecimal("9200")));
  }
}
