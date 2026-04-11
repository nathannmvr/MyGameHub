// packages/shared/src/dto/recommendation-event.ts
// Event types for telemetry tracking
// Ref: spec.md RN-16, design.md §6.3

export enum RecommendationEventType {
  IMPRESSION = "IMPRESSION",          // Recomendação mostrada ao usuário
  OPEN_DETAILS = "OPEN_DETAILS",      // Usuário clicou para ver detalhes
  ADD_TO_LIBRARY = "ADD_TO_LIBRARY",  // Usuário adicionou à biblioteca
  DISMISS = "DISMISS",                // Usuário descartou (não interessante)
  HIDE = "HIDE",                      // Usuário ocultou permanentemente
}
