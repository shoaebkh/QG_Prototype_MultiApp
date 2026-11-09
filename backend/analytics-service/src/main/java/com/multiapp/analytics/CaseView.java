package com.multiapp.analytics;

import java.math.BigDecimal;

/**
 * Analytics' own view of what a case looks like over the wire - matched
 * by field name against service-service's JSON response, not a shared
 * Java class. Each service owns its own model of data it doesn't own;
 * analytics is never given service-service's CaseRecord entity.
 */
public record CaseView(String id, String leadId, String accountName, BigDecimal value) {
}
