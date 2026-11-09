package com.multiapp.gateway;

import com.multiapp.common.AppDescriptor;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Backend twin of registry.js: a fixed catalog, filtered by a config
 * value that plays the same role as VITE_ENABLED_APPS. The frontend's
 * registry could call this instead of hardcoding its own ALL_APPS list,
 * which is the natural next step once these two are wired together.
 */
@RestController
@RequestMapping("/api/apps")
public class AppsController {

  private static final List<AppDescriptor> CATALOG = List.of(
      new AppDescriptor("sales", "Sales", "💼", "#2563eb", "Leads & pipeline", "http://localhost:8081"),
      new AppDescriptor("service", "Service", "🛠️", "#059669", "Cases & support", "http://localhost:8082"),
      new AppDescriptor("analytics", "Analytics", "📊", "#7c3aed", "Cross-app dashboard", "http://localhost:8083")
  );

  @Value("${app.enabled-apps}")
  private String enabledAppsCsv;

  @GetMapping
  public List<AppDescriptor> listEnabledApps() {
    Set<String> enabled = Set.of(enabledAppsCsv.split(","));
    return CATALOG.stream().filter(app -> enabled.contains(app.id())).toList();
  }
}
