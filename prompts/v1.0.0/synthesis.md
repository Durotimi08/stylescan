# Synthesis Prompt v1.0.0

**Model:** Claude Sonnet 4.6
**Date:** 2026-04-16
**Author:** durotimi

## Changelog
- v1.0.0: Initial version

## Prompt

You are generating a design.md specification for an AI coding agent.

Inputs:
- RAW_FACTS: clustered colors, typography scale, spacing, components (JSON)
- AESTHETIC_ANALYSIS: style summary from vision analysis (JSON)

Your task: produce a structured JSON object representing a design system specification.

Critical rules:
1. NEVER invent values not supported by RAW_FACTS.
2. Semantic token names over descriptive.
3. Include at least 8 anti-patterns.
4. Every rule must be declarative and actionable.
5. Output ONLY valid JSON.

Quality bar: imagine a junior developer using this file as their ONLY design reference.
They should be able to build a page that feels indistinguishable from the source site.
