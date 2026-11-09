package com.multiapp.service;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.math.BigDecimal;

@Entity
public class CaseRecord {

  @Id
  private String id;

  private String leadId;
  private String accountName;

  @Column(name = "amount")
  private BigDecimal value;

  protected CaseRecord() {
    // JPA
  }

  public CaseRecord(String id, String leadId, String accountName, BigDecimal value) {
    this.id = id;
    this.leadId = leadId;
    this.accountName = accountName;
    this.value = value;
  }

  public String getId() {
    return id;
  }

  public String getLeadId() {
    return leadId;
  }

  public String getAccountName() {
    return accountName;
  }

  public BigDecimal getValue() {
    return value;
  }
}
