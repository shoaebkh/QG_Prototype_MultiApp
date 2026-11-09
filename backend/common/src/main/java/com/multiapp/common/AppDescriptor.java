package com.multiapp.common;

/**
 * Backend twin of the frontend's manifest.js files. Now that each app is
 * its own server, the descriptor also carries baseUrl - a caller needs to
 * know WHERE to send requests for this app, not just how to label it.
 */
public record AppDescriptor(String id, String name, String icon, String color, String description, String baseUrl) {
}
