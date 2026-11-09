package com.multiapp.events;

import java.math.BigDecimal;

/**
 * Plain POJO - Spring can publish/listen for any Object via
 * ApplicationEventPublisher/@EventListener, so this class doesn't need to
 * extend ApplicationEvent or import Spring at all. That's what keeps this
 * module a pure contract, same role as the 'lead:converted' event name in
 * @multiapp/event-bus.
 */
public record LeadConvertedEvent(String leadId, String caseId, String accountName, BigDecimal value) {
}
