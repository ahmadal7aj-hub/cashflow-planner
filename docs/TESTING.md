# Testing

> Draft skeleton (P0-01).

## Layers
Unit, property/edge-case, component, database/RLS, integration, E2E (Maestro), security, regression.

## Required edge cases for the forecast engine
Zero income, negative raw safe-to-spend, leap year, month boundary, payday today, commitment > balance, duplicate schedule occurrences.

## Critical E2E journeys
First-time setup -> dashboard; edit commitment -> forecast changes; scenario comparison; export/delete.

## Commands
_TBD once the app shell exists._

## Fixtures
Never use real customer financial data in fixtures.
