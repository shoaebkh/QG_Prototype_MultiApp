package com.multiapp.sales;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.math.BigDecimal;

@Entity
public class Lead {

  @Id
  private String id;

  private String name;
  private String stage;

  @Column(name = "amount")
  private BigDecimal value;

  private boolean converted;

  protected Lead() {
    // JPA
  }

  public Lead(String id, String name, String stage, BigDecimal value) {
    this.id = id;
    this.name = name;
    this.stage = stage;
    this.value = value;
    this.converted = false;
  }

  public String getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getStage() {
    return stage;
  }

  public BigDecimal getValue() {
    return value;
  }

  public boolean isConverted() {
    return converted;
  }

  public void markConverted() {
    this.converted = true;
  }
}
