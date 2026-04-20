import { useState, useCallback, useSyncExternalStore } from "react";

export interface BetSelection {
  matchId: string;
  marketId?: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  selectionType: "home" | "draw" | "away";
  selectionLabel: string;
  odds: number;
}

interface BetSlipState {
  selections: BetSelection[];
  stake: number;
}

let state: BetSlipState = { selections: [], stake: 0 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addSelection(sel: BetSelection) {
  const key = `${sel.matchId}-${sel.selectionType}`;
  // Remove existing selection for same match
  const filtered = state.selections.filter((s) => s.matchId !== sel.matchId);
  // Check if this exact selection was already selected (toggle off)
  const exists = state.selections.find(
    (s) => s.matchId === sel.matchId && s.selectionType === sel.selectionType
  );
  state = {
    ...state,
    selections: exists ? filtered : [...filtered, sel],
  };
  emit();
}

export function removeSelection(matchId: string) {
  state = {
    ...state,
    selections: state.selections.filter((s) => s.matchId !== matchId),
  };
  emit();
}

export function setStake(stake: number) {
  state = { ...state, stake };
  emit();
}

export function clearSlip() {
  state = { selections: [], stake: 0 };
  emit();
}

export function useBetSlip() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getTotalOdds(selections: BetSelection[]) {
  if (selections.length === 0) return 0;
  return selections.reduce((acc, s) => acc * s.odds, 1);
}

export function getPotentialPayout(selections: BetSelection[], stake: number) {
  return getTotalOdds(selections) * stake;
}

export function getSelectionKey(matchId: string, selectionType: string) {
  return `${matchId}-${selectionType}`;
}
